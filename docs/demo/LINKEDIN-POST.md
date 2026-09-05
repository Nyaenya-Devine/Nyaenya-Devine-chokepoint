# Chokepoint — LinkedIn post draft (copy/paste ready)

**What to copy below the line.** Where to put it: LinkedIn → **Create a post**. Add your URL (auto-links) and any emoji you like. Tag Companies/Skills at the bottom.

---

I’ve been building toward a specific, uncomfortable question in security: **how do you let a person — or increasingly an AI agent — perform a high-impact action, without giving anyone enough authority to abuse it? And how do you *prove* who did what afterwards?**

So I built **Chokepoint** — a least-privilege access-control + tamper-evident audit platform, live and running:

🔗 **https://nyaenya-devine-chokepoint.vercel.app** — sign in with a demo account, no signup (admin / admin1234).

What’s inside:
• **A data-rich command-center dashboard** — live risk index, real-time risk-trend chart, severity donut, activity timeline, action breakdown, live alerts and a tamper-evident audit trail, all fed straight from the hash-chained ledger.
• **Role-based access control** (viewer / auditor / operator / admin) — least privilege, default-deny on every route.
• **Dual-control (two-person rule)** — irreversible actions need a *second, distinct, authorized* approver. A person can’t approve their own change.
• **Tamper-evident audit log** — every event is SHA-256 hash-chained **and** HMAC-signed. Edit, delete, or reorder an entry and the whole chain breaks — provably.
• **Explainable anomaly detection** — failed logins, after-hours privilege changes, unknown sources, privilege escalation, and agent over-reach, each surfaced with a human-readable reason.

Built on **Next.js 16 + TypeScript**, with **26 automated tests** proving the security properties hold (the audit chain detects tampering, dual-control can’t be bypassed), a full threat model documented in-app (`/security`), and **0 npm audit vulnerabilities**.

🎬 **28s product demo** (voiceover + original synthesized music, no copyright risk): **`docs/demo/chokepoint-demo.mp4`** (16:9 YouTube/LinkedIn) and **`chokepoint-demo-vertical.mp4`** (9:16 for Shorts/Reels/TikTok).

It’s my response to the **2026 OWASP Agentic AI Top 10** — specifically **ASI03: Identity & Privilege Abuse**, the most common enterprise failure in agentic systems.

After 10+ years in operations, accounting, and client support, I’ve learned that a lot of good security work comes down to **accuracy, trust, and control** — and that skill maps directly onto the agentic-AI problem. I’m looking for a role in **application security / security engineering / security operations**, and I’m open to conversations.

#security #cybersecurity #appsec #OWASP #AgenticAI #ZeroTrust #Infosec

---

## Optional: a shorter "hook" version

If you want something snappier that still lands, use this body instead:

> **Chokepoint** — a security platform where an AI agent (or a person) can *never* act alone on an irreversible action, and every step is cryptographically provable.
>
> ▪ RBAC default-deny (Admin/Operator/Auditor/Viewer)
> ▪ Dual-control / two-person rule — distinct approver required
> ▪ Tamper-evident hash-chained + HMAC-signed audit log
> ▪ Explainable anomaly detection (brute force, after-hours, escalation, agent over-reach)
>
> Live demo (no signup): https://nyaenya-devine-chokepoint.vercel.app
> Built on Next.js 16 + TS · 26 tests · 0 vulns · mapped to OWASP Agentic AI ASI03.
>
> Open to AppSec / security-engineering / SecOps roles. #security #appsec #AgenticAI #OWASP

---

## Posting tips
- **Edit the placeholder** in the first line ("I've been building toward...") to your own voice if you prefer.
- **Pin the URL** as the first thing people can click; LinkedIn will auto-preview it.
- **Upload the demo video** (`docs/demo/chokepoint-demo.mp4`) or the architecture diagram (`chokepoint/public/architecture-hi.png`) or a screenshot of the new dashboard as the image — visuals get far more engagement. On a text/PDF-post you can attach the 16:9 video to the post.
- **Add the skill tags** (Application Security, OWASP, ...) under "Add skills" so recruiters find you.
- **Post on a weekday morning** (Tue–Thu, ~8–10am) for best reach.
