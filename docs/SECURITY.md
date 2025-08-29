# SLS To-Do — Security Posture & Hardening Guide

**Version:** 1.0
**Status:** Adopt for v1.0 (assessment). Items labeled **[FUTURE]** are ready for the RLS/auth upgrade without refactors.
**Scope:** App UI (Next.js/Vercel), Server Actions & API routes, Supabase (Postgres), n8n webhook, WhatsApp webhook (stub), optional LLM provider.
**Non-goal (v1.0):** End-user authentication/SSO. Data is **partitioned** by a user-provided **Identifier**; see compensating controls below.

---

## 0) TL;DR (minimums you MUST keep)

* **Server boundary**: all writes on the server; **no** service-role keys in the browser.
* **Partitioning**: every query **MUST** filter by `identifier_norm`.
* **Secrets**: only in env (Vercel/Supabase); never committed.
* **Input safety**: reject HTML/script input; render as **plain text**.
* **Logs**: include `request_id`; never log `identifier_raw` or full payloads.
* **Webhooks**: accept JSON only, fast 200s, validate secret if configured.
* **Future**: RLS policies ready; can be enabled without UI refactors.

---

## 1) Data & Trust Boundaries

### 1.1 Data classes

| Class                                | Examples                                              | Handling                                                  |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------- |
| **C0 – Public**                      | Docs, health payload                                  | No restrictions                                           |
| **C1 – Internal**                    | Logs (w/ redactions), request IDs                     | Keep in provider logs only                                |
| **C2 – User data (low sensitivity)** | `todos.*`, `identifier_raw` (looks like email/name)   | Encrypt in transit (TLS), at rest by provider. No sharing |
| **C3 – Secrets**                     | `SUPABASE_SERVICE_ROLE`, LLM API key, webhook secrets | Server-only; rotate; least privilege                      |

### 1.2 Trust boundaries

* **Browser ↔ Server (Vercel)** — untrusted client; validate/sanitize on server.
* **Server ↔ Supabase** — trusted channel; use service-role **only on server**.
* **Server ↔ n8n/LLM/WhatsApp** — treat as external; timeouts, retries, validation, signature (if provided).

---

## 2) Threat Model (STRIDE snapshot)

| Area            | Threat                                             | Control (v1.0)                                                                       | [FUTURE]                 |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| Spoofing        | User pretends to be another by guessing Identifier | Partitioning + **no listing** of Identifiers; do not disclose datasets; privacy note | Add **Auth/RLS**          |
| Tampering       | Client submits malformed payload                   | Server validation + types; DB `CHECK`s; length limits                                | AJV/JSON schema strict    |
| Repudiation     | “I didn’t do that”                                 | `request_id` + structured logs                                                       | Signed audit events       |
| Info disclosure | Logs leak data                                     | Redaction (hash Identifier), no bodies in prod logs                                  | Centralized redaction lib |
| DoS             | Abusive calls                                      | Lightweight rate limits (middleware), timeouts, backoff                              | Edge rate limits/Upstash  |
| Elevation       | Client obtains service role                        | **Never ship** service-role to client; use Server Actions/API only                   | RLS policies + JWT        |

---

## 3) Server Boundary & DB Access

* **All mutations** (create/edit/toggle/delete) run in **Server Actions** or **API routes**.
* **Client reads** MAY use anon key but MUST include `identifier_norm` in where-clauses.
* **Service role**: only load on the server (`process.env.SUPABASE_SERVICE_ROLE`); never in client bundles.

**DO**:

* Normalize identifier server-side (lowercase, trim, collapse spaces).
* Validate and coerce tags into a small, deduped array.
* Reject/escape HTML and scripts; render plain text.

**DON’T**:

* Don’t infer or auto-select an Identifier from local state without user action.
* Don’t expose table names/SQL errors verbatim to users.

---

## 4) Secrets Management

* **Where**: Vercel Project Settings → Environment Variables; Supabase → Config secrets.
* **Never** commit secrets; keep `.env.example` up to date.
* **Rotation**: when a secret rotates, deploy immediately; consider versioned alias env vars during rotation windows.
* **Minimum env**:

  * `NEXT_PUBLIC_SUPABASE_URL` (public)
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  * `SUPABASE_SERVICE_ROLE` (**server-only**)
  * `N8N_ENHANCE_WEBHOOK_URL`
  * `WHATSAPP_WEBHOOK_SECRET` (optional if provider signs)

---

## 5) Input Validation & Output Encoding

**Validation (server):**

* `title`: 1–200 chars; trimmed; plain text.
* `description`: ≤ 2000 chars; plain text.
* `project`: ≤ 80 chars.
* `priority`: `P0|P1|P2|P3`.
* `tags`: ≤ 20 items; each 1–24 chars; lowercase; deduped.

**DB checks:** `CHECK priority`, `CHECK jsonb_typeof(tags) = 'array'`, length checks.

**Rendering:** Never inject user text as HTML; show as text (`dangerouslySetInnerHTML` **forbidden**).

---

## 6) Logging, Telemetry & PII

* Always attach a **`request_id`** (uuid) per request (in responses and logs).
* Log **operation**, **route**, **duration**, **status**, and a **pseudonymous identifier hash** (see below).
* **Never** log `identifier_raw` or full request bodies in production.
* Redact secrets, tokens, and provider signatures.

**Pseudonymous hash (Node):**

```ts
import crypto from 'node:crypto';

const SALT = process.env.ID_HASH_SALT!; // set in env
export const idHash = (identifier: string) =>
  crypto.createHash('sha256').update(SALT + identifier.toLowerCase()).digest('hex').slice(0, 16);
```

**Error envelope (contract):**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "title is required",
    "request_id": "6d8e3c9a-2e7d-4e0b-9b7e-1db1d3bca01d"
  }
}
```

---

## 7) Web Security Headers & Network Controls

* **CORS**: Allow app origin only for `POST` APIs; webhook routes accept provider origins.
* **Content Security Policy (CSP)** (example baseline):

  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline' vercel.live;
  connect-src 'self' https://*.supabase.co https://api.openai.com https://<n8n-host>;
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none';
  ```
* **HTTPS only**; HSTS managed by Vercel.
* Disable **X-Powered-By**; set **X-Content-Type-Options: nosniff**.

---

## 8) Webhooks (n8n & WhatsApp)

**General rules**

* Accept **JSON only**; reject > ~256KB payloads.
* Fast **200 OK**; decouple heavy work.
* Validate **shared secret** header if configured; otherwise keep liberal but log.

**n8n `/api/webhooks/enhance`**

* **Idempotent** upsert of enrichment fields by `todo_id`.
* Store minimal fields; **never** trust enrichment to modify core fields.

**WhatsApp `/api/whatsapp` (stub)**

* Require **`#to-do-list`** hashtag (case-insensitive).
* Normalize to `{command,args,sender}` and **log only** in v1.0.
* [FUTURE] When enabling DB mutations: require origin verification, per-sender rate limit, and command grammar strictness.

---

## 9) LLM / Prompt Safety (if used)

* **No sensitive data** in prompts beyond task title; do not send `identifier_raw`.
* Timeouts (e.g., 15s) and retries (≤1).
* **Refuse** arbitrary tool execution; only enrichment of description/steps.
* Cap tokens & cost; log usage metrics without payloads.
* Sanitize LLM outputs (plain text only; length limits).

---

## 10) Privacy & Data Retention

* Minimal personal data: **Identifier only**, used as a label. No email sending.
* **Delete on request**: delete all rows for `identifier_norm`; confirm irreversible action to the user.
* Backups/restores managed by Supabase; see `BACKUP-RESTORE.md` (**[FUTURE]**).
* Provide a README privacy note explaining demo limitations.

---

## 11) Dependency & Supply Chain

* Pin package versions; avoid abandoned libs.
* CI checks:

  * `npm audit` / `pnpm audit` (allowlist reviewed exceptions).
  * SAST (e.g., CodeQL) for repo.
  * Secret scanning (GitHub Advanced Security or trufflehog).
* Lockfiles committed; renovate/depbot enabled for updates.

---

## 12) Environments & Config Isolation

* Separate envs: **local**, **preview**, **prod**.
* Distinct secrets/keys per env.
* Feature flags (`FEATURE_*`) to gate risky integrations (Chat, WhatsApp, Enhance).
* Co-locate Vercel region with Supabase to reduce lateral exposure and latency.

---

## 13) [FUTURE] RLS Upgrade Path (no UI refactor)

When ready to hard-isolate per user/account:

1. **Keep schema** as is (fields unchanged).
2. **Enable RLS** on `public.todos`.
3. Route all reads/writes through **Supabase Edge Functions** or a Next.js API with a verified token that sets a session variable (claim) like `identifier_norm`.
4. **Policies** (example):

   ```sql
   alter table public.todos enable row level security;

   create policy "read by identifier"
   on public.todos
   for select
   using (identifier_norm = current_setting('request.jwt.claims.identifier_norm', true));

   create policy "write by identifier"
   on public.todos
   for all
   using (identifier_norm = current_setting('request.jwt.claims.identifier_norm', true))
   with check (identifier_norm = current_setting('request.jwt.claims.identifier_norm', true));
   ```
5. **JWT/Session**: issue signed tokens per Identifier or add real auth (Supabase Auth).
6. Remove direct anon client reads; keep **server boundary** enforced.

---

## 14) Incident Response & Vulnerability Handling

* **Detect**: monitor error rates, unusual spikes, or provider alerts.
* **Triage**: categorize S1/S2/S3; capture `request_id`, timeframe, routes.
* **Contain**: toggle feature flags, revoke keys, block IPs/providers as needed.
* **Eradicate**: patch, rotate secrets, add tests.
* **Recover**: verify `/api/health`, run smoke tests.
* **Post-mortem**: document root cause, add regression tests.

**Disclosure** (for public repo): provide `SECURITY.md` contact or use GitHub Security Advisories; respond within reasonable timeframe; avoid sharing exploit details before fix.

---

## 15) Operational Checklists

### 15.1 Pre-deploy

* [ ] No service-role in client bundle (`grep` build artifacts).
* [ ] Env vars set in Vercel (prod & preview).
* [ ] DB schema applied; indexes present.
* [ ] Healthcheck returns 200.
* [ ] Secrets rotated if compromised; `.env.example` updated.

### 15.2 Post-deploy

* [ ] Smoke CRUD + Chat + Webhooks stub.
* [ ] Logs show `request_id`, hashed id, durations (no payloads).
* [ ] Feature flags correct for environment.

### 15.3 Regular

* [ ] Audit deps monthly; patch critical vulns.
* [ ] Review logs for anomalies.
* [ ] Rehearse incident steps quarterly.

---

## 16) Snippets & Patterns

**Express-like header/CORS (Next.js API):**

```ts
export const config = { api: { bodyParser: { sizeLimit: '256kb' } } };

export default async function handler(req, res) {
  // CORS (limit POST to your origin; webhooks accept * or provider domains)
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN!);
  res.setHeader('Vary', 'Origin');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // CSP via middleware if needed

  // ...
}
```

**Request ID + logging context:**

```ts
import { randomUUID } from 'node:crypto';
import { idHash } from './id-hash';

export const withRequest = (handler) => async (req, res) => {
  const request_id = randomUUID();
  const identifier = (req.body?.identifier || req.query?.identifier || '').toString();
  const identifier_hash = identifier ? idHash(identifier) : 'none';

  const start = Date.now();
  try {
    const data = await handler({ req, res, request_id, identifier_hash });
    const dur = Date.now() - start;
    console.info({ ts: new Date().toISOString(), level: 'info', route: req.url, request_id, identifier_hash, dur_ms: dur, ok: true });
    return data;
  } catch (e) {
    const dur = Date.now() - start;
    console.error({ ts: new Date().toISOString(), level: 'error', route: req.url, request_id, identifier_hash, dur_ms: dur, err: e.message });
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Unexpected error', request_id } });
  }
};
```

**Basic rate limit (middleware sketch):**

```ts
// Use an edge key-value (e.g., Upstash) in production; here, in-memory placeholder
const buckets = new Map<string, { hits: number, ts: number }>();
export function rateLimit(key: string, max = 60, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key) || { hits: 0, ts: now };
  if (now - b.ts > windowMs) { b.hits = 0; b.ts = now; }
  b.hits++; buckets.set(key, b);
  return b.hits <= max;
}
```

---

## 17) Known Limitations (transparent)

* **Identifier model** allows dataset guessing; mitigated by non-enumeration and future RLS track.
* No MFA/SSO in v1.0 (assessment constraint).
* Webhooks accept liberal input by design; protect with secrets when available and keep handlers idempotent.

---

**Files bound to this policy**

* `.env.example`
* `docs/ARCHITECTURE.md` (§7, §10)
* `docs/API-SPEC.md` / `docs/API-SPEC.openapi.yaml` (error envelope, webhooks)
* `docs/ERD.md` / `docs/DB-SCHEMA.sql` (checks, triggers)
* `docs/OBSERVABILITY.md` (**[FUTURE]**)
* `docs/RUNBOOK.md` (**[FUTURE]**)

---

*End of `SECURITY.md`.*
