"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToolError } from "@/lib/toolErrors";
import { RefreshCw } from "lucide-react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, ToolInput, Label, ToolSelect } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { saveRequestHistory } from "@/lib/request-history";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, LoadingSkeleton, isValidDomain, normalizeDomain } from "@/lib/toolErrors";

type DnsType = "A" | "AAAA" | "MX" | "NS" | "TXT" | "CNAME" | "SOA";

type Result = {
  domain: string;
  type: string;
  records: string[];
  query_time_ms: number;
  error?: boolean;
};

const TYPES: DnsType[] = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];

const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3";
const fieldLabelClass = "text-xs text-zinc-500 dark:text-zinc-400";
const fieldValueClass = "text-sm font-mono text-zinc-900 dark:text-zinc-100";

function parseMx(record: string) {
  const parts = record.trim().split(/\s+/);
  if (parts.length < 2) return { priority: "-", host: record };
  return { priority: parts[0], host: parts.slice(1).join(" ") };
}

function parseSoa(record: string) {
  const parts = record.trim().split(/\s+/);
  return [
    { label: "Primary NS", value: parts[0] },
    { label: "Admin Email", value: parts[1] },
    { label: "Serial", value: parts[2] },
    { label: "Refresh", value: parts[3] },
    { label: "Retry", value: parts[4] },
    { label: "Expire", value: parts[5] },
    { label: "TTL", value: parts[6] },
  ].filter((field) => field.value);
}

export default function DnsLookupPage() {
  const [domain, setDomain] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("input") ?? "" : "");
  const [type, setType] = useState<DnsType | "All">("All");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixApplied, setFixApplied] = useState<{ fix: string; original: string; corrected: string } | null>(null);

  const run = async () => {
    const original = domain;
    if (!original.trim()) {
      setError(null);
      setResults(null);
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
      setResults(null);
      setError(ERROR_MESSAGES.invalid_domain);
      return;
    }

    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const requestedTypes = type === "All" ? TYPES : [type];
      const data = await Promise.all(
        requestedTypes.map(async (recordType) => {
          try {
            return await apiGet<Result>("/tools/dns-lookup", { domain: normalized.domain, type: recordType });
          } catch {
            return {
              domain: normalized.domain,
              type: recordType,
              records: [],
              query_time_ms: 0,
              error: true,
            };
          }
        })
      );
      setResults(data);
      const recordCount = data.reduce((sum, item) => sum + item.records.length, 0);
      saveRequestHistory({ tool: "DNS Lookup", input: normalized.domain, summary: `${recordCount} records across ${data.length} lookup type${data.length === 1 ? "" : "s"}` });
      const everyEmpty = data.every((item) => item.records.length === 0 && !item.error);
      if (everyEmpty && type === "All") {
        setError({
          ...ERROR_MESSAGES.dns_error,
          detail: `No DNS records found for ${normalized.domain}. The domain may not exist or have no public DNS records.`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resultMap = useMemo(() => {
    const map = new Map<string, Result>();
    results?.forEach((item) => map.set(item.type, item));
    return map;
  }, [results]);

  const visibleSections = useMemo(
    () => TYPES.filter((recordType) => (resultMap.get(recordType)?.records.length ?? 0) > 0),
    [resultMap]
  );

  const queryTime = results?.length ? Math.max(...results.map((item) => item.query_time_ms || 0)) : 0;
  const failedSections = results?.filter((item) => item.error) ?? [];
  const selectedTypeEmpty =
    Boolean(results && type !== "All" && visibleSections.length === 0 && !results[0]?.error);

  return (
    <ToolShell slug="dns-lookup">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Domain</Label>
            <ToolInput
              value={domain}
              onChange={(e) => { setDomain(e.target.value); if (!e.target.value.trim()) { setResults(null); setError(null); setFixApplied(null); } }}
              placeholder="example.com"
              onKeyDown={(e) => e.key === "Enter" && run()}
              disabled={loading}
            />
            {fixApplied && <AutoFixBanner fix={fixApplied.fix} original={fixApplied.original} corrected={fixApplied.corrected} />}
            {error && <InlineError error={error} />}
          </div>
          <div>
            <Label>Record type</Label>
            <ToolSelect
              value={type}
              onChange={(e) => setType(e.target.value as DnsType | "All")}
              className="w-full sm:w-36"
              disabled={loading}
            >
              <option>All</option>
              {TYPES.map((recordType) => (
                <option key={recordType}>{recordType}</option>
              ))}
            </ToolSelect>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!domain || loading}>
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Looking up...</> : "Lookup"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setDomain("");
              setType("All");
              setResults(null);
              setError(null);
              setFixApplied(null);
            }}
          >
            Clear
          </Button>
        </div>
        {loading && <LoadingSkeleton />}
        {results && (
          <div className="space-y-4">
            {visibleSections.length === 0 && (
              <Panel noPadding className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {selectedTypeEmpty ? `No ${type} records found for this domain.` : "No DNS records found for the selected lookup."}
              </Panel>
            )}

            {failedSections.map((item) => (
              <RecordSection key={`${item.type}-error`} title={`${item.type} Records`}>
                <p className="text-xs text-red-500">Failed to fetch {item.type} records.</p>
              </RecordSection>
            ))}

            {resultMap.get("A")?.records.length ? (
              <RecordSection title="A Records (IPv4)">
                <PillList records={resultMap.get("A")?.records ?? []} />
              </RecordSection>
            ) : null}

            {resultMap.get("AAAA")?.records.length ? (
              <RecordSection title="AAAA Records (IPv6)">
                <PillList records={resultMap.get("AAAA")?.records ?? []} />
              </RecordSection>
            ) : null}

            {resultMap.get("MX")?.records.length ? (
              <RecordSection title="MX Records (Mail)">
                <div className="space-y-2">
                  {(resultMap.get("MX")?.records ?? []).map((record, index) => {
                    const mx = parseMx(record);
                    return (
                      <div
                        key={`${record}-${index}`}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                      >
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Priority {mx.priority}
                        </span>
                        <code className={fieldValueClass}>{mx.host}</code>
                      </div>
                    );
                  })}
                </div>
              </RecordSection>
            ) : null}

            {resultMap.get("NS")?.records.length ? (
              <RecordSection title="NS Records (Nameservers)">
                <PillList records={resultMap.get("NS")?.records ?? []} />
              </RecordSection>
            ) : null}

            {resultMap.get("TXT")?.records.length ? (
              <RecordSection title="TXT Records">
                <div className="space-y-2">
                  {(resultMap.get("TXT")?.records ?? []).map((record, index) => (
                    <pre
                      key={`${record}-${index}`}
                      className="whitespace-pre-wrap break-all rounded-xl bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                    >
                      {record}
                    </pre>
                  ))}
                </div>
              </RecordSection>
            ) : null}

            {resultMap.get("CNAME")?.records.length ? (
              <RecordSection title="CNAME Records">
                <PillList records={resultMap.get("CNAME")?.records ?? []} />
              </RecordSection>
            ) : null}

            {resultMap.get("SOA")?.records.length ? (
              <RecordSection title="SOA Record">
                <div className="space-y-4">
                  {(resultMap.get("SOA")?.records ?? []).map((record, index) => (
                    <div key={`${record}-${index}`} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {parseSoa(record).map((field) => (
                          <div key={field.label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
                            <div className={fieldLabelClass}>{field.label}</div>
                            <div className={`${fieldValueClass} mt-1 break-all`}>{field.value}</div>
                          </div>
                        ))}
                      </div>
                      <pre className="whitespace-pre-wrap break-all rounded-xl bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                        {record}
                      </pre>
                    </div>
                  ))}
                </div>
              </RecordSection>
            ) : null}

            {results.some((item) => item.error) && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
                Some record types could not be resolved. Available records are shown above.
              </div>
            )}

            <div className="text-xs text-zinc-400 dark:text-zinc-500">Resolved in {queryTime}ms</div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function RecordSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel noPadding className="p-4">
      <h2 className={sectionHeadingClass}>{title}</h2>
      {children}
    </Panel>
  );
}

function PillList({ records }: { records: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {records.map((record, index) => (
        <code
          key={`${record}-${index}`}
          className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-mono text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {record}
        </code>
      ))}
    </div>
  );
}

