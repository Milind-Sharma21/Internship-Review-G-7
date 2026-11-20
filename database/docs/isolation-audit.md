# LedgerGuard – Tenant Isolation Audit

## Isolation controls and where they live in the code

| # | Control | Where | Why it matters |
|---|---|---|---|
| 1 | Every tenant has its own database (`tenant_<id>`) | `models/tenant.model.ts` (`dbName`, unique) and `connection/tenantConnectionManager.ts` (`createConnection` with `dbName`) | Data of two companies never shares a database |
| 2 | Models are built per connection | `models/tenantModels.ts` (`buildTenantModels(conn)`) | A model can only read the database of the connection it was built on |
| 3 | Tenant ids are trimmed and lowercased before lookup | `connection/tenantConnectionManager.ts` (`getTenantContext`) | `"Company A"`, `" companya "` and `"COMPANYA"` can never become different tenants |
| 4 | Unknown and suspended tenants are refused | `openTenant` and `services/tenantService.ts` (`setTenantStatus`) | A suspended company loses its connection immediately |
| 5 | Master database holds only the tenant list | `models/tenant.model.ts` | No money data sits in the shared database |
| 6 | Redis lock keys include the tenant id (`tenantId:eventId`) | `services/paymentService.ts` | One company's payment can never block another's |
| 7 | Unique `eventId` lives inside each tenant database | `schemas/ledgerEntry.schema.ts` | The same event ID in two companies never clashes |
| 8 | Transactions run on the tenant's own connection | `services/paymentService.ts` (`connection.startSession()`) | Writes and rollbacks stay inside one tenant |
| 9 | Secrets are kept in `.env`, which is ignored by Git | `.gitignore`, `.env.example` | No password reaches GitHub |

## Automated evidence

- `src/scripts/isolationAudit.ts`: 14 PASS/FAIL checks.
- `src/scripts/switchingLoadTest.ts`: switching speed and isolation under load.

### Results (fill in after running)

- Date of run: 
- isolationAudit.ts: __ of 14 checks passed
- Warm switch median / p95 / p99 (ms): 
- Mixed-up results across 200 simultaneous requests: 

## Known limits (honest notes)

- All tenants share one Atlas cluster unless a tenant has its own `dbUri`. One database user currently has access to every tenant database. Planned: a restricted database user (security hardening).
- Query times measured from a laptop include internet travel time to Atlas.