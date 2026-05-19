"use client";

import { ChangeEvent, useState } from "react";
import { Download } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, ErrorCard, Label, Select, Textarea } from "@/components/ui";

const encodings = [
  ["utf-8", "UTF-8"],
  ["utf-16le", "UTF-16 LE"],
  ["utf-16be", "UTF-16 BE"],
  ["iso-8859-1", "ISO-8859-1"],
  ["windows-1252", "Windows-1252"],
  ["ascii", "ASCII"],
];

export default function FileEncodingPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fileName, setFileName] = useState("converted.txt");
  const [sourceEncoding, setSourceEncoding] = useState("utf-8");
  const [targetEncoding, setTargetEncoding] = useState("utf-8");
  const [bom, setBom] = useState(false);
  const [error, setError] = useState("");

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const decoder = new TextDecoder(sourceEncoding);
      const text = decoder.decode(await file.arrayBuffer());
      setInput(text);
      setFileName(file.name.replace(/(\.[^.]+)?$/, `-${targetEncoding}$1`) || "converted.txt");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decode file.");
    }
  };

  const convert = () => {
    const prefix = bom && targetEncoding === "utf-8" ? "\uFEFF" : "";
    setOutput(prefix + input);
    setError("");
  };

  const download = () => {
    const blob = new Blob([new TextEncoder().encode(output)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "converted.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolShell slug="file-encoding">
      <div className="space-y-5">
        <div>
          <Label>Upload file</Label>
          <input
            type="file"
            accept=".txt,.csv,.xml,.json,.html,.js,.css,.md,.log"
            onChange={loadFile}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border file:border-zinc-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium dark:text-zinc-400 dark:file:border-zinc-800 dark:file:bg-zinc-900 dark:file:text-zinc-100"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Source encoding</Label>
            <Select value={sourceEncoding} onChange={(e) => setSourceEncoding(e.target.value)}>
              <option value="utf-8">Auto-detect / UTF-8</option>
              {encodings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Target encoding</Label>
            <Select value={targetEncoding} onChange={(e) => setTargetEncoding(e.target.value)}>
              {encodings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={bom} onChange={(e) => setBom(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600" />
          Add BOM
        </label>
        <div>
          <Label>Text input</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} placeholder="Paste text directly..." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Preview</Label><div className="flex gap-2"><CopyButton value={output} /><Button onClick={download}><Download className="h-3.5 w-3.5" />Download converted file</Button></div></div>
            <Textarea value={output} onChange={(e) => setOutput(e.target.value)} rows={10} />
          </div>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">TextEncoder only supports UTF-8 output. For other encodings, the file is decoded from the source and displayed as UTF-8.</p>
      </div>
    </ToolShell>
  );
}
