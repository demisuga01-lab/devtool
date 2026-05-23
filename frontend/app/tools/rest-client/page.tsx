"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";
import {
  createRow,
  enabledPairs,
  formatBytes,
  HistoryEntry,
  HistoryPanel,
  HttpProxyResponse,
  KeyValueRow,
  KeyValueTable,
  MethodBadge,
  ResponseBody,
  rowsFromPairs,
  StatusBadge,
} from "@/components/http-client-shared";

type BodyType = "none" | "json" | "form" | "text" | "xml";
type AuthType = "none" | "bearer" | "basic" | "apiKey";
type RequestTab = "params" | "headers" | "body" | "auth";
type ResponseTab = "body" | "headers" | "info";

type RestState = {
  method: string;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyType: BodyType;
  body: string;
  formRows: KeyValueRow[];
  authType: AuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: "header" | "query";
  followRedirects: boolean;
  timeoutSeconds: number;
};

const HISTORY_KEY = "devtools:rest-client-history";
const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const headerSuggestions = ["Content-Type", "Accept", "Authorization", "X-API-Key"];

const initialState: RestState = {
  method: "GET",
  url: "",
  params: [createRow()],
  headers: [createRow("Accept", "application/json")],
  bodyType: "none",
  body: "{\n  \n}",
  formRows: [createRow()],
  authType: "none",
  bearerToken: "",
  basicUsername: "",
  basicPassword: "",
  apiKeyName: "X-API-Key",
  apiKeyValue: "",
  apiKeyLocation: "header",
  followRedirects: true,
  timeoutSeconds: 15,
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function loadHistory(): HistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
  } catch {
    // ignore storage failures
  }
}

function buildUrl(url: string, params: KeyValueRow[], auth: Pick<RestState, "authType" | "apiKeyLocation" | "apiKeyName" | "apiKeyValue">) {
  if (!url.trim()) return "";
  try {
    const parsed = new URL(url);
    for (const row of enabledPairs(params)) parsed.searchParams.set(row.key, row.value);
    if (auth.authType === "apiKey" && auth.apiKeyLocation === "query" && auth.apiKeyName && auth.apiKeyValue) {
      parsed.searchParams.set(auth.apiKeyName, auth.apiKeyValue);
    }
    return parsed.toString();
  } catch {
    const query = new URLSearchParams();
    for (const row of enabledPairs(params)) query.set(row.key, row.value);
    return `${url}${query.toString() ? `${url.includes("?") ? "&" : "?"}${query}` : ""}`;
  }
}

function authHeaders(state: RestState): KeyValueRow[] {
  if (state.authType === "bearer" && state.bearerToken) return [createRow("Authorization", `Bearer ${state.bearerToken}`)];
  if (state.authType === "basic" && (state.basicUsername || state.basicPassword)) {
    return [createRow("Authorization", `Basic ${btoa(`${state.basicUsername}:${state.basicPassword}`)}`)];
  }
  if (state.authType === "apiKey" && state.apiKeyLocation === "header" && state.apiKeyName && state.apiKeyValue) {
    return [createRow(state.apiKeyName, state.apiKeyValue)];
  }
  return [];
}

export default function RestClientPage() {
  const [state, setState] = useState<RestState>(initialState);
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [response, setResponse] = useState<HttpProxyResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setHistory(loadHistory()), []);

  const finalUrl = useMemo(
    () => buildUrl(state.url, state.params, state),
    [state],
  );

  function update(patch: Partial<RestState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function formatJson() {
    window.setTimeout(() => {
      try {
        update({ body: JSON.stringify(JSON.parse(state.body || "{}"), null, 2) });
        setError("");
      } catch {
        setError("JSON body is not valid.");
      }
    }, 0);
  }

  function restore(entry: HistoryEntry) {
    const payload = entry.payload as Partial<RestState>;
    setState({ ...initialState, ...payload, params: rowsFromPairs(payload.params as KeyValueRow[]), headers: rowsFromPairs(payload.headers as KeyValueRow[]), formRows: rowsFromPairs(payload.formRows as KeyValueRow[]) });
  }

  async function sendRequest() {
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const body =
        state.bodyType === "none" ? null :
        state.bodyType === "form" ? new URLSearchParams(enabledPairs(state.formRows).map((row) => [row.key, row.value])).toString() :
        state.body;
      const headers = [...enabledPairs(state.headers), ...enabledPairs(authHeaders(state))];
      const res = await fetch(`${API_BASE}/tools/http-proxy`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          method: state.method,
          url: finalUrl,
          headers,
          body,
          body_type: state.bodyType,
          follow_redirects: state.followRedirects,
          timeout_seconds: state.timeoutSeconds,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with ${res.status}`));
      const nextResponse = data as HttpProxyResponse;
      setResponse(nextResponse);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method: state.method,
        url: finalUrl,
        status: nextResponse.status_code,
        timeMs: nextResponse.response_time_ms,
        savedAt: Date.now(),
        payload: state,
      };
      const nextHistory = [entry, ...history.filter((item) => item.url !== finalUrl || item.method !== state.method)].slice(0, 20);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setResponseTab("body");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">REST Client</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Make HTTP requests through an SSRF-safe proxy and inspect responses.</p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-2 lg:grid-cols-[130px_minmax(0,1fr)_120px]">
            <Select value={state.method} onChange={(event) => update({ method: event.target.value })} className="font-semibold">
              {methods.map((method) => <option key={method} value={method}>{method}</option>)}
            </Select>
            <Input value={state.url} onChange={(event) => update({ url: event.target.value })} placeholder="https://api.example.com/endpoint" />
            <Button variant="primary" onClick={sendRequest} disabled={loading || !state.url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>
          {finalUrl && <div className="rounded-xl bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-950">{finalUrl}</div>}
          <HistoryPanel entries={history} onRestore={restore} onClear={() => { setHistory([]); saveHistory([]); }} />

          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {(["params", "headers", "body", "auth"] as RequestTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setRequestTab(tab)} className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${requestTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-zinc-500"}`}>
                {tab}
              </button>
            ))}
          </div>

          {requestTab === "params" && <KeyValueTable rows={state.params} onChange={(params) => update({ params })} />}
          {requestTab === "headers" && <KeyValueTable rows={state.headers} onChange={(headers) => update({ headers })} suggestions={headerSuggestions} />}
          {requestTab === "body" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Select value={state.bodyType} onChange={(event) => update({ bodyType: event.target.value as BodyType })}>
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="form">Form Data</option>
                  <option value="text">Raw Text</option>
                  <option value="xml">XML</option>
                </Select>
                {state.bodyType === "json" && <Button onClick={formatJson}>Format JSON</Button>}
              </div>
              {state.bodyType === "form" ? (
                <KeyValueTable rows={state.formRows} onChange={(formRows) => update({ formRows })} />
              ) : state.bodyType !== "none" ? (
                <Textarea value={state.body} onChange={(event) => update({ body: event.target.value })} rows={14} className="min-h-[320px]" />
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No request body for this request.</div>
              )}
            </div>
          )}
          {requestTab === "auth" && (
            <div className="space-y-4">
              <Select value={state.authType} onChange={(event) => update({ authType: event.target.value as AuthType })} className="w-full">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apiKey">API Key</option>
              </Select>
              {state.authType === "bearer" && <Input value={state.bearerToken} onChange={(event) => update({ bearerToken: event.target.value })} placeholder="Token" />}
              {state.authType === "basic" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={state.basicUsername} onChange={(event) => update({ basicUsername: event.target.value })} placeholder="Username" />
                  <Input type="password" value={state.basicPassword} onChange={(event) => update({ basicPassword: event.target.value })} placeholder="Password" />
                </div>
              )}
              {state.authType === "apiKey" && (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
                  <Input value={state.apiKeyName} onChange={(event) => update({ apiKeyName: event.target.value })} placeholder="Key name" />
                  <Input value={state.apiKeyValue} onChange={(event) => update({ apiKeyValue: event.target.value })} placeholder="Value" />
                  <Select value={state.apiKeyLocation} onChange={(event) => update({ apiKeyLocation: event.target.value as "header" | "query" })}>
                    <option value="header">Header</option>
                    <option value="query">Query param</option>
                  </Select>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <input type="checkbox" checked={state.followRedirects} onChange={(event) => update({ followRedirects: event.target.checked })} className="h-4 w-4 rounded accent-emerald-500" />
                  Follow redirects
                </label>
                <div>
                  <Label>Timeout seconds</Label>
                  <Input type="number" min={1} max={30} value={state.timeoutSeconds} onChange={(event) => update({ timeoutSeconds: Number(event.target.value) })} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {response ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={response.status_code} />
                <span className="font-medium text-zinc-950 dark:text-zinc-50">{response.status_text}</span>
                <span className="text-sm text-zinc-500">{response.response_time_ms}ms</span>
                <span className="text-sm text-zinc-500">{formatBytes(response.body_size_bytes)}</span>
              </div>
              <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
                {(["body", "headers", "info"] as ResponseTab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => setResponseTab(tab)} className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${responseTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-zinc-500"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              {responseTab === "body" && <ResponseBody response={response} />}
              {responseTab === "headers" && <HeadersView headers={response.headers} />}
              {responseTab === "info" && <InfoView response={response} url={finalUrl} method={state.method} />}
            </>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <MethodBadge method={state.method} />
              <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No response yet</h2>
              <p className="mt-1 text-sm text-zinc-500">Send a request to inspect status, headers, body, redirects, and timing.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HeadersView({ headers }: { headers: { key: string; value: string }[] }) {
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(Object.fromEntries(headers.map((item) => [item.key, item.value])), null, 2));
    } catch {
      // ignore
    }
  }
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button onClick={copyAll}>Copy all headers as JSON</Button></div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        {headers.map((header) => (
          <div key={`${header.key}-${header.value}`} className="grid grid-cols-[180px_1fr] border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
            <div className="bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">{header.key}</div>
            <div className="min-w-0 break-all px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">{header.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoView({ response, url, method }: { response: HttpProxyResponse; url: string; method: string }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Full request URL</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">{method} {url}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs text-zinc-500">Response time</p><p className="font-medium">{response.response_time_ms}ms</p></div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs text-zinc-500">Body size</p><p className="font-medium">{formatBytes(response.body_size_bytes)}</p></div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs text-zinc-500">Final URL</p><p className="truncate font-medium">{response.final_url || url}</p></div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Redirect chain</p>
        {response.redirect_chain.length ? (
          <div className="space-y-2">
            {response.redirect_chain.map((item, index) => (
              <div key={`${item.url}-${index}`} className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <StatusBadge status={item.status_code} />
                <span className="min-w-0 truncate font-mono text-xs">{item.url}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No redirects followed.</p>
        )}
      </div>
    </div>
  );
}
