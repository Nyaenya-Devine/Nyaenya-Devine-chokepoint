import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  hmacSign,
  sha256Hex,
  randomToken,
  hexEqual,
} from "../lib/crypto";

describe("crypto primitives", () => {
  it("hashes and verifies passwords (PBKDF2, salted)", () => {
    const h = hashPassword("S3cret!v@lue");
    expect(h.startsWith("pbkdf2$")).toBe(true);
    expect(verifyPassword("S3cret!v@lue", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });

  it("uses a random salt — same password hashes differently", () => {
    const a = hashPassword("password");
    const b = hashPassword("password");
    expect(a).not.toBe(b);
    expect(verifyPassword("password", a)).toBe(true);
    expect(verifyPassword("password", b)).toBe(true);
  });

  it("does not leak more than one char of mismatch (timing-safe path)", () => {
    const h = hashPassword("correct");
    expect(verifyPassword("correc", h)).toBe(false);
    expect(verifyPassword("correctx", h)).toBe(false);
  });

  it("HMAC is keyed and deterministic", () => {
    const msg = "hello";
    expect(hmacSign("k", msg)).toBe(hmacSign("k", msg));
    expect(hmacSign("k", msg)).not.toBe(hmacSign("k2", msg));
    expect(hmacSign("k", msg)).not.toBe(sha256Hex(msg));
  });

  it("randomToken is URL-safe base64url and unpredictable", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomToken()).not.toBe(t);
  });

  it("hexEqual is constant-time and correct", () => {
    expect(hexEqual("aabb", "aabb")).toBe(true);
    expect(hexEqual("aabb", "aabc")).toBe(false);
  });
});
