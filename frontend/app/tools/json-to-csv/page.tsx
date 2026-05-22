"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, ErrorCard, CopyButton, Label, TabBar, Checkbox } from "@/components/tool-ui";

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
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
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
