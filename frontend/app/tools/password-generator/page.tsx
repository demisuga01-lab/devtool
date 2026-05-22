"use client";

import { useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CopyButton, Label, Checkbox, ToolInput, ResultCard, TabBar } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { formatDuration, passwordEntropy } from "@/lib/tool-insights";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUM = "0123456789";
const SYM = "!@#$%^&*()-_=+[]{};:,.<>/?";
const AMBIGUOUS = "{}[]()/'\"`~,;:.<>";
const SIMILAR = "iIlL1oO0";
const WORDS = ["atlas", "brisk", "cedar", "delta", "ember", "fable", "glint", "harbor", "indigo", "juno", "keystone", "lumen", "matrix", "nova", "onyx", "prairie", "quartz", "river", "signal", "tangent", "umbra", "velvet", "willow", "zenith"];

type Options = {
  length: number;
  upper: boolean;
  lower: boolean;
  num: boolean;
  sym: boolean;
  excludeAmbiguous: boolean;
  excludeSimilar: boolean;
};

function build(opts: Options): string {
  let pool = "";
  if (opts.upper) pool += UPPER;
  if (opts.lower) pool += LOWER;
  if (opts.num) pool += NUM;
  if (opts.sym) pool += SYM;
  if (opts.excludeAmbiguous) pool = pool.split("").filter((c) => !AMBIGUOUS.includes(c)).join("");
  if (opts.excludeSimilar) pool = pool.split("").filter((c) => !SIMILAR.includes(c)).join("");
  pool = Array.from(new Set(pool)).join("");
  if (!pool) return "";
  const bytes = new Uint32Array(opts.length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < opts.length; i++) {
    out += pool[bytes[i] % pool.length];
  }
  return out;
}

function strength(pw: string): { score: number; label: string; color: string } {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
  const entropy = pw.length * Math.log2(Math.max(pool, 2));
  if (entropy < 40) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (entropy < 70) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (entropy < 100) return { score: 3, label: "Strong", color: "bg-emerald-500" };
  return { score: 4, label: "Excellent", color: "bg-emerald-600" };
}

async function sha1(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function passphrase(wordCount: number, separator: string) {
  const bytes = new Uint32Array(wordCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => WORDS[value % WORDS.length]).join(separator);
}

export default function PasswordGeneratorPage() {
  const [opts, setOpts] = useState<Options>({
    length: 20,
    upper: true,
    lower: true,
    num: true,
    sym: true,
    excludeAmbiguous: false,
    excludeSimilar: false,
  });
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<string[]>([]);
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [hibp, setHibp] = useState(false);
  const [pwned, setPwned] = useState<Record<string, number>>({});
  const [checking, setChecking] = useState(false);

  const checkPassword = async (password: string) => {
    const res = await fetch(`${API_BASE}/hibp-check`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ sha1: await sha1(password) }),
    });
    const data = await res.json().catch(() => ({ count: 0 }));
    return typeof data.count === "number" ? data.count : 0;
  };

  const generate = async () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) list.push(mode === "passphrase" ? passphrase(Math.max(3, Math.min(8, Math.round(opts.length / 5))), "-") : build(opts));
    setResults(list);
    setPwned({});
    if (hibp) {
      setChecking(true);
      const entries = await Promise.all(list.map(async (password) => [password, await checkPassword(password)] as const));
      setPwned(Object.fromEntries(entries));
      setChecking(false);
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "Password Generator" }]} title="Password Generator" description="Generate strong passwords with custom rules." />
      <div className="space-y-5">
        <Panel noPadding className="p-5">
          <div className="mb-4">
            <TabBar active={mode} onChange={(value) => setMode(value as "password" | "passphrase")} tabs={[{ label: "Password", value: "password" }, { label: "Passphrase", value: "passphrase" }]} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{mode === "password" ? "Length" : "Approximate passphrase length"}</Label>
            <span className="font-mono text-sm">{opts.length}</span>
          </div>
          <ToolInput
            type="range"
            min={8}
            max={128}
            value={opts.length}
            onChange={(e) => setOpts({ ...opts, length: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-600"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Checkbox checked={opts.upper} onChange={(v) => setOpts({ ...opts, upper: v })} label="Uppercase" />
            <Checkbox checked={opts.lower} onChange={(v) => setOpts({ ...opts, lower: v })} label="Lowercase" />
            <Checkbox checked={opts.num} onChange={(v) => setOpts({ ...opts, num: v })} label="Numbers" />
            <Checkbox checked={opts.sym} onChange={(v) => setOpts({ ...opts, sym: v })} label="Symbols" />
            <Checkbox checked={opts.excludeAmbiguous} onChange={(v) => setOpts({ ...opts, excludeAmbiguous: v })} label="Exclude ambiguous" />
            <Checkbox checked={opts.excludeSimilar} onChange={(v) => setOpts({ ...opts, excludeSimilar: v })} label="Exclude similar" />
            <Checkbox checked={hibp} onChange={setHibp} label="Check HIBP k-anonymity" />
          </div>
        </Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Label>Quantity</Label>
          <Panel noPadding className="inline-flex p-0.5">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
                  (count === n
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                }
              >
                {n}
              </button>
            ))}
          </Panel>
          <Button variant="primary" onClick={() => void generate()}>{checking ? "Checking..." : "Generate"}</Button>
        </div>
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((pw, i) => {
              const s = strength(pw);
              const entropy = passwordEntropy(pw);
              return (
                <Panel noPadding key={i} className="space-y-4 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{pw}</code>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-12 rounded-full ${s.color}`} />
                        <span className="text-xs text-zinc-500">{entropy.label}</span>
                      </div>
                      <CopyButton value={pw} />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <ResultCard label="Entropy" value={`${entropy.entropy.toFixed(1)} bits`} />
                    <ResultCard label="Character Sets" value={entropy.sets.join(", ") || "word list"} />
                    {entropy.speeds.map((speed) => (
                      <ResultCard
                        key={speed.label}
                        label={`Crack @ ${speed.label}`}
                        value={Number.isFinite(speed.seconds) ? formatDuration(speed.seconds) : "impractical"}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hibp && pwned[pw] === 0 && <Badge variant="success">not found in HIBP</Badge>}
                    {hibp && pwned[pw] > 0 && <Badge variant="error">seen {pwned[pw].toLocaleString()} times</Badge>}
                    {mode === "passphrase" && <Badge variant="info">memorable passphrase</Badge>}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
