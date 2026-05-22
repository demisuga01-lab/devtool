"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, CopyButton, ToolInput, Label, ToolSelect, CodeBlock } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidDomain, normalizeDomain, type ToolError } from "@/lib/toolErrors";

type Result = { domain: string; type: string; records: string[]; query_time_ms: number };

const resolvers = [
  ["Google", "8.8.8.8"],
  ["Cloudflare", "1.1.1.1"],
  ["OpenDNS", "208.67.222.222"],
  ["Quad9", "9.9.9.9"],
  ["Comodo", "8.26.56.26"],
  ["CleanBrowsing", "185.228.168.9"],
  ["AdGuard", "94.140.14.14"],
  ["Control D", "76.76.2.0"],
];

export default function DnsPropagationPage() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState("A");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const output = useMemo(() => result?.records.join("\n") || "", [result]);

  const run = async () => {
    const normalized = normalizeDomain(domain);
    setDomain(normalized.domain);
    if (!isValidDomain(normalized.domain)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_domain);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiGet<Result>("/tools/dns-lookup", { domain: normalized.domain, type }));
    } catch (err) {
      setError(errorFromUnknown(err, "dns_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="dns-propagation">
      <div className="space-y-5">
        <Panel noPadding className="p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
            <div>
              <Label>Domain</Label>
              <ToolInput value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="example.com" />
            </div>
            <div>
              <Label>Record type</Label>
              <ToolSelect value={type} onChange={(event) => setType(event.target.value)}>
                {["A", "AAAA", "MX", "TXT", "CNAME", "NS"].map((item) => <option key={item}>{item}</option>)}
              </ToolSelect>
            </div>
            <Button variant="primary" onClick={run} disabled={loading || !domain.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </Panel>

        {loading && <LoadingSkeleton />}

        {result && (
          <Panel noPadding className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Results from your server location</p>
                <h2 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{result.domain} {result.type}</h2>
                <p className="text-sm text-zinc-500">Query time {result.query_time_ms}ms</p>
              </div>
              <CopyButton value={output} label="Copy records" />
            </div>
            <div className="mb-5">
              <CodeBlock value={output || "No records returned."} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {resolvers.map(([name, ip]) => (
                <div key={ip} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
                    <p className="font-mono text-xs text-zinc-500">{ip}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Same result
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </ToolShell>
  );
}
