"use client";

import { useEffect, useMemo, useState } from "react";
import * as yaml from "js-yaml";
import Papa from "papaparse";
import { XMLBuilder } from "fast-xml-parser";
import { AlignLeft, ArrowLeftRight, Braces, CheckCircle, Code2, Download, GitBranch, GitCompare, Search } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "format" | "validate" | "tree" | "diff" | "escape" | "convert" | "jsonpath" | "typescript";
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonResult = { ok: true; value: unknown } | { ok: false; message: string; line?: number; column?: number; suggestion?: string };
type DiffItem = { type: "added" | "removed" | "changed" | "same"; path: string; oldValue?: unknown; newValue?: unknown };
type ConvertDirection = "json-yaml" | "yaml-json" | "json-csv" | "json-xml" | "json-ts";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "format", label: "Format", icon: AlignLeft },
  { id: "validate", label: "Validate", icon: CheckCircle },
  { id: "tree", label: "Tree", icon: GitBranch },
  { id: "diff", label: "Diff", icon: GitCompare },
  { id: "escape", label: "Escape", icon: Braces },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "jsonpath", label: "JSONPath", icon: Search },
  { id: "typescript", label: "TypeScript", icon: Code2 },
];

const sampleJson = '{\n  "store": {\n    "books": [\n      { "title": "Clean Code", "price": 31.5 },\n      { "title": "Refactoring", "price": 42 }\n    ],\n    "open": true\n  }\n}';

export default function JsonWorkspacePage() {
  const [active, setActive] = useState<Tab>("format");

  return (
    <WorkspaceShell
      title="JSON Tools"
      subtitle="Format, validate, diff, convert, and query JSON data"
      href="/tools/json"
      icon={Braces}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="json"
      intentGroup="inspect"
    >
      {active === "format" && <FormatTab />}
      {active === "validate" && <ValidateTab />}
      {active === "tree" && <TreeTab />}
      {active === "diff" && <DiffTab />}
      {active === "escape" && <EscapeTab />}
      {active === "convert" && <ConvertTab />}
      {active === "jsonpath" && <JsonPathTab />}
      {active === "typescript" && <TypescriptTab />}
    </WorkspaceShell>
  );
}

function FormatTab() {
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [error, setError] = useState<JsonResult | null>(null);
  const parsed = useMemo(() => parseJson(input), [input]);
  const stats = parsed.ok ? analyzeJson(parsed.value) : null;

  function run(mode: "pretty" | "minify") {
    const result = parseJson(input);
    if (!result.ok) {
      setOutput("");
      setError(result);
      return;
    }
    setError(null);
    const value = sortKeys ? sortJson(result.value) : result.value;
    setOutput(mode === "minify" ? JSON.stringify(value) : JSON.stringify(value, null, indent === "tab" ? "\t" : Number(indent)));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SecondaryButton onClick={() => run("minify")}>Minify</SecondaryButton>
        <PrimaryButton onClick={() => run("pretty")}>Prettify</PrimaryButton>
        <div>
          <FieldLabel>Indent</FieldLabel>
          <select value={indent} onChange={(event) => setIndent(event.target.value)} className={inputClass}>
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={sortKeys} onChange={(event) => setSortKeys(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Sort keys
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Input JSON</FieldLabel>
            <button type="button" onClick={() => setInput("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px] ${error && !error.ok ? "border-red-500" : ""}`} />
          <p className="mt-2 text-xs text-muted-foreground">{input.length.toLocaleString()} characters, {input.split(/\r?\n/).length.toLocaleString()} lines</p>
          {error && !error.ok && <JsonError result={error} input={input} />}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Output JSON</FieldLabel>
            <div className="flex items-center gap-2">
              <CopyButton value={output} label="Copy" />
              <SecondaryButton onClick={() => downloadText("formatted.json", output, "application/json")} disabled={!output} className="min-h-8 px-3 py-1.5"><Download className="h-4 w-4" />Download</SecondaryButton>
            </div>
          </div>
          <textarea value={output} readOnly placeholder="Formatted JSON will appear here." className={`${textareaClass} min-h-[400px]`} />
        </div>
      </div>
      {stats && <StatsRow stats={stats} />}
    </div>
  );
}

function ValidateTab() {
  const [input, setInput] = useState(sampleJson);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "required": ["store"]\n}');
  const [result, setResult] = useState<JsonResult | null>(null);
  const [schemaResult, setSchemaResult] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setResult(input.trim() ? parseJson(input) : null), 500);
    return () => window.clearTimeout(timer);
  }, [input]);

  const stats = result?.ok ? analyzeJson(result.value) : null;

  function validateSchema() {
    const data = parseJson(input);
    const parsedSchema = parseJson(schema);
    if (!data.ok) {
      setSchemaResult("Fix the JSON input before validating against a schema.");
      return;
    }
    if (!parsedSchema.ok) {
      setSchemaResult(`Schema is not valid JSON: ${parsedSchema.message}`);
      return;
    }
    const errors = basicSchemaErrors(data.value, parsedSchema.value);
    setSchemaResult(errors.length ? errors.join(" ") : "Schema check passed for the supported rules.");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>JSON to validate</FieldLabel>
          <button type="button" onClick={() => setInput("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px] ${result && !result.ok ? "border-red-500" : result?.ok ? "border-emerald-500" : ""}`} />
      </div>
      {result?.ok && (
        <WorkspaceCard className="border-emerald-500/40">
          <div className="flex items-center gap-3 text-emerald-600"><CheckCircle className="h-7 w-7" /><h2 className="text-lg font-semibold">Valid JSON</h2></div>
          {stats && <StatsRow stats={stats} className="mt-4" />}
        </WorkspaceCard>
      )}
      {result && !result.ok && (
        <WorkspaceCard className="border-red-500/40">
          <JsonError result={result} input={input} />
        </WorkspaceCard>
      )}
      <WorkspaceCard>
        <button type="button" onClick={() => setSchemaOpen((value) => !value)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground">
          Schema validation
          <span className="text-xs text-muted-foreground">{schemaOpen ? "Hide" : "Show"}</span>
        </button>
        {schemaOpen && (
          <div className="mt-4 space-y-3">
            <textarea value={schema} onChange={(event) => setSchema(event.target.value)} className={`${textareaClass} min-h-[180px]`} />
            <PrimaryButton onClick={validateSchema}>Validate schema</PrimaryButton>
            {schemaResult && <p className={`text-sm ${schemaResult.includes("passed") ? "text-emerald-600" : "text-red-600"}`}>{schemaResult}</p>}
          </div>
        )}
      </WorkspaceCard>
    </div>
  );
}

function TreeTab() {
  const [input, setInput] = useState(sampleJson);
  const [tree, setTree] = useState<JsonResult>(() => parseJson(sampleJson));
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function parse() {
    const result = parseJson(input);
    setTree(result);
    setCollapsed({});
  }

  function setAll(value: boolean) {
    if (!tree.ok) return;
    const next: Record<string, boolean> = {};
    collectPaths(tree.value as JsonValue, "$", next, value);
    setCollapsed(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>JSON input</FieldLabel>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[140px]`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={parse}>Parse</PrimaryButton>
        <SecondaryButton onClick={() => setAll(false)}>Expand all</SecondaryButton>
        <SecondaryButton onClick={() => setAll(true)}>Collapse all</SecondaryButton>
      </div>
      {tree.ok ? (
        <WorkspaceCard>
          <div className="mb-4">
            <FieldLabel>Search keys</FieldLabel>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Filter by key name" />
          </div>
          <div className="overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-sm">
            <JsonTreeNode name="$" value={tree.value as JsonValue} path="$" collapsed={collapsed} setCollapsed={setCollapsed} query={query.toLowerCase()} />
          </div>
        </WorkspaceCard>
      ) : (
        <JsonError result={tree} input={input} />
      )}
    </div>
  );
}

function DiffTab() {
  const [left, setLeft] = useState('{\n  "name": "Ada",\n  "age": 36\n}');
  const [right, setRight] = useState('{\n  "name": "Ada",\n  "age": 37,\n  "role": "admin"\n}');
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"unified" | "split">("unified");

  function compare() {
    const a = parseJson(left);
    const b = parseJson(right);
    if (!a.ok || !b.ok) {
      setError(!a.ok ? a.message : !b.ok ? b.message : "Invalid JSON input.");
      setDiffs([]);
      return;
    }
    setError("");
    setDiffs(diffJson(a.value, b.value).filter((item) => item.type !== "same"));
  }

  const counts = countDiffs(diffs);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Original JSON</FieldLabel><textarea value={left} onChange={(event) => setLeft(event.target.value)} className={`${textareaClass} min-h-[300px]`} /></div>
        <div><FieldLabel>Modified JSON</FieldLabel><textarea value={right} onChange={(event) => setRight(event.target.value)} className={`${textareaClass} min-h-[300px]`} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton onClick={compare}>Compare</PrimaryButton>
        <Segmented value={mode} onChange={setMode} options={[["unified", "Unified"], ["split", "Side by side"]]} />
      </div>
      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {diffs.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Added keys" value={counts.added} tone="emerald" />
            <Metric label="Removed keys" value={counts.removed} tone="red" />
            <Metric label="Changed values" value={counts.changed} tone="amber" />
          </div>
          <div className={mode === "split" ? "grid gap-3 lg:grid-cols-2" : "space-y-2"}>
            {diffs.map((diff, index) => <DiffRow key={`${diff.path}-${index}`} diff={diff} />)}
          </div>
        </>
      )}
    </div>
  );
}

function EscapeTab() {
  const [mode, setMode] = useState<"escape" | "unescape">("escape");
  const [input, setInput] = useState("");
  const [unicode, setUnicode] = useState(false);
  const [html, setHtml] = useState(false);
  const [compact, setCompact] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function convert() {
    try {
      if (mode === "escape") {
        let text = JSON.stringify(input);
        if (!unicode) text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        if (html) text = escapeHtml(text);
        setOutput(compact ? text : text.slice(1, -1));
      } else {
        const text = compact ? input : `"${input.replace(/"/g, '\\"')}"`;
        setOutput(JSON.parse(html ? unescapeHtml(text) : text));
      }
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Unable to convert JSON string.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"]]} />
        <Checkbox checked={unicode} onChange={setUnicode} label="Escape Unicode" />
        <Checkbox checked={html} onChange={setHtml} label="Escape HTML entities inside strings" />
        <Checkbox checked={compact} onChange={setCompact} label="Compact output" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[240px]`} /></div>
        <div>
          <div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} label="Copy" /></div>
          <textarea value={output} readOnly className={`${textareaClass} min-h-[240px]`} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2"><PrimaryButton onClick={convert}>Convert</PrimaryButton><SecondaryButton onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</SecondaryButton></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ConvertTab() {
  const [direction, setDirection] = useState<ConvertDirection>("json-yaml");
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [headers, setHeaders] = useState(true);
  const [interfaceName, setInterfaceName] = useState("Root");
  const [exported, setExported] = useState(true);
  const [optional, setOptional] = useState(false);
  const [root, setRoot] = useState("root");
  const [attributePrefix, setAttributePrefix] = useState("@_");

  function convert() {
    try {
      if (direction === "json-yaml") setOutput(yaml.dump(JSON.parse(input), { indent: 2 }));
      if (direction === "yaml-json") setOutput(JSON.stringify(yaml.load(input), null, 2));
      if (direction === "json-csv") {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed)) throw new Error("JSON to CSV expects an array of objects.");
        setOutput(Papa.unparse(parsed, { delimiter, header: headers }));
      }
      if (direction === "json-xml") setOutput(new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: attributePrefix }).build({ [root || "root"]: JSON.parse(input) }));
      if (direction === "json-ts") setOutput(generateTypeScript(JSON.parse(input), interfaceName || "Root", { useType: false, optional, readonly: false, exported }));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Conversion failed.");
    }
  }

  return (
    <div className="space-y-5">
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[["json-yaml", "JSON to YAML"], ["yaml-json", "YAML to JSON"], ["json-csv", "JSON to CSV"], ["json-xml", "JSON to XML"], ["json-ts", "JSON to TypeScript"]]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[350px]`} /></div>
        <div>
          <div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} label="Copy" /></div>
          <textarea value={output} readOnly className={`${textareaClass} min-h-[350px]`} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {direction === "json-csv" && (
          <>
            <div><FieldLabel>Delimiter</FieldLabel><select value={delimiter} onChange={(event) => setDelimiter(event.target.value)} className={inputClass}><option value=",">Comma</option><option value="\t">Tab</option><option value=";">Semicolon</option></select></div>
            <Checkbox checked={headers} onChange={setHeaders} label="Include headers" />
          </>
        )}
        {direction === "json-ts" && (
          <>
            <div><FieldLabel>Interface name</FieldLabel><input value={interfaceName} onChange={(event) => setInterfaceName(event.target.value)} className={inputClass} /></div>
            <Checkbox checked={exported} onChange={setExported} label="Export keyword" />
            <Checkbox checked={optional} onChange={setOptional} label="Optional fields" />
          </>
        )}
        {direction === "json-xml" && (
          <>
            <div><FieldLabel>Root element</FieldLabel><input value={root} onChange={(event) => setRoot(event.target.value)} className={inputClass} /></div>
            <div><FieldLabel>Attribute prefix</FieldLabel><input value={attributePrefix} onChange={(event) => setAttributePrefix(event.target.value)} className={inputClass} /></div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={convert}>Convert</PrimaryButton>
        <SecondaryButton onClick={() => downloadText(`converted.${extensionFor(direction)}`, output, "text/plain")} disabled={!output}><Download className="h-4 w-4" />Download output</SecondaryButton>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function JsonPathTab() {
  const [json, setJson] = useState(sampleJson);
  const [path, setPath] = useState("$.store.books[*].title");
  const [matches, setMatches] = useState<{ path: string; value: unknown }[]>([]);
  const [error, setError] = useState("");

  function evaluate() {
    try {
      setMatches(evaluateJsonPath(JSON.parse(json), path));
      setError("");
    } catch (err) {
      setMatches([]);
      setError(err instanceof Error ? err.message : "JSONPath evaluation failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div><FieldLabel>JSON</FieldLabel><textarea value={json} onChange={(event) => setJson(event.target.value)} className={`${textareaClass} min-h-[220px]`} /></div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div><FieldLabel>JSONPath expression</FieldLabel><input value={path} onChange={(event) => setPath(event.target.value)} className={monoInputClass} placeholder="$.store.books[*].title" /></div>
        <div><FieldLabel>Examples</FieldLabel><select onChange={(event) => setPath(event.target.value)} className={inputClass} defaultValue=""><option value="" disabled>Choose example</option><option value="$.store.books[*].title">All titles</option><option value="$.store.open">Store open</option><option value="$.store.books[0]">First book</option></select></div>
        <div className="flex items-end"><PrimaryButton onClick={evaluate}>Evaluate</PrimaryButton></div>
      </div>
      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2 text-sm"><span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600">{matches.length} matches</span></div>
      {matches.length === 0 && !error ? <EmptyState text="No results for this expression." /> : (
        <div className="grid gap-3">
          {matches.map((match) => (
            <WorkspaceCard key={match.path}>
              <div className="mb-2 flex items-center justify-between gap-2"><code className="text-xs text-muted-foreground">{match.path}</code><CopyButton value={stringify(match.value)} /></div>
              <pre className="overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">{stringify(match.value)}</pre>
            </WorkspaceCard>
          ))}
        </div>
      )}
    </div>
  );
}

function TypescriptTab() {
  const [input, setInput] = useState(sampleJson);
  const [name, setName] = useState("Root");
  const [useType, setUseType] = useState(false);
  const [optional, setOptional] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [exported, setExported] = useState(true);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function generate() {
    try {
      setOutput(generateTypeScript(JSON.parse(input), name || "Root", { useType, optional, readonly, exported }));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Invalid JSON.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>JSON</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px]`} /></div>
        <div>
          <div className="flex items-center justify-between"><FieldLabel>TypeScript</FieldLabel><CopyButton value={output} label="Copy" /></div>
          <textarea value={output} readOnly className={`${textareaClass} min-h-[400px]`} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <div><FieldLabel>Interface name</FieldLabel><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></div>
        <Checkbox checked={useType} onChange={setUseType} label="Use type" />
        <Checkbox checked={optional} onChange={setOptional} label="Optional properties" />
        <Checkbox checked={readonly} onChange={setReadonly} label="Readonly properties" />
        <Checkbox checked={exported} onChange={setExported} label="Export keyword" />
      </div>
      <PrimaryButton onClick={generate}>Generate</PrimaryButton>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
      {label}
    </label>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function JsonError({ result, input }: { result: Extract<JsonResult, { ok: false }>; input: string }) {
  const line = result.line ? input.split(/\r?\n/)[result.line - 1] : "";
  return (
    <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">
      <p className="font-medium">{result.message}</p>
      {result.line && <p className="mt-1">Line {result.line}{result.column ? `, column ${result.column}` : ""}</p>}
      {result.suggestion && <p className="mt-1 text-red-500">{result.suggestion}</p>}
      {line && <pre className="mt-2 overflow-auto rounded bg-red-950 p-2 text-xs text-red-100">{line}</pre>}
    </div>
  );
}

function StatsRow({ stats, className = "" }: { stats: ReturnType<typeof analyzeJson>; className?: string }) {
  return (
    <div className={`grid gap-3 md:grid-cols-4 ${className}`}>
      <Metric label="Keys" value={stats.keys} />
      <Metric label="Nesting depth" value={stats.depth} />
      <Metric label="Arrays" value={stats.arrays} />
      <Metric label="Objects" value={stats.objects} />
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "emerald" | "red" | "amber" }) {
  const toneClass = tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return <WorkspaceCard><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p></WorkspaceCard>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function JsonTreeNode({ name, value, path, collapsed, setCollapsed, query }: { name: string; value: JsonValue; path: string; collapsed: Record<string, boolean>; setCollapsed: (value: Record<string, boolean>) => void; query: string }) {
  const expandable = value !== null && typeof value === "object";
  const isCollapsed = collapsed[path];
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : expandable ? Object.entries(value as Record<string, JsonValue>) : [];
  const visible = !query || name.toLowerCase().includes(query) || path.toLowerCase().includes(query);
  if (!visible && !expandable) return null;
  const badge = Array.isArray(value) ? `[${value.length}]` : expandable ? `{${entries.length}}` : "";
  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => expandable ? setCollapsed({ ...collapsed, [path]: !isCollapsed }) : void navigator.clipboard?.writeText(stringify(value))}
        title={path}
        className="text-left"
      >
        <span className="font-medium text-foreground">{name}</span>
        {badge && <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-muted-foreground dark:bg-zinc-800">{badge}</span>}
        {!expandable && <span className={`ml-2 ${valueClass(value)}`}>{stringify(value)}</span>}
      </button>
      {expandable && !isCollapsed && (
        <div className="ml-5 border-l border-border pl-3">
          {entries.map(([key, child]) => <JsonTreeNode key={`${path}.${key}`} name={key} value={child} path={Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`} collapsed={collapsed} setCollapsed={setCollapsed} query={query} />)}
        </div>
      )}
    </div>
  );
}

function DiffRow({ diff }: { diff: DiffItem }) {
  const styles: Record<DiffItem["type"], string> = {
    added: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    removed: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300",
    changed: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    same: "border-border text-muted-foreground",
  };
  return (
    <div className={`rounded-lg border p-3 text-sm ${styles[diff.type]}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2"><code>{diff.path}</code><span className="rounded-full border border-current px-2 py-0.5 text-xs uppercase">{diff.type}</span></div>
      {diff.type === "changed" && <code>{stringify(diff.oldValue)} -&gt; {stringify(diff.newValue)}</code>}
      {diff.type === "added" && <code>{stringify(diff.newValue)}</code>}
      {diff.type === "removed" && <code>{stringify(diff.oldValue)}</code>}
    </div>
  );
}

function parseJson(input: string): JsonResult {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    const position = /position (\d+)/i.exec(message)?.[1];
    const point = position ? lineColumn(input, Number(position)) : {};
    return { ok: false, message, ...point, suggestion: jsonSuggestion(message, input) };
  }
}

function lineColumn(input: string, position: number) {
  const before = input.slice(0, position);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function jsonSuggestion(message: string, input: string) {
  if (/trailing/i.test(message) || /,\s*[}\]]/.test(input)) return "Remove the trailing comma near the highlighted line.";
  if (/unterminated|string/i.test(message)) return "Add the missing closing quote or escape the quote inside the string.";
  if (/property name|quoted/i.test(message)) return "Wrap object keys in double quotes.";
  return "Check for missing commas, unclosed brackets, or invalid string escaping.";
}

function analyzeJson(value: unknown) {
  const stats = { keys: 0, depth: 0, arrays: 0, objects: 0 };
  function walk(item: unknown, depth: number) {
    stats.depth = Math.max(stats.depth, depth);
    if (Array.isArray(item)) {
      stats.arrays++;
      item.forEach((child) => walk(child, depth + 1));
    } else if (item && typeof item === "object") {
      stats.objects++;
      stats.keys += Object.keys(item).length;
      Object.values(item).forEach((child) => walk(child, depth + 1));
    }
  }
  walk(value, 1);
  return stats;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortJson(child)]));
  }
  return value;
}

function diffJson(a: unknown, b: unknown, path = "$"): DiffItem[] {
  if (isObject(a) && isObject(b)) {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    return keys.flatMap((key) => {
      const next = `${path}.${key}`;
      if (!(key in a)) return [{ type: "added", path: next, newValue: b[key] } as DiffItem];
      if (!(key in b)) return [{ type: "removed", path: next, oldValue: a[key] } as DiffItem];
      return diffJson(a[key], b[key], next);
    });
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return [{ type: "same", path, oldValue: a, newValue: b }];
  return [{ type: "changed", path, oldValue: a, newValue: b }];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function countDiffs(diffs: DiffItem[]) {
  return {
    added: diffs.filter((item) => item.type === "added").length,
    removed: diffs.filter((item) => item.type === "removed").length,
    changed: diffs.filter((item) => item.type === "changed").length,
  };
}

function generateTypeScript(value: unknown, rootName: string, options: { useType: boolean; optional: boolean; readonly: boolean; exported: boolean }) {
  const defs: string[] = [];
  const seen = new Set<string>();
  const keyword = options.exported ? "export " : "";
  const propPrefix = options.readonly ? "readonly " : "";
  const optional = options.optional ? "?" : "";

  function infer(item: unknown, name: string): string {
    if (item === null) return "null";
    if (Array.isArray(item)) return item.length ? `${Array.from(new Set(item.map((child) => infer(child, name)))).join(" | ")}[]` : "unknown[]";
    if (typeof item !== "object") return typeof item;
    const typeName = cleanName(name);
    build(item as Record<string, unknown>, typeName);
    return typeName;
  }

  function build(obj: Record<string, unknown>, name: string) {
    if (seen.has(name)) return;
    seen.add(name);
    const lines = Object.entries(obj).map(([key, item]) => {
      const safe = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      return `  ${propPrefix}${safe}${optional}: ${infer(item, `${name}_${key}`)};`;
    });
    defs.push(options.useType ? `${keyword}type ${name} = {\n${lines.join("\n")}\n};` : `${keyword}interface ${name} {\n${lines.join("\n")}\n}`);
  }

  infer(value, rootName);
  return defs.reverse().join("\n\n");
}

function cleanName(value: string) {
  const name = value.replace(/[^A-Za-z0-9_]/g, " ").replace(/(?:^|\s)(\w)/g, (_, c: string) => c.toUpperCase()).replace(/\s/g, "");
  return /^[A-Za-z_]/.test(name) ? name : `Type${name}`;
}

function basicSchemaErrors(value: unknown, schema: unknown) {
  const errors: string[] = [];
  if (!isObject(schema)) return ["Only object JSON Schemas are supported in this quick check."];
  if (schema.type && schema.type !== rootType(value).toLowerCase()) errors.push(`Expected root type ${schema.type}, got ${rootType(value)}.`);
  if (Array.isArray(schema.required) && isObject(value)) {
    schema.required.forEach((key) => {
      if (typeof key === "string" && !(key in value)) errors.push(`Missing required property "${key}".`);
    });
  }
  return errors;
}

function rootType(value: unknown) {
  if (Array.isArray(value)) return "Array";
  if (value === null) return "Null";
  if (typeof value === "object") return "Object";
  return typeof value === "string" ? "String" : typeof value === "number" ? "Number" : typeof value === "boolean" ? "Boolean" : "Unknown";
}

function evaluateJsonPath(value: unknown, expression: string) {
  if (!expression.startsWith("$")) throw new Error("JSONPath must start with $.");
  const tokens = Array.from(expression.matchAll(/\.([A-Za-z_$][\w$]*)|\["([^"]+)"\]|\[(\d+|\*)\]/g)).map((match) => match[1] ?? match[2] ?? match[3]);
  let current = [{ path: "$", value }];
  tokens.forEach((token) => {
    const next: { path: string; value: unknown }[] = [];
    current.forEach((item) => {
      if (token === "*" && Array.isArray(item.value)) {
        item.value.forEach((child, index) => next.push({ path: `${item.path}[${index}]`, value: child }));
      } else if (/^\d+$/.test(token) && Array.isArray(item.value)) {
        const index = Number(token);
        if (index in item.value) next.push({ path: `${item.path}[${index}]`, value: item.value[index] });
      } else if (isObject(item.value) && token in item.value) {
        next.push({ path: `${item.path}.${token}`, value: item.value[token] });
      }
    });
    current = next;
  });
  return current;
}

function collectPaths(value: unknown, path: string, out: Record<string, boolean>, collapsed: boolean) {
  if (!value || typeof value !== "object") return;
  out[path] = collapsed;
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value as Record<string, unknown>);
  entries.forEach(([key, child]) => collectPaths(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, out, collapsed));
}

function stringify(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function valueClass(value: JsonValue) {
  if (typeof value === "string") return "text-emerald-600";
  if (typeof value === "number") return "text-blue-600";
  if (typeof value === "boolean") return "text-amber-600";
  if (value === null) return "text-muted-foreground";
  return "text-foreground";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

function unescapeHtml(value: string) {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[entity] ?? entity));
}

function extensionFor(direction: ConvertDirection) {
  return direction === "json-yaml" ? "yaml" : direction === "yaml-json" ? "json" : direction === "json-csv" ? "csv" : direction === "json-xml" ? "xml" : "ts";
}

function downloadText(filename: string, text: string, type: string) {
  if (!text) return;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
