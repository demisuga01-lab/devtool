"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, CheckCircle2, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label, CopyButton } from "@/components/ui";
import { apiGet } from "@/lib/api";

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

const cardClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
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
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/redirect-checker", { url });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
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
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://bit.ly/example"
            onKeyDown={(e) => e.key === "Enter" && url && run()}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!url || loading}>
            {loading ? "Tracing..." : "Check redirects"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUrl("");
              setResult(null);
              setError("");
            }}
          >
            Clear
          </Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && badge && (
          <div className="space-y-5">
            <section>
              <h2 className={sectionHeadingClass}>Summary</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <SummaryCard label="Total Hops">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
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
                    <div className={`${cardClass} mb-3 p-4`}>
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
                    </div>
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

            <section className={`${cardClass} p-4`}>
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
      <div className="mt-2 min-w-0">{children}</div>
    </div>
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
