"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Play, RefreshCw, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CodeBlock, CopyButton, ErrorCard, Input, Label, Textarea } from "@/components/ui";

type WebhookRequest = {
  id: string;
  received_at: string | null;
  method: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  body: string;
  body_size_bytes: number;
  content_type: string;
  source_ip: string;
};

type WebhookInbox = {
  id: string;
  url: string;
  created_at: string | null;
  expires_at: string | null;
  request_count: number;
  max_requests: number;
  requests: WebhookRequest[];
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function formatBody(body: string, contentType: string) {
  if (!body) return "";
  if (contentType.includes("json") || body.trim().startsWith("{") || body.trim().startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  if (contentType.includes("xml") || body.trim().startsWith("<")) {
    return body.replace(/>\s*</g, ">\n<");
  }
  return body;
}

function countdown(expiresAt: string | null, now: number) {
  if (!expiresAt) return "No expiry";
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return `${hours}h ${minutes}m ${remaining}s`;
}

export default function WebhookInboxPage() {
  const [inbox, setInbox] = useState<WebhookInbox | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [replayTarget, setReplayTarget] = useState("");
  const [replayResult, setReplayResult] = useState("");
  const [replayOpen, setReplayOpen] = useState(false);

  const selected = useMemo(() => inbox?.requests.find((request) => request.id === selectedId) ?? inbox?.requests[0] ?? null, [inbox, selectedId]);

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

  async function createInbox() {
    setLoading(true);
    setError("");
    try {
      const result = await request<WebhookInbox>("/webhooks/inbox", { method: "POST" });
      setInbox({ ...result, requests: result.requests ?? [] });
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshInbox() {
    if (!inbox) return;
    try {
      const result = await request<WebhookInbox>(`/webhooks/inbox/${encodeURIComponent(inbox.id)}`);
      setInbox({ ...result, requests: result.requests ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh inbox.");
    }
  }

  async function clearRequests() {
    if (!inbox) return;
    await request(`/webhooks/inbox/${encodeURIComponent(inbox.id)}/requests`, { method: "DELETE" });
    await refreshInbox();
  }

  async function deleteRequest(requestId: string) {
    if (!inbox) return;
    await request(`/webhooks/inbox/${encodeURIComponent(inbox.id)}/requests/${encodeURIComponent(requestId)}`, { method: "DELETE" });
    setSelectedId("");
    await refreshInbox();
  }

  async function replayRequest() {
    if (!inbox || !selected) return;
    setReplayResult("");
    try {
      const result = await request<{ status_code: number; response_body: string; response_time_ms: number }>(
        `/webhooks/inbox/${encodeURIComponent(inbox.id)}/requests/${encodeURIComponent(selected.id)}/replay`,
        { method: "POST", body: JSON.stringify({ target_url: replayTarget }) },
      );
      setReplayResult(`HTTP ${result.status_code} in ${result.response_time_ms}ms\n\n${result.response_body}`);
    } catch (err) {
      setReplayResult(err instanceof Error ? err.message : "Replay failed.");
    }
  }

  useEffect(() => {
    if (!inbox) return;
    const timer = window.setInterval(refreshInbox, 3000);
    return () => window.clearInterval(timer);
  }, [inbox?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Webhook Inbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Capture and inspect incoming webhooks, then replay stored payloads to a public target.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      {!inbox ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Button variant="primary" onClick={createInbox} disabled={loading}>
            {loading ? "Creating..." : "Create inbox"}
          </Button>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Label>Webhook URL</Label>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                  {inbox.url}
                </div>
                <p className="mt-2 text-xs text-zinc-500">Expires in {countdown(inbox.expires_at, now)} - {inbox.request_count}/{inbox.max_requests} requests</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={inbox.url} label="Copy URL" />
                <Button onClick={refreshInbox}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button variant="danger" onClick={clearRequests}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 p-4 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Requests</div>
              <ul className="max-h-[620px] divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800">
                {inbox.requests.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`block w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${selected?.id === item.id ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-md bg-zinc-900 px-2 py-1 font-mono text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">{item.method}</span>
                        <span className="text-xs text-zinc-500">{item.received_at ? new Date(item.received_at).toLocaleString() : ""}</span>
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.source_ip || "unknown"} - {item.content_type || "no content type"} - {formatBytes(item.body_size_bytes)}</div>
                    </button>
                  </li>
                ))}
                {inbox.requests.length === 0 && <li className="p-6 text-sm text-zinc-500">Waiting for requests.</li>}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {selected ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selected.method} request</h2>
                      <p className="text-xs text-zinc-500">{selected.received_at ? new Date(selected.received_at).toLocaleString() : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setReplayOpen(true)}>
                        <Play className="h-3.5 w-3.5" />
                        Replay
                      </Button>
                      <Button variant="danger" onClick={() => deleteRequest(selected.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <KeyValue title="Headers" values={selected.headers} />
                  <KeyValue title="Query Params" values={selected.query_params} />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Body</Label>
                      <Button onClick={() => navigator.clipboard.writeText(selected.body)}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                    <CodeBlock value={formatBody(selected.body, selected.content_type)} />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-96 items-center justify-center text-sm text-zinc-500">Select a request to inspect it.</div>
              )}
            </section>
          </div>
        </div>
      )}

      {replayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Replay request</h2>
            <Label>Target URL</Label>
            <Input value={replayTarget} onChange={(event) => setReplayTarget(event.target.value)} placeholder="https://example.com/webhook" />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setReplayOpen(false)}>Close</Button>
              <Button variant="primary" onClick={replayRequest} disabled={!replayTarget}>Replay</Button>
            </div>
            {replayResult && <div className="mt-4"><Textarea value={replayResult} readOnly rows={10} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyValue({ title, values }: { title: string; values: Record<string, string> }) {
  const entries = Object.entries(values);
  return (
    <div>
      <Label>{title}</Label>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        {entries.length === 0 ? (
          <div className="p-3 text-sm text-zinc-500">None</div>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="grid gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 dark:border-zinc-800 sm:grid-cols-[220px_1fr]">
              <span className="font-mono text-xs text-zinc-500">{key}</span>
              <span className="min-w-0 break-all text-zinc-800 dark:text-zinc-200">{value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
