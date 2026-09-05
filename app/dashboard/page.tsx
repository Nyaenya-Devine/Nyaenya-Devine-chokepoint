import Link from "next/link";
import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { getSessionUid } from "@/lib/session";
import {
  Gauge,
  Activity,
  ShieldCheck,
  Lock,
  AlertTriangle,
  KeyRound,
  UserCog,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { AreaChart, Donut, BarList, MiniBars, SEV_COLOR } from "@/components/charts";

const sevClass: Record<string, string> = {
  CRITICAL: "badge-risk-critical",
  HIGH: "badge-risk-high",
  MEDIUM: "badge-risk-medium",
  LOW: "badge-risk-low",
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export default async function DashboardPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");

  const summary = store.riskSummary();
  const d = store.dashboard();
  const recent = store.recent(9);
  const integrity = store.verify();

  // Severity distribution for the donut.
  const donutData = [
    { label: "Critical", value: summary.critical, color: SEV_COLOR.CRITICAL },
    { label: "High", value: summary.high, color: SEV_COLOR.HIGH },
    { label: "Medium", value: summary.medium, color: SEV_COLOR.MEDIUM },
    { label: "Low", value: summary.low, color: SEV_COLOR.LOW },
  ];

  const riskTone =
    summary.riskIndex >= 50 ? "var(--risk-critical)" : summary.riskIndex >= 25 ? "var(--risk-high)" : "var(--risk-low)";

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Security Posture — Overview</h1>
          <p className="page-sub">Welcome back, {user.displayName}. Live controls across your sensitive operations.</p>
        </div>
        <div className="row">
          <span className={`badge ${integrity.valid ? "badge-ok" : "badge-risk-critical"}`}>
            <ShieldCheck size={12} /> {integrity.valid ? "Chain intact" : "Tampering!"}
          </span>
          <span className="badge badge-role">{user.role}</span>
        </div>
      </div>

      {/* ---------- KPI strip ---------- */}
      <div className="grid grid-4 mb-16">
        <div className="card kpi">
          <div className="kpi-head">
            <span className="kpi-label">Risk index</span>
            <div className="kpi-ico" style={{ background: "rgba(237,137,54,0.14)", color: "var(--risk-high)" }}>
              <Gauge size={17} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: riskTone }}>
            {summary.riskIndex}
            <span className="kpi-unit">/100</span>
          </div>
          <div className="kpi-delta">
            {summary.critical} critical · {summary.high} high
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <span className="kpi-label">Audit events</span>
            <div className="kpi-ico" style={{ background: "rgba(79,209,197,0.14)", color: "var(--accent)" }}>
              <Activity size={17} />
            </div>
          </div>
          <div className="kpi-value">{d.totals.events}</div>
          <div className="kpi-delta">hash-chained &amp; signed</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <span className="kpi-label">Open mandates</span>
            <div className="kpi-ico" style={{ background: "rgba(236,201,75,0.14)", color: "var(--risk-medium)" }}>
              <KeyRound size={17} />
            </div>
          </div>
          <div className="kpi-value">{store.mandates.filter((m) => m.state === "pending").length}</div>
          <div className="kpi-delta">awaiting dual approval</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <span className="kpi-label">Active users</span>
            <div className="kpi-ico" style={{ background: "rgba(72,187,120,0.14)", color: "var(--risk-low)" }}>
              <UserCog size={17} />
            </div>
          </div>
          <div className="kpi-value">{store.publicUsers().length}</div>
          <div className="kpi-delta">
            {store.publicUsers().filter((u) => u.role === "admin").length} admin · {store.publicUsers().filter((u) => u.role === "operator").length} operator
          </div>
        </div>
      </div>

      {/* ---------- Trend + severity ---------- */}
      <div className="grid grid-3 mb-16">
        <div className="card span-2">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 className="mb-0">Risk trend</h3>
              <p className="card-sub mb-0">Score per audit entry, colored by severity.</p>
            </div>
            <span className="badge badge-ok"><Activity size={12} /> live</span>
          </div>
          <AreaChart data={d.trend} />
        </div>
        <div className="card">
          <h3>Severity distribution</h3>
          <p className="card-sub">Across all {summary.total} assessed signals.</p>
          <div className="row" style={{ alignItems: "center", gap: 18 }}>
            <Donut data={donutData} size={150} />
            <div className="donut-legend">
              {donutData.map((s) => (
                <div key={s.label} className="legend-row">
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-val">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Activity + alerts ---------- */}
      <div className="grid grid-3 mb-16">
        <div className="card span-2">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 className="mb-0">Activity (last hour)</h3>
              <p className="card-sub mb-0">Events per 10-minute bucket · red shows risky actions.</p>
            </div>
            <span className="badge badge-role">{d.totals.privileged} privileged</span>
          </div>
          <MiniBars data={d.activity} />
        </div>
        <div className="card">
          <h3>Action breakdown</h3>
          <p className="card-sub">What the chain has been recording.</p>
          <BarList data={d.actionBreakdown} />
        </div>
      </div>

      {/* ---------- Live alerts + chain integrity ---------- */}
      <div className="grid grid-3 mb-16">
        <div className="card span-2">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 className="mb-0">Live alerts</h3>
              <p className="card-sub mb-0">Highest-severity anomalies in the window.</p>
            </div>
            <Link href="/dashboard/risks" className="btn btn-sm btn-ghost">All signals <ArrowRight size={14} /></Link>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            {d.topAlerts.length === 0 ? (
              <div className="alert alert-ok"><CheckCircle2 size={15} /> No anomalies detected.</div>
            ) : (
              d.topAlerts.map((r) => (
                <div key={r.entryIndex} className="alert alert-info" style={{ alignItems: "flex-start", padding: 12 }}>
                  <AlertTriangle size={16} style={{ color: SEV_COLOR[r.severity], marginTop: 1 }} />
                  <div style={{ width: "100%" }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className={`badge ${sevClass[r.severity]}`}>{r.severity}</span>
                      <span className="mono" style={{ fontSize: 12 }}>entry #{r.entryIndex}</span>
                      <span className="meta-cell">{r.action} · {r.actor}</span>
                    </div>
                    {r.signals.length > 0 && (
                      <div className="meta-cell" style={{ fontSize: 12, marginTop: 4 }}>
                        {r.signals[0].reason}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <h3>Chain integrity</h3>
          <p className="card-sub">Tamper-evidence verification.</p>
          <div className="grid" style={{ gap: 14 }}>
            <div className="verify-strip">
              <span className={`badge ${integrity.valid ? "badge-ok" : "badge-risk-critical"}`}>
                {integrity.valid ? <ShieldCheck size={12} /> : <Lock size={12} />} {integrity.valid ? "intact" : "tampered"}
              </span>
            </div>
            <div>
              <div className="meta-cell mb-8">Signing scheme</div>
              <div className="mono" style={{ fontSize: 13, lineHeight: 1.8 }}>
                SHA-256 hash chain<br />+ HMAC-SHA256 signature
              </div>
            </div>
            <div>
              <div className="meta-cell mb-8">Genesis hash</div>
              <div className="hash">{store.ledger[0]?.hash.slice(0, 20) ?? "…"}</div>
            </div>
            <a href="/dashboard/audit" className="btn btn-sm">Open audit console</a>
          </div>
        </div>
      </div>

      {/* ---------- Latest risk signal + audit trail ---------- */}
      <div className="grid grid-2 mb-16">
        <div className="card">
          <div className="row mb-8" style={{ justifyContent: "space-between" }}>
            <h3 className="mb-0">Latest risk signal</h3>
            <ShieldAlert size={16} style={{ color: "var(--risk-high)" }} />
          </div>
          {d.topAlerts[0] ? (
            <div>
              <div className="row mb-8">
                <span className={`badge ${sevClass[d.topAlerts[0].severity]}`}>{d.topAlerts[0].severity}</span>
                <span className="mono" style={{ fontSize: 12 }}>score {d.topAlerts[0].score.toFixed(2)}</span>
              </div>
              <div className="actor-cell">{d.topAlerts[0].actor}</div>
              <div className="meta-cell mb-16">{d.topAlerts[0].action}</div>
              <div className="grid" style={{ gap: 8 }}>
                {d.topAlerts[0].signals.map((s) => (
                  <div key={s.code} className="alert alert-info" style={{ padding: 8 }}>
                    <Lock size={14} />
                    <span>{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="alert alert-ok">No anomalies detected.</div>
          )}
        </div>

        <div className="card">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 className="mb-0">Live audit trail</h3>
              <p className="card-sub mb-0">Most recent tamper-evident events.</p>
            </div>
            <Link href="/dashboard/audit" className="btn btn-sm btn-ghost">Full log</Link>
          </div>
          <div className="timeline">
            {recent.map((e) => (
              <div className="tl-item" key={e.id}>
                <div className="tl-time">{timeAgo(e.ts)} · #{e.index}</div>
                <div className="tl-body">
                  <span className="act">{e.action}</span>{" "}
                  <span className="ok">{e.actor}</span>{" "}
                  <span className="meta-cell">→ {e.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
