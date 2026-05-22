"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import { marked } from "marked";
import DOMPurify from "dompurify";
import QRCode from "qrcode";
import { Download, Eye, EyeOff, Play, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  CodeArea,
  CodeBlock,
  CopyButton,
  ErrorCard,
  Label,
  Panel,
  ResultCard,
  ToolInput,
  ToolSelect,
  ToolShell,
  ToolTextarea,
} from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { createPaste, getPaste, type ExpiresIn } from "@/lib/paste-api";
import { REQUEST_HISTORY_KEY, loadRequestHistory, type RequestHistoryEntry } from "@/lib/request-history";

type ExtraToolSlug =
  | "env-manager"
  | "openapi-viewer"
  | "redoc-viewer"
  | "openapi-validator"
  | "openapi-schema-explorer"
  | "status-badges"
  | "testcase-runner"
  | "code-share"
  | "request-history"
  | "zk-paste"
  | "collab-notes";

type JsonRecord = Record<string, unknown>;
type Operation = {
  method: string;
  path: string;
  tag: string;
  summary: string;
  description: string;
  operation: JsonRecord;
};
type EnvRow = { id: string; key: string; value: string; visible: boolean };
type TestCase = { id: string; name: string; stdin: string; expected: string; actual: string; status: "pending" | "running" | "passed" | "failed" };
type Note = { id: string; title: string; content: string; createdAt: string; updatedAt: string };

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];
const ENV_KEY = "devtools:env-manager";
const NOTES_KEY = "devtools:collab-notes";
const SAMPLE_OPENAPI = `openapi: 3.0.3
info:
  title: DevTools API
  version: 1.0.0
  description: Example API specification.
servers:
  - url: https://api.example.com
paths:
  /users:
    get:
      tags: [Users]
      summary: List users
      responses:
        "200":
          description: OK
    post:
      tags: [Users]
      summary: Create user
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/User"
      responses:
        "201":
          description: Created
components:
  schemas:
    User:
      type: object
      required: [id, name]
      properties:
        id: { type: string, example: usr_123 }
        name: { type: string, example: Ada }
        email: { type: string, format: email }`;

const SCRIPT_LANGUAGES = [
  { label: "Python", language: "python", version: "3.12.0", code: "name = input().strip() or 'World'\nprint(f'Hello, {name}!')" },
  { label: "Ruby", language: "ruby", version: "3.0.1", code: "name = STDIN.read.strip\nputs \"Hello, #{name.empty? ? 'World' : name}!\"" },
  { label: "PHP", language: "php", version: "8.2.3", code: "<?php\n$name = trim(stream_get_contents(STDIN)) ?: 'World';\necho \"Hello, $name!\\n\";" },
  { label: "Perl", language: "perl", version: "5.36.0", code: "my $name = <STDIN> || 'World';\nchomp $name;\nprint \"Hello, $name!\\n\";" },
  { label: "Bash", language: "bash", version: "5.2.0", code: "read name\nname=${name:-World}\necho \"Hello, $name!\"" },
  { label: "Lua", language: "lua", version: "5.4.4", code: "local name = io.read('*l') or 'World'\nprint('Hello, ' .. name .. '!')" },
];

export function ExtraToolPage({ slug }: { slug: ExtraToolSlug }) {
  if (slug === "env-manager") return <EnvManager />;
  if (slug === "openapi-viewer") return <OpenApiViewer />;
  if (slug === "redoc-viewer") return <RedocViewer />;
  if (slug === "openapi-validator") return <OpenApiValidator />;
  if (slug === "openapi-schema-explorer") return <OpenApiSchemaExplorer />;
  if (slug === "status-badges") return <StatusBadges />;
  if (slug === "testcase-runner") return <TestcaseRunner />;
  if (slug === "code-share") return <CodeShare />;
  if (slug === "request-history") return <RequestHistory />;
  if (slug === "zk-paste") return <ZkPaste />;
  return <CollabNotes />;
}

function safeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private or hardened browser contexts.
  }
}

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseDocument(input: string): { spec: JsonRecord | null; error: string } {
  try {
    const parsed = yaml.load(input) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { spec: null, error: "Spec must be a JSON or YAML object." };
    return { spec: parsed as JsonRecord, error: "" };
  } catch (error) {
    return { spec: null, error: error instanceof Error ? error.message : "Could not parse spec." };
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getOperations(spec: JsonRecord): Operation[] {
  const paths = asRecord(spec.paths);
  const operations: Operation[] = [];
  for (const [path, pathItem] of Object.entries(paths)) {
    const item = asRecord(pathItem);
    for (const method of HTTP_METHODS) {
      const operation = asRecord(item[method]);
      if (!Object.keys(operation).length) continue;
      operations.push({
        method: method.toUpperCase(),
        path,
        tag: String(asArray(operation.tags)[0] ?? "Default"),
        summary: String(operation.summary ?? ""),
        description: String(operation.description ?? ""),
        operation,
      });
    }
  }
  return operations;
}

function getSchemas(spec: JsonRecord): JsonRecord {
  return asRecord(asRecord(spec.components).schemas ?? spec.definitions);
}

function getBaseUrl(spec: JsonRecord) {
  const servers = asArray(spec.servers);
  const firstServer = asRecord(servers[0]);
  return String(firstServer.url ?? spec.host ?? "-");
}

function methodClass(method: string) {
  const map: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    POST: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    PUT: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  };
  return `rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${map[method] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`;
}

function SpecInput({ input, setInput, onFile }: { input: string; setInput: (value: string) => void; onFile?: (text: string) => void }) {
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setInput(text);
    onFile?.(text);
  }
  return (
    <Panel noPadding className="space-y-3 p-4">
      <ToolTextarea label="OpenAPI JSON/YAML" value={input} onChange={(event) => setInput(event.target.value)} rows={12} className="font-mono" />
      <ToolInput label="Upload .json/.yaml" type="file" accept=".json,.yaml,.yml,application/json,text/yaml" onChange={upload} />
    </Panel>
  );
}

function OperationDetails({ operation }: { operation: Operation }) {
  const params = [...asArray(operation.operation.parameters), ...asArray(asRecord(operation.operation.requestBody).parameters)];
  const requestBody = asRecord(operation.operation.requestBody);
  const responses = asRecord(operation.operation.responses);
  return (
    <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {operation.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{operation.description}</p>}
      <div>
        <Label>Parameters</Label>
        <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
          <table className="w-full text-sm">
            <tbody>
              {params.length ? params.map((param, index) => {
                const p = asRecord(param);
                return <tr key={index} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"><td className="px-3 py-2 font-mono">{String(p.name ?? "-")}</td><td className="px-3 py-2">{String(p.in ?? "-")}</td><td className="px-3 py-2">{p.required ? "required" : "optional"}</td></tr>;
              }) : <tr><td className="px-3 py-2 text-zinc-500">No parameters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel noPadding className="p-3"><Label>Request body</Label><CodeBlock value={JSON.stringify(requestBody, null, 2)} /></Panel>
        <Panel noPadding className="p-3"><Label>Responses</Label><CodeBlock value={JSON.stringify(responses, null, 2)} /></Panel>
      </div>
    </div>
  );
}

function OpenApiSummary({ spec }: { spec: JsonRecord }) {
  const info = asRecord(spec.info);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <ResultCard label="Title" value={String(info.title ?? "Untitled API")} />
      <ResultCard label="Version" value={String(info.version ?? "-")} />
      <ResultCard label="Spec" value={String(spec.openapi ?? spec.swagger ?? "Unknown")} />
      <ResultCard label="Base URL" value={getBaseUrl(spec)} />
    </div>
  );
}

function OpenApiViewer() {
  const [input, setInput] = useState(SAMPLE_OPENAPI);
  const [expanded, setExpanded] = useState("");
  const parsed = useMemo(() => parseDocument(input), [input]);
  const operations = useMemo(() => parsed.spec ? getOperations(parsed.spec) : [], [parsed.spec]);
  const groups = useMemo(() => {
    const map = new Map<string, Operation[]>();
    operations.forEach((operation) => map.set(operation.tag, [...(map.get(operation.tag) ?? []), operation]));
    return Array.from(map.entries());
  }, [operations]);
  return (
    <ToolShell slug="openapi-viewer">
      <div className="space-y-5">
        <SpecInput input={input} setInput={setInput} />
        {parsed.error && <ErrorCard>{parsed.error}</ErrorCard>}
        {parsed.spec && <OpenApiSummary spec={parsed.spec} />}
        {parsed.spec && <Panel noPadding className="p-4"><Label>Description</Label><p className="text-sm text-zinc-600 dark:text-zinc-300">{String(asRecord(parsed.spec.info).description ?? "No description.")}</p></Panel>}
        {groups.map(([tag, items]) => (
          <Panel key={tag} noPadding className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tag}</h2>
            <div className="space-y-2">
              {items.map((operation) => {
                const id = `${operation.method} ${operation.path}`;
                return (
                  <div key={id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                    <button type="button" onClick={() => setExpanded(expanded === id ? "" : id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                      <span className={methodClass(operation.method)}>{operation.method}</span>
                      <code className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{operation.path}</code>
                      <span className="text-sm text-zinc-500">{operation.summary || "No summary"}</span>
                    </button>
                    {expanded === id && <OperationDetails operation={operation} />}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </ToolShell>
  );
}

function RedocViewer() {
  const [input, setInput] = useState(SAMPLE_OPENAPI);
  const parsed = useMemo(() => parseDocument(input), [input]);
  const operations = useMemo(() => parsed.spec ? getOperations(parsed.spec) : [], [parsed.spec]);
  const [selected, setSelected] = useState("");
  const active = operations.find((operation) => `${operation.method} ${operation.path}` === selected) ?? operations[0];
  const curl = active && parsed.spec ? `curl -X ${active.method} '${getBaseUrl(parsed.spec).replace(/\/$/, "")}${active.path}'` : "";
  return (
    <ToolShell slug="redoc-viewer">
      <div className="space-y-5">
        <SpecInput input={input} setInput={setInput} onFile={() => setSelected("")} />
        {parsed.error && <ErrorCard>{parsed.error}</ErrorCard>}
        {parsed.spec && <OpenApiSummary spec={parsed.spec} />}
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Panel noPadding className="max-h-[70vh] overflow-y-auto p-3">
            <Label>Endpoints</Label>
            {operations.map((operation) => {
              const id = `${operation.method} ${operation.path}`;
              return <button key={id} type="button" onClick={() => setSelected(id)} className={`mt-2 block w-full rounded-xl border px-3 py-2 text-left text-sm ${active === operation ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-zinc-100 dark:border-zinc-800"}`}><span className={methodClass(operation.method)}>{operation.method}</span><code className="ml-2 font-mono">{operation.path}</code></button>;
            })}
          </Panel>
          <Panel noPadding className="space-y-4 p-4">
            {active ? (
              <>
                <div><span className={methodClass(active.method)}>{active.method}</span><code className="ml-2 font-mono text-zinc-900 dark:text-zinc-100">{active.path}</code></div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{active.summary || "Untitled endpoint"}</h2>
                <OperationDetails operation={active} />
                <Panel noPadding className="p-3"><Label>Try it out: cURL</Label><CodeBlock value={curl} /><CopyButton value={curl} label="Copy cURL" /></Panel>
              </>
            ) : <p className="text-sm text-zinc-500">No endpoints found.</p>}
          </Panel>
        </div>
      </div>
    </ToolShell>
  );
}

function OpenApiValidator() {
  const [input, setInput] = useState(SAMPLE_OPENAPI);
  const parsed = useMemo(() => parseDocument(input), [input]);
  const report = useMemo(() => parsed.spec ? validateOpenApi(parsed.spec, input) : { errors: [parsed.error], warnings: [], stats: null }, [input, parsed.error, parsed.spec]);
  return (
    <ToolShell slug="openapi-validator">
      <div className="space-y-5">
        <SpecInput input={input} setInput={setInput} />
        <div className="grid gap-3 md:grid-cols-3">
          <ResultCard label="Errors" value={String(report.errors.length)} variant={report.errors.length ? "error" : "success"} />
          <ResultCard label="Warnings" value={String(report.warnings.length)} />
          <ResultCard label="Status" value={report.errors.length ? "Invalid" : "Valid"} variant={report.errors.length ? "error" : "success"} />
        </div>
        <ValidationList title="Errors" items={report.errors} variant="error" empty="No structural errors found." />
        <ValidationList title="Warnings" items={report.warnings} variant="warning" empty="No warnings found." />
        {report.stats && <div className="grid gap-3 md:grid-cols-3"><ResultCard label="Endpoints" value={String(report.stats.endpoints)} /><ResultCard label="Tags" value={String(report.stats.tags)} /><ResultCard label="Schemas" value={String(report.stats.schemas)} /></div>}
      </div>
    </ToolShell>
  );
}

function ValidationList({ title, items, variant, empty }: { title: string; items: string[]; variant: "error" | "warning"; empty: string }) {
  return <Panel noPadding className="p-4"><Label>{title}</Label><div className="mt-2 space-y-2">{items.length ? items.map((item) => <Badge key={item} variant={variant}>{item}</Badge>) : <Badge variant="success">{empty}</Badge>}</div></Panel>;
}

function validateOpenApi(spec: JsonRecord, input: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lineOf = (needle: string) => {
    const index = input.split(/\r?\n/).findIndex((line) => line.includes(needle));
    return index >= 0 ? `line ${index + 1}: ` : "";
  };
  const version = spec.openapi ?? spec.swagger;
  if (!version) errors.push("Missing openapi or swagger version.");
  if (!asRecord(spec.info).title) errors.push(`${lineOf("info")}Missing info.title.`);
  if (!asRecord(spec.info).version) errors.push(`${lineOf("info")}Missing info.version.`);
  if (!Object.keys(asRecord(spec.paths)).length) errors.push("Missing or empty paths object.");
  const operations = getOperations(spec);
  const operationIds = new Set<string>();
  const securitySchemes = asRecord(asRecord(spec.components).securitySchemes);
  operations.forEach((operation) => {
    if (!Object.keys(asRecord(operation.operation.responses)).length) errors.push(`${operation.method} ${operation.path}: missing responses.`);
    asArray(operation.operation.parameters).forEach((param, index) => {
      const p = asRecord(param);
      if (!p.name || !p.in) errors.push(`${operation.method} ${operation.path}: parameter ${index + 1} needs name and in.`);
    });
    const operationId = operation.operation.operationId;
    if (typeof operationId === "string") {
      if (operationIds.has(operationId)) errors.push(`Duplicate operationId: ${operationId}.`);
      operationIds.add(operationId);
    } else {
      warnings.push(`${operation.method} ${operation.path}: missing operationId.`);
    }
    asArray(operation.operation.security).forEach((security) => {
      Object.keys(asRecord(security)).forEach((name) => {
        if (!securitySchemes[name]) errors.push(`${operation.method} ${operation.path}: security scheme ${name} is not defined.`);
      });
    });
  });
  findRefs(spec).forEach((ref) => {
    if (ref.startsWith("#/") && !resolvePointer(spec, ref)) errors.push(`Unresolved reference: ${ref}.`);
  });
  const tags = new Set(operations.map((operation) => operation.tag));
  return { errors, warnings, stats: { endpoints: operations.length, tags: tags.size, schemas: Object.keys(getSchemas(spec)).length } };
}

function findRefs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(findRefs);
  if (!value || typeof value !== "object") return [];
  const record = value as JsonRecord;
  return Object.entries(record).flatMap(([key, nested]) => key === "$ref" && typeof nested === "string" ? [nested] : findRefs(nested));
}

function resolvePointer(root: JsonRecord, ref: string) {
  return ref.slice(2).split("/").reduce<unknown>((node, part) => asRecord(node)[part.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

function OpenApiSchemaExplorer() {
  const [input, setInput] = useState(SAMPLE_OPENAPI);
  const [query, setQuery] = useState("");
  const parsed = useMemo(() => parseDocument(input), [input]);
  const schemas = parsed.spec ? getSchemas(parsed.spec) : {};
  const names = Object.keys(schemas).filter((name) => name.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState("");
  const activeName = selected && schemas[selected] ? selected : names[0];
  const active = asRecord(schemas[activeName]);
  return (
    <ToolShell slug="openapi-schema-explorer">
      <div className="space-y-5">
        <SpecInput input={input} setInput={setInput} />
        {parsed.error && <ErrorCard>{parsed.error}</ErrorCard>}
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Panel noPadding className="p-4"><ToolInput label="Search schemas" value={query} onChange={(event) => setQuery(event.target.value)} />{names.map((name) => <button key={name} type="button" onClick={() => setSelected(name)} className={`mt-2 block w-full rounded-xl px-3 py-2 text-left text-sm ${name === activeName ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>{name}</button>)}</Panel>
          <Panel noPadding className="space-y-4 p-4">
            {activeName ? <SchemaView name={activeName} schema={active} schemas={schemas} seen={new Set()} /> : <p className="text-sm text-zinc-500">No schemas found.</p>}
            {activeName && <><Label>Dependency graph</Label><CodeBlock value={schemaGraph(activeName, schemas)} /><CopyButton value={JSON.stringify(active, null, 2)} label="Copy JSON Schema" /></>}
          </Panel>
        </div>
      </div>
    </ToolShell>
  );
}

function SchemaView({ name, schema, schemas, seen }: { name: string; schema: JsonRecord; schemas: JsonRecord; seen: Set<string> }) {
  const required = new Set(asArray(schema.required).map(String));
  const properties = asRecord(schema.properties);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{name}</h2>
      {Object.entries(properties).map(([prop, value]) => {
        const field = asRecord(value);
        const ref = typeof field.$ref === "string" ? field.$ref : "";
        const refName = ref.split("/").pop() ?? "";
        return (
          <div key={prop} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2"><code>{prop}</code><Badge variant={required.has(prop) ? "warning" : "default"}>{required.has(prop) ? "required" : "optional"}</Badge><Badge>{String(field.type ?? refName ?? "object")}</Badge></div>
            {field.example !== undefined && <p className="mt-1 text-xs text-zinc-500">Example: {JSON.stringify(field.example)}</p>}
            {refName && Boolean(schemas[refName]) && !seen.has(refName) && <div className="mt-3 border-l border-zinc-200 pl-3 dark:border-zinc-700"><SchemaView name={refName} schema={asRecord(schemas[refName])} schemas={schemas} seen={new Set([...seen, refName])} /></div>}
          </div>
        );
      })}
    </div>
  );
}

function schemaGraph(name: string, schemas: JsonRecord, depth = 0, seen = new Set<string>()): string {
  if (seen.has(name)) return `${"  ".repeat(depth)}${name} (cycle)`;
  const schema = asRecord(schemas[name]);
  const refs = findRefs(schema).map((ref) => ref.split("/").pop() ?? ref);
  if (!refs.length) return `${"  ".repeat(depth)}${name}`;
  return [`${"  ".repeat(depth)}${name}`, ...refs.map((ref) => `${"  ".repeat(depth + 1)}uses -> ${schemaGraph(ref, schemas, depth + 2, new Set([...seen, name])).trimStart()}`)].join("\n");
}

function EnvManager() {
  const [rows, setRows] = useState<EnvRow[]>([]);
  const [block, setBlock] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState(false);
  useEffect(() => setRows(safeJson<EnvRow[]>(ENV_KEY, [])), []);
  useEffect(() => writeJson(ENV_KEY, rows), [rows]);
  const visible = rows.filter((row) => row.key.toLowerCase().includes(filter.toLowerCase())).sort((a, b) => sort ? a.key.localeCompare(b.key) : 0);
  const env = visible.map((row) => `${row.key}=${quoteEnv(row.value)}`).join("\n");
  const json = JSON.stringify(Object.fromEntries(visible.map((row) => [row.key, row.value])), null, 2);
  const shell = visible.map((row) => `export ${row.key}=${quoteEnv(row.value)}`).join("\n");
  const docker = visible.map((row) => `--env ${row.key}=${quoteEnv(row.value)}`).join(" ");
  const k8s = JSON.stringify(Object.fromEntries(visible.map((row) => [row.key, btoa(unescape(encodeURIComponent(row.value)))])), null, 2);
  function addRow() { setRows((items) => [...items, { id: safeId(), key: "", value: "", visible: false }]); }
  function importBlock() { setRows(parseEnv(block).map(([key, value]) => ({ id: safeId(), key, value, visible: false }))); }
  function update(id: string, patch: Partial<EnvRow>) { setRows((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  return (
    <ToolShell slug="env-manager">
      <div className="space-y-5">
        <Panel noPadding className="p-4"><Badge variant="warning">Variables are stored in your browser only. Never store production secrets here.</Badge></Panel>
        <div className="grid gap-4 lg:grid-cols-2"><Panel noPadding className="space-y-3 p-4"><ToolTextarea label=".env import" value={block} onChange={(event) => setBlock(event.target.value)} rows={8} /><Button onClick={importBlock}>Import block</Button></Panel><Panel noPadding className="space-y-3 p-4"><div className="flex flex-wrap gap-2"><Button variant="primary" onClick={addRow}><Plus className="h-4 w-4" /> Add variable</Button><Button variant="danger" onClick={() => window.confirm("Clear all variables?") && setRows([])}>Clear all</Button><CopyButton value={env} label="Copy .env" /><CopyButton value={json} label="Copy JSON" /></div><ToolInput label="Filter by key" value={filter} onChange={(event) => setFilter(event.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sort} onChange={(event) => setSort(event.target.checked)} /> Sort alphabetically</label></Panel></div>
        <Panel noPadding>{visible.map((row) => <div key={row.id} className="grid gap-2 border-b border-zinc-100 p-3 last:border-b-0 dark:border-zinc-800 md:grid-cols-[1fr_1fr_auto_auto]"><ToolInput value={row.key} onChange={(event) => update(row.id, { key: event.target.value })} placeholder="KEY" className="font-mono" /><ToolInput type={row.visible ? "text" : "password"} value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} placeholder="value" className="font-mono" /><Button onClick={() => update(row.id, { visible: !row.visible })}>{row.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="danger" onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}><Trash2 className="h-4 w-4" /></Button></div>)}</Panel>
        <div className="grid gap-4 lg:grid-cols-2"><FormatOutput label=".env" value={env} /><FormatOutput label="JSON" value={json} /><FormatOutput label="Shell exports" value={shell} /><FormatOutput label="Docker flags" value={docker} /><FormatOutput label="K8s secret data" value={k8s} /></div>
      </div>
    </ToolShell>
  );
}

function quoteEnv(value: string) { return /^[A-Za-z0-9_./:-]*$/.test(value) ? value : JSON.stringify(value); }
function parseEnv(block: string) { return block.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => { const index = line.indexOf("="); return index === -1 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")]; }) as [string, string][]; }
function FormatOutput({ label, value }: { label: string; value: string }) { return <Panel noPadding className="p-4"><div className="mb-2 flex justify-between gap-2"><Label>{label}</Label><CopyButton value={value} label="Copy" /></div><ToolTextarea value={value} readOnly rows={8} className="font-mono" /></Panel>; }

function StatusBadges() {
  const [label, setLabel] = useState("build");
  const [status, setStatus] = useState("passing");
  const [color, setColor] = useState("green");
  const [customColor, setCustomColor] = useState("#10b981");
  const [style, setStyle] = useState("flat");
  const actualColor = color === "custom" ? customColor : color;
  const svg = badgeSvg(label, status, actualColor, style);
  const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
  const shields = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(status)}-${encodeURIComponent(actualColor.replace("#", ""))}?style=${style}`;
  return (
    <ToolShell slug="status-badges">
      <div className="space-y-5">
        <Panel noPadding className="grid gap-4 p-4 md:grid-cols-5"><ToolInput label="Label" value={label} onChange={(event) => setLabel(event.target.value)} /><ToolInput label="Status" value={status} onChange={(event) => setStatus(event.target.value)} /><ToolSelect label="Color" value={color} onChange={(event) => setColor(event.target.value)}>{["green", "yellow", "red", "blue", "gray", "orange", "custom"].map((item) => <option key={item}>{item}</option>)}</ToolSelect><ToolSelect label="Style" value={style} onChange={(event) => setStyle(event.target.value)}>{["flat", "flat-square", "plastic", "for-the-badge"].map((item) => <option key={item}>{item}</option>)}</ToolSelect><ToolInput label="Custom color" type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} /></Panel>
        <div className="flex flex-wrap gap-2">{[["build", "passing", "green"], ["build", "failing", "red"], ["uptime", "99.9%", "green"], ["version", "1.0", "blue"], ["license", "MIT", "gray"]].map(([a, b, c]) => <Button key={`${a}-${b}`} onClick={() => { setLabel(a); setStatus(b); setColor(c); }}>{a} {b}</Button>)}</div>
        <Panel noPadding className="p-6 text-center"><img src={encoded} alt={`${label} ${status}`} className="mx-auto" /></Panel>
        <div className="grid gap-4 lg:grid-cols-2"><FormatOutput label="SVG code" value={svg} /><FormatOutput label="Markdown" value={`[![${label}](${shields})](https://devtools.wellfriend.online/status)`} /><FormatOutput label="HTML" value={`<img src="${shields}" alt="${label}: ${status}">`} /><FormatOutput label="Shields URL" value={shields} /></div>
        <Button onClick={() => downloadText(`${label}-${status}.svg`, svg, "image/svg+xml")}><Download className="h-4 w-4" /> Download SVG</Button>
      </div>
    </ToolShell>
  );
}

function badgeSvg(label: string, status: string, color: string, style: string) {
  const colors: Record<string, string> = { green: "#10b981", yellow: "#f59e0b", red: "#ef4444", blue: "#3b82f6", gray: "#71717a", orange: "#f97316" };
  const right = colors[color] ?? color;
  const lw = Math.max(60, label.length * 9 + 20);
  const rw = Math.max(70, status.length * 9 + 20);
  const height = style === "for-the-badge" ? 28 : 22;
  const radius = style === "flat-square" ? 0 : style === "plastic" ? 6 : 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="${height}" role="img" aria-label="${label}: ${status}"><rect width="${lw}" height="${height}" fill="#555" rx="${radius}"/><rect x="${lw}" width="${rw}" height="${height}" fill="${right}" rx="${radius}"/><text x="${lw / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="#fff" font-family="Verdana,sans-serif" font-size="11">${escapeXml(label)}</text><text x="${lw + rw / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="#fff" font-family="Verdana,sans-serif" font-size="11">${escapeXml(status)}</text></svg>`;
}

function TestcaseRunner() {
  const [lang, setLang] = useState("python");
  const active = SCRIPT_LANGUAGES.find((item) => item.language === lang) ?? SCRIPT_LANGUAGES[0];
  const [code, setCode] = useState(active.code);
  const [cases, setCases] = useState<TestCase[]>([{ id: safeId(), name: "Sample", stdin: "Ada", expected: "Hello, Ada!", actual: "", status: "pending" }]);
  const [running, setRunning] = useState(false);
  const passed = cases.filter((item) => item.status === "passed").length;
  useEffect(() => setCode(active.code), [active]);
  async function runCase(test: TestCase) {
    setCases((items) => items.map((item) => item.id === test.id ? { ...item, status: "running" } : item));
    const res = await fetch(`${API_BASE}/tools/run-code`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ language: active.language, version: active.version, code, stdin: test.stdin }) });
    const data = (await res.json().catch(() => ({}))) as { stdout?: string; output?: string; stderr?: string };
    const actual = data.stdout ?? data.output ?? data.stderr ?? "";
    const ok = !test.expected.trim() || actual.trim() === test.expected.trim();
    setCases((items) => items.map((item) => item.id === test.id ? { ...item, actual, status: ok ? "passed" : "failed" } : item));
  }
  async function runAll() { setRunning(true); for (const item of cases) await runCase(item); setRunning(false); }
  return (
    <ToolShell slug="testcase-runner">
      <div className="space-y-5"><Panel noPadding className="grid gap-4 p-4 md:grid-cols-[220px_1fr]"><ToolSelect label="Language" value={lang} onChange={(event) => setLang(event.target.value)}>{SCRIPT_LANGUAGES.map((item) => <option key={item.language} value={item.language}>{item.label}</option>)}</ToolSelect><ResultCard label="Passed" value={`${passed}/${cases.length}`} /></Panel><Panel noPadding><CodeArea value={code} onChange={setCode} language={active.label} /></Panel><div className="flex flex-wrap gap-2"><Button variant="primary" onClick={() => void runAll()} disabled={running}><Play className="h-4 w-4" /> Run all</Button><Button onClick={() => setCases((items) => [...items, { id: safeId(), name: `Case ${items.length + 1}`, stdin: "", expected: "", actual: "", status: "pending" }])}>Add case</Button><CopyButton label="Export JSON" value={JSON.stringify(cases, null, 2)} /></div><ToolTextarea label="Import JSON test cases" rows={4} onChange={(event) => { try { const parsed = JSON.parse(event.target.value) as TestCase[]; if (Array.isArray(parsed)) setCases(parsed.map((item) => ({ ...item, id: item.id ?? safeId(), status: "pending", actual: "" }))); } catch {} }} />{cases.map((test) => <Panel key={test.id} noPadding className="space-y-3 p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><ToolInput value={test.name} onChange={(event) => setCases((items) => items.map((item) => item.id === test.id ? { ...item, name: event.target.value } : item))} /><Badge variant={test.status === "passed" ? "success" : test.status === "failed" ? "error" : "default"}>{test.status}</Badge><Button onClick={() => void runCase(test)} disabled={test.status === "running"}>Run</Button></div><div className="grid gap-3 md:grid-cols-3"><ToolTextarea label="stdin" value={test.stdin} onChange={(event) => setCases((items) => items.map((item) => item.id === test.id ? { ...item, stdin: event.target.value } : item))} rows={5} /><ToolTextarea label="Expected output" value={test.expected} onChange={(event) => setCases((items) => items.map((item) => item.id === test.id ? { ...item, expected: event.target.value } : item))} rows={5} /><ToolTextarea label="Actual output" value={test.actual} readOnly rows={5} /></div></Panel>)}</div>
    </ToolShell>
  );
}

function CodeShare() {
  const [lang, setLang] = useState("python");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(SCRIPT_LANGUAGES[0].code);
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get("code");
    if (params.get("lang")) setLang(params.get("lang") ?? "python");
    if (params.get("title")) setTitle(params.get("title") ?? "");
    if (encoded) setCode(decodeText(encoded));
  }, []);
  useEffect(() => { if (link) void QRCode.toDataURL(link).then(setQr).catch(() => setQr("")); }, [link]);
  function createLink() {
    const url = `${location.origin}/tools/code-share?lang=${encodeURIComponent(lang)}&code=${encodeURIComponent(encodeText(code))}${title ? `&title=${encodeURIComponent(title)}` : ""}`;
    setLink(url);
  }
  async function savePaste() {
    setSaving(true);
    try {
      const paste = await createPaste({ content: code, language: lang, title: title || "Shared code", expires_in: "30d" });
      setLink(paste.url);
    } finally {
      setSaving(false);
    }
  }
  return (
    <ToolShell slug="code-share"><div className="space-y-5"><Panel noPadding className="grid gap-4 p-4 md:grid-cols-3"><ToolSelect label="Language" value={lang} onChange={(event) => setLang(event.target.value)}>{SCRIPT_LANGUAGES.map((item) => <option key={item.language} value={item.language}>{item.label}</option>)}</ToolSelect><ToolInput label="Title" value={title} onChange={(event) => setTitle(event.target.value)} /><div className="flex items-end gap-2"><Button variant="primary" onClick={createLink}>Create shareable link</Button><Button onClick={savePaste} disabled={saving}>{saving ? "Saving..." : "Save as paste"}</Button></div></Panel><Panel noPadding><CodeArea value={code} onChange={setCode} language={lang} /></Panel>{link && <Panel noPadding className="space-y-3 p-4"><ResultCard label="Share URL" value={link} copyable mono /><div className="flex flex-wrap gap-2"><Button onClick={() => { sessionStorage.setItem("devtools:code-share-run", JSON.stringify({ lang, code })); location.href = `/tools/scripting-runner?lang=${encodeURIComponent(lang)}`; }}>Run in runner</Button><CopyButton value={link} label="Copy link" /></div>{qr && <img src={qr} alt="Share link QR code" className="h-40 w-40 rounded-xl bg-white p-2" />}</Panel>}</div></ToolShell>
  );
}

function encodeText(value: string) { return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function decodeText(value: string) { return decodeURIComponent(escape(atob(value.replace(/-/g, "+").replace(/_/g, "/")))); }

function RequestHistory() {
  const [items, setItems] = useState<RequestHistoryEntry[]>([]);
  const [tool, setTool] = useState("All");
  const [query, setQuery] = useState("");
  useEffect(() => setItems(loadRequestHistory()), []);
  const tools = ["All", ...Array.from(new Set(items.map((item) => item.tool)))];
  const visible = items.filter((item) => (tool === "All" || item.tool === tool) && `${item.input} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  function replay(item: RequestHistoryEntry) {
    const path = toolPath(item.tool);
    location.href = `${path}?input=${encodeURIComponent(item.input)}`;
  }
  return (
    <ToolShell slug="request-history"><div className="space-y-5"><Panel noPadding className="grid gap-4 p-4 md:grid-cols-[1fr_220px_auto_auto]"><ToolInput label="Search URL/domain/IP" value={query} onChange={(event) => setQuery(event.target.value)} /><ToolSelect label="Tool" value={tool} onChange={(event) => setTool(event.target.value)}>{tools.map((item) => <option key={item}>{item}</option>)}</ToolSelect><Button variant="danger" onClick={() => { localStorage.removeItem(REQUEST_HISTORY_KEY); setItems([]); }}>Clear history</Button><CopyButton value={JSON.stringify(items, null, 2)} label="Export JSON" /></Panel><Panel noPadding>{visible.length ? visible.map((item) => <button key={`${item.timestamp}-${item.tool}-${item.input}`} type="button" onClick={() => replay(item)} className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"><div className="flex flex-wrap items-center gap-2"><Badge>{item.tool}</Badge><code className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{item.input}</code><span className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleString()}</span></div><p className="mt-1 text-sm text-zinc-500">{item.summary}</p></button>) : <p className="p-6 text-center text-sm text-zinc-500">No request history yet.</p>}</Panel></div></ToolShell>
  );
}

function toolPath(tool: string) {
  const map: Record<string, string> = { "HTTP Headers": "/tools/http-headers", "DNS Lookup": "/tools/dns-lookup", "WHOIS Lookup": "/tools/whois-lookup", "SSL Checker": "/tools/ssl-checker", "Redirect Checker": "/tools/redirect-checker", "IP Lookup": "/tools/ip-lookup", "SPF Checker": "/tools/spf-checker" };
  return map[tool] ?? "/tools";
}

function ZkPaste() {
  const [text, setText] = useState("");
  const [expiry, setExpiry] = useState<ExpiresIn>("24h");
  const [burn, setBurn] = useState(false);
  const [share, setShare] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const key = location.hash.slice(1);
    if (!id || !key) return;
    setBusy(true);
    setTimeout(() => {
      void decryptPaste(id, key).then(setDecrypted).catch((err) => setError(err instanceof Error ? err.message : "Could not decrypt paste.")).finally(() => setBusy(false));
    }, 0);
  }, []);
  async function encryptAndSave() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      void createEncryptedPaste(text, expiry, burn)
        .then(setShare)
        .catch((err) => setError(err instanceof Error ? err.message : "Could not create encrypted paste."))
        .finally(() => setBusy(false));
    }, 0);
  }
  return (
    <ToolShell slug="zk-paste"><div className="space-y-5"><Panel noPadding className="space-y-2 p-4"><Badge variant="info">The server never sees your plaintext.</Badge><p className="text-sm text-zinc-600 dark:text-zinc-300">Type your secret text. Your browser generates an AES-256-GCM key, encrypts locally, stores only encrypted content, and puts the key after # in the share URL. If you lose the link, the content cannot be recovered.</p></Panel>{error && <ErrorCard>{error}</ErrorCard>}{decrypted ? <Panel noPadding className="p-4"><Label>Decrypted content</Label><ToolTextarea value={decrypted} readOnly rows={12} /></Panel> : <><ToolTextarea label="Secret text" value={text} onChange={(event) => setText(event.target.value)} rows={12} /><div className="flex flex-wrap items-end gap-3"><ToolSelect label="Expiry" value={expiry} onChange={(event) => setExpiry(event.target.value as ExpiresIn)}>{["1h", "6h", "24h", "7d", "30d", "never"].map((item) => <option key={item}>{item}</option>)}</ToolSelect><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={burn} onChange={(event) => setBurn(event.target.checked)} /> Burn after read</label><Button variant="primary" onClick={encryptAndSave} disabled={!text || busy}>{busy ? "Encrypting..." : "Encrypt and create paste"}</Button></div>{share && <ResultCard label="Share URL with key fragment" value={share} copyable mono />}</>}</div></ToolShell>
  );
}

async function createEncryptedPaste(text: string, expiry: ExpiresIn, burn: boolean) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const payload = JSON.stringify({ v: 1, iv: bytesToBase64Url(iv), data: bytesToBase64Url(encrypted) });
  const paste = await createPaste({ content: payload, language: "text", title: "Zero-knowledge paste", expires_in: expiry, burn_after_read: burn });
  return `${location.origin}/tools/zk-paste?id=${encodeURIComponent(paste.id)}#${bytesToBase64Url(rawKey)}`;
}

async function decryptPaste(id: string, keyValue: string) {
  const paste = await getPaste(id);
  const payload = JSON.parse(paste.content ?? "{}") as { iv: string; data: string };
  const key = await crypto.subtle.importKey("raw", base64UrlToBytes(keyValue), { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(payload.iv) }, key, base64UrlToBytes(payload.data));
  return new TextDecoder().decode(decrypted);
}

function bytesToBase64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlToBytes(value: string) { const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)); }

function CollabNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [preview, setPreview] = useState(false);
  useEffect(() => { const loaded = safeJson<Note[]>(NOTES_KEY, []); setNotes(loaded.length ? loaded : [newNote()]); setActiveId(loaded[0]?.id ?? ""); }, []);
  useEffect(() => { const timer = window.setTimeout(() => writeJson(NOTES_KEY, notes), 2000); return () => window.clearTimeout(timer); }, [notes]);
  const active = notes.find((note) => note.id === activeId) ?? notes[0];
  const visible = notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()));
  const html = useMemo(() => active ? DOMPurify.sanitize(marked.parse(active.content, { async: false }) as string) : "", [active]);
  function update(patch: Partial<Note>) { setNotes((items) => items.map((note) => note.id === active?.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note)); }
  function importMd(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; void file.text().then((content) => { const note = newNote(file.name.replace(/\.md$/i, ""), content); setNotes((items) => [note, ...items]); setActiveId(note.id); }); }
  return (
    <ToolShell slug="collab-notes"><div className="space-y-5"><Panel noPadding className="p-4"><Badge variant="info">Local Notes. Sync coming soon.</Badge></Panel><div className="grid gap-4 lg:grid-cols-[280px_1fr]"><Panel noPadding className="space-y-3 p-3"><ToolInput label="Search notes" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="primary" onClick={() => { const note = newNote(); setNotes((items) => [note, ...items]); setActiveId(note.id); }}>New note</Button><ToolInput type="file" accept=".md,text/markdown,text/plain" onChange={importMd} />{visible.map((note) => <button key={note.id} onClick={() => setActiveId(note.id)} className={`block w-full rounded-xl px-3 py-2 text-left ${note.id === active?.id ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}><span className="block truncate text-sm font-medium">{note.title}</span><span className="text-xs text-zinc-500">{new Date(note.updatedAt).toLocaleString()}</span></button>)}</Panel>{active && <Panel noPadding className="space-y-3 p-4"><ToolInput label="Title" value={active.title} onChange={(event) => update({ title: event.target.value })} /><div className="flex flex-wrap gap-2"><Button onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</Button><Button onClick={() => downloadText(`${active.title || "note"}.md`, active.content, "text/markdown")}>Export note</Button><Button onClick={() => downloadText("devtools-notes.json", JSON.stringify(notes, null, 2), "application/json")}>Export all JSON</Button><Button variant="danger" onClick={() => window.confirm("Delete note?") && setNotes((items) => items.filter((note) => note.id !== active.id))}>Delete</Button><Badge>{active.content.trim().split(/\s+/).filter(Boolean).length} words</Badge></div>{preview ? <div className="markdown-preview rounded-xl border border-zinc-200 p-4 dark:border-zinc-800" dangerouslySetInnerHTML={{ __html: html }} /> : <ToolTextarea value={active.content} onChange={(event) => update({ content: event.target.value })} rows={20} />}</Panel>}</div></div></ToolShell>
  );
}

function newNote(title = "Untitled note", content = "# New note\n\nStart writing..."): Note {
  const now = new Date().toISOString();
  return { id: safeId(), title, content, createdAt: now, updatedAt: now };
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
