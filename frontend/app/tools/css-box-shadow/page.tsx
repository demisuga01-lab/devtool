"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, Checkbox, CopyButton, ToolInput, Label, CodeBlock } from "@/components/tool-ui";

type Shadow = { x: number; y: number; blur: number; spread: number; color: string; inset: boolean };
const presets: Record<string, Shadow[]> = {
  none: [{ x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0)", inset: false }],
  sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: "rgba(0,0,0,0.12)", inset: false }],
  md: [{ x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0,0,0,0.15)", inset: false }],
  lg: [{ x: 0, y: 10, blur: 20, spread: 0, color: "rgba(0,0,0,0.18)", inset: false }],
  xl: [{ x: 0, y: 20, blur: 35, spread: -5, color: "rgba(0,0,0,0.22)", inset: false }],
  inner: [{ x: 0, y: 2, blur: 8, spread: 0, color: "rgba(0,0,0,0.20)", inset: true }],
};

function shadowCss(shadow: Shadow) {
  return `${shadow.inset ? "inset " : ""}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
}

export default function CssBoxShadowPage() {
  const [shadows, setShadows] = useState<Shadow[]>(presets.md);
  const cssValue = useMemo(() => shadows.map(shadowCss).join(", "), [shadows]);
  const css = `box-shadow: ${cssValue};`;

  const update = (index: number, next: Partial<Shadow>) => setShadows((items) => items.map((item, i) => i === index ? { ...item, ...next } : item));

  return (
    <ToolShell slug="css-box-shadow">
      <div className="space-y-5">
        <div className="rounded-2xl bg-zinc-100 p-12 dark:bg-zinc-950">
          <div className="mx-auto flex h-40 max-w-sm items-center justify-center rounded-2xl bg-white text-sm font-semibold text-zinc-600" style={{ boxShadow: cssValue }}>Preview card</div>
        </div>
        <div className="space-y-4">
          {shadows.map((shadow, index) => (
            <Panel noPadding key={index} className="p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Shadow {index + 1}</h2><Button variant="danger" onClick={() => setShadows((items) => items.filter((_, i) => i !== index))} disabled={shadows.length <= 1}>Remove</Button></div>
              {(["x", "y", "blur", "spread"] as const).map((key) => (
                <div key={key} className="mb-3"><Label>{key}: {shadow[key]}px</Label><ToolInput type="range" min={key === "blur" ? 0 : -50} max={key === "blur" ? 100 : 50} value={shadow[key]} onChange={(event) => update(index, { [key]: Number(event.target.value) })} /></div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2"><div><Label>Color</Label><ToolInput value={shadow.color} onChange={(event) => update(index, { color: event.target.value })} /></div><Checkbox checked={shadow.inset} onChange={(value) => update(index, { inset: value })} label="Inset" /></div>
            </Panel>
          ))}
        </div>
        <Button variant="primary" onClick={() => setShadows((items) => [...items, presets.sm[0]])}>Add shadow</Button>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label>CSS</Label><CopyButton value={css} /></div><CodeBlock value={css} /></div>
        <div className="flex flex-wrap gap-2">{Object.keys(presets).map((name) => <Button key={name} onClick={() => setShadows(presets[name])}>{name}</Button>)}</div>
      </div>
    </ToolShell>
  );
}
