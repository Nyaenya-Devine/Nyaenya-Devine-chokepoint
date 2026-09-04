import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { can, requiresDualControl, type Action } from "@/lib/authz";

/** List open mandates. */
export async function GET() {
  const auth = await requireRole("view_log");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ mandates: store.mandates });
}

/** Request a dual-control mandate for a privileged action. */
export async function POST(req: Request) {
  const auth = await requireRole("run_scan");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body?.action || !body?.target) {
    return NextResponse.json({ error: "action and target required." }, { status: 400 });
  }
  const action = String(body.action) as Action;

  // Dual-control actions may be *proposed* by operator+ but only *executed*
  // after a distinct, authorized approver signs off (separation of duties).
  // Non-dual actions execute immediately but still require direct permission.
  if (!requiresDualControl(action)) {
    if (!can(auth.role, action)) {
      return NextResponse.json({ error: `'${action}' is not permitted for '${auth.role}'.` }, { status: 403 });
    }
    store.append({
      actor: auth.user.username,
      actorRole: auth.role,
      action,
      target: String(body.target),
      meta: { dualControl: false },
    });
    return NextResponse.json({ status: "executed", action }, { status: 200 });
  }

  // Dual-control path: create a mandate awaiting a second signature.
  {
    const mandate = store.createMandate({
      action,
      target: String(body.target),
      requestedBy: auth.user.id,
      reason: String(body.reason ?? ""),
    });
    store.append({
      actor: auth.user.username,
      actorRole: auth.role,
      action: "request_mandate",
      target: String(body.target),
      meta: { mandated: true, mandateId: mandate.id },
    });
    return NextResponse.json({ mandate, status: "pending" }, { status: 201 });
  }
}
