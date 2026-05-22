"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { CopyButton, Label, ToolTextarea } from "@/components/tool-ui";

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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Text Case Converter" }]} title="Text Case Converter" description="Convert text between camelCase, snake_case, PascalCase, kebab-case, SCREAMING_SNAKE, and more." />
      <div className="space-y-5">
        <div>
          <Label>Text</Label>
          <ToolTextarea value={input} onChange={(event) => setInput(event.target.value)} rows={7} />
        </div>
        <Panel noPadding className="overflow-hidden">
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
        </Panel>
      </div>
    </ToolShell>
  );
}
