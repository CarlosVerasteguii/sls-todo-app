# SLS To-Do — Architecture

**Version:** 1.1 (Normalized)  
**Status:** Approved for implementation  
**Owners:** Tech Lead (Carlos), Engineering (Full-stack)

**Purpose:** Describe how SLS To-Do is built and how components interact. This document is the single source of truth for boundaries, data flow, integration points (Chat/n8n/LLM, WhatsApp), performance, security posture, and ops.

## Table of Contents

1. [Goals & Non-Goals](#1-goals--non-goals)
2. [System Context (High-Level)](#2-system-context-high-level)
3. [Component Architecture](#3-component-architecture)
4. [Data Model (Operational)](#4-data-model-operational)
5. [Critical Flows (Sequences)](#5-critical-flows-sequences)
6. [API Surface (Contracts & Error Shape)](#6-api-surface-contracts--error-shape)
7. [Security Model & Hardening](#7-security-model--hardening)
8. [Performance & Scaling](#8-performance--scaling)
9. [Observability & Health](#9-observability--health)
10. [Configuration & Feature Flags](#10-configuration--feature-flags)
11. [Deployment & CI/CD](#11-deployment--cicd)
12. [Local Development](#12-local-development)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Appendix A — Keyboard Shortcuts & Event Routing](#14-appendix-a--keyboard-shortcuts--event-routing)
15. [Appendix B — Error Codes](#15-appendix-b--error-codes)

## 1) Goals & Non-Goals

### Goals

- **To-Do core** with Identifier lock (email/name) as partition key; no traditional auth.
- **Server boundary** for all mutations (Server Actions and/or API Routes).
- **Supabase Postgres** as source of truth; Vercel hosting.
- **Extensibility from day-1**: stable adapters for Chat (n8n + LLM enrichment) and WhatsApp hashtag flow without schema/UI refactors.
- **Production hygiene**: env hygiene, logging with request_id, health checks, performance budgets.

### Non-Goals (v1.0)

- No SSO/auth, no multi-tenant orgs/roles, no real-time collaboration, no advanced analytics, no full WhatsApp DB mutations (stub only). See PRD §1.4.2.

## 2) System Context (High-Level)

flowchart TD
  User[(User / Evaluator)]
  ChatUser[(Chat UI User)]
  WAUser[(WhatsApp User)]

  subgraph Web[Vercel - Next.js App]
    UI[UI (React)]
    SA[Server Actions]
    API[/API Routes/]
  end

  subgraph DB[Supabase - Postgres]
    TBL[(todos)]
  end

  subgraph Orchestration[n8n Workflow]
    ENH[Enhance Title Flow]
  end

  subgraph Providers[External Providers]
    LLM[LLM Provider]
    WA[WhatsApp Provider (Evolution/Twilio/Official)]
  end

  User --> UI
  ChatUser --> UI
  UI <---> SA
  UI <---> API
  SA --> TBL
  API --> TBL
  API --> ENH
  ENH --> LLM
  ENH --> API
  WAUser --> WA --> API


### Key boundaries

- **Client never holds service-role keys**; all writes cross a server boundary.
- **Adapters**:
  - `/api/webhooks/enhance` (n8n entrypoint)
  - `/api/chat` (Chat UI commands → CRUD)
  - `/api/whatsapp` (hashtag filter → normalized logs; no DB mutation in v1.0)

## 3) Component Architecture

### 3.1 Next.js (Vercel)

- **UI (React/TypeScript, Tailwind, shadcn/ui)**: My Tasks, Identifier lock, lists, composer, inline edit, completed collapse, keyboard shortcuts.
- **Server Actions**: Preferred for low-latency CRUD (create/edit/toggle/delete) when co-located with UI.
- **API Routes**: Explicit contracts for:
  - `/api/chat` (Chat adapter - deterministic parsing, no LLM)
  - `/api/webhooks/enhance` (n8n webhook)
  - `/api/whatsapp` (provider webhook stub)
  - `/api/health` (ops)

**Chat UI mínima**: Página `/chat` con input de texto y transcripts sencillos. Back-end parsea determinista los comandos y llama las mismas APIs de CRUD.

**Guideline**: Mutations SHOULD be Server Actions where ergonomic; cross-system integrations SHOULD be API routes.

**n8n Integration**: **v1.0**: n8n does NOT write directly to DB. Official path: callback `/api/webhooks/enhance` for validation, security, and auditing. **[FUTURE]**: Direct DB only if RLS/Edge policies and service policies are documented.

### 3.2 Data Access

- **Supabase client (server-side)** with service role only on server.
- **Reads** may use SSR/Server Actions; any client read uses anon key strictly scoped by `identifier_norm`.

### 3.3 Orchestration (n8n)

- Receives events on create/title-edit; calls LLM (and optional web search) and updates `enhanced_description`, `steps` in todos.
- **Loose coupling**: app emits small payload; n8n calls back to `/api/webhooks/enhance` (official path). **[FUTURE]**: Alternative "direct DB" only if documented service policy and RLS/Edge Functions.

### 3.4 WhatsApp Provider

- **Webhook** from Evolution/Twilio/Official → `/api/whatsapp`.
- **v1.0**: normalize only (require `#to-do-list`), log command, do not mutate DB.

## 4) Data Model (Operational)

Full DDL in `docs/DB-SCHEMA.sql`. This section is the operational contract.

### Table `todos`

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `identifier_norm` | `text` | Indexed, lowercased partition key |
| `identifier_raw` | `text` | For display |
| `title` | `text` | Required, ≤ 200 chars |
| `description` | `text` | Optional, ≤ 2000 chars |
| `priority` | `text` | Enum-like: 'P0' |
| `project` | `text` | Optional, ≤ 80 chars |
| `tags` | `jsonb` | Array of strings, deduped case-insensitively |
| `completed` | `boolean` | Default false |
| `enhanced_description` | `text` | Nullable (LLM enrichment) |
| `steps` | `jsonb` | Nullable array of strings (LLM enrichment) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`, trigger on update |

### Indexes

- `idx_todos_identifier_norm`
- `idx_todos_completed` (optional composite with `identifier_norm`)
- `idx_todos_created_at`

### Sorting

- **Active list**: `created_at DESC, id DESC`.
- **Completed**: same, within completed section.

## 5) Critical Flows (Sequences)

### 5.1 Create Task (Identifier locked)

sequenceDiagram
  participant U as UI
  participant SA as Server Action
  participant DB as Supabase
  participant N as n8n (Enhance)
  U->>U: Validate Identifier locked
  U->>SA: createTodo({identifier_norm, payload})
  SA->>DB: INSERT todos
  DB-->>SA: row(id, timestamps)
  SA-->>U: 200 {row}
  Note right of U: Optimistic UI reconciled with id/timestamps
  U--)N: Fire-and-forget POST to n8n webhook (todo_id, title, identifier)
  Note right of N: n8n calls LLM, then calls back to app
  N->>SA: POST /api/webhooks/enhance (payload)
  SA->>DB: PATCH todos with enrichment
  DB-->>SA: updated row

### 5.2 Edit (inline), 5.3 Toggle, 5.4 Delete+Undo

Same boundary pattern: UI → SA/API → DB, with optimistic update and reconciliation.

**Undo window**: 5s toast; on Undo, client re-creates the task with cached fields (id may change). Server does hard delete immediately; no "pending delete" state exists.

### 5.5 Chat Command (`/api/chat`)

sequenceDiagram
  participant ChatUI as Chat UI
  participant API as /api/chat
  participant DB as Supabase
  ChatUI->>API: POST {identifier, message:"add Buy milk |priority=P1"}
  API->>API: Parse → use-case (add/list/done)
  API->>DB: Upsert/Query/Toggle scoped by identifier_norm
  DB-->>API: Result
  API-->>ChatUI: Text reply + structured payload

### 5.6 WhatsApp Stub (Normalize only)

sequenceDiagram
  participant WA as WhatsApp Provider
  participant API as /api/whatsapp
  WA->>API: Webhook payload (message text)
  API->>API: Verify hashtag #to-do-list
  API->>API: Normalize → {command, args, sender}
  API-->>WA: 200 OK (no DB write in v1.0)
  API->>Logs: info {request_id, normalized_command}


## 6) API Surface (Contracts & Error Shape)

Full OpenAPI in `docs/API-SPEC.openapi.yaml`. Below is the tactical summary.

### 6.1 `/api/todos` (Server Action equivalents exist)

- **POST create**: body `{ identifier: string, title: string, description?, priority?, project?, tags? }` → `201 {todo}`
- **GET list**: query `identifier`, optional `status=all|active|completed` → `200 {items: todo[]}`

### 6.2 `/api/todos/:id`

- **PATCH**: body `{ title?, description?, priority?, project?, tags?, completed? }` → `200 {todo}`
- **DELETE**: → `204`

### 6.3 `/api/chat` (POST)

- **Body**: `{ identifier: string, message: string }`
- **Replies**: `{ reply: string, data?: any }`
- **Commands**: `list`, `add <title>|priority=P? |project=... |tags=a,b`, `done <taskId>`

### 6.4 `/api/webhooks/enhance` (POST from n8n)

- **Body**: `{ todo_id: string, identifier: string, title: string, enhanced_description?, steps?: string[] }`
- **Behavior**: idempotent upsert of enrichment fields.

### 6.5 `/api/whatsapp` (POST provider webhook)

- Accept provider payloads (signature optional).
- Require `#to-do-list` in text; produce normalized logs only.

### 6.6 `/api/health` (GET)

- `200 { ok: true, ts, version }`

### 6.7 Error Shape (all endpoints)

{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "Human readable",
    "request_id": "uuid"
  }
}


## 7) Security Model & Hardening

> **RLS Status — v1.0**
> 
> RLS is **not enabled** in v1.0. Data isolation relies on application-level partitioning by `identifier_norm`.  
> The schema and queries are **RLS-ready** and can be enabled post-v1.0 without UI refactors.  
> There is **no JWT/SSO** in v1.0; users provide an Identifier (email or name) and lock it.

- **No auth** (assessment constraint). Partition by Identifier:
  - **Normalize**: lowercase, trim, collapse spaces.
  - **Always filter** `identifier_norm` in queries/mutations.
- **Server boundary**: No client service-role keys. All privileged access only on server.
- **Input validation**: Server validates title/description/priority/project/tags; max lengths; tags deduped; HTML rendered inert.
- **Secrets**: Only in env vars; never in Git. See §10.
- **CORS**: Locked to app origin for POST endpoints.
- **RLS posture (future)**: Keep schema; move all reads/writes behind Supabase Edge Functions with service role and headers (e.g., `x-profile-key`), or introduce lightweight auth as needed—UI unchanged.

## 8) Performance & Scaling

**Budgets (PRD NFRs)**: TTFB ≤ 600 ms, DB read (≤50 items) ≤ 150 ms avg, mutations ≤ 500 ms median.

- **DB**: Index on `identifier_norm`, `completed`, `created_at`.
- **Queries**: Fetch Active by default; fetch Completed on expand to limit payload.
- **Regions**: Co-locate Vercel project and Supabase in the same region to minimize RTT.
- **Pagination**: Built-in on list endpoints (cursor or offset) for future growth.
- **SSR/Server Actions**: Prefer server rendering for initial list; use SWR/revalidate on client.

## 9) Observability & Health

- **request_id**: Generate per request; include in logs and error payloads.
- **Structured logs**: `{ ts, level, route, op, request_id, identifier_hash, duration_ms }`. Never log raw secrets or full content bodies.
- **Health**: `/api/health` returns build version and timestamp.
- **Failure modes**: Clear toasts on client; retries with backoff for n8n calls (fire-and-forget; failures non-blocking).

## 10) Configuration & Feature Flags

### 10.1 Environment Variables (`.env.example`)

| Var | Description | Scope |
|-----|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | client/server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (reads) | client/server (read) |
| `SUPABASE_SERVICE_ROLE` | Service role key (writes) | server only |
| `N8N_ENHANCE_WEBHOOK_URL` | n8n entrypoint URL | server |
| `WHATSAPP_WEBHOOK_SECRET` | Optional provider signature secret | server |
| `APP_ENV` / `LOG_LEVEL` | Ops tuning | server |

### 10.2 Feature Flags (build-time or env)

- `FEATURE_CHAT=true|false` (expose Chat route/UI).
- `FEATURE_ENHANCE=true|false` (emit enhance events; render enrichment).
- `FEATURE_WHATSAPP_STUB=true|false` (enable webhook normalization).

## 11) Deployment & CI/CD

- **Branches**: `main` (prod), `develop`, `feature/*`.
- **CI**: Lint, typecheck, unit/basic integration tests.
- **Vercel**:
  - Preview deploys for PRs.
  - Prod deploy from `main`.
  - Env vars configured per environment.
- **Supabase**:
  - Apply `DB-SCHEMA.sql` via migrations.
  - Create indexes as specified.
- **Secrets**: Stored in Vercel/Supabase dashboards; never in repo.
- **Smoke**: Post-deploy job hits `/api/health`.

## 12) Local Development

- **Prereqs**: Node ≥ 18, pnpm/npm, Supabase project (cloud OK).
- **Run**: `pnpm dev` (sets `NEXT_PUBLIC` envs); use `.env.local`.
- **DB**: Option 1) point to cloud Supabase; Option 2) Supabase local (optional).
- **Testing**: Include minimal seeds; scripts to create sample todos for two different Identifiers.

## 13) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Identifier collisions/guessing | Cross-view of datasets | Document demo privacy; future RLS plan; consider salted share tokens |
| n8n/LLM downtime | No enrichment | Non-blocking fire-and-forget; log failures; UI ignores absent enrichment |
| WhatsApp provider variance | Webhook format drift | Normalization layer; provider adapter abstraction |
| Region latency | Slow responses | Co-locate Vercel & Supabase; cache read lists where safe |
| Secret leakage | Security incident | Env hygiene; secret scanners; code review gates |
| Large completed lists | Payload bloat | Fetch Completed on expand; paginate when needed |

## 14) Appendix A — Keyboard Shortcuts & Event Routing

| Shortcut | Route | Notes |
|----------|-------|-------|
| `E` | Inline edit → SA `updateTodo` | Save Enter / Cancel Esc |
| `P` | Priority menu → SA `updateTodo` | Bulk apply to selected |
| `DEL` | Delete selected → SA `deleteTodos` | Toast with Undo (5s) |
| `CTRL+A` | Select all (UI state) | Section-scoped |
| `CTRL+Z` | Undo last (client) | Delete/toggle only |
| `ESC` | Clear selection/exit edit | UI only |

## 15) Appendix B — Error Codes

| Code | HTTP | Meaning | Client Behavior |
|------|------|---------|-----------------|
| `BAD_REQUEST` | 400 | Validation failed (e.g., empty title) | Inline error / toast |
| `UNAUTHORIZED` | 401 | (Reserved) Not used in v1.0 | n/a |
| `NOT_FOUND` | 404 | Task not found / wrong id | Toast |
| `CONFLICT` | 409 | Concurrent update conflict | Re-fetch + toast |
| `RATE_LIMITED` | 429 | Provider throttling | Backoff & retry |
| `INTERNAL` | 500 | Unexpected error | Toast + request_id for support |

## Quick Reference (Directory)


/docs
  ARCHITECTURE.md  <-- (this file)
  PRD.md
  SRS.md
  API-SPEC.openapi.yaml
  DB-SCHEMA.sql
  TEST-PLAN.md
  ...


**Any architectural change MUST be reflected here (PR + review). Keep contracts stable to avoid UI/data refactors when enabling Chat/WhatsApp later.**