import mongoose, { Connection, Types } from "mongoose";
import { createTenant, setTenantStatus } from "../services/tenantService";
import {
  getTenantContext,
  closeAllTenantConnections,
} from "../connection/tenantConnectionManager";
import { connectMaster, disconnectMaster } from "../connection/masterConnection";
import { processCharge } from "../services/paymentService";
import { closeRedis } from "../redis/redisClient";

const IDS = ["audit1", "audit2", "audit3"];
let failures = 0;

function check(name: string, ok: boolean): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}

async function rejects(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

async function collectionNames(conn: Connection): Promise<string[]> {
  const db = conn.db;
  if (!db) throw new Error("Connection is not ready");
  const list = await db.listCollections().toArray();
  return list.map((c) => c.name);
}

async function main(): Promise<void> {
  await connectMaster();

  // Make sure the three audit tenants exist and are active
  for (const id of IDS) {
    await createTenant(id, `Audit tenant ${id}`);
    await setTenantStatus(id, "active");
  }
  const ctx = await Promise.all(IDS.map((id) => getTenantContext(id)));

  // Start clean
  for (const c of ctx) {
    await c.models.LedgerEntry.deleteMany({});
    await c.models.BillingAccount.deleteMany({});
  }

  // Seed: tenant 1 gets 1 account, tenant 2 gets 2, tenant 3 gets 3
  const accountIds: string[][] = [];
  for (let i = 0; i < ctx.length; i++) {
    const docs = await ctx[i].models.BillingAccount.insertMany(
      Array.from({ length: i + 1 }, (_, k) => ({
        name: `${IDS[i]} account ${k + 1}`,
        balanceMinor: 1000,
      }))
    );
    accountIds.push(docs.map((d) => String(d._id)));
  }

  console.log("\n--- Isolation audit ---\n");

  // 1) Separate databases
  check(
    "each tenant has its own database (3 different names)",
    new Set(ctx.map((c) => c.connection.name)).size === IDS.length
  );
  check(
    "database names follow tenant_<id>",
    ctx.every((c, i) => c.connection.name === `tenant_${IDS[i]}`)
  );

  // 2) Each tenant sees only its own data
  const counts = await Promise.all(
    ctx.map((c) => c.models.BillingAccount.countDocuments())
  );
  check(
    "each tenant sees only its own accounts (counts 1, 2, 3)",
    counts.join(",") === "1,2,3"
  );

  // 3) No tenant can read another tenant's account, even knowing its id
  let leaks = 0;
  for (let i = 0; i < ctx.length; i++) {
    for (let j = 0; j < ctx.length; j++) {
      if (i === j) continue;
      const found = await ctx[i].models.BillingAccount.findById(accountIds[j][0]);
      if (found) leaks++;
    }
  }
  check("no tenant can read another tenant's account by id", leaks === 0);

  // 4) The same event ID can exist in every tenant
  const sharedEvent = `audit_event_${Date.now()}`;
  for (let i = 0; i < ctx.length; i++) {
    await ctx[i].models.LedgerEntry.create({
      eventId: sharedEvent,
      accountId: new Types.ObjectId(accountIds[i][0]),
      type: "credit",
      amountMinor: 50,
    });
  }
  const sharedCounts = await Promise.all(
    ctx.map((c) => c.models.LedgerEntry.countDocuments({ eventId: sharedEvent }))
  );
  check(
    "the same event ID can exist in every tenant without clashing",
    sharedCounts.join(",") === "1,1,1"
  );

  // 5) What is physically stored where
  const allowed = ["billingaccounts", "ledgerentries"];
  const tenantCollections = await Promise.all(
    ctx.map((c) => collectionNames(c.connection))
  );
  check(
    "tenant databases hold only billingaccounts and ledgerentries",
    tenantCollections.every((names) => names.every((n) => allowed.includes(n)))
  );
  const masterNames = await collectionNames(mongoose.connection);
  check(
    "master database holds no money data (no accounts or ledger collections)",
    masterNames.includes("tenants") &&
      !masterNames.includes("billingaccounts") &&
      !masterNames.includes("ledgerentries")
  );

  // 6) Tenant id handling
  const again = await getTenantContext("  AUDIT1 ");
  check(
    "a different spelling of a tenant id reuses the same connection",
    again.connection === ctx[0].connection
  );
  const badIds = ["", "nobody", "audit1/../audit2", "audit1 OR 1=1"];
  const badResults = await Promise.all(
    badIds.map((id) => rejects(() => getTenantContext(id)))
  );
  check("unknown or malicious tenant ids are rejected", badResults.every(Boolean));
  check(
    "a non-string tenant id is rejected",
    await rejects(() => getTenantContext({ $ne: "" } as unknown as string))
  );

  // 7) Payments: locks and balances stay inside each tenant
  const sharedPayment = `audit_pay_${Date.now()}`;
  const [p1, p2] = await Promise.all([
    processCharge({
      tenantId: "audit1",
      eventId: sharedPayment,
      accountId: accountIds[0][0],
      amountMinor: 100,
    }),
    processCharge({
      tenantId: "audit2",
      eventId: sharedPayment,
      accountId: accountIds[1][0],
      amountMinor: 100,
    }),
  ]);
  check(
    "the same event ID in two tenants is processed independently (locks are per tenant)",
    !p1.duplicate && !p2.duplicate
  );
  const balances = await Promise.all(
    ctx.map((c, i) => c.models.BillingAccount.findById(accountIds[i][0]))
  );
  check(
    "balances after the payments are 900, 900, 1000",
    balances.map((b) => b?.balanceMinor).join(",") === "900,900,1000"
  );

  // 8) Suspension
  await setTenantStatus("audit3", "suspended");
  check("a suspended tenant is refused", await rejects(() => getTenantContext("audit3")));
  await setTenantStatus("audit3", "active");
  const back = await getTenantContext("audit3");
  check("a reactivated tenant works again", back.connection.readyState === 1);

  await closeAllTenantConnections();
  await closeRedis();
  await disconnectMaster();

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});