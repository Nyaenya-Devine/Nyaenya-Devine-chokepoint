/**
 * chokepoint — cryptographic primitives.
 *
 * Everything here is synchronous, dependency-free, and built on node:crypto.
 * The goal is a small, auditable surface: no magic, no third-party crypto.
 *
 * Security notes (what each function is and why):
 *  - hashPassword uses PBKDF2-SHA256 with a per-user random salt. PBKDF2 is
 *    deliberately slow so that guessing a password is expensive. A random salt
 *    makes identical passwords hash differently and defeats rainbow tables.
 *  - hmacSign (HMAC-SHA256) is used for the tamper-evident ledger. HMAC is
 *    keyed, so an attacker who can edit the log cannot re-sign it without the key.
 *  - randomToken (32 bytes, base64url) backs session/agent tokens and the
 *    per-request secrets that make the ledger unforgeable.
 *  - timingSafeEqual is used for all secret comparisons so the app cannot leak
 *    information through timing side channels (OWASP A02).
 */

import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

/** Derived-key length in bytes and PBKDF2 iteration count. */
export const PBKDF2_BYTES = 32;
export const PBKDF2_ROUNDS = 100_000;

/** Base64url is URL- and cookie-safe (no +, /, or = ambiguity). */
export function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/** Constant-time compare. Only compares buffers/strings of equal length. */
export function safeEqual(a: Buffer | string, b: Buffer | string): boolean {
  const ab = typeof a === "string" ? Buffer.from(a) : a;
  const bb = typeof b === "string" ? Buffer.from(b) : b;
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Random 32-byte token, base64url-encoded. Use for session and agent tokens. */
export function randomToken(): string {
  return b64url(randomBytes(32));
}

export function randomUUIDv4(): string {
  return randomUUID();
}

function derive(password: string, salt: Buffer, rounds: number): Buffer {
  return pbkdf2Sync(password, salt, rounds, PBKDF2_BYTES, "sha256");
}

/**
 * PBKDF2-SHA256 password hash.
 * Stored format: "pbkdf2$<rounds>$<salt>$<hash>" — self-describing so we can
 * raise rounds later without breaking existing credentials.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = derive(password, salt, PBKDF2_ROUNDS);
  return `pbkdf2$${PBKDF2_ROUNDS}$${b64url(salt)}$${b64url(hash)}`;
}

/** Verify a password against a stored hash. Timing-safe. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts[0] !== "pbkdf2") return false;
  const rounds = Number(parts[1]);
  const salt = b64urlDecode(parts[2]);
  const expected = b64urlDecode(parts[3]);
  const actual = derive(password, salt, rounds);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * HMAC-SHA256 of a message with a key, returned as hex.
 * Keyed integrity: tampering cannot be re-signed without the key.
 */
export function hmacSign(key: string | Buffer, message: string): string {
  return createHmac("sha256", key).update(message, "utf8").digest("hex");
}

/** SHA-256 of a string, hex. Used for entry hashing and chain verification. */
export function sha256Hex(message: string): string {
  return createHash("sha256").update(message, "utf8").digest("hex");
}

/** Constant-time compare of two hex digests. */
export function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
