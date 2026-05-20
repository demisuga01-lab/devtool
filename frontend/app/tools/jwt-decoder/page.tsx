"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, CodeBlock, CopyButton, Label } from "@/components/ui";
import { InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

function base64UrlDecode(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const decoded = atob(s);
  try {
    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return decoded;
  }
}

function safeParseJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function validateJwt(token: string): ToolError | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return {
      title: "Invalid JWT format",
      detail: `Expected 3 parts separated by dots, found ${parts.length}.`,
      suggestion:
        parts.length < 3
          ? "You may be missing part of the token. Make sure you copied the full JWT."
          : "JWTs have exactly 3 parts. This may not be a JWT.",
    };
  }
  try {
    const header = JSON.parse(base64UrlDecode(parts[0])) as { alg?: string };
    if (!header.alg) {
      return {
        title: "Invalid JWT header",
        detail: "The header does not contain an algorithm (alg) field.",
        suggestion: "This may not be a standard JWT token.",
      };
    }
  } catch {
    return {
      title: "Cannot decode JWT header",
      detail: "The header portion of this token could not be decoded.",
      suggestion: "Make sure you copied the complete, unmodified token.",
    };
  }
  return null;
}

function formatClaimDate(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function relativePast(seconds: number) {
  const diff = Math.floor((Date.now() - seconds * 1000) / 1000);
  const abs = Math.abs(diff);
  if (abs < 3600) return `${Math.floor(abs / 60)} minutes ${diff >= 0 ? "ago" : "from now"}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)} hours ${diff >= 0 ? "ago" : "from now"}`;
  return `${Math.floor(abs / 86400)} days ${diff >= 0 ? "ago" : "from now"}`;
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const decode = () => {
    setError(null);
    setWarnings([]);
    setHeader("");
    setPayload("");
    setSignature("");
    if (!token.trim()) return;

    const validationError = validateJwt(token);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const parts = token.trim().split(".");
      const decodedHeader = safeParseJson(base64UrlDecode(parts[0]));
      const decodedPayloadRaw = base64UrlDecode(parts[1]);
      const decodedPayload = safeParseJson(decodedPayloadRaw);
      const payloadObj = JSON.parse(decodedPayloadRaw) as { exp?: number; nbf?: number };
      const nextWarnings: string[] = [];
      const now = Date.now() / 1000;
      if (typeof payloadObj.exp === "number" && payloadObj.exp < now) {
        nextWarnings.push(`This token expired on ${formatClaimDate(payloadObj.exp)} (${relativePast(payloadObj.exp)}).`);
      }
      if (typeof payloadObj.nbf === "number" && payloadObj.nbf > now) {
        nextWarnings.push(`This token is not yet valid. It becomes valid on ${formatClaimDate(payloadObj.nbf)}.`);
      }
      setHeader(decodedHeader);
      setPayload(decodedPayload);
      setSignature(parts[2]);
      setWarnings(nextWarnings);
    } catch {
      setError({
        title: "Invalid JWT token",
        detail: "The token payload could not be decoded as base64url JSON.",
        suggestion: "Make sure you copied the complete, unmodified token.",
      });
    }
  };

  return (
    <ToolShell slug="jwt-decoder">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>JWT decoded locally. Never paste production secrets into web tools. This tool does not verify the signature.</p>
          </div>
        </div>
        <div>
          <Label>JWT token</Label>
          <Textarea
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (!e.target.value.trim()) {
                setHeader("");
                setPayload("");
                setSignature("");
                setError(null);
                setWarnings([]);
              }
            }}
            rows={5}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.SIG"
          />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={decode} disabled={!token}>Decode</Button>
          <Button variant="ghost" onClick={() => { setToken(""); setHeader(""); setPayload(""); setSignature(""); setError(null); setWarnings([]); }}>Clear</Button>
        </div>
        {warnings.map((warning) => (
          <WarningBanner key={warning} title="JWT warning">{warning}</WarningBanner>
        ))}
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
