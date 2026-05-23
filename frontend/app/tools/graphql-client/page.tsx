"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Play, Search, Settings, Workflow } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Input, Label, Textarea } from "@/components/ui";
import {
  createRow,
  enabledPairs,
  formatBytes,
  HistoryEntry,
  HistoryPanel,
  HttpProxyResponse,
  KeyValueRow,
  KeyValueTable,
  ResponseBody,
  rowsFromPairs,
  StatusBadge,
} from "@/components/http-client-shared";

type GraphQLState = {
  endpoint: string;
  query: string;
  variablesText: string;
  headers: KeyValueRow[];
};

type GraphQLTypeRef = {
  name?: string | null;
  kind?: string | null;
  ofType?: GraphQLTypeRef | null;
};

type GraphQLField = {
  name: string;
  type?: GraphQLTypeRef | null;
};

type GraphQLType = {
  name?: string | null;
  kind?: string | null;
  fields?: GraphQLField[] | null;
};

type SchemaPayload = {
  __schema?: {
    types?: GraphQLType[] | null;
  } | null;
};

type ResponseTab = "data" | "errors" | "extensions" | "raw" | "headers" | "info";

const HISTORY_KEY = "devtools:graphql-client-history";
const headerSuggestions = ["Content-Type", "Accept", "Authorization", "X-API-Key"];
const starterQuery = `query Example {
  __typename
}`;

const initialState: GraphQLState = {
  endpoint: "",
  query: starterQuery,
  variablesText: "{\n  \n}",
  headers: [createRow("Accept", "application/json"), createRow("Content-Type", "application/json")],
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

function typeLabel(type?: GraphQLTypeRef | null): string {
  if (!type) return "Unknown";
  if (type.name) return type.name;
  if (type.ofType) return typeLabel(type.ofType);
  return type.kind || "Unknown";
}

function jsonResponse(value: unknown): HttpProxyResponse {
  return {
    status_code: 200,
    status_text: "OK",
    headers: [{ key: "content-type", value: "application/json" }],
    body: JSON.stringify(value ?? null, null, 2),
    content_type: "application/json",
    body_size_bytes: new TextEncoder().encode(JSON.stringify(value ?? null)).length,
    response_time_ms: 0,
    redirect_chain: [],
  };
}

export default function GraphQLClientPage() {
  const [state, setState] = useState<GraphQLState>(initialState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [response, setResponse] = useState<HttpProxyResponse | null>(null);
  const [responseTab, setResponseTab] = useState<ResponseTab>("data");
  const [schema, setSchema] = useState<SchemaPayload | null>(null);
  const [schemaSearch, setSchemaSearch] = useState("");
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  const [variablesOpen, setVariablesOpen] = useState(true);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState("");
  const queryRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setHistory(loadHistory()), []);

  const types = useMemo(() => {
    const values = schema?.__schema?.types ?? [];
    return values
      .filter((type): type is GraphQLType & { name: string } => Boolean(type.name) && !type.name?.startsWith("__"))
      .filter((type) => type.name.toLowerCase().includes(schemaSearch.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schema, schemaSearch]);

  const selectedType = useMemo(
    () => types.find((type) => type.name === selectedTypeName) ?? types[0],
    [types, selectedTypeName],
  );

  function update(patch: Partial<GraphQLState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function restore(entry: HistoryEntry) {
    const payload = entry.payload as Partial<GraphQLState>;
    setState({
      ...initialState,
      ...payload,
      headers: rowsFromPairs(payload.headers as KeyValueRow[]),
    });
  }

  function parseVariables(): Record<string, unknown> | null {
    const text = state.variablesText.trim();
    if (!text) return {};
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Variables must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  }

  async function fetchSchema() {
    if (!state.endpoint.trim()) {
      setError("Enter a GraphQL endpoint before fetching the schema.");
      return;
    }
    setSchemaLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/tools/graphql-introspect`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: state.endpoint, headers: enabledPairs(state.headers) }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Schema fetch failed with ${res.status}`));
      const payload = data as { schema?: SchemaPayload | null; errors?: unknown[] };
      if (payload.errors?.length) throw new Error("The endpoint returned GraphQL introspection errors.");
      setSchema(payload.schema ?? null);
      const firstType = payload.schema?.__schema?.types?.find((type) => type.name && !type.name.startsWith("__"));
      setSelectedTypeName(firstType?.name ?? "");
    } catch (err) {
      setSchema(null);
      setError(err instanceof Error ? err.message : "Schema fetch failed.");
    } finally {
      setSchemaLoading(false);
    }
  }

  async function runQuery() {
    setLoading(true);
    setError("");
    try {
      const variables = parseVariables();
      const res = await fetch(`${API_BASE}/tools/graphql-proxy`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: state.endpoint,
          query: state.query,
          variables,
          headers: enabledPairs(state.headers),
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `GraphQL request failed with ${res.status}`));
      const nextResponse = data as HttpProxyResponse;
      setResponse(nextResponse);
      setResponseTab((nextResponse.errors?.length ?? 0) > 0 ? "errors" : "data");
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method: "POST",
        url: state.endpoint,
        status: nextResponse.status_code,
        timeMs: nextResponse.response_time_ms,
        savedAt: Date.now(),
        payload: state,
      };
      const nextHistory = [entry, ...history.filter((item) => item.url !== state.endpoint || item.payload !== state)].slice(0, 20);
      setHistory(nextHistory);
      saveHistory(nextHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GraphQL request failed.");
    } finally {
      setLoading(false);
    }
  }

  function insertField(fieldName: string) {
    const textarea = queryRef.current;
    if (!textarea) {
      update({ query: `${state.query}\n${fieldName}` });
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${state.query.slice(0, start)}${fieldName}${state.query.slice(end)}`;
    update({ query: next });
    window.setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + fieldName.length;
      textarea.selectionEnd = start + fieldName.length;
    }, 0);
  }

  function handleQueryKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runQuery();
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">GraphQL Client</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Query GraphQL APIs, fetch schemas, and inspect responses through the secure proxy.</p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <section className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <Input value={state.endpoint} onChange={(event) => update({ endpoint: event.target.value })} placeholder="https://api.example.com/graphql" />
          <Button type="button" onClick={() => setHeadersOpen((value) => !value)}>
            <Settings className="h-4 w-4" />
            Headers
          </Button>
          <Button type="button" onClick={fetchSchema} disabled={schemaLoading || !state.endpoint.trim()}>
            {schemaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
            Fetch Schema
          </Button>
          <Button type="button" variant="primary" onClick={runQuery} disabled={loading || !state.endpoint.trim() || !state.query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </Button>
        </div>
        {headersOpen && (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Label>Request Headers</Label>
            <KeyValueTable rows={state.headers} onChange={(headers) => update({ headers })} suggestions={headerSuggestions} />
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_minmax(420px,0.9fr)]">
        <SchemaExplorer
          loading={schemaLoading}
          types={types}
          selectedType={selectedType}
          selectedTypeName={selectedTypeName}
          search={schemaSearch}
          onSearch={setSchemaSearch}
          onSelect={setSelectedTypeName}
          onInsertField={insertField}
        />

        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <HistoryPanel entries={history} onRestore={restore} onClear={() => { setHistory([]); saveHistory([]); }} />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Query</Label>
              <span className="text-xs text-zinc-500">Ctrl+Enter to run</span>
            </div>
            <textarea
              ref={queryRef}
              value={state.query}
              onChange={(event) => update({ query: event.target.value })}
              onKeyDown={handleQueryKeyDown}
              rows={18}
              className="min-h-[440px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
              placeholder={starterQuery}
            />
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setVariablesOpen((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Variables</span>
              {variablesOpen ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
            </button>
            {variablesOpen && (
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                <Textarea value={state.variablesText} onChange={(event) => update({ variablesText: event.target.value })} rows={8} className="min-h-[180px]" />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {response ? (
            <GraphQLResponse response={response} tab={responseTab} onTabChange={setResponseTab} />
          ) : (
            <div className="flex min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <Workflow className="h-8 w-8 text-zinc-400" />
              <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No response yet</h2>
              <p className="mt-1 text-sm text-zinc-500">Run a query to inspect data, errors, headers, timing, and redirects.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SchemaExplorer({
  loading,
  types,
  selectedType,
  selectedTypeName,
  search,
  onSearch,
  onSelect,
  onInsertField,
}: {
  loading: boolean;
  types: (GraphQLType & { name: string })[];
  selectedType?: GraphQLType & { name: string };
  selectedTypeName: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (value: string) => void;
  onInsertField: (fieldName: string) => void;
}) {
  return (
    <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3">
        <Label>Schema Explorer</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search types" className="pl-9" />
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Fetching schema
        </div>
      ) : types.length ? (
        <div className="grid gap-4 lg:block">
          <div className="max-h-[280px] overflow-y-auto border-b border-zinc-200 pb-3 dark:border-zinc-800 xl:max-h-[520px]">
            {types.map((type) => (
              <button
                key={type.name}
                type="button"
                onClick={() => onSelect(type.name)}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${selectedTypeName === type.name ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
              >
                <span className="truncate font-medium">{type.name}</span>
                <span className="text-[10px] uppercase text-zinc-400">{type.kind}</span>
              </button>
            ))}
          </div>
          <div className="pt-3">
            <p className="mb-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">{selectedType?.name ?? "Select a type"}</p>
            <div className="max-h-[320px] space-y-1 overflow-y-auto">
              {(selectedType?.fields ?? []).map((field) => (
                <button
                  key={field.name}
                  type="button"
                  onClick={() => onInsertField(field.name)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="truncate font-mono text-zinc-800 dark:text-zinc-100">{field.name}</span>
                  <span className="ml-2 truncate text-zinc-500">{typeLabel(field.type)}</span>
                </button>
              ))}
              {!selectedType?.fields?.length && <p className="text-xs text-zinc-500">No fields available for this type.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-5 text-center dark:border-zinc-700">
          <Workflow className="h-7 w-7 text-zinc-400" />
          <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">No schema loaded</p>
          <p className="mt-1 text-xs text-zinc-500">Fetch schema to browse types and insert fields.</p>
        </div>
      )}
    </aside>
  );
}

function GraphQLResponse({ response, tab, onTabChange }: { response: HttpProxyResponse; tab: ResponseTab; onTabChange: (tab: ResponseTab) => void }) {
  const tabs: ResponseTab[] = ["data", "errors", "extensions", "raw", "headers", "info"];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={response.status_code} />
        <span className="font-medium text-zinc-950 dark:text-zinc-50">{response.status_text}</span>
        <span className="text-sm text-zinc-500">{response.response_time_ms}ms</span>
        <span className="text-sm text-zinc-500">{formatBytes(response.body_size_bytes)}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => onTabChange(item)} className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${tab === item ? "border-emerald-500 text-emerald-600" : "border-transparent text-zinc-500"}`}>
            {item}
          </button>
        ))}
      </div>
      {tab === "data" && <ResponseBody response={jsonResponse(response.data ?? null)} />}
      {tab === "errors" && <ResponseBody response={jsonResponse(response.errors ?? [])} />}
      {tab === "extensions" && <ResponseBody response={jsonResponse(response.extensions ?? {})} />}
      {tab === "raw" && <ResponseBody response={response} />}
      {tab === "headers" && <HeaderTable headers={response.headers} />}
      {tab === "info" && (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Final URL</p>
            <p className="break-all font-mono text-xs">{response.final_url}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Redirects</p>
            <p className="font-medium">{response.redirect_chain.length}</p>
          </div>
        </div>
      )}
    </>
  );
}

function HeaderTable({ headers }: { headers: { key: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      {headers.map((header) => (
        <div key={`${header.key}-${header.value}`} className="grid grid-cols-[160px_1fr] border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
          <div className="bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">{header.key}</div>
          <div className="min-w-0 break-all px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">{header.value}</div>
        </div>
      ))}
    </div>
  );
}
