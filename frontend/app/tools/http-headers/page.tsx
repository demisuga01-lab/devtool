"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label, CopyButton } from "@/components/ui";
import { apiGet } from "@/lib/api";

type Result = {
  url: string;
  status_code: number;
  elapsed_ms: number;
  headers: Record<string, string>;
};

export default function HttpHeadersPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/http-headers", { url });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="http-headers">
      <div className="space-y-5">
        <div>
          <Label>URL</Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && url && run()}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!url || loading}>
            {loading ? "Checking…" : "Check headers"}
          </Button>
          <Button variant="ghost" onClick={() => { setUrl(""); setResult(null); setError(""); }}>
            Clear
          </Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Status" value={String(result.status_code)} />
              <Stat label="Response time" value={`${result.elapsed_ms} ms`} />
              <Stat label="Headers" value={String(Object.keys(result.headers).length)} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Response headers</Label>
                <CopyButton
                  value={Object.entries(result.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}
                  label="Copy all"
                />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {Object.entries(result.headers).map(([k, v]) => (
                      <tr key={k}>
                        <td className="w-1/3 break-all bg-zinc-50 px-4 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
                          {k}
                        </td>
                        <td className="break-all px-4 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                          {v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-lg">{value}</div>
    </div>
  );
}
