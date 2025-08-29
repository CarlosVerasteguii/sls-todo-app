# SLS To-Do — Test Plan

**Version:** 1.1 (Normalized)  
**Status:** Approved for implementation  
**Owners:** QA Lead (shared), Tech Lead (Carlos)

**Purpose:** Define strategy, scope, environments, test data, and concrete cases to validate SLS To-Do v1.0 against PRD, SRS, and Architecture. This plan is the single source of truth for verification and acceptance.

---

## 1) Scope

### In scope (v1.0)

* **Identifier lock & partitioned persistence.** (FR-3)
* **To-Do CRUD** (title/description/priority/project/tags). (FR-1, FR-4)
* **Completed section & counters.** (FR-2)
* **Keyboard shortcuts & selection model.** (FR-6)
* **Server boundary** (mutations via Server Actions/API routes). (FR-5, NFR-2)
* **Minimal Chat UI** deterministic commands (list|add|done). (FR-8)
* **Title Enrichment** via n8n webhook (`/api/webhooks/enhance`). (FR-7)
* **WhatsApp webhook stub** (`/api/whatsapp`) — Scope: stub normalization only. No DB writes, no responses to the sender. (FR-9)
* **Undo Delete (client-side)** with 5s toast. (FR-10)
* **Observability** (request_id), health check. (FR-5, NFR-3)
* **Performance budgets** (light-load) and basic a11y. (NFR-1, NFR-4)

### Out of scope (v1.0)

* Traditional auth/SSO, roles/permissions. [FUTURE]
* Real-time collaboration, advanced search/filters. [FUTURE]
* WhatsApp mutations to DB (stub only).
* Enterprise compliance (SOC2/GDPR program), deep a11y audits.

---

## 2) Test Approach

* **Functional**: Manual exploratory + scripted end-to-end test cases (UI & API).
* **Integration**: API-first testing of `/api/todos`, `/api/chat`, `/api/webhooks/enhance`, `/api/whatsapp`.
* **Non-Functional**: Performance smoke (budgets), resilience (negative paths), basic accessibility.
* **Traceability**: Each case maps to requirement IDs (FR-x / NFR-x).

### Performance Budgets (NFR-1)
- TTFB (cold) ≤ 600 ms (Vercel edge + minimal SSR)
- List query DB time ≤ 150 ms p50
- Mutations (create/edit/delete/toggle) ≤ 500 ms p50

### Defect severity:

* **S1 Blocker**: Breaks acceptance criteria or data integrity (no workaround).
* **S2 Major**: Core feature impaired (workaround exists).
* **S3 Minor**: Cosmetic/UX polish.
* **S4 Trivial**: Typos, non-blocking.

---

## 3) Test Environments

* **Prod/Test URL**: Vercel app (to be provided).
* **DB**: Supabase project (clean seed before each full run).
* **Browsers**: Latest Chrome, Edge, Firefox, Safari (desktop); mobile Safari/Chrome smoke.

---

## 4) Test Data

### Identifiers

* **A**: `john@example.com` → normalized `john@example.com`
* **B**: `Team Alpha` → normalized `team alpha`

### Tasks seed (optional):

* **Priorities**: Enum `P0 | P1 | P2 | P3` (default `P2`) — visible in UI and persisted.
* **A1**: "Write PRD" (P1, project=Docs, tags=docs,prd, completed=false)
* **A2**: "Buy milk" (P2, tags=grocery,dairy, completed=false)
* **B1**: none (empty set for B initially)

---

## 5) Entry / Exit Criteria

### Entry

* Deploy available; `/api/health` returns 200.
* DB schema applied; indexes created.

### Exit

* All S1/S2 defects fixed or accepted with mitigation.
* Acceptance checklist (§9) all pass.
* Performance budgets (NFR-1) within targets under light load.

---

## 6) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Identifier collisions/guessing | Cross-view of datasets | Documented demo model; verify strict scoping in every query; future RLS plan |
| n8n/LLM down | No enrichment | Verify non-blocking (FR-7); log-only failure (NFR-3) |
| Provider payload drift | WhatsApp stub breaks | Keep normalization liberal; unit tests with multiple payload shapes (FR-9) |

---

## 7) Test Matrix (Traceability Snapshot)

| Area | Req IDs | Primary Cases |
|------|---------|---------------|
| Identifier lock | FR-3 | TC-001..TC-006 |
| Create/Edit/Delete | FR-1 | TC-010..TC-019 |
| Toggle & Completed | FR-1, FR-2 | TC-030..TC-035 |
| Priority/Project/Tags | FR-4 | TC-050..TC-054 |
| Shortcuts/Selection/Undo | FR-6, FR-10 | TC-060..TC-068 |
| Persistence across refresh/switch | FR-2, FR-3, FR-5 | TC-080..TC-084 |
| Server boundary | NFR-2 | TC-090..TC-092 |
| Chat adapter | FR-8 | TC-100..TC-106 |
| Enrichment webhook | FR-7 | TC-120..TC-124 |
| WhatsApp stub | FR-9 | TC-130..TC-134 |
| UX/Toasts/a11y | FR-6, NFR-4 | TC-140..TC-150 |
| Health/Logging | FR-5, NFR-3 | TC-160..TC-164 |
| Performance | NFR-1 | TC-180..TC-184 |
| Security/Hygiene | NFR-2 | TC-090, TC-190+ |

---

## 8) Detailed Test Cases

Refer to `docs/TEST-CASES.md` for full details. This section is a high-level summary.

---

## 9) Acceptance Checklist (Runbook)

- [ ] **FR-3:** Cannot create tasks until Identifier is locked.
- [ ] **FR-1, FR-4:** CRUD works via UI; validation enforced.
- [ ] **FR-2:** Completed section/counters behave and persist.
- [ ] **FR-6:** Shortcuts & selection model function as specified.
- [ ] **FR-10:** Delete shows Undo (5s) and restores/finalizes correctly.
- [ ] **FR-3, FR-5:** Partitioning by Identifier verified across refresh/switch.
- [ ] **NFR-2:** Mutations cross server boundary only; no service-role in client.
- [ ] **FR-8:** Chat commands list/add/done operate on the same DB.
- [ ] **FR-7:** Enrichment webhook accepts idempotent PATCH; UI shows fields if present.
- [ ] **FR-9:** WhatsApp webhook normalizes hashtag commands; no DB writes.
- [ ] **FR-5, NFR-3:** Health check returns 200; request_id included in error envelopes.
- [ ] **NFR-1:** Performance budgets met (warm paths, light load).
- [ ] **NFR-4:** Basic a11y & feedback UX pass.

---

*End of Test Plan.*
