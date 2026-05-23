"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LockKeyhole, Search } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, Checkbox, CopyButton, ErrorCard, Input, Label, Select } from "@/components/ui";

type WorkspacePaste = {
  id: string;
  title: string;
  language: string;
  tags: string[];
  created_at: string | null;
  preview: string;
};

const STORAGE_KEY = "devtools-workspace-credentials";

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function WorkspacePage() {
  const [newPassword, setNewPassword] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [password, setPassword] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const [verified, setVerified] = useState(false);
  const [pasteCount, setPasteCount] = useState(0);
  const [pastes, setPastes] = useState<WorkspacePaste[]>([]);
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");

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

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedId("");
    try {
      const result = await request<{ id: string }>("/workspace", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      setCreatedId(result.id);
      setWorkspaceId(result.id);
      setPassword(newPassword);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace.");
    }
  }

  async function verifyWorkspace(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    try {
      const result = await request<{ valid: boolean; paste_count: number }>(`/workspace/${encodeURIComponent(workspaceId)}/verify`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setVerified(result.valid);
      setPasteCount(result.paste_count);
      if (!result.valid) throw new Error("Workspace password is incorrect.");
      if (saveCredentials) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: workspaceId, password }));
      await loadPastes();
    } catch (err) {
      setVerified(false);
      setError(err instanceof Error ? err.message : "Could not verify workspace.");
    }
  }

  async function loadPastes() {
    if (!workspaceId || !password) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (language) params.set("language", language);
    const result = await request<{ items: WorkspacePaste[]; total: number }>(`/workspace/${encodeURIComponent(workspaceId)}/pastes?${params}`, {
      headers: { "X-Workspace-Password": password },
    });
    setPastes(result.items);
    setPasteCount(result.total);
  }

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      loadPastes().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load pastes."));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, language, verified]);

  const languages = useMemo(() => Array.from(new Set(pastes.map((paste) => paste.language))).sort(), [pastes]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Private Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Keep related pastes private behind a workspace ID and password.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <form onSubmit={createWorkspace} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Create workspace</h2>
            </div>
            <Label>Password</Label>
            <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} />
            <Button variant="primary" className="mt-4 w-full">Create workspace</Button>
          </form>

          {createdId && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
              <p className="font-medium">Workspace created</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white p-2 dark:bg-zinc-950">
                <code className="min-w-0 flex-1 break-all text-xs">{createdId}</code>
                <CopyButton value={createdId} />
              </div>
            </div>
          )}

          <form onSubmit={verifyWorkspace} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">Access workspace</h2>
            <div className="space-y-3">
              <div>
                <Label>Workspace ID</Label>
                <Input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Checkbox checked={saveCredentials} onChange={setSaveCredentials} label="Save in this browser" />
              <p className="text-xs text-zinc-500">Saved credentials are stored in localStorage on this device.</p>
              <Button variant="primary" className="w-full">Open workspace</Button>
            </div>
          </form>
        </aside>

        <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {verified ? (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Workspace pastes</h2>
                  <p className="text-sm text-zinc-500">{pasteCount} paste{pasteCount === 1 ? "" : "s"}</p>
                </div>
                <Link href="/paste" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Create paste
                </Link>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input value={q} onChange={(event) => setQ(event.target.value)} className="pl-9" />
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
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pastes.map((paste) => (
                  <li key={paste.id} className="py-3">
                    <Link href={`/paste/${paste.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-zinc-100">
                      {paste.title || "Untitled paste"}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>{paste.language}</span>
                      {paste.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                    {paste.preview && <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{paste.preview}</p>}
                  </li>
                ))}
              </ul>
              {pastes.length === 0 && <p className="text-sm text-zinc-500">No pastes match this workspace filter.</p>}
            </>
          ) : (
            <div className="flex min-h-80 items-center justify-center text-center text-sm text-zinc-500">
              Create or open a workspace to see private pastes.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
