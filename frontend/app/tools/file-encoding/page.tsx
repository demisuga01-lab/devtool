"use client";

import { ChangeEvent, useState } from "react";
import { Download } from "lucide-react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, Checkbox, CopyButton, ErrorCard, Label, Panel, ResultCard, ToolInput, ToolSelect, ToolTextarea } from "@/components/tool-ui";
import { formatBytes, utf8ByteLength } from "@/lib/tool-insights";

const encodings = [
  ["utf-8", "UTF-8"],
  ["utf-16le", "UTF-16 LE"],
  ["utf-16be", "UTF-16 BE"],
  ["iso-8859-1", "ISO-8859-1"],
  ["windows-1252", "Windows-1252"],
  ["ascii", "ASCII"],
];

function lineEnding(value: string) {
  const crlf = (value.match(/\r\n/g) || []).length;
  const lf = (value.match(/(?<!\r)\n/g) || []).length;
  const cr = (value.match(/\r(?!\n)/g) || []).length;
  if (crlf >= lf && crlf >= cr && crlf > 0) return "CRLF";
  if (lf >= cr && lf > 0) return "LF";
  if (cr > 0) return "CR";
  return "none";
}

function inspectBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { bom: "UTF-8 BOM", detected: "utf-8", confidence: 95 };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { bom: "UTF-16 LE BOM", detected: "utf-16le", confidence: 95 };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { bom: "UTF-16 BE BOM", detected: "utf-16be", confidence: 95 };
  const ascii = bytes.every((byte) => byte < 0x80);
  return { bom: "absent", detected: ascii ? "ascii / utf-8" : "utf-8 or selected legacy encoding", confidence: ascii ? 90 : 60 };
}

export default function FileEncodingPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fileName, setFileName] = useState("converted.txt");
  const [sourceEncoding, setSourceEncoding] = useState("utf-8");
  const [targetEncoding, setTargetEncoding] = useState("utf-8");
  const [bom, setBom] = useState(false);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState<{ bytes: number; bom: string; detected: string; confidence: number } | null>(null);

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const info = inspectBuffer(buffer);
      const decoder = new TextDecoder(sourceEncoding);
      const text = decoder.decode(buffer);
      setInput(text);
      setFileInfo({ bytes: buffer.byteLength, ...info });
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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Encode & Convert" }, { label: "File Encoding" }]} title="File Encoding" description="Convert text files between encodings." />
      <div className="space-y-5">
        <div>
          <Label>Upload file</Label>
          <ToolInput
            type="file"
            accept=".txt,.csv,.xml,.json,.html,.js,.css,.md,.log"
            onChange={loadFile}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-2 file:text-sm file:font-medium dark:text-zinc-400 dark:file:border-zinc-800 dark:file:bg-zinc-950 dark:file:text-zinc-100"
          />
        </div>
        {(fileInfo || input) && (
          <div className="grid gap-3 md:grid-cols-4">
            <ResultCard label="Detected Encoding" value={fileInfo?.detected || "manual text / utf-8"} />
            <ResultCard label="Confidence" value={fileInfo ? `${fileInfo.confidence}%` : "estimated"} />
            <ResultCard label="BOM" value={fileInfo?.bom || (input.charCodeAt(0) === 0xfeff ? "present" : "absent")} />
            <ResultCard label="Bytes / Line Endings" value={`${formatBytes(fileInfo?.bytes ?? utf8ByteLength(input))} / ${lineEnding(input)}`} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Source encoding</Label>
            <ToolSelect value={sourceEncoding} onChange={(e) => setSourceEncoding(e.target.value)}>
              <option value="utf-8">Auto-detect / UTF-8</option>
              {encodings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </ToolSelect>
          </div>
          <div>
            <Label>Target encoding</Label>
            <ToolSelect value={targetEncoding} onChange={(e) => setTargetEncoding(e.target.value)}>
              {encodings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </ToolSelect>
          </div>
        </div>
        <Checkbox checked={bom} onChange={setBom} label="Add BOM" />
        <div>
          <Label>Text input</Label>
          <ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} placeholder="Paste text directly..." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Preview</Label><div className="flex gap-2"><CopyButton value={output} /><Button onClick={download}><Download className="h-3.5 w-3.5" />Download converted file</Button></div></div>
            <ToolTextarea value={output} onChange={(e) => setOutput(e.target.value)} rows={10} />
          </div>
        )}
        <Panel noPadding className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="info">browser-side conversion</Badge>
            {targetEncoding !== "utf-8" && <Badge variant="warning">download remains UTF-8 encoded</Badge>}
          </div>
          TextEncoder only supports UTF-8 output. For other encodings, the file is decoded from the source and displayed as UTF-8.
        </Panel>
      </div>
    </ToolShell>
  );
}
