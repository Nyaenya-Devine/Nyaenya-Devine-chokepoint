/**
 * chokepoint — anomaly detection.
 *
 * Risk scoring over a stream of audit events. The engine is deliberately
 * explainable: each check yields a *reason* (not a black-box score), which is
 * what a security team needs for triage and what a hiring manager needs to see.
 *
 * Signal → reason mapping:
 *  - Failed login              → brute-force / credential-stuffing
 *  - After-hours privilege act → out-of-policy timing
 *  - Unknown/new device agent  → unregistered source
 *  - Rapid privilege escalation→ privilege escalation / privilege creep
 *  - Sensitive action by admin → high-value target
 *  - Excessive actions/minute  → possible automated abuse
 *
 * Scores: 0-1. Thresholds classify as LOW/MEDIUM/HIGH/CRITICAL.
 */

import type { LedgerEntry } from "./ledger";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskSignal {
  code: string;
  label: string;
  weight: number;
  reason: string;
}

export interface RiskAssessment {
  entryIndex: number;
  actor: string;
  action: string;
  score: number; // 0..1
  severity: Severity;
  signals: RiskSignal[];
}

// Business-hours window (UTC for the demo) — the "chokepoint" policy.
const BUSINESS_START = 8; // 08:00 UTC
const BUSINESS_END = 18; // 18:00 UTC

function classify(score: number): Severity {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.5) return "HIGH";
  if (score >= 0.2) return "MEDIUM";
  return "LOW";
}

/** Basic rate tracker: recent actions per actor within a window. */
function rateOf(
  entries: LedgerEntry[],
  actor: string,
  withinMs: number,
  windowSeconds: number
): number {
  const cutoff = Date.now() - withinMs;
  let count = 0;
  for (const e of entries) {
    if (e.actor !== actor) continue;
    const t = new Date(e.ts).getTime();
    if (t >= cutoff && t <= Date.now()) count++;
  }
  return count / windowSeconds;
}

export function assessEntry(
  entry: LedgerEntry,
  history: LedgerEntry[]
): RiskAssessment {
  const signals: RiskSignal[] = [];
  const ts = new Date(entry.ts);
  const hour = ts.getUTCHours();

  // 1. Failed login — brute-force indicator.
  if (/login_failed|auth_failed/i.test(entry.action)) {
    signals.push({
      code: "FAILED_LOGIN",
      label: "Failed authentication",
      weight: 0.35,
      reason: `Failed authentication by ${entry.actor}.`,
    });
  }

  // 2. After-hours privilege change / sensitive action.
  const privilegedAction = /grant_role|elevate|approve|revoke|rotate|delete|grant_agent/i.test(
    entry.action
  );
  if (privilegedAction && (hour < BUSINESS_START || hour >= BUSINESS_END)) {
    signals.push({
      code: "AFTER_HOURS",
      label: "Out-of-hours privileged action",
      weight: 0.3,
      reason: `${entry.action} occurred at ${ts.toISOString()} (UTC).`,
    });
  }

  // 3. Unknown source — treat a fresh actor not present in prior history as new.
  const seenBefore = history.some(
    (e) =>
      e.actor === entry.actor && new Date(e.ts).getTime() < ts.getTime()
  );
  if (!seenBefore) {
    signals.push({
      code: "NEW_SOURCE",
      label: "Unknown actor/source",
      weight: 0.25,
      reason: `First activity from ${entry.actor} in the observed window.`,
    });
  }

  // 4. Rapid privilege escalation: a second+ elevation for the same principal.
  const priorEscalations = history.filter(
    (e) =>
      e.actor === entry.actor &&
      new Date(e.ts).getTime() <= ts.getTime() &&
      /grant_role|elevate/i.test(e.action)
  );
  if (/grant_role|elevate/i.test(entry.action) && priorEscalations.length >= 1) {
    signals.push({
      code: "ESCALATION",
      label: "Rapid privilege escalation",
      weight: 0.4,
      reason: `Repeated elevation events for ${entry.actor}.`,
    });
  }

  // 5. High-value target: admin granting wide-access or deleting data.
  if (/grant_agent|revoke|delete|rotate/.test(entry.action)) {
    signals.push({
      code: "HIGH_VALUE",
      label: "High-value target",
      weight: 0.3,
      reason: `Sensitive operation '${entry.action}' against '${entry.target}'.`,
    });
  }

  // 6. Excessive action rate.
  const rpm = rateOf(history, entry.actor, 60_000, 60);
  if (rpm > 20) {
    signals.push({
      code: "RATE",
      label: "Excessive action rate",
      weight: 0.25,
      reason: `${rpm.toFixed(0)} actions/min from ${entry.actor}.`,
    });
  }

  const score = Math.min(1, signals.reduce((s, x) => s + x.weight, 0));
  return {
    entryIndex: entry.index,
    actor: entry.actor,
    action: entry.action,
    score,
    severity: classify(score),
    signals,
  };
}

/** Assess a whole ledger and return per-entry assessments, newest first. */
export function assessLedger(entries: LedgerEntry[]): RiskAssessment[] {
  const ordered = [...entries].sort((a, b) => a.index - b.index);
  return ordered.map((e, i) => assessEntry(e, ordered.slice(0, i)));
}
