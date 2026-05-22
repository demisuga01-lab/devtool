"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell } from "@/components/tool-ui";
import { Badge, Button, ToolInput, ToolTextarea, ErrorCard, CopyButton, Label, ToolSelect, CodeBlock, Panel, ResultCard } from "@/components/tool-ui";
import { utf8ByteLength } from "@/lib/tool-insights";

type Algo = "SHA-256" | "SHA-1" | "SHA-512";
type OutputFormat = "hex" | "base64";

async function hmacBytes(algo: Algo, secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function normalize(value: string) {
  return value.trim().replace(/^0x/i, "").replace(/\s+/g, "");
}

export default function HmacGeneratorPage() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algo, setAlgo] = useState<Algo>("SHA-256");
  const [format, setFormat] = useState<OutputFormat>("hex");
  const [expected, setExpected] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!message || !secret) {
      setOutput("");
      setError("");
      return;
    }
    (async () => {
      try {
        const bytes = await hmacBytes(algo, secret, message);
        if (!cancelled) {
          setOutput(format === "hex" ? toHex(bytes) : toBase64(bytes));
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "HMAC failed.");
          setOutput("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [message, secret, algo, format]);

  const verified = useMemo(() => {
    if (!output || !expected.trim()) return null;
    return normalize(output).toLowerCase() === normalize(expected).toLowerCase();
  }, [output, expected]);

  return (
    <ToolShell slug="hmac-generator">
      <div className="space-y-5">
        <div>
          <Label>Message</Label>
          <ToolTextarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_140px]">
          <div>
            <Label>Secret key</Label>
            <ToolInput value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="your-secret" />
          </div>
          <div>
            <Label>Algorithm</Label>
            <ToolSelect value={algo} onChange={(e) => setAlgo(e.target.value as Algo)} className="w-full">
              <option>SHA-256</option>
              <option>SHA-1</option>
              <option>SHA-512</option>
            </ToolSelect>
          </div>
          <div>
            <Label>Output</Label>
            <ToolSelect value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)} className="w-full">
              <option value="hex">Hex</option>
              <option value="base64">Base64</option>
            </ToolSelect>
          </div>
        </div>
        <div>
          <Label>Expected HMAC for verification</Label>
          <ToolInput value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Paste known HMAC to compare..." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setMessage(""); setSecret(""); setExpected(""); setOutput(""); }}>Clear</Button>
          {verified === true && <Badge variant="success">verified match</Badge>}
          {verified === false && <Badge variant="error">does not match</Badge>}
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <ResultCard label="Algorithm" value={algo} />
              <ResultCard label="Key Length" value={`${utf8ByteLength(secret)} bytes`} />
              <ResultCard label="Format" value={format.toUpperCase()} />
              <ResultCard label="Digest Length" value={`${format === "hex" ? output.length / 2 : Math.floor(output.length * 0.75)} bytes`} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>HMAC ({algo})</Label>
                <CopyButton value={output} />
              </div>
              <CodeBlock value={output} />
            </div>
            <Panel noPadding className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
              HMAC authenticates a message with a shared secret. A matching digest proves the same key and message were used, but it does not encrypt the message.
            </Panel>
          </>
        )}
        <p className="text-xs text-zinc-500">Computed in your browser using Web Crypto API.</p>
      </div>
    </ToolShell>
  );
}
