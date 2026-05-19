"use client";

import { useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, Select, Textarea } from "@/components/ui";

export default function JsonToYamlPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const convert = () => { try { setOutput(yaml.dump(JSON.parse(input), { indent })); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Conversion failed."); } };
  return <ToolShell slug="json-to-yaml"><div className="space-y-5"><div><Label>JSON</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div><div><Label>Indent</Label><Select value={indent} onChange={(e) => setIndent(Number(e.target.value))}><option value={2}>2</option><option value={4}>4</option></Select></div><div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>YAML</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}</div></ToolShell>;
}
