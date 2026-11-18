import Redis from "ioredis";
import { env } from "../config/env";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.redisUrl, { maxRetriesPerRequest: 3 });
    client.on("error", (err: Error) => {
      console.error("Redis error:", err.message);
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}