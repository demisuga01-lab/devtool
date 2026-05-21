"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidDomain, normalizeDomain, type ToolError } from "@/lib/toolErrors";

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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString();
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(":").toUpperCase();
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{value || "-"}</p>
    </div>
  );
}

export default function SslChainPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const status = result?.expired ? "Expired" : result && result.days_remaining <= 30 ? "Expiring soon" : result?.valid ? "Valid" : "Invalid";
  const statusClass = result?.expired || !result?.valid
    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
    : result.days_remaining <= 30
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  const Icon = result?.expired || !result?.valid ? XCircle : result.days_remaining <= 30 ? AlertTriangle : CheckCircle2;

  const validityPercent = useMemo(() => {
    if (!result) return 0;
    const from = new Date(result.valid_from).getTime();
    const until = new Date(result.valid_until).getTime();
    const now = Date.now();
    if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) return Math.min(100, Math.max(0, result.days_remaining));
    return Math.max(0, Math.min(100, ((until - now) / (until - from)) * 100));
  }, [result]);

  useEffect(() => {
    if (!result) {
      setFingerprint("");
      return;
    }
    void digest(JSON.stringify(result)).then(setFingerprint);
  }, [result]);

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
      setResult(await apiGet<Result>("/tools/ssl-checker", { domain: normalized.domain }));
    } catch (err) {
      setError(errorFromUnknown(err, "ssl_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="ssl-chain">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Label>Domain</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="example.com" />
            <Button variant="primary" onClick={run} disabled={loading || !domain.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "View chain"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </section>

        {loading && <LoadingSkeleton />}

        {result && (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={status === "Valid" ? "h-8 w-8 text-emerald-500" : status === "Expiring soon" ? "h-8 w-8 text-yellow-500" : "h-8 w-8 text-red-500"} />
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{result.domain}</h2>
                    <p className="text-sm text-zinc-500">{Math.max(0, result.days_remaining)} days remaining</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}>{status}</span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${validityPercent}%` }} />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Certificate details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Issued to" value={result.issued_to} />
                <Field label="Issued by" value={result.issued_by} />
                <Field label="Valid from" value={formatDate(result.valid_from)} />
                <Field label="Valid until" value={formatDate(result.valid_until)} />
                <Field label="Days remaining" value={result.days_remaining} />
                <Field label="Fingerprint display" value={fingerprint} />
              </div>
              <p className="mt-3 text-xs text-zinc-500">Fingerprint is derived from the current endpoint payload because the existing SSL endpoint does not expose the raw certificate fingerprint.</p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject alternative names</h2>
                <CopyButton value={result.san.join("\n")} label="Copy SANs" />
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
                {result.san.map((name) => (
                  <div key={name} className="border-b border-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 last:border-b-0 dark:border-zinc-800 dark:text-zinc-300">{name}</div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </ToolShell>
  );
}
