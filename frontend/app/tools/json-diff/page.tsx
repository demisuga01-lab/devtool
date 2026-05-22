"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ErrorCard, Label, Panel, ToolTextarea } from "@/components/tool-ui";

type Diff = { type: "added" | "removed" | "changed" | "same"; path: string; oldValue?: unknown; newValue?: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function display(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function walk(a: unknown, b: unknown, path = "$"): Diff[] {
  if (isObject(a) && isObject(b)) {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    return keys.flatMap((key) => {
      const next = `${path}.${key}`;
      if (!(key in a)) return [{ type: "added", path: next, newValue: b[key] } as Diff];
      if (!(key in b)) return [{ type: "removed", path: next, oldValue: a[key] } as Diff];
      return walk(a[key], b[key], next);
    });
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return [{ type: "same", path, oldValue: a, newValue: b }];
  return [{ type: "changed", path, oldValue: a, newValue: b }];
}

export default function JsonDiffPage() {
  const [left, setLeft] = useState('{\n  "name": "Ada",\n  "age": 36\n}');
  const [right, setRight] = useState('{\n  "name": "Ada",\n  "age": 37,\n  "role": "admin"\n}');
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [error, setError] = useState("");

  function compare() {
    setError("");
    try {
      setDiffs(walk(JSON.parse(left), JSON.parse(right)));
    } catch (err) {
      setDiffs([]);
      setError(err instanceof Error ? err.message : "Invalid JSON input.");
    }
  }

  const styles: Record<Diff["type"], string> = {
    added: "border-l-4 border-l-emerald-500",
    removed: "border-l-4 border-l-red-500",
    changed: "border-l-4 border-l-amber-500",
    same: "border-l-4 border-l-zinc-300 dark:border-l-zinc-700",
  };
  const badgeVariants: Record<Diff["type"], "default" | "success" | "error" | "warning"> = {
    added: "success",
    removed: "error",
    changed: "warning",
    same: "default",
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "JSON Diff" }]} title="JSON Diff" description="Compare two JSON objects and highlight differences." />
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div><Label>JSON A</Label><ToolTextarea value={left} onChange={(event) => setLeft(event.target.value)} rows={14} /></div>
          <div><Label>JSON B</Label><ToolTextarea value={right} onChange={(event) => setRight(event.target.value)} rows={14} /></div>
        </div>
        <Button variant="primary" onClick={compare}>Compare JSON</Button>
        {error && <ErrorCard>{error}</ErrorCard>}
        <div className="space-y-2">
          {diffs.map((diff, index) => (
            <Panel key={`${diff.path}-${index}`} noPadding className={`p-3 text-sm ${styles[diff.type]}`}>
              <span className="font-mono font-semibold">{diff.path}</span>
              <Badge variant={badgeVariants[diff.type]} className="ml-2 uppercase">{diff.type}</Badge>
              {diff.type === "changed" && <span className="ml-2 font-mono">{display(diff.oldValue)} -&gt; {display(diff.newValue)}</span>}
              {diff.type === "added" && <span className="ml-2 font-mono">{display(diff.newValue)}</span>}
              {diff.type === "removed" && <span className="ml-2 font-mono">{display(diff.oldValue)}</span>}
            </Panel>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
