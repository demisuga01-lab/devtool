"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Home,
  LogOut,
  Monitor as MonitorIcon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { authHeaders, clearAuth, getToken, getUser, StatusUser } from "@/lib/auth";

type StatusValue = "operational" | "degraded" | "outage" | "unknown";

type AlertConfig = {
  id: number;
  monitor_id: number;
  type: "email" | "webhook";
  target: string;
  on_down: boolean;
  on_recovery: boolean;
  is_active: boolean;
};

type StatusMonitor = {
  id: number;
  name: string;
  url: string;
  method: "GET" | "HEAD" | "POST";
  interval: number;
  timeout: number;
  expected_status: number;
  keyword: string | null;
  is_active: boolean;
  is_public: boolean;
  group_name: string;
  last_status: StatusValue;
  status: StatusValue;
  last_checked_at: string | null;
  last_response_ms: number | null;
  uptime_30d: number;
  alerts?: AlertConfig[];
};

type MonitorCheck = {
  id: number;
  monitor_id: number;
  monitor_name?: string;
  checked_at: string;
  status: StatusValue;
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
};

type DashboardData = {
  total_monitors: number;
  monitors_up: number;
  monitors_down: number;
  monitors_degraded: number;
  active_incidents: number;
  checks_today: number;
  avg_response_ms: number;
  recent_checks: MonitorCheck[];
  monitors: StatusMonitor[];
};

type IncidentUpdate = {
  id: number;
  incident_id: number;
  status: string;
  message: string;
  created_at: string;
};

type Incident = {
  id: number;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  message: string | null;
  affected_monitors: number[];
  started_at: string;
  resolved_at: string | null;
  is_public: boolean;
  updates: IncidentUpdate[];
};

type MaintenanceWindow = {
  id: number;
  title: string;
  message: string | null;
  starts_at: string;
  ends_at: string;
  affected_monitors: number[];
  is_active: boolean;
};

type Paged<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
};

type ViewKey = "dashboard" | "monitors" | "incidents" | "maintenance" | "alerts" | "settings";

const cardClass = "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const selectClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500";
const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
const dangerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700";

const defaultMonitorForm = {
  name: "",
  url: "https://",
  method: "GET" as StatusMonitor["method"],
  interval: 60,
  timeout: 10,
  expected_status: 200,
  keyword: "",
  is_active: true,
  is_public: true,
  group_name: "General",
};

const defaultIncidentForm = {
  title: "",
  status: "investigating" as Incident["status"],
  severity: "minor" as Incident["severity"],
  message: "",
  affected_monitors: [] as number[],
  is_public: true,
};

const defaultMaintenanceForm = {
  title: "",
  message: "",
  starts_at: "",
  ends_at: "",
  affected_monitors: [] as number[],
  is_active: true,
};

const defaultAlertForm = {
  type: "email" as AlertConfig["type"],
  target: "",
  on_down: true,
  on_recovery: true,
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAffected(ids: number[], monitors: StatusMonitor[]) {
  if (ids.length === 0) return "All monitors";
  const names = ids
    .map((id) => monitors.find((monitor) => monitor.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : `${ids.length} monitor${ids.length === 1 ? "" : "s"}`;
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function StatusBadge({ status }: { status: StatusValue | Incident["status"] }) {
  const classes =
    status === "operational" || status === "resolved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      : status === "degraded" || status === "monitoring" || status === "identified"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300"
        : status === "outage"
          ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return <span className={`rounded-xl px-2 py-1 text-xs font-medium capitalize ${classes}`}>{status}</span>;
}

function StatusDot({ status }: { status: StatusValue }) {
  const color =
    status === "operational"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-yellow-500"
        : status === "outage"
          ? "bg-red-500"
          : "bg-zinc-400";
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

function SeverityBadge({ severity }: { severity: Incident["severity"] }) {
  const classes =
    severity === "critical"
      ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
      : severity === "major"
        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300";
  return <span className={`rounded-xl px-2 py-1 text-xs font-medium capitalize ${classes}`}>{severity}</span>;
}

function MultiMonitorSelect({
  value,
  monitors,
  onChange,
}: {
  value: number[];
  monitors: StatusMonitor[];
  onChange: (value: number[]) => void;
}) {
  return (
    <select
      multiple
      value={value.map(String)}
      onChange={(event) =>
        onChange(Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value)))
      }
      className={`${selectClass} min-h-28`}
    >
      {monitors.map((monitor) => (
        <option key={monitor.id} value={monitor.id}>
          {monitor.name}
        </option>
      ))}
    </select>
  );
}

export default function StatusAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [user, setUser] = useState<StatusUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [monitors, setMonitors] = useState<StatusMonitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showMonitorForm, setShowMonitorForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<StatusMonitor | null>(null);
  const [monitorForm, setMonitorForm] = useState(defaultMonitorForm);

  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState(defaultIncidentForm);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<number | null>(null);
  const [incidentUpdateForm, setIncidentUpdateForm] = useState({ status: "monitoring", message: "" });

  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenanceForm);

  const [alertMonitorId, setAlertMonitorId] = useState<number | null>(null);
  const [alertForm, setAlertForm] = useState(defaultAlertForm);

  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/status/login");
      return;
    }
    setUser(getUser());
    setReady(true);
  }, [router]);

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers = {
        Accept: "application/json",
        ...authHeaders(),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      };
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const data: unknown = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearAuth();
        router.replace("/status/login");
        throw new Error("Session expired.");
      }
      if (!res.ok) {
        throw new Error(parseError(data, `Request failed with status ${res.status}`));
      }
      return data as T;
    },
    [router],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, monitorData, incidentData, maintenanceData] = await Promise.all([
        request<DashboardData>("/status/dashboard"),
        request<StatusMonitor[]>("/status/monitors"),
        request<Paged<Incident>>("/status/incidents"),
        request<MaintenanceWindow[]>("/status/maintenance"),
      ]);
      setDashboard(dashboardData);
      setMonitors(monitorData);
      setIncidents(incidentData.items);
      setMaintenance(maintenanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load status admin data.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (ready) {
      loadAll();
    }
  }, [ready, loadAll]);

  const navItems = useMemo(
    () => [
      { key: "dashboard" as const, label: "Dashboard", icon: Home },
      { key: "monitors" as const, label: "Monitors", icon: Activity },
      { key: "incidents" as const, label: "Incidents", icon: AlertTriangle },
      { key: "maintenance" as const, label: "Maintenance", icon: Wrench },
      { key: "alerts" as const, label: "Alerts", icon: Bell },
      { key: "settings" as const, label: "Settings", icon: Settings },
    ],
    [],
  );

  function logout() {
    clearAuth();
    router.push("/status");
  }

  function beginAddMonitor() {
    setEditingMonitor(null);
    setMonitorForm(defaultMonitorForm);
    setShowMonitorForm(true);
  }

  function beginEditMonitor(monitor: StatusMonitor) {
    setEditingMonitor(monitor);
    setMonitorForm({
      name: monitor.name,
      url: monitor.url,
      method: monitor.method,
      interval: monitor.interval,
      timeout: monitor.timeout,
      expected_status: monitor.expected_status,
      keyword: monitor.keyword ?? "",
      is_active: monitor.is_active,
      is_public: monitor.is_public,
      group_name: monitor.group_name,
    });
    setShowMonitorForm(true);
  }

  async function saveMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const payload = {
      ...monitorForm,
      keyword: monitorForm.keyword.trim() ? monitorForm.keyword.trim() : null,
      group_name: monitorForm.group_name.trim() || "General",
    };
    try {
      if (editingMonitor) {
        await request(`/status/monitors/${editingMonitor.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Monitor updated.");
      } else {
        await request("/status/monitors", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Monitor created.");
      }
      setShowMonitorForm(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save monitor.");
    }
  }

  async function toggleMonitor(monitor: StatusMonitor) {
    try {
      await request(`/status/monitors/${monitor.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !monitor.is_active }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update monitor.");
    }
  }

  async function deleteMonitor(monitor: StatusMonitor) {
    if (!window.confirm(`Delete ${monitor.name}?`)) return;
    try {
      await request(`/status/monitors/${monitor.id}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete monitor.");
    }
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await request("/status/incidents", { method: "POST", body: JSON.stringify(incidentForm) });
      setIncidentForm(defaultIncidentForm);
      setShowIncidentForm(false);
      setSuccess("Incident created.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create incident.");
    }
  }

  async function resolveIncident(incident: Incident) {
    try {
      await request(`/status/incidents/${incident.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve incident.");
    }
  }

  async function addIncidentUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updatingIncidentId === null) return;
    try {
      await request(`/status/incidents/${updatingIncidentId}/updates`, {
        method: "POST",
        body: JSON.stringify(incidentUpdateForm),
      });
      setUpdatingIncidentId(null);
      setIncidentUpdateForm({ status: "monitoring", message: "" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add update.");
    }
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await request("/status/maintenance", {
        method: "POST",
        body: JSON.stringify({
          ...maintenanceForm,
          starts_at: new Date(maintenanceForm.starts_at).toISOString(),
          ends_at: new Date(maintenanceForm.ends_at).toISOString(),
        }),
      });
      setMaintenanceForm(defaultMaintenanceForm);
      setShowMaintenanceForm(false);
      setSuccess("Maintenance scheduled.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to schedule maintenance.");
    }
  }

  async function deleteMaintenance(windowItem: MaintenanceWindow) {
    if (!window.confirm(`Delete ${windowItem.title}?`)) return;
    try {
      await request(`/status/maintenance/${windowItem.id}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete maintenance window.");
    }
  }

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (alertMonitorId === null) return;
    try {
      await request(`/status/monitors/${alertMonitorId}/alerts`, {
        method: "POST",
        body: JSON.stringify(alertForm),
      });
      setAlertForm(defaultAlertForm);
      setAlertMonitorId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add alert.");
    }
  }

  async function deleteAlert(alert: AlertConfig) {
    try {
      await request(`/status/alerts/${alert.id}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete alert.");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    try {
      await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.");
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
        <div className="mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Loading status admin
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="flex items-center gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <Image src="/logo.png" alt="WellFriend DevTools" width={40} height={40} className="h-10 w-10 rounded-2xl" />
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Status Admin</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500">WellFriend</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <Link
            href="/status"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ExternalLink className="h-4 w-4" />
            View public page
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="px-4 py-8 md:ml-64 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 md:hidden">
            <select value={view} onChange={(event) => setView(event.target.value as ViewKey)} className={selectClass}>
              {navItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Link href="/status" className={secondaryButton}>
                Public
              </Link>
              <button type="button" onClick={logout} className={secondaryButton}>
                Logout
              </button>
            </div>
          </div>

          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold capitalize text-zinc-900 dark:text-zinc-100">{view}</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {user ? `${user.username} · ${user.email}` : "Status administration"}
              </p>
            </div>
            <button type="button" onClick={loadAll} disabled={loading} className={secondaryButton}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
              <span>{success}</span>
              <button type="button" onClick={() => setSuccess("")} className="rounded-xl p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/40">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {view === "dashboard" && dashboard && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total Monitors", value: dashboard.total_monitors, color: "bg-zinc-400" },
                  { label: "Monitors Up", value: dashboard.monitors_up, color: "bg-emerald-500" },
                  { label: "Down", value: dashboard.monitors_down, color: "bg-red-500" },
                  { label: "Degraded", value: dashboard.monitors_degraded, color: "bg-yellow-500" },
                ].map((stat) => (
                  <div key={stat.label} className={`${cardClass} p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${stat.color}`} />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className={`${cardClass} overflow-hidden`}>
                  <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent checks</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-zinc-500">
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="px-5 py-3 font-medium">Monitor</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Response</th>
                          <th className="px-5 py-3 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {dashboard.recent_checks.map((check) => (
                          <tr key={check.id}>
                            <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">{check.monitor_name}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={check.status} />
                            </td>
                            <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                              {check.response_ms == null ? "timeout" : `${check.response_ms}ms`}
                            </td>
                            <td className="px-5 py-3 text-zinc-500">{formatDate(check.checked_at)}</td>
                          </tr>
                        ))}
                        {dashboard.recent_checks.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-6 text-center text-sm text-zinc-500">
                              No checks yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`${cardClass} p-5`}>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Quick status</h2>
                  <div className="mt-4 grid gap-3">
                    {dashboard.monitors.map((monitor) => (
                      <div key={monitor.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="flex min-w-0 items-center gap-2">
                          <StatusDot status={monitor.last_status} />
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{monitor.name}</span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {monitor.last_response_ms == null ? "timeout" : `${monitor.last_response_ms}ms`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === "monitors" && (
            <section className="space-y-5">
              <div className="flex justify-end">
                <button type="button" onClick={beginAddMonitor} className={primaryButton}>
                  <Plus className="h-4 w-4" />
                  Add Monitor
                </button>
              </div>

              {showMonitorForm && (
                <form onSubmit={saveMonitor} className={`${cardClass} space-y-4 p-5`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {editingMonitor ? "Edit Monitor" : "Add Monitor"}
                    </h2>
                    <button type="button" onClick={() => setShowMonitorForm(false)} className={secondaryButton}>
                      <X className="h-4 w-4" />
                      Close
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input value={monitorForm.name} onChange={(e) => setMonitorForm({ ...monitorForm, name: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>URL</label>
                      <input value={monitorForm.url} onChange={(e) => setMonitorForm({ ...monitorForm, url: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Method</label>
                      <select value={monitorForm.method} onChange={(e) => setMonitorForm({ ...monitorForm, method: e.target.value as StatusMonitor["method"] })} className={selectClass}>
                        <option>GET</option>
                        <option>HEAD</option>
                        <option>POST</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Check interval</label>
                      <select value={monitorForm.interval} onChange={(e) => setMonitorForm({ ...monitorForm, interval: Number(e.target.value) })} className={selectClass}>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={300}>5m</option>
                        <option value={900}>15m</option>
                        <option value={1800}>30m</option>
                        <option value={3600}>1h</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Timeout</label>
                      <select value={monitorForm.timeout} onChange={(e) => setMonitorForm({ ...monitorForm, timeout: Number(e.target.value) })} className={selectClass}>
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Expected status</label>
                      <input type="number" value={monitorForm.expected_status} onChange={(e) => setMonitorForm({ ...monitorForm, expected_status: Number(e.target.value) })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Keyword check</label>
                      <input value={monitorForm.keyword} onChange={(e) => setMonitorForm({ ...monitorForm, keyword: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Group name</label>
                      <input value={monitorForm.group_name} onChange={(e) => setMonitorForm({ ...monitorForm, group_name: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <input type="checkbox" checked={monitorForm.is_public} onChange={(e) => setMonitorForm({ ...monitorForm, is_public: e.target.checked })} />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <input type="checkbox" checked={monitorForm.is_active} onChange={(e) => setMonitorForm({ ...monitorForm, is_active: e.target.checked })} />
                      Active
                    </label>
                  </div>
                  <button type="submit" className={primaryButton}>
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </form>
              )}

              <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-zinc-500">
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">URL</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Uptime</th>
                        <th className="px-5 py-3 font-medium">Interval</th>
                        <th className="px-5 py-3 font-medium">Last Check</th>
                        <th className="px-5 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {monitors.map((monitor) => (
                        <tr key={monitor.id}>
                          <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{monitor.name}</td>
                          <td className="max-w-xs truncate px-5 py-3 text-zinc-600 dark:text-zinc-400">{monitor.url}</td>
                          <td className="px-5 py-3"><StatusBadge status={monitor.last_status} /></td>
                          <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{monitor.uptime_30d.toFixed(2)}%</td>
                          <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{monitor.interval}s</td>
                          <td className="px-5 py-3 text-zinc-500">{formatDate(monitor.last_checked_at)}</td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => beginEditMonitor(monitor)} className={secondaryButton}>
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </button>
                              <button type="button" onClick={() => toggleMonitor(monitor)} className={secondaryButton}>
                                {monitor.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                {monitor.is_active ? "Pause" : "Resume"}
                              </button>
                              <button type="button" onClick={() => deleteMonitor(monitor)} className={dangerButton}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {view === "incidents" && (
            <section className="space-y-5">
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowIncidentForm(true)} className={primaryButton}>
                  <Plus className="h-4 w-4" />
                  Create Incident
                </button>
              </div>
              {showIncidentForm && (
                <form onSubmit={createIncident} className={`${cardClass} space-y-4 p-5`}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Title</label>
                      <input value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Severity</label>
                      <select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value as Incident["severity"] })} className={selectClass}>
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value as Incident["status"] })} className={selectClass}>
                        <option value="investigating">Investigating</option>
                        <option value="identified">Identified</option>
                        <option value="monitoring">Monitoring</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Affected monitors</label>
                      <MultiMonitorSelect value={incidentForm.affected_monitors} monitors={monitors} onChange={(value) => setIncidentForm({ ...incidentForm, affected_monitors: value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea value={incidentForm.message} onChange={(e) => setIncidentForm({ ...incidentForm, message: e.target.value })} className={`${inputClass} min-h-28`} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <input type="checkbox" checked={incidentForm.is_public} onChange={(e) => setIncidentForm({ ...incidentForm, is_public: e.target.checked })} />
                    Public
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className={primaryButton}>Create</button>
                    <button type="button" onClick={() => setShowIncidentForm(false)} className={secondaryButton}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {incidents.map((incident) => (
                  <article key={incident.id} className={`${cardClass} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={incident.status} />
                          <SeverityBadge severity={incident.severity} />
                        </div>
                        <h2 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">{incident.title}</h2>
                        <p className="mt-1 text-sm text-zinc-500">{formatAffected(incident.affected_monitors, monitors)}</p>
                      </div>
                      <div className="flex gap-2">
                        {incident.status !== "resolved" && (
                          <button type="button" onClick={() => resolveIncident(incident)} className={secondaryButton}>
                            <CheckCircle2 className="h-4 w-4" />
                            Resolve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUpdatingIncidentId(incident.id);
                            setIncidentUpdateForm({ status: incident.status === "resolved" ? "monitoring" : incident.status, message: "" });
                          }}
                          className={secondaryButton}
                        >
                          <Plus className="h-4 w-4" />
                          Add Update
                        </button>
                      </div>
                    </div>
                    {incident.message && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{incident.message}</p>}
                    <div className="mt-3 text-xs text-zinc-500">
                      Started {formatDate(incident.started_at)}
                      {incident.resolved_at ? ` · Resolved ${formatDate(incident.resolved_at)}` : ""}
                    </div>

                    {updatingIncidentId === incident.id && (
                      <form onSubmit={addIncidentUpdate} className="mt-4 space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <select value={incidentUpdateForm.status} onChange={(e) => setIncidentUpdateForm({ ...incidentUpdateForm, status: e.target.value })} className={selectClass}>
                          <option value="investigating">Investigating</option>
                          <option value="identified">Identified</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <textarea value={incidentUpdateForm.message} onChange={(e) => setIncidentUpdateForm({ ...incidentUpdateForm, message: e.target.value })} className={`${inputClass} min-h-24`} required />
                        <div className="flex gap-2">
                          <button type="submit" className={primaryButton}>Save update</button>
                          <button type="button" onClick={() => setUpdatingIncidentId(null)} className={secondaryButton}>Cancel</button>
                        </div>
                      </form>
                    )}

                    {incident.updates.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        {incident.updates.map((update) => (
                          <div key={update.id}>
                            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {update.status} · {formatDate(update.created_at)}
                            </div>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "maintenance" && (
            <section className="space-y-5">
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowMaintenanceForm(true)} className={primaryButton}>
                  <Plus className="h-4 w-4" />
                  Schedule Maintenance
                </button>
              </div>
              {showMaintenanceForm && (
                <form onSubmit={createMaintenance} className={`${cardClass} space-y-4 p-5`}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Title</label>
                      <input value={maintenanceForm.title} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Affected monitors</label>
                      <MultiMonitorSelect value={maintenanceForm.affected_monitors} monitors={monitors} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, affected_monitors: value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Start</label>
                      <input type="datetime-local" value={maintenanceForm.starts_at} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, starts_at: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>End</label>
                      <input type="datetime-local" value={maintenanceForm.ends_at} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, ends_at: e.target.value })} className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea value={maintenanceForm.message} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, message: e.target.value })} className={`${inputClass} min-h-24`} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className={primaryButton}>Schedule</button>
                    <button type="button" onClick={() => setShowMaintenanceForm(false)} className={secondaryButton}>Cancel</button>
                  </div>
                </form>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                {maintenance.map((windowItem) => (
                  <article key={windowItem.id} className={`${cardClass} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{windowItem.title}</h2>
                        <p className="mt-1 text-sm text-zinc-500">{formatAffected(windowItem.affected_monitors, monitors)}</p>
                      </div>
                      <button type="button" onClick={() => deleteMaintenance(windowItem)} className={dangerButton}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                    {windowItem.message && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{windowItem.message}</p>}
                    <p className="mt-3 text-xs text-zinc-500">
                      {formatDate(windowItem.starts_at)} - {formatDate(windowItem.ends_at)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "alerts" && (
            <section className="grid gap-4 lg:grid-cols-2">
              {monitors.map((monitor) => (
                <article key={monitor.id} className={`${cardClass} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusDot status={monitor.last_status} />
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{monitor.name}</h2>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{monitor.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAlertMonitorId(monitor.id);
                        setAlertForm(defaultAlertForm);
                      }}
                      className={secondaryButton}
                    >
                      <Plus className="h-4 w-4" />
                      Add alert
                    </button>
                  </div>

                  {alertMonitorId === monitor.id && (
                    <form onSubmit={createAlert} className="mt-4 space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <select value={alertForm.type} onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value as AlertConfig["type"] })} className={selectClass}>
                        <option value="email">Email</option>
                        <option value="webhook">Webhook</option>
                      </select>
                      <input value={alertForm.target} onChange={(e) => setAlertForm({ ...alertForm, target: e.target.value })} className={inputClass} placeholder="Email address or webhook URL" required />
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <input type="checkbox" checked={alertForm.on_down} onChange={(e) => setAlertForm({ ...alertForm, on_down: e.target.checked })} />
                          On down
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <input type="checkbox" checked={alertForm.on_recovery} onChange={(e) => setAlertForm({ ...alertForm, on_recovery: e.target.checked })} />
                          On recovery
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className={primaryButton}>Save alert</button>
                        <button type="button" onClick={() => setAlertMonitorId(null)} className={secondaryButton}>Cancel</button>
                      </div>
                    </form>
                  )}

                  <div className="mt-4 space-y-2">
                    {(monitor.alerts ?? []).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="min-w-0">
                          <div className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">{alert.type}</div>
                          <div className="truncate text-xs text-zinc-500">{alert.target}</div>
                        </div>
                        <button type="button" onClick={() => deleteAlert(alert)} className={dangerButton}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {(monitor.alerts ?? []).length === 0 && (
                      <p className="text-sm text-zinc-500">No alerts configured</p>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}

          {view === "settings" && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className={`${cardClass} p-5`}>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Admin account</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Username</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{user?.username}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Email</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{user?.email}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Role</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{user?.is_admin ? "Admin" : "User"}</dd>
                  </div>
                </dl>
              </div>

              <form onSubmit={changePassword} className={`${cardClass} space-y-4 p-5`}>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Change password</h2>
                <div>
                  <label className={labelClass}>Current password</label>
                  <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>New password</label>
                  <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Confirm password</label>
                  <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className={inputClass} required />
                </div>
                <button type="submit" className={primaryButton}>
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
