"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToolError } from "@/lib/toolErrors";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, Label, CopyButton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidUrl, normalizeUrl } from "@/lib/toolErrors";

type Result = {
  url: string;
  status_code: number;
  elapsed_ms: number;
  headers: Record<string, string>;
};

type SecurityCheck = {
  label: string;
  keys: string[];
};

const cardClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3";
const fieldLabelClass = "text-xs text-zinc-500 dark:text-zinc-400";
const fieldValueClass = "text-sm font-mono text-zinc-900 dark:text-zinc-100";
const greenBadge =
  "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
const redBadge =
  "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400";
const yellowBadge =
  "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
const zincBadge =
  "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

const securityChecks: SecurityCheck[] = [
  { label: "HSTS", keys: ["strict-transport-security"] },
  { label: "CSP", keys: ["content-security-policy", "content-security-policy-report-only"] },
  { label: "Clickjacking Protection", keys: ["x-frame-options"] },
  { label: "MIME Sniffing", keys: ["x-content-type-options"] },
  { label: "XSS Protection", keys: ["x-xss-protection"] },
  { label: "Referrer Policy", keys: ["referrer-policy"] },
  { label: "Permissions Policy", keys: ["permissions-policy"] },
];

function getHeader(headers: Record<string, string>, keys: string[]) {
  const entries = Object.entries(headers);
  for (const key of keys) {
    const match = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (match) return match[1];
  }
  return "";
}

function statusInfo(code: number) {
  if (code >= 200 && code < 300) return { label: "OK", className: greenBadge };
  if (code >= 300 && code < 400) return { label: "Redirect", className: yellowBadge };
  if (code >= 400 && code < 500) return { label: "Client Error", className: redBadge };
  if (code >= 500) return { label: "Server Error", className: redBadge };
  return { label: "Unknown", className: zincBadge };
}

function responseClass(ms: number) {
  if (ms < 100) return "text-emerald-600 dark:text-emerald-400";
  if (ms <= 500) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function scoreColor(score: number) {
  if (score >= 5) return "bg-emerald-500";
  if (score >= 3) return "bg-yellow-500";
  return "bg-red-500";
}

function truncate(value: string, max = 60) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function HttpHeadersPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);
  const [headerFilter, setHeaderFilter] = useState("");
  const [fixApplied, setFixApplied] = useState<{ fix: string; original: string; corrected: string } | null>(null);

  const run = async () => {
    const original = url;
    if (!original.trim()) {
      setError(null);
      setResult(null);
      setFixApplied(null);
      return;
    }

    const normalized = normalizeUrl(original);
    if (normalized.wasFixed && normalized.fixDescription) {
      setUrl(normalized.url);
      setFixApplied({ fix: normalized.fixDescription, original, corrected: normalized.url });
    } else {
      setFixApplied(null);
    }

    if (!isValidUrl(normalized.url)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_url);
      return;
    }

    setError(null);
    setResult(null);
    setHeaderFilter("");
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/http-headers", { url: normalized.url });
      setResult(data);
    } catch (e) {
      setError(errorFromUnknown(e, "network_error"));
    } finally {
      setLoading(false);
    }
  };

  const headerRows = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([name, value]) => {
        const query = headerFilter.trim().toLowerCase();
        if (!query) return true;
        return name.toLowerCase().includes(query) || value.toLowerCase().includes(query);
      });
  }, [result, headerFilter]);

  const securityRows = useMemo(() => {
    if (!result) return [];
    return securityChecks.map((check) => ({
      ...check,
      value: getHeader(result.headers, check.keys),
    }));
  }, [result]);

  const presentCount = securityRows.filter((row) => row.value).length;
  const status = result ? statusInfo(result.status_code) : null;

  return (
    <ToolShell slug="http-headers">
      <div className="space-y-5">
        <div>
          <Label>URL</Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (!e.target.value.trim()) { setResult(null); setError(null); setFixApplied(null); } }}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && run()}
            disabled={loading}
          />
          {fixApplied && <AutoFixBanner fix={fixApplied.fix} original={fixApplied.original} corrected={fixApplied.corrected} />}
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!url || loading}>
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check headers"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUrl("");
              setResult(null);
              setError(null);
              setHeaderFilter("");
              setFixApplied(null);
            }}
          >
            Clear
          </Button>
        </div>
        {loading && <LoadingSkeleton />}
        {result && status && (
          <div className="space-y-5">
            <section>
              <h2 className={sectionHeadingClass}>Response Summary</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard label="Status Code">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                      {result.status_code}
                    </span>
                    <span className={status.className}>{status.label}</span>
                  </div>
                </SummaryCard>
                <SummaryCard label="Response Time">
                  <div className={`text-3xl font-bold ${responseClass(result.elapsed_ms)}`}>
                    {result.elapsed_ms}ms
                  </div>
                </SummaryCard>
                <SummaryCard label="Headers Count">
                  <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    {Object.keys(result.headers).length}
                  </div>
                </SummaryCard>
              </div>
            </section>

            <section className={`${cardClass} p-4`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={sectionHeadingClass}>Security Headers Analysis</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {presentCount}/{securityChecks.length} security headers present
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${scoreColor(presentCount)}`}
                      style={{ width: `${(presentCount / securityChecks.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {securityRows.map((row) => {
                  const present = Boolean(row.value);
                  return (
                    <div
                      key={row.label}
                      className="grid gap-2 py-3 sm:grid-cols-[minmax(180px,1fr)_auto_minmax(0,2fr)] sm:items-center"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {present ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {row.label}
                      </div>
                      <span className={present ? greenBadge : zincBadge}>{present ? "Present" : "Missing"}</span>
                      <code className="break-all text-xs text-zinc-500 dark:text-zinc-400 sm:text-right">
                        {present ? truncate(row.value) : "-"}
                      </code>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className={sectionHeadingClass}>All Headers</h2>
                  <CopyButton
                    value={Object.entries(result.headers)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                    label="Copy all"
                  />
                </div>
                <Input
                  value={headerFilter}
                  onChange={(e) => setHeaderFilter(e.target.value)}
                  placeholder="Filter headers..."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950/60">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Header Name
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headerRows.map(([name, value]) => (
                      <tr
                        key={name}
                        className="odd:bg-white even:bg-zinc-50/70 dark:odd:bg-zinc-900 dark:even:bg-zinc-950/40"
                      >
                        <td className="w-1/3 break-all px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {name}
                        </td>
                        <td className="break-all px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {headerRows.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No headers match your filter.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function SummaryCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className={fieldLabelClass}>{label}</div>
      <div className={`mt-2 ${fieldValueClass}`}>{children}</div>
    </div>
  );
}

