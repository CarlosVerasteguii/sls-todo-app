# SLS To-Do — WhatsApp Playbook (Evolution API)

**Version:** 1.1 (Normalized)  
**Status:** Approved for implementation (stub)  
**Owners:** Integrations (WhatsApp), Backend  
**Scope:** Inbound webhook from Evolution API → normalize hashtagged commands → log only (no DB writes in v1.0). Future evolution to DB mutations is defined here.

---

## 0) Goals & Non-Goals

**Goals (v1.0 — Stub)**
* Receive inbound WhatsApp messages from Evolution API at `/api/whatsapp`.
* Require the hashtag `#to-do-list` (case-insensitive) anywhere in the message to trigger.
* Normalize text into a simple command `{command, args, sender}` and log it (observability).
* Always respond quickly (≤100ms) with `200 OK` to avoid provider retries storm.

**Non-Goals (v1.0)**
* No DB mutations, no replies back to WhatsApp.
* No contact sync, no identity mapping.

**Future (Bonus)**
* If hashtag is present, execute the command (create/list/done) against our APIs.
* Optionally send a reply back to the user via Evolution API (ack/status).

---

## 1) Provider: Evolution API

* We treat Evolution API as provider "evolution" in logs/config.
* **Webhook:** Evolution posts JSON to our endpoint on inbound messages.
* **Sender Number Configuration**:
  - The designated sender number for the service (e.g., `+528332519900`) must be configured as an environment variable. Do not hardcode this value in the application.
  - Add the following line to your `.env` file:
    ```bash
    WHATSAPP_SENDER_NUMBER=+528332519900
    ```
  - While the v1.0 stub does not send messages, this variable will be used for sending replies if that functionality is enabled in the future.
* **Payload shape** can vary; we assume one or more of the following fields may exist:
  * `message` / `body` / `text` (string)
  * `messages[0].text.body`, `messages[0].from`, `messages[0].id`, `messages[0].timestamp`
  * `from` / `sender` (E.164 like `+52...`)

* Our normalizer is defensive: it scans multiple candidate paths to extract `raw_text`, `sender`, `message_id`, `timestamp`.
* We don't store provider secrets in the client. All provider tokens/keys stay server-side.

---

## 2) Endpoint Contract (Our App)

* **Path:** `POST /api/whatsapp`
* **Consumes:** `application/json`
* **Produces:** `200 OK` (always, unless signature verification fails when enabled)

### 2.1 Request (provider payload)

* Accept any JSON; we will search known text fields.
* Optionally validate an HMAC signature if configured (see §6).

### 2.2 Normalized Output (internal log shape)

When hashtag is present and a known command is parsed, we log:

```json
{
  "op": "whatsapp.normalize",
  "provider": "evolution",
  "sender": "+52XXXXXXXXXX",
  "message_id": "ABCD1234",
  "timestamp": "2025-08-29T03:10:00Z",
  "raw_text": "#to-do-list add Buy milk |priority=P1 |tags=grocery,dairy",
  "normalized": {
    "command": "add",
    "args": {
      "title": "Buy milk",
      "priority": "P1",
      "project": null,
      "tags": ["grocery","dairy"],
      "taskId": null
    }
  },
  "request_id": "uuid"
}
```

In v1.0, we do not persist this log to DB; it's emitted via server logs (observability).

---

## 3) Hashtag Filter & Grammar

### 3.1 Trigger Hashtag

* Must contain `#to-do-list` (case-insensitive) anywhere in `raw_text`.
* If missing → ignore (return `200 OK` and do nothing).

### 3.2 Command Grammar (minimal)

After removing the hashtag token from the text:

* `list`
* `add <title> [|priority=P0|P1|P2|P3] [|project=<text>] [|tags=a,b,c]`
* `done <taskId>`

* `add`: everything before the first pipe (`|`) is the title.
* Pipes split optional named fields (`priority`, `project`, `tags`).
* `tags` split by comma, trimmed, deduped lowercase → array.

**Examples**
* `#to-do-list list`
* `#to-do-list add Buy milk |priority=P1 |project=Home |tags=grocery,dairy`
* `#to-do-list done 0f40b8b1-26a7-4c64-b4a0-2f07e5674a83`

Unknown/invalid commands: still return `200 OK`, but log `"command":"unknown"` with `reason:"parse_error"`.

---

## 4) Sender & Idempotency

* Extract sender from `from` / `messages[0].from` / `sender` (prefer E.164 `+52...`).
* Extract a provider message id from `messages[0].id` / `id` if available.
* **De-dupe (optional):** Keep an in-memory LRU of `(provider, message_id)` for ~10 minutes to drop duplicates (provider retries). If not available, skip de-dupe.

---

## 5) Response Behavior

* Always `200 OK` with a minimal JSON: `{"ok": true}`.
* If signature validation (HMAC) is enabled and fails → `401 Unauthorized` and do not process.
* Never block >100ms; perform heavy parsing client-side JS only (millisecond scale).

---

## 6) Security & Controls

**Headers (optional, recommended)**
* `X-Provider: evolution`
* `X-Provider-Signature: <HMAC-SHA256 hex>` where `signature = HMAC(secret, rawBody)`

**Server checks**
* Enforce `Content-Type: application/json`.
* Cap body size (see `.env.example` `API_BODY_SIZE_LIMIT=256kb`).
* **CORS:** Webhook routes may allow `*` or provider origin (does not expose cookies).
* Log only pseudonymous data (hash identifier not applicable here); do not log message contents in production unless needed for debugging—keep behind a flag.

---

## 7) Implementation Sketch (Next.js API Route)

```typescript
// /app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';

const HASHTAG = (process.env.WHATSAPP_ALLOWED_HASHTAG || '#to-do-list').toLowerCase();
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'evolution';

function getRawText(body: any): string {
  // Try common locations in Evolution-like payloads; fall back to stringify
  return (
    body?.message ??
    body?.text ??
    body?.body ??
    body?.messages?.[0]?.text?.body ??
    body?.messages?.[0]?.body ??
    body?.messages?.[0]?.message ??
    ''
  ).toString();
}

function getSender(body: any): string | null {
  return (
    body?.from ??
    body?.sender ??
    body?.messages?.[0]?.from ??
    null
  );
}

function getMessageId(body: any): string | null {
  return (body?.id ?? body?.messages?.[0]?.id ?? null);
}

function parseCommand(text: string) {
  const t = text.replace(/\s+/g, ' ').trim();
  const lower = t.toLowerCase();
  if (!lower.includes(HASHTAG)) return { matched: false };

  // Remove hashtag token (first occurrence)
  const withoutTag = t.replace(new RegExp(HASHTAG, 'i'), '').trim();

  // Minimal grammar
  if (/^list\b/i.test(withoutTag)) {
    return { matched: true, command: 'list', args: {} };
  }
  if (/^done\s+/i.test(withoutTag)) {
    const m = withoutTag.match(/^done\s+([0-9a-fA-F-]{36})/);
    return { matched: true, command: 'done', args: { taskId: m?.[1] || null } };
  }
  if (/^add\s+/i.test(withoutTag)) {
    // Split title and pipe fields
    const parts = withoutTag.split('|').map(s => s.trim());
    const first = parts.shift()!; // "add <title>"
    const title = first.replace(/^add\s+/i, '').trim();

    const args: any = { title, priority: null, project: null, tags: [] as string[] };
    for (const p of parts) {
      const kv = p.split('=');
      if (kv.length < 2) continue;
      const key = kv[0].trim().toLowerCase();
      const val = kv.slice(1).join('=').trim();
      if (key === 'priority') args.priority = val.toUpperCase();
      else if (key === 'project') args.project = val;
      else if (key === 'tags') {
        args.tags = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        // dedupe & cap
        args.tags = Array.from(new Set(args.tags)).slice(0, 20);
      }
    }
    return { matched: true, command: 'add', args };
  }

  return { matched: true, command: 'unknown', args: { reason: 'parse_error' } };
}

export async function POST(req: NextRequest) {
  const request_id = crypto.randomUUID();
  let body: any = null;

  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: true }, { status: 200 }); }

  // (Optional) signature check
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (expected) {
    const sig = req.headers.get('x-provider-signature') || '';
    // if (!verifyHmac(expected, await req.text(), sig)) return NextResponse.json({ ok: false }, { status: 401 });
    // NOTE: If verifying, you must read raw body; adapt to Next.js middleware that provides rawBody.
  }

  const raw_text = getRawText(body);
  const sender = getSender(body);
  const message_id = getMessageId(body);
  const ts = new Date().toISOString();

  const norm = parseCommand(raw_text);

  // Log (structured)
  console.info({
    ts, level: 'info', request_id, provider: PROVIDER, route: '/api/whatsapp',
    sender, message_id, has_tag: norm.matched, raw_text: raw_text?.slice(0, 256),
    normalized: norm.matched ? { command: norm.command, args: norm.args } : null
  });

  // v1.0: no DB writes, no replies
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

If you later enable replies, add an Evolution "send message" call after parsing (see §10).

---

## 8) Test Cases (mapping)

* **TC-130** Normalize `#to-do-list add ...` → logs `command:"add"` with parsed args; no DB writes.
* **TC-132** Missing hashtag → ignored (`200 OK`; `has_tag:false`).
* **TC-134** `done <uuid>` → logs `command:"done"` and `taskId`.
* **Robustness:** payload variants with text under different fields still parse correctly.

---

## 9) Observability

* Include `request_id`, `provider`, `sender`, `message_id`, `has_tag`, and (optionally truncated) `raw_text`.
* Do not log full bodies in production unless debugging (behind a flag).
* **Rate anomalies:** per-sender spike → consider soft rate limiting (e.g., drop after N/min).

---

## 10) Future: From Stub → Mutations & Replies

### 10.1 Enable DB Mutations (safe path, no refactor)

After normalization, map commands to existing endpoints:

* `add` → `POST /api/todos` (body built from args + a default Identifier policy you define)
* `list` → `GET /api/todos?identifier=...&status=active`
* `done` → `PATCH /api/todos/:id?identifier=...` `{ completed: true }`

**Identifier policy:** For demo, you may set a single shared Identifier (e.g., `whatsapp@demo`) or derive from a sender mapping table (future).

### 10.2 Send Replies via Evolution

After executing a command, call Evolution's send message endpoint to reply with a short confirmation or summary. Keep these plain text and ≤ 500 chars.

**Recommended reply patterns:**
* `add` → "Added: <title> (P1) [Home] #grocery #dairy"
* `list` → "You have 3 active tasks. Top: <title1>, <title2>…"
* `done` → "Marked as done: <title>"

Replies are optional for the assessment; implement only if going for the full bonus.

---

## 11) Configuration

Add to `.env` (already present in `.env.example`):

```bash
WHATSAPP_PROVIDER=evolution
WHATSAPP_WEBHOOK_SECRET=<optional>
WHATSAPP_ALLOWED_HASHTAG=#to-do-list
```

Keep feature flag `FEATURE_WHATSAPP_STUB=true` for the stub.

When enabling mutations, introduce a new flag `FEATURE_WHATSAPP_WRITE=true`.

---

## 12) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payload drift | Parser breaks | Defensive extraction (multiple paths); tests with sample payloads |
| Spam / abuse | Log flood | Per-sender soft rate limit; ignore missing hashtag |
| Duplicate deliveries | Double processing | LRU de-dupe by `(provider,message_id)` |
| Privacy concerns | Leaking content in logs | Truncate `raw_text` and disable full body logs in prod |
| Identifier mapping | Writes under wrong dataset | Keep stub read-only; define explicit Identifier policy if/when writing |

---

## 13) Change Control

Any change to:
* Trigger hashtag
* Grammar
* Security (signature)
* Reply behavior

…must update:
* This file
* `API-SPEC.md` (if endpoint behavior changes)
* `.env.example` (if new vars/flags)
* Test cases (`TEST-CASES.md` §11)

---

## File map

```
/docs
  WHATSAPP-PLAYBOOK.md  <-- (this file)
  API-SPEC.md           <-- /api/whatsapp contract
  TEST-CASES.md         <-- TC-130..134
  SECURITY.md           <-- webhook security & logging guidance
```

---

*End of WHATSAPP-PLAYBOOK.md.*
