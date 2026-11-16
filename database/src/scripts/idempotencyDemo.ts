import { createTenant } from "../services/tenantService";
import {
  getTenantContext,
  closeAllTenantConnections,
} from "../connection/tenantConnectionManager";
import { recordLedgerEntry } from "../services/ledgerService";
import { disconnectMaster } from "../connection/masterConnection";

async function main(): Promise<void> {
  await createTenant("companya", "Company A");
  await createTenant("companyb", "Company B");

  const a = await getTenantContext("companya");
  const b = await getTenantContext("companyb");

  // start clean so the script can be run many times
  await a.models.LedgerEntry.deleteMany({});
  await b.models.LedgerEntry.deleteMany({});

  const accountA = await a.models.BillingAccount.create({
    name: "A idempotency test",
    balanceMinor: 50000,
  });
  const accountB = await b.models.BillingAccount.create({
    name: "B idempotency test",
    balanceMinor: 50000,
  });

  // 1) Send the SAME payment 5 times at the same moment
  const eventId = `evt_${Date.now()}`;
  const input = {
    tenantId: "companya",
    eventId,
    accountId: accountA.id as string,
    type: "charge" as const,
    amountMinor: 1500,
  };
  const results = await Promise.all(
    Array.from({ length: 5 }, () => recordLedgerEntry(input))
  );
  console.log(
    "duplicates flagged (expect 4):",
    results.filter((r) => r.duplicate).length
  );
  console.log(
    "entries stored for that event (expect 1):",
    await a.models.LedgerEntry.countDocuments({ eventId })
  );

  // 2) A different event ID is a new payment
  await recordLedgerEntry({ ...input, eventId: `${eventId}_second` });
  console.log(
    "entries after a different event (expect 2):",
    await a.models.LedgerEntry.countDocuments()
  );

  // 3) A decimal amount is rejected
  try {
    await recordLedgerEntry({ ...input, eventId: `${eventId}_bad`, amountMinor: 10.5 });
    console.log("ERROR: a decimal amount was accepted");
  } catch (e) {
    console.log("decimal amount rejected (expected):", (e as Error).message);
  }

  // 4) The same event ID used by another company is NOT a duplicate
  const other = await recordLedgerEntry({
    tenantId: "companyb",
    eventId,
    accountId: accountB.id as string,
    type: "charge",
    amountMinor: 1500,
  });
  console.log("same ID in company B is a new entry (expect false):", other.duplicate);
  console.log(
    "entries in company B (expect 1):",
    await b.models.LedgerEntry.countDocuments()
  );

  await closeAllTenantConnections();
  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});