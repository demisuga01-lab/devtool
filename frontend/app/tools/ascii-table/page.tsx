"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label, Textarea } from "@/components/ui";

const controls = ["NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "TAB", "LF", "VT", "FF", "CR", "SO", "SI", "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US"];
const entities: Record<number, string> = { 34: "&quot;", 38: "&amp;", 39: "&#39;", 60: "&lt;", 62: "&gt;", 160: "&nbsp;" };
const rows = Array.from({ length: 128 }, (_, code) => ({
  code,
  hex: code.toString(16).toUpperCase().padStart(2, "0"),
  bin: code.toString(2).padStart(8, "0"),
  char: code < 32 ? controls[code] : code === 127 ? "DEL" : String.fromCharCode(code),
  printable: code >= 32 && code < 127,
}));

export default function AsciiTablePage() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) => row.char.toLowerCase().includes(q) || String(row.code).includes(q) || row.hex.toLowerCase().includes(q));
  }, [query]);

  async function copy(row: (typeof rows)[number]) {
    const value = row.printable ? row.char : row.char;
    await navigator.clipboard.writeText(value);
    setCopied(row.char);
    setTimeout(() => setCopied(""), 1200);
  }

  return (
    <ToolShell slug="ascii-table">
      <div className="space-y-5">
        <div>
          <Label>Search</Label>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by character, decimal, or hex" />
        </div>
        <div className="hidden">
          <Button>Search</Button>
          <Textarea readOnly value={query} />
          <CopyButton value={query} />
        </div>
        {["Control", "Printable"].map((group) => {
          const groupRows = filtered.filter((row) => group === "Control" ? !row.printable : row.printable);
          if (groupRows.length === 0) return null;
          return (
            <section key={group} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">{group}</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr><th className="px-4 py-2">Dec</th><th className="px-4 py-2">Hex</th><th className="px-4 py-2">Binary</th><th className="px-4 py-2">Char</th><th className="px-4 py-2">HTML</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {groupRows.map((row) => (
                    <tr key={row.code} onClick={() => void copy(row)} className={`cursor-pointer ${row.printable ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/20" : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800"}`}>
                      <td className="px-4 py-2 font-mono">{row.code}</td>
                      <td className="px-4 py-2 font-mono">0x{row.hex}</td>
                      <td className="px-4 py-2 font-mono">{row.bin}</td>
                      <td className="px-4 py-2 font-mono">{row.char}{copied === row.char ? " copied" : ""}</td>
                      <td className="px-4 py-2 font-mono text-zinc-500">{entities[row.code] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </ToolShell>
  );
}
