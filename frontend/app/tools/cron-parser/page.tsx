"use client";

import { useMemo, useState } from "react";
import cronstrue from "cronstrue";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { InlineError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { ToolInput, Label } from "@/components/tool-ui";

function parseField(field: string, min: number, max: number): number[] {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    let step = 1;
    let range = part;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      step = parseInt(part.slice(slash + 1), 10);
      range = part.slice(0, slash);
    }
    let lo = min;
    let hi = max;
    if (range === "*" || range === "") {
      // full
    } else if (range.includes("-")) {
      const [a, b] = range.split("-").map((n) => parseInt(n, 10));
      lo = a;
      hi = b;
    } else {
      lo = parseInt(range, 10);
      hi = lo;
    }
    if (Number.isNaN(lo) || Number.isNaN(hi) || lo < min || hi > max || lo > hi) {
      throw new Error(`Field out of range: ${field}`);
    }
    for (let i = lo; i <= hi; i += step) out.add(i);
  }
  return Array.from(out).sort((a, b) => a - b);
}

type Parsed = {
  minute: number[];
  hour: number[];
  dom: number[];
  month: number[];
  dow: number[];
};

function parseCron(expr: string): Parsed {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error("Cron must have 5 or 6 fields.");
  }
  const fields = parts.length === 6 ? parts.slice(1) : parts;
  return {
    minute: parseField(fields[0], 0, 59),
    hour: parseField(fields[1], 0, 23),
    dom: parseField(fields[2], 1, 31),
    month: parseField(fields[3], 1, 12),
    dow: parseField(fields[4].replace("7", "0"), 0, 6),
  };
}

function nextRuns(parsed: Parsed, from: Date, count: number): Date[] {
  const result: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  let safety = 0;
  while (result.length < count && safety < 500000) {
    safety++;
    if (
      parsed.minute.includes(cursor.getMinutes()) &&
      parsed.hour.includes(cursor.getHours()) &&
      parsed.month.includes(cursor.getMonth() + 1) &&
      (parsed.dom.includes(cursor.getDate()) || parsed.dow.includes(cursor.getDay()))
    ) {
      result.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return result;
}

export default function CronParserPage() {
  const [expr, setExpr] = useState("*/15 9-17 * * 1-5");

  const { description, parsed, error } = useMemo(() => {
    if (!expr.trim()) return { description: "", parsed: null as Parsed | null, error: null as ToolError | null };
    try {
      const d = cronstrue.toString(expr);
      const p = parseCron(expr);
      return { description: d, parsed: p, error: null as ToolError | null };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid expression";
      const parts = expr.trim().split(/\s+/).filter(Boolean);
      const suggestion =
        parts.length < 5
          ? `A standard cron needs 5 fields: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-7). You have only ${parts.length}.`
          : parts.length > 6
            ? "Standard cron has 5 fields, or 6 with seconds. You have too many fields."
            : "Check each field is within its valid range and uses valid syntax (* , - /).";
      return { description: "", parsed: null, error: { title: "Invalid cron expression", detail: message, suggestion } };
    }
  }, [expr]);

  const upcoming = useMemo(() => (parsed ? nextRuns(parsed, new Date(), 10) : []), [parsed]);

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Date & Time" }, { label: "Cron Parser" }]} title="Cron Parser" description="Parse cron expressions and preview next runs." />
      <div className="space-y-5">
        <div>
          <Label>Cron expression</Label>
          <ToolInput value={expr} onChange={(e) => setExpr(e.target.value)} className="font-mono" />
        </div>
        {error && <InlineError error={error} />}
        {description && (
          <Panel noPadding className="border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
            {description}
          </Panel>
        )}
        {parsed && (
          <>
            <div>
              <Label>Field breakdown</Label>
              <Panel noPadding className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                      <th className="px-4 py-2">Field</th>
                      <th className="px-4 py-2">Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(
                      [
                        ["Minute", parsed.minute],
                        ["Hour", parsed.hour],
                        ["Day of month", parsed.dom],
                        ["Month", parsed.month],
                        ["Day of week", parsed.dow],
                      ] as [string, number[]][]
                    ).map(([label, vals]) => (
                      <tr key={label}>
                        <td className="px-4 py-2 font-medium">{label}</td>
                        <td className="px-4 py-2 font-mono text-xs">{vals.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
            <div>
              <Label>Next 10 runs (local)</Label>
              <Panel noPadding>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {upcoming.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-zinc-500">No upcoming runs in the search window.</li>
                  ) : (
                    upcoming.map((d, i) => (
                      <li key={i} className="px-4 py-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                        {d.toLocaleString()}
                      </li>
                    ))
                  )}
                </ul>
              </Panel>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}

