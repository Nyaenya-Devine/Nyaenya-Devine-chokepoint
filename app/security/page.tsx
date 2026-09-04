import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";

export default async function SecurityPage() {
  const md = await readFile(join(process.cwd(), "public", "SECURITY.md"), "utf8");
  const href = `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Link href="/" style={{ color: "var(--text-dim)", display: "inline-flex", gap: 6, alignItems: "center", marginBottom: 24 }}>
          <ArrowLeft size={16} /> Back to Chokepoint
        </Link>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 24 }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="brand-badge"><ShieldCheck size={20} /></div>
            <div>
              <h1 className="page-title mb-0">Security design &amp; threat model</h1>
              <p className="page-sub mb-0">The reasoning behind Chokepoint&apos;s controls.</p>
            </div>
          </div>
          <a className="btn btn-sm" href={href} download="SECURITY.md">
            <Download size={14} /> .md
          </a>
        </div>

        <div className="card">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.7, color: "var(--text-dim)", margin: 0 }}>{md}</pre>
        </div>
      </div>
    </div>
  );
}
