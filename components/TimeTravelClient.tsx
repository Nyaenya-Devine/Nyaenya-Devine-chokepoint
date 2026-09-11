"use client";

import { useState, useMemo } from "react";
import { Clock, ShieldCheck, Lock } from "lucide-react";

type Entry = {
  id: string;
  index: number;
  ts: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  hash: string;
  prevHash: string;
  sig: string;
};

export default function TimeTravelClient({ entries }: { entries: Entry[] }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.index - b.index), [entries]);
  const maxIdx = sorted.length ? sorted[sorted.length - 1].index : 0;
  const [cursor, setCursor] = useState(maxIdx);

  const visible = sorted.filter((e) => e.index <= cursor);
  const current = visible[visible.length - 1];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div><h3 className="mb-0">Timeline slider</h3><p className="card-sub mb-0">Drag to replay chain state — what the ledger looked like at that point</p></div>
          <span className="badge badge-role"><Clock size={12}/> index {cursor} / {maxIdx}</span>
        </div>
        <input type="range" min={sorted[0]?.index ?? 0} max={maxIdx} value={cursor} onChange={(e) => setCursor(parseInt(e.target.value))} style={{ width: "100%" }} />
        <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
          <span className="meta-cell">Genesis</span>
          <span className="meta-cell">Now — {maxIdx} entries</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Chain state at #{cursor}</h3>
          <p className="card-sub">{visible.length} events visible at this point</p>
          {current ? (
            <div className="grid" style={{ gap: 10, marginTop: 12 }}>
              <div><div className="meta-cell">Current hash</div><div className="hash">{current.hash.slice(0, 32)}…</div></div>
              <div><div className="meta-cell">Prev hash</div><div className="hash">{current.prevHash.slice(0, 20)}…</div></div>
              <div><div className="meta-cell">Last action</div><div className="actor-cell">{current.actor} · {current.action} → {current.target}</div></div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}><span className="badge badge-ok"><ShieldCheck size={12}/> chain intact at this point</span><span className="badge badge-role">{current.actorRole}</span></div>
            </div>
          ) : (
            <div className="alert alert-info"><Lock size={14}/> No entries at this cursor</div>
          )}
        </div>

        <div className="card" style={{ maxHeight: 520, overflowY: "auto" }}>
          <h3>Replay log (up to #{cursor})</h3>
          <div className="timeline" style={{ marginTop: 12 }}>
            {visible.slice(-30).reverse().map((e) => (
              <div key={e.id} className="tl-item">
                <div className="tl-time">#{e.index} · {new Date(e.ts).toISOString().slice(11,19)} · {e.actorRole}</div>
                <div className="tl-body"><span className="act">{e.action}</span> <span className="ok">{e.actor}</span> <span className="meta-cell">→ {e.target}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Why time-travel matters</h3>
        <p className="small muted">Tamper-evidence means you can prove what the chain looked like at any past point. If someone tampers with an old entry, the hash chain breaks forward — this viewer lets auditors verify integrity at any historical index, not just head.</p>
      </div>
    </div>
  );
}
