"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Label, Textarea, Toggle } from "@/components/ui";

const xmlMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
function escapeXml(s: string) { return s.replace(/[&<>"']/g, (c) => xmlMap[c]); }
function unescapeXml(s: string) { return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[m] || m)); }

export default function XmlEscapePage() {
  const [mode, setMode] = useState("escape"); const [input, setInput] = useState(""); const output = mode === "escape" ? escapeXml(input) : unescapeXml(input);
  return <ToolShell slug="xml-escape"><div className="space-y-5"><Toggle value={mode} onChange={setMode} options={[{ label: "Escape", value: "escape" }, { label: "Unescape", value: "unescape" }]} /><div><Label>Input</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => setInput("")}>Clear</Button></div>{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><Textarea value={output} readOnly rows={8} /></div>}</div></ToolShell>;
}
