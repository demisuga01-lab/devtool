"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, CopyButton, Label, Toggle } from "@/components/ui";
import { InlineError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

export default function UrlEncoderPage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [variant, setVariant] = useState<"component" | "full">("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);

  const convert = () => {
    setError(null);
    setOutput("");
    if (!input.trim()) return;
    try {
      if (mode === "encode") {
        setOutput(variant === "component" ? encodeURIComponent(input) : encodeURI(input));
      } else {
        setOutput(variant === "component" ? decodeURIComponent(input) : decodeURI(input));
      }
    } catch {
      setError({
        title: "Invalid URL-encoded input",
        detail: "The input contains an invalid percent-encoded sequence.",
        suggestion: "Look for % signs not followed by two hex digits (0-9, A-F). For example, %GG is invalid. Use %25 to represent a literal percent character.",
      });
    }
  };

  return (
    <ToolShell slug="url-encoder">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle value={mode} onChange={(v) => { setMode(v as "encode" | "decode"); setError(null); setOutput(""); }} options={[{ label: "Encode", value: "encode" }, { label: "Decode", value: "decode" }]} />
          <Toggle value={variant} onChange={(v) => setVariant(v as "component" | "full")} options={[{ label: "Component", value: "component" }, { label: "Full URI", value: "full" }]} />
        </div>
        <div>
          <Label>Input</Label>
          <Textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) {
                setOutput("");
                setError(null);
              }
            }}
            rows={8}
          />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); }}>Clear</Button>
        </div>
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <CopyButton value={output} />
            </div>
            <Textarea value={output} readOnly rows={8} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
