"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Key, ShieldCheck, Unlock, Wrench, XCircle } from "lucide-react";
import { Badge, CodeBlock, CopyButton, ResultCard } from "@/components/tool-ui";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "decode" | "build" | "verify";
type Alg = "HS256" | "HS384" | "HS512" | "RS256";
type JwtObject = Record<string, unknown>;
type CustomClaim = { id: string; key: string; value: string };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "decode", label: "Decode", icon: Unlock },
  { id: "build", label: "Build", icon: Wrench },
  { id: "verify", label: "Verify", icon: ShieldCheck },
];

const hashes: Record<Exclude<Alg, "RS256">, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

export default function JwtWorkspacePage() {
  const [active, setActive] = useState<Tab>("decode");

  return (
    <WorkspaceShell
      title="JWT Tools"
      subtitle="Decode, build, and verify JSON Web Tokens"
      href="/tools/jwt"
      icon={Key}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="jwt"
      intentGroup="security"
    >
      {active === "decode" && <DecodeTab />}
      {active === "build" && <BuildTab />}
      {active === "verify" && <VerifyTab />}
    </WorkspaceShell>
  );
}

function DecodeTab() {
  const [token, setToken] = useState("");
  const parsed = useMemo(() => decodeJwt(token), [token]);

  useEffect(() => {
    decodeJwt(token);
  }, [token]);

  const header = parsed.header ? JSON.stringify(parsed.header, null, 2) : "";
  const payload = parsed.payload ? JSON.stringify(parsed.payload, null, 2) : "";
  const alg = String(parsed.header?.alg ?? "-");
  const time = parsed.payload ? jwtTimeStatus(parsed.payload) : null;

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>JWT input</FieldLabel>
        <textarea value={token} onChange={(event) => setToken(event.target.value)} rows={5} placeholder="Paste your JWT token here..." className={`${textareaClass} min-h-[120px]`} />
        {parsed.error && token.trim() && <p className="mt-2 text-sm text-red-500">{parsed.error}</p>}
      </div>
      {time?.kind === "expired" && <Banner tone="error">Token expired {time.relative}</Banner>}
      {time?.kind === "future" && <Banner tone="warning">Token is not yet valid until {time.date}</Banner>}
      {time?.kind === "none" && token.trim() && !parsed.error && <Banner tone="muted">No expiry set</Banner>}
      {token.trim() && <TokenParts token={token} />}
      {!parsed.error && parsed.header && parsed.payload && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant={alg === "none" ? "error" : "info"}>{alg}</Badge>
            {String(parsed.header.typ ?? "JWT") && <Badge>{String(parsed.header.typ ?? "JWT")}</Badge>}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <JsonCard title="Header" value={header} />
            <JsonCard title="Payload" value={payload} />
            <WorkspaceCard>
              <div className="mb-2 flex items-center justify-between gap-3">
                <FieldLabel>Signature</FieldLabel>
                <CopyButton value={parsed.signature ?? ""} />
              </div>
              <p className="break-all font-mono text-sm text-foreground">{parsed.signature || "-"}</p>
              <div className="mt-4 grid gap-3">
                <ResultCard label="Algorithm" value={alg} />
                <ResultCard label="Signature bytes" value={String(parsed.signature ? Math.ceil(parsed.signature.length * 3 / 4) : 0)} />
              </div>
            </WorkspaceCard>
          </div>
        </>
      )}
    </div>
  );
}

function BuildTab() {
  const [alg, setAlg] = useState<Alg>("HS256");
  const [secret, setSecret] = useState("secret");
  const [sub, setSub] = useState("user_123");
  const [iss, setIss] = useState("");
  const [aud, setAud] = useState("");
  const [exp, setExp] = useState("");
  const [overrideIat, setOverrideIat] = useState(false);
  const [iat, setIat] = useState(() => new Date().toISOString().slice(0, 16));
  const [claims, setClaims] = useState<CustomClaim[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const payload = useMemo(() => {
    const out: JwtObject = {};
    if (sub) out.sub = sub;
    if (iss) out.iss = iss;
    if (aud) out.aud = aud;
    if (exp) out.exp = toUnix(exp);
    out.iat = overrideIat ? toUnix(iat) : Math.floor(Date.now() / 1000);
    claims.forEach((claim) => {
      if (claim.key.trim()) out[claim.key.trim()] = parseClaimValue(claim.value);
    });
    return out;
  }, [aud, claims, exp, iat, iss, overrideIat, sub]);

  async function build() {
    setError("");
    try {
      const header = { alg, typ: "JWT" };
      const encodedHeader = b64url(JSON.stringify(header));
      const encodedPayload = b64url(JSON.stringify(payload));
      if (alg === "RS256") {
        setToken(`${encodedHeader}.${encodedPayload}.`);
        setError("RS256 requires private-key signing. Header and payload were prepared without a signature.");
        return;
      }
      if (!secret.trim()) throw new Error("Secret/key is required for HMAC algorithms.");
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: hashes[alg] }, false, ["sign"]);
      const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
      setToken(`${encodedHeader}.${encodedPayload}.${b64url(signature)}`);
    } catch (err) {
      setToken("");
      setError(err instanceof Error ? err.message : "Unable to build JWT.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <div className="space-y-5">
        <WorkspaceCard className="space-y-4">
          <FieldLabel>Algorithm</FieldLabel>
          <Segmented<Alg> value={alg} onChange={setAlg} options={["HS256", "HS384", "HS512", "RS256"]} />
          {alg !== "RS256" && <div><FieldLabel>Secret/Key</FieldLabel><input value={secret} onChange={(event) => setSecret(event.target.value)} className={inputClass} /></div>}
        </WorkspaceCard>
        <WorkspaceCard className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><FieldLabel>sub subject</FieldLabel><input value={sub} onChange={(event) => setSub(event.target.value)} className={inputClass} /></div>
            <div><FieldLabel>iss issuer</FieldLabel><input value={iss} onChange={(event) => setIss(event.target.value)} className={inputClass} /></div>
            <div><FieldLabel>aud audience</FieldLabel><input value={aud} onChange={(event) => setAud(event.target.value)} className={inputClass} /></div>
            <div><FieldLabel>exp expiry</FieldLabel><input type="datetime-local" value={exp} onChange={(event) => setExp(event.target.value)} className={inputClass} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={overrideIat} onChange={(event) => setOverrideIat(event.target.checked)} /> Override issued at</label>
          {overrideIat && <div><FieldLabel>iat issued at</FieldLabel><input type="datetime-local" value={iat} onChange={(event) => setIat(event.target.value)} className={inputClass} /></div>}
        </WorkspaceCard>
        <WorkspaceCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Custom claims</FieldLabel>
            <SecondaryButton onClick={() => setClaims((items) => [...items, { id: crypto.randomUUID(), key: "", value: "" }])}>Add row</SecondaryButton>
          </div>
          {claims.map((claim) => (
            <div key={claim.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input value={claim.key} onChange={(event) => setClaims((items) => items.map((item) => item.id === claim.id ? { ...item, key: event.target.value } : item))} placeholder="claim" className={inputClass} />
              <input value={claim.value} onChange={(event) => setClaims((items) => items.map((item) => item.id === claim.id ? { ...item, value: event.target.value } : item))} placeholder="value" className={inputClass} />
              <SecondaryButton onClick={() => setClaims((items) => items.filter((item) => item.id !== claim.id))}>Remove</SecondaryButton>
            </div>
          ))}
        </WorkspaceCard>
        <PrimaryButton className="w-full" onClick={() => void build()}>Build JWT</PrimaryButton>
      </div>
      <div className="space-y-5">
        {error && <Banner tone={alg === "RS256" ? "warning" : "error"}>{error}</Banner>}
        <div>
          <div className="flex items-center justify-between gap-3"><FieldLabel>Generated JWT</FieldLabel><CopyButton value={token} /></div>
          <textarea value={token} readOnly rows={7} className={textareaClass} />
        </div>
        <JsonCard title="Preview decode" value={JSON.stringify(payload, null, 2)} />
      </div>
    </div>
  );
}

function VerifyTab() {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("secret");
  const [alg, setAlg] = useState<Alg>("HS256");
  const [result, setResult] = useState<{ checked: boolean; valid: boolean; signature: string; expiry: string; claims: JwtObject | null; warnings: string[] }>({
    checked: false,
    valid: false,
    signature: "Not checked",
    expiry: "Not checked",
    claims: null,
    warnings: [],
  });
  const [error, setError] = useState("");

  async function verify() {
    if (!token.trim()) {
      setError("Paste a JWT before verifying.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    try {
      const parsed = decodeJwt(token);
      if (parsed.error || !parsed.header || !parsed.payload) throw new Error(parsed.error || "Invalid JWT.");
      const headerAlg = String(parsed.header.alg ?? "");
      const warnings = jwtWarnings(parsed.header, parsed.payload);
      if (headerAlg !== alg) warnings.push(`Selected algorithm ${alg} does not match token header ${headerAlg}.`);
      let valid = false;
      if (alg === "RS256") {
        warnings.push("RS256 verification requires a public key and is not verified locally here.");
      } else {
        const [head, body, sig] = token.split(".");
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: hashes[alg] }, false, ["verify"]);
        valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(sig), new TextEncoder().encode(`${head}.${body}`));
      }
      const time = jwtTimeStatus(parsed.payload);
      setResult({ checked: true, valid, signature: valid ? "Valid" : "Invalid", expiry: time ? expiryLabel(time) : "No expiry", claims: parsed.payload, warnings });
    } catch (err) {
      setResult({ checked: true, valid: false, signature: "Invalid", expiry: "Unknown", claims: null, warnings: [] });
      setError(err instanceof Error ? err.message : "Could not verify token.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>JWT input</FieldLabel>
        <textarea ref={inputRef} value={token} onChange={(event) => setToken(event.target.value)} rows={6} className={`${textareaClass} ${error && !token.trim() ? "border-red-500" : ""}`} />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
      <WorkspaceCard className="grid gap-4 md:grid-cols-[1fr_280px_auto]">
        <div><FieldLabel>Secret/Key</FieldLabel><input value={secret} onChange={(event) => setSecret(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Algorithm</FieldLabel><select value={alg} onChange={(event) => setAlg(event.target.value as Alg)} className={inputClass}><option>HS256</option><option>HS384</option><option>HS512</option><option>RS256</option></select></div>
        <div className="flex items-end"><PrimaryButton onClick={() => void verify()}>Verify</PrimaryButton></div>
      </WorkspaceCard>
      {result.checked && (
        <WorkspaceCard>
          <div className="mb-4 flex items-center gap-3">
            {result.valid ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{result.valid ? "Signature verified" : "Verification failed"}</h2>
              <p className="text-sm text-muted-foreground">Signature: {result.signature}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ResultCard label="Signature" value={result.signature} variant={result.valid ? "success" : "error"} />
            <ResultCard label="Expiry" value={result.expiry} />
            <ResultCard label="Warnings" value={String(result.warnings.length)} />
          </div>
          {result.warnings.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.warnings.map((warning) => <Badge key={warning} variant="warning">{warning}</Badge>)}</div>}
          {result.claims && <ClaimsTable claims={result.claims} />}
        </WorkspaceCard>
      )}
    </div>
  );
}

function JsonCard({ title, value }: { title: string; value: string }) {
  return (
    <WorkspaceCard>
      <div className="mb-2 flex items-center justify-between gap-3">
        <FieldLabel>{title}</FieldLabel>
        <CopyButton value={value} />
      </div>
      <CodeBlock value={value || "-"} />
    </WorkspaceCard>
  );
}

function TokenParts({ token }: { token: string }) {
  const [header = "", payload = "", signature = ""] = token.split(".");
  return (
    <div className="break-all rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs">
      <span className="text-blue-300">{header}</span><span className="text-zinc-500">.</span>
      <span className="text-emerald-300">{payload}</span><span className="text-zinc-500">.</span>
      <span className="text-amber-300">{signature}</span>
    </div>
  );
}

function ClaimsTable({ claims }: { claims: JwtObject }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {Object.entries(claims).map(([key, value]) => (
            <tr key={key}>
              <td className="w-44 px-3 py-2 font-mono text-muted-foreground">{key}</td>
              <td className="px-3 py-2 font-mono text-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "warning" | "muted"; children: ReactNode }) {
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
    muted: "border-border bg-white text-muted-foreground dark:bg-zinc-900",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${classes[tone]}`}>{children}</div>;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: T[] }) {
  return (
    <div className="flex flex-wrap rounded-lg border border-border p-1">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-md px-3 py-1.5 text-sm ${value === option ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>
      ))}
    </div>
  );
}

function decodeJwt(token: string): { header: JwtObject | null; payload: JwtObject | null; signature: string; error: string } {
  if (!token.trim()) return { header: null, payload: null, signature: "", error: "" };
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { header: null, payload: null, signature: "", error: `Expected 3 token parts, found ${parts.length}.` };
  try {
    return {
      header: JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as JwtObject,
      payload: JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as JwtObject,
      signature: parts[2],
      error: "",
    };
  } catch (err) {
    return { header: null, payload: null, signature: "", error: err instanceof Error ? err.message : "Could not decode JWT." };
  }
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function b64url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function jwtTimeStatus(payload: JwtObject) {
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;
  if (exp && exp < now) return { kind: "expired" as const, date: new Date(exp * 1000).toLocaleString(), relative: relativeTime(now - exp) };
  if (nbf && nbf > now) return { kind: "future" as const, date: new Date(nbf * 1000).toLocaleString(), relative: relativeTime(nbf - now) };
  if (!exp) return { kind: "none" as const, date: "", relative: "" };
  return { kind: "valid" as const, date: new Date(exp * 1000).toLocaleString(), relative: relativeTime(exp - now) };
}

function expiryLabel(status: ReturnType<typeof jwtTimeStatus>) {
  if (!status) return "No expiry";
  if (status.kind === "expired") return "Expired";
  if (status.kind === "future") return "Not yet valid";
  if (status.kind === "none") return "No expiry";
  return "Valid";
}

function relativeTime(seconds: number) {
  const abs = Math.abs(seconds);
  if (abs < 3600) return `${Math.max(1, Math.round(abs / 60))} minutes ago`;
  if (abs < 86400) return `${Math.round(abs / 3600)} hours ago`;
  return `${Math.round(abs / 86400)} days ago`;
}

function jwtWarnings(header: JwtObject, payload: JwtObject) {
  const warnings: string[] = [];
  if (String(header.alg).toLowerCase() === "none") warnings.push("Token uses alg=none.");
  if (!payload.exp) warnings.push("Token has no exp claim.");
  if (!payload.iss) warnings.push("Token has no iss claim.");
  if (!payload.aud) warnings.push("Token has no aud claim.");
  Object.keys(payload).filter((key) => /(password|secret|token|private|credential)/i.test(key)).forEach((key) => warnings.push(`Sensitive-looking claim: ${key}`));
  return warnings;
}

function toUnix(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function parseClaimValue(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
