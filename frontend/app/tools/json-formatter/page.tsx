"use client";

import { useMemo, useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolInput, ToolTextarea, CodeBlock, CopyButton, Label, Panel, ResultCard } from "@/components/tool-ui";
import { InlineError, SuccessBanner, explainJsonError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeJson, findRepeatedJsonKeys, inferJsonSchema, jsonErrorContext } from "@/lib/tool-insights";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonToolError | null>(null);
  const [success, setSuccess] = useState("");
  const [pathSearch, setPathSearch] = useState("");

  const parsedForInsights = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }, [input]);

  const stats = useMemo(() => (parsedForInsights === null ? null : analyzeJson(parsedForInsights)), [parsedForInsights]);
  const repeatedKeys = useMemo(() => findRepeatedJsonKeys(input), [input]);
  const schema = useMemo(() => (parsedForInsights === null ? "" : JSON.stringify(inferJsonSchema(parsedForInsights), null, 2)), [parsedForInsights]);

  const matchingPaths = useMemo(() => {
    if (!parsedForInsights || !pathSearch.trim()) return [];
    const matches: string[] = [];
    const needle = pathSearch.trim().toLowerCase();
    function walk(value: unknown, path: string) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
          const next = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
          if (key.toLowerCase().includes(needle)) matches.push(next);
          walk(child, next);
        });
      }
    }
    walk(parsedForInsights, "$");
    return matches.slice(0, 30);
  }, [parsedForInsights, pathSearch]);

  const parse = (): unknown | null => {
    if (!input.trim()) {
      setError(null);
      setOutput("");
      setSuccess("");
      return null;
    }
    try {
      const value = JSON.parse(input);
      setError(null);
      return value;
    } catch (e) {
      setOutput("");
      setSuccess("");
      setError(explainJsonError(input, e));
      return null;
    }
  };

  const format = () => {
    const value = parse();
    if (value === null) return;
    setSuccess("");
    setOutput(JSON.stringify(value, null, 2));
  };

  const minify = () => {
    const value = parse();
    if (value === null) return;
    setSuccess("");
    setOutput(JSON.stringify(value));
  };

  const validate = () => {
    const value = parse();
    if (value === null) return;
    setOutput("");
    setSuccess("Valid JSON.");
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError(null);
    setSuccess("");
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "JSON Formatter" }]} title="JSON Formatter" description="Format, minify, and validate JSON." />
      <div className="space-y-5">
        <div>
          <Label>Input</Label>
          <ToolTextarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) {
                setOutput("");
                setError(null);
                setSuccess("");
              }
            }}
            rows={12}
            placeholder='{"hello": "world"}'
          />
          {error && <InlineError error={error} />}
          {error?.line && <p className="mt-1 text-xs text-red-500">Error near line {error.line}</p>}
          {error?.line && (
            <pre className="mt-2 overflow-auto rounded-xl bg-red-950 p-3 font-mono text-xs leading-relaxed text-red-100">
              {jsonErrorContext(input, error.line, error.column)}
            </pre>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={format} disabled={!input}>Format</Button>
          <Button onClick={minify} disabled={!input}>Minify</Button>
          <Button onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={clear}>Clear</Button>
        </div>
        {success && <SuccessBanner>{success}</SuccessBanner>}
        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label="Keys" value={String(stats.totalKeys)} />
              <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
              <ResultCard label="Arrays" value={String(stats.arrays.length)} />
              <ResultCard label="Null/Empty" value={String(stats.nullCount + stats.emptyStringCount + stats.emptyArrayCount + stats.emptyObjectCount)} />
            </div>
            <Panel noPadding className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">JSON analysis</h2>
                  <p className="mt-1 text-xs text-zinc-500">Structure, risk flags, and schema preview generated from the parsed input.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.maxDepth > 5 && <Badge variant="warning">deep nesting</Badge>}
                  {repeatedKeys.length > 0 && <Badge variant="warning">repeated key names</Badge>}
                  {stats.nullCount > 0 && <Badge variant="info">{stats.nullCount} nulls</Badge>}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label>Path search</Label>
                    <ToolInput value={pathSearch} onChange={(event) => setPathSearch(event.target.value)} placeholder="Search key names, e.g. user" />
                  </div>
                  {pathSearch && (
                    <div className="max-h-44 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
                      {matchingPaths.length ? matchingPaths.map((path) => <div key={path}>{path}</div>) : <span className="text-zinc-500">No matching keys.</span>}
                    </div>
                  )}
                  {stats.deepPaths.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Deep paths</p>
                      <div className="max-h-32 overflow-auto rounded-xl bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-950">
                        {stats.deepPaths.map((path) => <div key={path}>{path}</div>)}
                      </div>
                    </div>
                  )}
                  {repeatedKeys.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Repeated key names</p>
                      <div className="flex flex-wrap gap-2">
                        {repeatedKeys.map((item) => <Badge key={item.key} variant="warning">{item.key} x{item.count}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Inferred JSON Schema</Label>
                    <CopyButton value={schema} />
                  </div>
                  <CodeBlock value={schema} />
                </div>
              </div>
            </Panel>
          </div>
        )}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <CopyButton value={output} />
            </div>
            <CodeBlock value={output} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
