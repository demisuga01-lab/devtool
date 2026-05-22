"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CodeBlock, ToolTextarea, Label, Panel, ResultCard } from "@/components/tool-ui";
import { InlineError, SuccessBanner, explainJsonError, jsonTypeInfo } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeJson, findRepeatedJsonKeys, inferJsonSchema, jsonErrorContext } from "@/lib/tool-insights";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonValidatorPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<JsonToolError | null>(null);
  const [validInfo, setValidInfo] = useState("");
  const [parsedValue, setParsedValue] = useState<unknown | null>(null);
  const stats = useMemo(() => (parsedValue === null ? null : analyzeJson(parsedValue)), [parsedValue]);
  const repeatedKeys = useMemo(() => findRepeatedJsonKeys(input), [input]);
  const schema = useMemo(() => (parsedValue === null ? "" : JSON.stringify(inferJsonSchema(parsedValue), null, 2)), [parsedValue]);

  const validate = () => {
    if (!input.trim()) {
      setError(null);
      setValidInfo("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setError(null);
      setValidInfo(jsonTypeInfo(parsed));
      setParsedValue(parsed);
    } catch (e) {
      setValidInfo("");
      setParsedValue(null);
      setError(explainJsonError(input, e));
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "JSON Validator" }]} title="JSON Validator" description="Validate JSON and pinpoint syntax errors." />
      <div className="space-y-5">
        <div>
          <Label>JSON to validate</Label>
          <ToolTextarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) {
                setError(null);
                setValidInfo("");
                setParsedValue(null);
              }
            }}
            rows={14}
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
          <Button variant="primary" onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setError(null); setValidInfo(""); setParsedValue(null); }}>Clear</Button>
        </div>
        {validInfo && (
          <SuccessBanner>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid JSON. {validInfo}.</span>
            </div>
          </SuccessBanner>
        )}
        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label="Total Keys" value={String(stats.totalKeys)} />
              <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
              <ResultCard label="Arrays" value={String(stats.arrays.length)} />
              <ResultCard label="Types Used" value={Object.keys(stats.typeCounts).join(", ")} />
            </div>
            <Panel noPadding className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="success">valid</Badge>
                {stats.maxDepth > 5 && <Badge variant="warning">deep paths detected</Badge>}
                {repeatedKeys.length > 0 && <Badge variant="warning">repeated key names</Badge>}
                {(stats.nullCount + stats.emptyStringCount) > 0 && <Badge variant="info">nullable/empty fields</Badge>}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Array sizes</p>
                  <div className="max-h-48 overflow-auto rounded-xl bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-950">
                    {stats.arrays.length ? stats.arrays.slice(0, 20).map((item) => <div key={item.path}>{item.path}: {item.length}</div>) : "No arrays found."}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Draft schema</p>
                  <CodeBlock value={schema} />
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
