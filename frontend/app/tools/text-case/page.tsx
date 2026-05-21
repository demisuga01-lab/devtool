"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { CopyButton, Label, Textarea } from "@/components/ui";

function words(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_./-]+/g, " ")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function cap(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

export default function TextCasePage() {
  const [input, setInput] = useState("hello world foo");
  const rows = useMemo(() => {
    const parts = words(input);
    const spaced = parts.join(" ");
    return [
      ["camelCase", parts.map((part, index) => (index === 0 ? part : cap(part))).join("")],
      ["PascalCase", parts.map(cap).join("")],
      ["snake_case", parts.join("_")],
      ["kebab-case", parts.join("-")],
      ["SCREAMING_SNAKE", parts.join("_").toUpperCase()],
      ["Title Case", parts.map(cap).join(" ")],
      ["lowercase", spaced],
      ["UPPERCASE", spaced.toUpperCase()],
      ["dot.case", parts.join(".")],
      ["path/case", parts.join("/")],
    ];
  }, [input]);

  return (
    <ToolShell slug="text-case">
      <div className="space-y-5">
        <div>
          <Label>Text</Label>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} rows={7} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="w-44 px-4 py-2.5">Case</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="w-24 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map(([name, value]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{name}</td>
                  <td className="break-all px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-100">{value || "-"}</td>
                  <td className="px-4 py-3"><CopyButton value={value} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ToolShell>
  );
}
