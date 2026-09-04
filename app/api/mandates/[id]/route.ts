import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { enforceDualControl, type Action, type Role } from "@/lib/authz";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("approve");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const decision = body?.decision === "rejected" ? "rejected" : "approved";

  const mandate = store.mandates.find((m) => m.id === id);
  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
  }
  if (mandate.state !== "pending") {
    return NextResponse.json({ error: `Mandate is already ${mandate.state}.` }, { status: 409 });
  }

  const d = enforceDualControl({
    action: mandate.action as Action,
    requesterRole: (store.getUserById(mandate.requestedBy)?.role ?? "viewer") as Role,
    approverRole: auth.role,
    requesterId: mandate.requestedBy,
    approverId: auth.user.id,
  });
  if (!d.allowed) {
    store.append({
      actor: auth.user.username,
      actorRole: auth.role,
      action: "approve_blocked",
      target: mandate.target,
      meta: { reason: d.reason, mandateId: mandate.id },
    });
    return NextResponse.json({ error: d.reason }, { status: 403 });
  }

  store.decideMandate(mandate.id, auth.user.id, decision);
  store.append({
    actor: auth.user.username,
    actorRole: auth.role,
    action: decision === "approved" ? "approve" : "reject",
    target: mandate.action,
    meta: { mandateId: mandate.id, dualControl: true },
  });
  return NextResponse.json({ mandate, decision });
}
