"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

type MonitorStatus = "operational" | "degraded" | "outage" | "unknown";

type PublicMonitor = {
  id: number;
  name: string;
  status: MonitorStatus;
  uptime_30d: number;
  last_checked_at: string | null;
  last_response_ms?: number | null;
};

type StatusGroup = {
  name: string;
  status: MonitorStatus | "operational" | "degraded" | "outage";
  monitors: PublicMonitor[];
};

type IncidentUpdate = {
  id: number;
  status: string;
  message: string;
  created_at: string;
};

type Incident = {
  id: number;
  title: string;
  status: string;
  severity: "minor" | "major" | "critical";
  message: string | null;
  started_at: string;
  updates: IncidentUpdate[];
};

type MaintenanceWindow = {
  id: number;
  title: string;
  message: string | null;
  starts_at: string;
  ends_at: string;
};

type PublicStatusResponse = {
  overall_status: "operational" | "degraded" | "outage";
  last_updated: string;
  groups: StatusGroup[];
  active_incidents: Incident[];
  maintenance_windows: MaintenanceWindow[];
};

type MonitorCheck = {
  checked_at: string;
  status: MonitorStatus;
  response_ms: number | null;
  status_code: number | null;
};

const statusContent = {
  operational: {
    icon: CheckCircle2,
    title: "All Systems Operational",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  degraded: {
    icon: AlertTriangle,
    title: "Degraded Performance",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-600 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400",
  },
  outage: {
    icon: XCircle,
    title: "Service Disruption",
    className:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
  },
};

const dotClass: Record<MonitorStatus | "maintenance", string> = {
  operational: "bg-emerald-500",
  degraded: "bg-yellow-500",
  outage: "bg-red-500",
  unknown: "bg-zinc-400",
  maintenance: "bg-blue-500",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatUntil(value: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(value).getTime() - now) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function severityClass(severity: Incident["severity"]) {
  if (severity === "critical") return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
  if (severity === "major") return "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400";
  return "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400";
}

function historyColor(status: MonitorStatus) {
  if (status === "operational") return "bg-emerald-500";
  if (status === "degraded") return "bg-yellow-500";
  if (status === "outage") return "bg-red-500";
  return "bg-zinc-400";
}

function uptimePillClass(value: number) {
  if (value > 99) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (value > 95) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
}

function statusSubtext(status: PublicStatusResponse["overall_status"], total: number, issues: number) {
  if (status === "operational") return `All ${total} services operational`;
  return `${issues} services experiencing issues`;
}

function MonitorTimeline({ checks }: { checks: MonitorCheck[] }) {
  const bars = useMemo(() => {
    const padded = [...checks];
    while (padded.length < 90) {
      padded.unshift({
        checked_at: "",
        status: "unknown",
        response_ms: null,
        status_code: null,
      });
    }
    return padded.slice(-90);
  }, [checks]);

  return (
    <div>
      <div className="flex items-center gap-0.5 overflow-hidden">
        {bars.map((check, index) => (
          <span
            key={`${check.checked_at || "empty"}-${index}`}
            title={check.checked_at ? `${check.status} at ${formatDateTime(check.checked_at)}` : "No data"}
            className={`h-8 w-1.5 flex-shrink-0 rounded-sm ${historyColor(check.status)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-400 dark:text-zinc-600">
        <span>90 days</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<PublicStatusResponse | null>(null);
  const [histories, setHistories] = useState<Record<number, MonitorCheck[]>>({});
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status/public`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Status request failed with ${res.status}`);
      const nextData = (await res.json()) as PublicStatusResponse;
      setData(nextData);
      setError("");

      const monitors = nextData.groups.flatMap((group) => group.monitors);
      const historyEntries = await Promise.all(
        monitors.map(async (monitor) => {
          const historyRes = await fetch(`${API_BASE}/status/public/monitor/${monitor.id}/history`, {
            headers: { Accept: "application/json" },
          });
          if (!historyRes.ok) return [monitor.id, []] as const;
          return [monitor.id, (await historyRes.json()) as MonitorCheck[]] as const;
        }),
      );
      setHistories(Object.fromEntries(historyEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load status.");
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const refresh = window.setInterval(loadStatus, 60000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [loadStatus]);

  const monitors = data?.groups.flatMap((group) => group.monitors) ?? [];
  const issueCount = monitors.filter((monitor) => monitor.status !== "operational").length;
  const banner = statusContent[data?.overall_status ?? "operational"];
  const BannerIcon = banner.icon;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className={`rounded-2xl border px-6 py-10 shadow-sm ${banner.className}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <BannerIcon className="h-12 w-12 flex-shrink-0" />
              <div>
                <h1 className="text-3xl font-bold">{banner.title}</h1>
                <p className="mt-2 text-base opacity-85">
                  {statusSubtext(data?.overall_status ?? "operational", monitors.length, issueCount)}
                </p>
                <p className="mt-3 text-sm opacity-75">
                  Last updated {data?.last_updated ? formatDateTime(data.last_updated) : "not yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {data && data.active_incidents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Active Incidents
            </h2>
            {data.active_incidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-xl px-2 py-1 text-xs font-medium capitalize ${severityClass(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className="rounded-xl bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {incident.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{incident.title}</h3>
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">
                    Started {formatDateTime(incident.started_at)}
                  </span>
                </div>
                {incident.message && (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{incident.message}</p>
                )}
                {incident.updates.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    {incident.updates.map((update) => (
                      <div key={update.id} className="flex gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                            {update.status} - {formatDateTime(update.created_at)}
                          </div>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{update.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {data && data.maintenance_windows.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Maintenance
            </h2>
            {data.maintenance_windows.map((windowItem) => {
              const starts = new Date(windowItem.starts_at).getTime();
              const active = starts <= now;
              return (
                <article
                  key={windowItem.id}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {active ? "In progress" : `Starts in ${formatUntil(windowItem.starts_at, now)}`}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {windowItem.title}
                      </h3>
                      {windowItem.message && (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{windowItem.message}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-600">
                      {formatDateTime(windowItem.starts_at)} - {formatDateTime(windowItem.ends_at)}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Services
          </h2>
          <div className="space-y-5">
            {data?.groups.map((group) => (
              <div
                key={group.name}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    {group.name}
                  </h3>
                  <span className="text-xs capitalize text-zinc-500 dark:text-zinc-600">{group.status}</span>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {group.monitors.map((monitor) => (
                    <div key={monitor.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass[monitor.status]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{monitor.name}</h4>
                            <span className={`rounded-xl px-2 py-1 text-xs font-medium ${uptimePillClass(monitor.uptime_30d)}`}>
                              {monitor.uptime_30d.toFixed(2)}% uptime
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
                            <span>Last response {monitor.last_response_ms == null ? "-" : `${monitor.last_response_ms}ms`}</span>
                            <span>Last check {monitor.last_checked_at ? formatDateTime(monitor.last_checked_at) : "not yet"}</span>
                          </div>
                        </div>
                      </div>
                      <MonitorTimeline checks={histories[monitor.id] ?? []} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-zinc-200 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Powered by WellFriend DevTools</span>
          <Link href="https://devtools.wellfriend.online" className="text-emerald-600 dark:text-emerald-400">
            devtools.wellfriend.online
          </Link>
        </footer>
      </div>
    </div>
  );
}
