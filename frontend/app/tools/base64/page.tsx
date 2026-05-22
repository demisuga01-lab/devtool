"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, CopyButton, Label, TabBar, Checkbox, Panel, ResultCard } from "@/components/tool-ui";
import { InfoBanner, InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { analyzeBase64 } from "@/lib/tool-insights";

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
function isMostlyText(bytes: Uint8Array, decoded: string) {
  if (decoded.includes("\uFFFD")) return false;
  const nonPrintable = bytes.filter((byte) => byte < 9 || (byte > 13 && byte < 32)).length;
  return nonPrintable === 0;
}
function validateBase64(input: string) {
  const compact = input.replace(/\s/g, "");
  return /^[A-Za-z0-9+/]*={0,2}$/.test(compact) && compact.length % 4 !== 1;
}

export default function Base64Page() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [binaryInfo, setBinaryInfo] = useState(false);
  const [fileName, setFileName] = useState("");

  const largeInput = mode === "encode" && new Blob([input]).size > 10240;
  const estimatedKb = Math.ceil((new Blob([input]).size * 4) / 3 / 1024);
  const insight = output ? analyzeBase64(input, output, mode, urlSafe) : null;

  const loadFile = async (file: File) => {
    setMode("encode");
    setFileName(file.name);
    setError(null);
    const buffer = new Uint8Array(await file.arrayBuffer());
    setInput(bytesToBase64(buffer));
    setOutput(bytesToBase64(buffer));
  };

  const convert = () => {
    setError(null);
    setOutput("");
    setBinaryInfo(false);
    if (!input.trim()) return;

    try {
      if (mode === "encode") {
        let b64 = bytesToBase64(utf8ToBytes(input));
        if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        setOutput(b64);
      } else {
        let s = input.trim().replace(/\s/g, "");
        if (urlSafe) {
          s = s.replace(/-/g, "+").replace(/_/g, "/");
          while (s.length % 4) s += "=";
        }
        if (!validateBase64(s)) {
          setError({
            title: "Invalid Base64 input",
            detail: "The input does not appear to be valid Base64-encoded data.",
            suggestion: "Base64 uses A-Z, a-z, 0-9, +, /, and = for padding. Make sure you copied the complete encoded string.",
          });
          return;
        }
        const bytes = base64ToBytes(s);
        const decoded = bytesToUtf8(bytes);
        setBinaryInfo(!isMostlyText(bytes, decoded));
        setOutput(decoded);
      }
    } catch {
      setError({
        title: "Invalid Base64 input",
        detail: "The input does not appear to be valid Base64-encoded data.",
        suggestion: "Check for missing padding, unsupported characters, or an incomplete copied string.",
      });
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Base64 Tool" }]} title="Base64 Tool" description="Encode and decode Base64 text." />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <TabBar
            active={mode}
            onChange={(v) => { setMode(v as "encode" | "decode"); setOutput(""); setError(null); setBinaryInfo(false); }}
            tabs={[{ label: "Encode", value: "encode" }, { label: "Decode", value: "decode" }]}
          />
          <Checkbox checked={urlSafe} onChange={setUrlSafe} label="URL-safe (base64url)" />
        </div>
        <Panel noPadding className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">File to Base64</p>
              <p className="mt-1 text-xs text-zinc-500">Choose a file to encode locally. Image-like Base64 will show a preview below.</p>
            </div>
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
              }}
              className="text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            />
          </div>
          {fileName && <p className="mt-2 text-xs text-zinc-500">Loaded: {fileName}</p>}
        </Panel>
        <div>
          <Label>Input</Label>
          <ToolTextarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) {
                setOutput("");
                setError(null);
                setBinaryInfo(false);
                setFileName("");
              }
            }}
            rows={8}
          />
          {error && <InlineError error={error} />}
          {largeInput && <WarningBanner title="Large input">Encoded output will be approximately {estimatedKb} KB.</WarningBanner>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); setBinaryInfo(false); setFileName(""); }}>Clear</Button>
        </div>
        {binaryInfo && <InfoBanner title="Binary data">This appears to be binary data, not plain text. Showing as-is.</InfoBanner>}
        {insight && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label="Input Size" value={insight.inputSize} />
              <ResultCard label="Output Size" value={insight.outputSize} />
              <ResultCard label="Ratio" value={`${insight.ratio.toFixed(2)}x`} />
              <ResultCard label="Variant" value={insight.detectedVariant} />
            </div>
            <Panel noPadding className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={insight.detectedVariant === insight.selectedVariant ? "success" : "warning"}>
                  {insight.detectedVariant}
                </Badge>
                {insight.image && <Badge variant="info">{insight.image}</Badge>}
                {mode === "encode" && <span className="text-xs text-zinc-500">Base64 typically increases payload size by about 33%.</span>}
              </div>
              {insight.image && (
                <img
                  src={`data:${insight.image};base64,${mode === "encode" ? output : input}`}
                  alt="Decoded Base64 preview"
                  className="mt-4 max-h-48 rounded-xl border border-zinc-200 bg-white object-contain p-2 dark:border-zinc-800"
                />
              )}
            </Panel>
          </div>
        )}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <CopyButton value={output} />
            </div>
            <ToolTextarea value={output} readOnly rows={8} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
