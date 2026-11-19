import { Types } from "mongoose";
import { createTenant } from "../services/tenantService";
import {
  getTenantContext,
  closeAllTenantConnections,
} from "../connection/tenantConnectionManager";
import {
  processCharge,
  InsufficientFundsError,
  AccountNotFoundError,
} from "../services/paymentService";
import { disconnectMaster } from "../connection/masterConnection";
import { closeRedis } from "../redis/redisClient";

async function main(): Promise<void> {
  await createTenant("companya", "Company A");
  await createTenant("companyb", "Company B");

  const a = await getTenantContext("companya");
  const b = await getTenantContext("companyb");

  // start clean so the script can be run many times
  await a.models.LedgerEntry.deleteMany({});
  await a.models.BillingAccount.deleteMany({});
  await b.models.LedgerEntry.deleteMany({});
  await b.models.BillingAccount.deleteMany({});

  const run = `run${Date.now()}`;
  const acc = await a.models.BillingAccount.create({ name: "A txn test", balanceMinor: 10000 });
  const accountId = acc._id.toString();

  const balanceOf = async (): Promise<number | undefined> =>
    (await a.models.BillingAccount.findById(acc._id))?.balanceMinor;

  // 1) A normal payment
  const first = await processCharge({
    tenantId: "companya",
    eventId: `${run}_1`,
    accountId,
    amountMinor: 2500,
  });
  console.log("1) payment recorded, duplicate (expect false):", first.duplicate);
  console.log("   balance (expect 7500):", await balanceOf());

  // 2) The same payment again
  const again = await processCharge({
    tenantId: "companya",
    eventId: `${run}_1`,
    accountId,
    amountMinor: 2500,
  });
  console.log("2) same payment again, duplicate (expect true):", again.duplicate);
  console.log("   balance still (expect 7500):", await balanceOf());

  // 3) A crash in the middle of a payment must roll everything back
  try {
    await processCharge({
      tenantId: "companya",
      eventId: `${run}_2`,
      accountId,
      amountMinor: 2500,
      simulateFailureAfterLedgerWrite: true,
    });
    console.log("ERROR: the simulated failure did not happen");
  } catch (e) {
    console.log("3) crash happened (expected):", (e as Error).message);
  }
  console.log(
    "   ledger entries left behind (expect 0):",
    await a.models.LedgerEntry.countDocuments({ eventId: `${run}_2` })
  );
  console.log("   balance unchanged (expect 7500):", await balanceOf());

  // 4) Retrying the same payment afterwards works
  const retry = await processCharge({
    tenantId: "companya",
    eventId: `${run}_2`,
    accountId,
    amountMinor: 2500,
  });
  console.log("4) retry after the crash, duplicate (expect false):", retry.duplicate);
  console.log("   balance (expect 5000):", await balanceOf());

  // 5) Not enough money
  try {
    await processCharge({
      tenantId: "companya",
      eventId: `${run}_3`,
      accountId,
      amountMinor: 999999,
    });
    console.log("ERROR: an oversized payment went through");
  } catch (e) {
    console.log("5) oversized payment refused (expected):", e instanceof InsufficientFundsError);
  }
  console.log(
    "   ledger entries left behind (expect 0):",
    await a.models.LedgerEntry.countDocuments({ eventId: `${run}_3` })
  );
  console.log("   balance unchanged (expect 5000):", await balanceOf());

  // 6) An account that does not exist
  try {
    await processCharge({
      tenantId: "companya",
      eventId: `${run}_4`,
      accountId: new Types.ObjectId().toString(),
      amountMinor: 100,
    });
    console.log("ERROR: a payment on a missing account went through");
  } catch (e) {
    console.log("6) missing account refused (expected):", e instanceof AccountNotFoundError);
  }

  // 7) The SAME payment sent 5 times at once
  const burst = await Promise.all(
    Array.from({ length: 5 }, () =>
      processCharge({
        tenantId: "companya",
        eventId: `${run}_5`,
        accountId,
        amountMinor: 500,
      })
    )
  );
  console.log("7) duplicates flagged (expect 4):", burst.filter((r) => r.duplicate).length);
  console.log("   balance reduced only once (expect 4500):", await balanceOf());

  // 8) Another company is not affected
  const accB = await b.models.BillingAccount.create({ name: "B txn test", balanceMinor: 10000 });
  await processCharge({
    tenantId: "companyb",
    eventId: `${run}_6`,
    accountId: accB._id.toString(),
    amountMinor: 3000,
  });
  console.log(
    "8) company B balance (expect 7000):",
    (await b.models.BillingAccount.findById(accB._id))?.balanceMinor
  );
  console.log("   company A balance untouched (expect 4500):", await balanceOf());

  // 9) Ten different payments of 1000 on an account holding only 5000
  const busy = await a.models.BillingAccount.create({ name: "A busy account", balanceMinor: 5000 });
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, (_, i) =>
      processCharge({
        tenantId: "companya",
        eventId: `${run}_busy${i}`,
        accountId: busy._id.toString(),
        amountMinor: 1000,
      })
    )
  );
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const refused = results.filter(
    (r) => r.status === "rejected" && r.reason instanceof InsufficientFundsError
  ).length;
  console.log("9) payments that succeeded (expect 5):", succeeded);
  console.log("   payments refused for lack of money (expect 5):", refused);
  console.log(
    "   final balance (expect 0, never negative):",
    (await a.models.BillingAccount.findById(busy._id))?.balanceMinor
  );
  console.log(
    "   ledger entries for that account (expect 5):",
    await a.models.LedgerEntry.countDocuments({ accountId: busy._id })
  );

  await closeAllTenantConnections();
  await closeRedis();
  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});