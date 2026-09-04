/**
 * chokepoint — session handling.
 *
 * Sessions are carried in an **HttpOnly, SameSite=Strict** cookie so the token
 * is never readable from JavaScript (mitigates XSS token theft). The token is
 * a signed payload (uid|expiry) with an HMAC, so it cannot be forged or edited
 * without the server secret. Expiry is checked on every request.
 *
 * Note: In this Next.js version `cookies()` from next/headers is async.
 *
 * Cookie flags:
 *  - HttpOnly  : JS cannot read it → not exposed to XSS.
 *  - SameSite=Strict : not sent cross-site → CSRF resistance.
 *  - Secure    : only over HTTPS (added in production; Vercel is HTTPS).
 *  - Path=/    : sent to all routes.
 */

import { cookies } from "next/headers";
import { b64urlDecode, b64url, hmacSign, safeEqual } from "./crypto";

const SESSION_COOKIE = "chokepoint_session";
const SESSION_MAX_AGE = 60 * 60; // 1 hour
const SESSION_SECRET =
  process.env.CHOKEPOINT_SESSION_SECRET ??
  "chokepoint-session-dev-secret-rotate-me";

export interface SessionPayload {
  uid: string;
  exp: number; // epoch ms
}

function sign(uid: string, exp: number): string {
  return hmacSign(SESSION_SECRET, `${uid}.${exp}`);
}

function makeToken(payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(payload.uid, payload.exp);
  return `${body}.${sig}`;
}

function parseToken(token: string): SessionPayload | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  const expected = sign(payload.uid, payload.exp);
  if (!safeEqual(sig, expected)) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

/** Set the session cookie (HttpOnly, SameSite=Strict). */
export async function setSessionCookie(uid: string): Promise<void> {
  const payload: SessionPayload = { uid, exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const value = makeToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/** Read and verify the current session; returns uid or null. */
export async function getSessionUid(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = parseToken(token);
  return payload ? payload.uid : null;
}
