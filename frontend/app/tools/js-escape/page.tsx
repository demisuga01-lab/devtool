"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, ErrorCard, Label, Textarea, Toggle } from "@/components/ui";

export default function JsEscapePage() {
  const [mode, setMode] = useState("escape"), [input, setInput] = useState(""), [output, setOutput] = useState(""), [error, setError] = useState("");
  const run = () => { try { setOutput(mode === "escape" ? JSON.stringify(input).slice(1, -1).replace(/'/g, "\\'") : JSON.parse(`"${input.replace(/\\'/g, "'")}"`)); setError(""); } catch (e) { setOutput(""); setError(e instanceof Error ? e.message : "Could not unescape string."); } };
  return <ToolShell slug="js-escape"><div className="space-y-5"><Toggle value={mode} onChange={setMode} options={[{ label: "Escape", value: "escape" }, { label: "Unescape", value: "unescape" }]} /><div><Label>Input</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" onClick={run} disabled={!input}>Convert</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><Textarea value={output} readOnly rows={8} /></div>}</div></ToolShell>;
}
