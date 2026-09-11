/**
 * Chokepoint - Policy Simulation Playground (God Mode)
 * Dry-run mode: test policies against historical ledger without committing
 */

import type { LedgerEntry } from "./ledger";
import type { Role } from "./authz";
import { can } from "./authz";

export interface PolicyTest {
  actor: string;
  actorRole: Role;
  action: string;
  target: string;
  expected: "allow" | "deny";
  reason?: string;
}

export interface SimulationResult {
  test: PolicyTest;
  actual: "allow" | "deny";
  passed: boolean;
  explanation: string;
}

export interface SimulationReport {
  total: number;
  passed: number;
  failed: number;
  results: SimulationResult[];
  wouldBeBlocked: LedgerEntry[];
  wouldBeAllowed: LedgerEntry[];
  riskIfAllowed: number;
}

export function simulatePolicy(
  ledger: LedgerEntry[],
  tests: PolicyTest[]
): SimulationReport {
  const results: SimulationResult[] = [];

  for (const test of tests) {
    const decision = can(test.actorRole as any, test.action as any);
    const actual = decision ? "allow" : "deny";
    const passed = actual === test.expected;

    let explanation = "";
    if (passed) {
      explanation = `Policy correctly ${actual}s ${test.actorRole} -> ${test.action}`;
    } else {
      explanation = `Mismatch: expected ${test.expected} but got ${actual}. Role ${test.actorRole} ${decision ? "has" : "lacks"} permission for ${test.action}`;
    }

    results.push({
      test,
      actual,
      passed,
      explanation,
    });
  }

  // Analyze historical ledger: what would be blocked under current policy?
  const wouldBeBlocked: LedgerEntry[] = [];
  const wouldBeAllowed: LedgerEntry[] = [];

  for (const entry of ledger) {
    // Infer role from actor (simplified - in real system, lookup user)
    const inferredRole = inferRoleFromActor(entry.actor);
    const allowed = can(inferredRole, entry.action as any);
    
    if (!allowed && !/login_failed/.test(entry.action)) {
      wouldBeBlocked.push(entry);
    } else {
      wouldBeAllowed.push(entry);
    }
  }

  // Calculate risk if blocked entries had been allowed
  const riskIfAllowed = Math.min(100, wouldBeBlocked.length * 5 + 
    wouldBeBlocked.filter(e => /grant_role|delete|rotate/.test(e.action)).length * 15
  );

  return {
    total: tests.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
    wouldBeBlocked: wouldBeBlocked.slice(0, 20), // limit for UI
    wouldBeAllowed: wouldBeAllowed.slice(-20),
    riskIfAllowed,
  };
}

function inferRoleFromActor(actor: string): Role {
  if (actor === "admin" || /admin/i.test(actor)) return "admin";
  if (actor === "operator" || /operator/i.test(actor)) return "operator";
  if (actor === "auditor" || /auditor/i.test(actor)) return "auditor";
  return "viewer";
}

export const defaultPolicyTests: PolicyTest[] = [
  {
    actor: "viewer",
    actorRole: "viewer",
    action: "view_log",
    target: "audit",
    expected: "allow",
    reason: "Viewers can view logs"
  },
  {
    actor: "viewer",
    actorRole: "viewer",
    action: "grant_role",
    target: "user",
    expected: "deny",
    reason: "Viewers cannot grant roles"
  },
  {
    actor: "operator",
    actorRole: "operator",
    action: "request_agent_action",
    target: "agent-billing",
    expected: "allow",
    reason: "Operators can request agent actions"
  },
  {
    actor: "operator",
    actorRole: "operator",
    action: "approve",
    target: "agent-refunds",
    expected: "deny",
    reason: "Operators cannot approve (needs admin, distinct approver)"
  },
  {
    actor: "admin",
    actorRole: "admin",
    action: "approve",
    target: "agent-refunds",
    expected: "allow",
    reason: "Admins can approve"
  },
  {
    actor: "agent-billing",
    actorRole: "viewer",
    action: "grant_role",
    target: "operator",
    expected: "deny",
    reason: "AI agents must not escalate privileges (OWASP ASI03)"
  },
];
