"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, CopyButton, Label, TabBar, Checkbox } from "@/components/tool-ui";
import { InfoBanner, InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

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

  const largeInput = mode === "encode" && new Blob([input]).size > 10240;
  const estimatedKb = Math.ceil((new Blob([input]).size * 4) / 3 / 1024);

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
              }
            }}
            rows={8}
          />
          {error && <InlineError error={error} />}
          {largeInput && <WarningBanner title="Large input">Encoded output will be approximately {estimatedKb} KB.</WarningBanner>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(null); setBinaryInfo(false); }}>Clear</Button>
        </div>
        {binaryInfo && <InfoBanner title="Binary data">This appears to be binary data, not plain text. Showing as-is.</InfoBanner>}
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
