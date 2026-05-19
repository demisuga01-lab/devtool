"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, Label } from "@/components/ui";
import { apiGet } from "@/lib/api";

type Result = {
  domain: string;
  valid: boolean;
  issued_to: string;
  issued_by: string;
  valid_from: string;
  valid_until: string;
  days_remaining: number;
  expired: boolean;
  san: string[];
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SslCheckerPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<Result>("/tools/ssl-checker", { domain });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="ssl-checker">
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
            {loading ? "Checking…" : "Check SSL"}
          </Button>
          <Button variant="ghost" onClick={() => { setDomain(""); setResult(null); setError(""); }}>
            Clear
          </Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && (
          <>
            <div
              className={
                "rounded-2xl border px-4 py-4 " +
                (result.valid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100")
              }
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {result.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {result.expired
                  ? "Certificate is expired."
                  : `Valid for ${result.days_remaining} more day${result.days_remaining === 1 ? "" : "s"}.`}
              </div>
              {!result.expired && result.days_remaining < 30 && (
                <div className="mt-1 text-xs">Renewal recommended — fewer than 30 days remaining.</div>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <Row label="Issued to" value={result.issued_to} />
                  <Row label="Issued by" value={result.issued_by} />
                  <Row label="Valid from" value={formatDate(result.valid_from)} />
                  <Row label="Valid until" value={formatDate(result.valid_until)} />
                  <Row label="Days remaining" value={String(result.days_remaining)} />
                </tbody>
              </table>
            </div>
            {result.san.length > 0 && (
              <div>
                <Label>Subject alternative names</Label>
                <div className="flex flex-wrap gap-1.5">
                  {result.san.map((n) => (
                    <span
                      key={n}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-44 bg-zinc-50 px-4 py-2.5 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/50">
        {label}
      </td>
      <td className="break-all px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100">{value || "—"}</td>
    </tr>
  );
}
