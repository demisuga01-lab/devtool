"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, CodeBlock, CopyButton, Label } from "@/components/ui";
import { InlineError, SuccessBanner, explainJsonError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonToolError | null>(null);
  const [success, setSuccess] = useState("");

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
    <ToolShell slug="json-formatter">
      <div className="space-y-5">
        <div>
          <Label>Input</Label>
          <Textarea
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={format} disabled={!input}>Format</Button>
          <Button onClick={minify} disabled={!input}>Minify</Button>
          <Button onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={clear}>Clear</Button>
        </div>
        {success && <SuccessBanner>{success}</SuccessBanner>}
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
