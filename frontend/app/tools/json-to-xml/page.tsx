"use client";

import { useState } from "react";
import { XMLBuilder } from "fast-xml-parser";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, ErrorCard, ToolInput, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

export default function JsonToXmlPage() {
  const [input, setInput] = useState("");
  const [root, setRoot] = useState("root");
  const [indent, setIndent] = useState("  ");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const convert = () => {
    try {
      const parsed = JSON.parse(input);
      const xml = new XMLBuilder({ format: true, indentBy: indent }).build({ [root || "root"]: parsed });
      setOutput(xml); setError("");
    } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Conversion failed."); }
  };
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "JSON to XML" }]} title="JSON to XML" description="Convert JSON objects to XML." /><div className="space-y-5">
    <div><Label>JSON</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} /></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><Label>Root element name</Label><ToolInput value={root} onChange={(e) => setRoot(e.target.value)} /></div><div><Label>Indent</Label><ToolSelect value={indent} onChange={(e) => setIndent(e.target.value)} className="w-full"><option value="  ">2 spaces</option><option value="    ">4 spaces</option><option value="\t">Tabs</option></ToolSelect></div></div>
    <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>
    {error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>XML</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
  </div></ToolShell>;
}
