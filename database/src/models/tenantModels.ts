import { Connection } from "mongoose";
import { billingAccountSchema } from "../schemas/billingAccount.schema";
import { ledgerEntrySchema } from "../schemas/ledgerEntry.schema";

export function buildTenantModels(conn: Connection) {
  return {
    BillingAccount: conn.model("BillingAccount", billingAccountSchema),
    LedgerEntry: conn.model("LedgerEntry", ledgerEntrySchema),
  };
}

export type TenantModels = ReturnType<typeof buildTenantModels>;