/**
 * chokepoint — in-memory application store (server-only).
 *
 * Holds users, the tamper-evident ledger, and pending dual-control mandates.
 * Seeded on first access so a recruiter can log in and see a live, coherent
 * state immediately. The ledger signing key comes from the environment in
 * production (CHOKEPOINT_SECRET) with a dev fallback so the demo runs out of
 * the box. In production the key must be set via env and never exposed.
 *
 * This uses a module-level singleton guarded by globalThis so it survives
 * Next.js HMR in dev. In a serverless environment (Vercel) each warm instance
 * holds its own copy — acceptable for a demo; the *design* (hash chain + HMAC)
 * is what makes the audit trail tamper-evident, and it ports unchanged to an
 * append-only database in production.
 */

import "server-only";
import { hashPassword, randomToken, randomUUIDv4 } from "./crypto";
import { appendEntry, verifyChain, type LedgerEntry } from "./ledger";
import { assessLedger } from "./anomaly";
import type { AppState, Mandate, PublicUser, User } from "./types";
import type { Role } from "./authz";

const LEDGER_SECRET =
  process.env.CHOKEPOINT_SECRET ??
  "chokepoint-demo-secret-not-for-production-please-rotate";

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

/** Build the deterministic seed users. Passwords are shown in the demo UI. */
function seedUsers(): User[] {
  return [
    {
      id: "u-admin",
      username: "admin",
      displayName: "Nia Owiti",
      role: "admin",
      passwordHash: hashPassword("admin1234"),
      active: true,
      createdAt: hoursAgo(24 * 60),
      lastLoginAt: hoursAgo(1),
    },
    {
      id: "u-op",
      username: "operator",
      displayName: "Dmitri Kovac",
      role: "operator",
      passwordHash: hashPassword("operator1234"),
      active: true,
      createdAt: hoursAgo(24 * 40),
      lastLoginAt: hoursAgo(3),
    },
    {
      id: "u-auditor",
      username: "auditor",
      displayName: "Tendai Moyo",
      role: "auditor",
      passwordHash: hashPassword("auditor1234"),
      active: true,
      createdAt: hoursAgo(24 * 30),
      lastLoginAt: hoursAgo(20),
    },
    {
      id: "u-viewer",
      username: "viewer",
      displayName: "Samir Patel",
      role: "viewer",
      passwordHash: hashPassword("viewer1234"),
      active: true,
      createdAt: hoursAgo(24 * 10),
      lastLoginAt: hoursAgo(5),
    },
  ];
}

interface SeedEvent {
  ts: string;
  actor: string;
  actorRole: Role;
  action: string;
  target: string;
  meta: Record<string, unknown>;
}

/** Realistic history: includes failed logins, after-hours, escalation, high-value ops. */
function seedEvents(): SeedEvent[] {
  const now = Date.now();
  const at = (mins: number) => new Date(now - mins * 60_000).toISOString();
  return [
    // --- Normal morning activity (window opens) ---
    { ts: at(180), actor: "admin", actorRole: "admin", action: "login", target: "session", meta: { method: "password", ok: true } },
    { ts: at(178), actor: "operator", actorRole: "operator", action: "login", target: "session", meta: { method: "password", ok: true } },
    { ts: at(170), actor: "operator", actorRole: "operator", action: "run_scan", target: "agent-billing", meta: { scope: "read", results: 4 } },
    { ts: at(150), actor: "operator", actorRole: "operator", action: "request_agent_action", target: "agent-refunds", meta: { scope: "approve" } },
    { ts: at(120), actor: "admin", actorRole: "admin", action: "approve", target: "agent-refunds", meta: { mandate: "pending" } },

    // --- Suspicious block: attempted privilege escalation ---
    { ts: at(95), actor: "operator", actorRole: "operator", action: "grant_role", target: "operator", meta: { role: "admin", requester: "operator" } },
    { ts: at(93), actor: "operator", actorRole: "operator", action: "grant_role", target: "auditor", meta: { role: "admin", requester: "operator" } },
    { ts: at(92), actor: "operator", actorRole: "operator", action: "grant_role", target: "unknown-user", meta: { role: "admin" } },

    // --- Failed logins (brute-force indicator) ---
    { ts: at(70), actor: "unknown-agent", actorRole: "viewer", action: "login_failed", target: "session", meta: { ip: "196.201.214.12" } },
    { ts: at(68), actor: "unknown-agent", actorRole: "viewer", action: "login_failed", target: "session", meta: { ip: "102.214.88.7" } },
    { ts: at(66), actor: "operator", actorRole: "operator", action: "login_failed", target: "session", meta: { ip: "102.214.88.7" } },

    // --- After-hours high-value actions ---
    { ts: at(20), actor: "admin", actorRole: "admin", action: "rotate_secret", target: "agent-billing", meta: { scope: "critical" } },
    { ts: at(12), actor: "admin", actorRole: "admin", action: "grant_agent", target: "agent-refunds", meta: { scope: "write", hours: "after" } },
    { ts: at(8), actor: "auditor", actorRole: "auditor", action: "export_log", target: "audit", meta: { format: "json" } },

    // --- Recent successful access ---
    { ts: at(4), actor: "viewer", actorRole: "viewer", action: "login", target: "session", meta: { method: "password", ok: true } },
    { ts: at(2), actor: "viewer", actorRole: "viewer", action: "view_log", target: "audit", meta: {} },
  ];
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

class Store {
  users: User[] = [];
  ledger: LedgerEntry[] = [];
  mandates: Mandate[] = [];
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.users = seedUsers();
    const pendingMandate = this.seedMandates();

    // Build the ledger by chaining each seed event.
    let prev: LedgerEntry | null = null;
    for (const e of seedEvents()) {
      const entry = appendEntry(prev, { ...e, id: randomUUIDv4() }, LEDGER_SECRET);
      this.ledger.push(entry);
      prev = entry;
    }
    this.mandates = pendingMandate;
  }

  private seedMandates(): Mandate[] {
    return [
      {
        id: randomUUIDv4(),
        action: "grant_role",
        target: "operator",
        requestedBy: "u-op",
        approverId: null,
        state: "pending",
        createdAt: hoursAgo(0.2),
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        reason: "Escalate operator to admin for incident response window.",
      },
    ];
  }

  /* ---- Auth ---- */
  getUserByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }
  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }
  toPublic(u: User): PublicUser {
    const { passwordHash: _drop, ...pub } = u;
    return pub;
  }
  publicUsers(): PublicUser[] {
    return this.users.map((u) => this.toPublic(u));
  }

  /* ---- Ledger ---- */
  append(event: {
    actor: string;
    actorRole: Role;
    action: string;
    target: string;
    meta: Record<string, unknown>;
  }): LedgerEntry {
    const prev = this.ledger[this.ledger.length - 1] ?? null;
    const entry = appendEntry(prev, { id: randomUUIDv4(), ts: new Date().toISOString(), ...event }, LEDGER_SECRET);
    this.ledger.push(entry);
    return entry;
  }

  verify() {
    return verifyChain(this.ledger, LEDGER_SECRET);
  }

  /** Latest `n` entries, newest first. */
  recent(n: number): LedgerEntry[] {
    return [...this.ledger].slice(-n).reverse();
  }

  /** Assessments over the full ledger, newest first. */
  risks() {
    return assessLedger(this.ledger).reverse();
  }

  riskSummary() {
    const risks = this.risks();
    const counts: Record<string, number> = {};
    for (const r of risks) counts[r.severity] = (counts[r.severity] ?? 0) + 1;
    return {
      total: risks.length,
      critical: counts.CRITICAL ?? 0,
      high: counts.HIGH ?? 0,
      medium: counts.MEDIUM ?? 0,
      low: counts.LOW ?? 0,
      riskIndex: Math.round(
        (risks.reduce((s, r) => s + r.score, 0) / Math.max(1, risks.length)) * 100
      ),
    };
  }

  /**
   * Rich, derived data for the command-center dashboard.
   * Everything here is computed from the live (tamper-evident) ledger, so the
   * visuals reflect the real chain — not hardcoded numbers.
   */
  dashboard() {
    const ordered = [...this.ledger].sort((a, b) => a.index - b.index);
    const risks = assessLedger(this.ledger); // index order

    // Risk-trend series: per-entry score, useful as an area/sparkline.
    const trend = risks.map((r) => ({
      index: r.entryIndex,
      score: r.score,
      severity: r.severity,
    }));

    // Action-category breakdown (horizontal bars).
    const actions: Record<string, number> = {};
    for (const e of ordered) {
      const key = actionCategory(e.action);
      actions[key] = (actions[key] ?? 0) + 1;
    }
    const actionBreakdown = Object.entries(actions)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    // Events in the last 6 buckets of 10 minutes (activity timeline).
    const buckets = 6;
    const bucketMs = 10 * 60_000;
    const now = Date.now();
    const activity: { label: string; count: number; risky: number }[] = [];
    for (let i = buckets - 1; i >= 0; i--) {
      const start = now - (i + 1) * bucketMs;
      const end = start + bucketMs;
      let count = 0;
      let risky = 0;
      for (const e of ordered) {
        const t = new Date(e.ts).getTime();
        if (t >= start && t < end) {
          count++;
          if (/login_failed|grant_role|rotate_secret|revoke|delete|elevate/.test(e.action)) risky++;
        }
      }
      activity.push({ label: `${-i * 10}m`, count, risky });
    }

    // Top severity signals (drives the "live alerts" feed).
    const topAlerts = this.risks()
      .filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH" || r.severity === "MEDIUM")
      .slice(0, 6);

    return {
      trend,
      actionBreakdown,
      activity,
      topAlerts,
      totals: {
        events: ordered.length,
        logins: actionBreakdown.find((a) => a.label === "Auth")?.count ?? 0,
        privileged: actionBreakdown.filter((a) => ["Privilege", "Dual-control"].includes(a.label)).reduce((s, a) => s + a.count, 0),
      },
    };
  }

  /* ---- Mandates ---- */
  createMandate(params: {
    action: string;
    target: string;
    requestedBy: string;
    reason: string;
  }): Mandate {
    const mandate: Mandate = {
      id: randomUUIDv4(),
      action: params.action,
      target: params.target,
      requestedBy: params.requestedBy,
      approverId: null,
      state: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      reason: params.reason,
    };
    this.mandates.unshift(mandate);
    return mandate;
  }

  decideMandate(id: string, approverId: string, decision: "approved" | "rejected"): Mandate | undefined {
    const m = this.mandates.find((x) => x.id === id);
    if (m) {
      m.state = decision;
      m.approverId = approverId;
    }
    return m;
  }

  /* ---- Sessions ---- */
  createSession(userId: string): { token: string; expiresAt: string } {
    const token = randomToken();
    return { token, expiresAt: new Date(Date.now() + 60 * 60_000).toISOString() };
  }

  /** Clear for a fresh demo. */
  reset(): void {
    this.initialized = false;
    this.users = [];
    this.ledger = [];
    this.mandates = [];
    this.init();
  }
}

/** Bucket an audit action into a coarse category for the breakdown chart. */
function actionCategory(action: string): string {
  if (/login_failed|auth_failed/.test(action)) return "Failed auth";
  if (/login/.test(action)) return "Auth";
  if (/grant_agent|request_agent_action/.test(action)) return "Agent";
  if (/grant_role|elevate|revoke|rotate|delete/.test(action)) return "Privilege";
  if (/approve|reject|request_mandate|approve_blocked/.test(action)) return "Dual-control";
  if (/scan/.test(action)) return "Scan";
  if (/verify_integrity/.test(action)) return "Verify";
  if (/export/.test(action)) return "Export";
  if (/view_log/.test(action)) return "View";
  return "Other";
}

// Module singleton that survives HMR.
const globalAny = globalThis as unknown as { __chokepointStore?: Store };
export const store: Store = globalAny.__chokepointStore ?? new Store();
globalAny.__chokepointStore = store;

export { LEDGER_SECRET };
