"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToolError } from "@/lib/toolErrors";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, ToolInput, Label } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { saveRequestHistory } from "@/lib/request-history";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidDomain, normalizeDomain } from "@/lib/toolErrors";

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

const sectionHeadingClass = "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
const fieldLabelClass = "text-xs text-zinc-500 dark:text-zinc-400";
const fieldValueClass = "mt-1 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100";
const greenBadge = "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
const redBadge = "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400";
const yellowBadge = "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";

function formatDate(iso: string): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function expiryBadge(result: Result) {
  if (result.expired) return <span className={redBadge}>Expired</span>;
  if (result.days_remaining < 10) return <span className={redBadge}>Critical</span>;
  if (result.days_remaining <= 30) return <span className={yellowBadge}>Renew soon</span>;
  return <span className={greenBadge}>Active</span>;
}

function progressClass(days: number) {
  if (days > 30) return "bg-emerald-500";
  if (days >= 10) return "bg-yellow-500";
  return "bg-red-500";
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <div className={fieldLabelClass}>{label}</div>
      <div className={fieldValueClass}>{children || "-"}</div>
    </div>
  );
}

function AssessmentRow({ passed, neutral = false, label }: { passed: boolean; neutral?: boolean; label: string }) {
  const Icon = passed ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-100 py-3 first:border-t-0 dark:border-zinc-800">
      <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <Icon className={`h-4 w-4 ${passed ? "text-emerald-500" : neutral ? "text-zinc-400" : "text-red-500"}`} />
        <span>{label}</span>
      </div>
      <span className={passed ? greenBadge : neutral ? "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" : redBadge}>
        {passed ? "Pass" : neutral ? "Neutral" : "Fail"}
      </span>
    </div>
  );
}

export default function SslCheckerPage() {
  const [domain, setDomain] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("input") ?? "" : "");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);
  const [sanFilter, setSanFilter] = useState("");
  const [fixApplied, setFixApplied] = useState<{ fix: string; original: string; corrected: string } | null>(null);

  const filteredSan = useMemo(() => {
    if (!result) return [];
    const query = sanFilter.trim().toLowerCase();
    if (!query) return result.san;
    return result.san.filter((entry) => entry.toLowerCase().includes(query));
  }, [result, sanFilter]);

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

    if (!isValidDomain(normalized.domain)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_domain);
      return;
    }

    setError(null);
    setResult(null);
    setSanFilter("");
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/ssl-checker", { domain: normalized.domain });
      setResult(data);
      saveRequestHistory({ tool: "SSL Checker", input: normalized.domain, summary: `${data.valid ? "Valid" : "Invalid"} certificate, ${data.days_remaining} days remaining` });
    } catch (e) {
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      setError(message.includes("not found") || message.includes("resolve") ? ERROR_MESSAGES.dns_error : errorFromUnknown(e, "ssl_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="ssl-checker">
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
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check SSL"}
          </Button>
          <Button variant="ghost" onClick={() => { setDomain(""); setResult(null); setError(null); setSanFilter(""); setFixApplied(null); }}>
            Clear
          </Button>
        </div>
        {loading && <LoadingSkeleton />}
        {result && (
          <div className="space-y-5">
            <Panel noPadding className="p-5">
              <h2 className={sectionHeadingClass}>Certificate Status</h2>
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {result.expired ? (
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  ) : result.valid ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {result.expired ? "Expired" : result.valid ? "Valid certificate" : "Invalid certificate"}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Valid from {formatDate(result.valid_from)} to {formatDate(result.valid_until)}
                    </p>
                  </div>
                </div>
                <div className="min-w-[220px]">
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.max(0, result.days_remaining)} days remaining
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${progressClass(result.days_remaining)}`}
                      style={{ width: `${Math.max(0, Math.min(100, (result.days_remaining / 90) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel noPadding className="p-5">
              <h2 className={sectionHeadingClass}>Certificate Details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Issued To">{result.issued_to}</Detail>
                <Detail label="Issued By">{result.issued_by}</Detail>
                <Detail label="Valid From">{formatDate(result.valid_from)}</Detail>
                <Detail label="Valid Until"><span className="inline-flex flex-wrap items-center gap-2">{formatDate(result.valid_until)} {expiryBadge(result)}</span></Detail>
                <Detail label="Days Remaining"><span className={result.days_remaining > 30 ? "text-emerald-600 dark:text-emerald-400" : result.days_remaining >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>{result.days_remaining}</span></Detail>
                <Detail label="Domain">{result.domain}</Detail>
              </div>
            </Panel>

            <Panel noPadding className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className={sectionHeadingClass}>{result.san.length} domains covered</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Showing {filteredSan.length} of {result.san.length} domains</span>
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <ToolInput className="pl-9" value={sanFilter} onChange={(event) => setSanFilter(event.target.value)} placeholder="Filter domains..." />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
                {filteredSan.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">No matching domains.</div>
                ) : (
                  filteredSan.map((entry) => (
                    <div key={entry} className="border-b border-zinc-100 px-3 py-1 font-mono text-xs text-zinc-700 last:border-b-0 dark:border-zinc-800 dark:text-zinc-300">
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel noPadding className="p-5">
              <h2 className={sectionHeadingClass}>Security Assessment</h2>
              <AssessmentRow passed={result.valid} label="Certificate is valid" />
              <AssessmentRow passed={!result.expired} label="Not expired" />
              <AssessmentRow passed={Boolean(result.issued_by)} label="Issued by trusted CA" />
              <AssessmentRow passed={result.san.some((entry) => entry.startsWith("*."))} neutral label="Wildcard certificate" />
              <AssessmentRow passed={result.san.length > 1} label="Multiple domains covered" />
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

