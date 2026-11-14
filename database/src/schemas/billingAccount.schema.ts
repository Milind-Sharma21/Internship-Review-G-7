import { Schema, InferSchemaType } from "mongoose";

export const billingAccountSchema = new Schema(
  {
    name: { type: String, required: true },
    currency: { type: String, default: "INR" },
    balanceMinor: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

export type BillingAccountDoc = InferSchemaType<typeof billingAccountSchema>;