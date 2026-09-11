import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";
import { simulatePolicy, defaultPolicyTests } from "@/lib/policySimulator";

export async function GET() {
  const auth = await requireRole("view_dashboard");
  if (auth instanceof NextResponse) return auth;

  const report = simulatePolicy(store.ledger as any, defaultPolicyTests);

  return NextResponse.json({
    ...report,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("approve");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    let tests = body.tests || defaultPolicyTests;
    // Allow shortcut strings for UI — map to default tests
    if (Array.isArray(tests) && tests.length && typeof tests[0] === "string") {
      const map: Record<string, typeof defaultPolicyTests> = {
        privilege_escalation: defaultPolicyTests.filter(t => /grant_role/.test(t.action)),
        dual_approval_bypass: defaultPolicyTests.filter(t => t.action === "approve"),
        agent_abuse: defaultPolicyTests.filter(t => t.actor.startsWith("agent")),
        all: defaultPolicyTests,
      };
      const expanded: typeof defaultPolicyTests = [];
      for (const s of tests as string[]) {
        if (map[s]) expanded.push(...map[s]);
      }
      tests = expanded.length ? expanded : defaultPolicyTests;
    }

    const report = simulatePolicy(store.ledger as any, tests as any);

    return NextResponse.json({
      ...report,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
