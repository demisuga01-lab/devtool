"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, CopyButton, Label, TabBar, Checkbox, CodeBlock, Panel, ResultCard } from "@/components/tool-ui";
import { InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

const DELIMITERS = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "\t" },
  { label: "Pipe", value: "|" },
];

export default function CsvToJsonPage() {
  const [input, setInput] = useState("");
  const [header, setHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(",");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [warnings, setWarnings] = useState<Papa.ParseError[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const convert = () => {
    setError(null);
    setWarnings([]);
    setOutput("");
    if (!input.trim()) return;
    try {
      const result = Papa.parse(input.trim(), {
        header,
        delimiter,
        skipEmptyLines: true,
      });
      setWarnings(result.errors);
      const data = result.data as Record<string, unknown>[];
      setRows(data);
      setOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setError({
        title: "CSV parse error",
        detail: e instanceof Error ? e.message : "Could not parse the CSV input.",
        suggestion: "Make sure your CSV has a header row, uses consistent delimiters, and quoted fields are properly closed.",
      });
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Encode & Convert" }, { label: "CSV to JSON" }]} title="CSV to JSON" description="Convert CSV data into structured JSON." />
      <div className="space-y-5">
        <div>
          <Label>CSV</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setError(null); setWarnings([]); setRows([]); } }} rows={10} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox checked={header} onChange={setHeader} label="Has header row" />
          <TabBar active={delimiter} onChange={setDelimiter} tabs={DELIMITERS} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); setWarnings([]); setRows([]); }}>Clear</Button>
        </div>
        {warnings.length > 0 && (
          <WarningBanner title={`Parsed with ${warnings.length} warning(s)`}>
            <ul className="list-disc space-y-1 pl-4">
              {warnings.slice(0, 3).map((warning, index) => (
                <li key={`${warning.row}-${index}`}>Row {typeof warning.row === "number" ? warning.row + 1 : "unknown"}: {warning.message}</li>
              ))}
            </ul>
          </WarningBanner>
        )}
        {output && (
          <div className="space-y-4">
            <CsvReport rows={rows} warnings={warnings} />
            <div className="flex items-center justify-between">
              <Label>JSON output</Label>
              <CopyButton value={output} />
            </div>
            <CodeBlock value={output} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function CsvReport({ rows, warnings }: { rows: Record<string, unknown>[]; warnings: Papa.ParseError[] }) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const emptyByColumn = columns.map((column) => ({
    column,
    empty: rows.filter((row) => row[column] == null || row[column] === "").length,
    types: Array.from(new Set(rows.map((row) => (row[column] === "" || row[column] == null ? "empty" : Number.isFinite(Number(row[column])) ? "number-like" : "string")))).join(", "),
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ResultCard label="Rows" value={String(rows.length)} />
        <ResultCard label="Columns" value={String(columns.length)} />
        <ResultCard label="Empty Cells" value={String(emptyByColumn.reduce((sum, item) => sum + item.empty, 0))} />
        <ResultCard label="Warnings" value={String(warnings.length)} />
      </div>
      <Panel noPadding className="overflow-hidden">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            <Badge variant={warnings.length ? "warning" : "success"}>{warnings.length ? "parse warnings" : "consistent parse"}</Badge>
            <Badge variant="info">first 5 rows preview</Badge>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-2">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.slice(0, 5).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column} className="px-4 py-2">{String(row[column] ?? "")}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-2 md:grid-cols-2">
        {emptyByColumn.slice(0, 8).map((item) => <ResultCard key={item.column} label={item.column} value={`${item.types}; empty ${item.empty}`} />)}
      </div>
    </div>
  );
}
