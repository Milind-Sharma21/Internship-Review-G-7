import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  mongoUri: required("MONGO_URI"),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  masterDbName: "ledgerguard_master",
};