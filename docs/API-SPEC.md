# SLS To-Do — HTTP API Specification

**Version:** 1.0  
**Status:** Approved for implementation  
**Audience:** Frontend, Integrations (Chat UI, n8n), Provider adapters (WhatsApp)

> Purpose: Stable, reviewable contracts for the server boundary. All mutations go through these APIs (or equivalent Server Actions). This spec is the source of truth for routes, payloads, validation, and error shapes.

---

## 0) Conventions

* **Base URL**: `https://<app-domain>` (Vercel)
* **Content-Type**: `application/json; charset=utf-8`
* **IDs**: `id` fields are UUIDv4.
* **Timestamps**: ISO-8601 (UTC), e.g., `2025-08-29T03:10:00Z`.
* **Correlation**: Responses MAY include `request_id` (UUID). Servers MUST log it.
* **No Auth** (v1.0): Data is partitioned by **Identifier** (email or name) normalized to `identifier_norm` (lowercased, trimmed). All list/read/write must be scoped by this value.
* **Errors**: Unified error envelope (see §6).

---

## 1) Data Models

### 1.1 `Todo` (server representation)

| Field                  | Type              | Required | Notes                                                        |
| ---------------------- | ----------------- | -------- | ------------------------------------------------------------ |
| `id`                   | string(uuid)      | yes      | Primary key                                                  |
| `identifier_norm`      | string            | yes      | Lowercased partition key (derived from input Identifier)     |
| `identifier_raw`       | string            | yes      | Original user-entered string for display                     |
| `title`                | string            | yes      | 1–200 chars; trimmed; no HTML                                |
| `description`          | string \| null    | no       | 0–2000 chars; optional; plain text only                      |
| `priority`             | string            | yes      | One of: `P0`, `P1`, `P2` (default), `P3`                     |
| `project`              | string \| null    | no       | 0–80 chars; optional                                         |
| `tags`                 | string\[]         | no       | Case-insensitive dedupe on save; each tag 1–24 chars; max 20 |
| `completed`            | boolean           | yes      | Default `false`                                              |
| `enhanced_description` | string \| null    | no       | Set by n8n/LLM enrichment                                    |
| `steps`                | string\[] \| null | no       | Array of step texts set by n8n/LLM                           |
| `created_at`           | string(datetime)  | yes      | Server time                                                  |
| `updated_at`           | string(datetime)  | yes      | Server time                                                  |

### 1.2 Validation Rules (server-enforced)

* **Identifier input**: allowed chars `[A-Za-z0-9@._\- ]`; trim; collapse internal multiple spaces to single; `identifier_norm = lower(trimmed))`.
* **Title**: required, non-empty after trim, ≤ 200 chars.
* **Priority**: enum `P0|P1|P2|P3`.
* **Tags**: split by comma (`,`) if provided; trim each; drop empties; dedupe case-insensitively; each ≤ 24 chars; max 20.
* **Text fields** rendered as plain text; HTML/script is treated as literal (no HTML execution).

---

## 2) Endpoints

> NOTE: CRUD can be implemented via Next.js **Server Actions**; when using HTTP directly (Chat, providers, tests), use the routes below.

### 2.1 `POST /api/todos` — Create

Create a todo for a **locked Identifier**.

**Request body**
```json
{
  "identifier": "John.Doe@example.com",
  "title": "Write PRD",
  "description": "Draft sections 1.4.x",
  "priority": "P1",
  "project": "SLS To-Do",
  "tags": ["docs","prd"]
}
```

**Rules**

* `identifier` required; all writes are scoped to it (server derives `identifier_norm` + stores `identifier_raw`).
* Defaults: `priority=P2`, `completed=false`, empty optional fields become `null`/`[]`.

**Responses**

* `201 Created`

```json
{ "todo": { /* Todo object */ }, "request_id": "f5a4d8fe-2e0a-4a5b-9a1d-1c2b3d4e5f67" }
```


* `400 BAD_REQUEST` (validation error) — see §6.

**cURL**

```bash
curl -X POST https://<app>/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"john@example.com","title":"Write PRD"}'
```


---

### 2.2 `GET /api/todos` — List (paginated)

List todos for an Identifier.

**Query params**

* `identifier` (string, **required**)
* `status` (`all|active|completed`, default `active`)
* `limit` (int, 1–100; default 50)
* `cursor` (string; opaque token for pagination, optional)

**Response**

* `200 OK`

```json
{
  "items": [ /* Todo[] */ ],
  "next_cursor": "opaque-token-or-null",
  "count_active": 12,
  "count_completed": 7,
  "request_id": "..."
}
```

**cURL**

```bash
curl "https://<app>/api/todos?identifier=john@example.com&status=active&limit=50"
```

---

### 2.3 `GET /api/todos/:id` — Fetch by ID

Fetch a single todo (must belong to the Identifier).

**Query params**

* `identifier` (required) — used to scope the lookup.

**Response**

* `200 OK` — `{ "todo": { ... } }`
* `404 NOT_FOUND` — if id not found for that Identifier.

**Example**

```http
GET /api/todos/0f40b8b1-26a7-4c64-b4a0-2f07e5674a83?identifier=john@example.com
```

---

### 2.4 `PATCH /api/todos/:id` — Update (partial)

Update fields of an existing todo.

**Query params**

* `identifier` (required)

**Request body** (any subset)

```json
{
  "title": "Write complete PRD",
  "description": "Expanded details",
  "priority": "P0",
  "project": "Docs",
  "tags": ["docs","prd","review"],
  "completed": true
}
```

**Responses**

* `200 OK` — `{ "todo": { ...updated... }, "request_id": "..." }`
* `400 BAD_REQUEST` — invalid field values (e.g., title empty)
* `404 NOT_FOUND` — id not found for Identifier

---

### 2.5 `DELETE /api/todos/:id` — Delete

Delete a todo by id.

**Query params**

* `identifier` (required)

**Responses**

* `204 No Content`
* `404 NOT_FOUND`

> **Undo behavior**: Client-side only (re-create with previously cached fields within 5s). The API does not hold server-side "pending delete" state in v1.0.

---

### 2.6 `POST /api/chat` — Chat Adapter (commands → CRUD)

Minimal text interface for the same dataset. The Chat UI posts plain commands; the server parses and executes.

**Request body**

```json
{
  "identifier": "john@example.com",
  "message": "add Buy milk |priority=P1 |project=Home |tags=grocery,dairy"
}
```


**Command grammar (case-insensitive)**

* `list`
* `add <title> [|priority=P0|P1|P2|P3] [|project=<text>] [|tags=a,b,c]`
* `done <taskId>`

**Responses**

* `200 OK`

```json
{
  "reply": "Added: Buy milk (P1) [Home] #grocery #dairy",
  "data": { "todo": { /* created todo */ } },
  "request_id": "..."
}
```


* `400 BAD_REQUEST` — unrecognized/invalid command (reply includes human-readable guidance)

**Examples**

```bash
curl -X POST https://<app>/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"john@example.com","message":"list"}'
```

---

### 2.7 `POST /api/webhooks/enhance` — n8n/LLM Enrichment

Webhook to **upsert enrichment** fields (`enhanced_description`, `steps`) for an existing todo. Intended to be called by n8n after LLM processing.

**Request body**

```json
{
  "todo_id": "0f40b8b1-26a7-4c64-b4a0-2f07e5674a83",
  "identifier": "john@example.com",
  "title": "Write PRD",
  "enhanced_description": "A clear, structured PRD covering scope...",
  "steps": ["Outline sections","Fill details","Review"]
}
```

**Behavior**

* **Idempotent**: Multiple calls with same `todo_id` simply overwrite enrichment fields; other fields untouched.
* **Security**: Optionally validate via shared secret header if configured.

**Responses**

* `200 OK` — `{ "todo": { ...with enrichment... }, "request_id": "..." }`
* `404 NOT_FOUND` — if `todo_id` not found for Identifier
* `400 BAD_REQUEST` — malformed payload

---

### 2.8 `POST /api/whatsapp` — Provider Webhook (Stub, normalize only)

Accepts provider webhook payloads (Evolution API / Twilio / Official). **v1.0 does not mutate DB** — it **normalizes** hashtagged messages for logs.

**Expected behavior**

* Parse inbound text; ignore unless it contains **`#to-do-list`** (case-insensitive).
* Normalize to:

```json
{
  "command": "add | list | done",
  "args": {
    "title": "Buy milk",
    "taskId": "0f40b8b1-26a7-4c64-b4a0-2f07e5674a83"
  },
  "sender": "+52XXXXXXXXXX"
}
```


* Log `{ request_id, provider, sender, normalized }`.
* Return `200 OK` quickly.

**Responses**

* `200 OK` — always (stub)
* `401/403` — if signature required and invalid (config-dependent)

**Example provider text → normalization**

* `"#to-do-list add Buy milk"` → `{command:"add", args:{title:"Buy milk"}}`
* `"#to-do-list list"` → `{command:"list"}`
* `"#to-do-list done 0f40b8b1-26a7-4c64-b4a0-2f07e5674a83"` → `{command:"done", args:{taskId:"..."}}`

---

### 2.9 `GET /api/health` — Health Check

**Response**

```json
{ "ok": true, "version": "1.0.0", "ts": "2025-08-29T03:10:00Z" }
```

---

## 3) Status Codes

* `200 OK` — Successful read/update/command.
* `201 Created` — Successful create.
* `204 No Content` — Successful delete.
* `400 Bad Request` — Validation failure, malformed command/payload.
* `401/403` — Reserved; only used for provider signature checks (WhatsApp) if configured.
* `404 Not Found` — Resource not found for given Identifier.
* `409 Conflict` — Rare; concurrent update conflict (client should re-fetch).
* `429 Too Many Requests` — Provider rate limits (optional).
* `500 Internal Server Error` — Unexpected error.

---

## 4) Error Envelope

**Shape**

```json
{
  "error": {
    "code": "BAD_REQUEST|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "Human readable explanation",
    "request_id": "uuid"
  }
}
```


**Examples**

* Validation:

```json
{"error":{"code":"BAD_REQUEST","message":"title is required","request_id":"..." }}
```


* Not found:

```json
{"error":{"code":"NOT_FOUND","message":"Todo not found for this identifier","request_id":"..." }}
```


---

## 5) Security & Rate Limiting

* **No end-user auth** (assessment constraint). All operations require **`identifier`** to scope data.
* **Key hygiene**: Service-role keys never sent to client; server-only.
* **CORS**: Lock POST routes to app origin; webhook routes accept provider origins.
* **Rate limiting**: Not enforced for demo; may be added at edge later.
* **Input safety**: Reject/escape HTML/script payloads; store and render as plain text.

---

## 6) Idempotency & Concurrency

* **Create**: Not idempotent (retries may create duplicates). Client SHOULD avoid auto-retries for create.
* **Update**: Last-write-wins; server sets `updated_at`. Clients SHOULD re-fetch after `409 Conflict`.
* **Enrichment webhook**: **Idempotent** by `todo_id` (only enrichment fields are overwritten).
* **Delete/Undo**: Undo is client-driven (re-create). Server does hard delete immediately.

---

## 7) Examples (End-to-End)

### Create → List → Complete → Delete

```bash
# Create
curl -X POST https://<app>/api/todos \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","title":"Buy milk","priority":"P1"}'

# List active
curl "https://<app>/api/todos?identifier=john@example.com&status=active"

# Complete
curl -X PATCH "https://<app>/api/todos/<id>?identifier=john@example.com" \
 -H 'Content-Type: application/json' \
 -d '{"completed": true}'

# Delete
curl -X DELETE "https://<app>/api/todos/<id>?identifier=john@example.com"
```

### Chat commands

```bash
curl -X POST https://<app>/api/chat \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","message":"add Write SRS |priority=P0 |tags=docs,srs"}'

curl -X POST https://<app>/api/chat \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","message":"list"}'
```

### Enrichment (n8n)

```bash
curl -X POST https://<app>/api/webhooks/enhance \
 -H 'Content-Type: application/json' \
 -d '{
  "todo_id":"<id>",
  "identifier":"john@example.com",
  "title":"Write SRS",
  "enhanced_description":"High-quality SRS outline...",
  "steps":["Outline","Fill details","Review"]
 }'
```

---

## 8) Versioning & Change Control

* **Semantic**: Backward-compatible changes bump **MINOR**; breaking changes bump **MAJOR**.
* **Stability**: Paths in this spec MUST NOT change without version bump and migration notes.
* **OpenAPI**: See `docs/API-SPEC.openapi.yaml` (kept in sync with this file). PRs updating either file must update the other.

---

## 9) Out-of-Scope (v1.0)

* Auth tokens, roles/permissions.
* Real-time subscriptions.
* WhatsApp DB mutations (stub only).
* Bulk endpoints beyond what shortcuts already enable via UI.

---

**End of `API-SPEC.md`.**
