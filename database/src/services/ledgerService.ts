import { Types } from "mongoose";
import { getTenantContext } from "../connection/tenantConnectionManager";

export interface RecordEntryInput {
  tenantId: string;
  eventId: string;
  accountId: string;
  type: "charge" | "refund" | "credit";
  amountMinor: number;
  description?: string;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export async function recordLedgerEntry(input: RecordEntryInput) {
  const { models } = await getTenantContext(input.tenantId);

  try {
    const entry = await models.LedgerEntry.create({
      eventId: input.eventId,
      accountId: new Types.ObjectId(input.accountId),
      type: input.type,
      amountMinor: input.amountMinor,
      description: input.description,
    });
    return { entry, duplicate: false };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const existing = await models.LedgerEntry.findOne({ eventId: input.eventId });
      if (existing) {
        return { entry: existing, duplicate: true };
      }
    }
    throw err;
  }
}