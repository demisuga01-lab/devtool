"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CodeBlock, CopyButton, Label } from "@/components/ui";

function findLineColumn(text: string, position: number): { line: number; col: number } {
  const before = text.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function parseError(text: string, err: unknown): string {
  if (!(err instanceof Error)) return "Invalid JSON";
  const m = err.message.match(/position (\d+)/);
  if (m) {
    const { line, col } = findLineColumn(text, parseInt(m[1], 10));
    return `${err.message} (line ${line}, column ${col})`;
  }
  return err.message;
}

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const format = () => {
    try {
      setError("");
      setOutput(JSON.stringify(JSON.parse(input), null, 2));
    } catch (e) {
      setError(parseError(input, e));
      setOutput("");
    }
  };

  const minify = () => {
    try {
      setError("");
      setOutput(JSON.stringify(JSON.parse(input)));
    } catch (e) {
      setError(parseError(input, e));
      setOutput("");
    }
  };

  const validate = () => {
    try {
      JSON.parse(input);
      setError("");
      setOutput("Valid JSON.");
    } catch (e) {
      setError(parseError(input, e));
      setOutput("");
    }
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolShell slug="json-formatter">
      <div className="space-y-5">
        <div>
          <Label>Input</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            placeholder='{"hello": "world"}'
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={format} disabled={!input}>Format</Button>
          <Button onClick={minify} disabled={!input}>Minify</Button>
          <Button onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={clear}>Clear</Button>
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
