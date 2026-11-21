import { connectMaster, disconnectMaster } from "./connection/masterConnection";
import { closeAllTenantConnections } from "./connection/tenantConnectionManager";
import { closeRedis } from "./redis/redisClient";

/** Call once when the server starts. */
export async function initDatabase(): Promise<void> {
  await connectMaster();
}

/** Call once when the server stops. Closes MongoDB and Redis connections cleanly. */
export async function shutdownDatabase(): Promise<void> {
  await closeAllTenantConnections();
  await closeRedis();
  await disconnectMaster();
}

export {
  getTenantContext,
  closeTenantConnection,
  closeAllTenantConnections,
  openTenantCount,
} from "./connection/tenantConnectionManager";
export type { TenantContext } from "./connection/tenantConnectionManager";

export { createTenant, setTenantStatus } from "./services/tenantService";

export { recordLedgerEntry } from "./services/ledgerService";
export type { RecordEntryInput } from "./services/ledgerService";

export {
  processCharge,
  InsufficientFundsError,
  AccountNotFoundError,
} from "./services/paymentService";
export type { ChargeInput, ChargeResult } from "./services/paymentService";

export { withLock, LockNotAcquiredError } from "./redis/lock";

export type { TenantModels } from "./models/tenantModels";