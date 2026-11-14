import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model";
import { ledgerEntrySchema } from "../schemas/ledgerEntry.schema";
import { connectMaster, disconnectMaster } from "../connection/masterConnection";

async function main(): Promise<void> {
  await connectMaster();

  await Tenant.deleteMany({ tenantId: "demo" });
  const tenant = await Tenant.create({
    tenantId: "demo",
    name: "Demo Company",
    dbName: "tenant_demo",
  });
  console.log("tenant created:", tenant.tenantId, "->", tenant.dbName);
  await Tenant.deleteMany({ tenantId: "demo" });

  const LedgerCheck = mongoose.model("LedgerCheck", ledgerEntrySchema);

  const bad = new LedgerCheck({
    eventId: "evt_1",
    accountId: new mongoose.Types.ObjectId(),
    type: "charge",
    amountMinor: 10.5,
  });
  try {
    await bad.validate();
    console.log("unexpected: decimal amount was accepted");
  } catch (e) {
    console.log("decimal amount error (expected):", (e as Error).message);
  }

  const good = new LedgerCheck({
    eventId: "evt_2",
    accountId: new mongoose.Types.ObjectId(),
    type: "charge",
    amountMinor: 1050,
  });
  await good.validate();
  console.log("valid entry passed validation (expected)");

  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});