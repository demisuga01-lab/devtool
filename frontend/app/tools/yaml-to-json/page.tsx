"use client";

import { useMemo, useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CodeBlock, CopyButton, Label, Panel, ResultCard, ToolTextarea } from "@/components/tool-ui";
import { InlineError, explainYamlError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeJson } from "@/lib/tool-insights";

function yamlHints(source: string) {
  const lines = source.split(/\r?\n/);
  const hints: string[] = [];
  const seen = new Map<string, number>();
  lines.forEach((line, index) => {
    const match = line.match(/^(\s*)([A-Za-z0-9_.-]+):/);
    if (match) {
      const key = `${match[1].length}:${match[2]}`;
      if (seen.has(key)) hints.push(`Possible duplicate key "${match[2]}" near lines ${seen.get(key)} and ${index + 1}.`);
      seen.set(key, index + 1);
    }
    if (/:\s*(yes|no|on|off)\s*(#.*)?$/i.test(line)) hints.push(`Line ${index + 1}: YAML 1.1 parsers may coerce yes/no/on/off to booleans.`);
    if (/:\s*0[0-9]+\s*(#.*)?$/.test(line)) hints.push(`Line ${index + 1}: leading-zero numbers can be interpreted unexpectedly.`);
  });
  return hints;
}

export default function YamlToJsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const stats = useMemo(() => (output ? analyzeJson(parsed) : null), [output, parsed]);
  const hints = useMemo(() => yamlHints(input), [input]);

  const convert = () => {
    if (!input.trim()) {
      setOutput("");
      setParsed(null);
      setError(null);
      return;
    }
    try {
      const value = yaml.load(input);
      setParsed(value);
      setOutput(JSON.stringify(value, null, 2));
      setError(null);
    } catch (e) {
      setOutput("");
      setParsed(null);
      setError(explainYamlError(e));
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "YAML to JSON" }]} title="YAML to JSON" description="Convert YAML to JSON format." />
      <div className="space-y-5">
        <div>
          <Label>YAML</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setParsed(null); setError(null); } }} rows={12} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setParsed(null); setError(null); }}>Clear</Button></div>
        {stats && (
          <div className="grid gap-3 md:grid-cols-4">
            <ResultCard label="Keys" value={stats.totalKeys.toLocaleString()} />
            <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
            <ResultCard label="Arrays" value={String(stats.arrays.length)} />
            <ResultCard label="Null / Empty" value={String(stats.nullCount + stats.emptyStringCount)} />
          </div>
        )}
        {hints.length > 0 && (
          <Panel noPadding className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">YAML-specific checks</h2>
              <Badge variant="warning">{hints.length} finding{hints.length === 1 ? "" : "s"}</Badge>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              {hints.map((hint) => <li key={hint}>{hint}</li>)}
            </ul>
          </Panel>
        )}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>JSON</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
