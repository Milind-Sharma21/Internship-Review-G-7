import mongoose from "mongoose";
import { env } from "../config/env";

let connecting: Promise<typeof mongoose> | null = null;

export function connectMaster(): Promise<typeof mongoose> {
  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri, { dbName: env.masterDbName });
  }
  return connecting;
}

export async function disconnectMaster(): Promise<void> {
  await mongoose.disconnect();
  connecting = null;
}