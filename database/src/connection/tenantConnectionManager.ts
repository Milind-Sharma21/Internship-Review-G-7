import mongoose, { Connection } from "mongoose";
import { env } from "../config/env";
import { Tenant } from "../models/tenant.model";
import { buildTenantModels, TenantModels } from "../models/tenantModels";
import { connectMaster } from "./masterConnection";

export interface TenantContext {
  tenantId: string;
  connection: Connection;
  models: TenantModels;
}

// The "shelf": tenantId -> promise of its open connection.
const registry = new Map<string, Promise<TenantContext>>();

async function openTenant(tenantId: string): Promise<TenantContext> {
  await connectMaster();

  const tenant = await Tenant.findOne({ tenantId, status: "active" }).lean();
  if (!tenant) {
    throw new Error(`Tenant "${tenantId}" not found or suspended`);
  }

  const connection = await mongoose
    .createConnection(tenant.dbUri ?? env.mongoUri, {
      dbName: tenant.dbName,
      maxPoolSize: 10,
    })
    .asPromise();

  const models = buildTenantModels(connection);
  await models.BillingAccount.init();
  await models.LedgerEntry.init(); // builds the unique index on eventId

  return { tenantId, connection, models };
}

export function getTenantContext(tenantId: string): Promise<TenantContext> {
  const key = tenantId.trim().toLowerCase();

  let context = registry.get(key);
  if (!context) {
    context = openTenant(key);
    registry.set(key, context);
    // if opening fails, remove it so the next call can try again
    context.catch(() => registry.delete(key));
  }
  return context;
}

export function openTenantCount(): number {
  return registry.size;
}

export async function closeAllTenantConnections(): Promise<void> {
  const contexts = await Promise.all([...registry.values()]);
  registry.clear();
  await Promise.all(contexts.map((c) => c.connection.close()));
}