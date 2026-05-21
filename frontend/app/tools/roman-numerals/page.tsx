"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { CopyButton, Input, Label, Toggle } from "@/components/ui";

const table: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

function toRoman(num: number) {
  let n = num;
  const parts: string[] = [];
  for (const [value, symbol] of table) {
    while (n >= value) {
      parts.push(symbol);
      n -= value;
    }
  }
  return parts.join("");
}

function fromRoman(value: string) {
  let input = value.toUpperCase();
  let total = 0;
  for (const [num, symbol] of table) {
    while (input.startsWith(symbol)) {
      total += num;
      input = input.slice(symbol.length);
    }
  }
  return input ? null : total;
}

export default function RomanNumeralsPage() {
  const [mode, setMode] = useState("to");
  const [number, setNumber] = useState("2024");
  const [roman, setRoman] = useState("MMXXIV");
  const numberValue = Number(number);
  const converted = useMemo(() => mode === "to" ? (numberValue >= 1 && numberValue <= 3999 ? toRoman(numberValue) : "") : fromRoman(roman), [mode, numberValue, roman]);
  const breakdown = useMemo(() => {
    if (mode !== "to" || !converted) return "";
    let n = numberValue;
    const parts: string[] = [];
    for (const [value, symbol] of table) while (n >= value) { parts.push(symbol); n -= value; }
    return `${numberValue} = ${parts.join(" + ")}`;
  }, [converted, mode, numberValue]);

  return (
    <ToolShell slug="roman-numerals">
      <div className="space-y-5">
        <Toggle value={mode} onChange={setMode} options={[{ label: "Number to Roman", value: "to" }, { label: "Roman to Number", value: "from" }]} />
        {mode === "to" ? (
          <div><Label>Number (1-3999)</Label><Input type="number" min={1} max={3999} value={number} onChange={(event) => setNumber(event.target.value)} /></div>
        ) : (
          <div><Label>Roman numeral</Label><Input value={roman} onChange={(event) => setRoman(event.target.value.toUpperCase())} /></div>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={String(converted ?? "")} /></div>
          <p className="break-all font-mono text-2xl text-zinc-900 dark:text-zinc-100">{converted || "Invalid input"}</p>
          {breakdown && <p className="mt-3 text-sm text-zinc-500">{breakdown}</p>}
        </div>
      </div>
    </ToolShell>
  );
}
