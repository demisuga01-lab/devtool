"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FolderOpen, Loader2, Play, Plus, Save, Settings, Trash2, Upload } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";
import {
  createRow,
  enabledPairs,
  formatBytes,
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

type Pair = {
  key: string;
  value: string;
  enabled?: boolean;
};

type AuthConfig = {
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: "header" | "query";
};

type CollectionRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Pair[];
  body: string | null;
  body_type: BodyType;
  auth_type: AuthType;
  auth_config: AuthConfig;
  params: Pair[];
  sort_order: number;
  created_at?: string | null;
  folder?: string | null;
};

type CollectionEnvironment = {
  id: string;
  name: string;
  variables: Pair[];
};

type ApiCollection = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  request_count?: number;
  requests: CollectionRequest[];
  environments: CollectionEnvironment[];
};

type RequestDraft = {
  id?: string;
  name: string;
  method: string;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyType: BodyType;
  body: string;
  formRows: KeyValueRow[];
  authType: AuthType;
  authConfig: AuthConfig;
  folder: string;
};

type Props = {
  initialCollectionId?: string;
  initialAdminKey?: string;
};

const LOCAL_KEY = "devtools:api-collections-local";
const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const headerSuggestions = ["Content-Type", "Accept", "Authorization", "X-API-Key"];

const defaultEnvironment: CollectionEnvironment = {
  id: "default",
  name: "Default",
  variables: [createPair("base_url", "https://api.example.com")],
};

function createPair(key = "", value = "", enabled = true): Pair {
  return { key, value, enabled };
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function defaultDraft(folder = ""): RequestDraft {
  return {
    name: "Untitled Request",
    method: "GET",
    url: "{{base_url}}/endpoint",
    params: [createRow()],
    headers: [createRow("Accept", "application/json")],
    bodyType: "none",
    body: "{\n  \n}",
    formRows: [createRow()],
    authType: "none",
    authConfig: {
      apiKeyName: "X-API-Key",
      apiKeyLocation: "header",
    },
    folder,
  };
}

function loadLocalCollections(): ApiCollection[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalCollections(collections: ApiCollection[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(collections));
  } catch {
    // ignore storage failures
  }
}

function normalizePairs(value: unknown): Pair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { key: unknown; value: unknown; enabled?: unknown } => Boolean(item) && typeof item === "object" && "key" in item)
    .map((item) => ({ key: String(item.key ?? ""), value: String(item.value ?? ""), enabled: item.enabled !== false }));
}

function requestToDraft(request: CollectionRequest): RequestDraft {
  return {
    id: request.id,
    name: request.name || "Untitled Request",
    method: request.method || "GET",
    url: request.url || "",
    params: rowsFromPairs(normalizePairs(request.params)),
    headers: rowsFromPairs(normalizePairs(request.headers)),
    bodyType: request.body_type || "none",
    body: request.body || "{\n  \n}",
    formRows: request.body_type === "form" ? rowsFromPairs(parseFormRows(request.body || "")) : [createRow()],
    authType: request.auth_type || "none",
    authConfig: request.auth_config || {},
    folder: request.folder || "",
  };
}

function parseFormRows(body: string): Pair[] {
  try {
    return Array.from(new URLSearchParams(body).entries()).map(([key, value]) => createPair(key, value));
  } catch {
    return [];
  }
}

function draftToRequest(draft: RequestDraft, sortOrder: number): CollectionRequest {
  const body = draft.bodyType === "none" ? null : draft.bodyType === "form" ? new URLSearchParams(enabledPairs(draft.formRows).map((row) => [row.key, row.value])).toString() : draft.body;
  return {
    id: draft.id || `local-${crypto.randomUUID()}`,
    name: draft.name.trim() || "Untitled Request",
    method: draft.method,
    url: draft.url,
    headers: enabledPairs(draft.headers),
    body,
    body_type: draft.bodyType,
    auth_type: draft.authType,
    auth_config: draft.authConfig,
    params: enabledPairs(draft.params),
    sort_order: sortOrder,
    folder: draft.folder.trim() || null,
  };
}

function variablesFromEnvironment(environment?: CollectionEnvironment): Record<string, string> {
  const pairs = normalizePairs(environment?.variables ?? []);
  return Object.fromEntries(pairs.filter((row) => row.enabled !== false && row.key).map((row) => [row.key, row.value]));
}

function substituteVariables(input: string, variables: Record<string, string>) {
  return input.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, key: string) => variables[key] ?? "");
}

function authRows(draft: RequestDraft): KeyValueRow[] {
  const config = draft.authConfig;
  if (draft.authType === "bearer" && config.bearerToken) return [createRow("Authorization", `Bearer ${config.bearerToken}`)];
  if (draft.authType === "basic" && (config.basicUsername || config.basicPassword)) {
    return [createRow("Authorization", `Basic ${btoa(`${config.basicUsername || ""}:${config.basicPassword || ""}`)}`)];
  }
  if (draft.authType === "apiKey" && config.apiKeyLocation === "header" && config.apiKeyName && config.apiKeyValue) {
    return [createRow(config.apiKeyName, config.apiKeyValue)];
  }
  return [];
}

function buildUrl(draft: RequestDraft, variables: Record<string, string>) {
  const substituted = substituteVariables(draft.url, variables);
  try {
    const parsed = new URL(substituted);
    for (const row of enabledPairs(draft.params)) parsed.searchParams.set(substituteVariables(row.key, variables), substituteVariables(row.value, variables));
    if (draft.authType === "apiKey" && draft.authConfig.apiKeyLocation === "query" && draft.authConfig.apiKeyName && draft.authConfig.apiKeyValue) {
      parsed.searchParams.set(substituteVariables(draft.authConfig.apiKeyName, variables), substituteVariables(draft.authConfig.apiKeyValue, variables));
    }
    return parsed.toString();
  } catch {
    const query = new URLSearchParams();
    for (const row of enabledPairs(draft.params)) query.set(substituteVariables(row.key, variables), substituteVariables(row.value, variables));
    if (draft.authType === "apiKey" && draft.authConfig.apiKeyLocation === "query" && draft.authConfig.apiKeyName && draft.authConfig.apiKeyValue) {
      query.set(substituteVariables(draft.authConfig.apiKeyName, variables), substituteVariables(draft.authConfig.apiKeyValue, variables));
    }
    return `${substituted}${query.toString() ? `${substituted.includes("?") ? "&" : "?"}${query}` : ""}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not saved";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ApiCollectionsClient({ initialCollectionId, initialAdminKey = "" }: Props) {
  const [mode, setMode] = useState<"local" | "cloud">(initialCollectionId ? "cloud" : "local");
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [localCollections, setLocalCollections] = useState<ApiCollection[]>([]);
  const [activeRequestId, setActiveRequestId] = useState("");
  const [draft, setDraft] = useState<RequestDraft>(defaultDraft());
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [response, setResponse] = useState<HttpProxyResponse | null>(null);
  const [activeEnvId, setActiveEnvId] = useState("default");
  const [adminKey, setAdminKey] = useState(initialAdminKey);
  const [cloudId, setCloudId] = useState(initialCollectionId ?? "");
  const [createName, setCreateName] = useState("My API Collection");
  const [createDescription, setCreateDescription] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [envOpen, setEnvOpen] = useState(false);
  const [envDraftName, setEnvDraftName] = useState("Development");
  const [envDraftRows, setEnvDraftRows] = useState<KeyValueRow[]>([createRow("base_url", "https://api.example.com")]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const locals = loadLocalCollections();
    setLocalCollections(locals);
    if (!initialCollectionId && locals[0]) {
      setCollection(locals[0]);
      setActiveEnvId(locals[0].environments[0]?.id || "default");
      if (locals[0].requests[0]) {
        setActiveRequestId(locals[0].requests[0].id);
        setDraft(requestToDraft(locals[0].requests[0]));
      }
    }
  }, [initialCollectionId]);

  useEffect(() => {
    if (initialCollectionId) void loadCloudCollection(initialCollectionId, initialAdminKey);
  }, [initialCollectionId, initialAdminKey]);

  const activeEnvironment = useMemo(() => collection?.environments.find((environment) => environment.id === activeEnvId) ?? collection?.environments[0] ?? defaultEnvironment, [collection, activeEnvId]);
  const variables = useMemo(() => variablesFromEnvironment(activeEnvironment), [activeEnvironment]);
  const finalUrl = useMemo(() => buildUrl(draft, variables), [draft, variables]);
  const shareUrl = useMemo(() => {
    if (!collection || typeof window === "undefined") return "";
    return `${window.location.origin}/tools/api-collections/${collection.id}`;
  }, [collection]);
  const editUrl = useMemo(() => {
    if (!shareUrl || !adminKey) return "";
    return `${shareUrl}?key=${encodeURIComponent(adminKey)}`;
  }, [adminKey, shareUrl]);

  const groupedRequests = useMemo(() => {
    const groups = new Map<string, CollectionRequest[]>();
    for (const request of collection?.requests ?? []) {
      const folder = request.folder || "Ungrouped";
      groups.set(folder, [...(groups.get(folder) ?? []), request]);
    }
    return Array.from(groups.entries()).map(([folder, requests]) => ({
      folder,
      requests: requests.sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [collection]);

  function updateDraft(patch: Partial<RequestDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateAuthConfig(patch: Partial<AuthConfig>) {
    setDraft((current) => ({ ...current, authConfig: { ...current.authConfig, ...patch } }));
  }

  async function loadCloudCollection(id = cloudId, key = adminKey) {
    if (!id.trim()) {
      setError("Enter a collection ID.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/collections/api/${encodeURIComponent(id.trim())}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Collection request failed with ${res.status}`));
      const payload = data as { collection?: ApiCollection; requests?: CollectionRequest[]; environments?: CollectionEnvironment[] };
      const next = normalizeCollection({
        ...(payload.collection ?? (data as ApiCollection)),
        requests: payload.requests ?? (payload.collection?.requests || []),
        environments: payload.environments ?? (payload.collection?.environments || [defaultEnvironment]),
      });
      setMode("cloud");
      setCollection(next);
      setCloudId(next.id);
      setAdminKey(key);
      setActiveEnvId(next.environments[0]?.id || "default");
      if (next.requests[0]) {
        setActiveRequestId(next.requests[0].id);
        setDraft(requestToDraft(next.requests[0]));
      } else {
        setActiveRequestId("");
        setDraft(defaultDraft());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
    } finally {
      setLoading(false);
    }
  }

  async function createCloudCollection() {
    if (!createName.trim() || !createPassword.trim()) {
      setError("Collection name and admin password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/collections/api`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDescription, admin_password: createPassword }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Collection creation failed with ${res.status}`));
      const created = data as { id: string; admin_key: string };
      setAdminKey(created.admin_key);
      setCloudId(created.id);
      setMode("cloud");
      await loadCloudCollection(created.id, created.admin_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create collection.");
    } finally {
      setLoading(false);
    }
  }

  function createLocalCollection() {
    const next: ApiCollection = {
      id: `local-${crypto.randomUUID().slice(0, 8)}`,
      name: createName.trim() || "Local API Collection",
      description: createDescription || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requests: [],
      environments: [defaultEnvironment],
      request_count: 0,
    };
    const locals = [next, ...localCollections].slice(0, 20);
    setLocalCollections(locals);
    saveLocalCollections(locals);
    setMode("local");
    setCollection(next);
    setActiveEnvId("default");
    setActiveRequestId("");
    setDraft(defaultDraft());
  }

  function persistLocal(nextCollection: ApiCollection) {
    const locals = [nextCollection, ...localCollections.filter((item) => item.id !== nextCollection.id)].slice(0, 20);
    setLocalCollections(locals);
    saveLocalCollections(locals);
    setCollection(nextCollection);
  }

  function selectRequest(request: CollectionRequest) {
    setActiveRequestId(request.id);
    setDraft(requestToDraft(request));
    setResponse(null);
  }

  function newRequest(folder = "") {
    const next = defaultDraft(folder);
    setActiveRequestId("");
    setDraft(next);
    setResponse(null);
  }

  function addFolder() {
    if (!newFolderName.trim()) return;
    newRequest(newFolderName.trim());
    setNewFolderName("");
  }

  async function saveRequest(): Promise<boolean> {
    if (!collection) {
      setError("Create or open a collection first.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      if (mode === "cloud" && !collection.id.startsWith("local-")) {
        if (!adminKey) throw new Error("Admin key is required to edit this cloud collection.");
        const payload = draftToRequest(draft, collection.requests.length);
        const isUpdate = Boolean(draft.id);
        const url = isUpdate
          ? `${API_BASE}/collections/api/${encodeURIComponent(collection.id)}/requests/${encodeURIComponent(draft.id || "")}`
          : `${API_BASE}/collections/api/${encodeURIComponent(collection.id)}/requests`;
        const res = await fetch(url, {
          method: isUpdate ? "PUT" : "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Admin-Key": adminKey },
          body: JSON.stringify({
            name: payload.name,
            method: payload.method,
            url: payload.url,
            headers: payload.headers,
            body: payload.body,
            body_type: payload.body_type,
            auth_type: payload.auth_type,
            auth_config: payload.auth_config,
            params: payload.params,
            folder: payload.folder,
          }),
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `Save failed with ${res.status}`));
        await loadCloudCollection(collection.id, adminKey);
      } else {
        const saved = draftToRequest(draft, draft.id ? collection.requests.find((request) => request.id === draft.id)?.sort_order ?? collection.requests.length : collection.requests.length);
        const requests = draft.id
          ? collection.requests.map((request) => request.id === draft.id ? saved : request)
          : [...collection.requests, saved];
        const next = { ...collection, requests, request_count: requests.length, updated_at: new Date().toISOString() };
        persistLocal(next);
        setActiveRequestId(saved.id);
        setDraft(requestToDraft(saved));
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save request.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest(id: string) {
    if (!collection) return;
    setError("");
    try {
      if (mode === "cloud" && !collection.id.startsWith("local-")) {
        if (!adminKey) throw new Error("Admin key is required to delete requests.");
        const res = await fetch(`${API_BASE}/collections/api/${encodeURIComponent(collection.id)}/requests/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { Accept: "application/json", "X-Admin-Key": adminKey },
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `Delete failed with ${res.status}`));
        await loadCloudCollection(collection.id, adminKey);
      } else {
        const requests = collection.requests.filter((request) => request.id !== id);
        persistLocal({ ...collection, requests, request_count: requests.length, updated_at: new Date().toISOString() });
        if (activeRequestId === id) newRequest();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete request.");
    }
  }

  async function runRequest() {
    setLoading(true);
    setError("");
    try {
      const body =
        draft.bodyType === "none" ? null :
        draft.bodyType === "form" ? new URLSearchParams(enabledPairs(draft.formRows).map((row) => [row.key, row.value])).toString() :
        substituteVariables(draft.body, variables);
      const headers = [...enabledPairs(draft.headers), ...enabledPairs(authRows(draft))]
        .map((row) => ({ key: substituteVariables(row.key, variables), value: substituteVariables(row.value, variables) }));
      const res = await fetch(`${API_BASE}/tools/http-proxy`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          method: draft.method,
          url: finalUrl,
          headers,
          body,
          body_type: draft.bodyType,
          follow_redirects: true,
          timeout_seconds: 20,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with ${res.status}`));
      setResponse(data as HttpProxyResponse);
      setResponseTab("body");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAndRun() {
    const saved = await saveRequest();
    if (saved) await runRequest();
  }

  function formatJson() {
    window.setTimeout(() => {
      try {
        updateDraft({ body: JSON.stringify(JSON.parse(draft.body || "{}"), null, 2) });
        setError("");
      } catch {
        setError("JSON body is not valid.");
      }
    }, 0);
  }

  async function exportCollection() {
    if (!collection) return;
    if (mode === "cloud" && !collection.id.startsWith("local-")) {
      window.open(`${API_BASE}/collections/api/${encodeURIComponent(collection.id)}/export`, "_blank");
      return;
    }
    downloadJson(`${collection.name || "api-collection"}.json`, collection);
  }

  function importCollection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}")) as Partial<ApiCollection>;
        const next = normalizeCollection({
          id: parsed.id || `local-${crypto.randomUUID().slice(0, 8)}`,
          name: parsed.name || file.name.replace(/\.json$/i, ""),
          description: parsed.description || null,
          requests: parsed.requests || [],
          environments: parsed.environments || [defaultEnvironment],
        } as ApiCollection);
        persistLocal(next);
        setMode("local");
      } catch {
        setError("Could not import this collection JSON.");
      }
    };
    reader.readAsText(file);
  }

  async function exportLocalToCloud() {
    if (!collection) return;
    if (!createPassword.trim()) {
      setError("Enter an admin password before exporting local collection to cloud.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/collections/api`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: collection.name, description: collection.description || "", admin_password: createPassword }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, "Could not create cloud collection."));
      const created = data as { id: string; admin_key: string };
      for (const request of collection.requests) {
        await fetch(`${API_BASE}/collections/api/${encodeURIComponent(created.id)}/requests`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Admin-Key": created.admin_key },
          body: JSON.stringify(request),
        });
      }
      for (const environment of collection.environments.filter((item) => item.id !== "default")) {
        await fetch(`${API_BASE}/collections/api/${encodeURIComponent(created.id)}/environments`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Admin-Key": created.admin_key },
          body: JSON.stringify({ name: environment.name, variables: environment.variables }),
        });
      }
      setAdminKey(created.admin_key);
      await loadCloudCollection(created.id, created.admin_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export collection.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEnvironment() {
    if (!collection || !envDraftName.trim()) return;
    setError("");
    try {
      let nextEnvironmentId = "";
      const environment: CollectionEnvironment = {
        id: `env-${crypto.randomUUID().slice(0, 8)}`,
        name: envDraftName.trim(),
        variables: enabledPairs(envDraftRows),
      };
      nextEnvironmentId = environment.id;
      if (mode === "cloud" && !collection.id.startsWith("local-")) {
        if (!adminKey) throw new Error("Admin key is required to add environments.");
        const res = await fetch(`${API_BASE}/collections/api/${encodeURIComponent(collection.id)}/environments`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Admin-Key": adminKey },
          body: JSON.stringify({ name: environment.name, variables: environment.variables }),
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `Environment save failed with ${res.status}`));
        nextEnvironmentId = (data as { id?: string }).id || nextEnvironmentId;
        await loadCloudCollection(collection.id, adminKey);
      } else {
        persistLocal({ ...collection, environments: [...collection.environments, environment], updated_at: new Date().toISOString() });
      }
      setActiveEnvId(nextEnvironmentId);
      setEnvOpen(false);
      setEnvDraftName("Development");
      setEnvDraftRows([createRow("base_url", "https://api.example.com")]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save environment.");
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">API Collections</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Save, organize, share, and run API requests with environments.</p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_minmax(420px,0.85fr)]">
        <aside className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 p-1 dark:border-zinc-800">
            {(["local", "cloud"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${mode === item ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                {item}
              </button>
            ))}
          </div>

          <CollectionSetup
            mode={mode}
            collection={collection}
            localCollections={localCollections}
            cloudId={cloudId}
            adminKey={adminKey}
            createName={createName}
            createDescription={createDescription}
            createPassword={createPassword}
            loading={loading}
            onCloudId={setCloudId}
            onAdminKey={setAdminKey}
            onCreateName={setCreateName}
            onCreateDescription={setCreateDescription}
            onCreatePassword={setCreatePassword}
            onCreateLocal={createLocalCollection}
            onCreateCloud={createCloudCollection}
            onLoadCloud={() => void loadCloudCollection()}
            onSelectLocal={(item) => {
              setMode("local");
              setCollection(item);
              setActiveEnvId(item.environments[0]?.id || "default");
              if (item.requests[0]) selectRequest(item.requests[0]);
            }}
          />

          {collection && (
            <>
              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Collection</p>
                    <h2 className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">{collection.name}</h2>
                    {collection.description && <p className="mt-1 text-xs text-zinc-500">{collection.description}</p>}
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-800">{collection.requests.length}</span>
                </div>
                <div className="mt-3">
                  <Label>Environment</Label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Select value={activeEnvId} onChange={(event) => setActiveEnvId(event.target.value)} className="w-full">
                      {collection.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}
                    </Select>
                    <Button type="button" onClick={() => setEnvOpen(true)}><Settings className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Requests</p>
                  <Button type="button" onClick={() => newRequest()} className="px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" />New</Button>
                </div>
                <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
                  <Input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="New folder" />
                  <Button type="button" onClick={addFolder}><FolderOpen className="h-4 w-4" /></Button>
                </div>
                <div className="max-h-[520px] space-y-3 overflow-y-auto">
                  {groupedRequests.length ? groupedRequests.map((group) => {
                    const collapsed = collapsedFolders.has(group.folder);
                    return (
                      <div key={group.folder}>
                        <button
                          type="button"
                          onClick={() => setCollapsedFolders((current) => {
                            const next = new Set(current);
                            if (next.has(group.folder)) next.delete(group.folder);
                            else next.add(group.folder);
                            return next;
                          })}
                          className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          <span>{group.folder}</span>
                          <span>{group.requests.length}</span>
                        </button>
                        {!collapsed && (
                          <div className="space-y-1">
                            {group.requests.map((request) => (
                              <div key={request.id} className={`group flex items-center gap-2 rounded-lg px-2 py-2 ${activeRequestId === request.id ? "bg-emerald-500/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                                <button type="button" onClick={() => selectRequest(request)} className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <MethodBadge method={request.method} />
                                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{request.name}</span>
                                  </div>
                                </button>
                                <button type="button" onClick={() => void deleteRequest(request.id)} className="rounded-md p-1 text-zinc-400 opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
                      No requests yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" />Import</Button>
                  <Button type="button" onClick={exportCollection}><Download className="h-4 w-4" />Export</Button>
                </div>
                <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importCollection} className="hidden" />
                {mode === "local" && (
                  <Button type="button" onClick={exportLocalToCloud} className="mt-2 w-full">
                    <Upload className="h-4 w-4" />
                    Export local to backend
                  </Button>
                )}
                {shareUrl && (
                  <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Share</p>
                    <CopyButton value={shareUrl} label="Copy read URL" />
                    {editUrl && <CopyButton value={editUrl} label="Copy edit URL" />}
                    {adminKey && <p className="break-all text-xs text-amber-600 dark:text-amber-400">Admin key is shown only here: {adminKey}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <Label>Request Name</Label>
              <Input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
            </div>
            <div>
              <Label>Folder</Label>
              <Input value={draft.folder} onChange={(event) => updateDraft({ folder: event.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-2 lg:grid-cols-[120px_minmax(0,1fr)_auto_auto]">
            <Select value={draft.method} onChange={(event) => updateDraft({ method: event.target.value })} className="font-semibold">
              {methods.map((method) => <option key={method} value={method}>{method}</option>)}
            </Select>
            <Input value={draft.url} onChange={(event) => updateDraft({ url: event.target.value })} placeholder="{{base_url}}/users" />
            <Button type="button" onClick={saveRequest} disabled={saving || !collection}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
            <Button type="button" variant="primary" onClick={saveAndRun} disabled={loading || !draft.url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Save & Run
            </Button>
          </div>
          {finalUrl && <div className="rounded-xl bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-950">{finalUrl}</div>}

          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {(["params", "headers", "body", "auth"] as RequestTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setRequestTab(tab)} className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${requestTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-zinc-500"}`}>
                {tab}
              </button>
            ))}
          </div>

          {requestTab === "params" && <KeyValueTable rows={draft.params} onChange={(params) => updateDraft({ params })} />}
          {requestTab === "headers" && <KeyValueTable rows={draft.headers} onChange={(headers) => updateDraft({ headers })} suggestions={headerSuggestions} />}
          {requestTab === "body" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Select value={draft.bodyType} onChange={(event) => updateDraft({ bodyType: event.target.value as BodyType })}>
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="form">Form Data</option>
                  <option value="text">Raw Text</option>
                  <option value="xml">XML</option>
                </Select>
                {draft.bodyType === "json" && <Button type="button" onClick={formatJson}>Format JSON</Button>}
              </div>
              {draft.bodyType === "form" ? (
                <KeyValueTable rows={draft.formRows} onChange={(formRows) => updateDraft({ formRows })} />
              ) : draft.bodyType !== "none" ? (
                <Textarea value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} rows={14} className="min-h-[320px]" />
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No request body for this request.</div>
              )}
            </div>
          )}
          {requestTab === "auth" && (
            <div className="space-y-4">
              <Select value={draft.authType} onChange={(event) => updateDraft({ authType: event.target.value as AuthType })} className="w-full">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apiKey">API Key</option>
              </Select>
              {draft.authType === "bearer" && <Input value={draft.authConfig.bearerToken || ""} onChange={(event) => updateAuthConfig({ bearerToken: event.target.value })} placeholder="Token" />}
              {draft.authType === "basic" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={draft.authConfig.basicUsername || ""} onChange={(event) => updateAuthConfig({ basicUsername: event.target.value })} placeholder="Username" />
                  <Input type="password" value={draft.authConfig.basicPassword || ""} onChange={(event) => updateAuthConfig({ basicPassword: event.target.value })} placeholder="Password" />
                </div>
              )}
              {draft.authType === "apiKey" && (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
                  <Input value={draft.authConfig.apiKeyName || ""} onChange={(event) => updateAuthConfig({ apiKeyName: event.target.value })} placeholder="Key name" />
                  <Input value={draft.authConfig.apiKeyValue || ""} onChange={(event) => updateAuthConfig({ apiKeyValue: event.target.value })} placeholder="Value" />
                  <Select value={draft.authConfig.apiKeyLocation || "header"} onChange={(event) => updateAuthConfig({ apiKeyLocation: event.target.value as "header" | "query" })}>
                    <option value="header">Header</option>
                    <option value="query">Query param</option>
                  </Select>
                </div>
              )}
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
              {responseTab === "info" && <InfoView response={response} url={finalUrl} />}
            </>
          ) : (
            <div className="flex min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <FolderOpen className="h-8 w-8 text-zinc-400" />
              <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No response yet</h2>
              <p className="mt-1 text-sm text-zinc-500">Run a saved request to inspect the response.</p>
            </div>
          )}
        </section>
      </div>

      {envOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Environment manager</h2>
              <Button type="button" onClick={() => setEnvOpen(false)}>Close</Button>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={envDraftName} onChange={(event) => setEnvDraftName(event.target.value)} />
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-950">
                Variables can be used as {"{{variable_name}}"} in URLs, headers, and bodies.
              </div>
            </div>
            <KeyValueTable rows={envDraftRows} onChange={setEnvDraftRows} valuePlaceholder="Variable value" />
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="primary" onClick={saveEnvironment}>Save environment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeCollection(collection: ApiCollection): ApiCollection {
  const requests = (collection.requests || []).map((request, index) => ({
    ...request,
    id: request.id || `local-${crypto.randomUUID()}`,
    headers: normalizePairs(request.headers),
    params: normalizePairs(request.params),
    auth_config: request.auth_config || {},
    body_type: request.body_type || "none",
    auth_type: request.auth_type || "none",
    sort_order: typeof request.sort_order === "number" ? request.sort_order : index,
  }));
  const environments = (collection.environments?.length ? collection.environments : [defaultEnvironment]).map((environment) => ({
    ...environment,
    id: environment.id || `env-${crypto.randomUUID().slice(0, 8)}`,
    variables: normalizePairs(environment.variables),
  }));
  return {
    ...collection,
    description: collection.description || null,
    requests,
    environments,
    request_count: requests.length,
  };
}

function CollectionSetup({
  mode,
  collection,
  localCollections,
  cloudId,
  adminKey,
  createName,
  createDescription,
  createPassword,
  loading,
  onCloudId,
  onAdminKey,
  onCreateName,
  onCreateDescription,
  onCreatePassword,
  onCreateLocal,
  onCreateCloud,
  onLoadCloud,
  onSelectLocal,
}: {
  mode: "local" | "cloud";
  collection: ApiCollection | null;
  localCollections: ApiCollection[];
  cloudId: string;
  adminKey: string;
  createName: string;
  createDescription: string;
  createPassword: string;
  loading: boolean;
  onCloudId: (value: string) => void;
  onAdminKey: (value: string) => void;
  onCreateName: (value: string) => void;
  onCreateDescription: (value: string) => void;
  onCreatePassword: (value: string) => void;
  onCreateLocal: () => void;
  onCreateCloud: () => void;
  onLoadCloud: () => void;
  onSelectLocal: (collection: ApiCollection) => void;
}) {
  if (mode === "local") {
    return (
      <div className="space-y-3">
        <div>
          <Label>New Local Collection</Label>
          <Input value={createName} onChange={(event) => onCreateName(event.target.value)} placeholder="Collection name" />
        </div>
        <Textarea value={createDescription} onChange={(event) => onCreateDescription(event.target.value)} rows={3} placeholder="Description" className="font-sans" />
        <Input type="password" value={createPassword} onChange={(event) => onCreatePassword(event.target.value)} placeholder="Admin password for cloud export" />
        <Button type="button" variant="primary" onClick={onCreateLocal} className="w-full">
          <Plus className="h-4 w-4" />
          New local collection
        </Button>
        {localCollections.length > 0 && (
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Local collections</p>
            <div className="space-y-1">
              {localCollections.map((item) => (
                <button key={item.id} type="button" onClick={() => onSelectLocal(item)} className={`w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${collection?.id === item.id ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : ""}`}>
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-xs text-zinc-500">{item.requests.length} requests</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Open Cloud Collection</Label>
        <Input value={cloudId} onChange={(event) => onCloudId(event.target.value)} placeholder="Collection ID" />
      </div>
      <Input value={adminKey} onChange={(event) => onAdminKey(event.target.value)} placeholder="Admin key (optional for editing)" />
      <Button type="button" onClick={onLoadCloud} disabled={loading || !cloudId.trim()} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
        Open collection
      </Button>
      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Label>Create Cloud Collection</Label>
        <Input value={createName} onChange={(event) => onCreateName(event.target.value)} placeholder="Collection name" />
        <Textarea value={createDescription} onChange={(event) => onCreateDescription(event.target.value)} rows={3} placeholder="Description" className="mt-2 font-sans" />
        <Input type="password" value={createPassword} onChange={(event) => onCreatePassword(event.target.value)} placeholder="Admin password" className="mt-2" />
        <Button type="button" variant="primary" onClick={onCreateCloud} disabled={loading} className="mt-2 w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create cloud collection
        </Button>
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
      <div className="mb-3 flex justify-end"><Button type="button" onClick={copyAll}><Copy className="h-4 w-4" />Copy headers</Button></div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        {headers.map((header) => (
          <div key={`${header.key}-${header.value}`} className="grid grid-cols-[160px_1fr] border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
            <div className="bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">{header.key}</div>
            <div className="min-w-0 break-all px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">{header.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoView({ response, url }: { response: HttpProxyResponse; url: string }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Full request URL</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">{url}</p>
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

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
