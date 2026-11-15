import { Tenant } from "../models/tenant.model";
import { connectMaster } from "../connection/masterConnection";
import { closeTenantConnection } from "../connection/tenantConnectionManager";

export async function createTenant(tenantId: string, name: string, dbUri?: string) {
  await connectMaster();
  const id = tenantId.trim().toLowerCase();

  const existing = await Tenant.findOne({ tenantId: id });
  if (existing) return existing;

  return Tenant.create({ tenantId: id, name, dbName: `tenant_${id}`, dbUri });
}

export async function setTenantStatus(
  tenantId: string,
  status: "active" | "suspended"
) {
  await connectMaster();
  const id = tenantId.trim().toLowerCase();

  const tenant = await Tenant.findOneAndUpdate(
    { tenantId: id },
    { status },
    { returnDocument: "after" }
  );
  if (!tenant) throw new Error(`Tenant "${id}" not found`);

  // A suspended company must lose its open connection immediately.
  if (status === "suspended") {
    await closeTenantConnection(id);
  }
  return tenant;
}