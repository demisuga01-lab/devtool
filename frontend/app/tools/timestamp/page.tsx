"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { ERROR_MESSAGES, InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { Button, ToolInput, CopyButton, Label, ToolSelect } from "@/components/tool-ui";

function relativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const seconds = Math.round(abs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const past = diffMs < 0;
  if (seconds < 60) return past ? `${seconds}s ago` : `in ${seconds}s`;
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;
  return past ? `${days}d ago` : `in ${days}d`;
}

function getTimezones(): string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      const v = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
      if (v && v.length) return v;
    }
  } catch {
    // ignore
  }
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo"];
}

export default function TimestampPage() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<Date | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [scaleWarning, setScaleWarning] = useState<{ seconds: string; milliseconds: string } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [tz, setTz] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const tzList = useMemo(() => getTimezones(), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const convert = () => {
    setError(null);
    setScaleWarning(null);
    setParsed(null);
    const trimmed = input.trim();
    if (!trimmed) return;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isNaN(n)) {
        setError(ERROR_MESSAGES.invalid_date);
        return;
      }
      const asSeconds = new Date(n * 1000);
      const asMilliseconds = new Date(n);
      const d = trimmed.length <= 10 ? asSeconds : asMilliseconds;
      if (Number.isNaN(d.getTime())) {
        setError(ERROR_MESSAGES.invalid_date);
        return;
      }
      if (trimmed.length > 10) {
        setScaleWarning({ seconds: Number.isNaN(asSeconds.getTime()) ? "Invalid" : asSeconds.toISOString(), milliseconds: asMilliseconds.toISOString() });
      }
      setParsed(d);
      return;
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      setError(ERROR_MESSAGES.invalid_date);
      return;
    }
    setParsed(d);
  };

  const useNow = () => {
    setParsed(new Date());
    setInput(String(Math.floor(Date.now() / 1000)));
    setError(null);
    setScaleWarning(null);
  };

  const fmtTz = (d: Date) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      }).format(d);
    } catch {
      return d.toString();
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Date & Time" }, { label: "Timestamp Converter" }]} title="Timestamp Converter" description="Convert between Unix timestamps and date strings." />
      <div className="space-y-5">
        <Panel noPadding className="px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Now</span>
          <div className="mt-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-zinc-500">Unix (s)</div>
              <div className="font-mono">{Math.floor(now.getTime() / 1000)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Unix (ms)</div>
              <div className="font-mono">{now.getTime()}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">ISO</div>
              <div className="font-mono text-xs">{now.toISOString()}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Local</div>
              <div className="font-mono text-xs">{now.toLocaleTimeString()}</div>
            </div>
          </div>
        </Panel>

        <div>
          <Label>Timestamp or date string</Label>
          <ToolInput
            value={input}
            onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setParsed(null); setError(null); setScaleWarning(null); } }}
            placeholder="1700000000 or 2023-11-14T22:13:20Z"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button onClick={useNow}>Use now</Button>
          <Label>Timezone</Label>
          <ToolSelect value={tz} onChange={(e) => setTz(e.target.value)}>
            {tzList.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </ToolSelect>
        </div>
        {error && <InlineError error={error} />}
        {scaleWarning && (
          <WarningBanner title="Millisecond timestamp detected">
            <div className="space-y-1">
              <p>This looks like a millisecond timestamp. Showing both interpretations:</p>
              <p>As seconds: {scaleWarning.seconds}</p>
              <p>As milliseconds: {scaleWarning.milliseconds}</p>
            </div>
          </WarningBanner>
        )}
        {parsed && (
          <Panel noPadding>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <Row label="Unix (seconds)" value={String(Math.floor(parsed.getTime() / 1000))} />
                <Row label="Unix (ms)" value={String(parsed.getTime())} />
                <Row label="ISO 8601" value={parsed.toISOString()} />
                <Row label="UTC" value={parsed.toUTCString()} />
                <Row label="Local" value={parsed.toString()} />
                <Row label={`In ${tz}`} value={fmtTz(parsed)} />
                <Row label="Relative" value={relativeTime(parsed)} />
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </ToolShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-44 bg-zinc-50 px-4 py-2.5 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/50">
        {label}
      </td>
      <td className="break-all px-4 py-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100">
        {value}
      </td>
      <td className="w-24 px-4 py-2.5">
        <CopyButton value={value} />
      </td>
    </tr>
  );
}

