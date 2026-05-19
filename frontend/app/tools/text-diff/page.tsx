"use client";

import { useState } from "react";
import { diffLines, Change } from "diff";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, Label } from "@/components/ui";

export default function TextDiffPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [diff, setDiff] = useState<Change[] | null>(null);

  const compare = () => setDiff(diffLines(a, b));

  return (
    <ToolShell slug="text-diff">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Original</Label>
            <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={12} />
          </div>
          <div>
            <Label>Modified</Label>
            <Textarea value={b} onChange={(e) => setB(e.target.value)} rows={12} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={compare}>Compare</Button>
          <Button variant="ghost" onClick={() => { setA(""); setB(""); setDiff(null); }}>Clear</Button>
        </div>
        {diff && (
          <div>
            <Label>Diff</Label>
            <DiffView changes={diff} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function DiffView({ changes }: { changes: Change[] }) {
  let aLine = 0;
  let bLine = 0;
  type Row = { aNum: number | null; bNum: number | null; kind: "ctx" | "add" | "del"; text: string };
  const rows: Row[] = [];
  for (const c of changes) {
    const lines = c.value.split("\n");
    if (lines.at(-1) === "") lines.pop();
    for (const line of lines) {
      if (c.added) {
        bLine++;
        rows.push({ aNum: null, bNum: bLine, kind: "add", text: line });
      } else if (c.removed) {
        aLine++;
        rows.push({ aNum: aLine, bNum: null, kind: "del", text: line });
      } else {
        aLine++;
        bLine++;
        rows.push({ aNum: aLine, bNum: bLine, kind: "ctx", text: line });
      }
    }
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <pre className="font-mono text-xs">
        {rows.map((r, i) => {
          const bg =
            r.kind === "add"
              ? "bg-emerald-50 dark:bg-emerald-950/30"
              : r.kind === "del"
              ? "bg-red-50 dark:bg-red-950/30"
              : "";
          const sign = r.kind === "add" ? "+" : r.kind === "del" ? "-" : " ";
          return (
            <div key={i} className={`flex ${bg}`}>
              <span className="w-10 select-none px-2 text-right text-zinc-400">{r.aNum ?? ""}</span>
              <span className="w-10 select-none px-2 text-right text-zinc-400">{r.bNum ?? ""}</span>
              <span className="w-5 select-none px-1 text-zinc-500">{sign}</span>
              <span className="flex-1 whitespace-pre-wrap break-words pr-3">{r.text}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
