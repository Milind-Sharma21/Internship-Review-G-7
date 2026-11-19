import { Types } from "mongoose";
import { getTenantContext } from "../connection/tenantConnectionManager";
import { withLock } from "../redis/lock";

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient funds");
    this.name = "InsufficientFundsError";
  }
}

export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Billing account "${accountId}" not found`);
    this.name = "AccountNotFoundError";
  }
}

export interface ChargeInput {
  tenantId: string;
  eventId: string;
  accountId: string;
  amountMinor: number;
  description?: string;
  /** FOR TESTING ONLY: forces a failure after the ledger entry is written. */
  simulateFailureAfterLedgerWrite?: boolean;
}

export interface ChargeResult {
  entryId: string;
  duplicate: boolean;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export async function processCharge(input: ChargeInput): Promise<ChargeResult> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
    throw new Error("amountMinor must be a positive whole number");
  }
  if (!Types.ObjectId.isValid(input.accountId)) {
    throw new AccountNotFoundError(input.accountId);
  }

  const { connection, models } = await getTenantContext(input.tenantId);
  const accountObjectId = new Types.ObjectId(input.accountId);

  // 1) LOCK: only one worker at a time may process this payment.
  return withLock(
    `${input.tenantId}:${input.eventId}`,
    async (): Promise<ChargeResult> => {
      // 2) IDEMPOTENCY: already processed? Return the original.
      const existing = await models.LedgerEntry.findOne({ eventId: input.eventId });
      if (existing) {
        return { entryId: existing._id.toString(), duplicate: true };
      }

      // 3) TRANSACTION: both writes happen, or neither does.
      const session = await connection.startSession();
      try {
        let entryId = "";

        await session.withTransaction(async () => {
          const account = await models.BillingAccount.findById(accountObjectId).session(session);
          if (!account) throw new AccountNotFoundError(input.accountId);
          if (account.status !== "active") throw new Error("Billing account is closed");

          // Write 1: the ledger entry
          const [entry] = await models.LedgerEntry.create(
            [
              {
                eventId: input.eventId,
                accountId: accountObjectId,
                type: "charge",
                amountMinor: input.amountMinor,
                description: input.description,
                status: "completed",
              },
            ],
            { session }
          );
          entryId = entry._id.toString();

          if (input.simulateFailureAfterLedgerWrite) {
            throw new Error("Simulated network failure");
          }

          // Write 2: reduce the balance, but only if there is enough money
          const result = await models.BillingAccount.updateOne(
            {
              _id: accountObjectId,
              status: "active",
              balanceMinor: { $gte: input.amountMinor },
            },
            { $inc: { balanceMinor: -input.amountMinor } },
            { session }
          );
          if (result.modifiedCount === 0) throw new InsufficientFundsError();
        });

        return { entryId, duplicate: false };
      } catch (err) {
        // Safety net: if the lock ever expired and another worker won the race,
        // the unique index on eventId still protects us.
        if (isDuplicateKeyError(err)) {
          const winner = await models.LedgerEntry.findOne({ eventId: input.eventId });
          if (winner) return { entryId: winner._id.toString(), duplicate: true };
        }
        throw err;
      } finally {
        await session.endSession();
      }
    }
  );
}