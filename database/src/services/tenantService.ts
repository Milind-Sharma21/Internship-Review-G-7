import { Tenant } from "../models/tenant.model";
import { connectMaster } from "../connection/masterConnection";

export async function createTenant(tenantId: string, name: string, dbUri?: string) {
  await connectMaster();
  const id = tenantId.trim().toLowerCase();

  const existing = await Tenant.findOne({ tenantId: id });
  if (existing) return existing;

  return Tenant.create({ tenantId: id, name, dbName: `tenant_${id}`, dbUri });
}