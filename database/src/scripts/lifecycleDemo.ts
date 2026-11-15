import { performance } from "perf_hooks";
import { createTenant, setTenantStatus } from "../services/tenantService";
import {
  getTenantContext,
  closeTenantConnection,
  closeAllTenantConnections,
  openTenantCount,
} from "../connection/tenantConnectionManager";
import { disconnectMaster } from "../connection/masterConnection";

async function main(): Promise<void> {
  await createTenant("companya", "Company A");
  await createTenant("companyb", "Company B");
  await setTenantStatus("companya", "active");
  await setTenantStatus("companyb", "active");

  // 1) open both
  const a = await getTenantContext("companya");
  await getTenantContext("companyb");
  console.log("open connections after opening A and B (expect 2):", openTenantCount());

  // 2) close only A
  await closeTenantConnection("companya");
  console.log("after closing A (expect 1):", openTenantCount());

  // 3) asking for A again opens a brand new connection
  const a2 = await getTenantContext("companya");
  console.log("A reopened with a NEW connection (expect true):", a2.connection !== a.connection);
  console.log("open connections now (expect 2):", openTenantCount());

  // 4) suspend B: connection closed and further access refused
  await setTenantStatus("companyb", "suspended");
  console.log("after suspending B (expect 1):", openTenantCount());
  try {
    await getTenantContext("companyb");
    console.log("ERROR: a suspended tenant was allowed in");
  } catch (e) {
    console.log("suspended tenant rejected (expected):", (e as Error).message);
  }

  // 5) reactivate B
  await setTenantStatus("companyb", "active");
  const b2 = await getTenantContext("companyb");
  console.log("B works again after reactivating (expect true):", b2.connection.readyState === 1);

  // 6) speed of switching between tenants
  const names = ["companya", "companyb"];

  const lookups = 1000;
  let start = performance.now();
  for (let i = 0; i < lookups; i++) {
    await getTenantContext(names[i % 2]);
  }
  console.log(
    "average ms per switch, no query:",
    ((performance.now() - start) / lookups).toFixed(4)
  );

  const rounds = 40;
  start = performance.now();
  for (let i = 0; i < rounds; i++) {
    const ctx = await getTenantContext(names[i % 2]);
    await ctx.models.BillingAccount.countDocuments();
  }
  console.log(
    "average ms per switch + query (includes internet time to Atlas):",
    ((performance.now() - start) / rounds).toFixed(1)
  );

  await closeAllTenantConnections();
  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});