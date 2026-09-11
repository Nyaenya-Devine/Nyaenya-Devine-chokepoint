/**
 * Chokepoint - SIEM Export (God Mode)
 * Export audit logs as JSON, CEF, OCSF formats for Splunk, QRadar, Sentinel
 */

import type { LedgerEntry } from "./ledger";
import type { RiskAssessment } from "./anomaly";

export type ExportFormat = "json" | "cef" | "ocsf" | "leef";

export interface ExportOptions {
  format: ExportFormat;
  includeRisk: boolean;
  fromIndex?: number;
  toIndex?: number;
  severityFilter?: string[];
}

export function exportToJson(
  entries: LedgerEntry[],
  risks: RiskAssessment[],
  options: ExportOptions
): string {
  const filtered = filterEntries(entries, options);
  
  const enriched = filtered.map(entry => {
    const risk = risks.find(r => r.entryIndex === entry.index);
    return {
      ...entry,
      risk: options.includeRisk ? risk : undefined,
      siem: {
        event_type: "audit",
        vendor: "chokepoint",
        product: "access-control",
        version: "1.1.0",
      }
    };
  });

  return JSON.stringify(enriched, null, 2);
}

export function exportToCef(
  entries: LedgerEntry[],
  risks: RiskAssessment[],
  options: ExportOptions
): string {
  const filtered = filterEntries(entries, options);
  
  const cefLines = filtered.map(entry => {
    const risk = risks.find(r => r.entryIndex === entry.index);
    const severity = risk ? severityToNumber(risk.severity) : 1;
    
    // CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extension
    const header = `CEF:0|Chokepoint|AccessControl|1.1.0|${entry.action}|${entry.action}|${severity}|`;
    
    const extension = [
      `src=${entry.actor}`,
      `dst=${entry.target}`,
      `act=${entry.action}`,
      `suser=${entry.actor}`,
      `duser=${entry.target}`,
      `cs1=${entry.id}`,
      `cs1Label=eventId`,
      `cs2=${entry.hash}`,
      `cs2Label=hash`,
      `cs3=${entry.prevHash || "genesis"}`,
      `cs3Label=prevHash`,
      `rt=${new Date(entry.ts).getTime()}`,
      `msg=${JSON.stringify(entry.meta).replace(/\|/g, "\\|")}`,
      risk ? `cs4=${risk.severity} cs4Label=riskSeverity` : "",
      risk ? `cs5=${risk.score} cs5Label=riskScore` : "",
    ].filter(Boolean).join(" ");

    return header + extension;
  });

  return cefLines.join("\n");
}

export function exportToOcsf(
  entries: LedgerEntry[],
  risks: RiskAssessment[],
  options: ExportOptions
): string {
  const filtered = filterEntries(entries, options);
  
  const ocsfEvents = filtered.map(entry => {
    const risk = risks.find(r => r.entryIndex === entry.index);
    
    return {
      time: new Date(entry.ts).getTime(),
      class_uid: 3002, // Authorization
      class_name: "Authorization",
      category_uid: 3,
      category_name: "IAM",
      type_uid: 300202, // Authorization: Grant
      type_name: "Authorization: Grant",
      severity_id: risk ? severityToOcsf(risk.severity) : 1,
      severity: risk?.severity || "Unknown",
      activity_id: 2,
      activity_name: "Grant",
      actor: {
        user: {
          name: entry.actor,
          type: "User",
        }
      },
      src_endpoint: {
        instance_uid: entry.actor,
      },
      dst_endpoint: {
        instance_uid: entry.target,
      },
      api: {
        operation: entry.action,
      },
      metadata: {
        product: {
          name: "Chokepoint",
          vendor_name: "Chokepoint Security",
          version: "1.1.0",
        },
        version: "1.1.0",
      },
      unmapped: {
        hash: entry.hash,
        prevHash: entry.prevHash,
        hmac: entry.sig,
        meta: entry.meta,
        risk: risk,
      }
    };
  });

  return JSON.stringify(ocsfEvents, null, 2);
}

export function exportToLeef(
  entries: LedgerEntry[],
  risks: RiskAssessment[],
  options: ExportOptions
): string {
  const filtered = filterEntries(entries, options);
  
  const leefLines = filtered.map(entry => {
    const risk = risks.find(r => r.entryIndex === entry.index);
    
    // LEEF:1.0|Vendor|Product|Version|EventID|...
    const header = `LEEF:1.0|Chokepoint|AccessControl|1.1.0|${entry.action}|`;
    
    const attrs = [
      `devTime=${new Date(entry.ts).toISOString()}`,
      `usrName=${entry.actor}`,
      `resource=${entry.target}`,
      `action=${entry.action}`,
      `eventId=${entry.id}`,
      `hash=${entry.hash}`,
      risk ? `severity=${risk.severity}` : "",
      risk ? `riskScore=${risk.score}` : "",
    ].filter(Boolean).join("\t");

    return header + attrs;
  });

  return leefLines.join("\n");
}

function filterEntries(entries: LedgerEntry[], options: ExportOptions): LedgerEntry[] {
  let filtered = [...entries];
  
  if (options.fromIndex !== undefined) {
    filtered = filtered.filter(e => e.index >= options.fromIndex!);
  }
  if (options.toIndex !== undefined) {
    filtered = filtered.filter(e => e.index <= options.toIndex!);
  }
  
  return filtered.sort((a, b) => a.index - b.index);
}

function severityToNumber(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 10;
    case "HIGH": return 7;
    case "MEDIUM": return 4;
    case "LOW": return 1;
    default: return 1;
  }
}

function severityToOcsf(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 5;
    case "HIGH": return 4;
    case "MEDIUM": return 3;
    case "LOW": return 2;
    default: return 1;
  }
}

export function generateExport(
  entries: LedgerEntry[],
  risks: RiskAssessment[],
  options: ExportOptions
): { content: string; mimeType: string; extension: string } {
  switch (options.format) {
    case "cef":
      return {
        content: exportToCef(entries, risks, options),
        mimeType: "text/plain",
        extension: "cef",
      };
    case "ocsf":
      return {
        content: exportToOcsf(entries, risks, options),
        mimeType: "application/json",
        extension: "ocsf.json",
      };
    case "leef":
      return {
        content: exportToLeef(entries, risks, options),
        mimeType: "text/plain",
        extension: "leef",
      };
    case "json":
    default:
      return {
        content: exportToJson(entries, risks, options),
        mimeType: "application/json",
        extension: "json",
      };
  }
}
