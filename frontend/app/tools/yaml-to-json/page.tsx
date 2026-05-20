"use client";

import { useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, Label, Textarea } from "@/components/ui";
import { InlineError, explainYamlError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

export default function YamlToJsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);

  const convert = () => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setOutput(JSON.stringify(yaml.load(input), null, 2));
      setError(null);
    } catch (e) {
      setOutput("");
      setError(explainYamlError(e));
    }
  };

  return (
    <ToolShell slug="yaml-to-json">
      <div className="space-y-5">
        <div>
          <Label>YAML</Label>
          <Textarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setError(null); } }} rows={12} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); }}>Clear</Button></div>
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>JSON</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
