import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Fingerprint,
  Activity,
  ArrowRight,
  CheckCircle2,
  Zap,
  Eye,
  Layers,
} from "lucide-react";
import { store } from "@/lib/store";

const DEMO_USERS = [
  { username: "admin", password: "admin1234", role: "Admin", desc: "Approves critical changes, full policy control", color: "amber" },
  { username: "operator", password: "operator1234", role: "Operator", desc: "Runs scans and requests agent actions", color: "violet" },
  { username: "auditor", password: "auditor1234", role: "Auditor", desc: "Verifies integrity, exports the audit log", color: "cyan" },
  { username: "viewer", password: "viewer1234", role: "Viewer", desc: "Read-only access to the dashboard", color: "neutral" },
];

export default function LandingPage() {
  const log = store.recent(9);

  return (
    <div className="min-h-screen bg-[#050507] text-[#F5F3EF] selection:bg-[#FFB224]/30 relative overflow-hidden">
      {/* Aurora */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-[-20%] left-[5%] w-[800px] h-[600px] rounded-full blur-[80px] opacity-[0.08] bg-[#FFB224]" />
        <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[80px] opacity-[0.06] bg-[#8B5CF6]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[700px] h-[500px] rounded-full blur-[80px] opacity-[0.04] bg-[#06B6D4]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0E0E11]/80 backdrop-blur-[20px]">
        <div className="mx-auto max-w-[1280px] flex items-center justify-between px-6 md:px-10 h-[64px]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#FFFDFA] flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full blur-[8px] opacity-30 bg-gradient-to-br from-[#FFB224] to-[#8B5CF6]" />
              <ShieldCheck className="h-5 w-5 text-[#050507] relative z-10" />
            </div>
            <div>
              <div className="font-mono text-[11px] tracking-[0.18em] uppercase font-semibold">Chokepoint</div>
              <div className="font-mono text-[10px] text-white/40 -mt-0.5">v1.0 · OWASP ASI03</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.06] px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/60">Live demo · 52 tests passing</span>
            </div>
            <Link href="/login" className="rounded-full bg-[#FFFDFA] text-[#050507] px-5 py-2 text-[13px] font-semibold hover:bg-white transition flex items-center gap-2">
              Open demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 md:px-10 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          {/* Left: Hero */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFB224]/20 bg-[#FFB224]/[0.08] px-3 py-1 mb-6">
              <Zap className="h-3 w-3 text-[#FFB224]" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#FFB224]">Tamper-evident · Dual-control · RBAC</span>
            </div>

            <h1 className="font-display text-[42px] md:text-[64px] leading-[0.9] tracking-[-0.03em] font-normal">
              A chokepoint for
              <br />
              sensitive operations —
              <br />
              <span className="bg-gradient-to-r from-[#FFB224] via-[#FFB224] to-[#8B5CF6] bg-clip-text text-transparent">human and agent.</span>
            </h1>

            <p className="mt-6 text-[17px] leading-[1.6] text-white/60 max-w-[48ch] font-light">
              Least-privilege access control, separation-of-duties dual control, a tamper-evident hash-chained audit log, and live anomaly detection for the operations you can&apos;t afford to let an agent — or an insider — act on alone.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4">
              {[
                { icon: Fingerprint, title: "Role-based access control", desc: "Admin · Operator · Auditor · Viewer — least privilege by default.", accent: "amber" },
                { icon: KeyRound, title: "Dual-control (two-person rule)", desc: "Irreversible actions need a second, distinct, authorized approver.", accent: "violet" },
                { icon: Lock, title: "Tamper-evident audit chain", desc: "Every entry is hash-chained and HMAC-signed — edit one and the whole log breaks.", accent: "cyan" },
                { icon: Activity, title: "Live risk & anomaly detection", desc: "Failed logins, after-hours escalation, unknown sources, privilege creep.", accent: "amber" },
              ].map((f) => (
                <div key={f.title} className="group flex gap-4 rounded-[16px] border border-white/[0.06] bg-[#101012]/80 backdrop-blur-[20px] p-4 hover:border-white/[0.12] hover:bg-[#151519] transition-all hover:-translate-y-0.5">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center border ${f.accent === 'amber' ? 'bg-[#FFB224]/10 border-[#FFB224]/20 text-[#FFB224]' : f.accent === 'violet' ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-[#06B6D4]/10 border-[#06B6D4]/20 text-[#06B6D4]'}`}>
                    <f.icon size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold tracking-[-0.01em]">{f.title}</div>
                    <div className="mt-1 text-[13px] leading-[1.5] text-white/50">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-[#FFFDFA] text-[#050507] px-6 py-3 text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-white transition">
                Open live demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-[14px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition inline-flex items-center gap-2">
                <Layers className="h-4 w-4" /> Explore architecture
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 font-mono text-[11px] tracking-[0.08em] uppercase text-white/30">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> OWASP ASI03</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Argon2id + HMAC</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> P3 Hardened</span>
            </div>
          </div>

          {/* Right: Demo cards + log */}
          <div className="space-y-5 lg:sticky lg:top-10">
            <div className="rounded-[20px] border border-white/[0.08] bg-[#101012]/90 backdrop-blur-[20px] p-6 relative overflow-hidden group hover:border-white/[0.14] transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFB224]/20 to-transparent" />
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[20px]">Try it in 30 seconds</h3>
                <span className="rounded-full bg-[#FFB224]/10 border border-[#FFB224]/20 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] uppercase text-[#FFB224]">Live demo</span>
              </div>
              <p className="mt-2 text-[13px] text-white/50">Sign in with a demo account to explore roles and controls.</p>
              <Link href="/login" className="mt-4 inline-flex w-full justify-center items-center gap-2 rounded-full bg-[#FFFDFA] text-[#050507] py-2.5 text-[13px] font-semibold hover:bg-white transition">
                Open the live demo <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_USERS.map((u) => (
                <Link
                  href={`/login?user=${u.username}`}
                  key={u.username}
                  className="group rounded-[16px] border border-white/[0.06] bg-[#101012]/80 backdrop-blur-[20px] p-4 hover:border-white/[0.12] hover:bg-[#151519] transition-all hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase border ${
                      u.color === 'amber' ? 'bg-[#FFB224]/10 border-[#FFB224]/20 text-[#FFB224]' :
                      u.color === 'violet' ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20 text-[#8B5CF6]' :
                      u.color === 'cyan' ? 'bg-[#06B6D4]/10 border-[#06B6D4]/20 text-[#06B6D4]' :
                      'bg-white/[0.06] border-white/[0.08] text-white/60'
                    }`}>{u.role}</span>
                    <CheckCircle2 size={14} className="text-white/20 group-hover:text-[#FFB224] transition" />
                  </div>
                  <div className="mt-3 font-mono text-[14px] font-medium text-[#F5F3EF]">{u.username}</div>
                  <div className="mt-1 text-[12px] leading-[1.4] text-white/40 line-clamp-2">{u.desc}</div>
                </Link>
              ))}
            </div>

            <div className="rounded-[16px] border border-white/[0.06] bg-[#0E0E11]/80 backdrop-blur-[20px] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/40" />
                  <h3 className="font-mono text-[11px] tracking-[0.14em] uppercase font-semibold">Live audit trail</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase text-emerald-300">seed data</span>
              </div>
              <div className="p-3 font-mono text-[11px] leading-[1.8] bg-[#08080A]">
                {log.map((e) => (
                  <div key={e.id} className="flex gap-2 hover:bg-white/[0.04] px-2 py-0.5 rounded transition">
                    <span className="text-white/20 w-6 text-right shrink-0">{e.index}</span>
                    <span className="text-[#FFB224]/70 w-[130px] shrink-0 truncate">{e.action}</span>
                    <span className="text-[#8B5CF6] shrink-0">{e.actor}</span>
                    <span className="text-white/30 truncate">→ {e.target}</span>
                    <span className="ml-auto text-white/20 hidden sm:inline">{e.hash.slice(0, 8)}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.06] bg-[#101012]/50">
                <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-white/30">Hash-chained · HMAC-signed · Tamper-evident</div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#FFB224]/15 bg-gradient-to-br from-[#FFB224]/[0.08] to-[#8B5CF6]/[0.06] p-4 backdrop-blur-[20px]">
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#FFB224] mb-2">Security note</div>
              <p className="text-[12px] leading-[1.5] text-white/60">
                This demo uses in-memory storage. Every log entry is SHA-256 hash-chained with HMAC. Try editing a past entry — verification fails and the chain breaks. That&apos;s the point.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] mt-10 py-6">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-white/30">
          <span>Built by Devine Nyaenya · P3 Hardened · 52 tests · OWASP ASI03</span>
          <span className="flex items-center gap-4">
            <span>devine@nyaenya.dev</span>
            <span className="h-3 w-px bg-white/10" />
            <Link href="https://devine-nyaenya-portfolio.vercel.app" className="hover:text-white/60 transition">Portfolio ↗</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
