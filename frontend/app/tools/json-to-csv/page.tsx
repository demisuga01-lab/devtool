"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar, Checkbox, Panel, ResultCard } from "@/components/tool-ui";

const DELIMITERS = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "\t" },
  { label: "Pipe", value: "|" },
];

export default function JsonToCsvPage() {
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const convert = () => {
    setError("");
    setOutput("");
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array.");
        setRows([]);
        return;
      }
      const csv = Papa.unparse(parsed, {
        delimiter,
        header: includeHeaders,
      });
      setRows(parsed as Record<string, unknown>[]);
      setOutput(csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Encode & Convert" }, { label: "JSON to CSV" }]} title="JSON to CSV" description="Convert JSON into CSV rows." />
      <div className="space-y-5">
        <div>
          <Label>JSON array</Label>
          <ToolTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder='[{"name": "Ada", "year": 1815}, {"name": "Alan", "year": 1912}]'
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <TabBar active={delimiter} onChange={setDelimiter} tabs={DELIMITERS} />
          <Checkbox checked={includeHeaders} onChange={setIncludeHeaders} label="Include headers" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); setRows([]); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-4">
            <JsonCsvReport rows={rows} />
            <div className="flex items-center justify-between">
              <Label>CSV output</Label>
              <CopyButton value={output} />
            </div>
            <ToolTextarea value={output} readOnly rows={10} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function JsonCsvReport({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const inconsistent = rows.some((row) => Object.keys(row).length !== columns.length);
  const empties = columns.reduce((sum, column) => sum + rows.filter((row) => row[column] == null || row[column] === "").length, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ResultCard label="Rows" value={String(rows.length)} />
        <ResultCard label="Columns" value={String(columns.length)} />
        <ResultCard label="Empty Cells" value={String(empties)} />
        <ResultCard label="Shape" value={inconsistent ? "Inconsistent" : "Consistent"} />
      </div>
      <Panel noPadding className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant={inconsistent ? "warning" : "success"}>{inconsistent ? "inconsistent keys" : "uniform rows"}</Badge>
          <Badge variant="info">first 5 rows preview</Badge>
        </div>
        <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950"><tr>{columns.map((column) => <th key={column} className="px-4 py-2">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{rows.slice(0, 5).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column} className="px-4 py-2">{String(row[column] ?? "")}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
