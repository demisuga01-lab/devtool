"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToolError } from "@/lib/toolErrors";
import { RefreshCw } from "lucide-react";
import { Button, CopyButton, ToolInput, Label, ToolHeader, ToolShell, Panel } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { saveRequestHistory } from "@/lib/request-history";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isIpAddress, isValidDomain, normalizeDomain } from "@/lib/toolErrors";

type Result = {
  domain: string;
  raw: string;
  truncated: boolean;
};

type WhoisParsed = Record<string, string | string[]>;

const sectionHeadingClass = "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
const fieldLabelClass = "text-xs text-zinc-500 dark:text-zinc-400";
const fieldValueClass = "mt-1 break-words font-mono text-sm text-zinc-900 dark:text-zinc-100";
const greenBadge = "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
const redBadge = "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400";
const yellowBadge = "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
const blueBadge = "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

function parseWhois(raw: string): WhoisParsed {
  const lines = raw.split("\n");
  const result: WhoisParsed = {};
  const multiFields = ["Domain Status", "Name Server"];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!key || !value) continue;
    if (multiFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [value];
      }
    } else if (!result[key]) {
      result[key] = value;
    }
  }
  return result;
}

function valuesFor(parsed: WhoisParsed, includes: string[]) {
  const values: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (!includes.some((needle) => key.toLowerCase().includes(needle.toLowerCase()))) continue;
    if (Array.isArray(value)) values.push(...value);
    else values.push(value);
  }
  return [...new Set(values.filter(Boolean))];
}

function firstValue(parsed: WhoisParsed, includes: string[]) {
  return valuesFor(parsed, includes)[0] ?? "";
}

function cleanStatus(value: string) {
  return value.split(/\s+/)[0]?.trim() ?? value;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function expiryBadge(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className={redBadge}>Expired</span>;
  if (days < 30) return <span className={redBadge}>Expiring soon</span>;
  if (days <= 90) return <span className={yellowBadge}>Expiring soon</span>;
  return <span className={greenBadge}>Active</span>;
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.startsWith("server")) return blueBadge;
  if (normalized.includes("prohibited") || normalized.includes("ok")) return greenBadge;
  if (normalized.includes("pending")) return yellowBadge;
  return "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <div className={fieldLabelClass}>{label}</div>
      <div className={fieldValueClass}>{children || "-"}</div>
    </div>
  );
}

export default function WhoisLookupPage() {
  const [domain, setDomain] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("input") ?? "" : "");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [fixApplied, setFixApplied] = useState<{ fix: string; original: string; corrected: string } | null>(null);

  const parsed = useMemo(() => (result ? parseWhois(result.raw) : {}), [result]);
  const expiryDate = firstValue(parsed, ["Registry Expiry Date", "Registrar Registration Expiration Date", "Expiration Date", "Expiry Date"]);
  const statuses = valuesFor(parsed, ["Domain Status"]).map(cleanStatus);
  const nameServers = valuesFor(parsed, ["Name Server"]).map((value) => value.toUpperCase());

  const run = async () => {
    const original = domain;
    if (!original.trim()) {
      setError(null);
      setResult(null);
      setFixApplied(null);
      return;
    }

    const normalized = normalizeDomain(original);
    if (normalized.wasFixed && normalized.fixDescription) {
      setDomain(normalized.domain);
      setFixApplied({ fix: normalized.fixDescription, original, corrected: normalized.domain });
    } else {
      setFixApplied(null);
    }

    if (!normalized.domain.includes(".") || isIpAddress(normalized.domain) || !isValidDomain(normalized.domain)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_domain);
      return;
    }

    setError(null);
    setResult(null);
    setShowRaw(false);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/whois-lookup", { domain: normalized.domain });
      const raw = data.raw.trim();
      if (/no match for/i.test(raw)) {
        setError(ERROR_MESSAGES.whois_no_match);
      } else if (raw.length < 20) {
        setError({
          title: "WHOIS server returned no data",
          detail: "Some TLDs, including .io and .ai, may have restricted WHOIS access.",
          suggestion: "Try the registry website for this domain, or verify the domain spelling.",
        });
      }
      setResult(data);
      saveRequestHistory({ tool: "WHOIS Lookup", input: normalized.domain, summary: `${raw.length.toLocaleString()} WHOIS characters returned` });
    } catch (e) {
      setError(errorFromUnknown(e, "whois_no_match"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell className="max-w-5xl">
      <ToolHeader
        breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Web & Network" }, { label: "WHOIS Lookup" }]}
        title="WHOIS Lookup"
        description="Look up WHOIS records for a domain."
      />
      <div className="space-y-5">
        <div>
          <Label>Domain</Label>
          <ToolInput
            value={domain}
            onChange={(e) => { setDomain(e.target.value); if (!e.target.value.trim()) { setResult(null); setError(null); setFixApplied(null); } }}
            placeholder="example.com"
            onKeyDown={(e) => e.key === "Enter" && run()}
            disabled={loading}
          />
          {fixApplied && <AutoFixBanner fix={fixApplied.fix} original={fixApplied.original} corrected={fixApplied.corrected} />}
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!domain || loading}>
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Looking up...</> : "Lookup"}
          </Button>
          <Button variant="ghost" onClick={() => { setDomain(""); setResult(null); setError(null); setShowRaw(false); setFixApplied(null); }}>
            Clear
          </Button>
        </div>
        {loading && <LoadingSkeleton />}

        {result && (
          <div className="space-y-5">
            <Panel noPadding className="p-5">
              <h2 className={sectionHeadingClass}>Registration Info</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Domain Name">{firstValue(parsed, ["Domain Name"]) || result.domain}</Field>
                <Field label="Registrar">{firstValue(parsed, ["Registrar"])}</Field>
                <Field label="Registrar URL">
                  {(() => {
                    const value = firstValue(parsed, ["Registrar URL", "Registrar WHOIS Server", "URL of the ICANN Whois Inaccuracy Complaint Form"]);
                    return value.startsWith("http") ? (
                      <a href={value} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                        {value}
                      </a>
                    ) : value;
                  })()}
                </Field>
                <Field label="Creation Date">{formatDate(firstValue(parsed, ["Creation Date", "Created Date"]))}</Field>
                <Field label="Updated Date">{formatDate(firstValue(parsed, ["Updated Date"]))}</Field>
                <Field label="Expiry Date">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{formatDate(expiryDate)}</span>
                    {expiryBadge(expiryDate)}
                  </span>
                </Field>
                <Field label="Registrant Organization">{firstValue(parsed, ["Registrant Organization", "Registrant Org"])}</Field>
                <Field label="Registrant Country">{firstValue(parsed, ["Registrant Country"])}</Field>
                <Field label="DNSSEC">{firstValue(parsed, ["DNSSEC"])}</Field>
              </div>
            </Panel>

            {statuses.length > 0 && (
              <Panel noPadding className="p-5">
                <h2 className={sectionHeadingClass}>Domain Status</h2>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <span key={status} className={statusBadgeClass(status)}>{status}</span>
                  ))}
                </div>
              </Panel>
            )}

            {nameServers.length > 0 && (
              <Panel noPadding className="p-5">
                <h2 className={sectionHeadingClass}>Name Servers</h2>
                <div className="flex flex-wrap gap-2">
                  {nameServers.map((server) => (
                    <span key={server} className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {server}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            <Panel noPadding className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={sectionHeadingClass}>Raw WHOIS Data</h2>
                <div className="flex items-center gap-2">
                  <CopyButton value={result.raw} />
                  <Button variant="secondary" onClick={() => setShowRaw((value) => !value)}>
                    {showRaw ? "Hide raw data" : "Show raw data"}
                  </Button>
                </div>
              </div>
              {showRaw && (
                <pre className="max-h-96 overflow-x-auto overflow-y-auto whitespace-pre-wrap text-xs font-mono leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {result.raw}
                </pre>
              )}
              {result.truncated && <p className="mt-3 text-xs text-zinc-500">Output truncated to 5000 characters.</p>}
            </Panel>
          </div>
        )}
      </div>
      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-500">
        WHOIS lookup is performed server-side. Your query is not logged or stored.
      </p>
    </ToolShell>
  );
}

