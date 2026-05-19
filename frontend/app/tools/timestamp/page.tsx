"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, ErrorCard, CopyButton, Label, Select } from "@/components/ui";

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
  const [error, setError] = useState("");
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
    setError("");
    setParsed(null);
    const trimmed = input.trim();
    if (!trimmed) return;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      const ms = trimmed.length <= 10 ? n * 1000 : n;
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) {
        setError("Invalid timestamp.");
        return;
      }
      setParsed(d);
      return;
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      setError("Could not parse date string.");
      return;
    }
    setParsed(d);
  };

  const useNow = () => {
    setParsed(new Date());
    setInput(String(Math.floor(Date.now() / 1000)));
    setError("");
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
    <ToolShell slug="timestamp">
      <div className="space-y-5">
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
        </div>

        <div>
          <Label>Timestamp or date string</Label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1700000000 or 2023-11-14T22:13:20Z"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button onClick={useNow}>Use now</Button>
          <Label>Timezone</Label>
          <Select value={tz} onChange={(e) => setTz(e.target.value)}>
            {tzList.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </Select>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {parsed && (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
          </div>
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
      <td className="break-all px-4 py-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100">
        {value}
      </td>
      <td className="w-24 px-4 py-2.5">
        <CopyButton value={value} />
      </td>
    </tr>
  );
}
