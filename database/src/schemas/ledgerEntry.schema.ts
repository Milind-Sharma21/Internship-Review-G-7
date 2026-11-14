import { Schema, InferSchemaType } from "mongoose";

export const ledgerEntrySchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "BillingAccount",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["charge", "refund", "credit"], required: true },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "amountMinor must be a whole number",
      },
    },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "rolled_back"],
      default: "completed",
    },
    description: { type: String },
  },
  { timestamps: true }
);

export type LedgerEntryDoc = InferSchemaType<typeof ledgerEntrySchema>;