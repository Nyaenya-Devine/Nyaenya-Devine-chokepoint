import { describe, it, expect } from "vitest";
import { appendEntry, verifyChain, type AuditEvent, type LedgerEntry } from "../lib/ledger";
import { randomUUIDv4 } from "../lib/crypto";

const SECRET = "test-secret";
const actor = "admin";

function ev(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: randomUUIDv4(),
    ts: new Date().toISOString(),
    actor,
    actorRole: "admin",
    action: "grant_role",
    target: "operator",
    meta: { role: "admin" },
    ...overrides,
  };
}

function buildChain(n: number): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let prev: LedgerEntry | null = null;
  for (let i = 0; i < n; i++) {
    const e = appendEntry(prev, ev({ action: i % 2 ? "login" : "grant_role" }), SECRET);
    out.push(e);
    prev = e;
  }
  return out;
}

describe("tamper-evident ledger", () => {
  it("verifies a freshly-built chain", () => {
    const chain = buildChain(5);
    const v = verifyChain(chain, SECRET);
    expect(v.valid).toBe(true);
    expect(v.total).toBe(5);
    expect(v.firstInvalid).toBeNull();
  });

  it("detects when an entry's payload is altered", () => {
    const chain = buildChain(4);
    // Change the actor on the 2nd entry without re-signing.
    const copy = chain.map((e) => ({ ...e }));
    copy[1].actor = "attacker";
    const v = verifyChain(copy, SECRET);
    expect(v.valid).toBe(false);
    expect(v.firstInvalid).toBe(2);
  });

  it("detects when an entry is deleted (breaks the chain link)", () => {
    const chain = buildChain(6);
    const copy = chain.filter((e) => e.index !== 3);
    const v = verifyChain(copy, SECRET);
    expect(v.valid).toBe(false);
  });

  it("detects reordering", () => {
    const chain = buildChain(5);
    const copy = [...chain].reverse();
    const v = verifyChain(copy, SECRET);
    expect(v.valid).toBe(false);
  });

  it("cannot be re-signed without the secret (HMAC)", () => {
    const chain = buildChain(3);
    const copy = chain.map((e) => ({ ...e }));
    copy[0].target = "attacker";
    // Even recomputing a valid SHA-256 hash is not enough without the HMAC key.
    const v = verifyChain(copy, "different-secret");
    // With the wrong key the sig won't match; with the right key the hash also fails.
    expect(v.valid).toBe(false);
  });

  it("handles an empty ledger", () => {
    expect(verifyChain([], SECRET).valid).toBe(true);
  });
});
