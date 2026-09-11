import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/session";
import { store } from "@/lib/store";
import TimeTravelClient from "@/components/TimeTravelClient";

export const metadata = {
  title: "Time-Travel Audit — Chokepoint",
  description: "Replay ledger at any point in time, verify integrity at that point",
};

export default async function TimeTravelPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login");
  const user = store.getUserById(uid);
  if (!user) redirect("/login");

  const entries = store.recent(200);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Time-Travel Audit Viewer</h1>
          <p className="page-sub">God Mode: slide through history, replay chain state at any index, verify tamper-evidence retroactively.</p>
        </div>
        <span className="badge badge-ok">{entries.length} entries</span>
      </div>
      <TimeTravelClient entries={entries} />
    </>
  );
}
