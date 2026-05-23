"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Clock, Eye, EyeOff, Fingerprint, Hash, Key, Lock, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { md5 } from "@/lib/md5";
import { NewToolPage } from "../_components/new-tool-pages";
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

type Tab = "hash" | "hmac" | "blake2" | "bcrypt" | "verify" | "totp";
type ShaAlgo = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
type HmacAlgo = ShaAlgo | "MD5";
type TotpAlgo = "SHA-1" | "SHA-256" | "SHA-512";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "hash", label: "Hash", icon: Hash },
  { id: "hmac", label: "HMAC", icon: Key },
  { id: "blake2", label: "BLAKE2", icon: Fingerprint },
  { id: "bcrypt", label: "Bcrypt", icon: Lock },
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "totp", label: "TOTP", icon: Clock },
];

const hashAlgorithms = ["MD5", "SHA-1", "SHA-224", "SHA-256", "SHA-384", "SHA-512", "SHA3-256", "SHA3-512"] as const;
type HashAlgo = (typeof hashAlgorithms)[number];

export default function HashWorkspacePage() {
  const [active, setActive] = useState<Tab>("hash");

  return (
    <WorkspaceShell
      title="Hash & Crypto"
      subtitle="Generate and verify hashes, HMAC, bcrypt, BLAKE2, and TOTP"
      href="/tools/hash"
      icon={ShieldCheck}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="hash"
      intentGroup="security"
    >
      {active === "hash" && <HashTab />}
      {active === "hmac" && <HmacTab />}
      {active === "blake2" && <NewToolPage slug="blake2-generator" embedded />}
      {active === "bcrypt" && <BcryptTab />}
      {active === "verify" && <NewToolPage slug="hash-verifier" embedded />}
      {active === "totp" && <TotpTab />}
    </WorkspaceShell>
  );
}

function HashTab() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; size: number; bytes: Uint8Array } | null>(null);
  const [selected, setSelected] = useState<Record<HashAlgo, boolean>>(() => Object.fromEntries(hashAlgorithms.map((algo) => [algo, ["MD5", "SHA-1", "SHA-256", "SHA-512"].includes(algo)])) as Record<HashAlgo, boolean>);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadFile(nextFile: File) {
    setFile({ name: nextFile.name, size: nextFile.size, bytes: new Uint8Array(await nextFile.arrayBuffer()) });
  }

  async function generate() {
    setLoading(true);
    setError("");
    setResults({});
    try {
      const bytes = mode === "file" ? file?.bytes : new TextEncoder().encode(text);
      if (!bytes) throw new Error("Choose a file or enter text to hash.");
      const next: Record<string, string> = {};
      for (const algo of hashAlgorithms.filter((item) => selected[item])) {
        if (algo === "MD5") {
          next[algo] = mode === "text" ? md5(text) : "MD5 for binary files is not available in this browser build.";
        } else if (algo === "SHA-224" || algo === "SHA3-256" || algo === "SHA3-512") {
          next[algo] = "Not available in Web Crypto API on this browser.";
        } else {
          next[algo] = await digestBytes(algo, bytes);
        }
      }
      setResults(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate hashes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Segmented value={mode} onChange={setMode} options={[["text", "Text input"], ["file", "File upload"]]} />
      {mode === "text" ? (
        <div><FieldLabel>Text to hash</FieldLabel><textarea value={text} onChange={(event) => setText(event.target.value)} className={`${textareaClass} min-h-[180px]`} /></div>
      ) : (
        <WorkspaceCard><FieldLabel>File</FieldLabel><input type="file" onChange={(event) => { const next = event.target.files?.[0]; if (next) void loadFile(next); }} className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 dark:file:bg-zinc-800 dark:file:text-zinc-100" />{file && <p className="mt-2 text-sm text-muted-foreground">{file.name} ({formatBytes(file.size)})</p>}</WorkspaceCard>
      )}
      <WorkspaceCard>
        <FieldLabel>Algorithms</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {hashAlgorithms.map((algo) => <Checkbox key={algo} checked={selected[algo]} onChange={(value) => setSelected({ ...selected, [algo]: value })} label={algo} />)}
        </div>
      </WorkspaceCard>
      <PrimaryButton onClick={() => void generate()} disabled={loading}>{loading ? "Generating..." : "Generate hashes"}</PrimaryButton>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {Object.keys(results).length > 0 && (
        <WorkspaceCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Algorithm</th><th className="px-4 py-2">Hash</th><th /></tr></thead>
            <tbody>{Object.entries(results).map(([algo, value]) => <tr key={algo} className="border-b border-border last:border-b-0"><td className="px-4 py-3 font-medium">{algo}</td><td className="break-all px-4 py-3 font-mono text-xs">{value}</td><td className="px-4 py-3"><CopyButton value={value} /></td></tr>)}</tbody>
          </table>
        </WorkspaceCard>
      )}
    </div>
  );
}

function HmacTab() {
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [algo, setAlgo] = useState<HmacAlgo>("SHA-256");
  const [encoding, setEncoding] = useState<"hex" | "base64">("hex");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    try {
      if (algo === "MD5") throw new Error("MD5 HMAC is not available in Web Crypto API in this browser.");
      const bytes = await hmacBytes(algo, key, message);
      setOutput(encoding === "hex" ? toHex(bytes) : bytesToBase64(bytes));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Unable to generate HMAC.");
    }
  }

  return (
    <div className="space-y-5">
      <div><FieldLabel>Message</FieldLabel><textarea value={message} onChange={(event) => setMessage(event.target.value)} className={`${textareaClass} min-h-[180px]`} /></div>
      <div className="grid gap-3 md:grid-cols-3">
        <div><FieldLabel>Key</FieldLabel><input value={key} onChange={(event) => setKey(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Algorithm</FieldLabel><select value={algo} onChange={(event) => setAlgo(event.target.value as HmacAlgo)} className={inputClass}><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option><option>SHA-1</option><option>MD5</option></select></div>
        <div><FieldLabel>Encoding</FieldLabel><select value={encoding} onChange={(event) => setEncoding(event.target.value as "hex" | "base64")} className={inputClass}><option value="hex">Hex</option><option value="base64">Base64</option></select></div>
      </div>
      <PrimaryButton onClick={() => void generate()} disabled={!message || !key}>Generate</PrimaryButton>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Output label={`HMAC ${algo}`} value={output} />
    </div>
  );
}

function BcryptTab() {
  const [sub, setSub] = useState<"hash" | "verify">("hash");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [hash, setHash] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [cost, setCost] = useState(10);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<boolean | null>(null);

  async function runPython(code: string) {
    const response = await fetch(`${API_BASE}/tools/run-code`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ language: "python", version: "3.10.0", code, stdin: "" }),
    });
    const data = (await response.json().catch(() => ({}))) as { stdout?: string; output?: string; stderr?: string; detail?: string };
    if (!response.ok) throw new Error(data.detail || "Bcrypt request failed.");
    if (data.stderr) throw new Error(data.stderr);
    return (data.stdout || data.output || "").trim();
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      setHash(await runPython(`import bcrypt\npassword = ${JSON.stringify(password)}.encode()\nsalt = bcrypt.gensalt(rounds=${cost})\nprint(bcrypt.hashpw(password, salt).decode())`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate bcrypt hash.");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setError("");
    setMatch(null);
    try {
      const result = await runPython(`import bcrypt\npassword = ${JSON.stringify(verifyPassword)}.encode()\nhashed = ${JSON.stringify(verifyHash)}.encode()\nprint("true" if bcrypt.checkpw(password, hashed) else "false")`);
      setMatch(result === "true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify bcrypt hash.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Segmented value={sub} onChange={setSub} options={[["hash", "Hash"], ["verify", "Verify"]]} />
      {sub === "hash" ? (
        <WorkspaceCard className="space-y-4">
          <div><FieldLabel>Password</FieldLabel><div className="flex gap-2"><input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /><SecondaryButton onClick={() => setShow((value) => !value)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</SecondaryButton></div></div>
          <div><FieldLabel>Cost factor: {cost} (about {Math.pow(2, cost).toLocaleString()} rounds)</FieldLabel><input type="range" min={4} max={14} value={cost} onChange={(event) => setCost(Number(event.target.value))} className="w-full accent-emerald-600" /></div>
          <PrimaryButton onClick={() => void generate()} disabled={!password || loading}>{loading ? "Generating..." : "Generate hash"}</PrimaryButton>
          <Output label="Bcrypt hash" value={hash} />
        </WorkspaceCard>
      ) : (
        <WorkspaceCard className="space-y-4">
          <div><FieldLabel>Password</FieldLabel><input type="password" value={verifyPassword} onChange={(event) => setVerifyPassword(event.target.value)} className={inputClass} /></div>
          <div><FieldLabel>Bcrypt hash</FieldLabel><textarea value={verifyHash} onChange={(event) => setVerifyHash(event.target.value)} className={`${textareaClass} min-h-[100px]`} /></div>
          <PrimaryButton onClick={() => void verify()} disabled={!verifyPassword || !verifyHash || loading}>{loading ? "Verifying..." : "Verify hash"}</PrimaryButton>
          {match !== null && <div className={`rounded-lg border p-4 text-sm font-medium ${match ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-red-500/40 bg-red-500/10 text-red-600"}`}>{match ? "Password matches" : "Password does not match"}</div>}
        </WorkspaceCard>
      )}
      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TotpTab() {
  const [secret, setSecret] = useState("JBSWY3DPEHPK3PXP");
  const [algorithm, setAlgorithm] = useState<TotpAlgo>("SHA-1");
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [account, setAccount] = useState("devtools@example.com");
  const [issuer, setIssuer] = useState("DevTools");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [qrVisible, setQrVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remaining = period - (now % period);
  const uri = useMemo(() => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${algorithm.replace("SHA-", "SHA")}&digits=${digits}&period=${period}`, [account, algorithm, digits, issuer, period, secret]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    hotp(secret, Math.floor(now / period), digits, algorithm)
      .then((next) => {
        if (!cancelled) {
          setCode(next);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCode("");
          setError(err instanceof Error ? err.message : "Unable to generate TOTP.");
        }
      });
    return () => { cancelled = true; };
  }, [algorithm, digits, now, period, secret]);

  useEffect(() => {
    if (qrVisible && canvasRef.current) QRCode.toCanvas(canvasRef.current, uri, { width: 220, margin: 2 }).catch(() => undefined);
  }, [qrVisible, uri]);

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3"><FieldLabel>Secret key (Base32)</FieldLabel><div className="flex gap-2"><input value={secret} onChange={(event) => setSecret(event.target.value)} className={monoInputClass} /><SecondaryButton onClick={() => setSecret(randomSecret())}>Random</SecondaryButton></div></div>
        <div><FieldLabel>Algorithm</FieldLabel><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as TotpAlgo)} className={inputClass}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></div>
        <div><FieldLabel>Digits</FieldLabel><select value={digits} onChange={(event) => setDigits(Number(event.target.value))} className={inputClass}><option value={6}>6</option><option value={8}>8</option></select></div>
        <div><FieldLabel>Period</FieldLabel><select value={period} onChange={(event) => setPeriod(Number(event.target.value))} className={inputClass}><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></div>
      </WorkspaceCard>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <WorkspaceCard className="text-center">
        <p className="font-mono text-5xl font-bold tracking-widest text-foreground">{code || "------"}</p>
        <div className="mx-auto mt-5 h-3 max-w-xl overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full bg-emerald-600" style={{ width: `${(remaining / period) * 100}%` }} /></div>
        <p className="mt-2 text-sm text-muted-foreground">{remaining}s remaining</p>
        <div className="mt-4"><CopyButton value={code} label="Copy code" /></div>
      </WorkspaceCard>
      <WorkspaceCard className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2"><div><FieldLabel>Account name</FieldLabel><input value={account} onChange={(event) => setAccount(event.target.value)} className={inputClass} /></div><div><FieldLabel>Issuer</FieldLabel><input value={issuer} onChange={(event) => setIssuer(event.target.value)} className={inputClass} /></div></div>
        <PrimaryButton onClick={() => setQrVisible(true)}>Generate QR</PrimaryButton>
        {qrVisible && <div className="flex justify-center"><canvas ref={canvasRef} className="rounded-lg bg-white p-2" /></div>}
      </WorkspaceCard>
    </div>
  );
}

function Output({ label, value }: { label: string; value: string }) {
  return <div><div className="flex items-center justify-between"><FieldLabel>{label}</FieldLabel><CopyButton value={value} label="Copy" /></div><textarea value={value} readOnly className={`${textareaClass} min-h-[100px]`} /></div>;
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex min-h-10 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />{label}</label>;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">{options.map(([id, label]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>;
}

async function digestBytes(algo: ShaAlgo, bytes: Uint8Array) {
  const copy = new Uint8Array(bytes);
  return toHex(new Uint8Array(await crypto.subtle.digest(algo, copy.buffer)));
}

async function hmacBytes(algo: ShaAlgo, secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes).map((byte) => base32Alphabet[byte % base32Alphabet.length]).join("");
}

function base32Decode(secret: string) {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  if (!clean) throw new Error("Secret must be Base32.");
  let bits = "";
  for (const char of clean) {
    const value = base32Alphabet.indexOf(char);
    if (value < 0) throw new Error("Secret must be Base32.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

function counterBytes(counter: number) {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setUint32(4, counter, false);
  return buffer;
}

async function hotp(secret: string, counter: number, digits: number, algorithm: TotpAlgo) {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes(counter)));
  const offset = mac[mac.length - 1] & 0xf;
  const binary = ((mac[offset] & 0x7f) << 24) | ((mac[offset + 1] & 0xff) << 16) | ((mac[offset + 2] & 0xff) << 8) | (mac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
