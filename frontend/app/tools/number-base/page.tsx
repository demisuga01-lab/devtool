"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { CopyButton, Input, Label } from "@/components/ui";

type Base = "dec" | "bin" | "oct" | "hex";

function parse(value: string, base: Base): bigint | null {
  const text = value.replace(/\s/g, "").trim();
  if (!text) return 0n;
  try {
    if (base === "dec") return BigInt(text);
    const negative = text.startsWith("-");
    const body = negative ? text.slice(1) : text;
    const parsed = BigInt(`${base === "bin" ? "0b" : base === "oct" ? "0o" : "0x"}${body}`);
    return negative ? -parsed : parsed;
  } catch {
    return null;
  }
}

function groupBits(value: string) {
  return value.replace(/\B(?=(.{4})+$)/g, " ");
}

function bitSize(value: bigint) {
  const bits = value < 0n ? (-value).toString(2).length + 1 : value.toString(2).length;
  return bits <= 8 ? 8 : bits <= 16 ? 16 : bits <= 32 ? 32 : bits <= 64 ? 64 : bits;
}

export default function NumberBasePage() {
  const [number, setNumber] = useState<bigint>(255n);
  const [error, setError] = useState("");

  function update(value: string, base: Base) {
    const parsed = parse(value, base);
    if (parsed === null) {
      setError(`Invalid ${base} number`);
      return;
    }
    setNumber(parsed);
    setError("");
  }

  const size = bitSize(number);
  const mask = (1n << BigInt(size)) - 1n;
  const twos = number < 0n ? (number & mask).toString(2).padStart(size, "0") : number.toString(2).padStart(size, "0");
  const fields = [
    ["Decimal", "dec", number.toString()],
    ["Binary", "bin", groupBits((number < 0n ? -number : number).toString(2))],
    ["Octal", "oct", (number < 0n ? "-" : "") + (number < 0n ? -number : number).toString(8)],
    ["Hexadecimal", "hex", (number < 0n ? "-" : "") + (number < 0n ? -number : number).toString(16).toUpperCase()],
  ] as const;

  return (
    <ToolShell slug="number-base">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, base, value]) => (
            <div key={base} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between"><Label>{label}</Label><CopyButton value={value} /></div>
              <Input value={value} onChange={(event) => update(event.target.value, base)} className="font-mono" />
            </div>
          ))}
        </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Bit length: {size}</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">Two&apos;s complement: {groupBits(twos)}</p>
        </div>
      </div>
    </ToolShell>
  );
}
