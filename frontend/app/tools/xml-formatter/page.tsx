"use client";

import { useMemo, useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CodeBlock, CopyButton, Label, Panel, ResultCard, ToolTextarea } from "@/components/tool-ui";
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

function analyzeXml(doc: Document) {
  const elements = Array.from(doc.querySelectorAll("*"));
  const namespaces = new Set<string>();
  const ids = new Map<string, number>();
  let attributes = 0;
  let maxDepth = 0;
  elements.forEach((element) => {
    attributes += element.attributes.length;
    if (element.prefix) namespaces.add(element.prefix);
    Array.from(element.attributes).forEach((attr) => {
      if (attr.prefix && attr.prefix !== "xmlns") namespaces.add(attr.prefix);
      if (attr.name === "id") ids.set(attr.value, (ids.get(attr.value) || 0) + 1);
    });
    let depth = 0;
    let node: Element | null = element;
    while (node?.parentElement) {
      depth++;
      node = node.parentElement;
    }
    maxDepth = Math.max(maxDepth, depth);
  });
  return {
    elements: elements.length,
    attributes,
    maxDepth,
    namespaces: Array.from(namespaces),
    duplicateIds: Array.from(ids.entries()).filter(([, count]) => count > 1).map(([id]) => id),
  };
}

export default function XmlFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [success, setSuccess] = useState("");
  const stats = useMemo(() => doc ? analyzeXml(doc) : null, [doc]);

  const run = (mode: "format" | "minify" | "validate") => {
    if (!input.trim()) {
      setOutput("");
      setDoc(null);
      setError(null);
      setSuccess("");
      return;
    }
    const parsed = parseXml(input);
    if (parsed.error || !parsed.doc) {
      setOutput("");
      setDoc(null);
      setSuccess("");
      setError(parsed.error);
      return;
    }
    setDoc(parsed.doc);
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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XML Formatter" }]} title="XML Formatter" description="Format and validate XML documents." />
      <div className="space-y-5">
        <div>
          <Label>XML</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setDoc(null); setError(null); setSuccess(""); } }} rows={12} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => run("format")} disabled={!input}>Format</Button>
          <Button onClick={() => run("minify")} disabled={!input}>Minify</Button>
          <Button onClick={() => run("validate")} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setDoc(null); setError(null); setSuccess(""); }}>Clear</Button>
        </div>
        {success && <SuccessBanner>{success}</SuccessBanner>}
        {stats && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <ResultCard label="Elements" value={stats.elements.toLocaleString()} />
              <ResultCard label="Attributes" value={stats.attributes.toLocaleString()} />
              <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
              <ResultCard label="Namespaces" value={stats.namespaces.length ? stats.namespaces.join(", ") : "none"} />
            </div>
            {(stats.duplicateIds.length > 0 || stats.maxDepth > 8) && (
              <Panel noPadding className="space-y-2 p-4">
                <div className="flex flex-wrap gap-2">
                  {stats.duplicateIds.length > 0 && <Badge variant="warning">duplicate IDs: {stats.duplicateIds.join(", ")}</Badge>}
                  {stats.maxDepth > 8 && <Badge variant="warning">deep nesting</Badge>}
                </div>
              </Panel>
            )}
          </>
        )}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
