"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Select } from "@/components/ui";

type SlaReport = {
  monitor_id: number;
  monitor_name: string;
  period_start: string | null;
  period_end: string | null;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  avg_response_time_ms: number | null;
  p50_response_time_ms: number | null;
  p95_response_time_ms: number | null;
  p99_response_time_ms: number | null;
  longest_outage_minutes: number;
  outage_count: number;
  slo_target: number;
  slo_met: boolean;
};

const periods = ["7d", "30d", "90d", "365d"];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function uptimeClass(value: number) {
  if (value >= 99.9) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 99) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function ms(value: number | null) {
  return value == null ? "-" : `${value}ms`;
}

export function SlaReportPage({ publicView = false }: { publicView?: boolean }) {
  const [period, setPeriod] = useState("30d");
  const [reports, setReports] = useState<SlaReport[]>([]);
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      const res = await fetch(`${API_BASE}/sla/report/all?period=${encodeURIComponent(period)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `SLA request failed with ${res.status}`));
      setReports(data as SlaReport[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load SLA reports.");
    }
  }

  useEffect(() => {
    loadReports();
  }, [period]);

  const csv = useMemo(() => {
    const headers = [
      "monitor_id",
      "monitor_name",
      "uptime_percentage",
      "total_checks",
      "successful_checks",
      "failed_checks",
      "avg_response_time_ms",
      "p50_response_time_ms",
      "p95_response_time_ms",
      "p99_response_time_ms",
      "outage_count",
      "longest_outage_minutes",
      "slo_target",
      "slo_met",
    ];
    const rows = reports.map((report) => headers.map((key) => JSON.stringify(String(report[key as keyof SlaReport] ?? ""))).join(","));
    return [headers.join(","), ...rows].join("\n");
  }, [reports]);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sla-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={publicView ? "mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12" : "space-y-6"}>
      <header className={publicView ? "mb-8" : ""}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{publicView ? "Status" : "Dashboard"}</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">SLO/SLA Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Uptime, response time percentiles, outage counts, and SLO status for monitored services.
        </p>
      </header>

      {error && <ErrorCard>{error}</ErrorCard>}

      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <Select value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full sm:w-40">
          {periods.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </section>

      <section className="grid gap-4">
        {reports.map((report) => (
          <article key={report.monitor_id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{report.monitor_name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{report.total_checks} checks - {report.outage_count} outages</p>
              </div>
              <div className="text-left sm:text-right">
                <div className={`text-2xl font-semibold ${uptimeClass(report.uptime_percentage)}`}>{report.uptime_percentage.toFixed(3)}%</div>
                <span className={`rounded-xl px-2 py-1 text-xs font-medium ${report.slo_met ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"}`}>
                  {report.slo_met ? "SLO met" : "SLO missed"}
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Average" value={ms(report.avg_response_time_ms)} />
              <Metric label="P50" value={ms(report.p50_response_time_ms)} />
              <Metric label="P95" value={ms(report.p95_response_time_ms)} />
              <Metric label="P99" value={ms(report.p99_response_time_ms)} />
              <Metric label="Successful" value={String(report.successful_checks)} />
              <Metric label="Failed" value={String(report.failed_checks)} />
              <Metric label="Outages" value={String(report.outage_count)} />
              <Metric label="Longest outage" value={`${report.longest_outage_minutes}m`} />
            </div>
          </article>
        ))}
        {reports.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No SLA data yet.</div>}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
