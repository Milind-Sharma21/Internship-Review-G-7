import {
  initDatabase,
  shutdownDatabase,
  createTenant,
  getTenantContext,
  processCharge,
  InsufficientFundsError,
} from "../index";

async function main(): Promise<void> {
  await initDatabase();

  await createTenant("apicheck", "API check tenant");
  const ctx = await getTenantContext("apicheck");

  // start clean so the script can be run many times
  await ctx.models.LedgerEntry.deleteMany({});
  await ctx.models.BillingAccount.deleteMany({});

  const account = await ctx.models.BillingAccount.create({
    name: "API check account",
    balanceMinor: 1000,
  });
  const accountId = account._id.toString();

  const payment = {
    tenantId: "apicheck",
    eventId: `api_${Date.now()}`,
    accountId,
    amountMinor: 400,
  };

  const first = await processCharge(payment);
  const repeat = await processCharge(payment);
  console.log("charge recorded, duplicate (expect false):", first.duplicate);
  console.log("same charge again, duplicate (expect true):", repeat.duplicate);
  console.log(
    "balance (expect 600):",
    (await ctx.models.BillingAccount.findById(account._id))?.balanceMinor
  );

  try {
    await processCharge({ ...payment, eventId: `${payment.eventId}_big`, amountMinor: 5000 });
    console.log("ERROR: an oversized charge went through");
  } catch (e) {
    console.log("oversized charge refused (expect true):", e instanceof InsufficientFundsError);
  }

  await ctx.connection.dropDatabase();
  await shutdownDatabase();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});