# Software Requirements Specification (SRS) – SLS To-Do App

**Version:** 1.1 (Normalized)

## 1. Introduction

**Document Purpose**: This document is a Software Requirements Specification (SRS) for the development of a task management application (To-Do App) with planned integrations for AI and a chatbot. The SRS describes in detail what the software must do and how it should behave, serving as a technical guide and reference throughout the entire development cycle.

**Product Scope**: The project consists of a personal task management application where data is partitioned by a user-provided **Identifier** (e.g., email or name), not traditional authentication. It allows users to create, organize, and complete tasks through a web interface. The architecture is designed from day one to support a minimal deterministic Chat UI and a stubbed WhatsApp integration. It also includes an asynchronous AI service for task enrichment. The application uses Supabase as a cloud database (PostgreSQL) and is deployed on Vercel.

**Standards and Best Practices**: The structure and content of this SRS follow standard software engineering guidelines (based on IEEE 830-1998 and ISO/IEC/IEEE 29148-2011). This SRS is a living document; each requirement is tagged to maintain its traceability.

## 2. Use Scenarios

**Scenario 1: Task Management via Web Interface**. A user accesses the web application, enters an Identifier (e.g., their email), and clicks "Lock". From the main panel, they create a new task with a title, description, and priority. The system saves the task, scoped to their identifier, and displays it in the active tasks list. Later, the user marks the task as completed; the system updates its status and moves it to the completed tasks section. The user can delete a task and has 5 seconds to undo the action. (Related requirements: FR-1, FR-2, FR-3, FR-4, FR-6, FR-10)

**Scenario 2: Chat Interaction (Minimal UI)**. A user navigates to the `/chat` page. Using the same locked Identifier, they type `add Pay internet bill |priority=P0` into the chat input. The system's deterministic parser recognizes the command and creates the task. The user then types `list` to see their tasks. (Related requirements: FR-1, FR-8)

**Scenario 3: Asynchronous AI Enrichment**. After a user creates a task with the title "Plan Q4 marketing campaign", the system sends a webhook to an n8n workflow. The workflow calls an LLM, which generates a helpful description and a list of suggested steps. The n8n workflow then calls a callback API (`/api/webhooks/enhance`) to update the task with this new information. The user sees the enriched data appear in the UI after a short delay. (Related requirements: FR-7)

**Scenario 4: WhatsApp Stub Interaction**. A user sends a WhatsApp message `"#to-do-list add Buy milk"` to the service number. The backend receives the webhook, verifies it contains the required hashtag, normalizes the command, and logs it (e.g., `{command:"add", args:{title:"Buy milk"}}`). For v1.0, no database action is taken and no reply is sent. (Related requirements: FR-9)

---

## 3. Requirements Catalog (Canonical)

This section provides the canonical list of requirements for v1.0. All other documents must align with these IDs and definitions.

### 3.1 Functional Requirements (v1.0)

| ID | Name | Description |
| :-- | :--- | :--- |
| **FR-1** | Core To-Do CRUD | Create, list, edit, delete, and toggle completion for tasks, always scoped by `identifier_norm`. |
| **FR-2** | List UX | Separate lists for Active vs. Completed tasks. Completed is collapsed by default. Task counters must be accurate and persist on refresh. |
| **FR-3** | Identifier Lock | The UI must prevent task creation until a user-provided Identifier is "locked". The lock/unlock flow must be clear. |
| **FR-4** | Metadata & Priority | Support for task priority (P0-P3, default P2), a `project` field, and `tags`. Includes UI for changing priority and server-side validation. |
| **FR-5** | Ops & Health | A `/api/health` endpoint must return `200 OK` with app version and timestamp. Errors must include a `request_id` and be logged. |
| **FR-6** | Shortcuts & A11y | Keyboard shortcuts for key actions (Edit, Priority, Delete, Select All, Undo, Escape). Basic accessibility with visible focus and logical tab order. |
| **FR-7** | Title Enrichment | Asynchronous, idempotent enrichment via n8n and an LLM. The flow updates `enhanced_description` and `steps` for a task. |
| **FR-8** | Minimal Chat UI | A chat interface that supports deterministic commands: `list`, `add`, `done`. It operates on the same database and does not use an LLM for parsing. |
| **FR-9** | WhatsApp Stub | A webhook that listens for messages containing `#to-do-list`, normalizes the command (`list`, `add`, `done`), and logs it. It does not write to the DB. |
| **FR-10**| Undo Delete (Client) | A 5-second window after deleting a task to "Undo". This action re-creates the task on the client, which may result in a new ID. |

### 3.2 Non-Functional Requirements (v1.0)

| ID | Name | Description |
| :-- | :--- | :--- |
| **NFR-1**| Performance Budgets | TTFB ≤ 600ms; DB list query (p50) ≤ 150ms; API mutations (p50) ≤ 500ms. |
| **NFR-2**| Security Baseline | All mutations must cross a server boundary. No `service-role` key on the client. CSP/CORS headers configured. Render user content as plain text. |
| **NFR-3**| Observability | All server operations that mutate data must be logged with a `request_id`. Logs must not contain PII. Log body sizes for performance monitoring. |
| **NFR-4**| Usability/A11y | The UI must be clear and intuitive. Keyboard shortcuts must be available (FR-6). Focus states must be visible. Priority levels (P0-P3) must be clearly indicated. |

---

## 4. System Interfaces

*   **Web UI**: A responsive web interface built with Next.js for all core user interactions.
*   **Chat UI**: A simple web-based chat interface for deterministic commands.
*   **API**: A set of HTTP endpoints for Server Actions and integrations (see `API-SPEC.md`).
*   **n8n Webhook**: An endpoint for receiving task enrichment data from the n8n workflow.
*   **WhatsApp Webhook**: An endpoint for receiving messages from a WhatsApp provider (stub only).

## 5. Technical Constraints

*   **Technology Stack**: Next.js/React on Vercel, Supabase (PostgreSQL), n8n for orchestration.
*   **Identifier Validation**: Identifier validation is enforced at the API boundary (whitelist regex). The DB performs normalization but does not hard-reject characters in v1.0.

> **RLS Status — v1.0**
> 
> RLS is **not enabled** in v1.0. Data isolation relies on application-level partitioning by `identifier_norm`.  
> The schema and queries are **RLS-ready** and can be enabled post-v1.0 without UI refactors.  
> There is **no JWT/SSO** in v1.0; users provide an Identifier (email or name) and lock it.

*   **External Services**: The system design must account for the limits and potential latency of external services like Supabase and the LLM provider.

---

## 6. Requirements Traceability

| Requirement | Use Scenarios | Test Case(s) |
| :--- | :--- | :--- |
| **FR-1** (CRUD) | 1, 2 | TC-010+, TC-102 |
| **FR-2** (List UX) | 1 | TC-030+ |
| **FR-3** (Identifier Lock) | 1 | TC-001+ |
| **FR-4** (Metadata) | 1 | TC-050+ |
| **FR-5** (Ops & Health) | 1, 2, 3, 4 | TC-160+ |
| **FR-6** (Shortcuts/A11y) | 1 | TC-060+, TC-150 |
| **FR-7** (Enrichment) | 3 | TC-120+ |
| **FR-8** (Chat UI) | 2 | TC-100+ |
| **FR-9** (WA Stub) | 4 | TC-130+ |
| **FR-10** (Undo) | 1 | TC-040, TC-066 |
| **NFR-1** (Performance) | 1, 2 | TC-180+ |
| **NFR-2** (Security) | 1, 2, 3, 4 | TC-090 |
| **NFR-3** (Observability) | 1, 2, 3, 4 | TC-164 |
| **NFR-4** (Usability/A11y) | 1, 2 | TC-148, TC-150 |

---

*This SRS document is subject to controlled updates. Requirements not listed in the canonical catalog are considered out of scope for v1.0.*
