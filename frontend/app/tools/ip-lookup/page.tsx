"use client";

import { useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Button, CopyButton, ToolInput, Label } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { saveRequestHistory } from "@/lib/request-history";
import { InlineError, LoadingSkeleton, errorFromUnknown, type ToolError } from "@/lib/toolErrors";

type Result = {
  ip?: string;
  country_name?: string;
  country_code?: string;
  region?: string;
  city?: string;
  postal?: string;
  timezone?: string;
  org?: string;
  asn?: string;
  latitude?: number;
  longitude?: number;
};

function flag(code?: string) {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{value || "-"}</p>
    </div>
  );
}

export default function IpLookupPage() {
  const [ip, setIp] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("input") ?? "" : "");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (value = ip) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiGet<Result>("/tools/ip-lookup", { ip: value.trim() });
      setResult(data);
      saveRequestHistory({ tool: "IP Lookup", input: value.trim(), summary: `${data.city || "-"}, ${data.country_name || "-"} ${data.asn || ""}`.trim() });
    } catch (err) {
      setError(errorFromUnknown(err, "network_error"));
    } finally {
      setLoading(false);
    }
  };

  const useMyIp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = (await res.json()) as { ip: string };
      setIp(data.ip);
      await run(data.ip);
    } catch (err) {
      setError(errorFromUnknown(err, "network_error"));
      setLoading(false);
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Web & Network" }, { label: "IP Lookup" }]} title="IP Lookup" description="Look up geolocation and ASN info for any IP address." />
      <div className="space-y-5">
        <Panel noPadding className="p-5">
          <Label>IP address</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ToolInput value={ip} onChange={(event) => setIp(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="8.8.8.8" />
            <Button variant="primary" onClick={() => run()} disabled={loading || !ip.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Looking...</> : "Lookup"}
            </Button>
            <Button onClick={useMyIp} disabled={loading}>Use my IP</Button>
          </div>
          {error && <InlineError error={error} />}
        </Panel>

        {loading && <LoadingSkeleton />}

        {result && (
          <Panel noPadding className="p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Lookup result</p>
                <h2 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{result.ip}</h2>
              </div>
              <CopyButton value={result.ip || ""} label="Copy IP" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Country" value={`${flag(result.country_code)} ${result.country_name || ""}`.trim()} />
              <Field label="Region" value={result.region} />
              <Field label="City" value={result.city} />
              <Field label="Postal" value={result.postal} />
              <Field label="Timezone" value={result.timezone} />
              <Field label="ISP / Org" value={result.org} />
              <Field label="ASN" value={result.asn} />
              <Field label="Coordinates" value={result.latitude && result.longitude ? `${result.latitude}, ${result.longitude}` : undefined} />
            </div>
            <Panel noPadding className="mt-5 bg-zinc-50 p-4 dark:bg-zinc-950">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Map coordinates
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {result.latitude && result.longitude ? `${result.latitude}, ${result.longitude}` : "Coordinates unavailable"}
              </p>
            </Panel>
          </Panel>
        )}
      </div>
    </ToolShell>
  );
}
