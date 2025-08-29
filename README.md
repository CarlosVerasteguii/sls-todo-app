# SLS To-Do

> A production-style To-Do app built with **Next.js + Supabase + Vercel**, scoped by a user-provided **Identifier** (email or name). From day-1 it is architected to plug in **Chat (n8n + LLM)** and a **WhatsApp** adapter—without refactors.

**Status:** v1.0 (assessment-ready)  
**Live App:** `<TBD_APP_URL>` • **Chat UI:** `<TBD_CHAT_URL>` • **Health:** `<TBD_APP_URL>/api/health`

---

## 0) What this is (and is not)

* ✅ **In scope now:** To-Do CRUD, Identifier **Lock** gate, keyboard shortcuts, completed section + counters, persistence in Supabase, server boundary for all mutations, Chat page + `/api/chat`, enrichment webhook `/api/webhooks/enhance`, WhatsApp webhook **stub** `/api/whatsapp`.
* ❌ **Not in v1.0:** Traditional auth/SSO, RLS hard isolation, WhatsApp mutating DB, real-time collab, heavy analytics. (See **PRD §1.4.2**)

> ℹ️ **Breaking change vs original drafts:** We do **not** do JWT/SSO. Data is partitioned by an **Identifier** (normalized, e.g. `john@example.com`) that the user locks before creating tasks. This README **replaces** prior docs that mentioned JWT/RLS as mandatory for v1.0.

---

## 1) Quick Start (local)

**Prereqs**

* Node **≥18**
* pnpm (or npm/yarn)
* A Supabase project (URL + anon key + service role key)

**Clone & install**

```bash
git clone https://github.com/<you>/sls-todo-app.git
cd sls-todo-app
pnpm install
```

**Environment**
Create `.env.local` at the repo root:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
# server-only
SUPABASE_SERVICE_ROLE=<your-supabase-service-role>
N8N_ENHANCE_WEBHOOK_URL=<optional-n8n-url-or-mock>
WHATSAPP_WEBHOOK_SECRET=<optional-if-provider-signs>
APP_ENV=local
LOG_LEVEL=info
```

**Database schema (Supabase)**

* Run the SQL in `docs/DB-SCHEMA.sql` (or copy the extract below) in your Supabase SQL editor.
* Make sure the **indexes** and **updated_at trigger** are created.

> DDL extract (full file in `/docs/DB-SCHEMA.sql`):

```sql
create extension if not exists pgcrypto;

create table if not exists public.todos (
  id                     uuid primary key default gen_random_uuid(),
  identifier_norm        text not null,
  identifier_raw         text not null,
  title                  text not null,
  description            text,
  priority               text not null default 'P2',
  project                text,
  tags                   jsonb not null default '[]'::jsonb,
  completed              boolean not null default false,
  enhanced_description   text,
  steps                  jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint chk_priority check (priority in ('P0','P1','P2','P3')),
  constraint chk_tags_array check (jsonb_typeof(tags) = 'array')
);

create index if not exists idx_todos_identifier_norm
  on public.todos (identifier_norm);

create index if not exists idx_todos_identifier_completed
  on public.todos (identifier_norm, completed);

create index if not exists idx_todos_created_at
  on public.todos (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_set_updated_at on public.todos;
create trigger trg_set_updated_at
before update on public.todos
for each row execute function public.set_updated_at();
```

**Run**

```bash
pnpm dev
# open http://localhost:3000
```

---

## 2) Using the App

1. At the top, enter your **Identifier** (email or name). Click **Lock**.

   * You cannot create tasks until it's locked.
2. Add tasks (Title required; Description optional; Priority **P0–P3**; Project; Tags).
3. Toggle complete, edit inline, delete (with **Undo 5s**).
4. **Keyboard shortcuts**:

   * `E` edit • `P` change priority • `DEL` delete selected • `CTRL+A` select all • `CTRL+Z` undo last (delete/toggle) • `ESC` clear selection

**Chat page**: Use `/chat` (or the separate Chat URL) to issue commands:

* `list`
* `add <title> |priority=P1 |project=Docs |tags=foo,bar`
* `done <taskId>`

---

## 3) API (server boundary)

All writes go through Server Actions and/or API routes. Full contracts: **`/docs/API-SPEC.md`** (OpenAPI file coming next).

Key routes (summary):

* `POST /api/todos` — create
* `GET /api/todos?identifier=...&status=active|completed|all` — list
* `PATCH /api/todos/:id?identifier=...` — update
* `DELETE /api/todos/:id?identifier=...` — delete
* `POST /api/chat` — parse chat command → CRUD
* `POST /api/webhooks/enhance` — n8n PATCH enrichment (`enhanced_description`, `steps`)
* `POST /api/whatsapp` — **stub** normalize `#to-do-list` commands (no DB writes)
* `GET /api/health` — health probe

**Error envelope**

```json
{ "error": { "code":"BAD_REQUEST|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL", "message":"...", "request_id":"uuid" } }
```

---

## 4) Architecture (TL;DR)

* **Next.js (Vercel)** UI + Server Actions + API routes
* **Supabase Postgres** as source of truth
* **n8n** orchestrates **LLM** enrichment (fire-and-forget)
* **WhatsApp** provider webhook (**stub** in v1.0)

Diagrams, flows, decisions: **`/docs/ARCHITECTURE.md`**

---

## 5) Data Model

Single operational table `todos` partitioned by `identifier_norm` (lowercased, trimmed, spaces collapsed).  
Fields include `title`, `description`, `priority (P0..P3)`, `project`, `tags[]`, `completed`, plus enrichment fields `enhanced_description`, `steps[]`.  
Details & DDL: **`/docs/ERD.md`** + **`/docs/DB-SCHEMA.sql`**.

---

## 6) Security & Privacy (assessment posture)

* **No traditional auth**. Isolation is **best-effort** via `identifier_norm` filters; acceptable for this assessment.
* **Secrets** never in Git; use `.env.local` / Vercel env.
* Client never holds **service-role** keys; mutations run **server-side** only.
* Text inputs are rendered as **plain text** (no HTML execution).
* For a production path, see **`/docs/SECURITY.md`** (RLS strategy, Edge Functions).

---

## 7) Testing & Acceptance

* **Test Plan**: **`/docs/TEST-PLAN.md`** (cases, matrices, performance budgets)
* **Happy paths**: Identifier lock; CRUD; counters; shortcuts; Chat; enrichment webhook; WhatsApp stub
* **Acceptance checklist** is mirrored in the Test Plan §9

---

## 8) Deploy (Vercel)

1. Set project → Import repo
2. Configure Environment Variables (Production & Preview)
3. Deploy `main` → verify `/api/health` returns `200 { ok: true }`
4. Provide **App URL** and **Chat URL** in the PRD deliverables

**Supabase**

* Apply `DB-SCHEMA.sql` to the target project; confirm indexes.

---

## 9) Observability

* Every mutation logs a **`request_id`** and context (route, op, identifier hash).
* Health endpoint for smoke checks.
* See **`/docs/OBSERVABILITY.md`** for fields, levels, and redaction rules.

---

## 10) Project Structure


```
.
├── app/                 # Next.js app routes (UI & API)
├── components/          # UI components
├── lib/                 # Server utilities (db, validation, logging)
├── public/              # Static assets
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── API-SPEC.md
│   ├── ERD.md
│   ├── DB-SCHEMA.sql
│   ├── TEST-PLAN.md
│   ├── SECURITY.md
│   └── ... (see docs index)
├── .env.example
├── package.json
└── README.md            # (this file)
```

---

## 11) Keyboard Shortcuts (reference)

* `E` edit • `P` change priority • `DEL` delete selected
* `CTRL+A` select all • `CTRL+Z` undo (delete/toggle) • `ESC` clear selection  
  Details: **`/docs/KEYBOARD-SHORTCUTS.md`**

---

## 12) FAQ

**Why no auth?** Assessment requirement. We partition by Identifier; for production, see SECURITY.md (RLS + Edge Functions).  
**What if n8n/LLM is down?** Core CRUD unaffected. Enrichment is fire-and-forget and non-blocking.  
**How do I switch datasets?** **Unlock** → enter another Identifier → **Lock**.  
**Can I drive it from Chat?** Yes, via `/api/chat` or the Chat page (same DB).  
**WhatsApp works now?** The webhook is a **stub** (normalizes `#to-do-list` messages). Enabling mutations later won't require DB/UI refactors.

---

## 13) Maintenance Notes (about the old READMEs)

This README **supersedes**:

* `docs/database/README.md` (mentions JWT/RLS flows not used in v1.0)
* `docs/architecture/README.md` (event-driven/JWT assumptions)

**Action options (pick one):**

1. **Archive** the two files under `docs/_archive/` with a one-line header: "Superseded by `/docs/ARCHITECTURE.md` and `/docs/ERD.md` (Identifier model)."
2. **Replace** with stub files that link to the new docs.
3. **Delete** them after moving any still-useful diagrams into the new docs.

> Keep the repo free of conflicting guidance: JWT/RLS is **future** (documented in SECURITY.md), not part of v1.0 acceptance.

---

## 14) License & Contributing

* Contributing guidelines and code of conduct will be added if the repo becomes public (**`CONTRIBUTING.md`**, **`CODE_OF_CONDUCT.md`**).
* License: `<TBD>` (MIT recommended for portfolio/demo).

---

### Appendix A — Sample cURL

```bash
# Create
curl -X POST https://<app>/api/todos \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","title":"Buy milk","priority":"P1"}'

# List
curl "https://<app>/api/todos?identifier=john@example.com&status=active"

# Chat: add
curl -X POST https://<app>/api/chat \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","message":"add Write SRS |priority=P0 |tags=docs,srs"}'
```

---

**Docs index**: PRD • SRS • ARCHITECTURE • API-SPEC • ERD • DB-SCHEMA • TEST-PLAN • SECURITY • N8N-WORKFLOW • LLM-PROMPTS • WHATSAPP-PLAYBOOK • OBSERVABILITY (pending) • RUNBOOK (pending)

---

*End of README.*
