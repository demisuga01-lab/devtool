"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, Label, Panel, ResultCard, ToolTextarea } from "@/components/tool-ui";
import { InlineError, SuccessBanner, explainXmlError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

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

export default function XmlValidatorPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [valid, setValid] = useState(false);
  const stats = useMemo(() => doc ? analyzeXml(doc) : null, [doc]);

  const validate = () => {
    if (!input.trim()) {
      setError(null);
      setDoc(null);
      setValid(false);
      return;
    }
    const parsed = new DOMParser().parseFromString(input, "text/xml");
    const parseError = parsed.querySelector("parsererror");
    if (parseError) {
      setDoc(null);
      setValid(false);
      setError(explainXmlError(parseError.textContent || ""));
    } else {
      setDoc(parsed);
      setError(null);
      setValid(true);
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XML Validator" }]} title="XML Validator" description="Check if XML is well-formed." />
      <div className="space-y-5">
        <div>
          <Label>XML</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setError(null); setDoc(null); setValid(false); } }} rows={14} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex gap-2"><Button variant="primary" onClick={validate} disabled={!input}>Validate</Button><Button variant="ghost" onClick={() => { setInput(""); setError(null); setDoc(null); setValid(false); }}>Clear</Button></div>
        {valid && <SuccessBanner><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Valid XML.</div></SuccessBanner>}
        {stats && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <ResultCard label="Elements" value={stats.elements.toLocaleString()} />
              <ResultCard label="Attributes" value={stats.attributes.toLocaleString()} />
              <ResultCard label="Max Depth" value={String(stats.maxDepth)} />
              <ResultCard label="Namespaces" value={stats.namespaces.length ? stats.namespaces.join(", ") : "none"} />
            </div>
            <Panel noPadding className="space-y-2 p-4">
              <div className="flex flex-wrap gap-2">
                {stats.duplicateIds.length ? <Badge variant="warning">duplicate IDs: {stats.duplicateIds.join(", ")}</Badge> : <Badge variant="success">no duplicate IDs detected</Badge>}
                {stats.maxDepth > 8 && <Badge variant="warning">deep nesting</Badge>}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Validates XML well-formedness only, not against an XSD schema.</p>
            </Panel>
          </>
        )}
      </div>
    </ToolShell>
  );
}
