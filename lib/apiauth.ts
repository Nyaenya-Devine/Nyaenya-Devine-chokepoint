import { NextResponse } from "next/server";
import { getSessionUid } from "./session";
import { store } from "./store";
import { can, type Action, type Role } from "./authz";
import type { User } from "./types";

export interface Authed {
  user: User;
  role: Role;
}

export async function requireAuth(): Promise<Authed | NextResponse> {
  const uid = await getSessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const user = store.getUserById(uid);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return { user, role: user.role };
}

export async function requireRole(action: Action): Promise<Authed | NextResponse> {
  const a = await requireAuth();
  if (a instanceof NextResponse) return a;
  if (!can(a.role, action)) {
    return NextResponse.json(
      { error: `Insufficient privileges: '${action}' is not allowed for '${a.role}'.` },
      { status: 403 }
    );
  }
  return a;
}
