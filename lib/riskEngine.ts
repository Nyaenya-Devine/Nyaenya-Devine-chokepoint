/**
 * Chokepoint - Advanced Agent Risk Scoring Engine (God Mode)
 * 
 * Beyond basic anomaly detection, this engine computes behavioral risk
 * for humans AND AI agents using velocity, privilege creep, impersonation,
 * and cross-actor correlation.
 */

import type { LedgerEntry } from "./ledger";
import type { RiskAssessment, Severity } from "./anomaly";

export interface AgentRiskProfile {
  actor: string;
  actorType: "human" | "agent" | "unknown";
  riskScore: number; // 0-100
  severity: Severity;
  signals: string[];
  velocity: number; // actions per minute
  privilegeEscalations: number;
  afterHoursActions: number;
  failedAuths: number;
  impersonationAttempts: number;
  firstSeen: string;
  lastSeen: string;
  trustDecay: number; // 0-1, lower = less trusted over time if risky
}

export interface FleetRisk {
  overallRisk: number;
  criticalActors: AgentRiskProfile[];
  riskTrend: { hour: string; score: number }[];
  topThreats: string[];
}

function detectActorType(actor: string): "human" | "agent" | "unknown" {
  if (/agent-|bot-|ai-|gpt|claude|llm/i.test(actor)) return "agent";
  if (/unknown|anonymous/i.test(actor)) return "unknown";
  return "human";
}

function calculateTrustDecay(profile: Partial<AgentRiskProfile>, now: number): number {
  // Trust decays faster if recent risky actions
  const baseDecay = 0.95;
  const riskPenalty = (profile.riskScore || 0) / 100 * 0.3;
  const escalationPenalty = (profile.privilegeEscalations || 0) * 0.05;
  return Math.max(0.1, baseDecay - riskPenalty - escalationPenalty);
}

export function buildRiskProfiles(entries: LedgerEntry[]): AgentRiskProfile[] {
  const grouped = new Map<string, LedgerEntry[]>();
  
  for (const e of entries) {
    if (!grouped.has(e.actor)) grouped.set(e.actor, []);
    grouped.get(e.actor)!.push(e);
  }

  const profiles: AgentRiskProfile[] = [];

  for (const [actor, actorEntries] of grouped) {
    const sorted = actorEntries.sort((a, b) => 
      new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    
    const firstSeen = sorted[0]?.ts || new Date().toISOString();
    const lastSeen = sorted[sorted.length - 1]?.ts || new Date().toISOString();
    
    // Velocity: actions in last 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentActions = sorted.filter(e => new Date(e.ts).getTime() > fiveMinAgo).length;
    const velocity = recentActions / 5; // per minute

    const privilegeEscalations = sorted.filter(e => 
      /grant_role|elevate|grant_agent/i.test(e.action)
    ).length;

    const afterHoursActions = sorted.filter(e => {
      const hour = new Date(e.ts).getUTCHours();
      return (hour < 8 || hour >= 18) && /grant|approve|delete|rotate/i.test(e.action);
    }).length;

    const failedAuths = sorted.filter(e => 
      /login_failed|auth_failed/i.test(e.action)
    ).length;

    const impersonationAttempts = sorted.filter(e =>
      /impersonate|spoof|mimic/i.test(e.action) || 
      (e.meta as any)?.impersonation === true
    ).length;

    // Calculate composite risk score
    let score = 0;
    const signals: string[] = [];

    if (velocity > 10) {
      score += 25;
      signals.push(`High velocity: ${velocity.toFixed(1)}/min`);
    }
    if (privilegeEscalations > 2) {
      score += 30;
      signals.push(`Privilege creep: ${privilegeEscalations} escalations`);
    }
    if (afterHoursActions > 0) {
      score += afterHoursActions * 10;
      signals.push(`After-hours ops: ${afterHoursActions}`);
    }
    if (failedAuths > 2) {
      score += failedAuths * 8;
      signals.push(`Failed auths: ${failedAuths}`);
    }
    if (impersonationAttempts > 0) {
      score += 40;
      signals.push(`Impersonation attempts: ${impersonationAttempts}`);
    }
    if (detectActorType(actor) === "unknown") {
      score += 20;
      signals.push("Unknown actor type");
    }
    if (detectActorType(actor) === "agent" && privilegeEscalations > 0) {
      score += 15;
      signals.push("AI agent privilege escalation (OWASP ASI03)");
    }

    score = Math.min(100, score);

    let severity: Severity = "LOW";
    if (score >= 75) severity = "CRITICAL";
    else if (score >= 50) severity = "HIGH";
    else if (score >= 20) severity = "MEDIUM";

    const trustDecay = calculateTrustDecay(
      { riskScore: score, privilegeEscalations },
      Date.now()
    );

    profiles.push({
      actor,
      actorType: detectActorType(actor),
      riskScore: score,
      severity,
      signals,
      velocity,
      privilegeEscalations,
      afterHoursActions,
      failedAuths,
      impersonationAttempts,
      firstSeen,
      lastSeen,
      trustDecay,
    });
  }

  return profiles.sort((a, b) => b.riskScore - a.riskScore);
}

export function calculateFleetRisk(entries: LedgerEntry[]): FleetRisk {
  const profiles = buildRiskProfiles(entries);
  
  const overallRisk = profiles.length 
    ? Math.round(profiles.reduce((s, p) => s + p.riskScore, 0) / profiles.length)
    : 0;

  const criticalActors = profiles.filter(p => p.severity === "CRITICAL" || p.severity === "HIGH").slice(0, 5);

  // Risk trend per hour (last 6 hours)
  const riskTrend: { hour: string; score: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const hourStart = Date.now() - i * 3600000;
    const hourEntries = entries.filter(e => {
      const t = new Date(e.ts).getTime();
      return t >= hourStart && t < hourStart + 3600000;
    });
    const hourProfiles = buildRiskProfiles(hourEntries);
    const avgScore = hourProfiles.length 
      ? hourProfiles.reduce((s, p) => s + p.riskScore, 0) / hourProfiles.length
      : 0;
    riskTrend.push({
      hour: `-${i}h`,
      score: Math.round(avgScore),
    });
  }

  const topThreats = [
    ...new Set(profiles.flatMap(p => p.signals))
  ].slice(0, 5);

  return {
    overallRisk,
    criticalActors,
    riskTrend,
    topThreats,
  };
}
