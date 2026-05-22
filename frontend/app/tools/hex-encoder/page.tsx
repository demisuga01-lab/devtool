"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar, Panel, ResultCard } from "@/components/tool-ui";
import { formatBytes, utf8ByteLength } from "@/lib/tool-insights";

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
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <ResultCard label="Input Bytes" value={formatBytes(utf8ByteLength(input))} />
              <ResultCard label="Output Tokens" value={String(output.trim().split(/\s+/).filter(Boolean).length)} />
              <ResultCard label="Encoding" value={mode === "toHex" ? "UTF-8 text to hex bytes" : "Hex bytes to UTF-8 text"} />
            </div>
            {mode === "toHex" && input.length <= 64 && (
              <Panel noPadding className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950"><tr><th className="px-4 py-2">Char</th><th className="px-4 py-2">Code point</th><th className="px-4 py-2">UTF-8 hex</th></tr></thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {Array.from(input).map((char, index) => (
                      <tr key={`${char}-${index}`}><td className="px-4 py-2 font-mono">{JSON.stringify(char)}</td><td className="px-4 py-2 font-mono">U+{char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}</td><td className="px-4 py-2 font-mono">{Array.from(new TextEncoder().encode(char)).map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
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
