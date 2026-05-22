"use client";

import { useState } from "react";
import { js as beautifyJs } from "js-beautify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

export default function JsBeautifierPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState("2");
  const [brace, setBrace] = useState("collapse");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const run = (minify = false) => { try { setOutput(minify ? input.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace(/\s+/g, " ").trim() : beautifyJs(input, { indent_size: indent === "tab" ? 1 : Number(indent), indent_with_tabs: indent === "tab", brace_style: brace as any })); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Beautify failed."); } };
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "JS Beautifier" }]} title="JS Beautifier" description="Format and beautify JavaScript code." /><div className="space-y-5"><div><Label>JavaScript</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div><div className="flex flex-wrap gap-3"><div><Label>Indent size</Label><ToolSelect value={indent} onChange={(e) => setIndent(e.target.value)}><option value="2">2</option><option value="4">4</option><option value="tab">Tabs</option></ToolSelect></div><div><Label>Brace style</Label><ToolSelect value={brace} onChange={(e) => setBrace(e.target.value)}><option>collapse</option><option>expand</option><option>end-expand</option></ToolSelect></div></div><div className="flex gap-2"><Button variant="primary" onClick={() => run()} disabled={!input}>Beautify</Button><Button onClick={() => run(true)} disabled={!input}>Minify</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}</div></ToolShell>;
}
