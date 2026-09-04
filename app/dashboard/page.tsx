import Link from "next/link";
import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { getSessionUid } from "@/lib/session";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";

const sevClass: Record<string, string> = {
  CRITICAL: "badge-risk-critical",
  HIGH: "badge-risk-high",
  MEDIUM: "badge-risk-medium",
  LOW: "badge-risk-low",
};

export default async function DashboardPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");
  const summary = store.riskSummary();
  const recent = store.recent(8);
  const risk = store.risks()[0]; // newest assessment

  const sevPct = Math.round((summary.riskIndex ?? 0));

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Welcome back, {user.displayName}. Here&apos;s the state of your controls.</p>
        </div>
        <span className="badge badge-role">Signed in as {user.role}</span>
      </div>

      <div className="grid grid-4 mb-16">
        <div className="card stat">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="label">Risk index</span>
            <AlertTriangle size={15} style={{ color: "var(--risk-high)" }} />
          </div>
          <div className="value">{summary.riskIndex}<span style={{ fontSize: 14, color: "var(--text-mute)" }}>/100</span></div>
          <div className="delta">{summary.critical} critical · {summary.high} high</div>
        </div>
        <div className="card stat">
          <span className="label">Audit events</span>
          <div className="value">{summary.total}</div>
          <div className="delta">hash-chained &amp; HMAC-signed</div>
        </div>
        <div className="card stat">
          <span className="label">Open mandates</span>
          <div className="value">{store.mandates.filter((m) => m.state === "pending").length}</div>
          <div className="delta">awaiting dual approval</div>
        </div>
        <div className="card stat">
          <span className="label">Active users</span>
          <div className="value">{store.publicUsers().length}</div>
          <div className="delta">{store.publicUsers().filter((u) => u.role === "admin").length} admin</div>
        </div>
      </div>

      <div className="grid grid-2 mb-16">
        <div className="card">
          <h3>Latest risk signal</h3>
          <p className="card-sub">Highest-weight anomaly currently detected.</p>
          {risk ? (
            <div>
              <div className="row mb-8">
                <span className={`badge ${sevClass[risk.severity]}`}>{risk.severity}</span>
                <span className="mono" style={{ fontSize: 12 }}>score {risk.score.toFixed(2)}</span>
              </div>
              <div className="actor-cell">{risk.actor}</div>
              <div className="meta-cell mb-16">{risk.action} → {risk.action === "login_failed" ? "session" : risk.action}</div>
              <div className="grid" style={{ gap: 8 }}>
                {risk.signals.map((s) => (
                  <div key={s.code} className="alert alert-info" style={{ padding: 8 }}>
                    <Lock size={14} />
                    <span>{s.reason}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/risks" className="btn btn-sm mt-16">View all signals</Link>
            </div>
          ) : <div className="alert alert-ok">No anomalies detected.</div>}
        </div>

        <div className="card">
          <h3>Chain integrity</h3>
          <p className="card-sub">Re-verify the whole tamper-evident chain.</p>
          <div className="grid" style={{ gap: 16 }}>
            <div>
              <div className="meta-cell mb-8">Signing scheme</div>
              <div className="mono" style={{ fontSize: 13 }}>SHA-256 hash chain<br />+ HMAC-SHA256 signature</div>
            </div>
            <div className="verify-strip">
              <span className="badge badge-ok"><ShieldCheck size={12} /> intact</span>
              <span className="hash">genesis {store.ledger[0]?.hash.slice(0, 20) ?? "…"}</span>
            </div>
            <a href="/dashboard/audit" className="btn btn-sm">Open audit console</a>
          </div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 className="mb-0">Live audit trail</h3>
            <p className="card-sub mb-0">Most recent tamper-evident events.</p>
          </div>
          <Link href="/dashboard/audit" className="btn btn-sm btn-ghost">Full log</Link>
        </div>
        <div className="log">
          {recent.map((e) => (
            <div className="ln" key={e.id}>
              <span className="idx">{e.index}</span>
              <span className="act">{e.action.padEnd(18)}</span>{" "}
              <span className="ok">{e.actor}</span>{" "}
              <span className="meta-cell">→ {e.target}</span>{" "}
              <span className="hash">{e.hash.slice(0, 12)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
