/**
 * chokepoint — authorization policy engine.
 *
 * Implements role-based access control (RBAC) with the least-privilege model
 * that the project is built around, plus **dual-control** (two-person rule) for
 * the highest-risk operations.
 *
 * Roles (least to most privileged):
 *  - Viewer      : read-only. Can view the dashboard and audit log.
 *  - Auditor     : read-only + can run integrity verification and export the log.
 *  - Operator    : can execute operational actions (that do not require mandate).
 *  - Admin       : administrative control. Subject to dual-control on
 *                  irreversible / identity-affecting actions.
 *
 * Dual-control rule (the chokepoint):
 *  Certain actions — notably "approve privilege grant", "revoke access",
 *  "rotate secret", "delete" — require a *second, distinct* authorized user to
 *  approve, and the approver must NOT be the requester. This enforces
 *  separation of duties (OWASP A01 identity/access, and ASI03 in agentic AI).
 */

export type Role = "viewer" | "auditor" | "operator" | "admin";

export type Action =
  | "view_dashboard"
  | "view_log"
  | "verify_integrity"
  | "export_log"
  | "run_scan"
  | "request_agent_action"
  | "grant_role"
  | "elevate_privilege"
  | "revoke_access"
  | "rotate_secret"
  | "delete_record"
  | "approve";

/** Actions that require dual-control (a mandate / two-person rule). */
export const DUAL_CONTROL_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "grant_role",
  "elevate_privilege",
  "revoke_access",
  "rotate_secret",
  "delete_record",
]);

/** Actions that only an Admin can initiate or approve. */
const ADMIN_ONLY: ReadonlySet<Action> = new Set<Action>([
  "grant_role",
  "elevate_privilege",
  "revoke_access",
  "rotate_secret",
  "delete_record",
  "approve",
]);

/** Actions an Operator may perform. */
const OPERATOR: ReadonlySet<Action> = new Set<Action>([
  "run_scan",
  "request_agent_action",
]);

const AUDITOR: ReadonlySet<Action> = new Set<Action>([
  "verify_integrity",
  "export_log",
]);

const VIEWER: ReadonlySet<Action> = new Set<Action>(["view_dashboard", "view_log"]);

const ROLE_ACTIONS: Record<Role, ReadonlySet<Action>> = {
  viewer: VIEWER,
  auditor: new Set<Action>([...VIEWER, ...AUDITOR]),
  operator: new Set<Action>([...VIEWER, ...AUDITOR, ...OPERATOR]),
  admin: new Set<Action>([
    ...VIEWER,
    ...AUDITOR,
    ...OPERATOR,
    ...ADMIN_ONLY,
  ]),
};

/** Can `role` perform `action` at all? */
export function can(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role].has(action);
}

/** Is `action` subject to the dual-control rule? */
export function requiresDualControl(action: Action): boolean {
  return DUAL_CONTROL_ACTIONS.has(action);
}

/**
 * Deduce the minimum role that may perform an action.
 * Useful for UI and for documenting the policy matrix.
 */
export function minRoleFor(action: Action): Role | null {
  const order: Role[] = ["viewer", "auditor", "operator", "admin"];
  for (const role of order) {
    if (ROLE_ACTIONS[role].has(action)) return role;
  }
  return null;
}

export interface DualControlDecision {
  allowed: boolean;
  reason: string;
  needsRemoval?: boolean;
}

/**
 * Enforce dual control for a pending mandate.
 * Two conditions must hold:
 *   1. The approver must be a *different principal* from the requester
 *      (a person cannot approve their own request — separation of duties).
 *   2. The approver's role must be authorized to perform the action.
 * The requester only needs the ability to *propose* the action (gated at the
 * API layer), not the ability to execute it alone.
 */
export function enforceDualControl(params: {
  action: Action;
  requesterRole: Role;
  approverRole: Role;
  requesterId: string;
  approverId: string;
}): DualControlDecision {
  const { action, requesterRole, approverRole, requesterId, approverId } = params;

  if (!requiresDualControl(action)) {
    return {
      allowed: true,
      reason: `'${action}' does not require dual control.`,
    };
  }
  if (requesterId === approverId) {
    return {
      allowed: false,
      reason: "Dual control requires a distinct approver.",
      needsRemoval: true,
    };
  }
  if (!can(approverRole, action)) {
    return {
      allowed: false,
      reason: `${approverRole} cannot approve '${action}'.`,
    };
  }
  // The requester should at least be authorized to propose something like this.
  if (!["operator", "admin"].includes(requesterRole)) {
    return {
      allowed: false,
      reason: `${requesterRole} is not authorized to propose '${action}'.`,
    };
  }
  return {
    allowed: true,
    reason: "Dual-control satisfied.",
  };
}
