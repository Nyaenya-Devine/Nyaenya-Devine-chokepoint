import { describe, it, expect } from "vitest";
import {
  can,
  requiresDualControl,
  enforceDualControl,
  minRoleFor,
  DUAL_CONTROL_ACTIONS,
  type Role,
} from "../lib/authz";

describe("RBAC policy", () => {
  it("viewers can only read", () => {
    expect(can("viewer", "view_dashboard")).toBe(true);
    expect(can("viewer", "view_log")).toBe(true);
    expect(can("viewer", "verify_integrity")).toBe(false);
    expect(can("viewer", "grant_role")).toBe(false);
  });

  it("auditors can verify and export, but not operate", () => {
    expect(can("auditor", "verify_integrity")).toBe(true);
    expect(can("auditor", "export_log")).toBe(true);
    expect(can("auditor", "run_scan")).toBe(false);
    expect(can("auditor", "grant_role")).toBe(false);
  });

  it("operators can act but not wield admin privileges", () => {
    expect(can("operator", "run_scan")).toBe(true);
    expect(can("operator", "request_agent_action")).toBe(true);
    expect(can("operator", "grant_role")).toBe(false);
    expect(can("operator", "approve")).toBe(false);
  });

  it("admins can do everything", () => {
    expect(can("admin", "grant_role")).toBe(true);
    expect(can("admin", "rotate_secret")).toBe(true);
    expect(can("admin", "approve")).toBe(true);
  });

  it("identifies dual-control actions", () => {
    for (const a of DUAL_CONTROL_ACTIONS) expect(requiresDualControl(a)).toBe(true);
    expect(requiresDualControl("view_log")).toBe(false);
  });

  it("minRoleFor is consistent", () => {
    expect(minRoleFor("view_dashboard")).toBe("viewer");
    expect(minRoleFor("verify_integrity")).toBe("auditor");
    expect(minRoleFor("grant_role")).toBe("admin");
  });
});

describe("dual-control / separation of duties", () => {
  const base = {
    action: "grant_role" as const,
    requesterRole: "operator" as Role,
    approverRole: "admin" as Role,
    requesterId: "u-op",
    approverId: "u-admin",
  };

  it("blocks a principal approving their own request", () => {
    const d = enforceDualControl({ ...base, approverId: "u-op" });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/distinct approver/);
  });

  it("blocks an unprivileged approver", () => {
    const d = enforceDualControl({ ...base, approverRole: "viewer" });
    expect(d.allowed).toBe(false);
  });

  it("allows a distinct, authorized approver", () => {
    const d = enforceDualControl(base);
    expect(d.allowed).toBe(true);
  });

  it("does not require dual control for non-mandated actions", () => {
    const d = enforceDualControl({ ...base, action: "run_scan" });
    expect(d.allowed).toBe(true);
  });
});
