"use client";

import { useEffect, useState } from "react";
import { ToolShell } from "@/components/tool-ui";
import { Button, ToolInput, ToolTextarea, ErrorCard, CopyButton, Label, ToolSelect, CodeBlock } from "@/components/tool-ui";

type Algo = "SHA-256" | "SHA-1" | "SHA-512";

async function hmacHex(algo: Algo, secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HmacGeneratorPage() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algo, setAlgo] = useState<Algo>("SHA-256");
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
        const hex = await hmacHex(algo, secret, message);
        if (!cancelled) {
          setOutput(hex);
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
  }, [message, secret, algo]);

  return (
    <ToolShell slug="hmac-generator">
      <div className="space-y-5">
        <div>
          <Label>Message</Label>
          <ToolTextarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setMessage(""); setSecret(""); setOutput(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>HMAC ({algo})</Label>
              <CopyButton value={output} />
            </div>
            <CodeBlock value={output} />
          </div>
        )}
        <p className="text-xs text-zinc-500">Computed in your browser using Web Crypto API.</p>
      </div>
    </ToolShell>
  );
}
