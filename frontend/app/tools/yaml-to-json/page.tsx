"use client";

import { useState } from "react";
import * as yaml from "js-yaml";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, Textarea } from "@/components/ui";

export default function YamlToJsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const convert = () => { try { setOutput(JSON.stringify(yaml.load(input), null, 2)); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "YAML parse error."); } };
  return <ToolShell slug="yaml-to-json"><div className="space-y-5"><div><Label>YAML</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div><div className="flex gap-2"><Button variant="primary" onClick={convert} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>JSON</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}</div></ToolShell>;
}
