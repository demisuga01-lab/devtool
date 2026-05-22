"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

export default function SqlEscapePage() {
  const [dialect, setDialect] = useState("mysql"), [input, setInput] = useState("");
  const output = dialect === "postgresql" || dialect === "mssql" ? input.replace(/'/g, "''") : input.replace(/\\/g, "\\\\").replace(/'/g, "''");
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Escape" }, { label: "SQL Escape" }]} title="SQL Escape" description="Escape strings for safe SQL usage." /><div className="space-y-5"><div><Label>Dialect</Label><ToolSelect value={dialect} onChange={(e) => setDialect(e.target.value)}><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option><option value="sqlite">SQLite</option><option value="mssql">MSSQL</option></ToolSelect></div><div><Label>Input</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} /></div><div className="flex gap-2"><Button variant="primary" disabled={!input}>Escape</Button><Button variant="ghost" onClick={() => setInput("")}>Clear</Button></div>{output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Escaped string</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}<p className="text-xs text-zinc-500 dark:text-zinc-500">Always use parameterized queries in production. This tool is for reference only.</p></div></ToolShell>;
}
