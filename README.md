# Chokepoint 🔐

**Least-privilege access control & tamper-evident audit for sensitive operations — humans and AI agents.**

Chokepoint is a full-stack security product built to answer one question: *how do you
let people — and increasingly, AI agents — perform high-impact actions without giving
anyone enough authority to abuse it?*

It is a live, installable web app with real role-based authentication, a working
two-person (dual-control) approval workflow, a hash-chained tamper-evident audit log,
and explainable anomaly detection. It is built on the **2026 OWASP Agentic AI Top 10**
failure **ASI03 — Identity & Privilege Abuse**.

> **Try it:** sign in with a one-click demo account on the [live site](https://YOUR-DEPLOY-URL) — no signup. A recruiter can be inside the console in 30 seconds.

---

## ✨ What it does

| Feature | Why it matters |
| --- | --- |
| **Role-based auth** (viewer / auditor / operator / admin) | Least privilege by default; a single policy gate on every action. |
| **Dual-control (two-person rule)** | Irreversible actions need a second, *distinct*, authorized approver — separation of duties. |
| **Tamper-evident audit log** | Every event is SHA-256 hash-chained **and** HMAC-signed; editing/deleting/reordering breaks the chain and is provable. |
| **Anomaly / risk detection** | Failed logins, after-hours privilege, unknown sources, privilege escalation, and automation are surfaced with human-readable reasons. |
| **Live dashboard** | Risk index, severity distribution, anomaly feed, and integrity verification. |
| **Installable PWA** | Runs on desktop and Android; Capacitor path for store-ready native builds. |

---

## 🚀 Getting started

Requires **Node 20.19+**.

```bash
git clone <your-fork> && cd chokepoint
npm install
npm run dev        # http://localhost:3000
```

Production build & run:

```bash
npm run build
npm run start
```

**Demo accounts** (seeded in-memory):

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin1234` | Admin |
| `operator` | `operator1234` | Operator |
| `auditor` | `auditor1234` | Auditor |
| `viewer` | `viewer1234` | Viewer |

> Set `CHOKEPOINT_SECRET` and `CHOKEPOINT_SESSION_SECRET` in production (see
> [`SECURITY.md`](./public/SECURITY.md)). Sensitive demo values are used only so the app
> runs out of the box.

---

## 🧪 Tests

```bash
npm test        # runs Vitest — 26 tests across crypto, ledger, authz, anomaly
```

The tests are not toy smoke tests. They prove the **security properties**:

- `tests/ledger.test.ts` — the audit chain **detects** altered payloads, **deleted**
  entries, **reordered** entries, and **re-signed** (wrong-key) entries.
- `tests/authz.test.ts` — the policy matrix and dual-control (distinct-approver +
  authorized-approver) rules.
- `tests/crypto.test.ts` — PBKDF2 (salted, timing-safe), HMAC keyed signatures.
- `tests/anomaly.test.ts` — signals fire on the intended conditions.

---

## 🏗️ Architecture

```
Clients (web / PWA / Capacitor)
        │
        ▼
Next.js App Router ──► Session (HttpOnly, SameSite=Strict, signed cookie)
        │                        │
        ▼                        ▼
  Policy engine (lib/authz)   Dual-control (approve/reject mandates)
        │                        │
        ▼                        ▼
  Tamper-evident audit ledger (hash chain + HMAC)  ──►  Anomaly detection
```

View the full **architecture diagram** at [`/architecture.svg`](./public/architecture.svg).

Key modules:

| Module | Responsibility |
| --- | --- |
| `lib/crypto.ts` | PBKDF2-SHA256, HMAC-SHA256, SHA-256, constant-time compare. |
| `lib/ledger.ts` | Append-only, hash-chained, HMAC-signed event log + `verifyChain()`. |
| `lib/authz.ts` | RBAC policy matrix, `can()`, dual-control enforcement. |
| `lib/anomaly.ts` | Explainable risk scoring & severity classification. |
| `lib/session.ts` | Signed, HttpOnly session cookie. |
| `lib/store.ts` | In-memory store + seed data (demo). |

---

## 📲 Install as an app (PWA / native)

**PWA (desktop + Android):** the app ships a manifest and service worker. From Chrome or
Edge on desktop: *Install icon* → *Install*. On Android Chrome: *Add to Home screen* →
*Install as app*.

**Native (Capacitor) path** for a store-ready Android/PC build:

```bash
npm i -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init chokepoint "com.dev.chokepoint" --web-dir=out
npm run build
npx cap add android
npx cap sync
npx cap open android   # build/run in Android Studio
```

The same can target desktop via Capacitor's Electron/macOS/Windows plugins.

---

## 🛡️ Security posture

See [**SECURITY.md**](./public/SECURITY.md) for the full threat model, the
tamper-evidence construction, the cryptographic decisions, and honest notes on what
would change in production. Highlights:

- **Tamper-evidence:** hash chain + HMAC; strict order-preserving verification that
  detects alteration, deletion, and reordering.
- **Separation of duties:** a person can never approve their own privileged change.
- **Credential hygiene:** PBKDF2-SHA256, per-user salt, timing-safe compares.
- **Session hygiene:** HttpOnly, SameSite=Strict, signed, expiring cookie.
- **Transport hardening:** strict CSP and security headers.
- **No vulnerable runtime deps:** `npm audit` reports **0 vulnerabilities**.

---

## 🧭 Project intent

This is a deliberate *upgrade* from an earlier, simpler project, and it's designed to
show what a security-minded, audit-disciplined engineer does when they own something
end to end: real auth, a real control plane, a provable audit trail, tests, docs, and a
clean deploy.

Built with **Next.js 16 (App Router) + TypeScript**, styled by hand, tested with Vitest,
deployed to **Vercel**.

---

*Chokepoint is a named and productized demo. The security reasoning in `lib/` and the
write-up in `SECURITY.md` are the substance — the UI is the proof it runs.*
