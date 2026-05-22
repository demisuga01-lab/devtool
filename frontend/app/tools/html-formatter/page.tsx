"use client";

import { useState } from "react";
import { html as beautifyHtml } from "js-beautify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, ErrorCard, CopyButton, Label, CodeBlock, Panel, ResultCard } from "@/components/tool-ui";
import { analyzeHtml, formatBytes, utf8ByteLength } from "@/lib/tool-insights";

function minifyHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function HtmlFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const insight = input ? analyzeHtml(input) : null;

  const format = () => {
    try {
      setError("");
      setOutput(
        beautifyHtml(input, {
          indent_size: 2,
          wrap_line_length: 120,
          preserve_newlines: true,
          max_preserve_newlines: 1,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Format failed.");
      setOutput("");
    }
  };

  const minify = () => {
    try {
      setError("");
      setOutput(minifyHtml(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Minify failed.");
      setOutput("");
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "HTML Formatter" }]} title="HTML Formatter" description="Format and tidy HTML markup." />
      <div className="space-y-5">
        <div>
          <Label>HTML</Label>
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
              <ResultCard label="Tags" value={String(insight.tagCount)} />
              <ResultCard label="Max Depth" value={String(insight.maxDepth)} />
              <ResultCard label="Inline Styles" value={String(insight.inlineStyleCount)} />
              <ResultCard label="Scripts" value={String(insight.scriptTagCount)} />
            </div>
            <Panel noPadding className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {insight.missingLang && <Badge variant="warning">html lang missing</Badge>}
                {insight.missingAlt > 0 && <Badge variant="warning">{insight.missingAlt} images missing alt</Badge>}
                {insight.deprecatedTags.map((tag) => <Badge key={tag} variant="warning">deprecated {tag}</Badge>)}
                {!insight.missingLang && insight.missingAlt === 0 && insight.deprecatedTags.length === 0 && <Badge variant="success">no common markup warnings</Badge>}
              </div>
              {output && <p className="mt-3 text-xs text-zinc-500">Size: {insight.beforeBytes} to {formatBytes(utf8ByteLength(output))}</p>}
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
