"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, Label, Textarea } from "@/components/ui";
import { InlineError, SuccessBanner, explainXmlError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

function parseXml(input: string): { doc: Document | null; error: ToolError | null } {
  const doc = new DOMParser().parseFromString(input, "text/xml");
  const parseError = doc.querySelector("parsererror");
  return parseError ? { doc: null, error: explainXmlError(parseError.textContent || "") } : { doc, error: null };
}

function formatXml(input: string): string {
  const parsed = parseXml(input);
  if (!parsed.doc) throw parsed.error ?? new Error("Invalid XML");
  const xml = new XMLSerializer().serializeToString(parsed.doc);
  return xml.replace(/></g, ">\n<").split("\n").reduce((lines: string[], line) => {
    const trimmed = line.trim();
    const prev = lines.length ? lines[lines.length - 1] : "";
    let depth = Math.max(0, (prev.match(/^ */)?.[0].length ?? 0) / 2);
    if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${trimmed}`);
    return lines;
  }, []).join("\n");
}

export default function XmlFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [success, setSuccess] = useState("");

  const run = (mode: "format" | "minify" | "validate") => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      setSuccess("");
      return;
    }
    const parsed = parseXml(input);
    if (parsed.error) {
      setOutput("");
      setSuccess("");
      setError(parsed.error);
      return;
    }
    setError(null);
    if (mode === "validate") {
      setOutput("");
      setSuccess("Valid XML.");
    } else if (mode === "minify") {
      setSuccess("");
      setOutput(input.replace(/>\s+</g, "><").trim());
    } else {
      setSuccess("");
      setOutput(formatXml(input));
    }
  };

  return (
    <ToolShell slug="xml-formatter">
      <div className="space-y-5">
        <div>
          <Label>XML</Label>
          <Textarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setError(null); setSuccess(""); } }} rows={12} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => run("format")} disabled={!input}>Format</Button>
          <Button onClick={() => run("minify")} disabled={!input}>Minify</Button>
          <Button onClick={() => run("validate")} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); setSuccess(""); }}>Clear</Button>
        </div>
        {success && <SuccessBanner>{success}</SuccessBanner>}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
