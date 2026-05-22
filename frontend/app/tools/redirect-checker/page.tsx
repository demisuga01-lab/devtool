"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ToolError } from "@/lib/toolErrors";
import { ArrowDown, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, ToolInput, Label, CopyButton } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { saveRequestHistory } from "@/lib/request-history";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, LoadingSkeleton, WarningBanner, errorFromUnknown, isValidUrl, normalizeUrl } from "@/lib/toolErrors";

type Hop = {
  step: number;
  url: string;
  status_code: number;
  location: string | null;
};

type Result = {
  url: string;
  hops: Hop[];
  final_url: string;
  total_hops: number;
};

const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3";
const fieldLabelClass = "text-xs text-zinc-500 dark:text-zinc-400";
const greenBadge =
  "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
const redBadge =
  "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400";
const yellowBadge =
  "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
const zincBadge =
  "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

function statusBadgeClass(code: number) {
  if (code >= 200 && code < 300) return greenBadge;
  if (code >= 300 && code < 400) return yellowBadge;
  if (code >= 400) return redBadge;
  return zincBadge;
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hostWithoutWww(value: string) {
  return value.toLowerCase().replace(/^www\./, "");
}

function countRedirects(result: Result) {
  return result.hops.filter((hop) => hop.location || (hop.status_code >= 300 && hop.status_code < 400)).length;
}

function isHttpToHttps(result: Result) {
  const firstUrl = safeUrl(result.hops[0]?.url ?? result.url);
  const targetUrl = safeUrl(result.hops[0]?.location ?? result.final_url);
  return Boolean(firstUrl && targetUrl && firstUrl.protocol === "http:" && targetUrl.protocol === "https:");
}

function hasWwwRedirect(result: Result) {
  const firstUrl = safeUrl(result.hops[0]?.url ?? result.url);
  const finalUrl = safeUrl(result.final_url);
  if (!firstUrl || !finalUrl) return false;
  const firstHost = firstUrl.hostname.toLowerCase();
  const finalHost = finalUrl.hostname.toLowerCase();
  return firstHost !== finalHost && hostWithoutWww(firstHost) === hostWithoutWww(finalHost);
}

function finalStatus(result: Result) {
  return result.hops[result.hops.length - 1]?.status_code ?? 0;
}

function resultBadge(result: Result) {
  const last = finalStatus(result);
  if (last >= 400) return { label: "Error", className: redBadge };
  if (countRedirects(result) > 0 || result.total_hops > 1) return { label: "Redirected", className: yellowBadge };
  return { label: "Direct", className: greenBadge };
}

export default function RedirectCheckerPage() {
  const [url, setUrl] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("input") ?? "" : "");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/redirect-checker", { url: normalized.url });
      if (!data.hops || data.hops.length === 0) {
        setError({
          title: "No redirect data returned",
          detail: "The URL may be unreachable or blocking automated requests.",
          suggestion: "Try again in a moment, or test another public URL.",
        });
        return;
      }
      setResult(data);
      saveRequestHistory({ tool: "Redirect Checker", input: normalized.url, summary: `${data.total_hops} hop${data.total_hops === 1 ? "" : "s"} to ${data.final_url}` });
    } catch (e) {
      setError(errorFromUnknown(e, "network_error"));
    } finally {
      setLoading(false);
    }
  };

  const badge = result ? resultBadge(result) : null;
  const redirects = result ? countRedirects(result) : 0;

  return (
    <ToolShell slug="redirect-checker">
      <div className="space-y-5">
        <div>
          <Label>URL</Label>
          <ToolInput
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (!e.target.value.trim()) { setResult(null); setError(null); setFixApplied(null); } }}
            placeholder="https://bit.ly/example"
            onKeyDown={(e) => e.key === "Enter" && run()}
            disabled={loading}
          />
          {fixApplied && <AutoFixBanner fix={fixApplied.fix} original={fixApplied.original} corrected={fixApplied.corrected} />}
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!url || loading}>
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Tracing...</> : "Check redirects"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUrl("");
              setResult(null);
              setError(null);
              setFixApplied(null);
            }}
          >
            Clear
          </Button>
        </div>
        {loading && <LoadingSkeleton />}
        {result && result.total_hops > 10 && (
          <WarningBanner title="Long redirect chain">
            Warning: unusually long redirect chain ({result.total_hops} hops). This may indicate a redirect loop.
          </WarningBanner>
        )}
        {result && badge && (
          <div className="space-y-5">
            <section>
              <h2 className={sectionHeadingClass}>Summary</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <SummaryCard label="Total Hops">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {result.total_hops}
                  </span>
                </SummaryCard>
                <SummaryCard label="Final URL">
                  <div className="flex min-w-0 items-center gap-2">
                    <code className="truncate text-sm text-zinc-900 dark:text-zinc-100">{result.final_url}</code>
                    <CopyButton value={result.final_url} label="Copy" />
                  </div>
                </SummaryCard>
                <SummaryCard label="Result">
                  <span className={badge.className}>{badge.label}</span>
                </SummaryCard>
              </div>
            </section>

            <section>
              <h2 className={sectionHeadingClass}>Redirect Chain</h2>
              <div className="space-y-0">
                {result.hops.map((hop, index) => (
                  <div key={`${hop.step}-${hop.url}`} className="grid grid-cols-[2rem_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {hop.step}
                      </div>
                      {index < result.hops.length - 1 && (
                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
                      )}
                    </div>
                    <Panel noPadding className="mb-3 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={statusBadgeClass(hop.status_code)}>{hop.status_code}</span>
                            <span className={zincBadge}>GET</span>
                          </div>
                          <code className="block break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">
                            {hop.url}
                          </code>
                        </div>
                        <CopyButton value={hop.url} label="Copy URL" />
                      </div>
                      {hop.location && (
                        <div className="mt-3 flex items-start gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          <ArrowDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            redirects to: <code className="break-all font-mono">{hop.location}</code>
                          </span>
                        </div>
                      )}
                    </Panel>
                  </div>
                ))}
              </div>
              <div className="ml-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Final destination
                </div>
                <code className="block break-all font-mono text-sm text-emerald-900 dark:text-emerald-100">
                  {result.final_url}
                </code>
              </div>
            </section>

            <Panel noPadding className="p-4">
              <h2 className={sectionHeadingClass}>Analysis</h2>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <AnalysisRow
                  passed={isHttpToHttps(result)}
                  label="HTTP to HTTPS redirect"
                  detail={isHttpToHttps(result) ? "First hop upgrades to HTTPS." : "No HTTP to HTTPS upgrade detected."}
                />
                <AnalysisRow
                  passed={hasWwwRedirect(result)}
                  label="www to non-www redirect"
                  detail={hasWwwRedirect(result) ? "Canonical hostname redirect detected." : "No www canonical redirect detected."}
                />
                <AnalysisRow
                  passed={finalStatus(result) === 200}
                  label="Ends with 200 OK"
                  detail={`Final status: ${finalStatus(result) || "unknown"}`}
                />
                <AnalysisRow
                  passed={result.total_hops < 5}
                  label="Chain length OK"
                  detail={`${result.total_hops} total ${result.total_hops === 1 ? "hop" : "hops"}`}
                />
                <div className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Number of redirects</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Redirect responses or Location headers found in the chain.
                    </div>
                  </div>
                  <span className={redirects > 0 ? yellowBadge : greenBadge}>{redirects}</span>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function SummaryCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Panel noPadding className="p-4">
      <div className={fieldLabelClass}>{label}</div>
      <div className="mt-2 min-w-0">{children}</div>
    </Panel>
  );
}

function AnalysisRow({ passed, label, detail }: { passed: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-start gap-2">
        {passed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
        )}
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</div>
        </div>
      </div>
      <span className={passed ? greenBadge : redBadge}>{passed ? "Pass" : "Check"}</span>
    </div>
  );
}

