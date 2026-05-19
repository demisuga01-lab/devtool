"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CopyButton, Label, Toggle, Checkbox, CodeBlock } from "@/components/ui";

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
  const [error, setError] = useState("");

  const convert = () => {
    setError("");
    setOutput("");
    const result = Papa.parse(input.trim(), {
      header,
      delimiter,
      skipEmptyLines: true,
    });
    if (result.errors.length > 0) {
      setError(result.errors.map((e) => e.message).join("; "));
      return;
    }
    setOutput(JSON.stringify(result.data, null, 2));
  };

  return (
    <ToolShell slug="csv-to-json">
      <div className="space-y-5">
        <div>
          <Label>CSV</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox checked={header} onChange={setHeader} label="Has header row" />
          <Toggle value={delimiter} onChange={setDelimiter} options={DELIMITERS} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
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
