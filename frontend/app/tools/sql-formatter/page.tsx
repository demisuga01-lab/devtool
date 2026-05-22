"use client";

import { useState } from "react";
import { format } from "sql-formatter";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

const dialects = [
  ["sql", "Standard SQL"], ["mysql", "MySQL"], ["postgresql", "PostgreSQL"], ["sqlite", "SQLite"], ["bigquery", "BigQuery"], ["spark", "Spark"],
];

export default function SqlFormatterPage() {
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const run = (minify = false) => {
    try {
      setError("");
      setOutput(minify ? input.replace(/\s+/g, " ").trim() : format(input, { language: dialect as any, tabWidth: 2 }));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "Could not format SQL.");
    }
  };
  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "SQL Formatter" }]} title="SQL Formatter" description="Format SQL queries for readability." />
      <div className="space-y-5">
        <div><Label>Dialect</Label><ToolSelect value={dialect} onChange={(e) => setDialect(e.target.value)}>{dialects.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</ToolSelect></div>
        <div><Label>SQL</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={12} /></div>
        <div className="flex gap-2"><Button variant="primary" onClick={() => run()} disabled={!input}>Format</Button><Button onClick={() => run(true)} disabled={!input}>Minify</Button><Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button></div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
      </div>
    </ToolShell>
  );
}
