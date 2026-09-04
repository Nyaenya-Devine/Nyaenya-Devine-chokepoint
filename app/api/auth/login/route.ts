import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/crypto";
import { store } from "@/lib/store";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = store.getUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    // Failed login is itself a risk signal we record.
    store.append({
      actor: username || "unknown",
      actorRole: "viewer",
      action: "login_failed",
      target: "session",
      meta: { method: "password", ok: false, ip: "demo" },
    });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!user.active) {
    return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
  }

  await setSessionCookie(user.id);
  store.append({
    actor: user.username,
    actorRole: user.role,
    action: "login",
    target: "session",
    meta: { method: "password", ok: true },
  });

  return NextResponse.json({ ok: true, user: store.toPublic(user) });
}
