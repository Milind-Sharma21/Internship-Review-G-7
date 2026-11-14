import { Schema, model, InferSchemaType } from "mongoose";

const tenantSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    dbName: { type: String, required: true, unique: true },
    dbUri: { type: String },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export type TenantDoc = InferSchemaType<typeof tenantSchema>;
export const Tenant = model("Tenant", tenantSchema);