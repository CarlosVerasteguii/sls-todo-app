# SLS To-Do — Product Requirements Document (PRD)

**Document Purpose:** This PRD defines, with operational precision and without ambiguity, what the team must build for the SLS To-Do application (technical test). It serves as the single source of truth for scope, criteria, and product deliverables. Any change to scope or behavior must be reflected here before execution.

## 1.0 Document Control (Metadata and Governance)

**Document Identifier:** PRD-SLS-TODO

**Product:** SLS To-Do (web application for task list with "salsita").

**Version:** 1.0.0

**Status:** Approved for implementation (functional v1 base with preparation for Chatbot and WhatsApp).

**Owner:** Carlos Verástegui (PM/Dev responsible for scope).

**Approver:** Technical test evaluator (designated Hiring Manager).

**Primary Audience:** Development (Front/Back), QA, Technical Evaluator.

**Secondary Audience:** Portfolio review (recruiter), non-technical stakeholders.

### Repository and Location

**GitHub Repository:** https://github.com/CarlosVerasteguii/sls-todo-app

**PRD Path in Repo:** /docs/PRD.md

**Relevant Branches:**
- main (production, protected)
- develop (integration)
- feature/* (features)

### Environments and URLs (to be completed upon deployment)

**Web App (Vercel):** <TBD_APP_URL>

**Chat UI (Vercel):** <TBD_CHAT_URL>

**n8n Webhook Enhance:** <TBD_N8N_ENHANCE_URL>

**WhatsApp (bonus):** Number <TBD_PHONE> — activation hashtag: #to-do-list

### Relationship with Artifacts

**SRS (Technical Specification):** /docs/SRS.md

**Architecture Manifest:** /docs/ARCHITECTURE.md

**Test Plan (QA):** /docs/TEST-PLAN.md

**Runbook/Operations:** /docs/RUNBOOK.md

**Security and Variables:** /docs/SECURITY.md, .env.example

### PRD Versioning Policy

**MAJOR:** scope changes that alter user contract (e.g., removing "Identifier" as mandatory key).

**MINOR:** new compatible capabilities (e.g., adding "AI-suggested tags").

**PATCH:** editorial corrections or clarifications without scope change.

### Conventions

**Language:** English (technical terms in English when standard: tag, priority, lock).

**Numeric/Date Format:** ISO-8601 for dates in technical documents.

**Priorities:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low).

**Task Status:** active (not completed), completed (completed).

**"Identifier":** string provided by user (email or name) that partitions their data; locked through explicit action (lock) before allowing task creation.

### Managing Changes to this PRD

Changes only via Pull Request to /docs/PRD.md with label docs:prd.

Every change must include: reason, impact, adjusted acceptance criteria, and migration plan if applicable.

Owner validates wording; Approver validates scope. Merge only with both approvals.

## 1.1 Change History

| Version | Date | Author | Type | Change Description | Approver |
|---------|------|--------|------|-------------------|----------|
| 1.0.0 | 2025-08-28 | Carlos Verástegui | New | Initial PRD for pure To-Do aligned to test: partition by Identifier with mandatory lock; CRUD tasks (title, description, priority P0–P3, project name, tags); keyboard shortcuts (E, P, DEL, CTRL+A, CTRL+Z, ESC); Completed Tasks collapsible and counters; Supabase persistence; Vercel; GitHub; explicit preparation for Chatbot (n8n + AI) and WhatsApp with hashtag #to-do-list without need for structural refactor. | Technical Test Evaluator |

**Note:** Every subsequent version must also update linked artifacts (SRS, Architecture Manifest, TEST-PLAN) to maintain contractual consistency.

## 1.2 Summary / Introduction

### Product name

**SLS To-Do** — a web application that lets a user manage tasks (create, edit, complete) with minimal friction and persistent storage.

### Problem & intent

This project is a technical assessment. The evaluator must be able to use a clean, production-style To-Do app that persists data across refreshes and demonstrates:

- Solid Next.js full-stack practices.
- Supabase as the single source of truth (no localStorage persistence).
- Clear UX with keyboard shortcuts and lightweight "salsa" (priority, tags, project).
- Early extensibility for a Chatbot (via n8n) and WhatsApp integration without architectural rework.

### Core definition (what the product is)

A single-page To-Do application with the following contract:

**Identifier-gated usage (no auth):**
- At the top of the app, the user must enter an Identifier (email or name).
- The UI blocks task creation until the identifier is explicitly locked (via a lock button on the right of the field).
- The Identifier partitions data in Supabase; all queries are scoped by this value.
- The identifier is remembered locally only to re-prepopulate the field; persistence of tasks lives in Supabase.

**Task model & inputs (on "Add Task" expand):**
- Title (required)
- Description (optional)
- Priority: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- Project name (optional, free text)
- Tags (optional, free text or comma-separated)

**Mandatory keyboard shortcuts:**
- E → Edit task
- P → Change priority
- DEL → Delete selected
- CTRL+A → Select all
- CTRL+Z → Undo action
- ESC → Clear selection

**List behaviors:**
- "My Tasks" header with subtitle: Build a content machine that turns attention into action.
- Counters: N active · M completed with Completed Tasks section collapsible.
- Toggle complete / uncomplete.
- (Optional quality-of-life allowed) Filters All / Active / Completed if time permits.

**Persistence & hosting:**
- Supabase database for all task data.
- Next.js app deployed on Vercel.
- Public GitHub repository.

**Extensibility required from Day-1 (no refactors later):**
- All data mutations/read go through a server boundary (Server Actions and/or API routes).
- An internal /api/chat and /api/webhooks surface is reserved for n8n orchestration (LLM "enhance title", optional web search) operating on the same Supabase data.
- WhatsApp integration will be added later using Evolution API or similar, with a message filter by hashtag #to-do-list; architecture must already include the adapter boundaries to plug it in without changing the UI or data model.

### Non-goals (for v1.0 of this PRD)

- Classical user authentication/registration flows.
- Multi-tenant orgs/roles/permissions.
- Offline-first and complex caching beyond optimistic UI.
- Complex analytics/reporting.

### Deliverables (assessment contract)

- App URL (Vercel)
- Chat UI URL (separate route/page)
- GitHub repo
- WhatsApp number (bonus) + instructions: "send #to-do-list …"

## 1.3 Objectives & Success Metrics

All metrics below are objective, testable, and tied to the assessment criteria. Passing each metric is required to consider the milestone complete.

### 1.3.1 Product objectives (v1.0 — To-Do core)

**Frictionless start (Identifier-first)**

- **O1.1:** App blocks "Add Task" until the user enters an Identifier and presses the Lock button.
  - Verification: Trying to add a task before locking shows a clear inline error and does not persist anything.
- **O1.2:** After locking, all reads/writes are scoped by Identifier in Supabase.
  - Verification: Switching Identifier and re-locking shows a different task set.

**CRUD done right (with shortcuts)**

- **O2.1:** Create task with Title required; optional Description, Priority (P0-P3), Project, Tags.
- **O2.2:** Edit, complete/uncomplete, delete work both via UI controls and keyboard shortcuts listed.
- **O2.3:** "Completed Tasks" section is collapsible and the active/completed counters are accurate.
  - Verification: Manual test script executes each shortcut and UI control path successfully.

**True persistence**

- **O3.1:** After page refresh, tasks remain visible for the same locked Identifier.
  - Verification: Create 3 tasks, refresh, see 3 tasks; switch Identifier, see 0; switch back, see 3.

**Production hygiene**

- **O4.1:** No secrets in Git; .env.example is provided; runtime envs used server-side.
- **O4.2:** App and API deploy in Vercel; public URLs provided; Supabase project configured.
- **O4.3:** Repository includes README with setup and testing steps; PRD/SRS in /docs.

### 1.3.2 Architectural enablement objectives (future-ready from Day-1)

**Server boundary enforced**

- **E5.1:** All mutations (create/edit/complete/delete) are executed via Server Actions and/or API routes; the client never writes directly with a browser-instantiated Supabase service-role.
- **E5.2:** Reads can use SSR/Server Actions; any client read still scopes strictly by Identifier and uses anon credentials only if needed.

**Chatbot plug-in points**

- **E6.1:** Expose /api/chat (adapter) and /api/webhooks/enhance (or equivalent) so n8n can:
  - Receive { todo_id, title, identifier }, call LLM, and update enhanced_description / steps fields in Supabase.
- **E6.2:** UI shows enriched fields when present; no UI rewrite required to display them.

**WhatsApp adapter readiness**

- **E7.1:** Reserve /api/whatsapp webhook endpoint with a stub validator for messages containing #to-do-list.
- **E7.2:** Define a narrow command grammar (add, list, done <id>) mapping to the same server use-cases.
  - Verification: Sending a sample payload to the stub webhook logs a normalized command without touching UI or DB schema.

### 1.3.3 Performance & reliability targets

**Responsiveness**

- **P8.1:** Initial app TTFB ≤ 600 ms on Vercel (cold starts excluded).
- **P8.2:** Task list fetch (≤ 50 items) ≤ 150 ms average DB time.
- **P8.3:** Create/edit/complete round-trip ≤ 500 ms median.

**UX quality**

- **P9.1:** Optimistic updates for create/complete/edit; failure clearly rolls back with an error toast.
- **P9.2:** Keyboard shortcuts work 100% as specified (manually verified in the test plan).

**Operational**

- **P10.1:** Error logs include a request_id; sensitive data never logged.
- **P10.2:** Health check route exists for deployment verification.

### 1.3.4 Acceptance checklist (used by the evaluator)

- [ ] Cannot create tasks until Identifier is locked.
- [ ] Tasks persist across refresh and are scoped by Identifier.
- [ ] Create/Edit/Complete/Delete work via UI and shortcuts (E, P, DEL, CTRL+A, CTRL+Z, ESC).
- [ ] Priority selection supports P0–P3; Project and Tags captured.
- [ ] Completed Tasks collapsible; counters correct.
- [ ] All DB interactions respect the server boundary.
- [ ] Repo has .env.example, README, and /docs/PRD.md.
- [ ] App URL + Chat URL provided; WhatsApp endpoints stubbed and documented for later activation.

## 1.4 **Product Scope**

This section defines **exactly** what SLS To-Do v1.0 must deliver. The scope is intentionally narrow (a To-Do app) but **engineered from day one** to plug in a Chatbot (n8n + LLM) and a WhatsApp adapter **without refactors** to UI or data model.

* **Primary user**: a single evaluator/guest user per session. Data is partitioned by a user-provided **Identifier** (email or name).
* **Platforms**: Web (desktop-first, responsive). Deployment on Vercel. Single Supabase project as the system of record.
* **Interaction model**: Keyboard-first friendly. All mutations pass a **server boundary** (Server Actions and/or API routes).
* **Persistence contract**: Refreshing the page **must** show the same tasks for the same locked Identifier.
* **Extensibility contract**: Reserved server endpoints and DB fields for (a) **title enhancement** via n8n + LLM and (b) **WhatsApp** webhook with `#to-do-list` filter. No UI or schema changes required later to enable them.

---

### 1.4.1 **Included Features (In Scope)**

Each feature below includes **behavior** and **acceptance criteria**. All are required for v1.0 unless marked *(optional)*.

---

#### **F-01 — Identifier lock (gates all task creation)**

**Behavior**

* At the top of the page, show:
  * Heading: **My Tasks**
  * Subtitle: *Build a content machine that turns attention into action*
  * **Identifier input** (placeholder: "email or name") and a **Lock** button on the right.
* **Task creation is disabled** until the Identifier is **locked** by clicking the Lock button.
* On lock:
  * Trim whitespace; allow letters, numbers, `@ . _ -` (reject others with inline error).
  * Case-insensitive comparison for partitioning (store a normalized form).
  * Store the raw value to prefill on next visit (localStorage), **but no tasks live in localStorage**.
* Unlocking requires an explicit **Unlock** action (same control), which **disables** task creation again until relocked.

**Acceptance**

* Attempting to add a task without a locked Identifier shows a clear inline error and prevents persistence.
* Changing Identifier and relocking **switches the task dataset** accordingly.
* The Identifier is visible as locked state (icon + disabled input).

---

#### **F-02 — Add Task panel (expanded composer)**

**Behavior**

* "Add new task…" input expands into a composer when focused or when the **"+"** button is pressed.
* Fields:
  * **Title** *(required, max 200 chars)*.
  * **Description** *(optional, max 2000 chars)*.
  * **Priority** *(required; default **P2 (Medium)**)* with options:
    * `P0 (Critical)`, `P1 (High)`, `P2 (Medium)`, `P3 (Low)`.
  * **Project name** *(optional, free text, max 80 chars)*.
  * **Tags** *(optional; comma-separated; each trimmed; max 20 tags; each tag ≤ 24 chars)*.
* Submit by **Enter** (when focus is in Title) or via **Add Task** button.
* On submit:
  * Client performs input validation and shows inline errors.
  * Optimistic add → server mutation → reconcile with DB record (id/timestamps).
  * Composer resets to defaults; focus returns to the single-line "Add new task…" field.

**Acceptance**

* Cannot submit without Title or without locked Identifier.
* Defaults: Priority `P2`, `completed=false`.
* Tags are parsed and stored as discrete items (no duplicates after trimming/lowercasing for equality).
* On success, the new task appears at the top of the **Active** list (most recent first).

---

#### **F-03 — Edit task (inline)**

**Behavior**

* Single-click (or `E` shortcut) on a task opens inline edit for **Title** and **Description**; Priority/Project/Tags editable via their controls.
* Save on **Enter** or clicking **Save**; **Esc** cancels (reverts to last persisted state).
* Optimistic update with server reconciliation.

**Acceptance**

* Editing Title to empty shows inline error and blocks save.
* After save, the task shows updated fields and **updated_at** changes.

---

#### **F-04 — Toggle complete / uncomplete**

**Behavior**

* Checkbox or click target toggles `completed`. Completed items move to the **Completed Tasks** section.
* Optimistic toggle with server reconciliation.

**Acceptance**

* Toggling updates **Active/Completed counters** immediately and remains correct after refresh.
* Completed section reflects the item with its final priority, project, and tags.

---

#### **F-05 — Delete task (with undo)**

**Behavior**

* **DEL** deletes all **selected** tasks (see F-08 selection model).
* Show a **toast/snackbar**: "Task(s) deleted. **Undo** (5s)".
* If **Undo** is clicked within 5 seconds, restore tasks (client + server); otherwise finalize deletion.

**Acceptance**

* Deleted tasks do not reappear after refresh unless Undo was used within the toast window.
* Multi-delete works on any selection size.
* If server delete fails, toast shows error and restores UI state.

---

#### **F-06 — Priority management**

**Behavior**

* `P` opens a small menu to set `P0/P1/P2/P3` on the **focused** or **selected** tasks.
* Visual priority dot/color on each task:
  * P0 red, P1 orange, P2 yellow, P3 green *(exact token mapping defined in UI theme; color-blind safe indicators such as icons are acceptable)*.

**Acceptance**

* Changing priority updates the visual indicator and persists; remains after refresh.
* Bulk priority changes apply to all selected tasks.

---

#### **F-07 — Project & Tags editing**

**Behavior**

* Project: free-text edit.
* Tags: add/remove tokens; input with comma separation; duplicates prevented case-insensitively.

**Acceptance**

* Project and Tags persist and display consistently in both Active and Completed lists.
* Removing a tag updates immediately and survives refresh.

---

#### **F-08 — Keyboard shortcuts & selection model**

**Behavior**

* **Selection model**:
  * Click on a task → focuses it (single selection).
  * **CTRL+A** selects **all** visible tasks in the current list (Active or Completed).
  * **ESC** clears the selection.
* **Shortcuts** (must work regardless of mouse state if focus is in the list area):
  * `E` → Edit focused (or first selected if multiple; if multiple selected, open batch edit where applicable—priority only; title/description batch edit is **not** required).
  * `P` → Open priority menu for focused/selected.
  * `DEL` → Delete selected.
  * `CTRL+A` → Select all.
  * `CTRL+Z` → **Undo last action** (delete or complete toggle) within the same session when an undoable action exists.
  * `ESC` → Clear selection or exit edit mode.
* Accessibility: shortcuts are documented in a **Keyboard Shortcuts** box visible in the UI.

**Acceptance**

* Each shortcut path is verified in the test plan; no shortcut performs a destructive action without an undo path.
* `CTRL+Z` reverts the most recent undoable change (single-level undo is sufficient).

---

#### **F-09 — Lists, counters, and collapse**

**Behavior**

* Show **Active** tasks list and a **Completed Tasks (N)** collapsible section (default collapsed if N>0).
* Counters near the top: `X active · Y completed`.
* *(Optional)* Filter dropdown `All / Active / Completed` may be provided; if present, it must remain consistent with the collapsible behavior.

**Acceptance**

* Counters reflect the current dataset and remain correct after refresh and Identifier switches.
* Completed section toggles its open/closed state per session (local UI state only; no need to persist this preference in DB).

---

#### **F-10 — Persistence & refresh guarantee**

**Behavior**

* All data lives in Supabase; the client may cache the **Identifier** only.
* For a locked Identifier, reloading the page **must** show the same tasks, sorted by **created_at desc** (Active first by default view).

**Acceptance**

* QA creates three tasks, refreshes, and sees the same three for the same Identifier.
* Switching Identifier shows a different dataset (possibly empty), then switching back restores the first set.

---

#### **F-11 — Server boundary for all mutations**

**Behavior**

* Create/Edit/Toggle/Delete are executed via **Server Actions and/or API routes**; no browser-side access to privileged keys.
* Reads may use SSR/Server Actions; any client reads must use scoped anon credentials and **must include the Identifier filter**.

**Acceptance**

* Code inspection confirms no direct client writes with service-role keys.
* Disabling the server temporarily causes mutations to fail with user-friendly errors (no silent failures).

---

#### **F-12 — Chatbot readiness (n8n + LLM enrichment)**

**Behavior**

* Reserve an internal endpoint **`/api/webhooks/enhance`** (or equivalent) callable by **n8n** with payload:
  `{ "todo_id": UUID, "identifier": string, "title": string }`.
* When a task is created or its Title changes, the app **POSTs** a minimal event to n8n (fire-and-forget).
* The schema already includes fields for enrichment (e.g., `enhanced_description`, `steps` array).
* UI displays enrichment when present (non-blocking; no spinner required).

**Acceptance**

* Sending a synthetic webhook from n8n updates the enrichment fields and they become visible in the UI for that task without additional UI changes.
* If n8n is unreachable, task creation still succeeds; an info log notes the failed enrichment call.

---

#### **F-13 — WhatsApp readiness (hashtag filter, adapter stub)**

**Behavior**

* Reserve **`/api/whatsapp`** webhook endpoint that accepts provider payloads and normalizes messages containing **`#to-do-list`**.
* Recognize the following minimal grammar (text message body, case-insensitive):
  * `#to-do-list add <title>`
  * `#to-do-list list`
  * `#to-do-list done <taskId>`
* For v1.0, the endpoint **logs** normalized commands; it does **not** modify the database yet.

**Acceptance**

* Posting a sample provider payload yields a normalized log like:
  `{"command":"add","title":"Buy milk","sender":"+52XXXXXXXXXX"}`.
* No UI or DB changes are required later to activate real processing.

---

#### **F-14 — Error handling & notifications (toasts)**

**Behavior**

* All user actions show clear feedback:
  * Success: subtle confirmation or list update.
  * Failure: toast with human-readable message and retry guidance.
* Undoable flows (delete, toggle) show a time-boxed **Undo** control.

**Acceptance**

* Network error during create/edit/delete presents a toast and **does not** leave the UI in an inconsistent state after reconciliation.

---

#### **F-15 — Performance envelope**

**Behavior**

* Target budgets:
  * App TTFB ≤ **600 ms** on Vercel (best effort).
  * List read (≤50 tasks) DB latency ≤ **150 ms** avg.
  * Mutation round-trip ≤ **500 ms** median.

**Acceptance**

* Test logs show typical operations within budget on sample data.

---

#### **F-16 — Accessibility & internationalization baseline**

**Behavior**

* Keyboard focus states are visible; controls are operable via keyboard.
* Semantic roles and labels for checkboxes, buttons, and lists.
* UI copy in Spanish per mock; technical terms in English where industry-standard (e.g., *tags*, *priority*).

**Acceptance**

* Tab navigation reaches interactive elements in a logical order; screen readers announce key controls meaningfully.

---

#### **F-17 — Secrets & configuration hygiene**

**Behavior**

* No secrets in Git. Provide **`.env.example`** with all required variables (Supabase, webhook URLs).
* The app fails fast with a clear server log if required envs are missing.

**Acceptance**

* Repo scan shows no API keys.
* Boot without envs yields explicit error messages; with envs, app runs successfully.

---

#### **F-18 — Health check & ops**

**Behavior**

* Provide a simple **health check** route that returns 200 (e.g., `/api/health`).
* Log each mutation with a **request_id** (correlates client, server, webhook calls).

**Acceptance**

* Hitting the health endpoint returns 200 in prod.
* Server logs include request_id on mutations.

---

## 1.4.2 **Out of Scope (Exclusions)**

The following items are **explicitly excluded** from SLS To-Do **v1.0**. They may be revisited in later versions, but **must not** be implemented or half-implemented now. This prevents scope creep and protects architectural clarity.

1. **Traditional authentication & account management**

   * No sign-up/sign-in flows, password resets, OAuth/SSO, roles/permissions, email verification.
   * The only gate is the **Identifier lock** (email or name) to partition data.

2. **Organization / multi-tenant features**

   * No teams, invitations, sharing, role-based access control, audit trails per user, or cross-Identifier access.

3. **Offline-first & PWA**

   * No service worker caching, background sync, or fully offline CRUD.
   * Local state is ephemeral; **Supabase is the source of truth**.

4. **Real-time collaboration**

   * No websockets/subscriptions for live updates, typing indicators, or conflict resolution strategies.
   * Last-write-wins with standard HTTP is acceptable in v1.0.

5. **Advanced task semantics**

   * No due dates, reminders/notifications (email/SMS/push), start/end times, recurrence, snooze, calendar integration.
   * No sub-tasks, checklists, attachments/uploaded files, comments/activity feeds beyond the basic fields specified.

6. **Manual reordering / drag & drop**

   * No persisted custom ordering, drag-and-drop sorting, kanban boards, swimlanes.
   * Default ordering: **created_at desc** for Active list; Completed in its own collapsible section.

7. **Analytics, dashboards, reports, exports**

   * No charts, burndown graphs, CSV export/import, data warehousing integrations.

8. **Complex filtering & search**

   * Only the basic list/counters and Completed collapse.
   * No fuzzy search, multi-field advanced filters, or saved queries.

9. **Internationalization beyond baseline**

   * Primary copy in Spanish with common English technical terms (*tags, priority, lock*).
   * No RTL layouts, pluralization frameworks, or multiple locales.

10. **Native mobile apps / browser extensions**

    * No iOS/Android native clients, no Chrome/Edge extensions.

11. **Security compliance & enterprise controls**

    * No SOC2/GDPR program, DLP, SSO, SCIM, IP allowlists, tenant-level encryption.
    * Reasonable security hygiene is expected (see 1.4.3), but **compliance** is out of scope for the assessment.

12. **Rate limiting / abuse mitigation**

    * No formal throttling, captcha, or WAF rules in v1.0 (acceptable for an assessment demo).

13. **Production observability suite**

    * No metrics dashboards, tracing systems, or centralized log aggregation beyond basic request_id logging.

14. **Full Chatbot conversation UX**

    * Multi-turn conversational flows, memory, and advanced prompts are **not** part of v1.0.
    * **In scope** is only the **readiness**: endpoints and schema fields to accept enrichment from n8n.

15. **WhatsApp message handling that mutates DB**

    * In v1.0, `/api/whatsapp` exists **only as a stub** that normalizes hashtagged messages.
    * No real task creation/completion via WhatsApp yet.

16. **Admin backoffice**

    * No admin consoles for managing users, tasks, or system configs.

17. **Heavy accessibility work**

    * Baseline keyboard focus, labels and roles are required; advanced screen-reader parity and WCAG audits are out of scope for v1.0.

---

## 1.4.3 **Assumptions & Dependencies**

These assumptions define the **operating contract** for v1.0. If any assumption changes, the PRD must be revised before implementation proceeds.

### A) Business & usage assumptions

1. **Single-user sessions, partitioned by Identifier.**
   The evaluator will use a self-provided **Identifier (email or name)** to view and manage a dedicated slice of tasks. There is no privacy guarantee across Identifiers (this is a demo assessment).
2. **No sensitive data expected.**
   Task content is assumed non-sensitive; no PII beyond the optional Identifier value.
3. **"To-Do" scope only.**
   The product exists to demonstrate a polished To-Do with persistence and keyboard UX, plus **day-1 readiness** for Chatbot and WhatsApp.

### B) Functional assumptions

1. **Identifier normalization & validation.**

   * Allowed characters: letters, digits, space, `@ . _ -`. Others are rejected with inline error.
   * Normalization: trim; collapse internal multiple spaces to one; lowercase for partition key comparisons.
   * Storage: both **raw** (for display) and **normalized** (for queries) may be stored server-side to ensure consistent scoping.
2. **Keyboard shortcuts must always be available** when focus is within the list area (see 1.4.1 F-08).
3. **Undo scope** is limited to **delete** and **complete toggle**, single-level, within the current session.

### C) Data model assumptions (high level; exact schema in SRS)

1. **Core table `todos`.**
   Fields minimally include: `id (uuid)`, `identifier_norm (text, indexed)`, `identifier_raw (text)`, `title (text)`, `description (text?)`, `priority (enum/text P0–P3)`, `project (text?)`, `tags (jsonb array of strings)`, `completed (bool)`, `created_at (timestamptz default now)`, `updated_at (timestamptz)`.
2. **Enrichment fields present from day one.**
   `enhanced_description (text?)`, `steps (jsonb array of strings?)`. These are **nullable** and safe to ignore in v1.0 UI if absent.
3. **Sorting.**
   Default list order for Active: `created_at desc`, stable within identical timestamps by `id`.

### D) System & architecture assumptions

1. **Server boundary for mutations.**
   All creates/edits/toggles/deletes execute on the server (Server Actions and/or API routes). The browser never holds a **service-role** key. Reads can be SSR/Server Actions; any client reads must scope strictly by `identifier_norm`.
2. **Supabase RLS posture (assessment mode).**
   For v1.0 demo, **RLS may be disabled** or permissive; isolation relies on the application filter by `identifier_norm`. The SRS will describe a future RLS strategy (e.g., Edge Functions with service role and request headers) without changing the client.
3. **Chatbot integration via n8n.**
   n8n will call back to our server using a predefined webhook (`/api/webhooks/enhance`). The app will **fire-and-forget** a minimal event after task create/title edit. If n8n is down, core To-Do is unaffected.
4. **WhatsApp integration (Evolution API or similar).**
   The server exposes `/api/whatsapp` to receive provider webhooks and **normalize** messages containing `#to-do-list`. Activation of real mutations is deferred; no UI or schema change will be needed later.
5. **Observability minimal but consistent.**
   Each mutation log includes a `request_id`; errors provide user-friendly toasts and server logs with non-sensitive details.

### E) Technology & deployment dependencies

1. **Runtime & framework.**
   Node.js LTS (≥18), **Next.js (13/14+)**, TypeScript, TailwindCSS, shadcn/ui, lucide icons.
2. **Database.**
   **Supabase** (Postgres) with `todos` table and necessary indexes (at least on `identifier_norm`, `completed`, `created_at`).
3. **Hosting.**
   **Vercel** for the web app. A single Supabase project for persistence. (n8n may be cloud or self-hosted; not required to be running for v1.0 acceptance.)
4. **Environment variables (present in `.env.example`).**

   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(reads; if used)*
   * `SUPABASE_SERVICE_ROLE` *(server only; if used by server actions/edge functions)*
   * `N8N_ENHANCE_WEBHOOK_URL` *(stub allowed for v1.0)*
   * `WHATSAPP_WEBHOOK_SECRET` *(if provider requires signature; stub allowed)*
   * `APP_ENV` / `LOG_LEVEL` *(optional)*
5. **Browser support.**
   Chrome/Edge/Safari/Firefox current versions. No IE. Mobile responsiveness is required; mobile Safari/Chrome must be usable.

### F) Security & privacy posture (assessment-appropriate)

1. **Secrets are never committed.**
   Keys live only in env vars; `.env.example` lists placeholders.
2. **Minimal PII.**
   The Identifier may look like an email; it is treated as a plain label for partitioning, not validated as a real mailbox, and not used to contact users.
3. **No guarantees of strong isolation.**
   Since there is no auth, a user who guesses an Identifier could view another dataset; this is acceptable for the assessment's constraints and documented in README.

### G) Performance assumptions

1. **Dataset size.**
   Typical session ≤ 50 active tasks; completed tasks may grow, but only fetched when the section is expanded (or via a separate query).
2. **Latency budgets.**
   DB round-trips are assumed to be within the budgets in **F-15** on Supabase's standard tier and Vercel regions close to the DB.

### H) Quality assumptions

1. **Consistency priority: user experience first.**
   Optimistic UI may briefly diverge; reconciliation always reflects server truth.
2. **Error visibility.**
   Any failed mutation must surface a toast; silent failure is unacceptable.

---

## 1.4.4 **Users & Roles (Personas)**

> Personas describe who interacts with SLS To-Do and what they need. They ground acceptance criteria and drive UX and API decisions.

### Persona A — **Evaluator / Hiring Engineer**

* **Who**: The person assessing the technical exercise (may be an engineer or hiring manager).
* **Goals**

  * Open the live app and immediately understand how to use it.
  * Verify **Identifier lock** gating and **true persistence** in Supabase across refreshes.
  * Exercise **CRUD** via UI and **keyboard shortcuts**.
  * Confirm **server boundary** (no client-side privileged writes).
  * (Later) Hit **Chat UI** and the **WhatsApp** webhook stub without the team having to refactor.
* **Frustrations**

  * Any **sign-up** or auth flow.
  * Ambiguous states (not knowing when the Identifier is locked).
  * Shortcuts that don't work or are undocumented.
  * Data disappearing after refresh or switching identifiers.
* **Success Criteria**

  * Can complete the acceptance checklist (1.3.4) within minutes.
  * Sees consistent task sets when switching **Identifier** A ↔ B.
  * Observes clean error toasts on forced failures (simulated).
  * Finds Chat and WhatsApp endpoints clearly linked and functional (stub for WA).
* **Environment**: Desktop browser (Chrome/Edge/Safari/Firefox), typical network, no VPN required.

---

### Persona B — **Guest User (Non-Technical)**

* **Who**: A general user (e.g., recruiter) clicking the app link.
* **Goals**

  * Type a name/email, lock it, add/complete a few tasks quickly.
  * Change priorities and tags without reading docs.
* **Frustrations**

  * Complex forms; unclear "required" fields.
  * Losing edits on refresh.
* **Success Criteria**

  * Understands the **two-step**: enter **Identifier** → **Lock** → add tasks.
  * Can add/edit/complete/delete tasks with immediate visual feedback.

---

### Persona C — **Developer / Operator (Carlos)**

* **Who**: The candidate responsible for the repo and deployments.
* **Goals**

  * Keep a **clean architecture**: server boundary enforced, envs managed, no secrets in Git.
  * Expose **/api/chat** and **/api/webhooks/enhance** for n8n; **/api/whatsapp** stub.
  * Provide **.env.example**, **README**, and **docs/** for evaluators.
* **Frustrations**

  * Refactors later just to add Chat/WhatsApp.
  * Debugging without request correlation or health checks.
* **Success Criteria**

  * Passing the acceptance checklist and performance budgets.
  * Simple, reviewable code structure (Next.js conventions, typed models).

---

### Persona D — **Automation Orchestrator (n8n) — *System Persona***

* **Who**: External workflow calling back into the app.
* **Goals**

  * Receive minimal event after task create/title edit.
  * Call LLM (and optional web search), then **PATCH** enrichment back.
* **Frustrations**

  * Tight coupling to UI; lack of stable server endpoints.
* **Success Criteria**

  * Can POST to **/api/webhooks/enhance** with `{ todo_id, identifier, title }`.
  * DB schema already has `enhanced_description` / `steps` fields.

---

### Persona E — **WhatsApp User (Evaluator via WA) — *System Persona***

* **Who**: Evaluator interacting through WhatsApp later.
* **Goals**

  * Send commands prefixed with **`#to-do-list`** to avoid spam.
  * Get normalized commands server-side without changing UI/DB.
* **Frustrations**

  * Missing webhook or mismatched payload formats.
* **Success Criteria**

  * Provider webhook hits **/api/whatsapp**; server logs normalized commands:

    * `add <title>` / `list` / `done <taskId>` (case-insensitive).

---

## 1.4.5 **User Scenarios (End-to-End)**

> Each scenario includes **Preconditions**, **Trigger**, **Happy Path**, **Alternates/Errors**, and **Post-conditions**. Cross-refs to features in **1.4.1 F-xx**.

---

### **S-01 First Visit & Identifier Lock**

* **Preconditions**

  * App deployed; DB reachable; no Identifier locked.
* **Trigger**: User opens the app URL.
* **Happy Path**

  1. Sees header **"My Tasks"** + subtitle and Identifier input with **Lock** button. *(F-01)*
  2. Types `john@example.com`, clicks **Lock**.
  3. Input validates (allowed chars), stores **normalized** key internally, disables the field, shows **locked** state. *(F-01)*
  4. "Add new task…" composer becomes enabled. *(F-02)*
* **Alternates/Errors**

  * Invalid chars → inline error, cannot lock. *(F-01)*
  * Network hiccup on initial load → toast error, retry link.
* **Post-conditions**

  * Identifier locked; tasks scope to `identifier_norm = john@example.com`.

---

### **S-02 Add Task with Full Metadata**

* **Preconditions**: Identifier locked.
* **Trigger**: User clicks "Add new task…" or presses `Enter` in the field.
* **Happy Path**

  1. Composer expands with fields: **Title (required)**, Description (opt), **Priority** default **P2**, Project (opt), **Tags** (opt). *(F-02)*
  2. User fills:

     * Title: "Write PRD"
     * Description: "Draft sections 1.4.x"
     * Priority: **P1**
     * Project: "SLS To-Do"
     * Tags: `docs, prd`
  3. Submits (Enter or **Add Task**). Client validates and fires mutation. *(F-02, F-11)*
  4. Optimistic add → server success → list shows new item at top of **Active**. *(F-02)*
* **Alternates/Errors**

  * Missing Title → inline error, no submit. *(F-02)*
  * Server down → toast error, optimistic entry rolled back. *(F-14, F-11)*
* **Post-conditions**

  * Row exists in DB (scoped by Identifier), visible after refresh. *(F-10)*

---

### **S-03 Inline Edit (Title/Description)**

* **Preconditions**: Task exists in Active list; Identifier locked.
* **Trigger**: User presses **`E`** on focused task or clicks edit control.
* **Happy Path**

  1. Title and Description become editable inline. *(F-03, F-08)*
  2. User updates Title to "Write complete PRD"; presses **Enter** (save).
  3. UI optimistic update; server persists; **updated_at** changes.
* **Alternates/Errors**

  * Empty Title → inline error, blocks save. *(F-03)*
  * Press **Esc** → cancels and reverts. *(F-03)*
* **Post-conditions**

  * Persisted changes visible after refresh. *(F-10)*

---

### **S-04 Toggle Complete & Collapse Completed**

* **Preconditions**: At least one Active task.
* **Trigger**: User clicks the completion checkbox.
* **Happy Path**

  1. Task toggles to **completed**; counters update (`X active · Y completed`). *(F-04, F-09)*
  2. Task moves to **Completed Tasks (Y)** collapsible section (default collapsed if Y > 0). *(F-09)*
* **Alternates/Errors**

  * Server error → toast, rollback to previous state. *(F-14)*
* **Post-conditions**

  * Completed state persists across refresh and Identifier switches. *(F-10)*

---

### **S-05 Bulk Select, Priority Change, and Delete with Undo**

* **Preconditions**: Multiple tasks exist; Identifier locked.
* **Trigger**: User presses **`CTRL+A`** then **`P`**.
* **Happy Path**

  1. **Select all** visible tasks. *(F-08)*
  2. **Priority menu** opens; selects **P0** → applies to all selected. *(F-06)*
  3. Press **`DEL`** to delete selected; toast shows **Undo (5s)**. *(F-05, F-14)*
  4. Click **Undo** within 5s → tasks restored (client + server). *(F-05)*
* **Alternates/Errors**

  * Missing focus area → shortcuts do nothing; help box shows mapping. *(F-08)*
  * Server delete failure → error toast; UI restores items. *(F-05, F-14)*
* **Post-conditions**

  * Priority changes/deletes reflect in DB accordingly (or are undone).

---

### **S-06 Persistence Across Refresh & Identifier Switch**

* **Preconditions**: Identifier A has tasks; Identifier B has none.
* **Trigger**: User refreshes page; later, unlocks and enters another Identifier.
* **Happy Path**

  1. Refresh → same task set for Identifier A. *(F-10)*
  2. **Unlock** → enter Identifier B → **Lock** → sees empty list. *(F-01)*
  3. Switch back to Identifier A → original tasks reappear.
* **Alternates/Errors**

  * Local prefill only helps with UX; no tasks are stored locally. *(F-10)*
* **Post-conditions**

  * Data partitioning by **identifier_norm** verified.

---

### **S-07 Title Enrichment Event (Chatbot Readiness)**

* **Preconditions**: n8n webhook URL configured (can be a mock endpoint in v1.0).
* **Trigger**: User creates a task or updates **Title**.
* **Happy Path**

  1. App **fire-and-forgets** `{ todo_id, identifier, title }` to **/api/webhooks/enhance**. *(F-12)*
  2. (External) n8n calls back or directly **PATCH**es DB fields `enhanced_description`, `steps`.
  3. UI renders enrichment if fields are present; otherwise nothing changes.
* **Alternates/Errors**

  * n8n unavailable → app logs info; user experience unaffected. *(F-12)*
* **Post-conditions**

  * Schema supports enrichment without UI/code refactor. *(F-12)*

---

### **S-08 WhatsApp Stub Normalization**

* **Preconditions**: `/api/whatsapp` deployed; provider test payload ready.
* **Trigger**: Provider sends message body: `"#to-do-list add Buy milk"`.
* **Happy Path**

  1. Server validates hashtag, normalizes to `{ command:"add", title:"Buy milk", sender:"+52..." }`. *(F-13)*
  2. Logs the normalized command; **does not** mutate DB in v1.0.
* **Alternates/Errors**

  * Missing hashtag → ignored or logged as non-actionable.
* **Post-conditions**

  * Endpoint verified; no UI/DB changes required to enable full behavior later. *(F-13)*

---

### **S-09 Server Failure During Mutation (Resilience)**

* **Preconditions**: Identifier locked; network or DB simulated failure.
* **Trigger**: User attempts create/edit/delete.
* **Happy Path**

  1. Request fails; app shows **error toast** with retry guidance. *(F-14)*
  2. Any optimistic UI is reconciled to server truth (rolled back).
* **Alternates/Errors**

  * Repeated failures → subsequent attempts continue to surface errors; health check indicates issue. *(F-18)*
* **Post-conditions**

  * No ghost items; UI consistent with server.

---

### **S-10 Keyboard-Only Accessibility**

* **Preconditions**: Browser; no mouse.
* **Trigger**: User tabs into list and uses documented shortcuts.
* **Happy Path**

  1. Focus rings visible as the user tabs to the list and controls. *(F-16)*
  2. `E`, `P`, `DEL`, `CTRL+A`, `CTRL+Z`, `ESC` all function per spec. *(F-08)*
* **Alternates/Errors**

  * Screen reader users: labels announce controls meaningfully.
* **Post-conditions**

  * Keyboard-first flow is fully usable; documented in the **Keyboard Shortcuts** box.

---

### **S-11 Health Check & Ops**

* **Preconditions**: App deployed.
* **Trigger**: Operator/Evaluator hits `/api/health`.
* **Happy Path**

  1. Endpoint returns **200 OK**; logs include a simple request trace. *(F-18)*
* **Alternates/Errors**

  * If not 200 → deployment misconfig; identified early.
* **Post-conditions**

  * Operational readiness confirmed.

---

## 1.5 **Functional Requirements**

All requirements are **testable** and carry a unique ID. They map to scope items in **1.4.1** and scenarios in **1.4.5**.

---

### 1.5.1 **Task Management**

**FR-01 — Identifier Lock (gate)**

* **Req**: The app MUST block task creation until the user enters an Identifier (email or name) and presses **Lock**.
* **Details**:

  * Allowed chars: letters, digits, spaces, `@ . _ -`. Trim leading/trailing spaces; collapse multiple internal spaces.
  * Store **identifier_norm** (lowercased) for queries; store **identifier_raw** for display.
  * Lock state MUST disable the input and show a "locked" affordance; Unlock re-enables the input and disables add.
* **Acceptance**: Trying to add a task without a locked Identifier shows inline error and does NOT persist.

**FR-02 — Create Task (composer)**

* **Req**: The "Add new task…" composer MUST collect:

  * `title` *(required, ≤200 chars)*,
  * `description` *(optional, ≤2000 chars)*,
  * `priority` *(required; default `P2 (Medium)`; values: `P0, P1, P2, P3`)*,
  * `project` *(optional, ≤80 chars)*,
  * `tags` *(optional; comma-separated; ≤20 tags; each ≤24 chars; no dups case-insensitive)*.
* **Behavior**: Submit by Enter (in Title) or "Add Task" button; optimistic insert; reconcile with DB (real `id`, timestamps).
* **Acceptance**: Cannot submit without `title` or without locked Identifier. New task appears at top of **Active**.

**FR-03 — Edit Task (inline)**

* **Req**: Inline edit MUST support `title`, `description`, and controls to change `priority`, `project`, `tags`.
* **Behavior**: Enter saves; Esc cancels; optimistic update; reconcile on success.
* **Acceptance**: Empty `title` blocked with inline error; `updated_at` changes on save.

**FR-04 — Toggle Complete**

* **Req**: A checkbox/toggle MUST flip `completed` state.
* **Behavior**: Completed tasks move to **Completed Tasks** collapsible section; counters update.
* **Acceptance**: State persists after refresh and Identifier switches.

**FR-05 — Delete (with Undo)**

* **Req**: Deleting selected tasks MUST show a toast "Undo (5s)".
* **Behavior**: Within 5s, Undo restores tasks (client + server); after 5s, finalize deletion.
* **Acceptance**: No deleted task reappears after refresh unless Undo was used.

**FR-06 — Priority Management**

* **Req**: Users MUST change priority per task or in bulk to `P0..P3`.
* **Behavior**: `P` shortcut opens a small menu; visual indicators reflect priority (color/icon).
* **Acceptance**: Persisted change visible after refresh; bulk applies to all selected.

**FR-07 — Project & Tags**

* **Req**: Users MUST add/edit/remove `project` and `tags` on any task.
* **Behavior**: Tags parsed from comma input; trimmed; deduplicated case-insensitively.
* **Acceptance**: Project/Tags consistent in Active & Completed and survive refresh.

**FR-08 — Lists, Counters, Collapse**

* **Req**: Show **Active** list; show **Completed Tasks (N)** collapsible section.
* **Behavior**: Counters `X active · Y completed` update on any mutation; collapse state may be local-only.
* **Acceptance**: Counters accurate after refresh and Identifier change.

**FR-09 — Persistence & Sorting**

* **Req**: For a locked Identifier, a full page refresh MUST show the same tasks from Supabase.
* **Behavior**: Default ordering for Active is `created_at desc` (stable tiebreak by `id`); Completed listed within its section.
* **Acceptance**: QA creates 3 tasks → refresh → sees same 3 for same Identifier.

---

### 1.5.2 **Keyboard & Selection**

**FR-10 — Selection Model**

* **Req**: Click focuses a task; `CTRL+A` selects all visible in current section; `ESC` clears selection.
* **Acceptance**: Selection state is visible; clear works reliably.

**FR-11 — Shortcuts**

* **Req**: The following MUST work when focus is within the list area:

  * `E` → Edit focused / first selected.
  * `P` → Open priority change menu (batch applies for multi-select).
  * `DEL` → Delete selected (with Undo).
  * `CTRL+A` → Select all.
  * `CTRL+Z` → Undo last undoable action (delete or toggle), single level.
  * `ESC` → Clear selection or exit edit.
* **Acceptance**: Each shortcut path validated by test plan; no destructive action without undo option.

---

### 1.5.3 **Server Boundary, Chat & Webhooks**

**FR-12 — Server Boundary for Mutations**

* **Req**: All create/edit/toggle/delete MUST execute on the server (Server Actions and/or API routes).
* **Prohibitions**: No client-side writes using service-role keys; any client-side reads MUST be scoped by `identifier_norm`.
* **Acceptance**: Code review confirms boundary; disabling server causes clean, user-facing errors.

**FR-13 — Minimal Chat UI (Same DB)**

* **Req**: Provide a **Chat** page/route that operates on the same Identifier context and supports minimal commands:

  * `list` → returns current tasks summary,
  * `add <title>` \[+ optional `|priority=P?` `|project=...` `|tags=a,b`],
  * `done <taskId>`.
* **Behavior**: The Chat page calls **`/api/chat`**; the server resolves commands to CRUD against Supabase via the same boundary as the UI.
* **Acceptance**: Executing `add` via Chat creates a task visible in the main UI; `list` reflects actual DB state; `done` toggles completion.

**FR-14 — Enrichment Webhook (n8n)**

* **Req**: The server MUST expose **`/api/webhooks/enhance`** and on task create/title change MUST emit a minimal event to n8n (fire-and-forget):

  * Payload: `{ todo_id: uuid, identifier: string, title: string }`.
* **Behavior**: n8n/LLM can PATCH back `enhanced_description` and `steps` (array of strings).
* **Acceptance**: Sending a synthetic call from n8n updates enrichment fields; UI renders them if present.

**FR-15 — WhatsApp Webhook (Stub, Hashtag Filter)**

* **Req**: The server MUST expose **`/api/whatsapp`** that:

  * Validates presence of **`#to-do-list`** in the incoming message body (case-insensitive),
  * Normalizes commands: `add`, `list`, `done <taskId>`,
  * Logs normalized payload (`command`, `args`, `sender`) without mutating DB in v1.0.
* **Acceptance**: Posting a sample provider payload yields normalized log; no schema/UI changes needed to enable real actions later.

---

### 1.5.4 **UX, Feedback & Accessibility**

**FR-16 — Inline Validation & Toasts**

* **Req**: All invalid inputs MUST show inline messages; all failed mutations MUST show a toast with human-readable guidance.
* **Acceptance**: Simulated server errors produce toasts; optimistic UI reconciles correctly.

**FR-17 — Keyboard Shortcuts Help**

* **Req**: A visible **Keyboard Shortcuts** box MUST list key bindings (`E`, `P`, `DEL`, `CTRL+A`, `CTRL+Z`, `ESC`).
* **Acceptance**: Box is discoverable and accurate.

**FR-18 — Accessibility Baseline**

* **Req**: Focus rings visible; semantic roles/labels on interactive elements; checkboxes and buttons announced meaningfully to screen readers.
* **Acceptance**: Tabbing reaches all controls in logical order; screen reader announces control purpose.

---

### 1.5.5 **Operations, Health & Logging**

**FR-19 — Health Check**

* **Req**: Provide `/api/health` returning **200 OK** with a simple JSON payload (e.g., `{ ok: true }`).
* **Acceptance**: Deployed app responds 200 on that route.

**FR-20 — Request Correlation**

* **Req**: Each mutation request MUST log a **request_id** and basic context (route, Identifier hash or truncated, operation type), excluding sensitive values.
* **Acceptance**: Logs visible during review; errors correlate by request_id.

---

### 1.5.6 **Configuration & Secrets**

**FR-21 — Environment Configuration**

* **Req**: Provide `.env.example` with all required variables:

  * `NEXT_PUBLIC_SUPABASE_URL`
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(reads if needed)*
  * `SUPABASE_SERVICE_ROLE` *(server only, if used)*
  * `N8N_ENHANCE_WEBHOOK_URL`
  * `WHATSAPP_WEBHOOK_SECRET` *(if applicable)*
* **Acceptance**: Running without envs fails fast with clear server logs; with valid envs the app boots.

**FR-22 — No Secrets in Git**

* **Req**: The repo MUST NOT contain real credentials or tokens; `.gitignore` MUST exclude local env files.
* **Acceptance**: Secret scanners return clean; manual inspection finds no secrets.

---

## 1.6 **Non-Functional Requirements (NFRs)**

All NFRs are **testable** and carry IDs.

### 1.6.1 Performance & Capacity

**NFR-01 — Latency budgets**

* **Req**:

  * TTFB (Vercel, warm): ≤ **600 ms** for initial HTML.
  * List (≤ 50 active tasks) DB round-trip: ≤ **150 ms** average.
  * Mutation (create/edit/toggle/delete): ≤ **500 ms** median, ≤ **1000 ms** p95.
* **Acceptance**: Observed via simple server timing logs in staging/prod; attach sample logs in PR.

**NFR-02 — Throughput (light load)**

* **Req**: Support **5 concurrent users** and **~1 RPS** sustained without breaching NFR-01.
* **Acceptance**: Lightweight k6 script (or equivalent) shows budgets met.

**NFR-03 — Dataset size**

* **Req**: Smooth UX with **≤ 1,000 tasks** per Identifier (only ≤ 50 active fetched by default; completed fetched on expand).
* **Acceptance**: Manual test DB seed; list interactions remain responsive.

---

### 1.6.2 Reliability & Availability

**NFR-04 — Availability (assessment)**

* **Req**: App and APIs available during review; transient deploys < 1 min downtime.
* **Acceptance**: Uptime acceptable during evaluation window; `/api/health` returns 200.

**NFR-05 — Failure behavior**

* **Req**: Any failed mutation must:

  1. show **error toast**; 2) reconcile optimistic UI back to server truth; 3) log with `request_id`.
* **Acceptance**: Simulated DB/network failure exhibits the behavior.

**NFR-06 — Data durability**

* **Req**: Rely on Supabase/Postgres durability; no data stored exclusively in localStorage.
* **Acceptance**: Refresh never loses persisted data for a locked Identifier.

---

### 1.6.3 Security & Privacy (assessment-appropriate)

**NFR-07 — Secrets hygiene**

* **Req**: No secrets in Git; `.env.example` provided.
* **Acceptance**: Secret scan clean; manual review passes.

**NFR-08 — Least privilege in client**

* **Req**: Client MUST NOT hold **service-role** keys; any client read uses anon key and strict Identifier filters.
* **Acceptance**: Code inspection confirms; build artifacts don't contain service keys.

**NFR-09 — Privacy posture**

* **Req**: Identifier treated as a label (may look like email) with no verification and not used for contact. No other PII collected.
* **Acceptance**: README privacy note present; telemetry disabled by default.

**NFR-10 — Basic input safety**

* **Req**: Server validates and sanitizes text fields (title/description/tags/project) to prevent SQLi/XSS (escape on render; no HTML allowed).
* **Acceptance**: Attempted HTML/script tags are rendered inert/plain text.

---

### 1.6.4 Maintainability & Operability

**NFR-11 — Code quality**

* **Req**: TypeScript strict mode; lint + format checks in CI; modular file layout (`/app`, `/lib`, `/components`, `/app/api`).
* **Acceptance**: CI passes; no `any` without justification.

**NFR-12 — Observability**

* **Req**: Each mutation logs `{ request_id, route, op, identifier_hash }` at info level; errors at error level (no sensitive payloads).
* **Acceptance**: Logs sampled in staging contain these fields.

**NFR-13 — Health check**

* **Req**: `/api/health` → `200 { ok: true }`.
* **Acceptance**: Endpoint reachable post-deploy.

**NFR-14 — Docs & runbooks**

* **Req**: Provide `README.md`, `/docs/PRD.md`, `/docs/SRS.md` (once delivered), `.env.example`, and minimal run instructions.
* **Acceptance**: Fresh clone → run succeeds following README.

---

### 1.6.5 Compatibility & Accessibility

**NFR-15 — Browser support**

* **Req**: Latest Chrome, Edge, Firefox, Safari (desktop). Usable on mobile Safari/Chrome.
* **Acceptance**: Smoke test checklist passes.

**NFR-16 — Accessibility baseline**

* **Req**: Keyboard navigable; visible focus; ARIA roles/labels on checkboxes, buttons, lists.
* **Acceptance**: Tabbing reaches controls; screen reader announces purpose.

---

### 1.6.6 Extensibility Readiness

**NFR-17 — Stable server boundaries**

* **Req**: Reserve `/api/chat`, `/api/webhooks/enhance`, `/api/whatsapp` with stable contracts so Chatbot/WhatsApp can be enabled without UI/schema refactors.
* **Acceptance**: Stubs present; sample synthetic calls succeed (or log).

**NFR-18 — Schema forward-compatibility**

* **Req**: Include `enhanced_description` and `steps` fields from day 1 (nullable).
* **Acceptance**: Migration present; UI renders if present, ignores if null.

---

## 1.7 **Release Plan (Milestones & Acceptance Gates)**

> v1.0 is the assessment deliverable. We split implementation into **internal milestones** to de-risk delivery while keeping the final handoff simple.

### Milestone M0 — Project setup (Day 0–0.5)

* **Scope**: Next.js app (TypeScript), Tailwind, shadcn/ui; repo; CI lint/format; `.env.example`; base layout & theme.
* **Artifacts**: Repo bootstrapped; `/api/health`.
* **Gate**: CI green; health returns 200.

### Milestone M1 — Identifier lock & Core CRUD (Day 0.5–2)

* **Scope**:

  * Identifier input + **Lock/Unlock** (F-01).
  * Supabase table + CRUD server actions/API (F-02/03/04/05/11).
  * Lists, counters, completed collapse (F-09/10/14).
* **Artifacts**: DB migration; server routes/actions; optimistic UI; toasts.
* **Gate**: Acceptance tests S-01/02/03/04/06 pass.

### Milestone M2 — Keyboard & metadata (Day 2–3)

* **Scope**: Shortcuts & selection (F-08), priority/project/tags (F-06/07), undo (delete/toggle) (F-05).
* **Gate**: S-05, S-10 pass; help box shows shortcuts.

### Milestone M3 — Chat minimal + Enrichment readiness (Day 3–4)

* **Scope**:

  * **Chat page** + `/api/chat` (FR-13) — `list`, `add`, `done`.
  * `/api/webhooks/enhance` stub + emit event on create/title change (F-12).
  * Schema includes `enhanced_description`, `steps`.
* **Gate**: S-07 passes with synthetic webhook; Chat commands reflect same DB.

### Milestone M4 — WhatsApp stub (Day 4–4.5)

* **Scope**: `/api/whatsapp` stub, hashtag normalization `#to-do-list` → `{ command, args, sender }` (F-13).
* **Gate**: S-08 passes with provider sample payload.

### Milestone M5 — Polish, performance, docs, deploy (Day 4.5–5)

* **Scope**: Perf budgets (NFR-01..03), logging with `request_id` (FR-20/NFR-12), README + `/docs/PRD.md`, deploy to Vercel; secret hygiene.
* **Gate**: NFR-01..03, 07..08, 12..13, 15..16, 17..18 pass; URLs shared.

**Deliverables at the end of v1.0**

* **App URL**, **Chat URL**, **GitHub repo**, and WhatsApp webhook **stub** verified.

---

## 1.8 **Open Questions (Decisions to Finalize)**

| ID    | Question                                    | Options                                                                       | Decision Owner | Needed By | Impact if unresolved                |
| ----- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------- | --------- | ----------------------------------- |
| OQ-01 | **Identifier normalization**: allow spaces? | (A) Allow & collapse; (B) Disallow                                            | Tech Lead      | M1        | Inconsistent scoping across devices |
| OQ-02 | **Tags input**: delimiter strictly comma?   | (A) Comma only; (B) comma/space                                               | Tech Lead      | M2        | UX confusion; duplicate tags        |
| OQ-03 | **Priority tokens** visual scheme           | (A) Color dots; (B) Icons + color                                             | Design         | M2        | Accessibility of priority cues      |
| OQ-04 | **DB RLS posture for demo**                 | (A) Disabled; (B) Permissive RLS via Edge Fn                                  | Tech Lead      | M1        | Complexity vs demo speed            |
| OQ-05 | **n8n callback model**                      | (A) PATCH DB directly; (B) Call `/api/webhooks/enhance` for server-side patch | Tech Lead      | M3        | Auditability & security             |
| OQ-06 | **LLM provider** for enrichment             | (A) OpenAI; (B) Gemini; (C) Pluggable                                         | Tech Lead      | M3        | Cost, token limits, quality         |
| OQ-07 | **Web search** for enrichment               | (A) None; (B) Add provider later                                              | Tech Lead      | M3        | Scope creep vs value                |
| OQ-08 | **WhatsApp provider**                       | (A) Evolution API; (B) Official Business API; (C) Twilio                      | Tech Lead      | M4        | Setup time & reliability            |
| OQ-09 | **Completed collapse memory**               | (A) Session only; (B) Persist per Identifier                                  | Product        | M2        | Minor UX polish                     |
| OQ-10 | **Undo depth**                              | (A) Single; (B) Multi-level                                                   | Product        | M2        | Complexity vs value                 |

*Defaults used if not decided by due dates*: OQ-01(A), OQ-02(A), OQ-03(A), OQ-04(A), OQ-05(B), OQ-06(C), OQ-07(A), OQ-08(A), OQ-09(A), OQ-10(A).

---

## 1.9 **FAQ (Evaluator-Focused)**

**Q1. Why no authentication?**
Because the assessment explicitly requests **no auth**. We gate usage by an **Identifier lock** and partition data in Supabase. The README explains the demo privacy model.

**Q2. How do you prevent accidental cross-data access?**
By scoping every query with `identifier_norm` and never exposing service-role keys to the browser. For production-grade isolation we would enable **RLS + Edge Functions**—described in SRS—but it's out of scope for v1.0.

**Q3. Why Server Actions / API routes instead of direct client writes?**
To enforce a **server boundary**: better security, logs, validation, and future-proofing for Chatbot/WhatsApp. It also avoids leaking privileged keys.

**Q4. What happens if n8n is down?**
Task creation/edit still succeeds. The enrichment call is **fire-and-forget**; failures are logged and have **no UX impact**.

**Q5. How do I switch between different task sets?**
Unlock the Identifier, enter a new one, lock again. Each Identifier maps to its own dataset.

**Q6. Can I use the app fully with the keyboard?**
Yes. `E` edit, `P` priority, `DEL` delete (with Undo), `CTRL+A` select all, `CTRL+Z` undo, `ESC` clear. A **Keyboard Shortcuts** box documents them.

**Q7. Why Supabase/Postgres?**
It offers a fast managed Postgres, simple SDKs, and easy Vercel integration—ideal for a polished assessment with real persistence.

**Q8. How would you add proper RLS later without refactor?**
Keep the **same schema**; route all reads/writes through **Edge Functions** using service-role on server; authenticate callers via a lightweight token per Identifier or a proper auth system. UI unchanged.

**Q9. How is Undo implemented?**
Client keeps a minimal stack for **delete/toggle** with a 5s window; server provides a restore path for deletes within that window.

**Q10. How do I enable WhatsApp later?**
Point the provider webhook to `/api/whatsapp`, verify secrets if any, and switch the stub to invoke the same server use-cases (`add`, `list`, `done`). No UI or schema change needed.

**Q11. What guarantees performance?**
Tight queries (indexed on `identifier_norm`, `completed`, `created_at`), small payloads, optimistic UI, and Vercel/Supabase proximity. NFR-01..03 define measurable budgets.

**Q12. Does the Chat page use the same data?**
Yes. It calls `/api/chat` which resolves to the **same server layer** and Supabase tables as the main UI.

---

*(End of PRD sections requested. Next artifacts on your signal: SRS + Architecture Manifest.)*