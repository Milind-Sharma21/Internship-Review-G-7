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

function normalise(tenantId: string): string {
  return tenantId.trim().toLowerCase();
}

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

export async function getTenantContext(tenantId: string): Promise<TenantContext> {
  const key = normalise(tenantId);

  const cached = registry.get(key);
  if (cached) {
    const context = await cached;
    if (context.connection.readyState === 1) {
      return context; // 1 means "connected"
    }
    // The connection dropped: forget it, close it quietly, and open a fresh one.
    if (registry.get(key) === cached) {
      registry.delete(key);
      context.connection.close().catch(() => undefined);
    }
    return getTenantContext(key);
  }

  const fresh = openTenant(key);
  registry.set(key, fresh);
  // if opening fails, remove it so the next call can try again
  fresh.catch(() => {
    if (registry.get(key) === fresh) registry.delete(key);
  });
  return fresh;
}

export async function closeTenantConnection(tenantId: string): Promise<boolean> {
  const key = normalise(tenantId);
  const cached = registry.get(key);
  if (!cached) return false;

  registry.delete(key);
  try {
    const context = await cached;
    await context.connection.close();
  } catch {
    // the connection never opened, so there is nothing to close
  }
  return true;
}

export function openTenantCount(): number {
  return registry.size;
}

export async function closeAllTenantConnections(): Promise<void> {
  const entries = [...registry.values()];
  registry.clear();
  const results = await Promise.allSettled(entries);
  await Promise.all(
    results.map((r) =>
      r.status === "fulfilled" ? r.value.connection.close() : Promise.resolve()
    )
  );
}