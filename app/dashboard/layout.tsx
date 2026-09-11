import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  ScrollText,
  Activity,
  KeyRound,
  Github,
  Gauge,
  FileCheck,
  Beaker,
  Clock3,
} from "lucide-react";
import { getSessionUid } from "@/lib/session";
import { store } from "@/lib/store";
import { can, type Action } from "@/lib/authz";
import LogoutButton from "@/components/LogoutButton";

const NAV: { href: string; label: string; icon: React.ReactNode; action: Action }[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard size={17} />, action: "view_dashboard" },
  { href: "/dashboard/audit", label: "Audit log", icon: <ScrollText size={17} />, action: "view_log" },
  { href: "/dashboard/risks", label: "Risk & anomalies", icon: <Activity size={17} />, action: "view_dashboard" },
  { href: "/dashboard/access", label: "Access & controls", icon: <KeyRound size={17} />, action: "view_log" },
  { href: "/dashboard/fleet-risk", label: "Fleet risk", icon: <Gauge size={17} />, action: "view_dashboard" },
  { href: "/dashboard/compliance", label: "Compliance", icon: <FileCheck size={17} />, action: "view_log" },
  { href: "/dashboard/simulation", label: "Simulation", icon: <Beaker size={17} />, action: "view_dashboard" },
  { href: "/dashboard/time-travel", label: "Time-travel", icon: <Clock3 size={17} />, action: "view_log" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");

  return (
    <div className="shell">
      <aside className="sidenav">
        <div className="brand">
          <div className="brand-badge"><ShieldCheck size={19} /></div>
          <div>
            <div className="brand-name">Chokepoint</div>
            <div className="brand-sub">access control</div>
          </div>
        </div>

        <nav className="nav-group">
          <div className="nav-label">Console</div>
          {NAV.map((item) =>
            can(user.role, item.action) ? (
              <Link key={item.href} href={item.href} className="nav-item">
                {item.icon} {item.label}
              </Link>
            ) : null
          )}
          <div className="nav-label">Documentation</div>
          <a href="/security" className="nav-item">
            <ScrollText size={17} /> Security write-up
          </a>
          <a href="/architecture.svg" target="_blank" className="nav-item" rel="noreferrer">
            <Github size={17} /> Architecture diagram
          </a>
        </nav>

        <div className="side-user">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="name">{user.displayName}</div>
              <div className="role">{user.role}</div>
            </div>
            <LogoutButton />
          </div>
        </div>

        <div className="meta-cell" style={{ marginTop: 14, fontSize: 11, padding: "0 4px" }}>
          PWA · installable on desktop &amp; Android
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
