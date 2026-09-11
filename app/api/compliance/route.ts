import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { generateComplianceReport } from "@/lib/complianceMapper";

export async function GET() {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  const report = generateComplianceReport(store.ledger);

  return NextResponse.json({
    ...report,
    generatedAt: new Date().toISOString(),
  });
}
