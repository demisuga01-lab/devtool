"use client";

import { ChangeEvent, useMemo, useState } from "react";
import yaml from "js-yaml";
import { BookOpen, Eye, FileCode, GitBranch, ShieldCheck } from "lucide-react";
import { Badge, CodeBlock, CopyButton, ErrorCard, ResultCard } from "@/components/tool-ui";
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

type Tab = "viewer" | "validator" | "schema" | "redoc";
type JsonRecord = Record<string, unknown>;
type Operation = { method: string; path: string; tag: string; summary: string; description: string; operation: JsonRecord };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "viewer", label: "Viewer", icon: Eye },
  { id: "validator", label: "Validator", icon: ShieldCheck },
  { id: "schema", label: "Schema Explorer", icon: GitBranch },
  { id: "redoc", label: "Redoc", icon: BookOpen },
];

const methods = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];
const sampleSpec = `openapi: 3.0.3
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

export default function OpenApiWorkspacePage() {
  const [active, setActive] = useState<Tab>("viewer");
  const [input, setInput] = useState(sampleSpec);
  const [loaded, setLoaded] = useState<JsonRecord | null>(null);
  const [error, setError] = useState("");
  const operations = useMemo(() => loaded ? getOperations(loaded) : [], [loaded]);

  function parse() {
    const parsed = parseDocument(input);
    setLoaded(parsed.spec);
    setError(parsed.error);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setInput(await file.text());
  }

  return (
    <WorkspaceShell
      title="OpenAPI Tools"
      subtitle="View, validate, and explore OpenAPI specifications"
      href="/tools/openapi"
      icon={FileCode}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="openapi"
      intentGroup="inspect"
    >
      <div className="space-y-5">
        <WorkspaceCard className="space-y-4">
          <div>
            <FieldLabel>Paste your OpenAPI spec (JSON or YAML)</FieldLabel>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={10} className={textareaClass} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <input type="file" accept=".json,.yaml,.yml,application/json,text/yaml" onChange={upload} className={inputClass} />
            <SecondaryButton onClick={() => setInput(sampleSpec)}>Load example spec</SecondaryButton>
            <PrimaryButton onClick={parse}>Parse spec</PrimaryButton>
          </div>
          {loaded && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">Spec loaded - OpenAPI {String(loaded.openapi ?? loaded.swagger ?? "unknown")}</div>}
          {error && <ErrorCard>{error}</ErrorCard>}
        </WorkspaceCard>
        {!loaded ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Parse a spec to use the workspace tabs.</div>
        ) : (
          <>
            {active === "viewer" && <ViewerTab spec={loaded} operations={operations} />}
            {active === "validator" && <ValidatorTab spec={loaded} input={input} operations={operations} />}
            {active === "schema" && <SchemaTab spec={loaded} />}
            {active === "redoc" && <RedocTab spec={loaded} operations={operations} />}
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}

function ViewerTab({ spec, operations }: { spec: JsonRecord; operations: Operation[] }) {
  const [expanded, setExpanded] = useState("");
  const groups = useMemo(() => {
    const map = new Map<string, Operation[]>();
    operations.forEach((operation) => map.set(operation.tag, [...(map.get(operation.tag) ?? []), operation]));
    return Array.from(map.entries());
  }, [operations]);

  return (
    <div className="space-y-5">
      <OpenApiSummary spec={spec} operations={operations} />
      {groups.map(([tag, items]) => (
        <WorkspaceCard key={tag}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">{tag}</h2>
          <div className="space-y-2">
            {items.map((operation) => {
              const id = `${operation.method} ${operation.path}`;
              return (
                <div key={id} className="rounded-lg border border-border p-3">
                  <button type="button" onClick={() => setExpanded(expanded === id ? "" : id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                    <span className={methodClass(operation.method)}>{operation.method}</span>
                    <code className="font-mono text-sm text-foreground">{operation.path}</code>
                    <span className="text-sm text-muted-foreground">{operation.summary || "No summary"}</span>
                  </button>
                  {expanded === id && <OperationDetails operation={operation} />}
                </div>
              );
            })}
          </div>
        </WorkspaceCard>
      ))}
    </div>
  );
}

function ValidatorTab({ spec, input, operations }: { spec: JsonRecord; input: string; operations: Operation[] }) {
  const report = validateOpenApi(spec, input, operations);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ResultCard label="Status" value={report.errors.length ? "Invalid" : "Valid"} variant={report.errors.length ? "error" : "success"} />
        <ResultCard label="Errors" value={String(report.errors.length)} variant={report.errors.length ? "error" : "success"} />
        <ResultCard label="Warnings" value={String(report.warnings.length)} />
        <ResultCard label="Endpoints" value={String(operations.length)} />
      </div>
      <ValidationList title="Errors" items={report.errors} variant="error" empty="No structural errors found." />
      <ValidationList title="Warnings" items={report.warnings} variant="warning" empty="No warnings found." />
    </div>
  );
}

function SchemaTab({ spec }: { spec: JsonRecord }) {
  const [query, setQuery] = useState("");
  const schemas = getSchemas(spec);
  const names = Object.keys(schemas).filter((name) => name.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState("");
  const activeName = selected && schemas[selected] ? selected : names[0];
  const active = schemas[activeName];

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <WorkspaceCard className="space-y-3">
        <FieldLabel>Filter schemas</FieldLabel>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} />
        <div className="space-y-2">
          {names.map((name) => (
            <button key={name} type="button" onClick={() => setSelected(name)} className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${activeName === name ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border"}`}>{name}</button>
          ))}
        </div>
      </WorkspaceCard>
      <WorkspaceCard>
        <div className="mb-2 flex items-center justify-between gap-3">
          <FieldLabel>{activeName || "Schema"}</FieldLabel>
          <CopyButton value={active ? JSON.stringify(active, null, 2) : ""} />
        </div>
        <CodeBlock value={active ? JSON.stringify(active, null, 2) : "No schemas found."} />
      </WorkspaceCard>
    </div>
  );
}

function RedocTab({ spec, operations }: { spec: JsonRecord; operations: Operation[] }) {
  const [selected, setSelected] = useState("");
  const active = operations.find((operation) => `${operation.method} ${operation.path}` === selected) ?? operations[0];
  const curl = active ? `curl -X ${active.method} '${getBaseUrl(spec).replace(/\/$/, "")}${active.path}'` : "";

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <WorkspaceCard className="max-h-[70vh] overflow-y-auto">
        <FieldLabel>Endpoints</FieldLabel>
        {operations.map((operation) => {
          const id = `${operation.method} ${operation.path}`;
          return <button key={id} type="button" onClick={() => setSelected(id)} className={`mt-2 block w-full rounded-lg border px-3 py-2 text-left text-sm ${active === operation ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border"}`}><span className={methodClass(operation.method)}>{operation.method}</span><code className="ml-2 font-mono">{operation.path}</code></button>;
        })}
      </WorkspaceCard>
      <WorkspaceCard className="space-y-4">
        {active ? (
          <>
            <div><span className={methodClass(active.method)}>{active.method}</span><code className="ml-2 font-mono text-foreground">{active.path}</code></div>
            <h2 className="text-lg font-semibold text-foreground">{active.summary || "Untitled endpoint"}</h2>
            <OperationDetails operation={active} />
            <div><FieldLabel>Try it out cURL</FieldLabel><CodeBlock value={curl} /><CopyButton value={curl} label="Copy cURL" /></div>
          </>
        ) : <p className="text-sm text-muted-foreground">No endpoints found.</p>}
      </WorkspaceCard>
    </div>
  );
}

function OpenApiSummary({ spec, operations }: { spec: JsonRecord; operations: Operation[] }) {
  const info = asRecord(spec.info);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <ResultCard label="Title" value={String(info.title ?? "Untitled API")} />
      <ResultCard label="Version" value={String(info.version ?? "-")} />
      <ResultCard label="Spec" value={String(spec.openapi ?? spec.swagger ?? "Unknown")} />
      <ResultCard label="Endpoints" value={String(operations.length)} />
    </div>
  );
}

function OperationDetails({ operation }: { operation: Operation }) {
  const params = [...asArray(operation.operation.parameters)];
  const requestBody = asRecord(operation.operation.requestBody);
  const responses = asRecord(operation.operation.responses);
  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {operation.description && <p className="text-sm text-muted-foreground">{operation.description}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <WorkspaceCard><FieldLabel>Request body</FieldLabel><CodeBlock value={JSON.stringify(requestBody, null, 2)} /></WorkspaceCard>
        <WorkspaceCard><FieldLabel>Responses</FieldLabel><CodeBlock value={JSON.stringify(responses, null, 2)} /></WorkspaceCard>
      </div>
      <div>
        <FieldLabel>Parameters</FieldLabel>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {params.length ? params.map((param, index) => {
                const p = asRecord(param);
                return <tr key={index}><td className="px-3 py-2 font-mono">{String(p.name ?? "-")}</td><td className="px-3 py-2">{String(p.in ?? "-")}</td><td className="px-3 py-2">{p.required ? "required" : "optional"}</td></tr>;
              }) : <tr><td className="px-3 py-2 text-muted-foreground">No parameters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ValidationList({ title, items, variant, empty }: { title: string; items: string[]; variant: "error" | "warning"; empty: string }) {
  return (
    <WorkspaceCard>
      <FieldLabel>{title}</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">{items.length ? items.map((item) => <Badge key={item} variant={variant}>{item}</Badge>) : <Badge variant="success">{empty}</Badge>}</div>
    </WorkspaceCard>
  );
}

function parseDocument(input: string): { spec: JsonRecord | null; error: string } {
  try {
    const parsed = yaml.load(input) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { spec: null, error: "Spec must be a JSON or YAML object." };
    return { spec: parsed as JsonRecord, error: "" };
  } catch (err) {
    return { spec: null, error: err instanceof Error ? err.message : "Could not parse spec." };
  }
}

function getOperations(spec: JsonRecord) {
  const paths = asRecord(spec.paths);
  const operations: Operation[] = [];
  Object.entries(paths).forEach(([path, pathItem]) => {
    const item = asRecord(pathItem);
    methods.forEach((method) => {
      const operation = asRecord(item[method]);
      if (!Object.keys(operation).length) return;
      operations.push({
        method: method.toUpperCase(),
        path,
        tag: String(asArray(operation.tags)[0] ?? "Default"),
        summary: String(operation.summary ?? ""),
        description: String(operation.description ?? ""),
        operation,
      });
    });
  });
  return operations;
}

function validateOpenApi(spec: JsonRecord, input: string, operations: Operation[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const version = spec.openapi ?? spec.swagger;
  if (!version) errors.push("Missing openapi or swagger version.");
  if (!asRecord(spec.info).title) errors.push(`${lineOf(input, "info") || ""}Missing info.title.`);
  if (!asRecord(spec.info).version) errors.push(`${lineOf(input, "info") || ""}Missing info.version.`);
  if (!Object.keys(asRecord(spec.paths)).length) errors.push("Missing or empty paths object.");
  const operationIds = new Set<string>();
  operations.forEach((operation) => {
    if (!Object.keys(asRecord(operation.operation.responses)).length) errors.push(`${operation.method} ${operation.path}: missing responses.`);
    const id = operation.operation.operationId;
    if (typeof id === "string") {
      if (operationIds.has(id)) errors.push(`Duplicate operationId: ${id}.`);
      operationIds.add(id);
    } else warnings.push(`${operation.method} ${operation.path}: missing operationId.`);
  });
  findRefs(spec).forEach((ref) => {
    if (ref.startsWith("#/") && !resolvePointer(spec, ref)) errors.push(`Unresolved reference: ${ref}.`);
  });
  return { errors, warnings };
}

function findRefs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(findRefs);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as JsonRecord).flatMap(([key, nested]) => key === "$ref" && typeof nested === "string" ? [nested] : findRefs(nested));
}

function resolvePointer(root: JsonRecord, ref: string) {
  return ref.slice(2).split("/").reduce<unknown>((node, part) => asRecord(node)[part.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

function getSchemas(spec: JsonRecord) {
  return asRecord(asRecord(spec.components).schemas ?? spec.definitions);
}

function getBaseUrl(spec: JsonRecord) {
  const firstServer = asRecord(asArray(spec.servers)[0]);
  return String(firstServer.url ?? spec.host ?? "");
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function lineOf(input: string, needle: string) {
  const index = input.split(/\r?\n/).findIndex((line) => line.includes(needle));
  return index >= 0 ? `line ${index + 1}: ` : "";
}
