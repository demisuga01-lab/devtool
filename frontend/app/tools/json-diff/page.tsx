"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Label, Textarea } from "@/components/ui";

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

  const styles = {
    added: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    removed: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200",
    changed: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200",
    same: "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
  };

  return (
    <ToolShell slug="json-diff">
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div><Label>JSON A</Label><Textarea value={left} onChange={(event) => setLeft(event.target.value)} rows={14} /></div>
          <div><Label>JSON B</Label><Textarea value={right} onChange={(event) => setRight(event.target.value)} rows={14} /></div>
        </div>
        <Button variant="primary" onClick={compare}>Compare JSON</Button>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <div className="space-y-2">
          {diffs.map((diff, index) => (
            <div key={`${diff.path}-${index}`} className={`rounded-2xl border p-3 text-sm ${styles[diff.type]}`}>
              <span className="font-mono font-semibold">{diff.path}</span>
              <span className="ml-2 uppercase">{diff.type}</span>
              {diff.type === "changed" && <span className="ml-2 font-mono">{display(diff.oldValue)} -&gt; {display(diff.newValue)}</span>}
              {diff.type === "added" && <span className="ml-2 font-mono">{display(diff.newValue)}</span>}
              {diff.type === "removed" && <span className="ml-2 font-mono">{display(diff.oldValue)}</span>}
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
