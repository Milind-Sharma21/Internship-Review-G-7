import { createTenant } from "../services/tenantService";
import {
  getTenantContext,
  closeAllTenantConnections,
  openTenantCount,
} from "../connection/tenantConnectionManager";
import { disconnectMaster } from "../connection/masterConnection";

async function main(): Promise<void> {
  await createTenant("companya", "Company A");
  await createTenant("companyb", "Company B");

  const a = await getTenantContext("companya");
  const b = await getTenantContext("companyb");

  // start clean so you can run this script many times
  await a.models.BillingAccount.deleteMany({});
  await b.models.BillingAccount.deleteMany({});

  await a.models.BillingAccount.create({ name: "A main account", balanceMinor: 100000 });

  console.log("A database:", a.connection.name);
  console.log("B database:", b.connection.name);
  console.log("accounts in A (expect 1):", await a.models.BillingAccount.countDocuments());
  console.log("accounts in B (expect 0):", await b.models.BillingAccount.countDocuments());

  // asking again for A must reuse the same connection
  const a2 = await getTenantContext("companya");
  console.log("same connection reused (expect true):", a2.connection === a.connection);
  console.log("open tenant connections (expect 2):", openTenantCount());

  // an unknown company must be rejected
  try {
    await getTenantContext("doesnotexist");
  } catch (e) {
    console.log("unknown tenant rejected (expected):", (e as Error).message);
  }

  await closeAllTenantConnections();
  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});