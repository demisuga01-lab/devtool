"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar } from "@/components/tool-ui";

export default function HexEncoderPage() {
  const [mode, setMode] = useState<"toHex" | "toText">("toHex");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    setError("");
    setOutput("");
    try {
      if (mode === "toHex") {
        const bytes = new TextEncoder().encode(input);
        setOutput(
          Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" "),
        );
      } else {
        const tokens = input.trim().split(/\s+/).filter(Boolean);
        const bytes = new Uint8Array(
          tokens.map((h) => {
            if (!/^[0-9a-fA-F]{1,2}$/.test(h)) throw new Error(`Invalid hex token: ${h}`);
            return parseInt(h, 16);
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
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Encode & Convert" }, { label: "Hex Encoder" }]} title="Hex Encoder" description="Convert between text and hexadecimal." />
      <div className="space-y-5">
        <TabBar
          active={mode}
          onChange={(v) => setMode(v as "toHex" | "toText")}
          tabs={[
            { label: "Text → Hex", value: "toHex" },
            { label: "Hex → Text", value: "toText" },
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
