import { randomUUID } from "crypto";
import { getRedis } from "./redisClient";

// Only delete the lock if it is still OURS (the token matches).
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

export class LockNotAcquiredError extends Error {
  constructor(key: string) {
    super(`Could not acquire lock "${key}"`);
    this.name = "LockNotAcquiredError";
  }
}

export interface LockOptions {
  ttlMs?: number;        // lock auto-expires after this many milliseconds
  retries?: number;      // how many times to try again if the lock is busy
  retryDelayMs?: number; // wait this long between tries
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Try once. Returns a token if we got the lock, or null if someone else has it.
export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
  const token = randomUUID();
  const result = await getRedis().set(`lock:${key}`, token, "PX", ttlMs, "NX");
  return result === "OK" ? token : null;
}

// Unlock, but only if the token is ours.
export async function releaseLock(key: string, token: string): Promise<boolean> {
  const result = await getRedis().eval(RELEASE_SCRIPT, 1, `lock:${key}`, token);
  return result === 1;
}

// Wait for the lock, run the work, and always unlock afterwards.
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const { ttlMs = 10_000, retries = 20, retryDelayMs = 100 } = options;

  let token: string | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    token = await acquireLock(key, ttlMs);
    if (token) break;
    await sleep(retryDelayMs);
  }
  if (!token) throw new LockNotAcquiredError(key);

  try {
    return await fn();
  } finally {
    await releaseLock(key, token); // runs even if fn() throws an error
  }
}