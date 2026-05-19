"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label, Select } from "@/components/ui";
import { apiGet } from "@/lib/api";

type Result = {
  domain: string;
  type: string;
  records: string[];
  query_time_ms: number;
};

const TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"];

export default function DnsLookupPage() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState("A");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/dns-lookup", { domain, type });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="dns-lookup">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => e.key === "Enter" && domain && run()}
            />
          </div>
          <div>
            <Label>Record type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-full">
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
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
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {result.records.length} {result.records.length === 1 ? "record" : "records"}
              </span>
              <span>Query time: {result.query_time_ms} ms</span>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {result.records.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  No {result.type} records found.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {result.records.map((r, i) => (
                    <li
                      key={i}
                      className="break-all px-4 py-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
