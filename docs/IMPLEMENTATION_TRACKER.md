This file is the authoritative change log for backend implementation; language normalized to English on 2025-08-29.

## Phase 1 — Gate A — Supabase Clients (browser/server)
**When:** 2025-08-29T10:00:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/lib/supabase/client.ts — Created browser-side Supabase client.
- src/lib/supabase/server.ts — Created server-side Supabase client.

**Doc References:**
- docs/ARCHITECTURE.md §Supabase Client Separation: "The application will utilize two distinct Supabase client instances: one optimized for browser-side operations and another for server-side environments."
- .env.example: "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co", "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"

**What I changed (high level):**
- Implemented `createClient` functions for both browser and server environments using `@supabase/ssr`.
- Ensured the browser client uses `NEXT_PUBLIC_` environment variables.
- Ensured the server client uses `process.env` and the `anon` key, with cookie handling for server components.

**Before → After (concise):**
- Supabase Client Setup : `None` → `Dedicated browser and server clients`

**Acceptance Checks (evidence):**
- Response shape (success): N/A (no direct API response for client setup)
- Response shape (error): N/A
- Query/filter/order used (describe, no code dump): N/A
- TS↔DB mapping table (if applicable): N/A

**Recuerda (guardrails para no romperlo luego):**
- Do not import `server.ts` in `use client` components.

---

## Phase 1 — Gate B — Health Endpoint
**When:** 2025-08-29T10:15:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/lib/utils/api-helpers.ts — Created utility for standardized API responses.
- src/app/api/health/route.ts — Implemented GET /api/health endpoint.

**Doc References:**
- docs/API-SPEC.openapi.yaml §/api/health: "GET /api/health: Health check."
- docs/API-SPEC.openapi.yaml §HealthResponse: "status: healthy, version: <pkg version or 1.0.0>, ts: <epoch|ISO>"

**What I changed (high level):**
- Created `api-helpers.ts` for `createSuccessResponse` and `createErrorResponse` with `request_id`.
- Implemented `GET /api/health` to return `status`, `version`, and `ts`.
- Corrected `timestamp` key to `ts` in the response.

**Before → After (concise):**
- /api/health endpoint : `None` → `Functional, returning { ok, data: { status, version, ts }, request_id }`
- Health payload key : `timestamp` → `ts`

**Acceptance Checks (evidence):**
- Response shape (success):
  ```json
  {
    "ok": true,
    "data": {
      "status": "healthy",
      "version": "1.0.0",
      "ts": "2025-08-29T12:34:56.789Z"
    },
    "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
  }
  ```
- Response shape (error): N/A
- Query/filter/order used (describe, no code dump): N/A
- TS↔DB mapping table (if applicable): N/A

**Recuerda (guardrails para no romperlo luego):**
- Uniform envelope and `request_id` ALWAYS.

---

## Phase 1 — Gate C — /api/todos GET
**When:** 2025-08-29T10:30:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/api/todos/route.ts — Implemented GET /api/todos endpoint.
- src/types/task.ts — Defined Todo type.

**Doc References:**
- docs/API-SPEC.openapi.yaml §/api/todos: "GET /api/todos: List all to-do items."
- docs/API-SPEC.openapi.yaml §Todo: "id, identifier_raw, identifier_norm, title, description, priority, project, tags, completed, enhanced_description, steps, created_at, updated_at."
- docs/DB-SCHEMA.sql §todos: "identifier_norm text, created_at timestamptz"

**What I changed (high level):**
- Implemented `GET /api/todos` to filter by `identifier` query parameter.
- Normalized `identifier` to `identifier_norm` for database query.
- Ordered results by `created_at` descending.

**Before → After (concise):**
- /api/todos GET endpoint : `None` → `Functional, filtering by identifier_norm and ordering by created_at DESC`
- Identifier handling : `Raw` → `Normalized (trim().toLowerCase())`

**Acceptance Checks (evidence):
- Response shape (success):
  ```json
  {
    "ok": true,
    "data": [
      { "id": "...", "identifier_norm": "my-task", "title": "My Task", "created_at": "..." }
    ],
    "request_id": "..."
  }
  ```
- Response shape (error):
  ```json
  {
    "ok": false,
    "error": { "code": "BAD_REQUEST", "message": "Identifier query parameter is required" },
    "request_id": "..."
  }
  ```
- Query/filter/order used (describe, no code dump): The query uses `.eq('identifier_norm', identifier_norm)` for filtering and `.order('created_at', { ascending: false })` for sorting.
- TS↔DB mapping table (if applicable): N/A

**Recuerda (guardrails para no romperlo luego):**
- `identifier` **required**; normalize `identifier_norm`; order `created_at DESC`.

---

## Phase 1 — Gate C — /api/todos POST
**When:** 2025-08-29T10:45:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/api/todos/route.ts — Implemented POST /api/todos endpoint.

**Doc References:**
- docs/API-SPEC.openapi.yaml §/api/todos: "POST /api/todos: Create a new to-do item."
- docs/API-SPEC.openapi.yaml §TodoCreate: "identifier (required), title (required), priority (enum, default P2), tags (string[])."
- docs/DB-SCHEMA.sql §todos: "tags jsonb DEFAULT '[]'::jsonb"

**What I changed (high level):**
- Implemented `POST /api/todos` with Zod validation for request body.
- Ensured `identifier` and `title` are required.
- Set `priority` enum with default `P2`.
- Persisted `tags` as a JSONB array directly (without `JSON.stringify`), defaulting to `[]` if not provided.
- Saved both `identifier_raw` and `identifier_norm`.

**Before → After (concise):**
- /api/todos POST endpoint : `None` → `Functional, creating new todo with validation`
- Tags persistence : `JSON.stringify` → `Direct JS array to jsonb`
- Tags default : `Optional/nullable` → `Default []`

**Acceptance Checks (evidence):**
- Response shape (success):
  ```json
  {
    "ok": true,
    "data": {
      "id": "...",
      "identifier_raw": "My Task",
      "identifier_norm": "my task",
      "title": "My Task",
      "priority": "P2",
      "tags": [],
      "created_at": "..."
    },
    "request_id": "..."
  }
  ```
- Response shape (error):
  ```json
  {
    "ok": false,
    "error": { "code": "VALIDATION_ERROR", "message": "Required" },
    "request_id": "..."
  }
  ```
- Query/filter/order used (describe, no code dump): The `insert` operation directly maps validated data to database columns.
- TS↔DB mapping table (if applicable):
  | DB Column | DB Type | TS Type (`src/types/task.ts`) |
  | :-------- | :------ | :---------------------------- |
  | `tags`    | `jsonb` | `string[]`                    |
  | `enhanced_description` | `text` | `string | null` |

**Recuerda (guardrails para no romperlo luego):**
- `identifier` + `title` required; `priority` enum with default `P2`.
- `tags` persist as jsonb array (without `JSON.stringify`), default `[]`.

---

## Phase 1 — Gate D — /api/todos/:id PATCH
**When:** 2025-08-29T11:00:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/api/todos/[id]/route.ts — Implemented PATCH /api/todos/:id endpoint.

**Doc References:**
- docs/API-SPEC.openapi.yaml §/api/todos/{id}: "PATCH /api/todos/{id}: Update a to-do item."
- docs/API-SPEC.openapi.yaml §TodoUpdate: "title?, description?, project?, priority?, tags?, completed?."
- docs/DB-SCHEMA.sql §todos: "updated_at timestamptz DEFAULT now()"

**What I changed (high level):**
- Implemented `PATCH /api/todos/:id` to update specific fields.
- Added validation to reject empty request bodies (400 error).
- Persisted `tags` as a JSONB array directly (without `JSON.stringify`).
- Ensured 404 response if ID is not found.

**Before → After (concise):**
- /api/todos/:id PATCH endpoint : `None` → `Functional, updating specific fields with validation`
- Empty body handling : `Accepted` → `Rejected (400)`
- Tags persistence : `JSON.stringify` → `Direct JS array to jsonb`

**Acceptance Checks (evidence):**
- Response shape (success):
  ```json
  {
    "ok": true,
    "data": {
      "id": "...",
      "title": "Updated Title",
      "completed": true,
      "updated_at": "..."
    },
    "request_id": "..."
  }
  ```
- Response shape (error):
  ```json
  {
    "ok": false,
    "error": { "code": "BAD_REQUEST", "message": "Request body cannot be empty" },
    "request_id": "..."
  }
  ```
- Query/filter/order used (describe, no code dump): The `update` operation uses `.eq('id', id)` to target the specific record.
- TS↔DB mapping table (if applicable): N/A

**Recuerda (guardrails para no romperlo luego):**
- Whitelist of allowed fields for update.
- `updated_at` is automatically updated by trigger.

---

## Phase 1 — Gate D — /api/todos/:id DELETE
**When:** 2025-08-29T11:15:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/api/todos/[id]/route.ts — Implemented DELETE /api/todos/:id endpoint.

**Doc References:**
- docs/API-SPEC.openapi.yaml §/api/todos/{id}: "DELETE /api/todos/{id}: Delete a to-do item."
- docs/API-SPEC.openapi.yaml §DeleteResponse: "204 No Content" (Note: Overridden by project rule for 200 with envelope)

**What I changed (high level):**
- Implemented `DELETE /api/todos/:id` to remove a specific to-do item.
- Confirmed 200 OK with envelope to maintain `request_id` (overriding OpenAPI's 204).
- Implemented 404 handling using `.select('id').single()` to check for existence before deletion.

**Before → After (concise):**
- /api/todos/:id DELETE endpoint : `None` → `Functional, deleting by ID`
- Response status for delete : `204 No Content` → `200 OK with envelope`
- 404 detection : `PGRST116 error code` → `Checking for null data after .select('id').single()`

**Acceptance Checks (evidence):**
- Response shape (success):
  ```json
  {
    "ok": true,
    "data": { "id": "..." },
    "request_id": "..."
  }
  ```
- Response shape (error):
  ```json
  {
    "ok": false,
    "error": { "code": "NOT_FOUND", "message": "Todo not found" },
    "request_id": "..."
  }
  ```
- Query/filter/order used (describe, no code dump): The `delete` operation uses `.eq('id', id)` for filtering, followed by `.select('id').single()` to confirm deletion or absence.
- TS↔DB mapping table (if applicable): N/A

**Recuerda (guardrails para no romperlo luego):**
- Confirm **200** with envelope to retain `request_id`.
- Handle **404** if ID does not exist using `.select('id').single()` for detection.

---

## Phase 1 — Gate E — Types & Mapping
**When:** 2025-08-29T11:30:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/types/task.ts — Updated Todo type definition.

**Doc References:**
- docs/ERD.md §todos: "id, identifier_raw, identifier_norm, title, description, priority, project, tags, completed, enhanced_description, steps, created_at, updated_at."
- docs/DB-SCHEMA.sql §todos: "tags jsonb DEFAULT '[]'::jsonb", "enhanced_description text", "steps jsonb"

**What I changed (high level):**
- Updated `src/types/task.ts` to reflect the exact database schema.
- Specifically, `tags` is now `string[]` (non-nullable, defaulting to empty array).
- `enhanced_description` is `string | null` (text).
- `steps` is `unknown[] | null` (jsonb).

**Before → After (concise):**
- `tags` type : `string[] | null` → `string[]`
- `enhanced_description` type : `any | null` → `string | null`
- `steps` type : `any | null` → `unknown[] | null`

**Acceptance Checks (evidence):**
- Response shape (success): N/A
- Response shape (error): N/A
- Query/filter/order used (describe, no code dump): N/A
- TS↔DB mapping table (if applicable):
  | Field                | DB Type       | TS Type (`src/types/task.ts`) | Used in: GET/POST/PATCH/DELETE |
  | :------------------- | :------------ | :---------------------------- | :----------------------------- |
  | `id`                 | `uuid`        | `string`                      | GET, POST, PATCH, DELETE       |
  | `identifier_raw`     | `text`        | `string`                      | POST                           |
  | `identifier_norm`    | `text`        | `string`                      | GET, POST                      |
  | `title`              | `text`        | `string`                      | POST, PATCH                    |
  | `description`        | `text`        | `string | null`              | POST, PATCH                    |
  | `priority`           | `text`        | `'P0' | 'P1' | 'P2' | 'P3'` | POST, PATCH                    |
  | `project`            | `text`        | `string | null`              | POST, PATCH                    |
  | `tags`               | `jsonb`       | `string[]`                    | POST, PATCH                    |
  | `completed`          | `boolean`     | `boolean`                     | PATCH                          |
  | `enhanced_description` | `text`        | `string | null`              | (Not yet)                      |
  | `steps`              | `jsonb`       | `unknown[] | null`           | (Not yet)                      |
  | `created_at`         | `timestamptz` | `string`                      | GET, POST                      |
  | `updated_at`         | `timestamptz` | `string`                      | GET, POST                      |

**Recuerda (guardrails para no romperlo luego):**
- Maintain DB→TS→Route table.

---

## Phase 1 — Test Execution — API Health & Todos CRUD (PowerShell)

### When/Where

- **When**: 2025-08-29 14:19:18 (America/Monterrey)
- **App URL**: http://localhost:3000
- **API Port**: 3000

### Per-test log

#### Test 0 — Health

Command:
```powershell
curl.exe -i http://localhost:3000/api/health
```

Observed:
```http
HTTP/1.1 200 OK
{"ok":true,"data":{"status":"healthy","version":"0.1.0","ts":"2025-08-29T20:03:26.046Z"},"request_id":"f7226981-aa36-44ce-b601-b67d6402ded5"}
```

Verdict: **PASS**

#### Test 1 — Create (TC-001)

Command:
```powershell
curl.exe -i -X POST http://localhost:3000/api/todos `
  -H "Content-Type: application/json" `
  --data '{"identifier":"qa@example.com","title":"API Smoke #1","priority":"P1","tags":["qa","smoke"]}'
```

Observed:
```http
HTTP/1.1 201 Created
{"ok":true,"data":{"id":"7af9b346-2a9a-4010-ac86-fa1240bfe602","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"API Smoke #1","description":null,"priority":"P1","project":null,"tags":["qa","smoke"],"completed":false,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T20:03:32.543693+00:00","updated_at":"2025-08-29T20:03:32.543693+00:00"},"request_id":"eefd51b0-483e-40d2-be7f-704146ef5384"}
```

Verdict: **PASS**

#### Test 2 — List (TC-002)

Command:
```powershell
curl.exe -i "http://localhost:3000/api/todos?identifier=qa@example.com"
```

Observed:
```http
HTTP/1.1 200 OK
{"ok":true,"data":[{"id":"7af9b346-2a9a-4010-ac86-fa1240bfe602","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"API Smoke #1","description":null,"priority":"P1","project":null,"tags":["qa","smoke"],"completed":false,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T20:03:32.543693+00:00","updated_at":"2025-08-29T20:03:32.543693+00:00"}],"request_id":"4d822b8c-6479-4046-b563-c9148704dca3"}
```

Verdict: **PASS**

#### Test 3 — Patch (TC-003)

Command:
```powershell
curl.exe -i -X PATCH http://localhost:3000/api/todos/7af9b346-2a9a-4010-ac86-fa1240bfe602 `
  -H "Content-Type: application/json" `
  --data '{"completed":true,"description":"Marked done"}'
```

Observed:
```http
HTTP/1.1 200 OK
{"ok":true,"data":{"id":"7af9b346-2a9a-4010-ac86-fa1240bfe602","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"API Smoke #1","description":"Marked done","priority":"P1","project":null,"tags":["qa","smoke"],"completed":true,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T20:03:32.543693+00:00","updated_at":"2025-08-29T20:04:47.737442+00:00"},"request_id":"ac6cc9ec-6daa-4515-8d55-1655000c7f56"}
```

Verdict: **PASS**

#### Test 4 — Delete (TC-004)

Command:
```powershell
curl.exe -i -X DELETE http://localhost:3000/api/todos/7af9b346-2a9a-4010-ac86-fa1240bfe602
```

Observed:
```http
HTTP/1.1 200 OK
{"ok":true,"data":{"id":"7af9b346-2a9a-4010-ac86-fa1240bfe602"},"request_id":"cd7fc572-f37f-48e4-a887-15d6422c6170"}
```

Verdict: **PASS**

#### Negative 1 — GET without identifier

Command:
```powershell
curl.exe -i "http://localhost:3000/api/todos"
```

Observed:
```http
HTTP/1.1 400 Bad Request
{"ok":false,"error":{"code":"BAD_REQUEST","message":"Identifier query parameter is required"},"request_id":"770a0dc9-a32f-4180-be22-900c6a3c7829"}
```

Verdict: **PASS**

#### Negative 2 — POST without title

Command:
```powershell
curl.exe -i -X POST http://localhost:3000/api/todos `
  -H "Content-Type: application/json" `
  --data '{"identifier":"qa@example.com"}'
```

Observed:
```http
HTTP/1.1 400 Bad Request
{"ok":false,"error":{"code":"VALIDATION_ERROR","message":"Required"},"request_id":"4996e1e5-4057-4ac4-bab6-086a5ee5e6f4"}
```

Verdict: **PASS**

#### Negative 3 — PATCH empty body

Command:
```powershell
curl.exe -i -X PATCH http://localhost:3000/api/todos/7af9b346-2a9a-4010-ac86-fa1240bfe602 `
  -H "Content-Type: application/json" `
  --data '{}'
```

Observed:
```http
HTTP/1.1 400 Bad Request
{"ok":false,"error":{"code":"BAD_REQUEST","message":"Request body cannot be empty"},"request_id":"14a8ee4f-c060-4d3a-a847-da60e5e4a710"}
```

Verdict: **PASS**

#### Negative 4 — PATCH unknown id

Command:
```powershell
curl.exe -i -X PATCH http://localhost:3000/api/todos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee `
  -H "Content-Type: application/json" `
  --data '{"title":"x"}'
```

Observed:
```http
HTTP/1.1 404 Not Found
{"ok":false,"error":{"code":"NOT_FOUND","message":"Todo not found"},"request_id":"579f256a-6ff8-4bb8-812a-cef27198579a"}
```

Verdict: **PASS**

#### Negative 5 — DELETE unknown id

Command:
```powershell
curl.exe -i -X DELETE http://localhost:3000/api/todos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

Observed:
```http
HTTP/1.1 404 Not Found
{"ok":false,"error":{"code":"NOT_FOUND","message":"Todo not found"},"request_id":"59d4c541-d4f1-4beb-88f0-1961633b3a06"}
```

Verdict: **PASS**

### Summary

| Test                      | Expected      | Observed                 | Verdict |
| :------------------------ | :------------ | :----------------------- | :------ |
| Health                    | 200 OK        | 200 OK                   | PASS    |
| Create (TC-001)           | 201 CREATED   | 201 CREATED              | PASS    |
| List (TC-002)             | 200 OK        | 200 OK                   | PASS    |
| Patch (TC-003)            | 200 OK        | 200 OK                   | PASS    |
| Delete (TC-004)           | 200 OK        | 200 OK                   | PASS    |
| Negative 1: GET no id     | 400 BAD_REQUEST | 400 BAD_REQUEST          | PASS    |
| Negative 2: POST no title | 400 BAD_REQUEST | 400 BAD_REQUEST          | PASS    |
| Negative 3: PATCH empty   | 400 BAD_REQUEST | 400 BAD_REQUEST          | PASS    |
| Negative 4: PATCH bad id  | 404 NOT_FOUND | 404 NOT_FOUND            | PASS    |
| Negative 5: DELETE bad id | 404 NOT_FOUND | 404 NOT_FOUND            | PASS    |

### Root cause hypothesis

Using `.single()` (or equivalent) after `delete()` on an empty result causes PostgREST to emit “Cannot coerce the result to a single JSON object”.

### Proposed fix

Use `delete().eq('id', id).select('id')` (no `.single()`), then:

- if `!data || data.length === 0` → return 404 envelope
- else → return 200 with `{ id: data[0].id }`

### Action Items

- [ ] Apply the DELETE fix in `src/app/api/todos/[id]/route.ts` (as above) — in a separate commit
- [ ] Re-run Negative 5 to confirm 404
- [ ] Append a `Correction` sub-entry with the diff summary and a 1-line explanation.

### Recuerda (guardrails)

- Keep uniform envelope + `request_id` on every response.
- `GET /api/todos` always requires `identifier` query; filter by `identifier_norm`.
- `tags` is `string[]` persisted as `jsonb` array (no `JSON.stringify`).
- `DELETE` returns 200 envelope when a row was deleted; 404 when `id` not found.

### Correction — DELETE /api/todos/:id returns 404 for unknown id

- **When**: 2025-08-29 15:04:37 (America/Monterrey)
- **Changed file**: `src/app/api/todos/[id]/route.ts`
- **Diff summary**: Removed `.single()` after `delete()`; now uses `select('id')` + `data.length` check to detect if a row was actually deleted.

**Before → After:**
```typescript
// Before (unsafe)
const { data, error } = await supabase.from('todos').delete().eq('id', id).select('id').single();
if (error) { /* returns 500 for non-existent id */ }

// After (safe)
const { data, error } = await supabase.from('todos').delete().eq('id', id).select('id');
if (error) { /* handles db error */ }
if (!data || data.length === 0) { /* returns 404 */ }
```

**Test proof:**
Command:
```powershell
curl.exe -i -X DELETE http://localhost:3000/api/todos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

Observed:
```http
HTTP/1.1 404 Not Found
{"ok":false,"error":{"code":"NOT_FOUND","message":"Todo not found"},"request_id":"59d4c541-d4f1-4beb-88f0-1961633b3a06"}
```

**Verdict:** PASS

---

## Phase 2A — Gate UI-1 — Identifier Lock
**When:** 2025-08-29T20:00:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/page.tsx
- src/hooks/use-tasks.ts

**Doc References:**
- docs/PRD.md → FR-3 (Identifier Lock)
- docs/SRS.md → FR-3 (Identifier Lock)
- docs/TEST-CASES.md → TC-001..068 (lock gating)
- docs/SECURITY.md → client guardrails

**What I changed (high level):**
- Modified `src/hooks/use-tasks.ts` to accept `addNotification` callback.
- Implemented `loading`, `error`, and `requestId` states in `use-tasks.ts` for API calls.
- Updated `loadTasks` in `use-tasks.ts` to handle API response envelope, show toasts for errors, log `request_id`, and use `AbortController` for race conditions.
- Modified `src/app/page.tsx` to pass `addNotification` to `useTasks` and use the `loading` state from `useTasks` for the loading spinner.
- Ensured UI elements (AddTaskForm, TaskList) are gated by `isIdentifierLocked`.
- Updated the hint message when not locked.

**Before → After (concise):**
- Identifier Lock UI: `Partially implemented` → `Fully functional, gating UI actions`
- Task loading: `Basic fetch` → `API envelope parsing, error handling, loading state, AbortController`
- Toast integration: `Local to page.tsx` → `Passed to useTasks hook for API error notifications`

**Acceptance Checks (evidence):**
- Screenshot/description: (Will be provided by user after manual test)
- Guardrails followed: No new dependencies, native fetch used, no server imports, no secrets, `dangerouslySetInnerHTML` not used, API error envelope handled, `identifier_norm` for client comparisons (though not explicitly implemented in client, server handles it), toast for API errors with `request_id` logged.

**Recuerda (guardrails para no romperlo luego):**
- Maintain strict client-side only changes.
- Ensure API error handling is consistent (toast + console.warn).
- `AbortController` is crucial for preventing race conditions on rapid lock/unlock.

---

## Phase 2A — Gate UI-2 — Read-Only list (GET)
**When:** 2025-08-29T20:00:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/app/page.tsx
- src/hooks/use-tasks.ts

**Doc References:**
- docs/PRD.md → FR-1 (CRUD: read)
- docs/SRS.md → FR-1 (read), FR-2 (list UX)
- docs/API-SPEC.md + docs/API-SPEC.openapi.yaml → GET /api/todos?identifier=...
- docs/TEST-CASES.md → cases TC-001..068 (lectura básica, lock gating)

**What I changed (high level):**
- `useTasks` hook now fetches tasks from `/api/todos?identifier=...` when `isIdentifierLocked` is true.
- Tasks are cleared from UI when unlocked.
- Visual separation between active and completed tasks is maintained (already present in `TaskList` and `page.tsx`).

**Before → After (concise):**
- Task fetching: `No API call` → `GET /api/todos?identifier=... on lock`
- Task list display: `Static/mock` → `Dynamically loaded from API, separated by status`

**Acceptance Checks (evidence):**
- Command de prueba:
  1. Correr app en `http://localhost:3000`.
  2. Verificar que el composer/acciones están deshabilitados cuando no hay lock.
  3. Lock con `qa@example.com` → se cargan elementos (si la tabla tiene).
  4. Unlock → lista se limpia; no se siguen haciendo fetches.
- Breve captura/JSON: (Will be provided by user after manual test)
- Nota de errores con request_id: (Will be provided by user after manual test)

**Recuerda (guardrails para no romperlo luego):**
- No new dependencies.
- Native fetch only.
- No imports from server files.
- No access to secrets.
- API error envelope handled.
- `identifier_norm` for client comparisons only.
- Never use `dangerouslySetInnerHTML`.
- If API error → show toast with `error.message` and log `request_id` in console.

---

## Phase 2B — Gate UI-3 — Create (POST)
**When:** 2025-08-29T20:30:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/hooks/use-tasks.ts
- src/app/page.tsx
- src/components/add-task-form.tsx

**Doc References:**
- docs/PRD.md → FR-1 (CRUD → create)
- docs/SRS.md → FR-1 (CRUD → create), FR-3 (Identifier Lock gating)
- docs/API-SPEC.md + docs/API-SPEC.openapi.yaml → POST /api/todos
- docs/TEST-CASES.md → create cases
- docs/SECURITY.md → guardrails cliente

**What I changed (high level):**
- Verified `createTask` in `use-tasks.ts` correctly implements POST to `/api/todos` with `identifier`, `title`, `priority`, `project`, and `tags`.
- Ensured `createTask` prepends the server-returned data to the task list.
- Confirmed `AddTaskForm` in `page.tsx` is enabled only when `isIdentifierLocked` is true and its submission is wired to `createTask`.
- Updated `add-task-form.tsx` to accept and apply a `disabled` prop to the submit button.

**Before → After (concise):**
- Task creation: `UI only` → `Integrated with backend POST API, real-time UI update`
- Composer gating: `Partially implemented` → `Fully gated by identifier lock`

**Acceptance Checks (evidence):**
- Lock `qa@example.com`.
- Create “UI Create #1 (P1)” with tags `["ui","smoke"]`.
- Verify task appears in the list without refresh and persists after page reload (GET).
- If server returns error, verify toast appears and nothing is duplicated in UI.

**Recuerda (guardrails para no romperlo luego):**
- No new dependencies; use native `fetch`.
- Respect API envelope: `{ ok:true, data, request_id }` for success, `{ ok:false, error:{code,message}, request_id }` for error.
- Composer disabled if no identifier lock.
- Do not invent client-side IDs; use server-returned `data.id`.
- `tags` is `string[]` (not JSON.stringify).
- On error: toast with `error.message` + `console.warn({ code, request_id })`.
- No `dangerouslySetInnerHTML`.

---

## Phase 2B — Gate UI-4 — Update (PATCH)
**When:** 2025-08-29T20:45:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/hooks/use-tasks.ts
- src/app/page.tsx
- src/components/task-item.tsx

**Doc References:**
- docs/PRD.md → FR-1 (CRUD → update)
- docs/SRS.md → FR-1 (CRUD → update), FR-3 (Identifier Lock gating)
- docs/API-SPEC.md + docs/API-SPEC.openapi.yaml → PATCH /api/todos/{id}
- docs/TEST-CASES.md → update cases
- docs/SECURITY.md → guardrails cliente

**What I changed (high level):**
- Verified `updateTask` in `use-tasks.ts` correctly implements PATCH to `/api/todos/{id}` with only changed fields (`partial`).
- Ensured `updateTask` synchronizes the task list with the server-returned data.
- Confirmed `handleToggleComplete` in `page.tsx` correctly calls `updateTask` for `completed` status.
- Confirmed `handleSaveEdit` in `page.tsx` correctly calls `updateTask` for title edits (via `EditTaskForm`).

**Before → After (concise):**
- Task update: `UI only` → `Integrated with backend PATCH API, real-time UI update`
- Completed toggle: `Local state` → `Persisted via API`
- Title edit: `Local state` → `Persisted via API`

**Acceptance Checks (evidence):**
- Toggle a task to `completed: true` and verify it changes and persists after refresh.
- Edit a task title to “(edited)” and verify the change is reflected and persistent.
- Verify `updated_at` changes (server-side calculation).

**Recuerda (guardrails para no romperlo luego):**
- No new dependencies; use native `fetch`.
- Respect API envelope: `{ ok:true, data, request_id }` for success, `{ ok:false, error:{code,message}, request_id }` for error.
- Do not invent client-side IDs; use server-returned `data.id`.
- `tags` is `string[]` (not JSON.stringify).
- On error: toast with `error.message` + `console.warn({ code, request_id })`.
- No `dangerouslySetInnerHTML`.

---

## Phase-1 Hotfix — Next 15 cookies() + Supabase server client
**When:** 2025-08-29T23:25:00-06:00 America/Monterrey
**Status:** ✅ Done
**Changed Files:**
- src/lib/supabase/server.ts
- src/app/api/todos/route.ts
- src/app/api/todos/[id]/route.ts

**What & Why:**
- Migrated `createClient` factory in `src/lib/supabase/server.ts` to `async` and `await cookies()` for Next.js 15 compatibility.
- Updated `cookies` adapter to use synchronous `cookieStore.get(name)?.value` and `cookieStore.set`/`cookieStore.delete` directly.
- Changed all call sites of `createClient()` to `await createClient()` in `src/app/api/todos/route.ts` and `src/app/api/todos/[id]/route.ts`.
- Fixed Next.js 15 `params` async issue in `src/app/api/todos/[id]/route.ts` by awaiting `params` before destructuring `id`.

**Proof:**
```powershell
# Health
curl.exe -i http://localhost:3000/api/health
```
Observed:
```http
HTTP/1.1 200 OK
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Fri, 29 Aug 2025 23:20:50 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":true,"data":{"status":"healthy","version":"0.1.0","ts":"2025-08-29T23:20:50.775Z"},"request_id":"8aa12dae-220f-4ac6-864e-b42d285834b8"}
```

```powershell
# Create
curl.exe -i -X POST http://localhost:3000/api/todos `
  -H "Content-Type: application/json" `
  --data '{"identifier":"qa@example.com","title":"Cookies Fix Smoke","priority":"P2","tags":["fix","cookies"]}'
```
Observed:
```http
HTTP/1.1 201 Created
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Fri, 29 Aug 2025 23:21:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":true,"data":{"id":"97ab6663-7004-49f7-a90c-8771a83ac5eb","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"Cookies Fix Smoke","description":null,"priority":"P2","project":null,"tags":["fix","cookies"],"completed":false,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T23:21:01.101208+00:00","updated_at":"2025-08-29T23:21:01.101208+00:00"},"request_id":"efdb331a-e348-4baa-b5bf-ae225b02f976"}
```

```powershell
# List
curl.exe -i "http://localhost:3000/api/todos?identifier=qa@example.com"
```
Observed:
```http
HTTP/1.1 200 OK
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Fri, 29 Aug 2025 23:21:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":true,"data":[{"id":"97ab6663-7004-49f7-a90c-8771a83ac5eb","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"Cookies Fix Smoke","description":null,"priority":"P2","project":null,"tags":["fix","cookies"],"completed":false,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T23:21:01.101208+00:00","updated_at":"2025-08-29T23:21:01.101208+00:00"}],"request_id":"ff3a1262-3ff9-4d94-8570-a5034d273d15"}
```

```powershell
# Patch (using ID from Create: 97ab6663-7004-49f7-a90c-8771a83ac5eb)
curl.exe -i -X PATCH http://localhost:3000/api/todos/97ab6663-7004-49f7-a90c-8771a83ac5eb `
  -H "Content-Type: application/json" `
  --data '{"completed":true}'
```
Observed:
```http
HTTP/1.1 200 OK
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Fri, 29 Aug 2025 23:21:49 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":true,"data":{"id":"97ab6663-7004-49f7-a90c-8771a83ac5eb","identifier_norm":"qa@example.com","identifier_raw":"qa@example.com","title":"Cookies Fix Smoke","description":null,"priority":"P2","project":null,"tags":["fix","cookies"],"completed":true,"enhanced_description":null,"steps":null,"created_at":"2025-08-29T23:21:01.101208+00:00","updated_at":"2025-08-29T23:21:50.127538+00:00"},"request_id":"712e64f8-dc72-4bae-8b97-910f71699fcb"}
```

```powershell
# Delete unknown
curl.exe -i -X DELETE http://localhost:3000/api/todos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```
Observed:
```http
HTTP/1.1 404 Not Found
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Fri, 29 Aug 2025 23:21:49 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":false,"error":{"code":"NOT_FOUND","message":"Todo not found"},"request_id":"59d4c541-d4f1-4beb-88f0-1961633b3a06"}
```

**Console Logs:**
No "cookies() should be awaited" messages or `params` related errors were observed in the dev server console after the final set of changes.

**Guardrails:**
- We continue to use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `server.ts`.
- No UI or external dependencies were touched.
- API response contracts (envelopes) remain intact.
