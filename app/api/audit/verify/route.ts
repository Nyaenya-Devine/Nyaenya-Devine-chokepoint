import { NextResponse } from "next/server";
import { store, LEDGER_SECRET } from "@/lib/store";
import { verifyChain } from "@/lib/ledger";
import { requireRole } from "@/lib/apiauth";

export async function POST() {
  const auth = await requireRole("verify_integrity");
  if (auth instanceof NextResponse) return auth;

  const result = verifyChain(store.ledger, LEDGER_SECRET);
  // Log the verification itself (auditors love this).
  store.append({
    actor: auth.user.username,
    actorRole: auth.role,
    action: "verify_integrity",
    target: "audit-chain",
    meta: { valid: result.valid, total: result.total },
  });
  return NextResponse.json(result);
}
