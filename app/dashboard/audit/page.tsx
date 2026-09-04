import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { getSessionUid } from "@/lib/session";
import VerifyChain from "@/components/VerifyChain";

const sevClass: Record<string, string> = {
  CRITICAL: "badge-risk-critical",
  HIGH: "badge-risk-high",
  MEDIUM: "badge-risk-medium",
  LOW: "badge-risk-low",
};

export default async function AuditPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");
  const entries = store.recent(80);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">
            Immutable, hash-chained, HMAC-signed event trail. Verify or export it below.
          </p>
        </div>
      </div>

      <div className="card mb-16">
        <VerifyChain username={user.username} role={user.role} />
      </div>

      <div className="card">
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 className="mb-0">Entries</h3>
            <p className="card-sub mb-0">{entries.length} most recent · newest first</p>
          </div>
          <span className="badge badge-ok">append-only</span>
        </div>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Time (UTC)</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Hash</th>
                <th>Sig</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.index}</td>
                  <td className="meta-cell">{new Date(e.ts).toISOString().slice(11, 19)}</td>
                  <td className="actor-cell">{e.actor}</td>
                  <td><span className="badge badge-role">{e.actorRole}</span></td>
                  <td className="mono">{e.action}</td>
                  <td className="meta-cell">{e.target}</td>
                  <td className="hash" title={e.hash}>{e.hash.slice(0, 10)}</td>
                  <td className="hash" title={e.sig}>{e.sig.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
