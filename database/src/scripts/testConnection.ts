import "dotenv/config";
import mongoose from "mongoose";

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing in .env");
  await mongoose.connect(uri, { dbName: "ledgerguard_master" });
  console.log("Connected to database:", mongoose.connection.name);
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error("Connection failed:", err);
  process.exit(1);
});