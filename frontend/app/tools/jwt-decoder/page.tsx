"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ToolShell } from "@/components/tool-ui";
import { Badge, Button, ToolTextarea, CodeBlock, CopyButton, Label, Panel, ResultCard, TabBar } from "@/components/tool-ui";
import { InlineError, WarningBanner } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { jwtClaimDetails, sensitiveJwtKeys } from "@/lib/tool-insights";

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
  const [activePart, setActivePart] = useState<"header" | "payload" | "signature">("payload");

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
      const headerObj = JSON.parse(base64UrlDecode(parts[0])) as { alg?: string; typ?: string };
      const payloadObj = JSON.parse(decodedPayloadRaw) as { exp?: number; nbf?: number };
      const nextWarnings: string[] = [];
      const now = Date.now() / 1000;
      if (headerObj.alg?.toLowerCase() === "none") nextWarnings.push("The token uses alg=none. This is unsafe unless the surrounding protocol explicitly allows unsigned tokens.");
      if (typeof payloadObj.exp === "number" && payloadObj.exp < now) {
        nextWarnings.push(`This token expired on ${formatClaimDate(payloadObj.exp)} (${relativePast(payloadObj.exp)}).`);
      }
      if (typeof payloadObj.nbf === "number" && payloadObj.nbf > now) {
        nextWarnings.push(`This token is not yet valid. It becomes valid on ${formatClaimDate(payloadObj.nbf)}.`);
      }
      const sensitive = sensitiveJwtKeys(payloadObj as Record<string, unknown>);
      if (sensitive.length) nextWarnings.push(`Sensitive-looking payload fields detected: ${sensitive.join(", ")}.`);
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
          <ToolTextarea
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
          <div className="space-y-4">
            <JwtSummary header={header} payload={payload} signature={signature} />
            <TabBar
              active={activePart}
              onChange={(value) => setActivePart(value as "header" | "payload" | "signature")}
              tabs={[{ label: "Header", value: "header" }, { label: "Payload", value: "payload" }, { label: "Signature", value: "signature" }]}
            />
            <Section
              title={activePart === "header" ? "Header" : activePart === "payload" ? "Payload" : "Signature"}
              value={activePart === "header" ? header : activePart === "payload" ? payload : signature}
              mono
            />
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
        <CodeBlock value={value} />
      ) : (
        <CodeBlock value={value} />
      )}
    </div>
  );
}

function JwtSummary({ header, payload, signature }: { header: string; payload: string; signature: string }) {
  let headerObj: Record<string, unknown> = {};
  let payloadObj: Record<string, unknown> = {};
  try {
    headerObj = JSON.parse(header);
    payloadObj = JSON.parse(payload);
  } catch {
    return null;
  }
  const claims = jwtClaimDetails(payloadObj);
  const exp = claims.find((claim) => claim.key === "exp");
  const sensitive = sensitiveJwtKeys(payloadObj);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <ResultCard label="Algorithm" value={String(headerObj.alg ?? "-")} />
        <ResultCard label="Token Type" value={String(headerObj.typ ?? "JWT")} />
        <ResultCard label="Payload Claims" value={String(Object.keys(payloadObj).length)} />
        <ResultCard label="Signature Bytes" value={String(Math.ceil(signature.length * 3 / 4))} />
      </div>
      <Panel noPadding className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {String(headerObj.alg).toLowerCase() === "none" ? <Badge variant="error">unsigned alg none</Badge> : <Badge variant="info">signature not verified</Badge>}
          {exp && <Badge variant={exp.expired ? "error" : "success"}>{exp.expired ? `expired ${exp.relative}` : `expires ${exp.relative}`}</Badge>}
          {sensitive.length > 0 && <Badge variant="warning">sensitive fields</Badge>}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {claims.length ? claims.map((claim) => (
            <div key={claim.key} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{claim.key}</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{claim.date}</p>
              <p className="text-xs text-zinc-500">{claim.relative}</p>
            </div>
          )) : <p className="text-sm text-zinc-500">No iat, exp, or nbf timestamp claims found.</p>}
        </div>
      </Panel>
    </div>
  );
}
