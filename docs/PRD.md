# SLS To-Do — Product Requirements Document (PRD)

**Version:** 1.1 (Normalized)

**Document Purpose:** This PRD defines, with operational precision and without ambiguity, what the team must build for the SLS To-Do application. It serves as the single source of truth for scope, criteria, and product deliverables.

## 1.0 Document Control

**Product:** SLS To-Do
**Status:** Approved for implementation
**Owner:** Carlos Verástegui (PM/Dev)

### Relationship with Artifacts

*   **SRS (Canonical Requirements):** `/docs/SRS.md`
*   **Architecture Manifest:** `/docs/ARCHITECTURE.md`
*   **Test Plan (QA):** `/docs/TEST-PLAN.md`

---

## 1.2 Summary / Introduction

### Product Definition

SLS To-Do is a web application that lets a user manage tasks with minimal friction. Data is partitioned by a user-provided **Identifier** (e.g., an email or name), not traditional authentication. The architecture is engineered from day one to support a minimal **Chat UI**, an asynchronous **AI Enrichment** workflow, and a stubbed **WhatsApp** adapter without future refactoring.

### Core v1.0 Contract

*   **Identifier-gated usage (no auth):** The user must "lock" an Identifier string before creating tasks.
*   **Task Model:** Tasks include a title (required), description, priority (P0-P3), project name, and tags.
*   **Persistence:** All data is stored in a Supabase Postgres database. No tasks are stored in localStorage.
*   **Server Boundary:** All data mutations are executed via Server Actions or API routes.
*   **Extensibility:** The architecture includes stubbed endpoints and schema fields for Chat, AI Enrichment, and WhatsApp.

### Deliverables (Assessment Contract)

*   Live App URL (Vercel)
*   Chat UI URL (Vercel)
*   Public GitHub repository

---

## 1.3 Objectives & Success Metrics

*   **O1: Frictionless Start:** Users must lock an Identifier to create tasks. Switching Identifiers must switch the dataset.
*   **O2: Robust CRUD:** All task operations (Create, Edit, Complete, Delete) must work via both UI controls and keyboard shortcuts.
*   **O3: True Persistence:** Task state must be consistent across page reloads for a given Identifier.
*   **O4: Production Hygiene:** No secrets in Git; a clear README and documentation are provided; the app is deployed on Vercel.
*   **O5: Architectural Enablement:** The system includes the necessary server boundaries, API stubs, and schema fields to easily enable Chat, AI Enrichment, and WhatsApp features in the future.

### Acceptance Checklist (Evaluator)

- [ ] Cannot create tasks until Identifier is locked.
- [ ] Tasks persist across refresh and are scoped by Identifier.
- [ ] CRUD works via UI and shortcuts (E, P, DEL, CTRL+A, CTRL+Z, ESC).
- [ ] Priority selection (P0–P3), Project, and Tags are supported.
- [ ] "Completed Tasks" section is collapsible and counters are correct.
- [ ] All DB interactions respect the server boundary.
- [ ] Repo has `.env.example`, README, and this PRD.
- [ ] App URL + Chat URL provided; WhatsApp endpoint is stubbed and documented.

---

## 1.4 Product Scope (v1.0)

This section defines the features required for v1.0. The requirement IDs (e.g., FR-1) are canonical and are mapped from the SRS. *(IDs normalized)*

### 1.4.1 Included Features (In Scope)

#### **FR-1 — Core To-Do CRUD**

*   **Description:** The system must allow users to Create, Read, Update, and Delete (CRUD) tasks. This includes creating new tasks with at least a title, editing all task attributes, and toggling tasks between active and completed states.
*   **Acceptance Criteria:**
    *   A task can be created with a `title` (required, ≤200 chars) and optional `description` (≤2000 chars).
    *   An existing task's title and description can be edited inline. `Enter` saves, `Esc` cancels.
    *   A task's `completed` status can be toggled via a checkbox.
    *   All operations must persist to the database and be reflected after a page refresh.

#### **FR-2 — List UX**

*   **Description:** The UI must present tasks in a clear, organized manner, with separate sections for active and completed items.
*   **Acceptance Criteria:**
    *   The UI displays two lists: "Active" and "Completed Tasks".
    *   The "Completed Tasks" section is collapsible and is collapsed by default if it contains items.
    *   Accurate counters for active and completed tasks (e.g., `X active · Y completed`) are displayed and update immediately after any state change.

#### **FR-3 — Identifier Lock**

*   **Description:** The application must gate all task creation behind an "Identifier Lock" mechanism.
*   **Acceptance Criteria:**
    *   The UI presents an input field for an Identifier and a "Lock" button.
    *   Task creation controls are disabled until the user enters an Identifier and clicks "Lock".
    *   Unlocking the Identifier disables task creation again.
    *   Switching Identifiers correctly switches the view to the corresponding dataset.

#### **FR-4 — Metadata & Priority**

*   **Description:** Tasks must support additional metadata for organization: priority, project, and tags.
*   **Acceptance Criteria:**
    *   Users can set a priority: `P0` (Critical), `P1` (High), `P2` (Medium, default), `P3` (Low).
    *   The priority is visually indicated on each task.
    *   Users can assign an optional, free-text `project` name (≤80 chars).
    *   Users can assign optional `tags` from a comma-separated input (≤20 tags, each ≤24 chars, duplicates ignored).

#### **FR-5 — Ops & Health**

*   **Description:** The system must provide basic operational endpoints and guarantees.
*   **Acceptance Criteria:**
    *   A `/api/health` endpoint exists and returns a `200 OK` status with the app version.
    *   All server errors are logged and include a unique `request_id` for correlation.
    *   The system correctly persists data across refreshes, reflecting its operational health.

#### **FR-6 — Shortcuts & A11y**

*   **Description:** The application must be usable and efficient via keyboard shortcuts, with a baseline of accessibility.
*   **Acceptance Criteria:**
    *   The following shortcuts are implemented: `E` (edit), `P` (priority), `DEL` (delete), `CTRL+A` (select all), `CTRL+Z` (undo), `ESC` (clear selection/cancel edit).
    *   A "Keyboard Shortcuts" help box is visible in the UI.
    *   All interactive elements have visible focus states and are reachable via Tab key in a logical order.

#### **FR-7 — Title Enrichment**

*   **Description:** The system architecture must support asynchronous task enrichment via an external n8n workflow and an LLM.
*   **Acceptance Criteria:**
    *   The database schema includes nullable fields for `enhanced_description` and `steps`.
    *   When a task is created, a fire-and-forget event is sent to a webhook endpoint (`/api/webhooks/enhance`).
    *   The UI will display the enriched content if it becomes available, without requiring a page reload.
    *   The enrichment flow is non-blocking; failure to enrich does not impact core task creation.

#### **FR-8 — Minimal Chat UI**

*   **Description:** A simple chat interface must be available for basic task operations using deterministic commands.
*   **Acceptance Criteria:**
    *   A `/chat` page exists with a text input and a simple transcript view.
    *   The interface accepts the commands `list`, `add <title> [|options]`, and `done <taskId>`.
    *   Commands are parsed on the server without an LLM and operate on the same database as the main UI.

#### **FR-9 — WhatsApp Stub**

*   **Description:** The system must include a stubbed webhook to handle inbound messages from a WhatsApp provider.
*   **Acceptance Criteria:**
    *   An `/api/whatsapp` endpoint is available.
    *   It processes messages containing the `#to-do-list` hashtag.
    *   It normalizes and logs the recognized command (`add`, `list`, `done`) but does not write to the database in v1.0.

#### **FR-10 — Undo Delete (Client)**

*   **Description:** Users must have a short window to undo accidental deletions.
*   **Acceptance Criteria:**
    *   After deleting a task, a toast notification appears with an "Undo" button, available for 5 seconds.
    *   Clicking "Undo" re-creates the task. The server performs a hard delete, so the new task may have a different ID.

---

### 1.4.2 **Out of Scope (Exclusions)**

The following items are explicitly excluded from v1.0:

*   **Traditional Authentication:** No user sign-up, login, SSO, or password management.
*   **Real-time Collaboration:** No websockets or live updates between different clients.
*   **Advanced Task Features:** No due dates, reminders, sub-tasks, or attachments.
*   **Full Chatbot Conversation:** No multi-turn conversational flows or LLM-based command parsing.
*   **WhatsApp DB Mutations:** The WhatsApp integration is a logging stub only.

---

### 1.4.3 **Assumptions & Dependencies**

> **RLS Status — v1.0**
> 
> RLS is **not enabled** in v1.0. Data isolation relies on application-level partitioning by `identifier_norm`.  
> The schema and queries are **RLS-ready** and can be enabled post-v1.0 without UI refactors.  
> There is **no JWT/SSO** in v1.0; users provide an Identifier (email or name) and lock it.

*   **Identifier Validation:** Validation is enforced at the API boundary (whitelist regex). The DB performs normalization but does not hard-reject characters in v1.0.

---

## 1.5 FAQ (Evaluator-Focused)

**Q1. Why no authentication?**
Because the assessment explicitly requests **no auth**. We gate usage by an **Identifier lock** and partition data in Supabase.

**Q2. How do you prevent accidental cross-data access?**
By scoping every query with `identifier_norm` and never exposing service-role keys to the browser. For production-grade isolation, we would enable RLS.

**Q3. How is Undo implemented?**
Undo is client-driven. The server performs a hard delete immediately. The client shows a 5s toast, and clicking "Undo" triggers a re-creation of the task with the cached content.

**Q4. Does the Chat page use an LLM?**
No. For v1.0, the chat is deterministic and parses only three specific commands: `list`, `add`, and `done`.

---

*(End of PRD)*