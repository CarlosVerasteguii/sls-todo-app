# SLS To-Do — HTTP API Specification

**Version:** 1.1 (Normalized)  
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
* **Errors**: Unified error envelope (see §6). Error codes: `BAD_REQUEST | UNAUTHORIZED | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL`. `UNAUTHORIZED` applies only to integration signature checks (e.g., WhatsApp, n8n) or internal routes; there is no end-user login.

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

*   **Identifier (server-side validation):**
    *   Allowed chars (API boundary): `^[A-Za-z0-9@._\- ]{1,80}$`
    *   DB **does not** enforce this whitelist in v1.0; DB stores `identifier_raw` (free text) and derives `identifier_norm` via normalization.
    *   Rationale: keep strict validation at the API boundary; DB schema remains flexible and RLS-ready.
*   **Title**: required, non-empty after trim, ≤ 200 chars.
*   **Priority**: enum `P0|P1|P2|P3`.
*   **Tags**: split by comma (`,`) if provided; trim each; drop empties; dedupe case-insensitively; each ≤ 24 chars; max 20.
*   **Text fields** rendered as plain text; HTML/script is treated as literal (no HTML execution).

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

**Responses**: `201 Created`, `400 BAD_REQUEST`

---

### 2.2 `GET /api/todos` — List (paginated)

List todos for an Identifier.

**Query params**: `identifier` (required), `status` (optional), `limit` (optional), `cursor` (optional).

**Response**: `200 OK`

---

### 2.3 `GET /api/todos/:id` — Fetch by ID

Fetch a single todo (must belong to the Identifier).

**Query params**: `identifier` (required).

**Response**: `200 OK`, `404 NOT_FOUND`

---

### 2.4 `PATCH /api/todos/:id` — Update (partial)

Update fields of an existing todo.

**Query params**: `identifier` (required).

**Request body**: Any subset of `Todo` fields.

**Responses**: `200 OK`, `400 BAD_REQUEST`, `404 NOT_FOUND`

---

### 2.5 `DELETE /api/todos/:id` — Delete

Delete a todo by id.

**Query params**: `identifier` (required).

**Responses**: `204 No Content`, `404 NOT_FOUND`

> **Undo behavior**: The server performs a hard delete. Undo is handled entirely on the client by re-creating the task with cached fields within a 5-second window. This re-creation results in a **new task ID**. The API does not have a "pending delete" state.

---

### 2.6 `POST /api/chat` — Chat Adapter (commands → CRUD)

**Parser:** deterministic grammar for `list | add | done` (no LLM in v1.0).

**Request body**: `{ identifier: string, message: string }`

**Command grammar (case-insensitive)**

*   `list`
*   `add <title> [|priority=P0|P1|P2|P3] [|project=<text>] [|tags=a,b,c]`
*   `done <taskId>`

**Responses**: `200 OK`, `400 BAD_REQUEST`

---

### 2.7 `POST /api/webhooks/enhance` — n8n/LLM Enrichment

Webhook to upsert enrichment fields for an existing todo.

**Request body**: `{ todo_id, identifier, title, enhanced_description?, steps? }`

**Idempotency:** The endpoint performs an **idempotent upsert** of `enhanced_description` and `steps` for the given `(todo_id, identifier_norm)`. Replays overwrite previous enrichment safely.

**Responses**: `200 OK`, `404 NOT_FOUND`, `400 BAD_REQUEST`

---

### 2.8 `POST /api/whatsapp` — Provider Webhook

**Scope (v1.0):** Stub only — normalizes hashtagged commands and logs them. **No database mutations** or replies are performed in v1.0.

**Behavior**: Parses inbound text for `#to-do-list` and normalizes commands (`add`, `list`, `done`).

**Responses**: `200 OK`, `401/403` (on signature mismatch, if configured).

---

### 2.9 `GET /api/health` — Health Check

**Response**: `200 OK` with `{ ok: true, version, ts }`.

---

## 3) Error Envelope

**Shape**

```json
{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "Human readable explanation",
    "request_id": "uuid"
  }
}
```

**Note**: `UNAUTHORIZED` is used only for provider signature validation (e.g., WhatsApp Evolution) or internal endpoints. No user login exists in v1.0.

---

**End of `API-SPEC.md`.**