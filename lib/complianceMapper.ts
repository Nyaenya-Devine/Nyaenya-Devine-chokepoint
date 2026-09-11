/**
 * Chokepoint - Compliance Mapper (God Mode)
 * Auto-maps audit events to OWASP, NIST, SOC2, MITRE ATT&CK
 */

import type { LedgerEntry } from "./ledger";

export interface ComplianceMapping {
  framework: "OWASP_ASI" | "NIST_800_53" | "SOC2" | "MITRE_ATT&CK" | "ISO27001";
  controlId: string;
  controlName: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
}

export interface ComplianceReport {
  entry: LedgerEntry;
  mappings: ComplianceMapping[];
  overallRisk: number;
  compliant: boolean;
  gaps: string[];
}

const COMPLIANCE_DB: Record<string, ComplianceMapping[]> = {
  "login_failed": [
    {
      framework: "NIST_800_53",
      controlId: "AC-7",
      controlName: "Unsuccessful Logon Attempts",
      description: "Enforce limit of consecutive invalid logon attempts",
      severity: "MEDIUM",
      evidence: "Failed login detected, account lockout should trigger",
    },
    {
      framework: "MITRE_ATT&CK",
      controlId: "T1110",
      controlName: "Brute Force",
      description: "Adversary attempting to guess credentials",
      severity: "HIGH",
      evidence: "Multiple failed logins indicate brute force",
    },
  ],
  "grant_role": [
    {
      framework: "OWASP_ASI",
      controlId: "ASI03",
      controlName: "Identity & Privilege Abuse",
      description: "AI agent or user escalating privileges beyond intended role",
      severity: "CRITICAL",
      evidence: "Privilege escalation attempt",
    },
    {
      framework: "NIST_800_53",
      controlId: "AC-3",
      controlName: "Access Enforcement",
      description: "Enforce approved authorizations for logical access",
      severity: "HIGH",
      evidence: "Role grant requires dual-control approval",
    },
    {
      framework: "SOC2",
      controlId: "CC6.1",
      controlName: "Logical Access Controls",
      description: "Restrict logical access to authorized users",
      severity: "HIGH",
      evidence: "Privilege change must be logged and approved",
    },
  ],
  "approve": [
    {
      framework: "NIST_800_53",
      controlId: "AC-3(2)",
      controlName: "Dual Authorization",
      description: "Enforce dual authorization for privileged actions",
      severity: "MEDIUM",
      evidence: "Dual-control approval enforced",
    },
    {
      framework: "SOC2",
      controlId: "CC6.2",
      controlName: "Prior to Issuing System Credentials",
      description: "Prior to issuing credentials, registration and authorization",
      severity: "MEDIUM",
      evidence: "Approval workflow logged",
    },
  ],
  "delete": [
    {
      framework: "NIST_800_53",
      controlId: "SI-10",
      controlName: "Information Input Validation",
      description: "Check validity of information inputs",
      severity: "HIGH",
      evidence: "Destructive action requires validation and approval",
    },
    {
      framework: "MITRE_ATT&CK",
      controlId: "T1070",
      controlName: "Indicator Removal",
      description: "Adversary deleting data to hide activity",
      severity: "CRITICAL",
      evidence: "Delete action is high-risk",
    },
  ],
  "rotate_secret": [
    {
      framework: "NIST_800_53",
      controlId: "SC-12",
      controlName: "Cryptographic Key Establishment and Management",
      description: "Establish and manage cryptographic keys",
      severity: "HIGH",
      evidence: "Secret rotation is security-sensitive",
    },
    {
      framework: "ISO27001",
      controlId: "A.10.1.2",
      controlName: "Key Management",
      description: "Policy on use, protection and lifetime of cryptographic keys",
      severity: "HIGH",
      evidence: "Key rotation logged with dual-control",
    },
  ],
  "grant_agent": [
    {
      framework: "OWASP_ASI",
      controlId: "ASI03",
      controlName: "Identity & Privilege Abuse",
      description: "AI agent granted excessive permissions",
      severity: "CRITICAL",
      evidence: "Agent privilege grant is top OWASP agentic AI risk",
    },
  ],
};

export function mapToCompliance(entry: LedgerEntry): ComplianceReport {
  const mappings: ComplianceMapping[] = [];
  const gaps: string[] = [];

  // Find matching compliance controls
  for (const [pattern, controls] of Object.entries(COMPLIANCE_DB)) {
    if (new RegExp(pattern, "i").test(entry.action)) {
      mappings.push(...controls);
    }
  }

  // Generic mappings for all privileged actions
  if (/grant|elevate|approve|delete|rotate|revoke/i.test(entry.action)) {
    mappings.push({
      framework: "NIST_800_53",
      controlId: "AU-2",
      controlName: "Audit Events",
      description: "Ensure audit events are logged",
      severity: "MEDIUM",
      evidence: `Action ${entry.action} is audit-logged with hash chain`,
    });

    mappings.push({
      framework: "NIST_800_53",
      controlId: "AU-9",
      controlName: "Protection of Audit Information",
      description: "Protect audit information from unauthorized modification",
      severity: "HIGH",
      evidence: "Ledger is hash-chained and HMAC-signed, tamper-evident",
    });
  }

  // Check for gaps
  if (/grant_role|elevate/i.test(entry.action) && !entry.meta) {
    gaps.push("Missing justification for privilege escalation");
  }

  if (/after-hours/i.test(entry.ts) && /grant|approve|delete/i.test(entry.action)) {
    gaps.push("After-hours privileged action without emergency justification");
  }

  // Calculate risk
  const overallRisk = mappings.reduce((sum, m) => {
    const weight = m.severity === "CRITICAL" ? 25 : m.severity === "HIGH" ? 15 : m.severity === "MEDIUM" ? 5 : 1;
    return sum + weight;
  }, 0);

  const compliant = gaps.length === 0 && overallRisk < 50;

  return {
    entry,
    mappings,
    overallRisk: Math.min(100, overallRisk),
    compliant,
    gaps,
  };
}

export function generateComplianceReport(entries: LedgerEntry[]): {
  reports: ComplianceReport[];
  summary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    criticalGaps: number;
    frameworkCoverage: Record<string, number>;
  };
} {
  const reports = entries.map(mapToCompliance);

  const frameworkCoverage: Record<string, number> = {};
  for (const report of reports) {
    for (const mapping of report.mappings) {
      frameworkCoverage[mapping.framework] = (frameworkCoverage[mapping.framework] || 0) + 1;
    }
  }

  return {
    reports,
    summary: {
      total: reports.length,
      compliant: reports.filter(r => r.compliant).length,
      nonCompliant: reports.filter(r => !r.compliant).length,
      criticalGaps: reports.reduce((s, r) => s + r.gaps.length, 0),
      frameworkCoverage,
    },
  };
}
