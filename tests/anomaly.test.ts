import { describe, it, expect } from "vitest";
import { appendEntry, type LedgerEntry, type AuditEvent } from "../lib/ledger";
import { assessEntry, assessLedger } from "../lib/anomaly";
import { randomUUIDv4 } from "../lib/crypto";

const SECRET = "t";
let n = 0;
function ev(overrides: Partial<AuditEvent>): AuditEvent {
  n++;
  return {
    id: randomUUIDv4(),
    ts: new Date().toISOString(),
    actor: "admin",
    actorRole: "admin",
    action: "login",
    target: "session",
    meta: {},
    ...overrides,
  };
}

function chain(events: AuditEvent[]): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let prev: LedgerEntry | null = null;
  for (const e of events) {
    prev = appendEntry(prev, e, SECRET);
    out.push(prev);
  }
  return out;
}

describe("anomaly detection", () => {
  it("flags a failed login", () => {
    const [c] = chain([ev({ actor: "attacker", action: "login_failed" })]);
    const r = assessEntry(c, []);
    expect(r.signals.some((s) => s.code === "FAILED_LOGIN")).toBe(true);
    expect(r.severity).toBeTruthy();
  });

  it("flags an unknown first-time actor as a new source", () => {
    const c = chain([ev({ actor: "never-before-seen", action: "login" })]);
    const r = assessEntry(c[0], []);
    expect(r.signals.some((s) => s.code === "NEW_SOURCE")).toBe(true);
  });

  it("escalation accumulates over repeated grant events", () => {
    const entries = chain([
      ev({ actor: "op", action: "grant_role", ts: new Date(Date.now() - 30_000).toISOString() }),
      ev({ actor: "op", action: "grant_role" }),
    ]);
    const r = assessEntry(entries[1], entries.slice(0, 1));
    expect(r.signals.some((s) => s.code === "ESCALATION")).toBe(true);
  });

  it("assesses a whole ledger and returns explainable signals", () => {
    const entries = chain([
      ev({ actor: "a", action: "grant_role", ts: new Date(Date.now() - 10_000).toISOString() }),
      ev({ actor: "a", action: "grant_role" }),
    ]);
    const res = assessLedger(entries);
    expect(res.length).toBe(2);
    expect(res[1].signals.length).toBeGreaterThanOrEqual(1);
  });
});
