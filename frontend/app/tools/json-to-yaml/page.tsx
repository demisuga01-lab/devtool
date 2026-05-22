"use client";

import { useMemo, useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CodeBlock, CopyButton, Label, Panel, ResultCard, ToolSelect, ToolTextarea } from "@/components/tool-ui";
import { InlineError, explainJsonError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeJson } from "@/lib/tool-insights";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonToYamlPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState<JsonToolError | null>(null);
  const stats = useMemo(() => (output ? analyzeJson(parsed) : null), [output, parsed]);

  const convert = () => {
    if (!input.trim()) {
      setOutput("");
      setParsed(null);
      setError(null);
      return;
    }
    try {
      const value = JSON.parse(input);
      setParsed(value);
      setOutput(yaml.dump(value, { indent }));
      setError(null);
    } catch (e) {
      setOutput("");
      setParsed(null);
      setError(explainJsonError(input, e));
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "JSON to YAML" }]} title="JSON to YAML" description="Convert JSON to YAML format." />
      <div className="space-y-5">
        <div>
          <Label>JSON</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setParsed(null); setError(null); } }} rows={12} />
          {error && <InlineError error={error} />}
          {error?.line && <p className="mt-1 text-xs text-red-500">Error near line {error.line}</p>}
        </div>
        <div><Label>Indent</Label><ToolSelect value={indent} onChange={(e) => setIndent(Number(e.target.value))}><option value={2}>2</option><option value={4}>4</option></ToolSelect></div>
        <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setParsed(null); setError(null); }}>Clear</Button></div>
        {stats && (
          <div className="grid gap-3 md:grid-cols-4">
            <ResultCard label="Keys" value={stats.totalKeys.toLocaleString()} />
            <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
            <ResultCard label="Arrays" value={String(stats.arrays.length)} />
            <ResultCard label="Types" value={Object.entries(stats.typeCounts).map(([type, count]) => `${type}: ${count}`).join(", ")} />
          </div>
        )}
        {output && (
          <Panel noPadding className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">YAML indentation: {indent}</Badge>
              <Badge variant="success">JSON parsed successfully</Badge>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">YAML can infer types from plain scalars. Quote values like "yes", "no", and leading-zero strings when consumers must preserve exact text.</p>
          </Panel>
        )}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>YAML</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
