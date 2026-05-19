"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Label, Checkbox } from "@/components/ui";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUM = "0123456789";
const SYM = "!@#$%^&*()-_=+[]{};:,.<>/?";
const AMBIGUOUS = "{}[]()/'\"`~,;:.<>";
const SIMILAR = "iIlL1oO0";

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

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) list.push(build(opts));
    setResults(list);
  };

  return (
    <ToolShell slug="password-generator">
      <div className="space-y-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <Label>Length</Label>
            <span className="font-mono text-sm">{opts.length}</span>
          </div>
          <input
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
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Label>Quantity</Label>
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
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
          </div>
          <Button variant="primary" onClick={generate}>Generate</Button>
        </div>
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((pw, i) => {
              const s = strength(pw);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{pw}</code>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-12 rounded-full ${s.color}`} />
                      <span className="text-xs text-zinc-500">{s.label}</span>
                    </div>
                    <CopyButton value={pw} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
