"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, Checkbox, CodeBlock, CopyButton, ResultCard, ToolInput, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

type Alg = "HS256" | "HS384" | "HS512" | "RS256";

function b64url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
}

const hashes: Record<Exclude<Alg, "RS256">, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

export default function JwtBuilderPage() {
  const [alg, setAlg] = useState<Alg>("HS256");
  const [payload, setPayload] = useState('{\n  "sub": "user_123",\n  "name": "Ada Lovelace"\n}');
  const [secret, setSecret] = useState("secret");
  const [secretBase64, setSecretBase64] = useState(false);
  const [expDate, setExpDate] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const header = useMemo(() => ({ alg, typ: "JWT" }), [alg]);
  const headerJson = useMemo(() => JSON.stringify(header, null, 2), [header]);
  const payloadPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(payload || "{}") as Record<string, unknown>;
      const issues: string[] = [];
      ["iat", "exp", "nbf"].forEach((key) => {
        if (key in parsed && typeof parsed[key] !== "number") issues.push(`${key} should be a Unix timestamp number.`);
      });
      ["iss", "sub", "aud", "jti"].forEach((key) => {
        if (key in parsed && typeof parsed[key] !== "string" && !Array.isArray(parsed[key])) issues.push(`${key} is usually a string${key === "aud" ? " or string array" : ""}.`);
      });
      return { parsed, issues, valid: true };
    } catch (err) {
      return { parsed: null, issues: [err instanceof Error ? err.message : "Invalid JSON"], valid: false };
    }
  }, [payload]);

  function setClaim(key: string, value: unknown) {
    try {
      setPayload(JSON.stringify({ ...JSON.parse(payload || "{}"), [key]: value }, null, 2));
    } catch {
      setPayload(JSON.stringify({ [key]: value }, null, 2));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          const parsed = JSON.parse(payload || "{}");
          const encodedHeader = b64url(JSON.stringify(header));
          const encodedPayload = b64url(JSON.stringify(parsed));
          if (alg === "RS256") {
            setToken(`${encodedHeader}.${encodedPayload}.`);
            setError("RS256 needs private-key signing. Header and payload are prepared without a signature.");
            return;
          }
          const secretBytes = secretBase64 ? decodeBase64(secret) : new TextEncoder().encode(secret);
          const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: hashes[alg] }, false, ["sign"]);
          const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
          setToken(`${encodedHeader}.${encodedPayload}.${b64url(signature)}`);
          setError("");
        } catch (err) {
          setToken("");
          setError(err instanceof Error ? err.message : "Unable to build JWT.");
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [alg, header, payload, secret, secretBase64]);

  const parts = token.split(".");

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "JWT Builder" }]} title="JWT Builder" description="Build and sign JWT tokens with custom headers and payload." />
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel noPadding className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Header</h2>
            <div>
              <Label>Algorithm</Label>
              <ToolSelect value={alg} onChange={(event) => setAlg(event.target.value as Alg)}>
                {(["HS256", "HS384", "HS512", "RS256"] as const).map((item) => <option key={item}>{item}</option>)}
              </ToolSelect>
            </div>
            {alg === "RS256" && <p className="text-xs text-zinc-500">RS256 needs a private key; this builder previews unsigned header and payload.</p>}
            <ToolTextarea value={headerJson} readOnly rows={5} />
          </Panel>
          <Panel noPadding className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payload</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setClaim("sub", "user_123")}>+ sub</Button>
              <Button onClick={() => setClaim("iat", Math.floor(Date.now() / 1000))}>+ iat</Button>
              <Button onClick={() => expDate && setClaim("exp", Math.floor(new Date(expDate).getTime() / 1000))}>+ exp</Button>
            </div>
            <ToolInput type="datetime-local" value={expDate} onChange={(event) => setExpDate(event.target.value)} />
            <ToolTextarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={8} />
            <div className="flex flex-wrap gap-2">
              {payloadPreview.valid ? <Badge variant="success">valid JSON</Badge> : <Badge variant="error">invalid JSON</Badge>}
              {payloadPreview.issues.map((issue) => <Badge key={issue} variant="warning">{issue}</Badge>)}
            </div>
          </Panel>
          <Panel noPadding className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Secret</h2>
            <div><Label>Secret key</Label><ToolInput value={secret} onChange={(event) => setSecret(event.target.value)} /></div>
            <Checkbox checked={secretBase64} onChange={setSecretBase64} label="Secret is Base64 encoded" />
          </Panel>
        </div>
        {error && <Panel noPadding className="border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">{error}</Panel>}
        <Panel noPadding className="space-y-3 p-4">
          <div className="flex items-center justify-between"><Label>Generated token</Label><CopyButton value={token} /></div>
          <ToolTextarea value={token} readOnly rows={5} />
          {token && (
            <div className="break-all font-mono text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">{parts[0]}</span>
              <span className="text-zinc-400">.</span>
              <span className="text-blue-600 dark:text-blue-400">{parts[1]}</span>
              <span className="text-zinc-400">.</span>
              <span className="text-purple-600 dark:text-purple-400">{parts[2]}</span>
            </div>
          )}
        </Panel>
        {token && payloadPreview.parsed && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel noPadding className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ResultCard label="Algorithm" value={alg} />
                <ResultCard label="Payload Claims" value={String(Object.keys(payloadPreview.parsed).length)} />
                <ResultCard label="Signature" value={alg === "RS256" ? "unsigned preview" : "HMAC signed"} />
              </div>
              <div className="flex flex-wrap gap-2">
                {alg.startsWith("HS") && secret.length < 16 && <Badge variant="warning">short shared secret</Badge>}
                {alg === "RS256" && <Badge variant="warning">signature not generated</Badge>}
              </div>
            </Panel>
            <Panel noPadding className="p-4">
              <div className="mb-2 flex items-center justify-between"><Label>Decoded payload preview</Label><CopyButton value={JSON.stringify(payloadPreview.parsed, null, 2)} /></div>
              <CodeBlock value={JSON.stringify(payloadPreview.parsed, null, 2)} />
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
