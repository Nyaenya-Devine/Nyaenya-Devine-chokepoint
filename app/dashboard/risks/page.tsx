import { store } from "@/lib/store";
import { getSessionUid } from "@/lib/session";
import { Activity, AlertTriangle } from "lucide-react";

const sevClass: Record<string, string> = {
  CRITICAL: "badge-risk-critical",
  HIGH: "badge-risk-high",
  MEDIUM: "badge-risk-medium",
  LOW: "badge-risk-low",
};

const RULES = [
  { code: "FAILED_LOGIN", label: "Failed authentication", desc: "Repeated failures suggest brute-force or credential stuffing." },
  { code: "AFTER_HOURS", label: "Out-of-hours privileged action", desc: "Privilege changes outside the business-hours window." },
  { code: "NEW_SOURCE", label: "Unknown actor/source", desc: "First activity from a principal in the observed window." },
  { code: "ESCALATION", label: "Privilege escalation", desc: "Repeated elevation events indicate privilege creep." },
  { code: "HIGH_VALUE", label: "High-value target", desc: "Wide-scope grants, secret rotation, or data deletion." },
  { code: "RATE", label: "Excessive activity rate", desc: "Automated or scripted actions beyond human norms." },
];

export default async function RisksPage() {
  const uid = (await getSessionUid())!;
  const risks = store.risks();
  const summary = store.riskSummary();

  const counts = [
    { k: "CRITICAL", v: summary.critical, c: "var(--risk-critical)" },
    { k: "HIGH", v: summary.high, c: "var(--risk-high)" },
    { k: "MEDIUM", v: summary.medium, c: "var(--risk-medium)" },
    { k: "LOW", v: summary.low, c: "var(--risk-low)" },
  ];
  const maxV = Math.max(1, ...counts.map((c) => c.v));

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Risk &amp; anomalies</h1>
          <p className="page-sub">Explainable risk scoring over the live audit chain.</p>
        </div>
      </div>

      <div className="grid grid-2 mb-16">
        <div className="card">
          <h3>Severity distribution</h3>
          <p className="card-sub">Assessments across all {summary.total} events.</p>
          <div className="grid" style={{ gap: 12 }}>
            {counts.map((c) => (
              <div key={c.k} className="row" style={{ gap: 10 }}>
                <span className="badge" style={{ color: c.c, borderColor: c.c, minWidth: 92 }}>{c.k}</span>
                <div style={{ flex: 1, background: "var(--code)", borderRadius: 6, height: 10 }}>
                  <div style={{ width: `${(c.v / maxV) * 100}%`, height: "100%", background: c.c, borderRadius: 6 }} />
                </div>
                <span className="mono" style={{ fontSize: 12, width: 28, textAlign: "right" }}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Detection rules</h3>
          <p className="card-sub">The signals the engine watches for.</p>
          <div className="grid" style={{ gap: 8 }}>
            {RULES.map((r) => (
              <div key={r.code} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <Activity size={15} style={{ color: "var(--accent)", marginTop: 2 }} />
                <div>
                  <b style={{ fontSize: 13 }}>{r.label}</b>
                  <div className="meta-cell" style={{ fontSize: 12 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 className="mb-0">Anomaly feed</h3>
            <p className="card-sub mb-0">Newest assessment first.</p>
          </div>
          <span className="badge badge-ok">live</span>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          {risks.map((r) => (
            <div key={r.entryIndex} className="alert alert-info" style={{ alignItems: "flex-start" }}>
              <AlertTriangle size={16} style={{ color: "var(--risk-high)", marginTop: 2 }} />
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`badge ${sevClass[r.severity]}`}>{r.severity}</span>
                  <span className="mono" style={{ fontSize: 12 }}>entry #{r.entryIndex}</span>
                  <span className="meta-cell">{r.action} · {r.actor}</span>
                </div>
                <div className="grid mt-8" style={{ gap: 4 }}>
                  {r.signals.map((s) => (
                    <div key={s.code} className="meta-cell" style={{ fontSize: 12 }}>— {s.reason}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
