import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Fingerprint,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { store } from "@/lib/store";

const DEMO_USERS = [
  { username: "admin", password: "admin1234", role: "Admin", desc: "Approves critical changes, full policy control" },
  { username: "operator", password: "operator1234", role: "Operator", desc: "Runs scans and requests agent actions" },
  { username: "auditor", password: "auditor1234", role: "Auditor", desc: "Verifies integrity, exports the audit log" },
  { username: "viewer", password: "viewer1234", role: "Viewer", desc: "Read-only access to the dashboard" },
];

export default function LandingPage() {
  // Show a log snippet for the hero from seed data.
  const log = store.recent(9);

  return (
    <div className="land">
      <div className="hero">
        <div className="hero-kicker">Chokepoint · v1.0 · OWASP ASI03</div>
        <h1>
          A chokepoint for <br />
          sensitive operations —<br />
          <span style={{ color: "var(--accent)" }}>human and agent.</span>
        </h1>
        <p>
          Least-privilege access control, separation-of-duties dual control, a
          tamper-evident hash-chained audit log, and live anomaly detection for
          the operations you can't afford to let an agent — or an insider — act
          on alone.
        </p>

        <div className="hero-features">
          <div className="hero-feature">
            <div className="ico"><Fingerprint size={18} /></div>
            <div>
              <b>Role-based access control</b>
              <div><span>Admin · Operator · Auditor · Viewer — least privilege by default.</span></div>
            </div>
          </div>
          <div className="hero-feature">
            <div className="ico"><KeyRound size={18} /></div>
            <div>
              <b>Dual-control (two-person rule)</b>
              <div><span>Irreversible actions need a second, distinct, authorized approver.</span></div>
            </div>
          </div>
          <div className="hero-feature">
            <div className="ico"><Lock size={18} /></div>
            <div>
              <b>Tamper-evident audit chain</b>
              <div><span>Every entry is hash-chained and HMAC-signed — edit one and the whole log breaks.</span></div>
            </div>
          </div>
          <div className="hero-feature">
            <div className="ico"><Activity size={18} /></div>
            <div>
              <b>Live risk &amp; anomaly detection</b>
              <div><span>Failed logins, after-hours escalation, unknown sources, privilege creep.</span></div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="card mb-16">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 className="mb-0">Try it in 30 seconds</h3>
              <p className="card-sub mb-0">Sign in with a demo account to explore roles and controls.</p>
            </div>
            <a href="/login" className="btn btn-primary">
              Open the live demo <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <div className="grid">
          {DEMO_USERS.map((u) => (
            <Link href={`/login?user=${u.username}`} key={u.username} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="badge badge-role">{u.role}</span>
                <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div className="mono" style={{ marginTop: 12, fontSize: 14, color: "var(--text)" }}>{u.username}</div>
              <div className="meta-cell" style={{ marginTop: 4 }}>{u.desc}</div>
            </Link>
          ))}
        </div>

        <div className="card mt-16">
          <div className="row mb-8" style={{ justifyContent: "space-between" }}>
            <h3 className="mb-0">Live audit trail</h3>
            <span className="badge badge-ok">seed data</span>
          </div>
          <div className="log">
            {log.map((e) => (
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
      </div>
    </div>
  );
}
