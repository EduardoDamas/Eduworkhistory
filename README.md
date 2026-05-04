# Restaurant order platform (Phases 1–6)

Multi-tenant Node.js + TypeScript service with PostgreSQL (Prisma), Redis (BullMQ), API key auth, structured logging, Docker, an **idempotent inbound webhook** pipeline (Phase 2), a **WhatsApp conversation → catalog → order** flow (Phase 3), operator lifecycle transitions (Phase 4), real WhatsApp Cloud API outbound support (Phase 5), and production-readiness smoke/testing controls for Meta Cloud API (Phase 6).

## Prerequisites

- Node.js 20+
- Docker (optional, for compose stack)

## Local development

1. Copy environment file and adjust if needed (required before `npm install`, because `postinstall` runs `prisma generate`):

   `cp .env.example .env` (POSIX) or `copy .env.example .env` (Windows)

2. Start PostgreSQL and Redis (example using Docker):

   `docker compose up -d postgres redis`

3. Install dependencies and apply migrations:

   `npm install`

   `npx prisma migrate deploy`

4. Run API and worker in separate terminals:

   `npm run dev`

   `npm run dev:worker`

5. Health check:

   `curl http://localhost:3000/health`

## Onboarding a tenant

Create a tenant (no API key required):

`curl -X POST http://localhost:3000/tenants -H "content-type: application/json" -d "{\"name\":\"Demo Restaurant\"}"`

The response includes `apiKey`. Send it on every protected request as header `x-api-key`.

## Docker (app + postgres + redis + worker)

`docker compose up --build`

The `app` service runs migrations then starts the HTTP server on port 3000. The `worker` service runs `dist/worker.js` and consumes **both** the `default` queue and the **`inbound-events`** queue.

## Scripts

| Script            | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | API with hot reload (tsx)  |
| `npm run dev:worker` | Worker with hot reload  |
| `npm run build`   | TypeScript compile         |
| `npm start`       | Run compiled API           |
| `npm run start:worker` | Run compiled worker   |
| `npx prisma migrate dev` | Create migrations (dev) |
| `npx prisma db seed`     | Seed demo catalog products per tenant |

## Phase 5 - WhatsApp Cloud API integration

### New env vars

- `WHATSAPP_SEND_MODE`: `mock` (default) or `cloud`
- `WHATSAPP_GRAPH_API_VERSION`: Meta Graph version used for send calls (default `v20.0`)
- `WHATSAPP_REQUIRE_SIGNATURE`: `true/false` gate for `X-Hub-Signature-256` enforcement

### New tenant-scoped WhatsApp account endpoints (require `x-api-key`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/whatsapp/accounts` | Create/update tenant WhatsApp Cloud credentials. |
| `GET` | `/whatsapp/accounts` | List configured WhatsApp account entries (token is masked). |
| `PATCH` | `/whatsapp/accounts/:id` | Update account settings (`isActive`, token, verify token, etc.). |

Create account example:

```bash
curl -sS -X POST http://localhost:3000/whatsapp/accounts \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{
    "phoneNumberId":"1234567890",
    "businessAccountId":"9876543210",
    "accessToken":"EAA...",
    "verifyToken":"my-verify-token",
    "appSecret":"my-app-secret",
    "isActive":true
  }'
```

### WhatsApp webhook verification + tenant resolution

- `GET /webhooks/whatsapp` is public for Meta verification and validates `hub.verify_token` against configured tenant accounts.
- `POST /webhooks/whatsapp` is accepted without auth middleware:
  - resolves tenant by `phone_number_id` from payload when possible,
  - falls back to `x-api-key`,
  - optionally validates `X-Hub-Signature-256` when `WHATSAPP_REQUIRE_SIGNATURE=true`.

Verification example:

```bash
curl "http://localhost:3000/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=12345"
```

### Outbound send behavior

- Outbound messages are always stored in `whatsapp_messages`.
- In `mock` mode, no external call is made.
- In `cloud` mode, service sends to Meta Cloud API and stores provider response/error in `raw_payload` for retry/diagnostics.

## Phase 6 - Real Meta WhatsApp Cloud API production readiness

### Endpoint additions

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/whatsapp/accounts/:id/test-send` | Tenant-scoped smoke send. Uses real Meta send only when `WHATSAPP_SEND_MODE=cloud`; otherwise returns simulated success. |

Example:

```bash
curl -sS -X POST http://localhost:3000/whatsapp/accounts/ACCOUNT_ID/test-send \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{
    "to":"5511999999999",
    "message":"Teste de envio via WhatsApp Cloud API"
  }'
```

### Real Meta setup checklist

1. **Get `phone_number_id`**  
   In Meta App Dashboard: `WhatsApp > API Setup > From` number block (shows `Phone number ID`).
2. **Get token**  
   - Temporary token: Meta API Setup page (for quick local tests).  
   - Permanent token: create a System User token in Meta Business Manager with WhatsApp permissions.
3. **Create/Update account in API**
   - `POST /whatsapp/accounts` to create (or upsert tenant account)
   - `PATCH /whatsapp/accounts/:id` to rotate token/update ids/secrets without exposing token in responses
4. **Enable cloud mode**
   - Set `.env`: `WHATSAPP_SEND_MODE=cloud`
   - Keep `WHATSAPP_GRAPH_API_VERSION` aligned with your Meta app
5. **Smoke test**
   - Call `POST /whatsapp/accounts/:id/test-send`
   - Check response for `providerMessageId` and `providerStatusCode`
   - Check `whatsapp_messages` row for `raw_payload.provider`, `providerMessageId`, `providerStatusCode`, `providerError`
6. **Webhook callback setup in Meta**
   - Callback URL: `https://<your-domain>/webhooks/whatsapp`
   - Verify token: same value configured in account `verifyToken`
   - Subscribe to `messages` field in the WhatsApp webhook product
7. **Webhook verify test**
   - Meta sends `GET /webhooks/whatsapp?hub.mode=subscribe...`
   - API responds with `hub.challenge` only when token matches a configured active account

### Provider persistence fields (`whatsapp_messages.raw_payload`)

- `simulatedOutbound`: `true` in mock mode, `false` in cloud mode
- `provider`: always `"meta"`
- `providerMessageId`: populated on success when Meta returns a message id
- `providerStatusCode`: HTTP status from Meta response
- `providerError`: populated on failure with structured data:
  - `provider`
  - `statusCode`
  - `errorCode`
  - `errorMessage`
  - `raw`

## Phase 6 - Comanda / Legacy JSON integration

Internal JSON API for legacy/comanda systems using existing tenant API-key auth.

### Authentication

- Send `x-api-key` in all `/comanda` requests.
- Every query/update is tenant-scoped; cross-tenant reads/writes are blocked by `tenant_id`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/comanda/orders/pending` | Pull orders in `PENDING_CONFIRMATION` and `ORDER_RECEIVED`. |
| `GET` | `/comanda/orders/:id` | Fetch one full order with customer, items, and history. |
| `PATCH` | `/comanda/orders/:id/status` | Update order status with transition validation + history. |
| `PATCH` | `/comanda/products/:id/availability` | Toggle `product.active` flag. |
| `GET` | `/comanda/catalog` | Fetch catalog with active/inactive products. |

### Status transitions (comanda flow)

Allowed:

- `PENDING_CONFIRMATION -> ORDER_ACCEPTED`
- `ORDER_RECEIVED -> ORDER_ACCEPTED`
- `ORDER_ACCEPTED -> ORDER_READY`
- `ORDER_READY -> ORDER_DELIVERING`
- `ORDER_DELIVERING -> ORDER_DELIVERED`
- `PENDING_CONFIRMATION -> CANCELLED`
- `ORDER_RECEIVED -> CANCELLED`

Idempotent:

- If requested status equals current status, response is success and no duplicate history row is created.

Invalid:

- API returns `400` with a clear transition error.

### Integration logs

Every comanda action writes a row to `comanda_integration_logs`:

- pull pending orders
- pull one order
- update order status
- update product availability
- success and error outcomes

### curl examples

**1) Pull pending orders**

```bash
curl -sS http://localhost:3000/comanda/orders/pending \
  -H "x-api-key: API_KEY"
```

**2) Get one order**

```bash
curl -sS http://localhost:3000/comanda/orders/ORDER_ID \
  -H "x-api-key: API_KEY"
```

**3) Update status**

```bash
curl -sS -X PATCH http://localhost:3000/comanda/orders/ORDER_ID/status \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{"status":"ORDER_ACCEPTED"}'
```

**4) Update product availability**

```bash
curl -sS -X PATCH http://localhost:3000/comanda/products/PRODUCT_ID/availability \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{"active":false}'
```

**5) Fetch catalog**

```bash
curl -sS http://localhost:3000/comanda/catalog \
  -H "x-api-key: API_KEY"
```

## Phase 7 - Product mapping + legacy adapter preparation

Phase 7 prepares legacy synchronization contracts without direct Firebird/MSSQL connectivity.

### Product mapping model

Products now support:

- `externalId`
- `externalSource` (`FIREBIRD`, `MSSQL`, `MANUAL`, `UNKNOWN`)
- `lastSyncedAt`
- `syncMetadata`

### Product mapping endpoints (`x-api-key` required)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/products` | List tenant products with mapping fields. |
| `GET` | `/products/:id` | Get one tenant product with mapping fields. |
| `PATCH` | `/products/:id/mapping` | Configure external mapping metadata. |

Example patch:

```bash
curl -sS -X PATCH http://localhost:3000/products/PRODUCT_ID/mapping \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{
    "externalId":"123",
    "externalSource":"FIREBIRD",
    "syncMetadata":{"legacyTable":"PRODUTOS","legacyCategoryId":"10"}
  }'
```

### Comanda catalog output update

`GET /comanda/catalog` now includes:

- `externalId`
- `externalSource`
- `syncMetadata`

### Order export contract (normalized JSON)

When order reaches `ORDER_ACCEPTED`, export contract produced by mapper:

```json
{
  "orderId": "...",
  "tenantId": "...",
  "source": "WHATSAPP",
  "status": "ORDER_ACCEPTED",
  "customer": {
    "id": "...",
    "name": "...",
    "phone": "...",
    "address": "..."
  },
  "items": [
    {
      "productId": "...",
      "externalId": "...",
      "externalSource": "FIREBIRD",
      "name": "...",
      "quantity": 1,
      "unitPrice": 55.8
    }
  ],
  "total": 114.6,
  "createdAt": "...",
  "metadata": {}
}
```

### Legacy adapters (mock-safe)

Created adapters:

- `firebird.adapter.ts`
- `mssql.adapter.ts`
- `mock.adapter.ts`

For now, adapters:

- do **not** open DB connections,
- log/export JSON only,
- return mock success responses.

### Export trigger behavior

Order export is triggered when order transitions to `ORDER_ACCEPTED` from:

- `PATCH /comanda/orders/:id/status`
- `PATCH /orders/:id/accept`

If export fails:

- status transition remains successful,
- failure is logged,
- export failure is recorded in integration logs.

### Legacy export logs

Using `comanda_integration_logs` with actions:

- `legacy_order_export_attempt`
- `legacy_order_export_success`
- `legacy_order_export_failed`

### Quick mock export test

1. Patch product mappings to `externalSource: FIREBIRD` or `MSSQL`.
2. Accept order:
   - `PATCH /comanda/orders/:id/status` with `ORDER_ACCEPTED`, or
   - `PATCH /orders/:id/accept`
3. Inspect logs table for legacy export actions.

### Not real yet in Phase 7 (intentionally)

- Phase 7 adapters did not open DB connections (JSON/mock only).
- **Phase 9** adds optional real Firebird/MSSQL connectors when `LEGACY_EXPORT_MODE=live` and tenant config allows it (see Phase 9).
- No iFood integration in this phase

## Phase 8 - Legacy connector foundation + retry queue

Phase 8 introduces safe connector orchestration, idempotent export attempts, and retry queueing while keeping mock mode as default.

### Env modes

- `LEGACY_EXPORT_MODE=mock`  
  Always uses mock connector. No external DB connection.
- `LEGACY_EXPORT_MODE=dry-run`  
  Builds payload and records attempts/logs, but does not perform live writes.
- `LEGACY_EXPORT_MODE=live`  
  Requires enabled tenant legacy config for source. If missing/disabled, export fails and retry is scheduled.

Retry settings:

- `LEGACY_EXPORT_RETRY_ATTEMPTS` (default `5`)
- `LEGACY_EXPORT_RETRY_BACKOFF_MS` (default `3000`)

### Legacy config endpoints (`x-api-key`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/legacy/configs` | Create/update tenant config by source (`FIREBIRD`/`MSSQL`). |
| `GET` | `/legacy/configs` | List tenant configs (password hidden). |
| `GET` | `/legacy/configs/:id/health` | Connection health (see Phase 9). |
| `PATCH` | `/legacy/configs/:id` | Patch config fields (`enabled`, `dryRun`, connection data). |

Config example:

```bash
curl -sS -X POST http://localhost:3000/legacy/configs \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{
    "source":"FIREBIRD",
    "host":"localhost",
    "port":3050,
    "databaseName":"/path/to/db.fdb",
    "username":"SYSDBA",
    "password":"masterkey",
    "options":{},
    "enabled":true,
    "dryRun":true
  }'
```

### Legacy export attempts endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/legacy/export-attempts` | List export attempts for tenant. |
| `GET` | `/legacy/export-attempts/:id` | Get one attempt detail. |
| `POST` | `/legacy/export-attempts/:id/retry` | Manually enqueue retry job. |

Manual retry:

```bash
curl -sS -X POST http://localhost:3000/legacy/export-attempts/ATTEMPT_ID/retry \
  -H "x-api-key: API_KEY"
```

### Queue and worker

- Queue: `legacy-export`
- Job payload:
  - `tenantId`
  - `orderId`
  - `source`
  - `attemptId`
- Worker: `legacy-export.worker.ts`
- Backoff/retry controlled by env.

### Idempotency behavior

- Unique attempt key: `(tenant_id, order_id, source)`
- If existing attempt is `SUCCESS`, export is skipped (`legacy_export_skipped_already_success`).
- Failed/retrying attempts can be retried through queue/manual retry endpoint.
- Duplicate successful exports are prevented.

### Trigger behavior

`ORDER_ACCEPTED` still triggers export from:

- `/orders/:id/accept`
- `/comanda/orders/:id/status` with `ORDER_ACCEPTED`

Failures do not block status transition; failures are logged and scheduled for retry.

### Safety by default

- Passwords are never returned by config endpoints.
- No production DB connection happens in mock mode.
- Live mode only attempts connector flow when config is enabled.

## Phase 9 — Real Firebird / MSSQL connectors (optional, guarded)

Phase 9 adds **real** database connectors (`node-firebird`, `mssql`) behind the same orchestration as Phase 8. **Default remains safe:** `LEGACY_EXPORT_MODE=mock`. **No writes to a legacy DB** unless **all** of the following are true:

- `LEGACY_EXPORT_MODE=live` (not `mock` or `dry-run`)
- Tenant legacy config `enabled: true`
- Tenant legacy config `dryRun: false`
- Required connection fields are present (`host`, `databaseName`, `username`; `password` on create when not dry-run)

`LEGACY_EXPORT_MODE=dry-run` never opens a legacy connection for writes; it behaves like Phase 8 dry-run (payload + attempts/logs only).

### Env

- `LEGACY_DB_TIMEOUT_MS` (default `15000`) — attach / connect and per-request timeouts for live connectors.

### Config `options`: tables and columns

Table and column names are taken from `legacy_connection_configs.options` (JSON). Identifiers are validated (alphanumeric + underscore) before use. If keys are missing, defaults match common Portuguese-style names:

- Tables: `orders` → `PEDIDOS`, `items` → `PEDIDO_ITENS`
- Order columns: `orderExternalId`, `customerName`, `customerPhone`, `total`, `status`
- Item columns (under `options.columns.items`): `orderFk` (FK to header), `name`, `quantity`, `unitPrice`, `lineTotal`

Example **Firebird** body (dry-run safe — use `dryRun: true` until you are ready):

```json
{
  "source": "FIREBIRD",
  "host": "legacy-host",
  "port": 3050,
  "databaseName": "/data/legacy.fdb",
  "username": "SYSDBA",
  "password": "secret",
  "enabled": true,
  "dryRun": true,
  "options": {
    "tables": { "orders": "PEDIDOS", "items": "PEDIDO_ITENS" },
    "columns": {
      "orderExternalId": "EXTERNAL_ORDER_ID",
      "customerName": "CUSTOMER_NAME",
      "customerPhone": "CUSTOMER_PHONE",
      "total": "TOTAL",
      "status": "STATUS",
      "items": {
        "orderFk": "PEDIDO_ID",
        "name": "ITEM_NAME",
        "quantity": "QTY",
        "unitPrice": "UNIT_PRICE",
        "lineTotal": "LINE_TOTAL"
      }
    }
  }
}
```

Example **MSSQL** (same `options` shape; `databaseName` is the SQL Server database name):

```json
{
  "source": "MSSQL",
  "host": "sql.example.com",
  "port": 1433,
  "databaseName": "LegacyERP",
  "username": "export_user",
  "password": "secret",
  "enabled": true,
  "dryRun": true,
  "options": { "tables": { "orders": "Orders", "items": "OrderLines" } }
}
```

### Health check

```bash
curl -sS "http://localhost:3000/legacy/configs/CONFIG_ID/health" \
  -H "x-api-key: API_KEY"
```

- Tenant-scoped; responses **never** include the password.
- In `mock` / global dry-run modes, or when the config has `dryRun: true`, the result is a **simulated** healthy payload with `latencyMs`.
- With `LEGACY_EXPORT_MODE=live` and an enabled config with full credentials, the handler runs a real **connect/ping** and returns `latencyMs` and `ok` / error detail.

### Target-DB idempotency

Before inserting, connectors check whether a row with the same **external order id** already exists (column mapped by `orderExternalId`, value from the order’s `externalOrderId`). If found, the export returns `alreadyExists: true` and **does not** insert again. To test: accept an order twice (or retry export) with the same external id — the second run should report idempotency without duplicate rows.

### Firebird in Docker

`node-firebird` may require native build tools in some images. If the driver fails to load, the API returns a clear **not configured** style error (`LEGACY_FIREBIRD_NOT_CONFIGURED`); the connector interface stays in place until the runtime can load the package.

### Validation (create / patch)

- `source` is required.
- For **live** paths with `enabled` and `dryRun: false`, `host`, `databaseName`, and `username` are required; `password` is required on **create** and optional on **patch** (omit to keep the existing stored secret).

## Phase 3 — WhatsApp customer + order flow

When the inbound worker processes an `inbound_events` row with **`source = WHATSAPP`**, it runs the WhatsApp flow **after** the generic normalization log: inbound text is extracted from a Cloud API–shaped JSON payload, stored in **`whatsapp_messages`**, and **`whatsapp_conversations`** drives onboarding (name → address → item codes). **Outbound replies are logged only** (`whatsapp_messages.direction = OUTBOUND`, `simulatedOutbound` in JSON) — Meta Cloud API is not called.

### New / updated HTTP endpoints (all require `x-api-key`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/catalog` | List active products (auto-seeds demo pizzas if the tenant has none). |
| `GET` | `/orders/pending-confirmation` | Operator list of `PENDING_CONFIRMATION` orders. |
| `PATCH` | `/orders/:id/confirm` | Body optional: `{ "status": "ORDER_RECEIVED" }` (default) or `"ORDER_ACCEPTED"`. Writes `order_status_history`. |

### Step-by-step manual test (curl)

Set `API_KEY` from `POST /tenants`. Run **API + worker** from the repo root. Use a **new** `x-external-event-id` per simulated inbound message (Phase 2 idempotency). Payloads live under `scripts/wa-flow-*.json` (Cloud API shape).

**Payload shape:** inbound text is read from `entry[].changes[].value.messages[].text.body` and phone from `messages[].from`. The `type: "text"` field is **optional** (many test payloads omit it); the worker logs `whatsapp_payload_extracted` with `phone`, `textLength`, and `messageType` (`unspecified` when `type` is absent).

**1) First WhatsApp message (new customer)** — expect greeting + `NEEDS_NAME`:

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-external-event-id: wa-flow-001" \
  --data-binary @scripts/wa-flow-001.json
```

**2) Name reply**

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-external-event-id: wa-flow-002" \
  --data-binary @scripts/wa-flow-002.json
```

**3) Address reply** — expect menu in outbound logs / DB:

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-external-event-id: wa-flow-003" \
  --data-binary @scripts/wa-flow-003.json
```

**4) Item selection** — codes `1,2` or `01 02` (see `GET /catalog`):

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-external-event-id: wa-flow-004" \
  --data-binary @scripts/wa-flow-004.json
```

**5) Duplicate webhook** — same `x-external-event-id` as step 4 → `duplicate: true`, no second order:

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-external-event-id: wa-flow-004" \
  --data-binary @scripts/wa-flow-004.json
```

**6) Pending confirmation** (operator):

```bash
curl -sS http://localhost:3000/orders/pending-confirmation -H "x-api-key: API_KEY"
```

**7) Confirm order** — replace `ORDER_ID` from step 6:

```bash
curl -sS -X PATCH http://localhost:3000/orders/ORDER_ID/confirm \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{}'
```

**8) Catalog** (optional):

```bash
curl -sS http://localhost:3000/catalog -H "x-api-key: API_KEY"
```

## Phase 2 — inbound webhooks (ingestion only)

Webhook routes:

- `POST /webhooks/whatsapp`
- `POST /webhooks/ifood`
- `POST /webhooks/99food`

`POST /webhooks/ifood` and `POST /webhooks/99food` require `x-api-key` for tenant resolution. `POST /webhooks/whatsapp` resolves tenant from `phone_number_id` first and can fall back to `x-api-key`.

Each handler: **validate** JSON body → **resolve** `external_event_id` (headers `x-external-event-id` or `x-idempotency-key` preferred, else channel-specific extraction, else deterministic `hash:<sha256>` of payload) → **insert** `inbound_events` (`RECEIVED`) → **enqueue** BullMQ job on queue **`inbound-events`** → **mark** row `QUEUED` → return **200** quickly (no heavy work in-controller). **WhatsApp** rows are then processed **asynchronously** in the worker (Phase 3).

### Expected response time

The HTTP handler only performs DB insert + Redis enqueue + a small status update. Under normal conditions this stays **well under 500 ms** on a local or co-located stack. Slow Postgres/Redis or very large JSON bodies can increase latency; tune timeouts and payload limits (`express.json` limit is **5mb**) as needed.

### Duplicate (idempotent) deliveries

Unique key: **`(tenant_id, source, external_event_id)`**.

- If the same triple already exists, the API still returns **HTTP 200** with `{ "ok": true, "duplicate": true, "state": "DUPLICATE", "inboundEventId": "<existing row>" }`.
- **No second BullMQ job** is enqueued; the original event is **not** reprocessed by design.
- The original row keeps its own lifecycle (`QUEUED` → `PROCESSING` → `PROCESSED` / `FAILED`).

### curl examples

Replace `YOUR_API_KEY` and adjust host/port if needed.

**WhatsApp-shaped body (minimal Cloud API envelope):**

```bash
curl -sS -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-external-event-id: wa-msg-001" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

**iFood-style body (or use header idempotency):**

```bash
curl -sS -X POST http://localhost:3000/webhooks/ifood \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-idempotency-key: ifood-event-123" \
  -d '{"id":"ifood-event-123","detail":"stub"}'
```

**99Food-style body:**

```bash
curl -sS -X POST http://localhost:3000/webhooks/99food \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"event_id":"nn-evt-1","payload":{}}'
```

**Send the same request again** (same `external_event_id` resolution) to observe the duplicate response with `duplicate: true`.

## Architecture notes

- **Tenancy**: `x-api-key` resolves a `Tenant` row; `tenant_id` is injected via `AsyncLocalStorage` and enforced in repositories/services.
- **Inbound pipeline**: webhooks persist `inbound_events` and enqueue **`inbound-events`** jobs; workers set `PROCESSED` / `FAILED` after handling. For **`WHATSAPP`**, the worker additionally runs the **Phase 3 flow** (messages, conversation, optional order) before marking the inbound event processed.
- **Queues**: BullMQ **`default`** queue (still used for the Phase 1 `POST /orders` smoke job) and **`inbound-events`** for ingestion.
