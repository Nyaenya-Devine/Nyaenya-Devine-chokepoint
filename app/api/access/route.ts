import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { minRoleFor, requiresDualControl, DUAL_CONTROL_ACTIONS } from "@/lib/authz";

export async function GET() {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    users: store.publicUsers(),
    mandates: store.mandates,
    dualControlActions: [...DUAL_CONTROL_ACTIONS],
  });
}

/** Save a fresh audit entry for an access-control action (allowed for any signed-in user on its own action). */
export async function POST(req: Request) {
  const auth = await requireRole("run_scan");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  if (!body?.action || !body?.target) {
    return NextResponse.json({ error: "action and target required." }, { status: 400 });
  }
  const entry = store.append({
    actor: auth.user.username,
    actorRole: auth.role,
    action: String(body.action),
    target: String(body.target),
    meta: { ...(body.meta ?? {}), dualControl: requiresDualControl(body.action) },
  });
  return NextResponse.json({ entry });
}
