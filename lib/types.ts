import type { Role } from "./authz";
import type { LedgerEntry } from "./ledger";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  passwordHash: string; // never sent to the client
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** A public view of a user (no secrets). */
export type PublicUser = Omit<User, "passwordHash">;

/** A pending dual-control request awaiting a second signature. */
export interface Mandate {
  id: string;
  action: string;
  target: string;
  requestedBy: string;
  approverId: string | null;
  state: "pending" | "approved" | "rejected";
  createdAt: string;
  expiresAt: string;
  reason: string;
}

export interface Session {
  token: string; // signed HMAC token
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AppState {
  users: User[];
  ledger: LedgerEntry[];
  mandates: Mandate[];
}

export type { Role, LedgerEntry };
