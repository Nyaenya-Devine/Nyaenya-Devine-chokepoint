"use client";

import { useEffect, useState } from "react";
import { Beaker, ShieldAlert, Play, AlertTriangle } from "lucide-react";

export default function SimulationClient({ role }: { role: string }) {
  const [simResult, setSimResult] = useState<any>(null);
  const [impResult, setImpResult] = useState<any>(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingImp, setLoadingImp] = useState(false);

  const runSimulation = async () => {
    setLoadingSim(true);
    try {
      const res = await fetch("/api/policy-simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tests: ["privilege_escalation", "dual_approval_bypass"] }) });
      const j = await res.json();
      setSimResult(j);
    } catch (e: any) {
      setSimResult({ error: e.message });
    } finally {
      setLoadingSim(false);
    }
  };

  const runImpersonation = async () => {
    setLoadingImp(true);
    try {
      const res = await fetch("/api/impersonation");
      const j = await res.json();
      setImpResult(j);
    } catch (e: any) {
      setImpResult({ error: e.message });
    } finally {
      setLoadingImp(false);
    }
  };

  useEffect(() => {
    // auto-load GET simulation preview
    fetch("/api/policy-simulate").then(r=>r.json()).then(setSimResult).catch(()=>{});
  }, []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <div className="card">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div><h3 className="mb-0">Policy Simulator</h3><p className="card-sub mb-0">What-if without touching prod ledger</p></div>
            <span className="badge badge-role">safe</span>
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>Tests default attack scenarios against current policy config. No real mandates created — pure simulation.</p>
          <button className="btn btn-sm" onClick={runSimulation} disabled={loadingSim}><Play size={14}/> {loadingSim ? "Simulating…" : "Run simulation"}</button>
          <div style={{ marginTop: 16 }}>
            {simResult ? (
              <pre className="mono" style={{ fontSize: 11, background: "var(--panel)", padding: 12, borderRadius: 8, overflowX: "auto", maxHeight: 400 }}>{JSON.stringify(simResult, null, 2)}</pre>
            ) : (
              <div className="alert alert-info"><Beaker size={14}/> Ready to simulate</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <div><h3 className="mb-0">Impersonation Detector</h3><p className="card-sub mb-0">Detects token replay, session hijack, role spoofing</p></div>
            <span className="badge badge-risk-high">active</span>
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>Analyzes audit chain for 5 impersonation patterns. Derived from real ledger, not invented.</p>
          <button className="btn btn-sm btn-ghost" onClick={runImpersonation} disabled={loadingImp}><ShieldAlert size={14}/> {loadingImp ? "Scanning…" : "Scan for impersonation"}</button>
          <div style={{ marginTop: 16 }}>
            {impResult ? (
              <pre className="mono" style={{ fontSize: 11, background: "var(--panel)", padding: 12, borderRadius: 8, overflowX: "auto", maxHeight: 400 }}>{JSON.stringify(impResult, null, 2)}</pre>
            ) : (
              <div className="alert alert-info"><ShieldAlert size={14}/> Run scan to see attempts</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>How it works</h3>
        <ul className="small muted" style={{ marginLeft: 18, marginTop: 8 }}>
          <li><b>Policy simulator:</b> clones policy config, injects attack scenarios, reports whether controls block them. No side effects on real store.</li>
          <li><b>Impersonation detector:</b> 5 types — session hijack, token replay, role spoof, device spoof, credential brute force. Uses audit + anomaly engines.</li>
          <li><b>Safety:</b> simulation guard enforced, same as Reset Lab — simulation-only boundary preserved.</li>
        </ul>
      </div>
    </div>
  );
}
