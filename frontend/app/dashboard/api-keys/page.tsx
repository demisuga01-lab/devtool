"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CodeBlock, CopyButton, ErrorCard, Input, Label } from "@/components/ui";

type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  rate_limit_per_hour: number;
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function ApiKeysPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(100);
  const [rawKey, setRawKey] = useState("");
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

  async function loadKeys() {
    if (!adminPassword) return;
    try {
      setKeys(await request<ApiKey[]>("/keys"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load API keys.");
    }
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRawKey("");
    try {
      const result = await request<ApiKey & { key: string }>("/keys", {
        method: "POST",
        body: JSON.stringify({ name, rate_limit_per_hour: limit }),
      });
      setRawKey(result.key);
      setName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key.");
    }
  }

  async function revokeKey(id: string) {
    await request(`/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadKeys();
  }

  useEffect(() => {
    const saved = localStorage.getItem("devtools-admin-password");
    if (saved) setAdminPassword(saved);
  }, []);

  useEffect(() => {
    if (!adminPassword) return;
    localStorage.setItem("devtools-admin-password", adminPassword);
    loadKeys();
  }, [adminPassword]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">API Keys</h1>
      </header>

      {error && <ErrorCard>{error}</ErrorCard>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Label>Admin password</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="ADMIN_PASSWORD" />
          <Button type="button" onClick={loadKeys}>Load keys</Button>
        </div>
      </section>

      <form onSubmit={createKey} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Create API key</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <Label>Hourly limit</Label>
            <Input type="number" min={1} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
          </div>
          <Button variant="primary" disabled={!adminPassword}>Create</Button>
        </div>
      </form>

      {rawKey && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
          <p className="font-medium">Raw API key shown once</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white p-2 dark:bg-zinc-950">
            <code className="min-w-0 flex-1 break-all text-xs">{rawKey}</code>
            <CopyButton value={rawKey} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Keys</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {keys.map((key) => (
                <tr key={key.id} className={!key.is_active ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-mono text-xs">{key.key_prefix}</td>
                  <td className="px-4 py-3">{key.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{key.created_at ? new Date(key.created_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3 text-zinc-500">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-3">{key.rate_limit_per_hour}/hr</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" onClick={() => revokeKey(key.id)} disabled={!key.is_active}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">API usage</h2>
        <CodeBlock value={`curl -X POST https://devtools.wellfriend.online/api/paste \\\n  -H "Authorization: Bearer YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"content":"hello","language":"python"}'`} />
      </section>
    </div>
  );
}
