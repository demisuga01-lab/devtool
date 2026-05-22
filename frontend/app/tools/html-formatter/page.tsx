"use client";

import { useState } from "react";
import { html as beautifyHtml } from "js-beautify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, CodeBlock } from "@/components/tool-ui";

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
