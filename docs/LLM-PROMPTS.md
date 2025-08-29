# SLS To-Do — LLM Prompts (Title → Enrichment)

**Version:** 1.0  
**Status:** Approved for implementation  
**Owners:** Integrations (n8n), Backend

**Purpose:** Canonical prompts, parameters, and guardrails to enrich a task title into a concise `enhanced_description` and a short list of actionable steps. Output is strict JSON and safe to render as plain text in the UI.

---

## 0) Scope & Non-Goals

**In scope**
* Enrich on create and on title update (non-blocking).
* Produce:
  * `enhanced_description` — ≤ 400 chars, plain text
  * `steps` — 0–8 items, each ≤ 90 chars, plain text
* Language: match user title language (detected). Default to English if unsure.

**Out of scope (v1.0)**
* Live web research or contacting services (optional profile in §6).
* Domain-specific specialized advice (medical/legal/financial).
* Any PII extraction or augmentation.

---

## 1) Output Contract (authoritative)

LLM must return raw JSON (no code fences, no prose):

```json
{
  "enhanced_description": "string | null",
  "steps": ["string", "..."] | null
}
```

**Validation rules (server/UI will also enforce)**
* `enhanced_description`: null or plain text, length 0..400.
* `steps`: null or array size 0..8; each string 1..90 chars; plain text.
* No Markdown, bullets, numbering, emojis, links, emails, or phone numbers.
* Must be neutral and safe; no medical/legal/financial instructions beyond generic planning.

---

## 2) Base Prompts (Chat Completions)

### 2.1 System Prompt (deterministic baseline)

```
You are a concise task assistant for a to-do application.
Your job: given a short task title, output strictly a JSON object with two fields:
- enhanced_description: a single helpful plain-text paragraph (<= 400 chars) or null
- steps: an array (0–8) of plain-text step strings (<= 90 chars each) or null

Rules:
- Output ONLY raw JSON, no markdown, no code fences, no commentary.
- Do NOT include links, emails, phone numbers, or sensitive data.
- No medical, legal, or financial advice; keep guidance generic and safe.
- Keep language consistent with the user's title; default to English if unsure.
- Keep text neutral, concise, and free of formatting (no bullets, no numbering).
```

### 2.2 User Prompt Template

Variables in `{{double_curly}}` must be interpolated by n8n:

```
Title: "{{title}}"
Locale: "{{locale}}"   # e.g., en-US, es-MX; optional
Timezone: "{{tz}}"     # e.g., America/Monterrey; optional
Context: The user is managing tasks in a simple to-do list.
Goal: Clarify what success looks like, give pragmatic, short steps.

Return ONLY JSON with keys: enhanced_description, steps.
```

If locale is set and indicates Spanish (e.g., `es-*`), the model should respond in Spanish; otherwise respond in the detected language of the title or English.

---

## 3) Model Parameters (recommended)

* **Model:** `gpt-4o-mini` (or equivalent fast, low-cost reasoning model)
* **Temperature:** 0.2 (deterministic with slight variation)
* **Top_p:** 1
* **Max tokens:** 400 (sufficient for 400-char desc + steps)
* **Stop sequences:** (none required)
* **Retries:** 1 (see n8n workflow)
* **Timeout:** 15s

If you need maximum determinism for testing, set `temperature: 0.0`.

---

## 4) Few-Shot Guidance (inline examples)

These are illustrative; do not paste them into the live prompt unless you need to bootstrap a weaker model. The base system prompt suffices for quality models.

### Example A — English, simple chore

**Input Title:** Buy milk and eggs  
**Expected JSON:**

```json
{
  "enhanced_description": "Pick up milk and eggs so you have essentials for cooking and breakfast. Check what you already have to avoid duplicates and note any brand or size preferences.",
  "steps": [
    "Check fridge to confirm quantities",
    "Add items to your shopping list",
    "Choose nearby store and go today",
    "Buy milk and a dozen eggs",
    "Put items away promptly"
  ]
}
```

### Example B — Spanish, appointment

**Input Title:** Agendar cita con dentista en Chicago  
**Expected JSON:**

```json
{
  "enhanced_description": "Programa una cita con un dentista en Chicago considerando disponibilidad, cobertura del seguro y ubicación. Define días y horarios preferidos antes de llamar o reservar en línea.",
  "steps": [
    "Confirma cobertura con tu seguro",
    "Elige 2–3 clínicas cercanas",
    "Revisa disponibilidad en línea o por teléfono",
    "Reserva y guarda confirmación",
    "Agrega la cita a tu calendario",
    "Configura recordatorio un día antes"
  ]
}
```

### Example C — Work task with tags (title includes priority; the model must ignore decorative tokens)

**Input Title:** P1: Draft PRD sections  
**Expected JSON:**

```json
{
  "enhanced_description": "Borra un primer borrador de las secciones clave del PRD para alinear alcance, requisitos y criterios de aceptación antes de la revisión del equipo.",
  "steps": [
    "Esboza índice y objetivos",
    "Redacta alcance y exclusiones",
    "Define métricas de éxito",
    "Anexa APIs y esquema de datos",
    "Prepara criterios de aceptación",
    "Pide revisión a stakeholders"
  ]
}
```

### Example D — Ambiguous or too short

**Input Title:** Follow up  
**Expected JSON:**

```json
{
  "enhanced_description": "Da seguimiento a un asunto pendiente. Aclara con quién, el tema y el objetivo del mensaje para avanzar y cerrar pendientes.",
  "steps": [
    "Define objetivo del seguimiento",
    "Identifica a la persona de contacto",
    "Redacta mensaje breve y claro",
    "Envía por el canal acordado",
    "Agenda recordatorio si no responde"
  ]
}
```

---

## 5) Guardrails & Safety

* **Plain text only:** no bullets (-, •), no numbered lists (1., 2.), no markdown.
* **No contact details:** forbid URLs, emails, phones.
* **Sensitive domains:** if the title implies medical/legal/financial decisions, keep generic planning language (e.g., "consult a professional" or "check official guidance") without prescribing treatments or legal strategies.
* **No hallucinated facts:** do not fabricate store hours, prices, or addresses.
* **Language policy:** respond in the same language as the title; if mixed or unclear, use locale if provided else English.
* **Safety fallback:** if the model cannot safely produce content, set `enhanced_description` or `steps` to null (not empty strings).

---

## 6) Optional "Research-lite" Variant (feature-flagged)

If later we enable a lightweight web context (e.g., n8n node that performs a brief search), pass a short context extract (≤ 700 chars) into the user prompt:

```
Title: "{{title}}"
Locale: "{{locale}}"
Timezone: "{{tz}}"

Context (unverified; optional):
{{context_snippet}}

Use the context only if it directly helps the task. Do NOT include links, prices, or contact details. Do NOT claim facts you cannot verify. Return ONLY JSON with keys: enhanced_description, steps.
```

Keep the same output contract and guardrails.

Never expose raw URLs or identifiers in the output.

---

## 7) Failure Modes & Fallbacks

**Parse error (model returned non-JSON):**
* n8n reparses once via a regex cleanup; if still invalid, return:
```json
{ "enhanced_description": null, "steps": null }
```

**Overlength fields:**
* Truncate server-side: desc → 400 chars; steps → 90 chars each; max 8 items.

**Unsafe/forbidden content:**
* Replace with null fields and log a minimal event (no PII).

---

## 8) Acceptance Criteria (prompt-level)

A run is considered **PASS** if:

* Output is valid JSON with exactly the keys `enhanced_description` and `steps`.
* Length limits and counts are respected after server truncation.
* No formatting (bullets/numbering), no links/emails/phones.
* Language matches title (or locale).
* Content is pragmatic and neutral, with 0–8 concise steps aligned to the title.

---

## 9) Test Set (adversarial & sanity)

Use these titles to regression-test the prompt:

* Fix login issue
* Enviar factura a cliente
* Plan summer trip
* Leer contrato y resolver dudas (should stay generic; no legal advice)
* Schedule dentist in Chicago
* Buy milk
* P0: Deploy hotfix
* Follow up
* Create budget for Q4
* Renovar licencia de conducir (no addresses or office hours; generic steps)

**Expected:** valid JSON per contract; language matching each title; no unsafe specifics.

---

## 10) Implementation Notes (n8n)

* Interpolate `{{title}}`, `{{locale}}`, `{{tz}}` into the User Prompt.
* Use the System Prompt verbatim.
* Enforce temperature 0.2, max_tokens 400.
* Post-process with the Parse LLM Output node (see `N8N-WORKFLOW.md` §3 Node 5).
* Always call back to `/api/webhooks/enhance` with the normalized JSON.

---

## 11) Change Control

Any change to fields, limits, or guardrails requires updating:

* `LLM-PROMPTS.md` (this file)
* `N8N-WORKFLOW.md` (if payload shapes change)
* `API-SPEC.md` (if webhook contract changes)

Log changes in repo commits; bump minor version if backward-compatible, major if breaking.

---

## Appendix A — Deterministic Variant (for QA runs)

**System differences:**
* Temperature: 0.0
* Add to System Prompt:
```
Be deterministic. If uncertain, set enhanced_description or steps to null.
```

---

## Appendix B — Minimal JSON Schema (informal)

```json
{
  "type": "object",
  "required": ["enhanced_description", "steps"],
  "properties": {
    "enhanced_description": { "type": ["string", "null"], "maxLength": 400 },
    "steps": {
      "type": ["array", "null"],
      "items": { "type": "string", "maxLength": 90 },
      "maxItems": 8
    }
  },
  "additionalProperties": false
}
```

---

## File map

```
/docs
  LLM-PROMPTS.md   <-- (this file)
  N8N-WORKFLOW.md  <-- operational workflow and callback details
  API-SPEC.md      <-- /api/webhooks/enhance contract
```

---

*End of LLM-PROMPTS.md.*
