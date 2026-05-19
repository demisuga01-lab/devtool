"use client";

import { useState } from "react";
import { css as beautifyCss } from "js-beautify";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CopyButton, Label, CodeBlock } from "@/components/ui";

function minifyCss(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

export default function CssFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const format = () => {
    try {
      setError("");
      setOutput(beautifyCss(input, { indent_size: 2 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Format failed.");
      setOutput("");
    }
  };

  const minify = () => {
    try {
      setError("");
      setOutput(minifyCss(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Minify failed.");
      setOutput("");
    }
  };

  return (
    <ToolShell slug="css-formatter">
      <div className="space-y-5">
        <div>
          <Label>CSS</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={format} disabled={!input}>Format</Button>
          <Button onClick={minify} disabled={!input}>Minify</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
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
