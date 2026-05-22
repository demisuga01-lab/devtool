"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar, Panel, ResultCard } from "@/components/tool-ui";

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
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <ResultCard label="Binary" value={mode === "toBin" ? output : input} mono copyable />
              <ResultCard label="Decimal" value={mode === "toBin" ? Array.from(new TextEncoder().encode(input)).map((byte) => String(byte)).join(" ") : input.trim().split(/\s+/).map((byte) => String(parseInt(byte, 2))).join(" ")} mono copyable />
              <ResultCard label="Hex" value={mode === "toBin" ? Array.from(new TextEncoder().encode(input)).map((byte) => byte.toString(16).padStart(2, "0")).join(" ") : input.trim().split(/\s+/).map((byte) => parseInt(byte, 2).toString(16).padStart(2, "0")).join(" ")} mono copyable />
              <ResultCard label="Octal" value={mode === "toBin" ? Array.from(new TextEncoder().encode(input)).map((byte) => byte.toString(8)).join(" ") : input.trim().split(/\s+/).map((byte) => parseInt(byte, 2).toString(8)).join(" ")} mono copyable />
            </div>
            {mode === "toBin" && input.length <= 64 && (
              <Panel noPadding className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950"><tr><th className="px-4 py-2">Char</th><th className="px-4 py-2">ASCII/UTF-8</th><th className="px-4 py-2">Binary</th></tr></thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {Array.from(input).map((char, index) => {
                      const bytes = Array.from(new TextEncoder().encode(char));
                      return <tr key={`${char}-${index}`}><td className="px-4 py-2 font-mono">{JSON.stringify(char)}</td><td className="px-4 py-2 font-mono">{bytes.join(" ")}</td><td className="px-4 py-2 font-mono">{bytes.map((byte) => byte.toString(2).padStart(8, "0")).join(" ")}</td></tr>;
                    })}
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
