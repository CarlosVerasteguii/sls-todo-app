# SLS To-Do — Detailed Test Cases

**Version:** 1.0
**Status:** Ready for execution
**Traceability:** Each case maps to PRD §1.5 (FR-xx) / §1.6 (NFR-xx) and to the Test Plan matrix.
**Environment:** See `docs/TEST-PLAN.md` §3 and §4 (URLs, env vars, seed data, browsers).

---

## Conventions

* **Identifier A:** `john@example.com` → normalized `john@example.com`
* **Identifier B:** `Team   Alpha` → normalized `team alpha`
* **Invalid Identifiers:** `bad|user`, `foo<>bar`
* **Keyboard notation:** `CTRL+A`, `DEL`, `CTRL+Z`, `ESC`
* **Pass criteria:** All *Expected Results* observed with no regressions or console errors (unless specified).
* **Data hygiene:** Refresh DB or use fresh Identifiers per suite to avoid cross-test coupling.

---

## 1) Identifier & Lock

### **TC-001 — Lock blocks creation until set**

* **Pre:** App loaded fresh; no Identifier locked.
* **Steps:**

  1. Click "Add new task…" composer.
* **Expected:**

  * Composer remains **disabled**; inline hint/toast indicates Identifier must be locked first.
  * No network call is fired.
* **Reqs:** FR-01, FR-02

---

### **TC-002 — Valid lock with email**

* **Pre:** Fresh page.
* **Steps:**

  1. Enter `john@example.com`.
  2. Click **Lock**.
* **Expected:**

  * Input becomes **disabled** with a "locked" visual state.
  * Composer becomes **enabled**.
  * Internal partition key equals `john@example.com`.
* **Reqs:** FR-01

---

### **TC-003 — Invalid Identifier characters rejected**

* **Pre:** Fresh page.
* **Steps:**

  1. Enter `bad|user`.
  2. Click **Lock**.
* **Expected:**

  * Inline validation message explaining allowed chars.
  * Field not locked; composer still disabled.
* **Reqs:** FR-01

---

### **TC-004 — Normalize spaces + lowercase**

* **Pre:** Fresh page.
* **Steps:**

  1. Enter `  Team   Alpha  `.
  2. Click **Lock**.
* **Expected:**

  * Accepted; display shows raw value; partition key = `team alpha`.
  * Composer enabled.
* **Reqs:** FR-01

---

### **TC-006 — Unlock disables composer**

* **Pre:** TC-002 completed (Identifier locked).
* **Steps:**

  1. Click **Unlock**.
* **Expected:**

  * Identifier input re-enabled; composer disabled; cannot add tasks.
* **Reqs:** FR-01

---

## 2) Create / Edit / Validation

### **TC-010 — Create minimal task**

* **Pre:** Identifier A locked.
* **Steps:**

  1. In composer, set **Title** = `Write PRD`.
  2. Press **Enter** (or click **Add Task**).
* **Expected:**

  * Task appears at top of **Active** list.
  * Defaults: `priority=P2`, `completed=false`, tags = `[]`, timestamps set.
  * Persists after refresh.
* **Reqs:** FR-02, FR-10

---

### **TC-012 — Title is required**

* **Pre:** Identifier A locked.
* **Steps:**

  1. Open composer; leave **Title** empty.
  2. Submit.
* **Expected:**

  * Inline error; no request sent; nothing added to list.
* **Reqs:** FR-02

---

### **TC-014 — Field limits enforced**

* **Pre:** Identifier A locked.
* **Data:** Title >200 chars, Description >2000, Tag >24 chars, >20 tags list.
* **Steps:**

  1. Attempt create with each invalid input scenario.
* **Expected:**

  * `400` validation error surfaced as **toast**; no persistence.
* **Reqs:** FR-02, NFR-10

---

### **TC-018 — Edit inline & save**

* **Pre:** Have a task "Write PRD".
* **Steps:**

  1. Select the task; press **E**.
  2. Change Title to `Write complete PRD`.
  3. Press **Enter**.
* **Expected:**

  * UI updates; server persists; `updated_at` changes; persists after refresh.
* **Reqs:** FR-03, FR-10, FR-11

---

### **TC-019 — Edit cancel with Esc**

* **Pre:** Task present.
* **Steps:**

  1. Press **E**, change Title.
  2. Press **ESC**.
* **Expected:**

  * Edit cancelled; original Title restored.
* **Reqs:** FR-03, FR-11

---

## 3) Toggle / Completed / Counters

### **TC-030 — Toggle to completed**

* **Pre:** At least one Active task.
* **Steps:**

  1. Click the **checkbox** to complete.
* **Expected:**

  * Task moves to **Completed Tasks (N)**; counters update immediately.
  * State persists after refresh.
* **Reqs:** FR-04, FR-08, FR-10

---

### **TC-032 — Completed collapse default**

* **Pre:** There is at least one completed task.
* **Steps:**

  1. Reload page.
* **Expected:**

  * Completed section is **collapsed** by default; shows accurate **(N)** count.
* **Reqs:** FR-09

---

### **TC-035 — Counters survive refresh**

* **Pre:** Complete 2 tasks.
* **Steps:**

  1. Refresh page.
* **Expected:**

  * Active/Completed counts match persisted state; lists correct.
* **Reqs:** FR-08, FR-10

---

## 4) Delete & Undo

### **TC-040 — Delete single with Undo**

* **Pre:** At least one task.
* **Steps:**

  1. Select a task → press **DEL**.
  2. Click **Undo** within 5 seconds in the toast.
* **Expected:**

  * Task restored visually and in DB; no loss after refresh.
* **Reqs:** FR-05, FR-11, FR-16

---

### **TC-042 — Delete finalizes after window**

* **Pre:** Task present.
* **Steps:**

  1. Delete the task.
  2. Wait >5 seconds; refresh.
* **Expected:**

  * Task permanently removed; not visible.
* **Reqs:** FR-05, FR-10

---

### **TC-044 — Server delete failure rollback**

* **Pre:** Simulate server error (e.g., block API).
* **Steps:**

  1. Attempt delete.
* **Expected:**

  * **Error toast** shown; UI reverts deletion; task remains.
* **Reqs:** FR-05, FR-14, FR-16

---

## 5) Priority / Project / Tags

### **TC-050 — Change priority via menu**

* **Pre:** Task present.
* **Steps:**

  1. Focus task → press **P** → select **P0**.
* **Expected:**

  * Priority cue updates; persisted after refresh.
* **Reqs:** FR-06, FR-11, FR-10

---

### **TC-052 — Bulk priority change**

* **Pre:** ≥2 tasks present.
* **Steps:**

  1. **CTRL+A** to select all (Active section).
  2. Press **P**, choose **P1**.
* **Expected:**

  * All selected tasks updated; persisted after refresh.
* **Reqs:** FR-06, FR-08, FR-11, FR-10

---

### **TC-054 — Tags parsing & dedupe**

* **Pre:** Task present.
* **Steps:**

  1. Edit tags input: `Docs,  docs , PRD,prd`.
  2. Save.
* **Expected:**

  * Stored as `["docs","prd"]` (trimmed, lowercased, deduped).
* **Reqs:** FR-07, NFR-10

---

## 6) Keyboard / Selection / Undo

### **TC-060 — Selection model (click, CTRL+A, ESC)**

* **Pre:** ≥3 tasks present.
* **Steps:**

  1. Click to select first task (visual selection).
  2. Press **CTRL+A** (select all in section).
  3. Press **ESC** (clear selection).
* **Expected:**

  * Visual selection toggles as expected; no side effects.
* **Reqs:** FR-10, FR-11

---

### **TC-062 — `E` edit shortcut**

* **Pre:** Task present.
* **Steps:**

  1. Focus task; press **E**.
* **Expected:**

  * Inline editor opens; Enter saves; Esc cancels.
* **Reqs:** FR-11, FR-03

---

### **TC-064 — `P` priority shortcut**

* **Pre:** Task present.
* **Steps:**

  1. Focus task; press **P**; choose a priority.
* **Expected:**

  * Applies to focused; with multiple selected, applies to all.
* **Reqs:** FR-11, FR-06

---

### **TC-066 — `DEL` delete + Undo**

* **Pre:** Task present.
* **Steps:**

  1. Press **DEL**; click **Undo** within 5s.
* **Expected:**

  * Undo restores task consistently.
* **Reqs:** FR-11, FR-05

---

### **TC-068 — `CTRL+Z` undo last action (single-level)**

* **Pre:** Task present; toggle complete.
* **Steps:**

  1. Press **CTRL+Z**.
* **Expected:**

  * Completion state reverts to previous.
* **Reqs:** FR-11

---

## 7) Persistence & Partitioning

### **TC-080 — Refresh keeps dataset**

* **Pre:** Identifier A locked; create 3 tasks.
* **Steps:**

  1. Refresh.
* **Expected:**

  * Same 3 tasks visible; order `created_at desc`.
* **Reqs:** FR-09, FR-10

---

### **TC-082 — Switch Identifier → different dataset**

* **Pre:** Identifier A has data; B has none.
* **Steps:**

  1. **Unlock**, enter `Team   Alpha`, **Lock**.
* **Expected:**

  * Normalized to `team alpha`; list empty (or B's data if seeded).
* **Reqs:** FR-01, FR-09

---

### **TC-084 — Switch back to A**

* **Pre:** From TC-082.
* **Steps:**

  1. Unlock; enter `john@example.com`; Lock.
* **Expected:**

  * A's tasks reappear exactly.
* **Reqs:** FR-09, FR-10

---

## 8) Server Boundary & Hygiene

### **TC-090 — Client cannot write with service-role**

* **Method:** Inspect built bundle/network; attempt client-side bypass.
* **Expected:**

  * No service-role key in client; writes only through server endpoints.
* **Reqs:** FR-12, NFR-08, FR-22

---

### **TC-092 — Disable server temporarily → friendly errors**

* **Pre:** Simulate API outage (mock 500).
* **Steps:**

  1. Attempt create/edit/delete.
* **Expected:**

  * Clear **error toast** with retry guidance; optimistic UI reconciles to server truth.
* **Reqs:** FR-12, FR-16

---

## 9) Chat Adapter

### **TC-100 — `list` returns current todos**

* **Pre:** Identifier A has tasks.
* **Steps (API or Chat page):**

  1. `POST /api/chat` with `{identifier:"john@example.com", message:"list"}`
* **Expected:**

  * `200 OK` with `reply` summarizing Active/Completed; reflects DB.
* **Reqs:** FR-13

---

### **TC-102 — `add` creates task**

* **Steps:**

  1. `POST /api/chat` with `message:"add Buy milk |priority=P1 |project=Home |tags=grocery,dairy"`.
* **Expected:**

  * Created task visible in main UI; reply confirms details.
* **Reqs:** FR-13, FR-02

---

### **TC-104 — `done <id>` completes task**

* **Pre:** Have target task id.
* **Steps:**

  1. `POST /api/chat` with `message:"done <uuid>"`
* **Expected:**

  * Task becomes completed; reply acknowledges.
* **Reqs:** FR-13, FR-04

---

### **TC-106 — Bad command → guidance**

* **Steps:**

  1. `POST /api/chat` with `message:"adde something"`
* **Expected:**

  * `400 BAD_REQUEST` with human-readable guidance on supported commands.
* **Reqs:** FR-13, FR-16

---

## 10) Enrichment Webhook (n8n)

### **TC-120 — Idempotent enrichment PATCH**

* **Pre:** Create a task; capture `id`.
* **Steps:**

  1. `POST /api/webhooks/enhance` with `enhanced_description` + `steps`.
  2. Repeat with different `enhanced_description`.
* **Expected:**

  * Only enrichment fields updated; other fields untouched; safe to call multiple times.
* **Reqs:** FR-14

---

### **TC-122 — Missing todo → 404**

* **Steps:**

  1. Call `/api/webhooks/enhance` with nonexistent `todo_id`.
* **Expected:**

  * `404 NOT_FOUND` error envelope.
* **Reqs:** FR-14

---

### **TC-124 — n8n down → create still succeeds**

* **Pre:** Break `N8N_ENHANCE_WEBHOOK_URL` (e.g., invalid host).
* **Steps:**

  1. Create a new task.
* **Expected:**

  * Task persists; enrichment call failure is logged; no UX break.
* **Reqs:** FR-14

---

## 11) WhatsApp Webhook Stub

### **TC-130 — Normalize `#to-do-list add ...`**

* **Steps:**

  1. `POST /api/whatsapp` with payload containing text `"#to-do-list add Buy milk"`.
* **Expected:**

  * `200 OK`; logs contain normalized `{command:"add", args:{title:"Buy milk"}, sender:"+52..."}`.
  * **No DB writes** performed.
* **Reqs:** FR-15

---

### **TC-132 — Missing hashtag ignored**

* **Steps:**

  1. `POST /api/whatsapp` with text `"add Buy milk"` (no hashtag).
* **Expected:**

  * `200 OK`; endpoint ignores or logs as non-actionable; no DB writes.
* **Reqs:** FR-15

---

### **TC-134 — `done <id>` normalization**

* **Steps:**

  1. `POST /api/whatsapp` with `"#to-do-list done <uuid>"`.
* **Expected:**

  * Normalized `{command:"done", args:{taskId:"<uuid>"}}` logged.
* **Reqs:** FR-15

---

## 12) UX / Feedback / Accessibility

### **TC-140 — Inline validation messages**

* **Steps:**

  1. Attempt to create a task with empty Title.
* **Expected:**

  * Clear inline message; no request fired.
* **Reqs:** FR-16

---

### **TC-144 — Error toast on failed mutation**

* **Pre:** Simulate server error.
* **Steps:**

  1. Try to edit or delete a task.
* **Expected:**

  * Visible toast with meaningful message; UI reconciles to server truth.
* **Reqs:** FR-16

---

### **TC-148 — Keyboard Shortcuts box present & accurate**

* **Steps:**

  1. Locate **Keyboard Shortcuts** help box.
* **Expected:**

  * Lists `E, P, DEL, CTRL+A, CTRL+Z, ESC` with correct descriptions.
* **Reqs:** FR-17

---

### **TC-150 — Focus visible & tab order logical**

* **Steps:**

  1. Navigate entire UI using **Tab**/**Shift+Tab** only.
  2. Use a screen reader (sanity pass).
* **Expected:**

  * Focus rings visible; controls reachable in logical order; checkboxes/buttons have accessible names/roles.
* **Reqs:** FR-18, NFR-16

---

## 13) Health / Logging

### **TC-160 — `/api/health` returns 200 + version**

* **Steps:**

  1. `GET /api/health`.
* **Expected:**

  * `200 { ok: true, version, ts }`.
* **Reqs:** FR-19, NFR-13

---

### **TC-164 — `request_id` present in errors**

* **Steps:**

  1. Trigger a `400` (e.g., empty title via `/api/todos`).
* **Expected:**

  * Error envelope includes `request_id`; server logs correlate.
* **Reqs:** FR-20, NFR-12

---

## 14) Performance (Light Load)

> Measure using devtools, server timing logs, or k6 skeleton in Test Plan Appendix B.

### **TC-180 — TTFB ≤ 600 ms (warm)**

* **Pre:** Warmed deployment.
* **Steps:**

  1. Load home page; capture **TTFB** (repeat 5 times).
* **Expected:**

  * Median ≤ **600 ms**.
* **Reqs:** NFR-01

---

### **TC-182 — List ≤ 150 ms DB time (≤50 items)**

* **Pre:** Identifier with ~30–50 tasks.
* **Steps:**

  1. Fetch Active list; capture server DB timing (logs).
* **Expected:**

  * Average DB time ≤ **150 ms**.
* **Reqs:** NFR-01

---

### **TC-184 — Mutation ≤ 500 ms median**

* **Steps:**

  1. Create, edit, toggle tasks 10x.
* **Expected:**

  * Median ≤ **500 ms**, p95 ≤ **1000 ms**.
* **Reqs:** NFR-01

---

## Appendix A — Minimal API Payloads (for manual sanity)

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

# Enrich
curl -s -X POST https://<app>/api/webhooks/enhance \
 -H 'Content-Type: application/json' \
 -d '{"todo_id":"<uuid>","identifier":"john@example.com","title":"Write SRS","enhanced_description":"...","steps":["one","two"]}'
```

---

## Appendix B — Defect Severity & Reporting

* **S1 Blocker:** Acceptance broken or data integrity risk.
* **S2 Major:** Core impaired; workaround exists.
* **S3 Minor:** Cosmetic/low risk.
* **S4 Trivial:** Typos.

Report via GitHub Issues with labels: `bug`, severity `S1..S4`, component (`ui`, `api`, `db`, `chat`, `webhook`), and attach `request_id` where applicable.

---

**End of `TEST-CASES.md`.**
