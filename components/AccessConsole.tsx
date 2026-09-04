"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, XCircle, RefreshCw, Lock } from "lucide-react";

interface MandateView {
  id: string;
  action: string;
  target: string;
  state: "pending" | "approved" | "rejected";
  reason: string;
  createdAt: string;
  requestedBy: string;
}

const DUAL = ["grant_role", "elevate_privilege", "revoke_access", "rotate_secret", "delete_record"];

export default function AccessConsole({
  requesterRole,
  pending,
  canRequest,
  canApprove,
}: {
  requesterRole: string;
  pending: MandateView[];
  canRequest: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("operator");
  const [action, setAction] = useState("grant_role");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "bad" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/mandates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target, reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ kind: "bad", text: data.error }); return; }
    setMsg({
      kind: "ok",
      text: data.status === "pending"
        ? `Mandate created (${data.status}). A second authorized approver must now approve it.`
        : `Action executed immediately (not dual-controlled).`,
    });
    router.refresh();
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/mandates/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ kind: "bad", text: data.error }); return; }
    setMsg({ kind: "ok", text: `Mandate ${decision} by an independent approver.` });
    router.refresh();
  }

  return (
    <div>
      <h3>Dual-control console</h3>
      <p className="card-sub">Request a privileged change, then get it approved by a second user.</p>

      <div className="grid grid-2">
        <div>
          <div className="field">
            <label>Action</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)} disabled={!canRequest}>
              {DUAL.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Target</label>
            <input className="input" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canRequest} />
          </div>
          <div className="field">
            <label>Reason (audited)</label>
            <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification for this change…" disabled={!canRequest} />
          </div>
          <button className="btn btn-primary" onClick={request} disabled={busy || !canRequest}>
            <KeyRound size={15} /> Request mandate
          </button>
          {!canRequest && <div className="meta-cell mt-8">Operators and admins can request dual-control changes.</div>}
        </div>

        <div>
          <div className="row mb-8" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Pending mandates</b>
            <span className="badge badge-risk-medium">{pending.length} open</span>
          </div>
          {pending.length === 0 ? (
            <div className="alert alert-ok"><Lock size={15} /> No pending mandates right now.</div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              {pending.map((m) => (
                <div key={m.id} className="alert alert-info" style={{ padding: 12, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono">{m.action} → {m.target}</span>
                    <span className="badge badge-risk-medium">pending</span>
                  </div>
                  {m.reason && <div className="meta-cell">{m.reason}</div>}
                  {canApprove ? (
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => decide(m.id, "approved")} disabled={busy}>
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => decide(m.id, "rejected")} disabled={busy}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  ) : <div className="meta-cell">Awaiting admin approval.</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className={`alert mt-16 ${msg.kind === "ok" ? "alert-ok" : msg.kind === "bad" ? "alert-bad" : "alert-info"}`}>
          {msg.kind === "ok" ? <CheckCircle2 size={15} /> : <RefreshCw size={15} />}
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
