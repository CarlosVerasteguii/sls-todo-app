# SLS To-Do — Detailed Test Cases

**Version:** 1.1 (Normalized)
**Status:** Ready for execution
**Traceability:** Each case maps to a requirement in `docs/SRS.md`.

---

## Conventions

* **Identifier A:** `john@example.com` → normalized `john@example.com`
* **Identifier B:** `Team   Alpha` → normalized `team alpha`
* **Priority coverage:** Test data MUST include tasks across P0..P3; default creation is P2 unless specified.
* **Data hygiene:** Refresh DB or use fresh Identifiers per suite to avoid cross-test coupling.

---

## 1) Identifier & Lock (FR-3)

### **TC-001 — Lock blocks creation until set**
* **Reqs:** FR-3

---

## 2) Create / Edit / Validation (FR-1, FR-4)

### **TC-010 — Create minimal task**
* **Reqs:** FR-1, FR-4, FR-5

---

## 3) Toggle / Completed / Counters (FR-2)

### **TC-030 — Toggle to completed**
* **Reqs:** FR-1, FR-2

---

## 4) Delete & Undo (FR-10)

### **TC-040 — Delete single with Undo**
* **Reqs:** FR-1, FR-10

---

## 5) Priority / Project / Tags (FR-4)

### **TC-050 — Change priority via menu**
* **Reqs:** FR-4, FR-6

---

## 6) Keyboard / Selection / Undo (FR-6, FR-10)

### **TC-060 — Selection model (click, CTRL+A, ESC)**
* **Reqs:** FR-6

---

## 7) Persistence & Partitioning (FR-2, FR-3, FR-5)

### **TC-080 — Refresh keeps dataset**
* **Reqs:** FR-2, FR-5

---

## 8) Server Boundary & Hygiene (NFR-2)

### **TC-090 — Client cannot write with service-role**
* **Reqs:** NFR-2

---

## 9) Chat Adapter (FR-8)

### **TC-100 — `list` returns current todos**
* **Reqs:** FR-8

---

## 10) Enrichment Webhook (n8n) (FR-7)

**Note:** `/api/webhooks/enhance` is **idempotent**; repeated callbacks overwrite enrichment fields.

### **TC-120 — Idempotent enrichment PATCH**
* **Reqs:** FR-7

---

## 11) TC-130..134 — WhatsApp Webhook (stub normalization) (FR-9)

**Note:** Verify normalization and logging only. **No DB mutations expected** in v1.0.

### **TC-130 — Normalize `#to-do-list add ...`**
* **Reqs:** FR-9

---

## 12) UX / Feedback / Accessibility (FR-6, NFR-4)

### **TC-148 — Keyboard Shortcuts box present & accurate**
* **Reqs:** FR-6

---

## 13) Health / Logging (FR-5, NFR-3)

### **TC-160 — `/api/health` returns 200 + version**
* **Reqs:** FR-5, NFR-3

---

## 14) Performance (Light Load) (NFR-1)

### **TC-180 — TTFB ≤ 600 ms (warm)**
* **Reqs:** NFR-1

---

**End of `TEST-CASES.md`.**
