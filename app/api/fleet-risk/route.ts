import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { calculateFleetRisk, buildRiskProfiles } from "@/lib/riskEngine";

export async function GET() {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  const fleetRisk = calculateFleetRisk(store.ledger);
  const profiles = buildRiskProfiles(store.ledger);

  return NextResponse.json({
    fleetRisk,
    profiles,
    generatedAt: new Date().toISOString(),
  });
}
