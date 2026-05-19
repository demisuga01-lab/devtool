"use client";

import { useState } from "react";
import { XMLBuilder } from "fast-xml-parser";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";

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
  return <ToolShell slug="json-to-xml"><div className="space-y-5">
    <div><Label>JSON</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} /></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><Label>Root element name</Label><Input value={root} onChange={(e) => setRoot(e.target.value)} /></div><div><Label>Indent</Label><Select value={indent} onChange={(e) => setIndent(e.target.value)} className="w-full"><option value="  ">2 spaces</option><option value="    ">4 spaces</option><option value="\t">Tabs</option></Select></div></div>
    <div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>
    {error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>XML</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
  </div></ToolShell>;
}
