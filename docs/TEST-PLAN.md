# SLS To-Do — Test Plan

**Version:** 1.0  
**Status:** Approved for implementation  
**Owners:** QA Lead (shared), Tech Lead (Carlos)

**Purpose:** Define strategy, scope, environments, test data, and concrete cases to validate SLS To-Do v1.0 against PRD (§1.3/1.4), SRS, and Architecture. This plan is the single source of truth for verification and acceptance.

---

## 1) Scope

### In scope (v1.0)

* **Identifier lock & partitioned persistence.**
* **To-Do CRUD** (title/description/priority/project/tags).
* **Completed section & counters.**
* **Keyboard shortcuts & selection model.**
* **Server boundary** (mutations via Server Actions/API routes).
* **Chat page + `/api/chat`** minimal commands (same DB).
* **n8n enrichment readiness** (`/api/webhooks/enhance`) — idempotent PATCH of enrichment fields.
* **WhatsApp webhook stub** (`/api/whatsapp`) — hashtag normalization, no DB mutation.
* **Observability** (request_id), health check.
* **Performance budgets** (light-load) and basic a11y.

### Out of scope (v1.0)

* Traditional auth/SSO, roles/permissions.
* Real-time collaboration, advanced search/filters.
* WhatsApp mutations to DB (stub only).
* Enterprise compliance (SOC2/GDPR program), deep a11y audits.

---

## 2) Test Approach

* **Functional**: Manual exploratory + scripted end-to-end test cases (UI & API).
* **Integration**: API-first testing of `/api/todos`, `/api/chat`, `/api/webhooks/enhance`, `/api/whatsapp`.
* **Non-Functional**: Performance smoke (budgets), resilience (negative paths), basic accessibility.
* **Traceability**: Each case maps to requirement IDs (FR-xx / NFR-xx).

### Defect severity:

* **S1 Blocker**: Breaks acceptance criteria or data integrity (no workaround).
* **S2 Major**: Core feature impaired (workaround exists).
* **S3 Minor**: Cosmetic/UX polish.
* **S4 Trivial**: Typos, non-blocking.

---

## 3) Test Environments

* **Prod/Test URL**: Vercel app (to be provided).
* **DB**: Supabase project (clean seed before each full run).
* **Regions**: App and DB co-located.
* **Browsers**: Latest Chrome, Edge, Firefox, Safari (desktop); mobile Safari/Chrome smoke.
* **Feature flags**: `FEATURE_CHAT=true`, `FEATURE_ENHANCE=true` (with mock URL allowed), `FEATURE_WHATSAPP_STUB=true`.

### Env variables present (`.env.example`):

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` (server only), `N8N_ENHANCE_WEBHOOK_URL` (may point to mock), `WHATSAPP_WEBHOOK_SECRET` (optional).

---

## 4) Test Data

### Identifiers

* **A**: `john@example.com` → normalized `john@example.com`
* **B**: `Team Alpha` → normalized `team alpha` (lowercased, single-spaced)
* **Invalid samples**: `bad|user`, `foo<>bar`, `spaced name`

### Tasks seed (optional):

* **A1**: "Write PRD" (P1, project=Docs, tags=docs,prd, completed=false)
* **A2**: "Buy milk" (P2, tags=grocery,dairy, completed=false)
* **B1**: none (empty set for B initially)

---

## 5) Entry / Exit Criteria

### Entry

* Deploy available; `/api/health` returns 200.
* DB schema applied; indexes created.
* Feature flags configured as per scope.

### Exit

* All S1/S2 defects fixed or accepted with mitigation.
* Acceptance checklist (§9) all pass.
* Performance budgets (NFR-01..03) within targets under light load.

---

## 6) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Identifier collisions/guessing | Cross-view of datasets | Documented demo model; verify strict scoping in every query; future RLS plan |
| n8n/LLM down | No enrichment | Verify non-blocking; log-only failure |
| Provider payload drift | WhatsApp stub breaks | Keep normalization liberal; unit tests with multiple payload shapes |

---

## 7) Test Matrix (Traceability Snapshot)

| Area | Req IDs | Primary Cases |
|------|---------|---------------|
| Identifier lock | FR-01 | TC-001..TC-006 |
| Create/Edit/Delete | FR-02/03/05 | TC-010..TC-029 |
| Toggle & Completed | FR-04/08/09 | TC-030..TC-039 |
| Priority/Project/Tags | FR-06/07 | TC-040..TC-055 |
| Shortcuts/Selection/Undo | FR-08/11/05 | TC-060..TC-079 |
| Persistence across refresh/switch | FR-09 | TC-080..TC-085 |
| Server boundary | FR-12 | TC-090..TC-094 |
| Chat adapter | FR-13 | TC-100..TC-112 |
| Enrichment webhook | FR-14 | TC-120..TC-129 |
| WhatsApp stub | FR-15 | TC-130..TC-138 |
| UX/Toasts/a11y | FR-16/17/18, NFR-16 | TC-140..TC-159 |
| Health/Logging | FR-19/20, NFR-12/13 | TC-160..TC-169 |
| Performance | NFR-01..03 | TC-180..TC-189 |
| Security/Hygiene | NFR-07..10, FR-21/22 | TC-190..TC-199 |

---

## 8) Detailed Test Cases

Use the following format per case: `[ID] Title — Pre / Steps / Expected / Reqs.`

### Identifier & Lock

**TC-001 Lock blocks creation until set**

*Pre*: Fresh load, no Identifier locked.
*Steps*: Click "Add new task…".
*Expected*: Inline error: "Lock your Identifier first"; button disabled; no DB write.
*Reqs*: FR-01, FR-02.

**TC-002 Valid lock with email**

*Pre*: —
*Steps*: Enter `john@example.com` → click Lock.
*Expected*: Field disabled; lock icon active; "Add task" enabled; internal `identifier_norm='john@example.com'`.
*Reqs*: FR-01.

**TC-003 Invalid Identifier characters rejected**

*Steps*: Enter `bad|user` → Lock.
*Expected*: Inline validation error; cannot lock.
*Reqs*: FR-01.

**TC-004 Normalize spaces + lowercase**

*Steps*: Enter `Team Alpha` → Lock.
*Expected*: Accepted; partition key becomes `team alpha`; display keeps raw; creation enabled.
*Reqs*: FR-01.

**TC-006 Unlock disables composer**

*Steps*: Lock, then Unlock.
*Expected*: Composer disabled; cannot add.
*Reqs*: FR-01.

### Create / Edit / Validation

**TC-010 Create minimal task**

*Pre*: Identifier A locked.
*Steps*: Title: "Write PRD" → Enter.
*Expected*: Task appears at top; default P2, completed=false; persisted.
*Reqs*: FR-02, FR-10.

**TC-012 Title is required**

*Steps*: Open composer; leave Title empty; submit.
*Expected*: Inline error; no request.
*Reqs*: FR-02.

**TC-014 Field limits enforced**

*Steps*: Title >200 chars / Desc >2000 / Tag >24 chars / >20 tags.
*Expected*: Server validation error (400) surfaced as toast; no persist.
*Reqs*: FR-02, NFR-10.

**TC-018 Edit inline & save**

*Steps*: Select task, press E, change Title, press Enter.
*Expected*: Updated in UI; updated_at changed; persists after refresh.
*Reqs*: FR-03, FR-10.

**TC-019 Edit cancel with Esc**

*Steps*: Start edit; press Esc.
*Expected*: Reverts to last persisted.
*Reqs*: FR-03.

### Toggle / Completed / Counters

**TC-030 Toggle to completed**

*Steps*: Click checkbox.
*Expected*: Moves to "Completed Tasks (N)"; counters update immediately.
*Reqs*: FR-04, FR-08.

**TC-032 Completed collapse default**

*Pre*: ≥1 completed.
*Steps*: Load page.
*Expected*: Completed section collapsed by default; shows count.
*Reqs*: FR-09.

**TC-035 Counters survive refresh**

*Steps*: Complete 2 tasks; refresh.
*Expected*: Counters and lists consistent.
*Reqs*: FR-08, FR-10.

### Delete & Undo

**TC-040 Delete single with Undo**

*Steps*: Select task → DEL → click Undo within 5s.
*Expected*: Task restored client+server.
*Reqs*: FR-05.

**TC-042 Delete finalize after window**

*Steps*: Delete; wait >5s; refresh.
*Expected*: Task permanently gone.
*Reqs*: FR-05, FR-10.

**TC-044 Server delete failure rollback**

*Pre*: Simulate server error.
*Steps*: Delete.
*Expected*: Error toast; UI restores task.
*Reqs*: FR-05, FR-14.

### Priority / Project / Tags

**TC-050 Change priority via menu**

*Steps*: Focus task → press P → choose P0.
*Expected*: Visual indicator updates; persists after refresh.
*Reqs*: FR-06, FR-10.

**TC-052 Bulk priority change**

*Steps*: CTRL+A → P → P1.
*Expected*: All selected updated.
*Reqs*: FR-06, FR-08.

**TC-054 Tags parsing & dedupe**

*Steps*: Enter tags `Docs, docs , PRD,prd`.
*Expected*: Stored as `["docs","prd"]`.
*Reqs*: FR-07.

### Keyboard / Selection / Undo

**TC-060 Selection model (click, CTRL+A, ESC)**

*Expected*: Visual selection; select all; clear selection works.
*Reqs*: FR-10, FR-11.

**TC-062 E edit shortcut**

*Expected*: Opens inline editor on focused/first selected.
*Reqs*: FR-11.

**TC-064 P priority shortcut**

*Expected*: Opens menu; applies to selected.
*Reqs*: FR-11.

**TC-066 DEL delete shortcut + Undo**

*Expected*: Toast with 5s Undo; restore works.
*Reqs*: FR-05, FR-11.

**TC-068 CTRL+Z undo last action (single-level)**

*Steps*: Complete a task → CTRL+Z.
*Expected*: Reverts completion.
*Reqs*: FR-11.

### Persistence & Partitioning

**TC-080 Refresh keeps dataset**

*Steps*: Create 3 tasks; refresh.
*Expected*: Same 3 tasks for same Identifier.
*Reqs*: FR-09, FR-10.

**TC-082 Switch Identifier → different dataset**

*Steps*: Unlock → enter B → Lock.
*Expected*: Empty list (or B's data).
*Reqs*: FR-01, FR-09.

**TC-084 Switch back to A**

*Expected*: A's tasks reappear.
*Reqs*: FR-09.

### Server Boundary & Hygiene

**TC-090 Client cannot write with service role**

*Method*: Code/Bundle inspection + network: ensure no service-role keys shipped.
*Expected*: Mutations only via server.
*Reqs*: FR-12, NFR-08.

**TC-092 Disable server temporarily → friendly errors**

*Steps*: Simulate API failure.
*Expected*: Toast shows user-friendly error; no silent failure.
*Reqs*: FR-12, FR-16.

### Chat Adapter

**TC-100 list returns current todos**

*Steps*: POST `/api/chat` with identifier A & message `list`.
*Expected*: Text reply summarizing tasks; reflects DB state.
*Reqs*: FR-13.

**TC-102 add creates task**

*Steps*: `add Buy milk |priority=P1 |project=Home |tags=grocery,dairy`.
*Expected*: Task created; visible in UI.
*Reqs*: FR-13, FR-02.

**TC-104 done <id> completes task**

*Expected*: Task completed; visible as such in UI.
*Reqs*: FR-13, FR-04.

**TC-106 Bad command → guidance**

*Steps*: `adde something`.
*Expected*: 400 with human-readable help.
*Reqs*: FR-13, FR-16.

### Enrichment Webhook (n8n)

**TC-120 Idempotent enrichment PATCH**

*Steps*: Create task; call `/api/webhooks/enhance` with `enhanced_description` & `steps`; call again with different text.
*Expected*: Fields overwritten; other fields untouched.
*Reqs*: FR-14.

**TC-122 Missing todo → 404**

*Steps*: Call with nonexistent `todo_id`.
*Expected*: 404 Not Found.
*Reqs*: FR-14.

**TC-124 n8n down → create still succeeds**

*Steps*: Break `N8N_ENHANCE_WEBHOOK_URL`; create task.
*Expected*: Task persisted; non-blocking log of failure.
*Reqs*: FR-14.

### WhatsApp Webhook Stub

**TC-130 Normalize #to-do-list add ...**

*Steps*: POST provider-like payload with text `#to-do-list add Buy milk`.
*Expected*: 200 OK; server logs normalized `{command:"add", args:{title:"Buy milk"}}`; no DB write.
*Reqs*: FR-15.

**TC-132 Missing hashtag ignored**

*Steps*: Text `add Buy milk` (no hashtag).
*Expected*: 200 OK; ignored or logged as non-actionable.
*Reqs*: FR-15.

**TC-134 done <id> normalization**

*Expected*: `{command:"done", args:{taskId:"..."}}` in logs.
*Reqs*: FR-15.

### UX / Feedback / Accessibility

**TC-140 Inline validation messages**

*Steps*: Empty title submit.
*Expected*: Clear inline error; no request sent.
*Reqs*: FR-16.

**TC-144 Error toast on failed mutation**

*Steps*: Force server error.
*Expected*: Toast with guidance; UI reconciles.
*Reqs*: FR-16.

**TC-148 Keyboard Shortcuts box present & accurate**

*Expected*: Lists E, P, DEL, CTRL+A, CTRL+Z, ESC.
*Reqs*: FR-17.

**TC-150 Focus visible & tab order logical**

*Expected*: Keyboard-only usage works; screen reader announces controls meaningfully.
*Reqs*: FR-18, NFR-16.

### Health / Logging

**TC-160 `/api/health` returns 200 + version**

*Expected*: `{ ok: true, version, ts }`.
*Reqs*: FR-19, NFR-13.

**TC-164 request_id present in errors**

*Steps*: Trigger 400/500.
*Expected*: Error envelope includes `request_id`; logs correlate.
*Reqs*: FR-20, NFR-12.

### Performance (Light Load)

**TC-180 TTFB ≤ 600 ms (warm)**

*Method*: Browser devtools / Vercel logs.
*Expected*: Median ≤ 600 ms.
*Reqs*: NFR-01.

**TC-182 List ≤ 150 ms DB time (≤50 items)**

*Method*: Server timing logs around DB query.
*Expected*: Average ≤ 150 ms.
*Reqs*: NFR-01.

**TC-184 Mutation ≤ 500 ms median**

*Method*: Log round-trip; create/edit/toggle.
*Expected*: Median ≤ 500 ms, p95 ≤ 1000 ms.
*Reqs*: NFR-01.

---

## 9) Acceptance Checklist (Runbook)

- [ ] Cannot create tasks until Identifier is locked. (TC-001..004)
- [ ] CRUD works via UI; validation enforced. (TC-010..019, 014)
- [ ] Completed section/counters behave and persist. (TC-030..035)
- [ ] Shortcuts & selection model function as specified. (TC-060..068)
- [ ] Delete shows Undo (5s) and restores/finalizes correctly. (TC-040..044)
- [ ] Partitioning by Identifier verified across refresh/switch. (TC-080..084)
- [ ] Mutations cross server boundary only; no service-role in client. (TC-090..092)
- [ ] Chat commands list/add/done operate on the same DB. (TC-100..106)
- [ ] Enrichment webhook accepts idempotent PATCH; UI shows fields if present. (TC-120..124)
- [ ] WhatsApp webhook normalizes hashtag commands; no DB writes. (TC-130..134)
- [ ] Health check returns 200; request_id included in error envelopes. (TC-160..164)
- [ ] Performance budgets met (warm paths, light load). (TC-180..184)
- [ ] Basic a11y & feedback UX pass. (TC-140..150)

---

## 10) Test Execution & Reporting

* **Issue tracking**: GitHub Issues with labels `bug`, severity `S1..S4`, component tags (`ui`, `api`, `db`, `chat`, `webhook`).
* **Reporting cadence**: Daily summary during test window; final test report with pass/fail per case and defect summary.
* **Retest/Regression**: Any S1/S2 fix requires targeted regression on affected area + smoke of related flows.

---

## 11) Appendices

### A) Sample cURL (API sanity)

```bash
# Create
curl -s -X POST https://<app>/api/todos \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","title":"Buy milk","priority":"P1"}'

# List
curl -s "https://<app>/api/todos?identifier=john@example.com&status=active"

# Chat
curl -s -X POST https://<app>/api/chat \
 -H 'Content-Type: application/json' \
 -d '{"identifier":"john@example.com","message":"list"}'

# Enrichment
curl -s -X POST https://<app>/api/webhooks/enhance \
 -H 'Content-Type: application/json' \
 -d '{"todo_id":"<uuid>","identifier":"john@example.com","title":"Buy milk","enhanced_description":"...", "steps":["one","two"]}'
```

### B) k6 skeleton (performance smoke)

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 5, duration: '2m' };

export default function () {
  const id = 'john@example.com';
  const res = http.get(`https://<app>/api/todos?identifier=${encodeURIComponent(id)}&status=active&limit=25`);
  check(res, { '200 OK': (r) => r.status === 200 });
  sleep(1);

  const create = http.post('https://<app>/api/todos', JSON.stringify({identifier: id, title: `Task ${Date.now()}`}), { headers: { 'Content-Type': 'application/json' }});
  check(create, { '201 Created': (r) => r.status === 201 });
  sleep(1);
}
```

---

## File map

```
/docs
  TEST-PLAN.md   <-- (this file)
  TEST-CASES.md  <-- (optional expanded steps & data tables)
```

> **Any change to PRD/SRS/Architecture requires updating affected test cases here to maintain traceability and acceptance confidence.**
