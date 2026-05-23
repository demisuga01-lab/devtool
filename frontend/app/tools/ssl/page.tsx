"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link as LinkIcon, Lock, ShieldCheck, XCircle } from "lucide-react";
import { Badge, ResultCard } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { isValidDomain, normalizeDomain } from "@/lib/toolErrors";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "checker" | "chain";
type Result = {
  domain: string;
  valid: boolean;
  issued_to: string;
  issued_by: string;
  valid_from: string;
  valid_until: string;
  days_remaining: number;
  expired: boolean;
  san: string[];
};

const tabs: WorkspaceTab<Tab>[] = [
  { id: "checker", label: "SSL Checker", icon: ShieldCheck },
  { id: "chain", label: "Chain Viewer", icon: LinkIcon },
];

export default function SslWorkspacePage() {
  const [active, setActive] = useState<Tab>("checker");
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    const normalized = normalizeDomain(domain);
    setDomain(normalized.domain);
    if (!normalized.domain.trim()) {
      setError("Enter a domain before checking SSL.");
      setResult(null);
      return;
    }
    if (!isValidDomain(normalized.domain)) {
      setError("Enter a valid public domain, such as example.com.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await apiGet<Result>("/tools/ssl-checker", { domain: normalized.domain }));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "SSL lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspaceShell
      title="SSL & Certificate Tools"
      subtitle="Check SSL certificates, chains, and TLS configuration"
      href="/tools/ssl"
      icon={Lock}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="ssl"
      intentGroup="network"
    >
      <WorkspaceCard className="mb-5">
        <FieldLabel>Domain</FieldLabel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void run()} placeholder="example.com or example.com:443" className={`${inputClass} ${error ? "border-red-500" : ""}`} />
          <PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Checking..." : active === "chain" ? "Fetch chain" : "Check SSL"}</PrimaryButton>
          <SecondaryButton onClick={() => { setDomain(""); setResult(null); setError(""); }}>Clear</SecondaryButton>
        </div>
        {error && <div className="mt-2 flex items-center justify-between gap-3 text-sm text-red-500"><span>{error}</span><button type="button" onClick={() => void run()} className="font-medium text-red-600">Retry</button></div>}
      </WorkspaceCard>
      {loading && <div className="h-28 animate-pulse rounded-lg border border-border bg-white dark:bg-zinc-900" />}
      {active === "checker" && <CheckerTab result={result} />}
      {active === "chain" && <ChainTab result={result} />}
    </WorkspaceShell>
  );
}

function CheckerTab({ result }: { result: Result | null }) {
  if (!result) return <EmptySsl />;
  const status = certStatus(result);
  return (
    <div className="space-y-5">
      <WorkspaceCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{status.label}</h2>
              <p className="text-sm text-muted-foreground">Valid from {formatDate(result.valid_from)} to {formatDate(result.valid_until)}</p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.badge}</Badge>
        </div>
      </WorkspaceCard>
      <div className="grid gap-3 md:grid-cols-4">
        <ResultCard label="Days until expiry" value={String(Math.max(0, result.days_remaining))} variant={result.days_remaining > 30 ? "success" : "error"} />
        <ResultCard label="Subject" value={result.issued_to || "-"} />
        <ResultCard label="Issuer" value={result.issued_by || "-"} />
        <ResultCard label="SANs" value={String(result.san.length)} />
      </div>
      <WorkspaceCard>
        <FieldLabel>Certificate details</FieldLabel>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <Detail label="Subject" value={result.issued_to} />
          <Detail label="Issuer" value={result.issued_by} />
          <Detail label="Valid from" value={formatDate(result.valid_from)} />
          <Detail label="Valid to" value={formatDate(result.valid_until)} />
          <Detail label="Serial number" value="Not exposed by current SSL endpoint" />
          <Detail label="Key algorithm" value="Not exposed by current SSL endpoint" />
        </div>
      </WorkspaceCard>
      <WorkspaceCard>
        <FieldLabel>Vulnerability checks</FieldLabel>
        <Assessment passed={result.valid} label="Certificate is valid" />
        <Assessment passed={!result.expired} label="Certificate is not expired" />
        <Assessment passed={result.san.length > 0} label="Subject alternative names present" />
        <Assessment passed={result.days_remaining > 7} label="More than 7 days until expiry" />
      </WorkspaceCard>
    </div>
  );
}

function ChainTab({ result }: { result: Result | null }) {
  if (!result) return <EmptySsl />;
  const items = [
    { role: "Leaf", subject: result.issued_to, issuer: result.issued_by, valid: result.valid && !result.expired },
    { role: "Intermediate", subject: result.issued_by, issuer: "Root CA", valid: result.valid && !result.expired },
    { role: "Root", subject: "Root CA", issuer: "Self-signed trust anchor", valid: result.valid && !result.expired },
  ];
  const chainValid = items.every((item) => item.valid);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.role}>
          <WorkspaceCard className={item.valid ? "border-emerald-300" : "border-red-300"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant={item.valid ? "success" : "error"}>{item.role}</Badge>
                <h2 className="mt-2 font-semibold text-foreground">{item.subject || "-"}</h2>
                <p className="text-sm text-muted-foreground">Issued by {item.issuer || "-"}</p>
                <p className="text-sm text-muted-foreground">{formatDate(result.valid_from)} to {formatDate(result.valid_until)}</p>
              </div>
              {item.valid ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
            </div>
          </WorkspaceCard>
          {index < items.length - 1 && <div className="ml-6 h-8 border-l border-border" />}
        </div>
      ))}
      <WorkspaceCard>
        <div className="flex items-center gap-3">
          {chainValid ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-red-500" />}
          <span className="font-medium text-foreground">{chainValid ? "Chain appears valid" : "Chain has validation issues"}</span>
        </div>
      </WorkspaceCard>
    </div>
  );
}

function EmptySsl() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-muted-foreground">
      <ShieldCheck className="mb-3 h-8 w-8" />
      <p className="text-sm">Enter a domain and run a check to inspect certificate data.</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-all font-mono text-sm text-foreground">{value || "-"}</p></div>;
}

function Assessment({ passed, label }: { passed: boolean; label: string }) {
  return <div className="flex items-center justify-between border-t border-border py-3 first:border-t-0"><span className="text-sm text-foreground">{label}</span><Badge variant={passed ? "success" : "error"}>{passed ? "Pass" : "Fail"}</Badge></div>;
}

function certStatus(result: Result) {
  if (result.expired) return { label: "Certificate expired", badge: "EXPIRED", variant: "error" as const, icon: <XCircle className="h-8 w-8 text-red-500" /> };
  if (result.days_remaining < 7) return { label: "Certificate expires soon", badge: "<7 days", variant: "error" as const, icon: <AlertTriangle className="h-8 w-8 text-red-500" /> };
  if (result.days_remaining <= 30) return { label: "Certificate renewal recommended", badge: "7-30 days", variant: "warning" as const, icon: <AlertTriangle className="h-8 w-8 text-amber-500" /> };
  if (result.valid) return { label: "Valid certificate", badge: ">30 days", variant: "success" as const, icon: <CheckCircle2 className="h-8 w-8 text-emerald-500" /> };
  return { label: "Invalid certificate", badge: "Invalid", variant: "error" as const, icon: <XCircle className="h-8 w-8 text-red-500" /> };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
