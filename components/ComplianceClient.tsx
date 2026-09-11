"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, FileCheck, AlertTriangle } from "lucide-react";

type ComplianceReport = {
  reports?: any[];
  summary?: any;
  mappings?: any[];
};

export default function ComplianceClient() {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/compliance")
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

  if (loading) return <div className="card">Loading compliance…</div>;
  if (err) return <div className="card"><div className="alert alert-info"><AlertTriangle size={16}/> {err}</div></div>;
  if (!data) return <div className="card">No data</div>;

  // Transform new compliance report shape to table
  const reports = data.reports ?? [];
  const summary = data.summary ?? {};
  // Flatten to control list for table
  const flat: { control: string; framework: string; severity: string; evidence: string; compliant: boolean; gaps: string[] }[] = [];
  for (const r of reports.slice(0, 30)) {
    for (const m of (r.mappings ?? [])) {
      flat.push({
        control: `${m.framework} ${m.controlId}: ${m.controlName}`,
        framework: m.framework,
        severity: m.severity,
        evidence: m.evidence,
        compliant: r.compliant,
        gaps: r.gaps,
      });
    }
  }
  const mappings = flat;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="card">
          <div className="row mb-8"><ShieldCheck size={16}/><h3 className="mb-0">Reports</h3></div>
          <div className="kpi-value">{summary.total ?? reports.length}</div>
          <div className="kpi-delta">ledger entries mapped</div>
        </div>
        <div className="card">
          <div className="row mb-8"><FileCheck size={16}/><h3 className="mb-0">Compliant</h3></div>
          <div className="kpi-value">{summary.compliant ?? 0}</div>
          <div className="kpi-delta">no gaps</div>
        </div>
        <div className="card">
          <div className="row mb-8"><AlertTriangle size={16}/><h3 className="mb-0">Gaps</h3></div>
          <div className="kpi-value">{summary.criticalGaps ?? 0}</div>
          <div className="kpi-delta">needs justification</div>
        </div>
      </div>

      <div className="card">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div><h3 className="mb-0">Control matrix</h3><p className="card-sub mb-0">OWASP ASI, NIST, SOC2, MITRE, ISO27001 — evidence from ledger</p></div>
          <span className="badge badge-ok">tamper-evident</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Control</th><th>Framework</th><th>Severity</th><th>Compliant</th><th>Evidence</th></tr></thead>
            <tbody>
              {mappings.map((m, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 11 }}>{m.control}</td>
                  <td className="meta-cell">{m.framework}</td>
                  <td><span className={`badge badge-risk-${m.severity.toLowerCase()}`}>{m.severity}</span></td>
                  <td><span className={`badge ${m.compliant ? "badge-ok" : "badge-risk-high"}`}>{m.compliant ? "yes" : "no"}</span></td>
                  <td className="meta-cell" style={{ fontSize: 11 }}>{m.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mappings.length === 0 && <div className="alert alert-info" style={{ marginTop: 12 }}><FileCheck size={14}/> No privileged actions yet — run some mandates to populate compliance.</div>}
      </div>

      {summary.frameworkCoverage && (
        <div className="card">
          <h3>Framework coverage</h3>
          <div className="grid" style={{ gap: 8, marginTop: 8 }}>
            {Object.entries(summary.frameworkCoverage).map(([fw, cnt]) => (
              <div key={fw} className="row" style={{ justifyContent: "space-between" }}><span className="mono">{fw}</span><span className="badge badge-role">{cnt as any} mappings</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
