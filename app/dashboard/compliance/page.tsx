import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/session";
import { store } from "@/lib/store";
import ComplianceClient from "@/components/ComplianceClient";

export const metadata = {
  title: "Compliance — Chokepoint",
  description: "SOC2, ISO27001, NIST mapping from audit controls",
};

export default async function CompliancePage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Compliance Mapping</h1>
          <p className="page-sub">God Mode: maps Chokepoint controls to SOC2, ISO27001, NIST 800-53. Exportable for auditors.</p>
        </div>
        <span className="badge badge-role">{user.role}</span>
      </div>
      <ComplianceClient />
    </>
  );
}
