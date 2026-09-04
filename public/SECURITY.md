# Chokepoint — Security Design & Threat Model

> A least-privilege access-control and tamper-evident audit platform for sensitive
> operations — for humans and for AI agents. This document explains *why* it was
> built the way it was and how it defends against the threats it targets.

---

## 1. The problem

Modern applications increasingly hand over not just data but **the ability to act** —
approve refunds, rotate credentials, grant access, delete records. When **AI agents**
join that mix, the risk compounds: an agent given more authority than its task needs
is one prompt injection, one over-permissioned service account, or one shared key away
from doing irreversible damage.

This is the #1 enterprise failure in the **OWASP Agentic AI Top 10 (2026)** —
**ASI03: Identity & Privilege Abuse**. Chokepoint is a concrete, opinionated answer to
that class of failure, built around four controls:

1. **Least-privilege RBAC** — every principal gets the minimum role its job requires.
2. **Separation of duties (dual control)** — irreversible actions require a second,
   distinct, authorized approver.
3. **Tamper-evident audit** — every event is hash-chained and HMAC-signed, so the log
   cannot be silently rewritten.
4. **Explainable anomaly detection** — suspicious patterns are surfaced with reasons,
   not black-box scores.

---

## 2. Threat model

| Threat | Defense in Chokepoint |
| --- | --- |
| **Over-permissioned principal** (ASI03) | Role-based access control with a single `can(role, action)` policy; least-privilege matrix enforced on every route. |
| **Insider / single person approves their own change** | Dual-control: the approver must be a *different* principal and *authorized* to perform the action. |
| **Agent or actor escalates its own privilege** | Elevation/grant/revoke are all dual-controlled; rapid repeated elevation is flagged as a risk. |
| **Audit log tampered / selectively edited** | Hash chain (each entry commits to the previous hash) + HMAC-SHA256 per-entry signature. Editing, deleting, or reordering invalidates the chain. |
| **Signature forgery with a recomputed hash** | HMAC is *keyed*: recomputing the SHA-256 hash isn't enough to re-sign without the server-side key. |
| **Stolen session / XSS token theft** | HttpOnly, SameSite=Strict, signed session cookie. JS never sees the token. |
| **Credential stuffing / brute force** | PBKDF2-SHA256 (100k rounds, per-user random salt); failed logins are recorded and raise a risk signal. |
| **Unusual activity, after-hours, unknown source** | Anomaly engine with explainable signals (after-hours, new source, escalation, rate, high-value target). |

---

## 3. The tamper-evident ledger

The ledger is the heart of the platform. Every audit event becomes a record:

```
H(n) = SHA256( prevHash ‖ id ‖ ts ‖ actor ‖ role ‖ action ‖ target ‖ meta ‖ nonce )
sig  = HMAC-SHA256( secret, H(n) )
```

**Why this is tamper-evident:**

- **Hash chain** — `H(n)` embeds `prevHash` = `H(n-1)`. Change any field of any entry,
  and its hash changes, which breaks the `prevHash` link of *every entry after it*.
- **HMAC signature** — even if an attacker recomputes a *valid-looking* SHA-256 chain,
  they cannot forge the HMAC signature without the keyed `secret`. The secret is held
  server-side (env `CHOKEPOINT_SECRET`) and never sent to the client.
- **Strict verification** — `verifyChain()` re-hashes and re-signs every entry **in
  order** from the genesis block. It does *not* re-sort, so a reordered, inserted, or
  deleted record is itself flagged as an integrity failure. The hash of the *very first*
  entry is anchored to a fixed genesis hash, so the chain can't be truncated from the front.

This is the model a real append-only audit store uses (immutable DB tables, S3
Object-Lock, WORM storage). Chokepoint keeps it in memory so the demo is self-contained,
but the verification contract is identical.

### Self-test

```ts
const result = verifyChain(store.ledger, LEDGER_SECRET);
// { valid: true, total: 19, firstInvalid: null, reason: null }
```

The test suite (`tests/ledger.test.ts`) proves that altering a payload, deleting an
entry, reordering, or re-signing with the wrong key are all **detected**.

---

## 4. Access control & dual control

Roles (least → most privileged): **viewer → auditor → operator → admin**.

| Capability | Viewer | Auditor | Operator | Admin |
| --- | --- | --- | --- | --- |
| View dashboard & log | ✓ | ✓ | ✓ | ✓ |
| Verify integrity / export | — | ✓ | ✓ | ✓ |
| Run scan / request agent action | — | — | ✓ | ✓ |
| Privilege & dual-control actions | — | — | — | ✓ |
| Approve dual-control mandates | — | — | — | ✓ |

**Dual-control rule** (enforced in code, not just docs): the approver must be a distinct
principal from the requester and must hold a role authorized to perform the action.
A person can never approve their own change, and a low-privileged principal can never
rubber-stamp a high-privilege one.

- Operator *proposes* a dual-control change → it becomes a pending **mandate**.
- A different, authorized principal (admin) *approves* it → it executes and is written
  to the audit chain.
- Blocks are themselves audited (a blocked self-approval is recorded).

---

## 5. Anomaly detection

The engine produces **explainable** risk signals (`lib/anomaly.ts`). Each signal has a
human-readable reason:

| Signal | What it means |
| --- | --- |
| `FAILED_LOGIN` | Brute-force / credential stuffing |
| `AFTER_HOURS` | Privileged action outside the business-hours window |
| `NEW_SOURCE` | First activity from a principal in the observed window |
| `ESCALATION` | Repeated elevation → privilege creep |
| `HIGH_VALUE` | Wide-scope grant, secret rotation, or deletion |
| `RATE` | Actions/min above a human norm → automation/abuse |

Signals are weighted and summed into a 0–1 **score**, mapped to
**LOW / MEDIUM / HIGH / CRITICAL**, and rolled into a dashboard **risk index (0–100)**.

---

## 6. Cryptographic decisions

- **Password hashing:** PBKDF2-SHA256, 100,000 iterations, 128-bit per-user random salt.
  Stored self-describing (`pbkdf2$rounds$salt$hash`) so the cost can be raised later.
- **Signatures / tokens:** HMAC-SHA256 for the ledger; the session token is
  `base64url(payload).HMAC(secret, payload)`.
- **Constant-time comparisons:** all secret comparisons use `timingSafeEqual` so the
  server does not leak information via timing.
- **No roll-your-own crypto** beyond composition of standard primitives from `node:crypto`.
- **Secrets config:** `CHOKEPOINT_SECRET` (ledger key) and `CHOKEPOINT_SESSION_SECRET`
  (session key). Dev fallbacks exist so the demo runs out of the box, but **must be set
  in production** and never exposed.

> ⚠️ **Demo caveat:** the store is in-memory and the ledger secret has a dev fallback.
> This is intentional so the demo is self-contained and a recruiter can try it in 30
> seconds. In a production deployment, set both secrets, persist the ledger to an
> append-only store (e.g., immutable Postgres table / S3 Object-Lock), and read the
> secrets from your platform's secret manager.

---

## 7. HTTP transport hardening

Defense-in-depth response headers set on every route (`next.config.mjs`):

```
Content-Security-Policy:
  default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

> Note: `script-src 'self' 'unsafe-inline'` is required because Next.js emits small
> build-time bootstrap scripts inline. This is a common, defensible posture; in a
> hardened production setup you'd switch to per-response hash/nonce-based CSP so that
> inline scripts are allow-listed rather than blanket-permitted.

---

## 8. What I'd do in production (honest notes)

- Back the store with a real database; make the audit log append-only and WORM-protected.
- Add brute-force rate-limiting per IP/principal and lockout with backoff.
- Move keys to a secret manager; rotate them.
- Add per-request, scoped, short-lived agent tokens with just-in-time tool grants (ASI03's
  specific recommendation).
- Add 2FA/MFA for admins and mandates.
- Port the PWA to native Android/PC via Capacitor (documented in the README).

---

*Built as a portfolio piece. The security principles and the tamper-evidence
implementation are the point — the demo makes them directly inspectable.*
