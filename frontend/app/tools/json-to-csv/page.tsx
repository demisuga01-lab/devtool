"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CopyButton, Label, Toggle, Checkbox } from "@/components/ui";

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

  const convert = () => {
    setError("");
    setOutput("");
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array.");
        return;
      }
      const csv = Papa.unparse(parsed, {
        delimiter,
        header: includeHeaders,
      });
      setOutput(csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <ToolShell slug="json-to-csv">
      <div className="space-y-5">
        <div>
          <Label>JSON array</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder='[{"name": "Ada", "year": 1815}, {"name": "Alan", "year": 1912}]'
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle value={delimiter} onChange={setDelimiter} options={DELIMITERS} />
          <Checkbox checked={includeHeaders} onChange={setIncludeHeaders} label="Include headers" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>CSV output</Label>
              <CopyButton value={output} />
            </div>
            <Textarea value={output} readOnly rows={10} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
