"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-4 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Tools
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>Web & Network</span>
      </nav>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          WHOIS Lookup
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Look up WHOIS records for a domain.
        </p>
      </header>
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
      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-500">
        WHOIS lookup is performed server-side. Your query is not logged or stored.
      </p>
    </div>
  );
}
