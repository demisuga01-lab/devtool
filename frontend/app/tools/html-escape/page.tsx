"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CopyButton, Label, ToolTextarea, TabBar } from "@/components/tool-ui";

const htmlMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => htmlMap[c]); }
function unescapeHtml(s: string) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&(amp|lt|gt|quot|#39);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] || m));
}

export default function HtmlEscapePage() {
  const [mode, setMode] = useState("escape"); const [input, setInput] = useState(""); const output = mode === "escape" ? escapeHtml(input) : unescapeHtml(input);
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Escape" }, { label: "HTML Escape" }]} title="HTML Escape" description="Escape or unescape HTML entities." /><div className="space-y-5"><TabBar active={mode} onChange={setMode} tabs={[{ label: "Escape", value: "escape" }, { label: "Unescape", value: "unescape" }]} /><div><Label>Input</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => setInput("")}>Clear</Button></div>{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><ToolTextarea value={output} readOnly rows={8} /></div>}</div></ToolShell>;
}
