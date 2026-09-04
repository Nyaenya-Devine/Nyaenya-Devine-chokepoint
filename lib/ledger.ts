/**
 * chokepoint — tamper-evident audit ledger.
 *
 * This is the heart of the tamper-evidence story. Every audit event is an
 * immutable, *hash-chained* record:
 *
 *   H(entry_n) = SHA256( prevHash || entryId || timestamp || actor || action
 *                                  || target || meta || nonce )
 *   sig_n      = HMAC( secret, H(entry_n) )
 *   entry_n    = { ..., prevHash: H(entry_{n-1}), hash: H(entry_n), sig: sig_n }
 *
 * Why this defeats tampering:
 *  1. Hash chain — every entry commits to the previous entry's hash. Editing,
 *     deleting, or reordering any entry invalidates every entry that follows it.
 *  2. HMAC signature — the hash alone is not enough; even if an attacker
 *     recomputes a valid hash chain, they cannot forge the HMAC without the
 *     keyed secret. Since the secret is stored out-of-band (in the session,
 *     never sent to the client and rotated per request), the log cannot be
 *     silently rewritten end-to-end.
 *  3. Integrity verification — verify() re-runs the whole chain from the
 *     genesis block and reports the first anomaly, so a breach is *provable*.
 *
 * The log is intentionally append-only and in-memory here (a demo). The design
 * ports directly to append-only storage (Postgres/Aerospike immutable records,
 * S3 object-lock, or an external WORM store) without changing the verification
 * contract.
 */

import { hmacSign, safeEqual, sha256Hex, randomToken } from "./crypto";

/** The canonical fields we hash on every entry. Order matters and is fixed. */
export interface AuditEvent {
  id: string;
  ts: string; // ISO-8601 (UTC)
  actor: string; // user / agent id (or "system")
  actorRole: string;
  action: string; // e.g. "login", "grant_role", "approve", "revoke"
  target: string;
  meta: Record<string, unknown>;
}

/** A stored ledger entry: the event plus its chain/signature metadata. */
export interface LedgerEntry extends AuditEvent {
  index: number;
  prevHash: string; // hash of the previous entry
  nonce: string; // ensures unique hashes even for identical events
  hash: string; // SHA256 of the canonical provenance string
  sig: string; // HMAC-SHA256(secret, hash)
}

/** Result of a full-chain verification. */
export interface VerifyResult {
  valid: boolean;
  total: number;
  firstInvalid: number | null;
  reason: string | null;
}

const GENESIS = "0".repeat(64);

/**
 * Build the canonical string that is hashed. Everything that must be
 * tamper-evident appears here; nothing can be altered without changing H(entry).
 */
function provenance(e: Omit<LedgerEntry, "hash" | "sig">): string {
  return [
    e.prevHash,
    e.id,
    e.ts,
    e.actor,
    e.actorRole,
    e.action,
    e.target,
    JSON.stringify(e.meta), // deterministic because meta values are primitives
    e.nonce,
  ].join("|");
}

/**
 * Create a ledger entry by chaining it to the previously appended entry.
 * The secret is a per-request random token that is never persisted or exposed;
 * it makes the HMAC unforgeable even to someone who can read the whole ledger.
 */
export function appendEntry(
  prev: LedgerEntry | null,
  event: AuditEvent,
  secret: string
): LedgerEntry {
  const index = prev ? prev.index + 1 : 1;
  const prevHash = prev ? prev.hash : GENESIS;
  const nonce = randomToken();
  const base: Omit<LedgerEntry, "hash" | "sig"> = {
    ...event,
    index,
    prevHash,
    nonce,
  };
  const canon = provenance(base);
  const hash = sha256Hex(canon);
  const sig = hmacSign(secret, `${canon}|${hash}`);
  return { ...base, hash, sig };
}

/**
 * Verify the integrity of a whole chain from genesis.
 * Recomputes every hash and every HMAC signature and confirms the links.
 * Returns the index of the first invalid entry, or null if the log is intact.
 */
export function verifyChain(
  entries: LedgerEntry[],
  secret: string
): VerifyResult {
  if (entries.length === 0) {
    return { valid: true, total: 0, firstInvalid: null, reason: "empty ledger" };
  }

  // Strict by design: we do NOT re-sort. An out-of-order or gapped index is
  // itself evidence of tampering (insertion, deletion, or reordering).
  let expectedIndex = 1;
  let expectedPrev = GENESIS;
  for (const entry of entries) {
    if (entry.index !== expectedIndex) {
      return {
        valid: false,
        total: entries.length,
        firstInvalid: entry.index,
        reason: `entries must be contiguous in order: expected index ${expectedIndex}, found ${entry.index}`,
      };
    }
    const base: Omit<LedgerEntry, "hash" | "sig"> = {
      id: entry.id,
      ts: entry.ts,
      actor: entry.actor,
      actorRole: entry.actorRole,
      action: entry.action,
      target: entry.target,
      meta: entry.meta,
      index: entry.index,
      prevHash: entry.prevHash,
      nonce: entry.nonce,
    };
    const canon = provenance(base);
    const recomputedHash = sha256Hex(canon);
    const recomputedSig = hmacSign(secret, `${canon}|${recomputedHash}`);

    if (
      !safeEqual(entry.hash, recomputedHash) ||
      !safeEqual(entry.sig, recomputedSig) ||
      entry.prevHash !== expectedPrev
    ) {
      return {
        valid: false,
        total: entries.length,
        firstInvalid: entry.index,
        reason: `integrity failure at entry ${entry.index} (${entry.action})`,
      };
    }
    expectedPrev = entry.hash;
    expectedIndex++;
  }
  return { valid: true, total: entries.length, firstInvalid: null, reason: null };
}
