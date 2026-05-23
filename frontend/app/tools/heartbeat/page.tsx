"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Select } from "@/components/ui";

type HeartbeatPing = {
  id: string;
  pinged_at: string | null;
  status: "up" | "late" | "down";
};

type HeartbeatMonitor = {
  id: string;
  name: string;
  expected_interval_minutes: number;
  grace_period_minutes: number;
  last_ping_at: string | null;
  next_expected_at: string | null;
  status: "up" | "late" | "down";
  ping_count: number;
  ping_url: string;
  history: HeartbeatPing[];
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function statusClass(status: string) {
  if (status === "up") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (status === "late") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300";
  return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300";
}

function dotClass(status: string) {
  if (status === "up") return "bg-emerald-500";
  if (status === "late") return "bg-yellow-500";
  return "bg-red-500";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function HeartbeatPage() {
  const [name, setName] = useState("");
  const [interval, setIntervalValue] = useState(60);
  const [grace, setGrace] = useState(5);
  const [monitors, setMonitors] = useState<HeartbeatMonitor[]>([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [error, setError] = useState("");

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(data, `Request failed with ${res.status}`));
    return data as T;
  }

  async function loadMonitors() {
    try {
      setMonitors(await request<HeartbeatMonitor[]>("/heartbeats"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load heartbeat monitors.");
    }
  }

  async function createMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedUrl("");
    try {
      const result = await request<{ id: string; ping_url: string }>("/heartbeats", {
        method: "POST",
        body: JSON.stringify({ name, expected_interval_minutes: interval, grace_period_minutes: grace }),
      });
      setCreatedUrl(result.ping_url);
      setName("");
      await loadMonitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create monitor.");
    }
  }

  async function deleteMonitor(id: string) {
    await request(`/heartbeats/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadMonitors();
  }

  useEffect(() => {
    loadMonitors();
    const timer = window.setInterval(loadMonitors, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Heartbeat Monitoring</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Monitor cron jobs and scheduled tasks with simple ping URLs.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <form onSubmit={createMonitor} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Create monitor</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div>
                <Label>Expected interval</Label>
                <Select value={interval} onChange={(event) => setIntervalValue(Number(event.target.value))} className="w-full">
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={360}>6 hours</option>
                  <option value={1440}>1 day</option>
                </Select>
              </div>
              <div>
                <Label>Grace period minutes</Label>
                <Input type="number" min={0} value={grace} onChange={(event) => setGrace(Number(event.target.value))} />
              </div>
              <Button variant="primary" className="w-full">Create heartbeat</Button>
            </div>
          </form>

          {createdUrl && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
              <p className="font-medium">Ping URL</p>
              <code className="mt-2 block break-all rounded-xl bg-white p-2 text-xs dark:bg-zinc-950">{createdUrl}</code>
              <div className="mt-3">
                <CopyButton value={createdUrl} />
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-4">
          {monitors.map((monitor) => (
            <article key={monitor.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{monitor.name}</h2>
                    <span className={`rounded-xl px-2 py-1 text-xs font-medium ${statusClass(monitor.status)}`}>{monitor.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">Last ping: {formatDate(monitor.last_ping_at)} - Next expected: {formatDate(monitor.next_expected_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={monitor.ping_url} label="Copy URL" />
                  <Button variant="danger" onClick={() => deleteMonitor(monitor.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Cron example</div>
                <code className="break-all text-xs">curl -s {monitor.ping_url} &gt; /dev/null</code>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {monitor.history.map((ping) => (
                  <span key={ping.id} title={`${ping.status} - ${formatDate(ping.pinged_at)}`} className={`h-3 w-3 rounded-full ${dotClass(ping.status)}`} />
                ))}
                {monitor.history.length === 0 && <span className="text-sm text-zinc-500">No pings yet.</span>}
              </div>
            </article>
          ))}
          {monitors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
              No heartbeat monitors yet.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
