"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label } from "@/components/ui";
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
            {loading ? "Tracing…" : "Check redirects"}
          </Button>
          <Button variant="ghost" onClick={() => { setUrl(""); setResult(null); setError(""); }}>
            Clear
          </Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && (
          <div className="space-y-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {result.total_hops} {result.total_hops === 1 ? "hop" : "hops"}, final destination:
            </div>
            <div className="break-all rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-mono text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
              <Check className="mr-1 inline h-3.5 w-3.5" />
              {result.final_url}
            </div>
            <ol className="space-y-2">
              {result.hops.map((hop, i) => {
                const isFinal = i === result.hops.length - 1;
                return (
                  <li
                    key={hop.step}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {hop.step}
                      </span>
                      <code className="break-all font-mono text-xs">{hop.url}</code>
                    </div>
                    <div className="mt-2 flex items-center gap-2 pl-9 text-xs">
                      <span
                        className={
                          "rounded-md px-1.5 py-0.5 font-mono " +
                          (hop.status_code >= 300 && hop.status_code < 400
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                            : isFinal
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
                        }
                      >
                        {hop.status_code}
                      </span>
                      {hop.location && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <ArrowRight className="h-3 w-3" />
                          <code className="break-all font-mono">{hop.location}</code>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
