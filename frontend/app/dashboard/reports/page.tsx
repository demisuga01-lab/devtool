"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";

type Report = {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  reporter_ip: string;
  created_at: string | null;
  status: string;
  admin_notes: string | null;
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function ReportsPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "X-Admin-Password": adminPassword,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(data, `Request failed with ${res.status}`));
    return data as T;
  }

  async function loadReports() {
    if (!adminPassword) return;
    try {
      const result = await request<{ items: Report[] }>(`/reports?status=${encodeURIComponent(status)}`);
      setReports(result.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports.");
    }
  }

  async function updateReport(report: Report, nextStatus: string) {
    try {
      await request(`/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, admin_notes: notes[report.id] || null }),
      });
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update report.");
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("devtools-admin-password");
    if (saved) setAdminPassword(saved);
  }, []);

  useEffect(() => {
    if (!adminPassword) return;
    localStorage.setItem("devtools-admin-password", adminPassword);
    loadReports();
  }, [adminPassword, status]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Abuse Reports</h1>
      </header>

      {error && <ErrorCard>{error}</ErrorCard>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <div>
            <Label>Admin password</Label>
            <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="ADMIN_PASSWORD" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full">
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="actioned">Actioned</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </Select>
          </div>
          <Button type="button" onClick={loadReports}>Refresh</Button>
        </div>
      </section>

      <section className="space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-red-50 px-2 py-1 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-300">{report.reason}</span>
                  <span className="rounded-xl bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{report.content_type}</span>
                  <span className="rounded-xl bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{report.content_id}</span>
                </div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Report from {report.reporter_ip}</h2>
                <p className="mt-1 text-xs text-zinc-500">{report.created_at ? new Date(report.created_at).toLocaleString() : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateReport(report, "dismissed")}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Dismiss
                </Button>
                <Button onClick={() => updateReport(report, "reviewed")}>
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Reviewed
                </Button>
                <Button variant="danger" onClick={() => updateReport(report, "actioned")}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete content
                </Button>
              </div>
            </div>
            {report.details && <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{report.details}</p>}
            <div className="mt-4">
              <Label>Admin notes</Label>
              <Textarea value={notes[report.id] ?? report.admin_notes ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} rows={3} />
            </div>
          </article>
        ))}
        {reports.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            No reports in this queue.
          </div>
        )}
      </section>
    </div>
  );
}
