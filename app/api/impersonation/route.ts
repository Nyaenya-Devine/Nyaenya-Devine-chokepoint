import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { detectImpersonation } from "@/lib/impersonationDetector";

export async function GET() {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  const attempts = detectImpersonation(store.ledger);

  return NextResponse.json({
    attempts,
    total: attempts.length,
    critical: attempts.filter(a => a.severity === "CRITICAL").length,
    high: attempts.filter(a => a.severity === "HIGH").length,
    generatedAt: new Date().toISOString(),
  });
}
