"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CopyButton, Label, Toggle, Checkbox } from "@/components/ui";

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
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

export default function Base64Page() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    setError("");
    setOutput("");
    try {
      if (mode === "encode") {
        let b64 = bytesToBase64(utf8ToBytes(input));
        if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        setOutput(b64);
      } else {
        let s = input.trim();
        if (urlSafe) {
          s = s.replace(/-/g, "+").replace(/_/g, "/");
          while (s.length % 4) s += "=";
        }
        setOutput(bytesToUtf8(base64ToBytes(s)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <ToolShell slug="base64">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            value={mode}
            onChange={(v) => setMode(v as "encode" | "decode")}
            options={[{ label: "Encode", value: "encode" }, { label: "Decode", value: "decode" }]}
          />
          <Checkbox checked={urlSafe} onChange={setUrlSafe} label="URL-safe (base64url)" />
        </div>
        <div>
          <Label>Input</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={convert} disabled={!input}>Convert</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <CopyButton value={output} />
            </div>
            <Textarea value={output} readOnly rows={8} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
