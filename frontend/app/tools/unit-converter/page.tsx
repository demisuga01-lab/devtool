"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { CopyButton, ToolInput, Label, ToolSelect, TabBar } from "@/components/tool-ui";

type Category = keyof typeof units | "Temperature";
const units = {
  Length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nm: 1852 },
  Weight: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
  Speed: { "m/s": 1, "km/h": 0.2777777778, mph: 0.44704, knots: 0.514444, "ft/s": 0.3048 },
  Area: { "mm²": 0.000001, "cm²": 0.0001, "m²": 1, "km²": 1000000, "in²": 0.00064516, "ft²": 0.09290304, ac: 4046.8564224, ha: 10000 },
  Volume: { ml: 0.001, l: 1, "m³": 1000, tsp: 0.00492892, tbsp: 0.0147868, "fl oz": 0.0295735, cup: 0.236588, pt: 0.473176, qt: 0.946353, gal: 3.78541 },
  Data: { bit: 0.125, byte: 1, KB: 1000, MB: 1000000, GB: 1000000000, TB: 1000000000000, PB: 1000000000000000 },
};
const tempUnits = ["°C", "°F", "K", "°R"] as const;

function toC(value: number, unit: string) {
  if (unit === "°F") return (value - 32) * 5 / 9;
  if (unit === "K") return value - 273.15;
  if (unit === "°R") return (value - 491.67) * 5 / 9;
  return value;
}
function fromC(value: number, unit: string) {
  if (unit === "°F") return value * 9 / 5 + 32;
  if (unit === "K") return value + 273.15;
  if (unit === "°R") return (value + 273.15) * 9 / 5;
  return value;
}

export default function UnitConverterPage() {
  const [category, setCategory] = useState<Category>("Length");
  const [value, setValue] = useState("1");
  const [unit, setUnit] = useState("m");
  const unitNames = category === "Temperature" ? tempUnits : Object.keys(units[category]);
  const results = useMemo(() => {
    const num = Number(value);
    if (!Number.isFinite(num)) return [];
    if (category === "Temperature") return tempUnits.map((target) => [target, fromC(toC(num, unit), target)]);
    const table = units[category];
    const base = num * table[unit as keyof typeof table];
    return Object.entries(table).map(([target, factor]) => [target, base / factor]);
  }, [category, unit, value]);

  function switchCategory(next: string) {
    const cat = next as Category;
    setCategory(cat);
    setUnit(cat === "Temperature" ? "°C" : Object.keys(units[cat])[0]);
  }

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "Unit Converter" }]} title="Unit Converter" description="Convert between units of length, weight, temperature, speed, and area." />
      <div className="space-y-5">
        <TabBar active={category} onChange={switchCategory} tabs={["Length", "Weight", "Temperature", "Speed", "Area", "Volume", "Data"].map((item) => ({ label: item, value: item }))} />
        <Panel noPadding className="grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
          <div><Label>Value</Label><ToolInput value={value} onChange={(event) => setValue(event.target.value)} /></div>
          <div><Label>Unit</Label><ToolSelect value={unit} onChange={(event) => setUnit(event.target.value)}>{unitNames.map((item) => <option key={item}>{item}</option>)}</ToolSelect></div>
        </Panel>
        <Panel noPadding className="overflow-hidden">
          {results.map(([name, result]) => {
            const text = Number(result).toLocaleString(undefined, { maximumFractionDigits: 8 });
            return <div key={String(name)} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"><span>{String(name)}</span><span className="font-mono">{text}</span><CopyButton value={text} /></div>;
          })}
        </Panel>
      </div>
    </ToolShell>
  );
}
