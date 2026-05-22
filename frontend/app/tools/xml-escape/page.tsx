"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CopyButton, Label, ToolTextarea, TabBar } from "@/components/tool-ui";

const xmlMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
function escapeXml(s: string) { return s.replace(/[&<>"']/g, (c) => xmlMap[c]); }
function unescapeXml(s: string) { return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[m] || m)); }

export default function XmlEscapePage() {
  const [mode, setMode] = useState("escape"); const [input, setInput] = useState(""); const output = mode === "escape" ? escapeXml(input) : unescapeXml(input);
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Escape" }, { label: "XML Escape" }]} title="XML Escape" description="Escape or unescape XML special characters." /><div className="space-y-5"><TabBar active={mode} onChange={setMode} tabs={[{ label: "Escape", value: "escape" }, { label: "Unescape", value: "unescape" }]} /><div><Label>Input</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => setInput("")}>Clear</Button></div>{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><ToolTextarea value={output} readOnly rows={8} /></div>}</div></ToolShell>;
}
