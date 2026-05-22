"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, Checkbox, CopyButton, ErrorCard, Label, ToolTextarea, TabBar } from "@/components/tool-ui";

export default function JsonEscapePage() {
  const [mode, setMode] = useState("escape"), [wrap, setWrap] = useState(false), [input, setInput] = useState(""), [output, setOutput] = useState(""), [error, setError] = useState("");
  const run = () => { try { const next = mode === "escape" ? JSON.stringify(input) : JSON.parse(wrap ? input : `"${input}"`); setOutput(mode === "escape" && !wrap ? next.slice(1, -1) : next); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Conversion failed."); } };
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Escape" }, { label: "JSON Escape" }]} title="JSON Escape" description="Escape or unescape JSON string values." /><div className="space-y-5"><div className="flex flex-wrap gap-4"><TabBar active={mode} onChange={setMode} tabs={[{ label: "Escape", value: "escape" }, { label: "Unescape", value: "unescape" }]} /><Checkbox checked={wrap} onChange={setWrap} label="Wrap in quotes" /></div><div><Label>Input</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" onClick={run} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><ToolTextarea value={output} readOnly rows={8} /></div>}</div></ToolShell>;
}
