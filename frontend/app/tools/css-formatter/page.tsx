"use client";

import { useState } from "react";
import { css as beautifyCss } from "js-beautify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, ErrorCard, CopyButton, Label, CodeBlock, Panel, ResultCard } from "@/components/tool-ui";
import { analyzeCss, formatBytes, utf8ByteLength } from "@/lib/tool-insights";

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
  const insight = input ? analyzeCss(input) : null;

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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "CSS Formatter" }]} title="CSS Formatter" description="Format and tidy CSS rules." />
      <div className="space-y-5">
        <div>
          <Label>CSS</Label>
          <ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={format} disabled={!input}>Format</Button>
          <Button onClick={minify} disabled={!input}>Minify</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {insight && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label="Rules" value={String(insight.ruleCount)} />
              <ResultCard label="Selectors" value={String(insight.selectorCount)} />
              <ResultCard label="Properties" value={String(insight.propertyCount)} />
              <ResultCard label="Media Queries" value={String(insight.mediaQueryCount)} />
            </div>
            <Panel noPadding className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {insight.duplicateSelectors.length > 0 && <Badge variant="warning">{insight.duplicateSelectors.length} duplicate selectors</Badge>}
                {insight.vendorWarnings.length > 0 && <Badge variant="warning">vendor prefix check</Badge>}
                {insight.highSpecificity.length > 0 && <Badge variant="warning">high specificity selectors</Badge>}
                {!insight.duplicateSelectors.length && !insight.vendorWarnings.length && !insight.highSpecificity.length && <Badge variant="success">no common CSS warnings</Badge>}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Duplicates</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{insight.duplicateSelectors.slice(0, 5).map((item) => `${item.selector} x${item.count}`).join(", ") || "None"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Vendor prefixes</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{insight.vendorWarnings.slice(0, 5).join(", ") || "None missing standard property"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Size</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{insight.beforeBytes}{output ? ` to ${formatBytes(utf8ByteLength(output))}` : ""}</p>
                </div>
              </div>
            </Panel>
          </div>
        )}
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
