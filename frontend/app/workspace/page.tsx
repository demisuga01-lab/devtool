"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { deletePaste } from "@/lib/paste-api";
import { Button, Checkbox, CopyButton, ErrorCard, Input, Label, Select } from "@/components/ui";

type WorkspacePaste = {
  id: string;
  title: string;
  language: string;
  tags: string[];
  created_at: string | null;
  expires_at?: string | null;
  view_count?: number;
  is_private?: boolean;
  preview: string;
};

type WorkspaceSession = {
  id: string;
  createdAt: string | null;
  lastAccessed: string | null;
};

const STORAGE_KEY = "devtools-workspace-credentials";

const languageBadgeColors: Record<string, string> = {
  javascript: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  typescript: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  python: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  json: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  html: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  css: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  sql: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  bash: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  markdown: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function timeAgo(value: string | null) {
  if (!value) return "Unknown";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "Unknown";
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { score, label: "Weak", bar: "w-1/5 bg-red-500", text: "text-red-500" };
  if (score <= 3) return { score, label: "Good", bar: "w-3/5 bg-amber-500", text: "text-amber-500" };
  return { score, label: "Strong", bar: "w-full bg-emerald-500", text: "text-emerald-600" };
}

export default function WorkspacePage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [password, setPassword] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [verified, setVerified] = useState(false);
  const [pasteCount, setPasteCount] = useState(0);
  const [pastes, setPastes] = useState<WorkspacePaste[]>([]);
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [loadingPastes, setLoadingPastes] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const strength = passwordStrength(newPassword);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { id?: string; password?: string };
      setWorkspaceId(parsed.id ?? "");
      setPassword(parsed.password ?? "");
      setSaveCredentials(true);
    } catch {
      // ignore invalid saved data
    }
  }, []);

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

  async function loadPastes(nextId = workspaceId, nextPassword = password) {
    if (!nextId || !nextPassword) return;
    setLoadingPastes(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (language) params.set("language", language);
      const query = params.toString();
      const result = await request<{ items: WorkspacePaste[]; total: number }>(
        `/workspace/${encodeURIComponent(nextId)}/pastes${query ? `?${query}` : ""}`,
        { headers: { "X-Workspace-Password": nextPassword } },
      );
      const accessedAt = new Date().toISOString();
      setPastes(result.items);
      setPasteCount(result.total);
      setSession((current) => current ? { ...current, lastAccessed: accessedAt } : { id: nextId, createdAt: null, lastAccessed: accessedAt });
    } finally {
      setLoadingPastes(false);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedId("");

    if (newPassword.length < 6) {
      setError("Workspace password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setCreating(true);
    try {
      const result = await request<{ id: string }>("/workspace", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      const now = new Date().toISOString();
      setCreatedId(result.id);
      setWorkspaceId(result.id);
      setPassword(newPassword);
      setSession({ id: result.id, createdAt: now, lastAccessed: now });
      setVerified(true);
      setPasteCount(0);
      setPastes([]);
      await loadPastes(result.id, newPassword);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace.");
    } finally {
      setCreating(false);
    }
  }

  async function verifyWorkspace(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setOpening(true);
    try {
      const cleanId = workspaceId.trim();
      const result = await request<{ valid: boolean; paste_count: number }>(`/workspace/${encodeURIComponent(cleanId)}/verify`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      if (!result.valid) throw new Error("Workspace password is incorrect.");
      const accessedAt = new Date().toISOString();
      setVerified(true);
      setPasteCount(result.paste_count);
      setSession({ id: cleanId, createdAt: null, lastAccessed: accessedAt });
      if (saveCredentials) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: cleanId, password }));
      else localStorage.removeItem(STORAGE_KEY);
      await loadPastes(cleanId, password);
    } catch (err) {
      setVerified(false);
      setSession(null);
      setError(err instanceof Error ? err.message : "Could not verify workspace. Check the workspace ID and password.");
    } finally {
      setOpening(false);
    }
  }

  async function deleteWorkspacePaste(pasteId: string) {
    const token = window.prompt("Enter the delete token for this paste.");
    if (!token) return;
    setDeletingId(pasteId);
    setError("");
    try {
      await deletePaste(pasteId, token);
      await loadPastes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete paste.");
    } finally {
      setDeletingId("");
    }
  }

  function lockWorkspace() {
    setVerified(false);
    setSession(null);
    setPastes([]);
    setPasteCount(0);
    setPassword("");
    setLanguage("");
    setQ("");
  }

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      loadPastes().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load pastes."));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, language, verified]);

  const languages = useMemo(() => Array.from(new Set(pastes.map((paste) => paste.language))).filter(Boolean).sort(), [pastes]);
  const currentWorkspaceId = session?.id || workspaceId;

  if (verified && session) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Private workspace</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-emerald-600" />
                <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Workspace: {session.id}</h1>
                <CopyButton value={session.id} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/paste?workspace=${encodeURIComponent(session.id)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Create paste in workspace
              </Link>
              <Button type="button" onClick={lockWorkspace}>
                <UnlockKeyhole className="h-4 w-4" />
                Lock workspace
              </Button>
            </div>
          </div>
          {createdId && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Workspace created</p>
                  <p>Save this ID — you cannot recover it.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-2 dark:bg-zinc-950">
                  <code className="font-mono text-xs">{createdId}</code>
                  <CopyButton value={createdId} />
                </div>
              </div>
            </div>
          )}
        </header>

        {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <StatCard icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Paste count" value={String(pasteCount)} />
          <StatCard icon={<CalendarClock className="h-4 w-4 text-sky-600" />} label="Created" value={formatDate(session.createdAt)} />
          <StatCard icon={<Clock3 className="h-4 w-4 text-violet-600" />} label="Last accessed" value={formatDate(session.lastAccessed)} />
        </section>

        <main className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Workspace pastes</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Private paste list</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px]">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input value={q} onChange={(event) => setQ(event.target.value)} className="pl-9" placeholder="Search paste content" />
                </div>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full">
                  <option value="">All</option>
                  {languages.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </div>
            </div>
          </div>

          {loadingPastes ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" />
              ))}
            </div>
          ) : pastes.length > 0 ? (
            <ul className="space-y-3">
              {pastes.map((paste) => (
                <li key={paste.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${languageBadgeColors[paste.language] ?? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300"}`}>
                          {paste.language || "plaintext"}
                        </span>
                        <h3 className="truncate font-medium text-zinc-950 dark:text-zinc-50">{paste.title || "Untitled paste"}</h3>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">Created {timeAgo(paste.created_at)} · {paste.view_count ?? 0} views</p>
                      {paste.preview ? (
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{paste.preview}</p>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-400">Preview hidden for protected paste.</p>
                      )}
                      {paste.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {paste.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/paste/${paste.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800">
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Button type="button" variant="danger" onClick={() => void deleteWorkspacePaste(paste.id)} disabled={deletingId === paste.id}>
                        {deletingId === paste.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <LockKeyhole className="h-10 w-10 text-zinc-400" />
              <h3 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No pastes yet</h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">Create a paste and add it to this workspace.</p>
              <Link href={`/paste?workspace=${encodeURIComponent(session.id)}`} className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Create paste in workspace
              </Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">Private Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Create a private space for related pastes, protected by a workspace ID and password.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={createWorkspace} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Create new workspace</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Start with a password</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Password</Label>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} />
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className={`h-full rounded-full transition-all ${strength.bar}`} />
              </div>
              <p className={`mt-1 text-xs font-medium ${strength.text}`}>Password strength: {newPassword ? strength.label : "Not started"}</p>
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className={confirmPassword && confirmPassword !== newPassword ? "border-red-500 focus:border-red-500" : ""}
              />
              {confirmPassword && confirmPassword !== newPassword && <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>}
            </div>
            <Button variant="primary" disabled={creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </div>
        </form>

        <form onSubmit={verifyWorkspace} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600">
              <UnlockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Access existing workspace</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Open with ID and password</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Workspace ID</Label>
              <div className="flex gap-2">
                <Input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required maxLength={12} />
                <CopyButton value={currentWorkspaceId} />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <Checkbox checked={saveCredentials} onChange={setSaveCredentials} label="Save in browser" />
              <p className="mt-2 text-xs text-zinc-500">
                Stores this workspace ID and password in localStorage on this device only.
              </p>
            </div>
            <Button variant="primary" disabled={opening} className="w-full">
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {opening ? "Opening..." : "Open workspace"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">{value}</p>
    </div>
  );
}
