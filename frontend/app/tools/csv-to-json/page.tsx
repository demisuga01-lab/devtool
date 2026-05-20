"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, CopyButton, Label, Toggle, Checkbox, CodeBlock } from "@/components/ui";
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
      setOutput(JSON.stringify(result.data, null, 2));
    } catch (e) {
      setError({
        title: "CSV parse error",
        detail: e instanceof Error ? e.message : "Could not parse the CSV input.",
        suggestion: "Make sure your CSV has a header row, uses consistent delimiters, and quoted fields are properly closed.",
      });
    }
  };

  return (
    <ToolShell slug="csv-to-json">
      <div className="space-y-5">
        <div>
          <Label>CSV</Label>
          <Textarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setOutput(""); setError(null); setWarnings([]); } }} rows={10} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox checked={header} onChange={setHeader} label="Has header row" />
          <Toggle value={delimiter} onChange={setDelimiter} options={DELIMITERS} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); setWarnings([]); }}>Clear</Button>
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
          <div className="space-y-2">
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
