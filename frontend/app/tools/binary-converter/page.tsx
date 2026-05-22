"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar } from "@/components/tool-ui";

export default function BinaryConverterPage() {
  const [mode, setMode] = useState<"toBin" | "toText">("toBin");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    setError("");
    setOutput("");
    try {
      if (mode === "toBin") {
        const bytes = new TextEncoder().encode(input);
        setOutput(Array.from(bytes).map((b) => b.toString(2).padStart(8, "0")).join(" "));
      } else {
        const tokens = input.trim().split(/\s+/).filter(Boolean);
        const bytes = new Uint8Array(
          tokens.map((b) => {
            if (!/^[01]{1,8}$/.test(b)) throw new Error(`Invalid binary token: ${b}`);
            return parseInt(b, 2);
          }),
        );
        setOutput(new TextDecoder("utf-8").decode(bytes));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Encode & Convert" }, { label: "Binary Converter" }]} title="Binary Converter" description="Convert between text and binary." />
      <div className="space-y-5">
        <TabBar
          active={mode}
          onChange={(v) => setMode(v as "toBin" | "toText")}
          tabs={[
            { label: "Text → Binary", value: "toBin" },
            { label: "Binary → Text", value: "toText" },
          ]}
        />
        <div>
          <Label>Input</Label>
          <ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} />
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
            <ToolTextarea value={output} readOnly rows={8} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
