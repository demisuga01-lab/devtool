"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, FolderOpen, Send, Terminal, Workflow, Zap } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { loadRequestHistory, REQUEST_HISTORY_KEY, type RequestHistoryEntry } from "@/lib/request-history";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "rest" | "graphql" | "curl" | "collections" | "history" | "webhooks";
type RequestTab = "params" | "headers" | "body" | "auth";
type ResponseTab = "body" | "headers" | "info";
type Row = { id: string; key: string; value: string; enabled: boolean };
type ProxyResponse = {
  status_code?: number;
  status_text?: string;
  headers?: { key: string; value: string }[];
  body?: string;
  body_size_bytes?: number;
  response_time_ms?: number;
  data?: unknown;
  errors?: unknown[];
  extensions?: unknown;
};
type RestState = {
  method: string;
  url: string;
  params: Row[];
  headers: Row[];
  body: string;
  authType: "none" | "bearer" | "basic";
  bearer: string;
  username: string;
  password: string;
};
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
  expires_at: string | null;
  request_count: number;
  max_requests: number;
  requests: WebhookRequest[];
};

const tabs: WorkspaceTab<Tab>[] = [
  { id: "rest", label: "REST", icon: Send },
  { id: "graphql", label: "GraphQL", icon: Workflow },
  { id: "curl", label: "cURL Builder", icon: Terminal },
  { id: "collections", label: "Collections", icon: FolderOpen },
  { id: "history", label: "History", icon: Clock },
  { id: "webhooks", label: "Webhooks", icon: Zap },
];

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export default function ApiWorkspacePage() {
  const [active, setActive] = useState<Tab>("rest");
  const [restState, setRestState] = useState<RestState>(() => ({
    method: "GET",
    url: "https://api.github.com",
    params: [newRow()],
    headers: [newRow("Accept", "application/json")],
    body: "{\n  \n}",
    authType: "none",
    bearer: "",
    username: "",
    password: "",
  }));

  function replay(entry: RequestHistoryEntry) {
    setRestState((state) => ({ ...state, method: "GET", url: entry.input }));
    setActive("rest");
  }

  return (
    <WorkspaceShell
      title="API Client"
      subtitle="Make HTTP requests, test GraphQL, build cURL, and manage webhooks"
      href="/tools/api"
      icon={Send}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="api"
      intentGroup="network"
    >
      {active === "rest" && <RestTab state={restState} setState={setRestState} />}
      {active === "graphql" && <GraphqlTab />}
      {active === "curl" && <CurlTab />}
      {active === "collections" && <CollectionsTab />}
      {active === "history" && <HistoryTab onReplay={replay} />}
      {active === "webhooks" && <WebhooksTab />}
    </WorkspaceShell>
  );
}

function RestTab({ state, setState }: { state: RestState; setState: (next: RestState | ((state: RestState) => RestState)) => void }) {
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const finalUrl = useMemo(() => buildUrl(state.url, state.params), [state.params, state.url]);

  function update(patch: Partial<RestState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  async function send() {
    if (!state.url.trim()) {
      setError("Enter a request URL.");
      return;
    }
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const headers = enabledRows(state.headers);
      if (state.authType === "bearer" && state.bearer) headers.push({ key: "Authorization", value: `Bearer ${state.bearer}`, enabled: true, id: "auth" });
      if (state.authType === "basic") headers.push({ key: "Authorization", value: `Basic ${btoa(`${state.username}:${state.password}`)}`, enabled: true, id: "auth" });
      const res = await fetch(`${API_BASE}/tools/http-proxy`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ method: state.method, url: finalUrl, headers: headers.map(({ key, value }) => ({ key, value })), body: ["GET", "HEAD"].includes(state.method) ? null : state.body, body_type: "json", follow_redirects: true, timeout_seconds: 15 }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `Request failed with ${res.status}`));
      setResponse(data as ProxyResponse);
      setResponseTab("body");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <WorkspaceCard className="hidden xl:block">
        <h3 className="font-semibold text-foreground">History</h3>
        <p className="mt-2 text-sm text-muted-foreground">Recent REST calls from this tab appear in browser storage via the response tools.</p>
      </WorkspaceCard>
      <div className="space-y-5">
        <WorkspaceCard className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-[140px_minmax(0,1fr)_120px]">
            <select value={state.method} onChange={(event) => update({ method: event.target.value })} className={inputClass}>{methods.map((method) => <option key={method}>{method}</option>)}</select>
            <input value={state.url} onChange={(event) => update({ url: event.target.value })} className={inputClass} placeholder="https://api.example.com/users" />
            <PrimaryButton onClick={() => void send()} disabled={loading}>{loading ? "Sending..." : "Send"}</PrimaryButton>
          </div>
          {finalUrl && <code className="block break-all rounded-lg bg-zinc-50 p-2 text-xs text-muted-foreground dark:bg-zinc-800">{finalUrl}</code>}
        </WorkspaceCard>
        {error && <ErrorBanner message={error} retry={send} />}
        <div className="grid gap-5 xl:grid-cols-2">
          <WorkspaceCard>
            <TabButtons active={requestTab} setActive={setRequestTab} tabs={["params", "headers", "body", "auth"]} />
            {requestTab === "params" && <RowsEditor rows={state.params} setRows={(params) => update({ params })} />}
            {requestTab === "headers" && <RowsEditor rows={state.headers} setRows={(headers) => update({ headers })} />}
            {requestTab === "body" && <textarea value={state.body} onChange={(event) => update({ body: event.target.value })} className={`${textareaClass} mt-3 min-h-[280px]`} />}
            {requestTab === "auth" && <AuthEditor state={state} update={update} />}
          </WorkspaceCard>
          <WorkspaceCard>
            <div className="mb-3 flex items-center justify-between gap-2">
              <TabButtons active={responseTab} setActive={setResponseTab} tabs={["body", "headers", "info"]} />
              {response && <StatusPill status={response.status_code} />}
            </div>
            {responseTab === "body" && <pre className="min-h-[360px] whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{formatBody(response?.body ?? "")}</pre>}
            {responseTab === "headers" && <KeyValueDisplay values={Object.fromEntries((response?.headers ?? []).map((item) => [item.key, item.value]))} />}
            {responseTab === "info" && <pre className="min-h-[360px] whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{JSON.stringify({ status: response?.status_code, timeMs: response?.response_time_ms, size: response?.body_size_bytes }, null, 2)}</pre>}
          </WorkspaceCard>
        </div>
      </div>
    </div>
  );
}

function GraphqlTab() {
  const [endpoint, setEndpoint] = useState("https://api.github.com/graphql");
  const [query, setQuery] = useState("query Example {\n  __typename\n}");
  const [variables, setVariables] = useState("{\n  \n}");
  const [headers, setHeaders] = useState<Row[]>([newRow("Content-Type", "application/json"), newRow("Accept", "application/json")]);
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSchema() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/tools/graphql-introspect`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, headers: enabledRows(headers) }) });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `Schema fetch failed with ${res.status}`));
      setSchema(data as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schema fetch failed.");
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    setLoading(true);
    setError("");
    try {
      const parsedVariables = variables.trim() ? JSON.parse(variables) as Record<string, unknown> : {};
      const res = await fetch(`${API_BASE}/tools/graphql-proxy`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, query, variables: parsedVariables, headers: enabledRows(headers) }) });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `GraphQL request failed with ${res.status}`));
      setResponse(data as ProxyResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GraphQL request failed.");
    } finally {
      setLoading(false);
    }
  }

  const schemaTypes = flattenSchemaTypes(schema);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className={inputClass} />
        <SecondaryButton onClick={() => void fetchSchema()} disabled={loading}>Fetch Schema</SecondaryButton>
        <PrimaryButton onClick={() => void run()} disabled={loading}>Run</PrimaryButton>
      </div>
      {error && <ErrorBanner message={error} retry={run} />}
      <div className="grid gap-4 xl:grid-cols-[280px_1fr_1fr]">
        <WorkspaceCard><h3 className="font-semibold text-foreground">Schema explorer</h3><div className="mt-3 max-h-[620px] overflow-auto text-sm">{schemaTypes.length ? schemaTypes.map((type) => <p key={type} className="border-b border-border py-1 font-mono text-xs">{type}</p>) : <p className="text-muted-foreground">Fetch schema to explore types.</p>}</div></WorkspaceCard>
        <WorkspaceCard className="space-y-3"><FieldLabel>Query</FieldLabel><textarea value={query} onChange={(event) => setQuery(event.target.value)} className={`${textareaClass} min-h-[360px]`} /><FieldLabel>Variables</FieldLabel><textarea value={variables} onChange={(event) => setVariables(event.target.value)} className={`${textareaClass} min-h-[160px]`} /><RowsEditor rows={headers} setRows={setHeaders} /></WorkspaceCard>
        <WorkspaceCard><FieldLabel>Response</FieldLabel><pre className="min-h-[560px] whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{response ? formatGraphqlResponse(response) : "Response will appear here."}</pre></WorkspaceCard>
      </div>
    </div>
  );
}

function CurlTab() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.example.com/users");
  const [headers, setHeaders] = useState<Row[]>([newRow("Accept", "application/json")]);
  const [body, setBody] = useState("{\n  \"name\": \"Ada\"\n}");
  const [auth, setAuth] = useState("");
  const [curlInput, setCurlInput] = useState("curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\":\"Ada\"}'");
  const command = useMemo(() => buildCurl(method, url, headers, body, auth), [auth, body, headers, method, url]);
  const parsed = useMemo(() => parseCurl(curlInput), [curlInput]);

  function importCurl() {
    setMethod(parsed.method);
    setUrl(parsed.url);
    setHeaders(Object.entries(parsed.headers).map(([key, value]) => newRow(key, value)));
    setBody(parsed.body);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-4">
        <WorkspaceCard className="grid gap-3 md:grid-cols-[140px_1fr]"><div><FieldLabel>Method</FieldLabel><select value={method} onChange={(event) => setMethod(event.target.value)} className={inputClass}>{methods.map((item) => <option key={item}>{item}</option>)}</select></div><div><FieldLabel>URL</FieldLabel><input value={url} onChange={(event) => setUrl(event.target.value)} className={inputClass} /></div></WorkspaceCard>
        <WorkspaceCard><FieldLabel>Headers</FieldLabel><RowsEditor rows={headers} setRows={setHeaders} /></WorkspaceCard>
        <WorkspaceCard><FieldLabel>Body</FieldLabel><textarea value={body} onChange={(event) => setBody(event.target.value)} className={`${textareaClass} min-h-[180px]`} /><FieldLabel>Authorization header</FieldLabel><input value={auth} onChange={(event) => setAuth(event.target.value)} className={inputClass} placeholder="Bearer token or Basic ..." /></WorkspaceCard>
        <WorkspaceCard><FieldLabel>Import cURL</FieldLabel><textarea value={curlInput} onChange={(event) => setCurlInput(event.target.value)} className={`${textareaClass} min-h-[120px]`} /><SecondaryButton onClick={importCurl} className="mt-3">Import into form</SecondaryButton></WorkspaceCard>
      </div>
      <div className="space-y-4">
        <CommandBox label="cURL" value={command} />
        <CommandBox label="wget equivalent" value={`wget --method=${method} ${enabledRows(headers).map((row) => `--header=${quote(`${row.key}: ${row.value}`)}`).join(" ")} ${quote(url)}`} />
        <CommandBox label="HTTPie equivalent" value={`http ${method} ${quote(url)} ${enabledRows(headers).map((row) => `${row.key}:${row.value}`).join(" ")}`} />
      </div>
    </div>
  );
}

function CollectionsTab() {
  const recent = safeJson<{ id?: string; name?: string; updatedAt?: string }[]>("devtools:api-collections:recent", []);
  return (
    <WorkspaceCard className="flex min-h-80 flex-col items-center justify-center text-center">
      <FolderOpen className="h-10 w-10 text-emerald-600" />
      <h2 className="mt-4 text-xl font-semibold text-foreground">API Collections are managed at their own page</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Saved request collections, environments, and collection runs remain available on the collections page.</p>
      <Link href="/tools/api-collections" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Open API Collections</Link>
      <div className="mt-6 w-full max-w-xl text-left">{recent.length ? recent.map((item, index) => <p key={item.id ?? index} className="border-b border-border py-2 text-sm">{item.name ?? item.id ?? "Collection"} <span className="text-muted-foreground">{item.updatedAt ?? ""}</span></p>) : <p className="text-center text-sm text-muted-foreground">No recent collections found in this browser.</p>}</div>
    </WorkspaceCard>
  );
}

function HistoryTab({ onReplay }: { onReplay: (entry: RequestHistoryEntry) => void }) {
  const [items, setItems] = useState<RequestHistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("All");
  useEffect(() => setItems(loadRequestHistory()), []);
  const tools = ["All", ...Array.from(new Set(items.map((item) => item.tool))).sort()];
  const visible = items.filter((item) => (tool === "All" || item.tool === tool) && `${item.input} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search by URL or summary" /><select value={tool} onChange={(event) => setTool(event.target.value)} className={inputClass}>{tools.map((item) => <option key={item}>{item}</option>)}</select><SecondaryButton onClick={() => { localStorage.removeItem(REQUEST_HISTORY_KEY); setItems([]); }}>Clear history</SecondaryButton></div>
      <WorkspaceCard className="p-0">{visible.length ? visible.map((item) => <button key={`${item.timestamp}-${item.input}`} type="button" onClick={() => onReplay(item)} className="block w-full border-b border-border px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"><div className="flex flex-wrap gap-2"><span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{item.tool}</span><code className="break-all text-xs">{item.input}</code><span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.summary}</p></button>) : <p className="p-8 text-center text-sm text-muted-foreground">No request history yet.</p>}</WorkspaceCard>
    </div>
  );
}

function WebhooksTab() {
  const [inbox, setInbox] = useState<WebhookInbox | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [replayTarget, setReplayTarget] = useState("");
  const selected = inbox?.requests.find((request) => request.id === selectedId) ?? inbox?.requests[0] ?? null;

  async function request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers ?? {}) } });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(data, `Request failed with ${response.status}`));
    return data as T;
  }

  async function createInbox() {
    setLoading(true);
    setError("");
    try {
      const next = await request<WebhookInbox>("/webhooks/inbox", { method: "POST" });
      setInbox({ ...next, requests: next.requests ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!inbox) return;
    try {
      const next = await request<WebhookInbox>(`/webhooks/inbox/${encodeURIComponent(inbox.id)}`);
      setInbox({ ...next, requests: next.requests ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh inbox.");
    }
  }

  async function replay() {
    if (!inbox || !selected || !replayTarget) return;
    await request(`/webhooks/inbox/${encodeURIComponent(inbox.id)}/requests/${encodeURIComponent(selected.id)}/replay`, { method: "POST", body: JSON.stringify({ target_url: replayTarget }) });
  }

  useEffect(() => {
    if (!inbox) return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [inbox?.id]);

  if (!inbox) return <WorkspaceCard className="flex min-h-72 flex-col items-center justify-center text-center"><Zap className="h-10 w-10 text-emerald-600" />{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<PrimaryButton onClick={() => void createInbox()} disabled={loading} className="mt-5">{loading ? "Creating..." : "Create inbox"}</PrimaryButton></WorkspaceCard>;

  return (
    <div className="space-y-5">
      <WorkspaceCard><FieldLabel>Webhook URL</FieldLabel><div className="flex flex-col gap-3 md:flex-row md:items-center"><code className="flex-1 break-all rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">{inbox.url}</code><CopyButton value={inbox.url} label="Copy URL" /><SecondaryButton onClick={() => void refresh()}>Refresh</SecondaryButton></div><p className="mt-2 text-xs text-muted-foreground">Expires: {inbox.expires_at ? new Date(inbox.expires_at).toLocaleString() : "No expiry"} - {inbox.request_count}/{inbox.max_requests} requests</p></WorkspaceCard>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <WorkspaceCard className="p-0"><h3 className="border-b border-border p-4 font-semibold">Requests</h3>{inbox.requests.length ? inbox.requests.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-border p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selected?.id === item.id ? "bg-emerald-500/10" : ""}`}><div className="flex justify-between gap-2"><span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-xs text-white">{item.method}</span><span className="text-xs text-muted-foreground">{item.received_at ? new Date(item.received_at).toLocaleTimeString() : ""}</span></div><p className="mt-2 text-xs text-muted-foreground">{item.source_ip} - {formatBytes(item.body_size_bytes)}</p></button>) : <p className="p-6 text-sm text-muted-foreground">Waiting for requests.</p>}</WorkspaceCard>
        <WorkspaceCard>{selected ? <div className="space-y-4"><h3 className="font-semibold text-foreground">{selected.method} request</h3><KeyValueDisplay values={selected.headers} /><KeyValueDisplay values={selected.query_params} /><pre className="min-h-56 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{formatBody(selected.body, selected.content_type)}</pre><div className="grid gap-2 md:grid-cols-[1fr_auto]"><input value={replayTarget} onChange={(event) => setReplayTarget(event.target.value)} className={inputClass} placeholder="https://example.com/webhook" /><SecondaryButton onClick={() => void replay()} disabled={!replayTarget}>Replay</SecondaryButton></div></div> : <p className="text-sm text-muted-foreground">Select a request to inspect it.</p>}</WorkspaceCard>
      </div>
    </div>
  );
}

function RowsEditor({ rows, setRows }: { rows: Row[]; setRows: (rows: Row[]) => void }) {
  function update(id: string, patch: Partial<Row>) {
    setRows(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }
  return <div className="mt-3 space-y-2">{rows.map((row) => <div key={row.id} className="grid gap-2 md:grid-cols-[auto_1fr_1fr_auto]"><input type="checkbox" checked={row.enabled} onChange={(event) => update(row.id, { enabled: event.target.checked })} className="h-4 w-4 self-center accent-emerald-600" /><input value={row.key} onChange={(event) => update(row.id, { key: event.target.value })} className={inputClass} placeholder="Key" /><input value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} className={inputClass} placeholder="Value" /><SecondaryButton onClick={() => setRows(rows.filter((item) => item.id !== row.id))}>Remove</SecondaryButton></div>)}<SecondaryButton onClick={() => setRows([...rows, newRow()])}>Add row</SecondaryButton></div>;
}

function AuthEditor({ state, update }: { state: RestState; update: (patch: Partial<RestState>) => void }) {
  return <div className="mt-3 space-y-3"><select value={state.authType} onChange={(event) => update({ authType: event.target.value as RestState["authType"] })} className={inputClass}><option value="none">No auth</option><option value="bearer">Bearer token</option><option value="basic">Basic auth</option></select>{state.authType === "bearer" && <input value={state.bearer} onChange={(event) => update({ bearer: event.target.value })} className={inputClass} placeholder="Token" />}{state.authType === "basic" && <div className="grid gap-2 md:grid-cols-2"><input value={state.username} onChange={(event) => update({ username: event.target.value })} className={inputClass} placeholder="Username" /><input type="password" value={state.password} onChange={(event) => update({ password: event.target.value })} className={inputClass} placeholder="Password" /></div>}</div>;
}

function TabButtons<T extends string>({ active, setActive, tabs }: { active: T; setActive: (tab: T) => void; tabs: readonly T[] }) {
  return <div className="flex gap-1 border-b border-border">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActive(tab)} className={`border-b-2 px-3 py-2 text-sm capitalize ${active === tab ? "border-emerald-500 font-medium text-foreground" : "border-transparent text-muted-foreground"}`}>{tab}</button>)}</div>;
}

function ErrorBanner({ message, retry }: { message: string; retry: () => void | Promise<void> }) {
  return <WorkspaceCard className="border-red-500/50"><p className="text-sm text-red-600">{message}</p><SecondaryButton onClick={() => void retry()} className="mt-3">Retry</SecondaryButton></WorkspaceCard>;
}

function StatusPill({ status }: { status?: number }) {
  const color = !status ? "bg-zinc-500/10 text-zinc-600" : status >= 400 ? "bg-red-500/10 text-red-700 dark:text-red-300" : status >= 300 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return <span className={`rounded-lg px-2 py-1 text-xs font-medium ${color}`}>{status ?? "No response"}</span>;
}

function CommandBox({ label, value }: { label: string; value: string }) {
  return <WorkspaceCard><div className="mb-2 flex items-center justify-between"><FieldLabel>{label}</FieldLabel><CopyButton value={value} /></div><pre className="whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{value}</pre></WorkspaceCard>;
}

function KeyValueDisplay({ values }: { values: Record<string, string> }) {
  const entries = Object.entries(values);
  return <div className="overflow-hidden rounded-lg border border-border">{entries.length ? entries.map(([key, value]) => <div key={key} className="grid gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0 md:grid-cols-[180px_1fr]"><span className="font-mono text-xs text-muted-foreground">{key}</span><span className="break-all">{value}</span></div>) : <p className="p-3 text-sm text-muted-foreground">None</p>}</div>;
}

function newRow(key = "", value = ""): Row {
  return { id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`, key, value, enabled: true };
}

function enabledRows(rows: Row[]) {
  return rows.filter((row) => row.enabled && row.key.trim());
}

function buildUrl(url: string, params: Row[]) {
  if (!url.trim()) return "";
  try {
    const parsed = new URL(url);
    enabledRows(params).forEach((row) => parsed.searchParams.set(row.key, row.value));
    return parsed.toString();
  } catch {
    return url;
  }
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
}

function formatBody(value: string, contentType = "") {
  if (!value) return "Response body will appear here.";
  if (contentType.includes("xml") || value.trim().startsWith("<")) return value.replace(/>\s*</g, ">\n<");
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function formatGraphqlResponse(response: ProxyResponse) {
  if (response.data || response.errors || response.extensions) return JSON.stringify({ data: response.data, errors: response.errors, extensions: response.extensions }, null, 2);
  return formatBody(response.body ?? "");
}

function flattenSchemaTypes(schema: Record<string, unknown> | null) {
  const raw = schema as { schema?: { __schema?: { types?: { name?: string }[] } }; __schema?: { types?: { name?: string }[] } } | null;
  const types = raw?.schema?.__schema?.types ?? raw?.__schema?.types ?? [];
  return types.map((type) => type.name).filter((name): name is string => typeof name === "string" && !name.startsWith("__")).sort();
}

function quote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildCurl(method: string, url: string, headers: Row[], body: string, auth: string) {
  const parts = ["curl", "-L", "-X", method, quote(url || "https://example.com")];
  const finalHeaders = enabledRows(headers).map((row) => ({ key: row.key, value: row.value }));
  if (auth) finalHeaders.push({ key: "Authorization", value: auth });
  finalHeaders.forEach((row) => parts.push("-H", quote(`${row.key}: ${row.value}`)));
  if (!["GET", "HEAD"].includes(method) && body) parts.push("--data-raw", quote(body));
  return parts.join(" ");
}

function parseCurl(input: string) {
  const tokens = input.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g)?.map((token) => token.replace(/^['"]|['"]$/g, "")) ?? [];
  const headers: Record<string, string> = {};
  let method = "GET";
  let url = "";
  let body = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "-X" || token === "--request") method = (tokens[++index] || method).toUpperCase();
    else if (token === "-H" || token === "--header") {
      const raw = tokens[++index] || "";
      const split = raw.indexOf(":");
      if (split > -1) headers[raw.slice(0, split).trim()] = raw.slice(split + 1).trim();
    } else if (token === "-d" || token.startsWith("--data")) {
      body = tokens[++index] || "";
      if (method === "GET") method = "POST";
    } else if (token !== "curl" && !token.startsWith("-") && !url) url = token;
  }
  return { method, url, headers, body };
}

function safeJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
