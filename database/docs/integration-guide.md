# Integration guide for the backend

Everything you need is exported from `database/src/index.ts`. Do not import from other files in the module.

## 1. Setup

1. In the `database` folder run `npm install`.
2. The process that runs the server needs these environment variables (a `.env` file in the folder the server is started from works, because `dotenv` reads the current working directory):
   - `MONGO_URI`: MongoDB Atlas connection string
   - `REDIS_URL`: Redis URL
3. Ask the database owner for the values. They are never stored in Git.

## 2. Start and stop

```ts
import { initDatabase, shutdownDatabase } from "../database/src";

await initDatabase();        // when the server starts
await shutdownDatabase();    // when the server stops
```

## 3. The one rule about tenant ids

`tenantId` must come from the **verified** JWT (the API gateway decodes it). Never take it from the URL,
query string or request body. Everything in the module is isolated by this id.

## 4. Typical request flow

```ts
// 1) the gateway verifies the token and extracts tenantId
// 2) a payment route calls:
const result = await processCharge({
  tenantId,
  eventId,            // unique per payment attempt. The client or gateway generates it
  accountId,
  amountMinor,        // whole number of paise
  description,        // optional
});

// result = { entryId: string, duplicate: boolean }
```

If the client retries after a timeout, send the **same** `eventId`. The retry is safe:
the charge is applied once and `duplicate` is `true` on the repeat.

## 5. Errors and suggested HTTP responses

| Error | Meaning | Suggested status |
|---|---|---|
| `InsufficientFundsError` | Not enough balance | 402 or 409 |
| `AccountNotFoundError` | Account id does not exist | 404 |
| `LockNotAcquiredError` | Another worker held the lock too long | 503, client may retry |
| `Error` with message `Tenant "<id>" not found or suspended` | Unknown or suspended tenant | 403 |
| `Error` with message `amountMinor must be a positive whole number` | Bad amount | 400 |

```ts
import { InsufficientFundsError, AccountNotFoundError, LockNotAcquiredError } from "../database/src";

try {
  const result = await processCharge(input);
  // respond 200 with result
} catch (err) {
  if (err instanceof InsufficientFundsError) { /* 402 */ }
  else if (err instanceof AccountNotFoundError) { /* 404 */ }
  else if (err instanceof LockNotAcquiredError) { /* 503 */ }
  else { /* 500, and log the error */ }
}
```

## 6. Reading and writing other data

```ts
const { models } = await getTenantContext(tenantId);
const accounts = await models.BillingAccount.find();
```

`models` are already bound to that tenant's own database, so a query can never reach another tenant.

## 7. Managing tenants

```ts
await createTenant("acme", "Acme Ltd");       // id is lowercased automatically
await setTenantStatus("acme", "suspended");   // closes its connection and blocks access
await setTenantStatus("acme", "active");
```

## 8. What this module does not do

JWT decoding, routes, RSA-256 request signing and dashboards belong to the backend and frontend.