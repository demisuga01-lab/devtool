"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tool-ui";
import { Button, CopyButton, Label, Panel } from "@/components/tool-ui";

type Field = { mode: "every" | "specific" | "range" | "step"; values: number[]; from: number; to: number; step: number; min: number; max: number };
const configs = [
  ["minute", 0, 59], ["hour", 0, 23], ["day", 1, 31], ["month", 1, 12], ["weekday", 0, 6],
] as const;
const presets: Record<string, string> = { "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *", "@yearly": "0 0 1 1 *" };

function makeField(min: number, max: number): Field {
  return { mode: "every", values: [], from: min, to: max, step: 1, min, max };
}
function fieldText(field: Field) {
  if (field.mode === "specific") return field.values.sort((a, b) => a - b).join(",") || "*";
  if (field.mode === "range") return `${field.from}-${field.to}`;
  if (field.mode === "step") return `*/${field.step}`;
  return "*";
}
function nextRuns(expression: string) {
  const [min, hour] = expression.split(" ");
  const minutes = min === "*" ? null : Number(min.split(",")[0].split("/").pop());
  const hours = hour === "*" ? null : Number(hour.split(",")[0]);
  const out: string[] = [];
  const date = new Date();
  date.setSeconds(0, 0);
  while (out.length < 5) {
    date.setMinutes(date.getMinutes() + 1);
    if (minutes !== null && date.getMinutes() !== minutes && !min.startsWith("*/")) continue;
    if (min.startsWith("*/") && date.getMinutes() % Number(min.slice(2)) !== 0) continue;
    if (hours !== null && date.getHours() !== hours) continue;
    out.push(date.toLocaleString());
  }
  return out;
}

export default function CronBuilderPage() {
  const [fields, setFields] = useState<Record<string, Field>>(Object.fromEntries(configs.map(([name, min, max]) => [name, makeField(min, max)])) as Record<string, Field>);
  const expr = useMemo(() => configs.map(([name]) => fieldText(fields[name])).join(" "), [fields]);
  const description = expr === "*/5 * * * *" ? "Every 5 minutes" : expr === "0 9 * * 1-5" ? "At 9:00 AM every weekday" : `Cron expression: ${expr}`;
  function setField(name: string, update: Partial<Field>) {
    setFields(prev => ({ ...prev, [name]: { ...prev[name], ...update } }));
  }
  const applyPreset = (value: string) => {
    const parts = value.split(" ");
    setFields(Object.fromEntries(configs.map(([name, min, max], index) => {
      const field = makeField(min, max);
      const part = parts[index];
      if (part?.startsWith("*/")) return [name, { ...field, mode: "step", step: Number(part.slice(2)) }];
      if (part && part !== "*") return [name, { ...field, mode: part.includes("-") ? "range" : "specific", values: part.includes(",") ? part.split(",").map(Number) : [Number(part)], from: Number(part.split("-")[0]), to: Number(part.split("-")[1] ?? part) }];
      return [name, field];
    })) as Record<string, Field>);
  };

  return (
    <ToolShell slug="cron-builder">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">{Object.entries(presets).map(([name, value]) => <Button key={name} onClick={() => applyPreset(value)}>{name}</Button>)}</div>
        {configs.map(([name]) => {
          const field = fields[name];
          return (
            <Panel noPadding key={name} className="p-4">
              <h2 className="mb-3 text-sm font-semibold capitalize">{name}</h2>
              <div className="flex flex-wrap gap-2">{(["every", "specific", "range", "step"] as const).map((mode) => <Button key={mode} variant={field.mode === mode ? "primary" : "secondary"} onClick={() => setField(name, { mode })}>{mode}</Button>)}</div>
              {field.mode === "specific" && <div className="mt-3 grid grid-cols-10 gap-2">{Array.from({ length: field.max - field.min + 1 }, (_, i) => i + field.min).map((n) => <label key={n} className="text-xs"><input type="checkbox" checked={field.values.includes(n)} onChange={(event) => setField(name, { values: event.target.checked ? [...field.values, n] : field.values.filter((v) => v !== n) })} /> {n}</label>)}</div>}
              {field.mode === "range" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">From</label>
                    <input
                      type="number"
                      min={field.min ?? 0}
                      max={field.max ?? 59}
                      value={field.from ?? field.min ?? 0}
                      onChange={e => setField(name, { from: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">To</label>
                    <input
                      type="number"
                      min={field.min ?? 0}
                      max={field.max ?? 59}
                      value={field.to ?? field.max ?? 59}
                      onChange={e => setField(name, { to: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
              {field.mode === "step" && (
                <div className="mt-3">
                  <label className="text-xs text-zinc-500 mb-1 block">Every N</label>
                  <input
                    type="number"
                    min={1}
                    max={field.max ?? 59}
                    value={field.step ?? 1}
                    onChange={e => setField(name, { step: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </Panel>
          );
        })}
        <Panel className="space-y-3">
          <div className="flex items-center justify-between"><Label>Cron expression</Label><CopyButton value={expr} /></div>
          <p className="break-all font-mono text-[13px] text-zinc-900 dark:text-zinc-100">{expr}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">{nextRuns(expr).map((run) => <li key={run}>{run}</li>)}</ul>
        </Panel>
      </div>
    </ToolShell>
  );
}
