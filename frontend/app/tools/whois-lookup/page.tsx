"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label, CopyButton } from "@/components/ui";
import { apiGet } from "@/lib/api";

type Result = {
  domain: string;
  raw: string;
  truncated: boolean;
};

export default function WhoisLookupPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/whois-lookup", { domain });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="whois-lookup">
      <div className="space-y-5">
        <div>
          <Label>Domain</Label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            onKeyDown={(e) => e.key === "Enter" && domain && run()}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!domain || loading}>
            {loading ? "Looking up…" : "Lookup"}
          </Button>
          <Button variant="ghost" onClick={() => { setDomain(""); setResult(null); setError(""); }}>
            Clear
          </Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>WHOIS record</Label>
              <CopyButton value={result.raw} />
            </div>
            <pre className="max-h-[400px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
              {result.raw}
            </pre>
            {result.truncated && (
              <p className="mt-2 text-xs text-zinc-500">
                Output truncated to 5000 characters.
              </p>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
