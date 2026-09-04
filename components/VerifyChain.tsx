"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import type { Role } from "@/lib/authz";
import { can } from "@/lib/authz";

export default function VerifyChain({ username, role }: { username: string; role: Role }) {
  const [result, setResult] = useState<{ valid: boolean; total: number; firstInvalid: number | null; reason: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = can(role, "verify_integrity");

  async function verify() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/audit/verify", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setResult(data);
  }

  return (
    <div>
      <div className="row">
        <h3 className="mb-0">Tamper-evidence verification</h3>
        <button className="btn btn-sm" onClick={verify} disabled={busy || !allowed}>
          {busy ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}
          {busy ? "Verifying…" : "Re-run full chain"}
        </button>
        {!allowed && <span className="meta-cell">Requires the auditor role.</span>}
      </div>

      {result && (
        <div className="mt-16">
          <div className={`alert ${result.valid ? "alert-ok" : "alert-bad"}`}>
            {result.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <div>
              <b>{result.valid ? "Integrity verified" : "Integrity failure detected"}</b>
              <div className="meta-cell">
                {result.total} entries re-hashed and re-signed from genesis.{" "}
                {result.valid
                  ? "No tampering found — every hash and signature recomputes correctly, and each entry links to the previous one."
                  : `First anomaly at entry ${result.firstInvalid}: ${result.reason}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
