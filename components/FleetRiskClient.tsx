"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Activity, Download } from "lucide-react";

type RawProfile = {
  actor: string;
  riskScore: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: string[];
  velocity: number;
  privilegeEscalations: number;
  afterHoursActions: number;
  failedAuths: number;
};

type ApiResponse = {
  fleetRisk: { overallRisk: number; criticalActors: RawProfile[]; riskTrend: any[]; topThreats: string[] };
  profiles: RawProfile[];
};

export default function FleetRiskClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fleet-risk")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setData(j);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="card">Loading fleet risk…</div>;
  if (err) return <div className="card"><div className="alert alert-info"><AlertTriangle size={16}/> {err}</div></div>;
  if (!data) return <div className="card">No data</div>;

  const sevColor: Record<string, string> = {
    CRITICAL: "var(--risk-critical)",
    HIGH: "var(--risk-high)",
    MEDIUM: "var(--risk-medium)",
    LOW: "var(--risk-low)",
  };

  const profiles = data.profiles || [];
  const totalAgents = profiles.length;
  const avgRisk = data.fleetRisk?.overallRisk ?? 0;
  const critical = profiles.filter((p) => p.severity === "CRITICAL").length;
  const high = profiles.filter((p) => p.severity === "HIGH").length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-4">
        <div className="card kpi">
          <div className="kpi-head"><span className="kpi-label">Agents</span><ShieldAlert size={16}/></div>
          <div className="kpi-value">{totalAgents}</div>
          <div className="kpi-delta">tracked identities</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><span className="kpi-label">Avg risk</span><Activity size={16}/></div>
          <div className="kpi-value" style={{ color: avgRisk >= 50 ? sevColor.CRITICAL : avgRisk >= 25 ? sevColor.HIGH : sevColor.LOW }}>{avgRisk}</div>
          <div className="kpi-delta">0–100 scale</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><span className="kpi-label">Critical</span><span className="badge badge-risk-critical">{critical}</span></div>
          <div className="kpi-value" style={{ color: sevColor.CRITICAL }}>{critical}</div>
          <div className="kpi-delta">immediate review</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><span className="kpi-label">High</span><span className="badge badge-risk-high">{high}</span></div>
          <div className="kpi-value" style={{ color: sevColor.HIGH }}>{high}</div>
          <div className="kpi-delta">elevated behavior</div>
        </div>
      </div>

      <div className="card">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div><h3 className="mb-0">Risk heatmap</h3><p className="card-sub mb-0">Agents sorted by risk — color = severity, width = score</p></div>
          <a href="/api/siem-export?format=json" className="btn btn-sm btn-ghost"><Download size={14}/> Export JSON</a>
        </div>
        <div className="grid" style={{ gap: 8 }}>
          {profiles.slice(0, 20).map((p) => (
            <div key={p.actor} className="row" style={{ gap: 12, alignItems: "center" }}>
              <div className="mono" style={{ width: 160, fontSize: 12 }}>{p.actor}</div>
              <div style={{ flex: 1, height: 12, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, p.riskScore)}%`, height: "100%", background: sevColor[p.severity], transition: "width .4s" }} />
              </div>
              <span className={`badge badge-risk-${p.severity.toLowerCase()}`} style={{ minWidth: 72, justifyContent: "center" }}>{p.severity}</span>
              <span className="mono" style={{ width: 36, textAlign: "right", fontSize: 12 }}>{p.riskScore}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Top factors</h3>
        <p className="card-sub">Why agents scored high</p>
        <div className="grid" style={{ gap: 8 }}>
          {profiles.filter(p=>p.severity!=="LOW").slice(0,8).map(p=>(
            <div key={p.actor} className="alert alert-info" style={{ padding: 10 }}>
              <AlertTriangle size={14} style={{ color: sevColor[p.severity] }}/>
              <div>
                <div className="row" style={{ gap: 8 }}><span className="actor-cell">{p.actor}</span><span className={`badge badge-risk-${p.severity.toLowerCase()}`}>{p.severity}</span><span className="meta-cell">{p.velocity.toFixed(1)}/min · {p.privilegeEscalations} escalations</span></div>
                <div className="meta-cell" style={{ fontSize: 12, marginTop: 4 }}>{p.signals.join(" · ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
