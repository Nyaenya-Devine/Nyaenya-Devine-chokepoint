import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/session";
import { store } from "@/lib/store";
import SimulationClient from "@/components/SimulationClient";

export const metadata = {
  title: "Policy Simulation — Chokepoint",
  description: "What-if policy testing and impersonation detection",
};

export default async function SimulationPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Simulation Playground</h1>
          <p className="page-sub">God Mode: test policy changes without touching prod, plus impersonation attack simulation.</p>
        </div>
        <span className="badge badge-risk-medium">simulation only</span>
      </div>
      <SimulationClient role={user.role} />
    </>
  );
}
