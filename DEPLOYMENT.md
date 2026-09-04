# Chokepoint — Deployment & Hosting Notes

This document records exactly how Chokepoint is hosted, the one gotcha that bit
the initial deploy, and the path to a cleaner custom domain. Keep it in the repo
so the setup isn't rediscovered each time.

---

## Canonical URLs (as of initial deploy)

| What | URL |
| --- | --- |
| **Live app** | `https://nyaenya-devine-chokepoint.vercel.app` |
| **Repo** | `https://github.com/Nyaenya-Devine/Nyaenya-Devine-chokepoint` |
| **Security write-up** | `https://nyaenya-devine-chokepoint.vercel.app/security` |
| **Architecture diagram** | `https://nyaenya-devine-chokepoint.vercel.app/architecture.svg` |

> **Heads-up:** the bare `https://chokepoint.vercel.app` hostname is **NOT this
> project**. It is already owned by a different account's Lovable-generated
> placeholder app (it serves `<title>Lovable App</title>`). Because `.vercel.app`
> hostnames are globally unique, that name cannot be claimed. Do not link to it
> or try to "take it over" — it will show the wrong app.

---

## How it's deployed

- **Platform:** Vercel (Next.js auto-detected, `npm run build` + `next start`).
- **Branch:** `main` / repo `Nyaenya-Devine-chokepoint`.
- **Framework:** Next.js 16.3.4 (App Router, Turbopack).
- **Runtime env vars (set in Vercel for Production + Preview):**
  - `CHOKEPOINT_SECRET` — key used to HMAC-sign audit entries.
  - `CHOKEPOINT_SESSION_SECRET` — key used to sign the session cookie.
  - Generate both with `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
  - In dev they fall back to demo values so the app runs out of the box.

- **Build settings:** root directory `/`, framework Next.js, default build command.
  (Add `npm run build` and output `.next` if not auto-detected.)

---

## The one deploy gotcha: "Couldn't find any `pages` or `app` directory"

**Symptom (Vercel build log):**
```
Error: Couldn't find any `pages` or `app` directory. Please create one under the project root
Error: Command "npm run build" exited with 1
```

**Cause:** The GitHub repo that Vercel cloned contained only the loose config
files (`package.json`, `tsconfig.json`, `next.config.mjs`, `vercel.json`) but was
**missing the `app/`, `components/`, `lib/`, `public/`, and `tests/` source
directories**. Next.js detected the framework from `package.json`, then failed at
build time because the source tree wasn't there.

**Fix:** Make sure the **entire** source tree is committed and pushed to the repo
root. Verify with:
```bash
git ls-files | grep -E 'app/|components/|lib/|public/|tests/'
```
All of those must appear. Then redeploy — no config change needed.

**How I caught it:** the commit Vercel cloned (`c760434`) didn't match the local
history, and the repo root via the GitHub API listed only loose files. Pushing the
complete source resolved it.

---

## Domain / hosting decisions (important)

- **Do NOT "Redirect old domain" or "Remove old domain"** toward `chokepoint.vercel.app`.
  That hostname belongs to another account's app. Removing `nyaenya-devine-chokepoint`
  would break every link that points to the real app.

- **Keep `nyaenya-devine-chokepoint.vercel.app` as the canonical production URL.** It
  is clean, professional, on Vercel's domain, and working.

### If you want a branded name (recommended for a portfolio)
Add a **custom domain you own**, e.g. `chokepoint.dev` or `chokepoint.app` (~$10/yr):
1. Buy the domain (Namecheap / Porkbun / Cloudflare registrar).
2. Vercel → chokepoint project → **Settings → Domains** → **Add** `chokepoint.dev`.
3. Follow Vercel's DNS instructions at your registrar (add an `A` record to
   `76.76.21.21` and a `CNAME`/`TXT` for verification).
4. Optionally add `www.chokepoint.dev` and set it to redirect to the apex.
5. Update the README + GitHub profile to the new URL.

---

## Redeploy after a code change

Push to `main` → Vercel auto-deploys. To verify the live site:
```
# login, dashboard, audit verification, dual-control flow
curl -s -X POST https://nyaenya-devine-chokepoint.vercel.app/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin1234"}'
```
Then open `https://nyaenya-devine-chokepoint.vercel.app` and sign in.

---

## Env var (secret) management

- Set secrets in **Vercel → Project → Settings → Environment Variables** for both
  **Production** and **Preview**.
- Never commit real secrets. `.gitignore` already excludes `.env*`.
- Rotate by regenerating the values and updating Vercel (old session cookies will
  be invalidated — expected).
