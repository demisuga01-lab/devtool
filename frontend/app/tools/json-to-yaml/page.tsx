"use client";

import { useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";
import { InlineError, explainJsonError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonToYamlPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonToolError | null>(null);

  const convert = () => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setOutput(yaml.dump(JSON.parse(input), { indent }));
      setError(null);
    } catch (e) {
      setOutput("");
      setError(explainJsonError(input, e));
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "JSON to YAML" }]} title="JSON to YAML" description="Convert JSON to YAML format." />
      <div className="space-y-5">
        <div>
          <Label>JSON</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setError(null); } }} rows={12} />
          {error && <InlineError error={error} />}
          {error?.line && <p className="mt-1 text-xs text-red-500">Error near line {error.line}</p>}
        </div>
        <div><Label>Indent</Label><ToolSelect value={indent} onChange={(e) => setIndent(Number(e.target.value))}><option value={2}>2</option><option value={4}>4</option></ToolSelect></div>
        <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); }}>Clear</Button></div>
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>YAML</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
