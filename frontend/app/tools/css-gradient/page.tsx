"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, CopyButton, ToolInput, Label, ToolSelect, CodeBlock } from "@/components/tool-ui";

type Stop = { color: string; pos: number };
const presets: Stop[][] = [
  [{ color: "#667eea", pos: 0 }, { color: "#764ba2", pos: 100 }],
  [{ color: "#11998e", pos: 0 }, { color: "#38ef7d", pos: 100 }],
  [{ color: "#fc466b", pos: 0 }, { color: "#3f5efb", pos: 100 }],
  [{ color: "#f7971e", pos: 0 }, { color: "#ffd200", pos: 100 }],
  [{ color: "#00c6ff", pos: 0 }, { color: "#0072ff", pos: 100 }],
  [{ color: "#ee9ca7", pos: 0 }, { color: "#ffdde1", pos: 100 }],
  [{ color: "#8360c3", pos: 0 }, { color: "#2ebf91", pos: 100 }],
  [{ color: "#ff512f", pos: 0 }, { color: "#dd2476", pos: 100 }],
];

export default function CssGradientPage() {
  const [type, setType] = useState("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>(presets[0]);
  const css = useMemo(() => {
    const body = stops.map((stop) => `${stop.color} ${stop.pos}%`).join(", ");
    return `background: ${type === "linear" ? `linear-gradient(${angle}deg, ${body})` : `radial-gradient(circle, ${body})`};`;
  }, [angle, stops, type]);
  const background = css.replace("background: ", "").replace(";", "");

  return (
    <ToolShell slug="css-gradient">
      <div className="space-y-5">
        <Panel noPadding className="grid gap-4 p-4 sm:grid-cols-2">
          <div><Label>Type</Label><ToolSelect value={type} onChange={(event) => setType(event.target.value)}><option value="linear">Linear</option><option value="radial">Radial</option></ToolSelect></div>
          {type === "linear" && <div><Label>Angle: {angle}deg</Label><ToolInput type="range" min={0} max={360} value={angle} onChange={(event) => setAngle(Number(event.target.value))} /></div>}
        </Panel>
        <div className="h-[200px] rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800" style={{ background }} />
        <Panel noPadding className="space-y-3 p-4">
          {stops.map((stop, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[120px_1fr_80px_auto]">
              <ToolInput type="color" value={stop.color} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, color: event.target.value } : item))} />
              <ToolInput type="range" min={0} max={100} value={stop.pos} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, pos: Number(event.target.value) } : item))} />
              <ToolInput type="number" min={0} max={100} value={stop.pos} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, pos: Number(event.target.value) } : item))} />
              <Button variant="danger" onClick={() => setStops((items) => items.filter((_, i) => i !== index))} disabled={stops.length <= 2}>Delete</Button>
            </div>
          ))}
          <Button variant="primary" onClick={() => setStops((items) => [...items, { color: "#ffffff", pos: 50 }])}>Add stop</Button>
        </Panel>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label>CSS</Label><CopyButton value={css} /></div><CodeBlock value={css} /></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {presets.map((preset, index) => {
            const bg = `linear-gradient(135deg, ${preset.map((stop) => `${stop.color} ${stop.pos}%`).join(", ")})`;
            return <button key={index} type="button" className="h-16 rounded-2xl border border-zinc-200 dark:border-zinc-800" style={{ background: bg }} onClick={() => setStops(preset)} />;
          })}
        </div>
      </div>
    </ToolShell>
  );
}
