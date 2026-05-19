"use client";

import { useState } from "react";
import { js as beautifyJs } from "js-beautify";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, Select, Textarea } from "@/components/ui";

export default function JsBeautifierPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState("2");
  const [brace, setBrace] = useState("collapse");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const run = (minify = false) => { try { setOutput(minify ? input.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace(/\s+/g, " ").trim() : beautifyJs(input, { indent_size: indent === "tab" ? 1 : Number(indent), indent_with_tabs: indent === "tab", brace_style: brace as any })); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Beautify failed."); } };
  return <ToolShell slug="js-beautifier"><div className="space-y-5"><div><Label>JavaScript</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div><div className="flex flex-wrap gap-3"><div><Label>Indent size</Label><Select value={indent} onChange={(e) => setIndent(e.target.value)}><option value="2">2</option><option value="4">4</option><option value="tab">Tabs</option></Select></div><div><Label>Brace style</Label><Select value={brace} onChange={(e) => setBrace(e.target.value)}><option>collapse</option><option>expand</option><option>end-expand</option></Select></div></div><div className="flex gap-2"><Button variant="primary" onClick={() => run()} disabled={!input}>Beautify</Button><Button onClick={() => run(true)} disabled={!input}>Minify</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}</div></ToolShell>;
}
