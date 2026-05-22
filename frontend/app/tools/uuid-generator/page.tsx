"use client";

import { useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Button, CopyButton, Label } from "@/components/tool-ui";

function uuidv4(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function UuidGeneratorPage() {
  const [count, setCount] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) list.push(uuidv4());
    setGenerated(list);
    setHistory((prev) => [...list, ...prev].slice(0, 10));
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "UUID Generator" }]} title="UUID Generator" description="Generate UUID v4 identifiers in bulk." />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Label>Quantity</Label>
          <Panel noPadding className="inline-flex p-0.5">
            {[1, 5, 10, 25].map((n) => (
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={generate}>Generate</Button>
          {generated.length > 0 && <CopyButton value={generated.join("\n")} label="Copy all" />}
        </div>
        {generated.length > 0 && (
          <Panel noPadding>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {generated.map((u, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {u}
                  </code>
                  <CopyButton value={u} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {history.length > 0 && (
          <div>
            <Label>Recent (this session)</Label>
            <Panel noPadding className="bg-zinc-50 px-4 py-3">
              <ul className="space-y-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {history.map((u, i) => (
                  <li key={i} className="break-all">{u}</li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
