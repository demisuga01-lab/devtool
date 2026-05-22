"use client";

import { useState } from "react";
import { diffLines, diffWords, Change } from "diff";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, Checkbox, ResultCard, ToolTextarea, Label, TabBar } from "@/components/tool-ui";

export default function TextDiffPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [diff, setDiff] = useState<Change[] | null>(null);
  const [mode, setMode] = useState<"line" | "word">("line");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  const compare = () => {
    if (!a && !b) {
      setDiff(null);
      return;
    }
    const left = ignoreWhitespace ? a.replace(/[ \t]+/g, " ") : a;
    const right = ignoreWhitespace ? b.replace(/[ \t]+/g, " ") : b;
    setDiff(mode === "line" ? diffLines(left, right) : diffWords(left, right));
  };

  const stats = diff
    ? diff.reduce(
        (acc, change) => {
          const units = mode === "line" ? change.value.split("\n").filter((line, index, arr) => line || index < arr.length - 1).length : change.value.trim().split(/\s+/).filter(Boolean).length;
          if (change.added) acc.added += units;
          else if (change.removed) acc.removed += units;
          else acc.unchanged += units;
          return acc;
        },
        { added: 0, removed: 0, unchanged: 0 },
      )
    : { added: 0, removed: 0, unchanged: 0 };
  const similarity = stats.added + stats.removed + stats.unchanged > 0 ? (stats.unchanged / (stats.added + stats.removed + stats.unchanged)) * 100 : 100;

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Text Diff" }]} title="Text Diff" description="Compare two pieces of text line by line." />
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Original</Label>
            <ToolTextarea value={a} onChange={(e) => setA(e.target.value)} rows={12} />
          </div>
          <div>
            <Label>Modified</Label>
            <ToolTextarea value={b} onChange={(e) => setB(e.target.value)} rows={12} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabBar active={mode} onChange={(value) => setMode(value as "line" | "word")} tabs={[{ label: "Line diff", value: "line" }, { label: "Word diff", value: "word" }]} />
          <Checkbox checked={ignoreWhitespace} onChange={setIgnoreWhitespace} label="Ignore repeated whitespace" />
          <Button variant="primary" onClick={compare}>Compare</Button>
          <Button variant="ghost" onClick={() => { setA(""); setB(""); setDiff(null); }}>Clear</Button>
        </div>
        {diff && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ResultCard label={mode === "line" ? "Lines Added" : "Words Added"} value={String(stats.added)} />
              <ResultCard label={mode === "line" ? "Lines Removed" : "Words Removed"} value={String(stats.removed)} />
              <ResultCard label="Unchanged" value={String(stats.unchanged)} />
              <ResultCard label="Similarity" value={`${similarity.toFixed(1)}%`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={similarity > 80 ? "success" : similarity > 50 ? "warning" : "error"}>{similarity.toFixed(0)}% similar</Badge>
              <Badge variant="info">{Math.abs(b.length - a.length)} character delta</Badge>
            </div>
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
    <Panel noPadding className="overflow-x-auto">
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
    </Panel>
  );
}
