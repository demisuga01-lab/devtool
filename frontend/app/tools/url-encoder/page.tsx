"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, CopyButton, Label, TabBar, Panel, ResultCard } from "@/components/tool-ui";
import { InlineError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeUrlEncoding } from "@/lib/tool-insights";

export default function UrlEncoderPage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [variant, setVariant] = useState<"component" | "full">("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const insight = output ? analyzeUrlEncoding(input, output, mode) : null;

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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "URL Encoder" }]} title="URL Encoder" description="Encode and decode URL components." />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <TabBar active={mode} onChange={(v) => { setMode(v as "encode" | "decode"); setError(null); setOutput(""); }} tabs={[{ label: "Encode", value: "encode" }, { label: "Decode", value: "decode" }]} />
          <TabBar active={variant} onChange={(v) => setVariant(v as "component" | "full")} tabs={[{ label: "Component", value: "component" }, { label: "Full URI", value: "full" }]} />
        </div>
        <div>
          <Label>Input</Label>
          <ToolTextarea
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label="Input Bytes" value={insight?.inputBytes ?? "-"} />
              <ResultCard label="Output Bytes" value={insight?.outputBytes ?? "-"} />
              <ResultCard label="Mode" value={mode === "encode" ? "Percent encode" : "Percent decode"} />
              <ResultCard label="Scope" value={variant === "component" ? "URL component" : "Full URI"} />
            </div>
            {insight?.fullUrlDetected && mode === "encode" && (
              <Panel noPadding className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="info">full URL detected</Badge>
                  <span className="text-xs text-zinc-500">Often only query parameter values should be encoded, not the entire URL.</span>
                </div>
                <pre className="overflow-auto rounded-xl bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{insight.queryOnly}</pre>
              </Panel>
            )}
            {insight && (insight.encodedChars.length > 0 || insight.decodedPairs.length > 0) && (
              <Panel noPadding className="overflow-hidden">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {mode === "encode" ? "Encoded character report" : "%XX decode report"}
                  </h2>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
                      <tr><th className="px-4 py-2">Original</th><th className="px-4 py-2">Encoded</th><th className="px-4 py-2">Why</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(mode === "encode" ? insight.encodedChars : insight.decodedPairs.map((item) => ({ char: item.char, encoded: item.encoded, reason: "Percent triplet decoded to this byte value." }))).map((row, index) => (
                        <tr key={`${row.encoded}-${index}`}>
                          <td className="px-4 py-2 font-mono">{JSON.stringify(row.char)}</td>
                          <td className="px-4 py-2 font-mono">{row.encoded}</td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
