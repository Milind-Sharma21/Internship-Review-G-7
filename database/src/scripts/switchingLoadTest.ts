import { performance } from "perf_hooks";
import { createTenant } from "../services/tenantService";
import { Tenant } from "../models/tenant.model";
import {
  getTenantContext,
  closeAllTenantConnections,
  openTenantCount,
} from "../connection/tenantConnectionManager";
import { connectMaster, disconnectMaster } from "../connection/masterConnection";

const TENANT_COUNT = 10;
const WARM_SWITCHES = 20000;
const BURST_SIZE = 2000;
const QUERY_REQUESTS = 200;
const TARGET_MS = 5;

let failures = 0;

function check(name: string, ok: boolean): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

interface Trace {
  n: number;
  tenant: string;
  db: string;
  switchMs: number;
  queryMs: number;
  count: number;
  expected: number;
}

async function main(): Promise<void> {
  await connectMaster();

  const ids = Array.from(
    { length: TENANT_COUNT },
    (_, i) => `loadtest${String(i + 1).padStart(2, "0")}`
  );
  // tenant number k gets k accounts, so a mix-up would show as a wrong count
  const expectedCount = new Map<string, number>();
  ids.forEach((id, i) => expectedCount.set(id, i + 1));
  const pick = (): string => ids[Math.floor(Math.random() * ids.length)];

  for (const id of ids) {
    await createTenant(id, `Load test ${id}`);
  }

  // Phase 1: first connection to each tenant (cold start)
  console.log(`\nPhase 1: first connection to ${TENANT_COUNT} tenants (cold start)`);
  const coldTimes: number[] = [];
  for (const id of ids) {
    const t0 = performance.now();
    const ctx = await getTenantContext(id);
    coldTimes.push(performance.now() - t0);

    await ctx.models.BillingAccount.deleteMany({});
    await ctx.models.BillingAccount.insertMany(
      Array.from({ length: expectedCount.get(id) ?? 0 }, (_, k) => ({
        name: `account ${k + 1}`,
        balanceMinor: 0,
      }))
    );
  }
  console.log(`  average per tenant: ${average(coldTimes).toFixed(1)} ms`);
  console.log(`  slowest: ${Math.max(...coldTimes).toFixed(1)} ms (includes the trip to Atlas)`);

  // Phase 2: switching between connections that are already open
  console.log(`\nPhase 2: ${WARM_SWITCHES} switches between ${TENANT_COUNT} open tenants`);
  const warm: number[] = [];
  for (let i = 0; i < WARM_SWITCHES; i++) {
    const t0 = performance.now();
    await getTenantContext(pick());
    warm.push(performance.now() - t0);
  }
  warm.sort((x, y) => x - y);
  const p99 = percentile(warm, 99);
  console.log(`  median (p50): ${percentile(warm, 50).toFixed(4)} ms`);
  console.log(`  p95:          ${percentile(warm, 95).toFixed(4)} ms`);
  console.log(`  p99:          ${p99.toFixed(4)} ms`);
  console.log(`  slowest:      ${warm[warm.length - 1].toFixed(4)} ms`);

  // Phase 3: many switches at the same moment
  console.log(`\nPhase 3: ${BURST_SIZE} simultaneous switches`);
  const b0 = performance.now();
  await Promise.all(Array.from({ length: BURST_SIZE }, () => getTenantContext(pick())));
  console.log(`  total time: ${(performance.now() - b0).toFixed(1)} ms`);
  console.log(`  open tenant connections afterwards (expect ${TENANT_COUNT}): ${openTenantCount()}`);
  const connectionsAfterBurst = openTenantCount();

  // Phase 4: simultaneous real requests, each one switches tenant and runs a query
  console.log(`\nPhase 4: ${QUERY_REQUESTS} simultaneous requests with a real database query`);
  const traces: Trace[] = await Promise.all(
    Array.from({ length: QUERY_REQUESTS }, async (_, n): Promise<Trace> => {
      const tenant = pick();
      const s0 = performance.now();
      const ctx = await getTenantContext(tenant);
      const s1 = performance.now();
      const count = await ctx.models.BillingAccount.countDocuments();
      const s2 = performance.now();
      return {
        n: n + 1,
        tenant,
        db: ctx.connection.name,
        switchMs: s1 - s0,
        queryMs: s2 - s1,
        count,
        expected: expectedCount.get(tenant) ?? -1,
      };
    })
  );
  console.log("  sample trace:");
  for (const t of traces.slice(0, 5)) {
    console.log(
      `    #${t.n} tenant=${t.tenant} db=${t.db} switch=${t.switchMs.toFixed(4)}ms ` +
        `query=${t.queryMs.toFixed(1)}ms accounts=${t.count} (expected ${t.expected})`
    );
  }
  console.log(`  average switch: ${average(traces.map((t) => t.switchMs)).toFixed(4)} ms`);
  console.log(
    `  average query:  ${average(traces.map((t) => t.queryMs)).toFixed(1)} ms ` +
      "(mostly internet time to Atlas, not switching)"
  );

  const wrongDb = traces.filter((t) => t.db !== `tenant_${t.tenant}`).length;
  const wrongData = traces.filter((t) => t.count !== t.expected).length;

  console.log("\n--- Results ---\n");
  check(`warm switch p99 is under ${TARGET_MS} ms`, p99 < TARGET_MS);
  check(
    "a burst of simultaneous switches opened no extra connections",
    connectionsAfterBurst === TENANT_COUNT
  );
  check("every request reached its own tenant database", wrongDb === 0);
  check("every request saw only its own tenant's data (0 mixed-up results)", wrongData === 0);

  // Clean up: remove the test databases and tenants from Atlas
  for (const id of ids) {
    const ctx = await getTenantContext(id);
    await ctx.connection.dropDatabase();
  }
  await Tenant.deleteMany({ tenantId: { $in: ids } });
  await closeAllTenantConnections();
  await disconnectMaster();

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});