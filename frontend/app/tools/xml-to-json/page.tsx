"use client";

import { useState } from "react";
import { XMLParser } from "fast-xml-parser";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, Checkbox, CodeBlock, CopyButton, ErrorCard, Label, ToolTextarea } from "@/components/tool-ui";

export default function XmlToJsonPage() {
  const [input, setInput] = useState("");
  const [ignoreAttributes, setIgnoreAttributes] = useState(false);
  const [parseNumbers, setParseNumbers] = useState(true);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const convert = () => {
    try {
      const parser = new XMLParser({ ignoreAttributes, parseTagValue: parseNumbers, parseAttributeValue: parseNumbers });
      setOutput(JSON.stringify(parser.parse(input), null, 2)); setError("");
    } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Conversion failed."); }
  };
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XML to JSON" }]} title="XML to JSON" description="Convert XML documents to JSON." /><div className="space-y-5">
    <div><Label>XML</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} /></div>
    <div className="flex flex-wrap gap-4"><Checkbox checked={ignoreAttributes} onChange={setIgnoreAttributes} label="Ignore attributes" /><Checkbox checked={parseNumbers} onChange={setParseNumbers} label="Parse numbers" /></div>
    <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>
    {error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>JSON</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
  </div></ToolShell>;
}
