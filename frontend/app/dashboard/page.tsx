"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clipboard,
  Edit3,
  Eye,
  EyeOff,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { authHeaders, clearAuth, getUser, StatusUser } from "@/lib/auth";
import { useToast } from "./toast";

type Section = "dashboard" | "monitors" | "incidents" | "maintenance" | "alerts" | "settings";
type StatusValue = "operational" | "degraded" | "outage" | "unknown";
type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
type Severity = "minor" | "major" | "critical";
type AlertType = "email" | "webhook" | "discord";

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
  status: IncidentStatus;
  message: string;
  created_at: string;
};

type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  severity: Severity;
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

type MonitorForm = {
  name: string;
  url: string;
  method: StatusMonitor["method"];
  interval: number;
  timeout: number;
  expected_status: number;
  keyword: string;
  is_active: boolean;
  is_public: boolean;
  group_name: string;
};

type IncidentForm = {
  title: string;
  severity: Severity;
  status: IncidentStatus;
  message: string;
  affected_monitors: number[];
  is_public: boolean;
};

type MaintenanceForm = {
  title: string;
  message: string;
  starts_at: string;
  ends_at: string;
  affected_monitors: number[];
};

const sections: Section[] = ["dashboard", "monitors", "incidents", "maintenance", "alerts", "settings"];

const cardClass = "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400";
const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
const dangerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700";

const defaultMonitorForm: MonitorForm = {
  name: "",
  url: "https://",
  method: "GET",
  interval: 60,
  timeout: 10,
  expected_status: 200,
  keyword: "",
  is_active: true,
  is_public: true,
  group_name: "General",
};

const defaultIncidentForm: IncidentForm = {
  title: "",
  severity: "minor",
  status: "investigating",
  message: "",
  affected_monitors: [],
  is_public: true,
};

const defaultMaintenanceForm: MaintenanceForm = {
  title: "",
  message: "",
  starts_at: "",
  ends_at: "",
  affected_monitors: [],
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

function useRelativeTime(dateStr: string | null) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => forceUpdate((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!dateStr) return "Never";

  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${hours}h ${minutes}m ${seconds}s ago`;
}

function formatLastUpdated(lastUpdatedAt: number | null, now: number) {
  if (!lastUpdatedAt) return "Not updated yet";
  const seconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function intervalLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function statusDotClass(status: StatusValue) {
  if (status === "operational") return "bg-emerald-500";
  if (status === "degraded") return "bg-yellow-500";
  if (status === "outage") return "animate-pulse bg-red-500";
  return "bg-zinc-400";
}

function statusPillClass(status: StatusValue | IncidentStatus) {
  if (status === "operational" || status === "resolved") {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400";
  }
  if (status === "degraded" || status === "identified" || status === "monitoring") {
    return "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400";
  }
  if (status === "outage" || status === "investigating") {
    return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
  }
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
}

function severityClass(severity: Severity) {
  if (severity === "critical") return "border-l-red-500";
  if (severity === "major") return "border-l-orange-500";
  return "border-l-yellow-500";
}

function severityPillClass(severity: Severity) {
  if (severity === "critical") return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
  if (severity === "major") return "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400";
  return "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400";
}

function responseClass(ms: number | null) {
  if (ms === null) return "text-zinc-400";
  if (ms < 30) return "text-emerald-600 dark:text-emerald-400";
  if (ms <= 100) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function uptimeBarClass(value: number) {
  if (value > 99) return "bg-emerald-500";
  if (value > 95) return "bg-yellow-500";
  return "bg-red-500";
}

function checkColor(status: StatusValue) {
  if (status === "operational") return "bg-emerald-500";
  if (status === "degraded") return "bg-yellow-500";
  if (status === "outage") return "bg-red-500";
  return "bg-zinc-400";
}

function formatAffected(ids: number[], monitors: StatusMonitor[]) {
  if (ids.length === 0) return "All monitors";
  const names = ids
    .map((id) => monitors.find((monitor) => monitor.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : `${ids.length} monitors`;
}

function maintenanceStatus(windowItem: MaintenanceWindow) {
  const now = Date.now();
  const start = new Date(windowItem.starts_at).getTime();
  const end = new Date(windowItem.ends_at).getTime();
  if (now < start) return "upcoming";
  if (now <= end) return "active";
  return "past";
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 4) return { label: "Strong", className: "bg-emerald-500", width: "100%" };
  if (score >= 2) return { label: "Medium", className: "bg-yellow-500", width: "66%" };
  return { label: "Weak", className: "bg-red-500", width: "33%" };
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardPageLoading() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      Loading dashboard data
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [monitors, setMonitors] = useState<StatusMonitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);
  const [checksByMonitor, setChecksByMonitor] = useState<Record<number, MonitorCheck[]>>({});
  const [expandedMonitor, setExpandedMonitor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const hasLoadedRef = useRef(false);
  const [monitorModalOpen, setMonitorModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<StatusMonitor | null>(null);
  const [monitorForm, setMonitorForm] = useState<MonitorForm>(defaultMonitorForm);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(defaultIncidentForm);
  const [updateIncident, setUpdateIncident] = useState<Incident | null>(null);
  const [updateForm, setUpdateForm] = useState({ status: "monitoring" as IncidentStatus, message: "" });
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(defaultMaintenanceForm);
  const [alertMonitorId, setAlertMonitorId] = useState<number | null>(null);
  const [alertForm, setAlertForm] = useState({
    type: "email" as AlertType,
    target: "",
    on_down: true,
    on_recovery: true,
  });
  const [incidentFilter, setIncidentFilter] = useState<"all" | "active" | "resolved">("all");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);

  const section = useMemo<Section>(() => {
    const value = searchParams.get("section");
    return sections.includes(value as Section) ? (value as Section) : "dashboard";
  }, [searchParams]);

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
        router.replace("/dashboard/login");
        throw new Error("Session expired.");
      }
      if (!res.ok) {
        throw new Error(parseError(data, `Request failed with status ${res.status}`));
      }
      return data as T;
    },
    [router],
  );

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    if (!hasLoadedRef.current) setLoading(true);

    try {
      const [dashboardData, monitorData, incidentData, maintenanceData] = await Promise.all([
        request<DashboardData>("/status/dashboard"),
        request<StatusMonitor[]>("/status/monitors"),
        request<Paged<Incident>>("/status/incidents?per_page=100"),
        request<MaintenanceWindow[]>("/status/maintenance"),
      ]);
      setDashboard(dashboardData);
      setMonitors(monitorData);
      setIncidents(incidentData.items);
      setMaintenance(maintenanceData);
      setLoadError(null);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load dashboard.");
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(fetchData, loadError ? 30000 : 120000);
    return () => window.clearInterval(timer);
  }, [fetchData, loadError]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "add" && section === "monitors") {
      openAddMonitor();
      router.replace("/dashboard?section=monitors");
    }
  }, [router, searchParams, section]);

  async function loadMonitorChecks(monitorId: number) {
    if (checksByMonitor[monitorId]) return;
    try {
      const data = await request<Paged<MonitorCheck>>(`/status/monitors/${monitorId}/checks?per_page=60`);
      setChecksByMonitor((current) => ({ ...current, [monitorId]: data.items.slice().reverse() }));
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to load checks.");
    }
  }

  function openAddMonitor() {
    setEditingMonitor(null);
    setMonitorForm(defaultMonitorForm);
    setMonitorModalOpen(true);
  }

  function openEditMonitor(monitor: StatusMonitor) {
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
    setMonitorModalOpen(true);
  }

  async function saveMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...monitorForm,
      keyword: monitorForm.keyword.trim() ? monitorForm.keyword.trim() : null,
      group_name: monitorForm.group_name.trim() || "General",
    };
    try {
      if (editingMonitor) {
        await request(`/status/monitors/${editingMonitor.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("success", "Monitor updated.");
      } else {
        await request("/status/monitors", { method: "POST", body: JSON.stringify(payload) });
        showToast("success", "Monitor created.");
      }
      setMonitorModalOpen(false);
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save monitor.");
    }
  }

  async function toggleMonitor(monitor: StatusMonitor) {
    try {
      await request(`/status/monitors/${monitor.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !monitor.is_active }),
      });
      showToast("success", monitor.is_active ? "Monitor paused." : "Monitor resumed.");
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to update monitor.");
    }
  }

  async function deleteMonitor(monitor: StatusMonitor) {
    if (!window.confirm(`Delete ${monitor.name}?`)) return;
    try {
      await request(`/status/monitors/${monitor.id}`, { method: "DELETE" });
      showToast("success", "Monitor deleted.");
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to delete monitor.");
    }
  }

  function openCreateIncident() {
    setEditingIncident(null);
    setIncidentForm(defaultIncidentForm);
    setIncidentModalOpen(true);
  }

  function openEditIncident(incident: Incident) {
    setEditingIncident(incident);
    setIncidentForm({
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      message: incident.message ?? "",
      affected_monitors: incident.affected_monitors,
      is_public: incident.is_public,
    });
    setIncidentModalOpen(true);
  }

  async function saveIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (editingIncident) {
        await request(`/status/incidents/${editingIncident.id}`, {
          method: "PUT",
          body: JSON.stringify(incidentForm),
        });
        showToast("success", "Incident updated.");
      } else {
        await request("/status/incidents", { method: "POST", body: JSON.stringify(incidentForm) });
        showToast("success", "Incident created.");
      }
      setIncidentModalOpen(false);
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save incident.");
    }
  }

  async function saveIncidentUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateIncident) return;
    try {
      await request(`/status/incidents/${updateIncident.id}/updates`, {
        method: "POST",
        body: JSON.stringify(updateForm),
      });
      showToast("success", "Incident update added.");
      setUpdateIncident(null);
      setUpdateForm({ status: "monitoring", message: "" });
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to add update.");
    }
  }

  async function resolveIncident(incident: Incident) {
    try {
      await request(`/status/incidents/${incident.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
      });
      showToast("success", "Incident resolved.");
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to resolve incident.");
    }
  }

  async function saveMaintenance(event: FormEvent<HTMLFormElement>) {
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
      showToast("success", "Maintenance scheduled.");
      setMaintenanceModalOpen(false);
      setMaintenanceForm(defaultMaintenanceForm);
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to schedule maintenance.");
    }
  }

  async function deleteMaintenance(windowItem: MaintenanceWindow) {
    if (!window.confirm(`Delete ${windowItem.title}?`)) return;
    try {
      await request(`/status/maintenance/${windowItem.id}`, { method: "DELETE" });
      showToast("success", "Maintenance deleted.");
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to delete maintenance.");
    }
  }

  async function saveAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!alertMonitorId) return;
    try {
      await request(`/status/monitors/${alertMonitorId}/alerts`, {
        method: "POST",
        body: JSON.stringify({
          ...alertForm,
          type: alertForm.type === "discord" ? "webhook" : alertForm.type,
        }),
      });
      showToast("success", "Alert added.");
      setAlertMonitorId(null);
      setAlertForm({ type: "email", target: "", on_down: true, on_recovery: true });
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to add alert.");
    }
  }

  async function deleteAlert(alert: AlertConfig) {
    try {
      await request(`/status/alerts/${alert.id}`, { method: "DELETE" });
      showToast("success", "Alert deleted.");
      await fetchData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to delete alert.");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      showToast("error", "New passwords do not match.");
      return;
    }
    try {
      await request("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.next,
        }),
      });
      showToast("success", "Password updated.");
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to change password.");
    }
  }

  async function copyStatusLink() {
    await navigator.clipboard.writeText("https://devtools.wellfriend.online/status");
    showToast("success", "Status page link copied.");
  }

  const activeMonitorCount = monitors.filter((monitor) => monitor.is_active).length;
  const filteredIncidents = incidents.filter((incident) => {
    if (incidentFilter === "active") return incident.status !== "resolved";
    if (incidentFilter === "resolved") return incident.status === "resolved";
    return true;
  });
  const recentIncidents = incidents.slice(0, 5);
  const user = getUser();
  const strength = passwordStrength(passwordForm.next);
  const lastUpdatedLabel = isRefreshing ? "Refreshing..." : formatLastUpdated(lastUpdatedAt, now);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100">{section}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-600">Live monitor data refreshes automatically.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <span>{lastUpdatedLabel}</span>
          <button
            type="button"
            onClick={fetchData}
            disabled={isRefreshing}
            aria-label="Refresh dashboard data"
            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Failed to load monitor data. Retrying automatically...</span>
        </div>
      )}

      {section === "dashboard" && loading && <DashboardSkeleton />}

      {section === "dashboard" && !loading && dashboard && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Monitors"
              value={dashboard.total_monitors.toString()}
              subtext={`${activeMonitorCount} active`}
              icon={<Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            />
            <StatCard
              label="Operational"
              value={dashboard.monitors_up.toString()}
              valueClass="text-emerald-600 dark:text-emerald-400"
              subtext={
                dashboard.total_monitors > 0
                  ? `${Math.round((dashboard.monitors_up / dashboard.total_monitors) * 100)}% of monitors`
                  : "All systems go"
              }
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            />
            <StatCard
              label="Down"
              value={dashboard.monitors_down.toString()}
              valueClass={dashboard.monitors_down > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
              subtext={dashboard.monitors_down > 0 ? "Requires attention" : "None"}
              icon={<XCircle className={`h-5 w-5 ${dashboard.monitors_down > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`} />}
            />
            <StatCard
              label="Avg Response"
              value={`${Math.round(dashboard.avg_response_ms)}ms`}
              subtext="Across all monitors"
              icon={<Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            />
          </div>

          <MonitorsTable
            monitors={monitors}
            checksByMonitor={checksByMonitor}
            expandedMonitor={expandedMonitor}
            onAdd={openAddMonitor}
            onEdit={openEditMonitor}
            onToggle={toggleMonitor}
            onDelete={deleteMonitor}
            onExpand={async (monitor) => {
              const next = expandedMonitor === monitor.id ? null : monitor.id;
              setExpandedMonitor(next);
              if (next !== null) await loadMonitorChecks(monitor.id);
            }}
            onAddAlert={(monitor) => setAlertMonitorId(monitor.id)}
            onDeleteAlert={deleteAlert}
            alertMonitorId={alertMonitorId}
            alertForm={alertForm}
            setAlertForm={setAlertForm}
            onSaveAlert={saveAlert}
          />

          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Recent Incidents</h2>
              <Link href="/dashboard?section=incidents" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                View all
              </Link>
            </div>
            <IncidentList
              incidents={recentIncidents}
              monitors={monitors}
              compact
              onEdit={openEditIncident}
              onUpdate={(incident) => {
                setUpdateIncident(incident);
                setUpdateForm({ status: incident.status, message: "" });
              }}
              onResolve={resolveIncident}
            />
          </section>
        </section>
      )}

      {section === "monitors" && (
        <MonitorsTable
          monitors={monitors}
          checksByMonitor={checksByMonitor}
          expandedMonitor={expandedMonitor}
          onAdd={openAddMonitor}
          onEdit={openEditMonitor}
          onToggle={toggleMonitor}
          onDelete={deleteMonitor}
          onExpand={async (monitor) => {
            const next = expandedMonitor === monitor.id ? null : monitor.id;
            setExpandedMonitor(next);
            if (next !== null) await loadMonitorChecks(monitor.id);
          }}
          onAddAlert={(monitor) => setAlertMonitorId(monitor.id)}
          onDeleteAlert={deleteAlert}
          alertMonitorId={alertMonitorId}
          alertForm={alertForm}
          setAlertForm={setAlertForm}
          onSaveAlert={saveAlert}
        />
      )}

      {section === "incidents" && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Incidents</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Track public incident communication and internal response.</p>
            </div>
            <button type="button" onClick={openCreateIncident} className={primaryButton}>
              <Plus className="h-4 w-4" />
              Create Incident
            </button>
          </div>
          <div className="flex gap-4 border-b border-zinc-200 text-sm dark:border-zinc-800">
            {(["all", "active", "resolved"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setIncidentFilter(filter)}
                className={
                  "border-b-2 px-1 py-2 font-medium capitalize " +
                  (incidentFilter === filter
                    ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100")
                }
              >
                {filter}
              </button>
            ))}
          </div>
          <IncidentList
            incidents={filteredIncidents}
            monitors={monitors}
            onEdit={openEditIncident}
            onUpdate={(incident) => {
              setUpdateIncident(incident);
              setUpdateForm({ status: incident.status, message: "" });
            }}
            onResolve={resolveIncident}
          />
        </section>
      )}

      {section === "maintenance" && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Maintenance</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Schedule maintenance windows and keep the public page current.</p>
            </div>
            <button type="button" onClick={() => setMaintenanceModalOpen(true)} className={primaryButton}>
              <Plus className="h-4 w-4" />
              Schedule Maintenance
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {maintenance.map((windowItem) => (
              <article key={windowItem.id} className={`${cardClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-xl bg-blue-50 px-2 py-1 text-xs font-medium capitalize text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                      {maintenanceStatus(windowItem)}
                    </span>
                    <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">{windowItem.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-600">
                      {formatDate(windowItem.starts_at)} - {formatDate(windowItem.ends_at)}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteMaintenance(windowItem)} className="rounded-xl p-2 text-zinc-400 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {windowItem.message && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{windowItem.message}</p>}
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-600">{formatAffected(windowItem.affected_monitors, monitors)}</p>
              </article>
            ))}
            {maintenance.length === 0 && <EmptyState title="No maintenance scheduled" body="Create a maintenance window when planned work may affect users." />}
          </div>
        </section>
      )}

      {section === "alerts" && (
        <section className="grid gap-4 lg:grid-cols-2">
          {monitors.map((monitor) => (
            <article key={monitor.id} className={`${cardClass} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(monitor.last_status)}`} />
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{monitor.name}</h3>
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-600">{monitor.url}</p>
                </div>
                <button type="button" onClick={() => setAlertMonitorId(monitor.id)} className={secondaryButton}>
                  <Plus className="h-4 w-4" />
                  Add Alert
                </button>
              </div>
              <AlertPanel
                monitor={monitor}
                open={alertMonitorId === monitor.id}
                alertForm={alertForm}
                setAlertForm={setAlertForm}
                onSaveAlert={saveAlert}
                onCancel={() => setAlertMonitorId(null)}
                onDeleteAlert={deleteAlert}
              />
            </article>
          ))}
        </section>
      )}

      {section === "settings" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={changePassword} className={`${cardClass} space-y-4 p-5`}>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Account</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {user?.username ?? "Admin"} - {user?.email ?? "No email available"}
              </p>
            </div>
            <div>
              <label className={labelClass}>Current password</label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.next}
                  onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                  className={`${inputClass} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.next && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className={`h-1 rounded-full ${strength.className}`} style={{ width: strength.width }} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Confirm new password</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                className={inputClass}
                required
              />
            </div>
            <button type="submit" className={primaryButton}>
              <Save className="h-4 w-4" />
              Save
            </button>
          </form>

          <div className={`${cardClass} space-y-4 p-5`}>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Status Page</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Public status page controls and links.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              https://devtools.wellfriend.online/status
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyStatusLink} className={secondaryButton}>
                <Clipboard className="h-4 w-4" />
                Copy link
              </button>
              <Link href="/status" target="_blank" className={secondaryButton}>
                Preview
              </Link>
            </div>
          </div>
        </section>
      )}

      {monitorModalOpen && (
        <MonitorModal
          form={monitorForm}
          setForm={setMonitorForm}
          editing={!!editingMonitor}
          onClose={() => setMonitorModalOpen(false)}
          onSubmit={saveMonitor}
        />
      )}

      {incidentModalOpen && (
        <IncidentModal
          form={incidentForm}
          setForm={setIncidentForm}
          monitors={monitors}
          editing={!!editingIncident}
          onClose={() => setIncidentModalOpen(false)}
          onSubmit={saveIncident}
        />
      )}

      {updateIncident && (
        <UpdateModal
          form={updateForm}
          setForm={setUpdateForm}
          onClose={() => setUpdateIncident(null)}
          onSubmit={saveIncidentUpdate}
        />
      )}

      {maintenanceModalOpen && (
        <MaintenanceModal
          form={maintenanceForm}
          setForm={setMaintenanceForm}
          monitors={monitors}
          onClose={() => setMaintenanceModalOpen(false)}
          onSubmit={saveMaintenance}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  valueClass = "text-zinc-900 dark:text-zinc-100",
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
          <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        </div>
        {icon}
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">{subtext}</p>
    </div>
  );
}

function MonitorsTable({
  monitors,
  checksByMonitor,
  expandedMonitor,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
  onExpand,
  onAddAlert,
  onDeleteAlert,
  alertMonitorId,
  alertForm,
  setAlertForm,
  onSaveAlert,
}: {
  monitors: StatusMonitor[];
  checksByMonitor: Record<number, MonitorCheck[]>;
  expandedMonitor: number | null;
  onAdd: () => void;
  onEdit: (monitor: StatusMonitor) => void;
  onToggle: (monitor: StatusMonitor) => void;
  onDelete: (monitor: StatusMonitor) => void;
  onExpand: (monitor: StatusMonitor) => void;
  onAddAlert: (monitor: StatusMonitor) => void;
  onDeleteAlert: (alert: AlertConfig) => void;
  alertMonitorId: number | null;
  alertForm: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean };
  setAlertForm: (form: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean }) => void;
  onSaveAlert: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Monitors</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Service checks, response times, and alert configuration.</p>
        </div>
        <button type="button" onClick={onAdd} className={primaryButton}>
          <Plus className="h-4 w-4" />
          Add Monitor
        </button>
      </div>

      {monitors.length === 0 ? (
        <div className="p-8">
          <EmptyState title="No monitors yet" body="Add your first monitor to start tracking uptime." action={onAdd} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">URL</th>
                <th className="px-5 py-3 font-medium">Response</th>
                <th className="px-5 py-3 font-medium">Uptime</th>
                <th className="px-5 py-3 font-medium">Last Check</th>
                <th className="px-5 py-3 font-medium">Interval</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {monitors.map((monitor) => {
                const checks = checksByMonitor[monitor.id] ?? [];
                return (
                  <>
                    <tr key={monitor.id} className="align-top">
                      <td className="px-5 py-4">
                        <span className={`block h-2.5 w-2.5 rounded-full ${statusDotClass(monitor.last_status)}`} />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => onExpand(monitor)}
                          className="text-left font-medium text-zinc-900 hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-400"
                        >
                          {monitor.name}
                        </button>
                        <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">{monitor.group_name}</div>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-4 text-xs text-zinc-500 dark:text-zinc-600">{monitor.url}</td>
                      <td className={`px-5 py-4 text-sm font-medium ${responseClass(monitor.last_response_ms)}`}>
                        {monitor.last_response_ms == null ? "-" : `${monitor.last_response_ms}ms`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-zinc-700 dark:text-zinc-300">{monitor.uptime_30d.toFixed(2)}%</div>
                        <div className="mt-2 h-1 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className={`h-1 rounded-full ${uptimeBarClass(monitor.uptime_30d)}`} style={{ width: `${Math.min(100, monitor.uptime_30d)}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-500 dark:text-zinc-600">
                        <LiveRelativeTime value={monitor.last_checked_at} />
                      </td>
                      <td className="px-5 py-4 text-zinc-500 dark:text-zinc-600">{intervalLabel(monitor.interval)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <IconButton label="Edit" onClick={() => onEdit(monitor)} icon={<Edit3 className="h-4 w-4" />} />
                          <IconButton label={monitor.is_active ? "Pause" : "Resume"} onClick={() => onToggle(monitor)} icon={monitor.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} />
                          <IconButton label="Delete" onClick={() => onDelete(monitor)} icon={<Trash2 className="h-4 w-4" />} danger />
                        </div>
                      </td>
                    </tr>
                    {expandedMonitor === monitor.id && (
                      <tr key={`${monitor.id}-detail`}>
                        <td colSpan={8} className="bg-zinc-50 px-5 py-5 dark:bg-zinc-950">
                          <MonitorDetail
                            monitor={monitor}
                            checks={checks}
                            onAddAlert={() => onAddAlert(monitor)}
                            onDeleteAlert={onDeleteAlert}
                            alertOpen={alertMonitorId === monitor.id}
                            alertForm={alertForm}
                            setAlertForm={setAlertForm}
                            onSaveAlert={onSaveAlert}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LiveRelativeTime({ value }: { value: string | null }) {
  return <>{useRelativeTime(value)}</>;
}

function MonitorDetail({
  monitor,
  checks,
  onAddAlert,
  onDeleteAlert,
  alertOpen,
  alertForm,
  setAlertForm,
  onSaveAlert,
}: {
  monitor: StatusMonitor;
  checks: MonitorCheck[];
  onAddAlert: () => void;
  onDeleteAlert: (alert: AlertConfig) => void;
  alertOpen: boolean;
  alertForm: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean };
  setAlertForm: (form: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean }) => void;
  onSaveAlert: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const responseValues = checks.map((check) => check.response_ms).filter((value): value is number => value !== null);
  const avg = responseValues.length ? Math.round(responseValues.reduce((sum, value) => sum + value, 0) / responseValues.length) : null;
  const min = responseValues.length ? Math.min(...responseValues) : null;
  const max = responseValues.length ? Math.max(...responseValues) : null;
  const failures = checks.filter((check) => check.status !== "operational").length;
  const chartMax = Math.max(1, ...responseValues, 100);

  return (
    <div className="space-y-5">
      <div className="flex h-24 items-end gap-1">
        {checks.length === 0 && <div className="text-sm text-zinc-500 dark:text-zinc-600">No checks yet</div>}
        {checks.slice(-60).map((check) => (
          <div
            key={check.id}
            title={`${formatDate(check.checked_at)} - ${check.status} - ${check.response_ms == null ? "timeout" : `${check.response_ms}ms`}`}
            className={`min-h-2 flex-1 rounded-sm ${checkColor(check.status)}`}
            style={{ height: `${Math.max(8, ((check.response_ms ?? chartMax) / chartMax) * 88)}px` }}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="30d uptime" value={`${monitor.uptime_30d.toFixed(2)}%`} />
        <MiniStat label="Avg response" value={avg == null ? "-" : `${avg}ms`} />
        <MiniStat label="Min response" value={min == null ? "-" : `${min}ms`} />
        <MiniStat label="Max response" value={max == null ? "-" : `${max}ms`} />
        <MiniStat label="Total checks" value={checks.length.toString()} />
        <MiniStat label="Failures" value={failures.toString()} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            Recent checks
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {checks.slice(-20).reverse().map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-600">{formatDate(check.checked_at)}</td>
                    <td className="px-4 py-3"><StatusPill status={check.status} /></td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{check.response_ms == null ? "-" : `${check.response_ms}ms`}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{check.status_code ?? "-"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-500 dark:text-zinc-600">{check.error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Alert configs</h3>
            <button type="button" onClick={onAddAlert} className={secondaryButton}>
              <Plus className="h-4 w-4" />
              Add Alert
            </button>
          </div>
          <AlertPanel
            monitor={monitor}
            open={alertOpen}
            alertForm={alertForm}
            setAlertForm={setAlertForm}
            onSaveAlert={onSaveAlert}
            onCancel={() => setAlertForm({ type: "email", target: "", on_down: true, on_recovery: true })}
            onDeleteAlert={onDeleteAlert}
          />
        </div>
      </div>
    </div>
  );
}

function AlertPanel({
  monitor,
  open,
  alertForm,
  setAlertForm,
  onSaveAlert,
  onCancel,
  onDeleteAlert,
}: {
  monitor: StatusMonitor;
  open: boolean;
  alertForm: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean };
  setAlertForm: (form: { type: AlertType; target: string; on_down: boolean; on_recovery: boolean }) => void;
  onSaveAlert: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDeleteAlert: (alert: AlertConfig) => void;
}) {
  return (
    <div className="space-y-3">
      {open && (
        <form onSubmit={onSaveAlert} className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <select value={alertForm.type} onChange={(event) => setAlertForm({ ...alertForm, type: event.target.value as AlertType })} className={inputClass}>
            <option value="email">Email</option>
            <option value="webhook">Webhook</option>
            <option value="discord">Discord</option>
          </select>
          <input value={alertForm.target} onChange={(event) => setAlertForm({ ...alertForm, target: event.target.value })} className={inputClass} placeholder="Email address or webhook URL" required />
          <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <ToggleLabel checked={alertForm.on_down} onChange={(value) => setAlertForm({ ...alertForm, on_down: value })} label="On Down" />
            <ToggleLabel checked={alertForm.on_recovery} onChange={(value) => setAlertForm({ ...alertForm, on_recovery: value })} label="On Recovery" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={primaryButton}>Save Alert</button>
            <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
          </div>
        </form>
      )}
      {(monitor.alerts ?? []).map((alert) => (
        <div key={alert.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">{alert.type}</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-600">{alert.target}</div>
          </div>
          <button type="button" onClick={() => onDeleteAlert(alert)} className="rounded-xl p-2 text-zinc-400 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {(monitor.alerts ?? []).length === 0 && !open && (
        <p className="text-sm text-zinc-500 dark:text-zinc-600">No alerts configured</p>
      )}
    </div>
  );
}

function IncidentList({
  incidents,
  monitors,
  compact = false,
  onEdit,
  onUpdate,
  onResolve,
}: {
  incidents: Incident[];
  monitors: StatusMonitor[];
  compact?: boolean;
  onEdit: (incident: Incident) => void;
  onUpdate: (incident: Incident) => void;
  onResolve: (incident: Incident) => void;
}) {
  if (incidents.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-600">No incidents recorded</p>;
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <article key={incident.id} className={`${cardClass} border-l-4 p-5 ${severityClass(incident.severity)}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-xl px-2 py-1 text-xs font-medium capitalize ${severityPillClass(incident.severity)}`}>
                  {incident.severity}
                </span>
                <StatusPill status={incident.status} />
              </div>
              <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold text-zinc-900 dark:text-zinc-100`}>{incident.title}</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">{formatDate(incident.started_at)} - {formatAffected(incident.affected_monitors, monitors)}</p>
            </div>
            {incident.status !== "resolved" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onUpdate(incident)} className={secondaryButton}>Add Update</button>
                <button type="button" onClick={() => onResolve(incident)} className={secondaryButton}>Resolve</button>
                <button type="button" onClick={() => onEdit(incident)} className={secondaryButton}>Edit</button>
              </div>
            )}
          </div>
          {incident.message && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{incident.message}</p>}
          {incident.updates.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">Updates timeline</summary>
              <div className="mt-3 space-y-3">
                {incident.updates.map((update) => (
                  <div key={update.id} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <div className="text-xs font-medium capitalize text-zinc-500 dark:text-zinc-600">
                        {update.status} - {formatDate(update.created_at)}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{update.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

function MonitorModal({
  form,
  setForm,
  editing,
  onClose,
  onSubmit,
}: {
  form: MonitorForm;
  setForm: (form: MonitorForm) => void;
  editing: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title={editing ? "Edit Monitor" : "Add Monitor"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} required /></Field>
          <Field label="URL"><input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} className={inputClass} required /></Field>
          <Field label="Method">
            <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as StatusMonitor["method"] })} className={inputClass}>
              <option>GET</option>
              <option>HEAD</option>
              <option>POST</option>
            </select>
          </Field>
          <Field label="Group"><input value={form.group_name} onChange={(event) => setForm({ ...form, group_name: event.target.value })} className={inputClass} /></Field>
          <Field label="Check interval">
            <select value={form.interval} onChange={(event) => setForm({ ...form, interval: Number(event.target.value) })} className={inputClass}>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={1800}>30 minutes</option>
              <option value={3600}>1 hour</option>
            </select>
          </Field>
          <Field label="Timeout">
            <select value={form.timeout} onChange={(event) => setForm({ ...form, timeout: Number(event.target.value) })} className={inputClass}>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </Field>
          <Field label="Expected status"><input type="number" value={form.expected_status} onChange={(event) => setForm({ ...form, expected_status: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label="Keyword check">
            <input value={form.keyword} onChange={(event) => setForm({ ...form, keyword: event.target.value })} className={inputClass} />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">If set, response body must contain this text</p>
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <ToggleLabel checked={form.is_public} onChange={(value) => setForm({ ...form, is_public: value })} label="Public" />
          <ToggleLabel checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} label="Active" />
        </div>
        <ModalActions onClose={onClose} submitLabel="Save Monitor" />
      </form>
    </Modal>
  );
}

function IncidentModal({
  form,
  setForm,
  monitors,
  editing,
  onClose,
  onSubmit,
}: {
  form: IncidentForm;
  setForm: (form: IncidentForm) => void;
  monitors: StatusMonitor[];
  editing: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title={editing ? "Edit Incident" : "Create Incident"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity">
            <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as Severity })} className={inputClass}>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as IncidentStatus })} className={inputClass}>
              <option value="investigating">Investigating</option>
              <option value="identified">Identified</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </Field>
        </div>
        <Field label="Message"><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={`${inputClass} min-h-28`} /></Field>
        <CheckboxList value={form.affected_monitors} monitors={monitors} onChange={(value) => setForm({ ...form, affected_monitors: value })} />
        <ToggleLabel checked={form.is_public} onChange={(value) => setForm({ ...form, is_public: value })} label="Public" />
        <ModalActions onClose={onClose} submitLabel={editing ? "Save Incident" : "Create Incident"} />
      </form>
    </Modal>
  );
}

function UpdateModal({
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  form: { status: IncidentStatus; message: string };
  setForm: (form: { status: IncidentStatus; message: string }) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="Add Update" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Status">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as IncidentStatus })} className={inputClass}>
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </Field>
        <Field label="Message"><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={`${inputClass} min-h-28`} required /></Field>
        <ModalActions onClose={onClose} submitLabel="Save Update" />
      </form>
    </Modal>
  );
}

function MaintenanceModal({
  form,
  setForm,
  monitors,
  onClose,
  onSubmit,
}: {
  form: MaintenanceForm;
  setForm: (form: MaintenanceForm) => void;
  monitors: StatusMonitor[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="Schedule Maintenance" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} required /></Field>
        <Field label="Message"><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={`${inputClass} min-h-24`} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start datetime"><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className={inputClass} required /></Field>
          <Field label="End datetime"><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className={inputClass} required /></Field>
        </div>
        <CheckboxList value={form.affected_monitors} monitors={monitors} onChange={(value) => setForm({ ...form, affected_monitors: value })} />
        <ModalActions onClose={onClose} submitLabel="Schedule" />
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function ToggleLabel({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
      />
      {label}
    </label>
  );
}

function CheckboxList({
  value,
  monitors,
  onChange,
}: {
  value: number[];
  monitors: StatusMonitor[];
  onChange: (value: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div>
      <div className={labelClass}>Affected monitors</div>
      <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        {monitors.map((monitor) => (
          <ToggleLabel key={monitor.id} checked={value.includes(monitor.id)} onChange={() => toggle(monitor.id)} label={monitor.name} />
        ))}
        {monitors.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-600">No monitors available</p>}
      </div>
    </div>
  );
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
      <button type="submit" className={primaryButton}>{submitLabel}</button>
    </div>
  );
}

function IconButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-xl p-2 transition-colors ${
        danger
          ? "text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
    </button>
  );
}

function StatusPill({ status }: { status: StatusValue | IncidentStatus }) {
  return <span className={`rounded-xl px-2 py-1 text-xs font-medium capitalize ${statusPillClass(status)}`}>{status}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">{label}</div>
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
        <Activity className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-600">{body}</p>
      {action && (
        <button type="button" onClick={action} className={`${primaryButton} mt-5`}>
          <Plus className="h-4 w-4" />
          Add Monitor
        </button>
      )}
    </div>
  );
}
