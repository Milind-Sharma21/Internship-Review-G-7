import {
  withLock,
  acquireLock,
  releaseLock,
  LockNotAcquiredError,
} from "../redis/lock";
import { closeRedis } from "../redis/redisClient";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const base = `demo:${Date.now()}`;

  // 1) Five workers want the SAME lock: they must go one at a time
  let inside = 0;
  let maxInside = 0;
  let ran = 0;
  await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      withLock(`${base}:one`, async () => {
        inside++;
        maxInside = Math.max(maxInside, inside);
        await sleep(150);
        inside--;
        ran++;
      })
    )
  );
  console.log("workers that ran (expect 5):", ran);
  console.log("max workers inside the lock at once (expect 1):", maxInside);

  // 2) Two DIFFERENT locks do not block each other
  let insideTwo = 0;
  let maxTwo = 0;
  const work = async (): Promise<void> => {
    insideTwo++;
    maxTwo = Math.max(maxTwo, insideTwo);
    await sleep(300);
    insideTwo--;
  };
  await Promise.all([withLock(`${base}:x`, work), withLock(`${base}:y`, work)]);
  console.log("different keys run side by side (expect 2):", maxTwo);

  // 3) A lock expires by itself (protects against crashes)
  const ttlKey = `${base}:ttl`;
  const first = await acquireLock(ttlKey, 300);
  const second = await acquireLock(ttlKey, 300);
  console.log("first try got the lock (expect true):", first !== null);
  console.log("second try while held (expect null):", second);
  await sleep(500);
  const third = await acquireLock(ttlKey, 300);
  console.log("lock free again after expiry (expect true):", third !== null);
  if (third) await releaseLock(ttlKey, third);

  // 4) Only the owner's token can unlock
  const tokenKey = `${base}:token`;
  const token = await acquireLock(tokenKey, 5000);
  console.log("wrong token cannot release (expect false):", await releaseLock(tokenKey, "not-my-token"));
  console.log("correct token releases (expect true):", token ? await releaseLock(tokenKey, token) : false);

  // 5) The lock is released even when the work fails
  const errorKey = `${base}:error`;
  try {
    await withLock(errorKey, async () => {
      throw new Error("something went wrong");
    });
  } catch {
    // expected
  }
  const afterError = await acquireLock(errorKey, 1000);
  console.log("lock freed even after an error (expect true):", afterError !== null);
  if (afterError) await releaseLock(errorKey, afterError);

  // 6) If the lock stays busy, give up with a clear error
  const busyKey = `${base}:busy`;
  const held = await acquireLock(busyKey, 5000);
  try {
    await withLock(busyKey, async () => "never runs", { retries: 2, retryDelayMs: 50 });
    console.log("ERROR: ran while the lock was held");
  } catch (e) {
    console.log(
      "gave up when lock stayed busy (expected):",
      e instanceof LockNotAcquiredError ? "LockNotAcquiredError" : (e as Error).message
    );
  }
  if (held) await releaseLock(busyKey, held);

  await closeRedis();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});