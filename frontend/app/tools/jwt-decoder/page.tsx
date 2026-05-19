"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, CodeBlock, CopyButton, Label } from "@/components/ui";

function base64UrlDecode(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  if (typeof atob === "function") {
    const decoded = atob(s);
    try {
      return decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
    } catch {
      return decoded;
    }
  }
  return Buffer.from(s, "base64").toString("utf8");
}

function safeParseJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");

  const decode = () => {
    setError("");
    setHeader("");
    setPayload("");
    setSignature("");
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      setError("A JWT must contain three parts separated by dots.");
      return;
    }
    try {
      setHeader(safeParseJson(base64UrlDecode(parts[0])));
      setPayload(safeParseJson(base64UrlDecode(parts[1])));
      setSignature(parts[2]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decode token.");
    }
  };

  return (
    <ToolShell slug="jwt-decoder">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              JWT decoded locally. Never paste production secrets into web tools. This tool does not verify the signature.
            </p>
          </div>
        </div>
        <div>
          <Label>JWT token</Label>
          <Textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={5}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.SIG"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={decode} disabled={!token}>Decode</Button>
          <Button variant="ghost" onClick={() => { setToken(""); setHeader(""); setPayload(""); setSignature(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {(header || payload || signature) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Section title="Header" value={header} />
            <Section title="Payload" value={payload} />
            <Section title="Signature" value={signature} mono />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function Section({ title, value, mono }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <CopyButton value={value} />
      </div>
      {mono ? (
        <div className="break-all rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
          {value}
        </div>
      ) : (
        <CodeBlock value={value} />
      )}
    </div>
  );
}
