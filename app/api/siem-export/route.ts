import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { generateExport, type ExportFormat } from "@/lib/siemExport";
import { assessLedger } from "@/lib/anomaly";

export async function GET(req: NextRequest) {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") as ExportFormat) || "json";
  const includeRisk = searchParams.get("includeRisk") !== "false";

  const risks = assessLedger(store.ledger);
  
  const result = generateExport(store.ledger, risks, {
    format,
    includeRisk,
  });

  return new NextResponse(result.content, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="chokepoint-audit-${Date.now()}.${result.extension}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
