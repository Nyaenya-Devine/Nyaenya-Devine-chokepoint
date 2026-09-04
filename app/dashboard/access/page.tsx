import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { getSessionUid } from "@/lib/session";
import { DUAL_CONTROL_ACTIONS, can, type Role } from "@/lib/authz";
import AccessConsole from "@/components/AccessConsole";

// Whether a role may *propose* a dual-control change (operator+).
function canPropose(role: Role): boolean {
  return can(role, "run_scan");
}

const ROLES: Role[] = ["viewer", "auditor", "operator", "admin"];

// Each row is a capability; a role can tick the box if it can perform ANY listed action.
const MATRIX: { capability: string; actions: string[] }[] = [
  { capability: "View dashboard & log", actions: ["view_dashboard", "view_log"] },
  { capability: "Verify integrity / export", actions: ["verify_integrity", "export_log"] },
  { capability: "Run scan / request agent action", actions: ["run_scan", "request_agent_action"] },
  { capability: "Privilege & dual-control actions", actions: ["grant_role", "elevate_privilege", "revoke_access", "rotate_secret", "delete_record"] },
  { capability: "Approve dual-control mandates", actions: ["approve"] },
];

export default async function AccessPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");
  const pending = store.mandates.filter((m) => m.state === "pending");

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Access &amp; controls</h1>
          <p className="page-sub">Least-privilege roles, dual-control mandates, and the policy matrix.</p>
        </div>
      </div>

      <div className="grid grid-2 mb-16">
        <div className="card">
          <h3>Users</h3>
          <p className="card-sub">{store.publicUsers().length} principals.</p>
          <div className="tbl-wrap" style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th></tr>
              </thead>
              <tbody>
                {store.publicUsers().map((u) => (
                  <tr key={u.id}>
                    <td className="actor-cell">{u.displayName}</td>
                    <td className="mono">{u.username}</td>
                    <td><span className="badge badge-role">{u.role}</span></td>
                    <td><span className={`badge ${u.active ? "badge-ok" : "badge-risk-high"}`}>{u.active ? "active" : "disabled"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Dual-control (two-person rule)</h3>
          <p className="card-sub">These actions require a distinct, authorized approver.</p>
          <div className="grid" style={{ gap: 8 }}>
            {[...DUAL_CONTROL_ACTIONS].map((a) => (
              <div key={a} className="row" style={{ justifyContent: "space-between" }}>
                <span className="mono">{a}</span>
                <span className="badge badge-role">mandated</span>
              </div>
            ))}
          </div>
          <div className="alert alert-info mt-16" style={{ padding: 10 }}>
            The approver must never be the requester, and must hold a role that
            can perform the action (separation of duties).
          </div>
        </div>
      </div>

      <div className="card mb-16">
        <h3>Policy matrix</h3>
        <p className="card-sub">Who can do what.</p>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Capability</th><th>Viewer</th><th>Auditor</th><th>Operator</th><th>Admin</th></tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.capability}>
                  <td className="actor-cell">{row.capability}</td>
                  {ROLES.map((r) => (
                    <td key={r}>
                      <span className={`badge ${row.actions.some((a) => can(r, a as never)) ? "badge-ok" : ""}`}>
                        {row.actions.some((a) => can(r, a as never)) ? "✓" : "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <AccessConsole
          requesterRole={user.role}
          pending={pending}
          canRequest={canPropose(user.role)}
          canApprove={user.role === "admin"}
        />
      </div>
    </>
  );
}
