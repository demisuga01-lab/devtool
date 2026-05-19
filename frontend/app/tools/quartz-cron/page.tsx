"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, ErrorCard, Input, Label } from "@/components/ui";

const fields = ["Seconds", "Minutes", "Hours", "Day of month", "Month", "Day of week", "Year"];
type ParsedCron = { parts: string[]; runs: string[] } | { error: string };

function parsePart(part: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  if (part === "*" || part === "?") {
    for (let i = min; i <= max; i++) values.add(i);
    return values;
  }
  for (const piece of part.split(",")) {
    const [range, stepRaw] = piece.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    const [startRaw, endRaw] = range.split("-");
    const start = startRaw === "*" || startRaw === "?" ? min : Number(startRaw);
    const end = endRaw ? Number(endRaw) : startRaw === "*" || startRaw === "?" ? max : Number(startRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step) || step < 1) throw new Error(`Invalid field: ${part}`);
    for (let i = start; i <= end; i += step) if (i >= min && i <= max) values.add(i);
  }
  return values;
}

function explain(part: string, name: string): string {
  if (part === "*" || part === "?") return `Every ${name.toLowerCase()}`;
  if (part.includes("/")) return `Every ${part.split("/")[1]} ${name.toLowerCase()} units`;
  if (part.includes(",")) return `At ${part}`;
  if (part.includes("-")) return `From ${part.replace("-", " to ")}`;
  return `At ${name.toLowerCase()} ${part}`;
}

export default function QuartzCronPage() {
  const [expression, setExpression] = useState("0 0/5 * * * ?");
  const [error, setError] = useState("");

  const parsed = useMemo<ParsedCron>(() => {
    try {
      const parts = expression.trim().split(/\s+/);
      if (![6, 7].includes(parts.length)) throw new Error("Quartz cron must have 6 or 7 fields.");
      const sets: [Set<number>, Set<number>, Set<number>, Set<number>, Set<number>, Set<number>, Set<number> | null] = [
        parsePart(parts[0], 0, 59),
        parsePart(parts[1], 0, 59),
        parsePart(parts[2], 0, 23),
        parsePart(parts[3], 1, 31),
        parsePart(parts[4], 1, 12),
        parsePart(parts[5], 1, 7),
        parts[6] ? parsePart(parts[6], 1970, 2099) : null,
      ];
      const runs: string[] = [];
      const cursor = new Date();
      cursor.setMilliseconds(0);
      cursor.setSeconds(cursor.getSeconds() + 1);
      for (let i = 0; i < 1_000_000 && runs.length < 10; i++) {
        const quartzDay = cursor.getDay() === 0 ? 1 : cursor.getDay() + 1;
        if (
          sets[0].has(cursor.getSeconds()) &&
          sets[1].has(cursor.getMinutes()) &&
          sets[2].has(cursor.getHours()) &&
          sets[3].has(cursor.getDate()) &&
          sets[4].has(cursor.getMonth() + 1) &&
          sets[5].has(quartzDay) &&
          (!sets[6] || sets[6].has(cursor.getFullYear()))
        ) runs.push(cursor.toISOString().replace("T", " ").slice(0, 19));
        cursor.setSeconds(cursor.getSeconds() + 1);
      }
      return { parts, runs };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Invalid Quartz cron expression." };
    }
  }, [expression]);

  useEffect(() => setError("error" in parsed ? parsed.error : ""), [parsed]);

  return (
    <ToolShell slug="quartz-cron">
      <div className="space-y-5">
        <div>
          <Label>Quartz expression</Label>
          <Input value={expression} onChange={(e) => setExpression(e.target.value)} placeholder="0 0/5 * * * ?" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!expression}>Parse</Button>
          <Button variant="ghost" onClick={() => setExpression("")}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {"parts" in parsed && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Description</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{parsed.parts[1]?.includes("/") ? `Every ${parsed.parts[1].split("/")[1]} minutes` : "Quartz cron expression parsed successfully."}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Meaning</th></tr></thead>
                <tbody>{parsed.parts.map((part, idx) => <tr key={fields[idx]} className="border-t border-zinc-100 dark:border-zinc-800"><td className="px-3 py-2">{fields[idx]}</td><td className="px-3 py-2 font-mono">{part}</td><td className="px-3 py-2 text-zinc-500">{explain(part, fields[idx])}</td></tr>)}</tbody>
              </table>
            </div>
            <div><Label>Next 10 run times</Label><CodeBlock value={parsed.runs.join("\n") || "No runs found within search limit."} /></div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Quartz cron includes a seconds field and supports 6 or 7 fields; standard cron usually has 5 fields.</p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
