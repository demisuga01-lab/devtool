"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CopyButton, Label, Toggle } from "@/components/ui";

export default function UrlEncoderPage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [variant, setVariant] = useState<"component" | "full">("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    setError("");
    setOutput("");
    try {
      if (mode === "encode") {
        setOutput(variant === "component" ? encodeURIComponent(input) : encodeURI(input));
      } else {
        setOutput(variant === "component" ? decodeURIComponent(input) : decodeURI(input));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <ToolShell slug="url-encoder">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            value={mode}
            onChange={(v) => setMode(v as "encode" | "decode")}
            options={[{ label: "Encode", value: "encode" }, { label: "Decode", value: "decode" }]}
          />
          <Toggle
            value={variant}
            onChange={(v) => setVariant(v as "component" | "full")}
            options={[
              { label: "Component", value: "component" },
              { label: "Full URI", value: "full" },
            ]}
          />
        </div>
        <div>
          <Label>Input</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
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
