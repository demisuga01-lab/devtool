"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, Textarea } from "@/components/ui";

function parseXml(input: string): Document {
  const doc = new DOMParser().parseFromString(input, "text/xml");
  const error = doc.querySelector("parsererror");
  if (error) throw new Error(error.textContent?.trim() || "Invalid XML");
  return doc;
}

function formatXml(input: string): string {
  const xml = new XMLSerializer().serializeToString(parseXml(input));
  return xml.replace(/></g, ">\n<").split("\n").reduce((lines: string[], line) => {
    const trimmed = line.trim();
    const prev = lines.length ? lines[lines.length - 1] : "";
    let depth = Math.max(0, (prev.match(/^ */)?.[0].length ?? 0) / 2);
    if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${trimmed}`);
    if (/^<[^!?/][^>]*[^/]>/ .test(trimmed) && !/^<[^>]+>.*<\/[^>]+>$/.test(trimmed)) depth++;
    return lines;
  }, []).join("\n");
}

export default function XmlFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const run = (mode: "format" | "minify" | "validate") => {
    try {
      setError("");
      parseXml(input);
      if (mode === "validate") setOutput("Valid XML.");
      else if (mode === "minify") setOutput(input.replace(/>\s+</g, "><").trim());
      else setOutput(formatXml(input));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "Invalid XML");
    }
  };
  return (
    <ToolShell slug="xml-formatter">
      <div className="space-y-5">
        <div><Label>XML</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => run("format")} disabled={!input}>Format</Button>
          <Button onClick={() => run("minify")} disabled={!input}>Minify</Button>
          <Button onClick={() => run("validate")} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
