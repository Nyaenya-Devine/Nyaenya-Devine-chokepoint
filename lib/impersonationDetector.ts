/**
 * Chokepoint - Agent Impersonation Detection (God Mode)
 * Detects when AI agents try to impersonate humans or escalate beyond role
 * OWASP Agentic AI Top 10 - ASI03: Identity & Privilege Abuse
 */

import type { LedgerEntry } from "./ledger";

export interface ImpersonationAttempt {
  entry: LedgerEntry;
  type: "agent_as_human" | "human_as_agent" | "role_spoof" | "session_hijack" | "privilege_mimic";
  confidence: number; // 0-1
  explanation: string;
  indicators: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export function detectImpersonation(entries: LedgerEntry[]): ImpersonationAttempt[] {
  const attempts: ImpersonationAttempt[] = [];

  for (const entry of entries) {
    const indicators: string[] = [];
    let type: ImpersonationAttempt["type"] | null = null;
    let confidence = 0;
    let explanation = "";
    let severity: ImpersonationAttempt["severity"] = "LOW";

    // 1. Agent trying to act as human admin
    if (isAgentActor(entry.actor) && isHumanTarget(entry.target) && isPrivilegedAction(entry.action)) {
      type = "agent_as_human";
      confidence = 0.85;
      explanation = `AI agent ${entry.actor} attempted privileged action ${entry.action} on human target ${entry.target}`;
      indicators.push("Agent actor", "Human target", "Privileged action", "OWASP ASI03");
      severity = "CRITICAL";
    }

    // 2. Human trying to act as agent to bypass controls
    if (isHumanActor(entry.actor) && isAgentTarget(entry.target) && /approve|grant/i.test(entry.action)) {
      // Check if human is approving agent's own request (potential collusion)
      const meta = entry.meta as any;
      if (meta?.agentRequest === true || /agent/i.test(entry.target)) {
        type = "human_as_agent";
        confidence = 0.7;
        explanation = `Human ${entry.actor} approving agent action - possible agent-human collusion`;
        indicators.push("Human approver", "Agent request", "Potential collusion");
        severity = "HIGH";
      }
    }

    // 3. Role spoofing - actor claims different role in meta
    const meta = entry.meta as any;
    if (meta?.claimedRole && meta?.actualRole && meta.claimedRole !== meta.actualRole) {
      type = "role_spoof";
      confidence = 0.9;
      explanation = `Role spoofing: claimed ${meta.claimedRole} but actual ${meta.actualRole}`;
      indicators.push("Role mismatch", "Spoofed identity", `Claimed: ${meta.claimedRole}`);
      severity = "CRITICAL";
    }

    // 4. Session hijack - same actor from different IPs rapidly
    if (meta?.ip && meta?.previousIp && meta.ip !== meta.previousIp) {
      const timeDiff = getTimeDiffFromPrevious(entries, entry);
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        type = "session_hijack";
        confidence = 0.75;
        explanation = `Possible session hijack: ${entry.actor} IP changed from ${meta.previousIp} to ${meta.ip} in ${Math.round(timeDiff/1000)}s`;
        indicators.push("IP change", "Rapid switch", "Session anomaly");
        severity = "HIGH";
      }
    }

    // 5. Privilege mimic - low role trying to mimic high role behavior pattern
    if (isLowPrivilegeActor(entry.actor) && isHighPrivilegeAction(entry.action)) {
      // Check if this actor has suddenly started doing admin-like actions
      const recentActions = getRecentActionsForActor(entries, entry.actor, 10);
      const adminLikeCount = recentActions.filter(a => isHighPrivilegeAction(a.action)).length;
      
      if (adminLikeCount >= 3) {
        type = "privilege_mimic";
        confidence = 0.65;
        explanation = `Privilege mimicry: low-privilege actor ${entry.actor} performing ${adminLikeCount} high-privilege actions`;
        indicators.push("Low privilege actor", "High privilege actions", "Behavioral anomaly", "Privilege creep");
        severity = "MEDIUM";
      }
    }

    if (type) {
      attempts.push({
        entry,
        type,
        confidence,
        explanation,
        indicators,
        severity,
      });
    }
  }

  return attempts.sort((a, b) => b.confidence - a.confidence);
}

function isAgentActor(actor: string): boolean {
  return /agent|bot|ai-|gpt|claude|llm|automation/i.test(actor);
}

function isHumanActor(actor: string): boolean {
  return !isAgentActor(actor) && !/unknown|anonymous/i.test(actor);
}

function isHumanTarget(target: string): boolean {
  return /user|human|operator|admin|auditor|viewer/i.test(target) || !isAgentTarget(target);
}

function isAgentTarget(target: string): boolean {
  return /agent/i.test(target);
}

function isPrivilegedAction(action: string): boolean {
  return /grant_role|elevate|approve|delete|rotate|revoke|grant_agent/i.test(action);
}

function isLowPrivilegeActor(actor: string): boolean {
  return /viewer|auditor/i.test(actor);
}

function isHighPrivilegeAction(action: string): boolean {
  return /grant_role|elevate|delete|rotate|revoke|grant_agent|approve/i.test(action);
}

function getTimeDiffFromPrevious(entries: LedgerEntry[], current: LedgerEntry): number {
  const sorted = entries
    .filter(e => e.actor === current.actor)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  
  const idx = sorted.findIndex(e => e.id === current.id);
  if (idx > 0) {
    return new Date(current.ts).getTime() - new Date(sorted[idx - 1].ts).getTime();
  }
  return Infinity;
}

function getRecentActionsForActor(entries: LedgerEntry[], actor: string, count: number): LedgerEntry[] {
  return entries
    .filter(e => e.actor === actor)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, count);
}
