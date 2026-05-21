"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label } from "@/components/ui";
import { apiGet } from "@/lib/api";
import {
  ERROR_MESSAGES,
  InlineError,
  LoadingSkeleton,
  errorFromUnknown,
  isValidUrl,
  normalizeUrl,
  type ToolError,
} from "@/lib/toolErrors";

type Result = {
  url: string;
  status_code: number;
  headers: Record<string, string | null>;
};

const headers = [
  { key: "strict-transport-security", name: "Strict-Transport-Security", description: "Forces browsers to use HTTPS for future visits." },
  { key: "content-security-policy", name: "Content-Security-Policy", description: "Limits where scripts, styles, images, and other resources can load from." },
  { key: "x-frame-options", name: "X-Frame-Options", description: "Helps prevent clickjacking by controlling iframe embedding." },
  { key: "x-content-type-options", name: "X-Content-Type-Options", description: "Prevents MIME type sniffing when set to nosniff." },
  { key: "x-xss-protection", name: "X-XSS-Protection", description: "Legacy browser XSS filter control." },
  { key: "referrer-policy", name: "Referrer-Policy", description: "Controls how much referrer data is sent with requests." },
  { key: "permissions-policy", name: "Permissions-Policy", description: "Restricts browser APIs such as camera, geolocation, and microphone." },
  { key: "cross-origin-embedder-policy", name: "Cross-Origin-Embedder-Policy", description: "Controls loading of cross-origin resources." },
  { key: "cross-origin-opener-policy", name: "Cross-Origin-Opener-Policy", description: "Isolates browsing contexts for better cross-origin safety." },
  { key: "cross-origin-resource-policy", name: "Cross-Origin-Resource-Policy", description: "Controls which origins may load this resource." },
];

const goodValues: Record<string, (value: string) => boolean> = {
  "strict-transport-security": (value) => /max-age=\d+/i.test(value),
  "content-security-policy": (value) => value.trim().length > 10,
  "x-frame-options": (value) => /^(deny|sameorigin)$/i.test(value.trim()),
  "x-content-type-options": (value) => /^nosniff$/i.test(value.trim()),
  "referrer-policy": (value) => value.trim().length > 0,
  "permissions-policy": (value) => value.trim().length > 0,
};

function rating(key: string, value: string | null) {
  if (!value) return { label: "Missing", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
  const isGood = goodValues[key] ? goodValues[key](value) : true;
  return isGood
    ? { label: "Good", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" }
    : { label: "Warning", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" };
}

export default function SecurityHeadersPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => {
    if (!result) return 0;
    return headers.filter((item) => result.headers[item.key]).length;
  }, [result]);

  const run = async () => {
    const normalized = normalizeUrl(url);
    setUrl(normalized.url);
    if (!isValidUrl(normalized.url)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_url);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiGet<Result>("/tools/security-headers", { url: normalized.url }));
    } catch (err) {
      setError(errorFromUnknown(err, "network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="security-headers">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Label>URL</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="https://example.com" />
            <Button variant="primary" onClick={run} disabled={loading || !url.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check headers"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </section>

        {loading && <LoadingSkeleton />}

        {result && (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overall score</p>
                  <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{score}/10</p>
                  <p className="text-sm text-zinc-500">HTTP {result.status_code} from {result.url}</p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 sm:w-64">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${score * 10}%` }} />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Header name</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Present</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Value</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Rating</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">What it does</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {headers.map((item) => {
                      const value = result.headers[item.key] ?? null;
                      const info = rating(item.key, value);
                      return (
                        <tr key={item.key}>
                          <td className="px-4 py-3 font-mono text-xs text-emerald-700 dark:text-emerald-400">{item.name}</td>
                          <td className="px-4 py-3">{value ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</td>
                          <td className="max-w-sm break-all px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{value || "-"}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.className}`}>{info.label}</span></td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                <CopyButton value={headers.map((item) => `${item.name}: ${result.headers[item.key] || ""}`).join("\n")} label="Copy results" />
              </div>
            </section>
          </>
        )}
      </div>
    </ToolShell>
  );
}
