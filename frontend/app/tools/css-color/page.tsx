"use client";

import { useEffect, useMemo, useState } from "react";
import { css as beautifyCss } from "js-beautify";
import { AlignLeft, ArrowLeftRight, Code2, Eye, Layers, Palette, Pipette, Square } from "lucide-react";
import { Badge, CodeBlock, CopyButton, ErrorCard, ResultCard } from "@/components/tool-ui";
import { analyzeCss } from "@/lib/tool-insights";
import { NewToolPage } from "../_components/new-tool-pages";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "picker" | "converter" | "contrast" | "gradient" | "shadow" | "clamp" | "formatter";
type Stop = { color: string; pos: number };
type Shadow = { x: number; y: number; blur: number; spread: number; color: string; inset: boolean };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "picker", label: "Color Picker", icon: Pipette },
  { id: "converter", label: "Converter", icon: ArrowLeftRight },
  { id: "contrast", label: "Contrast", icon: Eye },
  { id: "gradient", label: "Gradient", icon: Layers },
  { id: "shadow", label: "Box Shadow", icon: Square },
  { id: "clamp", label: "Clamp", icon: Code2 },
  { id: "formatter", label: "Formatter", icon: AlignLeft },
];

const namedColors: Record<string, string> = {
  "#000000": "black",
  "#ffffff": "white",
  "#ff0000": "red",
  "#0000ff": "blue",
  "#008000": "green",
  "#ffff00": "yellow",
  "#ffa500": "orange",
  "#800080": "purple",
  "#808080": "gray",
  "#ffc0cb": "pink",
};

const gradientPresets: Stop[][] = [
  [{ color: "#667eea", pos: 0 }, { color: "#764ba2", pos: 100 }],
  [{ color: "#11998e", pos: 0 }, { color: "#38ef7d", pos: 100 }],
  [{ color: "#fc466b", pos: 0 }, { color: "#3f5efb", pos: 100 }],
  [{ color: "#f7971e", pos: 0 }, { color: "#ffd200", pos: 100 }],
];

const shadowPresets: Record<string, Shadow[]> = {
  sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: "rgba(0,0,0,0.12)", inset: false }],
  md: [{ x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0,0,0,0.15)", inset: false }],
  lg: [{ x: 0, y: 10, blur: 20, spread: 0, color: "rgba(0,0,0,0.18)", inset: false }],
  inner: [{ x: 0, y: 2, blur: 8, spread: 0, color: "rgba(0,0,0,0.20)", inset: true }],
};

export default function CssColorWorkspacePage() {
  const [active, setActive] = useState<Tab>("picker");

  return (
    <WorkspaceShell
      title="CSS & Color Tools"
      subtitle="Pick colors, generate gradients, check contrast, and format CSS"
      href="/tools/css-color"
      icon={Palette}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="css-color"
      intentGroup="generate"
    >
      {active === "picker" && <ColorPickerTab />}
      {active === "converter" && <NewToolPage slug="hex-rgb-hsl-converter" embedded />}
      {active === "contrast" && <NewToolPage slug="contrast-checker" embedded />}
      {active === "gradient" && <GradientTab />}
      {active === "shadow" && <BoxShadowTab />}
      {active === "clamp" && <NewToolPage slug="css-clamp-calculator" embedded />}
      {active === "formatter" && <CssFormatterTab />}
    </WorkspaceShell>
  );
}

function ColorPickerTab() {
  const [color, setColor] = useState("#10b981");
  const [recent, setRecent] = useState<string[]>([]);
  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const formats = [
    ["HEX", color.toUpperCase()],
    ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
    ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
    ["HSV", rgbToHsv(rgb.r, rgb.g, rgb.b)],
    ["CMYK", `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`],
    ["CSS name", namedColors[color.toLowerCase()] ?? "-"],
  ];

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("devtools-recent-colors") || "[]") as string[];
    setRecent(saved);
  }, []);

  useEffect(() => {
    const next = [color, ...recent.filter((item) => item !== color)].slice(0, 10);
    localStorage.setItem("devtools-recent-colors", JSON.stringify(next));
  }, [color, recent]);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <WorkspaceCard>
          <FieldLabel>Pick color</FieldLabel>
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className={`${inputClass} h-32 cursor-pointer p-1`} />
        </WorkspaceCard>
        <div className="flex min-h-40 items-end rounded-lg border border-border p-5 shadow-sm" style={{ backgroundColor: color }}>
          <span className="rounded-md bg-white/80 px-3 py-1 font-mono text-sm text-zinc-950">{color.toUpperCase()}</span>
        </div>
      </div>
      <WorkspaceCard className="overflow-hidden p-0">
        {formats.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <code className="break-all font-mono text-foreground">{value}</code>
            <CopyButton value={value === "-" ? "" : value} />
          </div>
        ))}
      </WorkspaceCard>
      <div className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <button key={item} type="button" aria-label={item} onClick={() => setColor(item)} className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: item }} />
        ))}
      </div>
    </div>
  );
}

function GradientTab() {
  const [type, setType] = useState("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>(gradientPresets[0]);
  const body = stops.map((stop) => `${stop.color} ${stop.pos}%`).join(", ");
  const gradient = type === "linear" ? `linear-gradient(${angle}deg, ${body})` : type === "conic" ? `conic-gradient(${body})` : `radial-gradient(circle, ${body})`;
  const css = `background: ${gradient};`;

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel>Type</FieldLabel>
          <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
            <option value="linear">linear</option>
            <option value="radial">radial</option>
            <option value="conic">conic</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Angle {angle}deg</FieldLabel>
          <input type="range" min={0} max={360} value={angle} onChange={(event) => setAngle(Number(event.target.value))} className={inputClass} />
        </div>
      </WorkspaceCard>
      <div className="min-h-[160px] rounded-lg border border-border shadow-sm" style={{ background: gradient }} />
      <WorkspaceCard className="space-y-3">
        {stops.map((stop, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[120px_1fr_90px_auto]">
            <input type="color" value={stop.color} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, color: event.target.value } : item))} className={inputClass} />
            <input type="range" min={0} max={100} value={stop.pos} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, pos: Number(event.target.value) } : item))} className={inputClass} />
            <input type="number" min={0} max={100} value={stop.pos} onChange={(event) => setStops((items) => items.map((item, i) => i === index ? { ...item, pos: Number(event.target.value) } : item))} className={inputClass} />
            <SecondaryButton onClick={() => setStops((items) => items.filter((_, i) => i !== index))} disabled={stops.length <= 2}>Remove</SecondaryButton>
          </div>
        ))}
        <PrimaryButton onClick={() => setStops((items) => [...items, { color: "#ffffff", pos: 50 }])}>Add stop</PrimaryButton>
      </WorkspaceCard>
      <FormatOutput label="CSS gradient" value={css} />
    </div>
  );
}

function BoxShadowTab() {
  const [shadows, setShadows] = useState<Shadow[]>(shadowPresets.md);
  const value = shadows.map((shadow) => `${shadow.inset ? "inset " : ""}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(", ");
  const css = `box-shadow: ${value};`;
  const update = (index: number, next: Partial<Shadow>) => setShadows((items) => items.map((item, i) => i === index ? { ...item, ...next } : item));

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-zinc-100 p-12 dark:bg-zinc-950">
        <div className="mx-auto flex h-40 max-w-sm items-center justify-center rounded-lg bg-white text-sm font-semibold text-zinc-700" style={{ boxShadow: value }}>Preview</div>
      </div>
      {shadows.map((shadow, index) => (
        <WorkspaceCard key={index} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Shadow {index + 1}</h2>
            <SecondaryButton onClick={() => setShadows((items) => items.filter((_, i) => i !== index))} disabled={shadows.length <= 1}>Remove</SecondaryButton>
          </div>
          {(["x", "y", "blur", "spread"] as const).map((key) => (
            <div key={key}>
              <FieldLabel>{key} {shadow[key]}px</FieldLabel>
              <input type="range" min={key === "blur" ? 0 : -50} max={key === "blur" ? 100 : 50} value={shadow[key]} onChange={(event) => update(index, { [key]: Number(event.target.value) })} className={inputClass} />
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><FieldLabel>Color</FieldLabel><input value={shadow.color} onChange={(event) => update(index, { color: event.target.value })} className={inputClass} /></div>
            <label className="flex items-end gap-2 text-sm text-foreground"><input type="checkbox" checked={shadow.inset} onChange={(event) => update(index, { inset: event.target.checked })} /> Inset</label>
          </div>
        </WorkspaceCard>
      ))}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => setShadows((items) => [...items, shadowPresets.sm[0]])}>Add shadow</PrimaryButton>
        {Object.entries(shadowPresets).map(([name, preset]) => <SecondaryButton key={name} onClick={() => setShadows(preset)}>{name}</SecondaryButton>)}
      </div>
      <FormatOutput label="CSS box-shadow" value={css} />
    </div>
  );
}

function CssFormatterTab() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState("2");
  const insight = input ? analyzeCss(input) : null;

  function format() {
    try {
      setError("");
      setOutput(beautifyCss(input, { indent_size: Number(indent) || 2 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Format failed.");
      setOutput("");
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 md:grid-cols-[180px_auto]">
        <div>
          <FieldLabel>Indent size</FieldLabel>
          <select value={indent} onChange={(event) => setIndent(event.target.value)} className={inputClass}><option>2</option><option>4</option></select>
        </div>
        <div className="flex items-end gap-2">
          <PrimaryButton onClick={format} disabled={!input}>Format</PrimaryButton>
          <SecondaryButton onClick={() => { setInput(""); setOutput(""); setError(""); }}>Clear</SecondaryButton>
        </div>
      </WorkspaceCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>CSS input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={16} className={textareaClass} /></div>
        <div><FieldLabel>Formatted CSS</FieldLabel><textarea value={output} readOnly rows={16} className={textareaClass} /></div>
      </div>
      {error && <ErrorCard>{error}</ErrorCard>}
      {insight && (
        <div className="grid gap-3 md:grid-cols-4">
          <ResultCard label="Rules" value={String(insight.ruleCount)} />
          <ResultCard label="Selectors" value={String(insight.selectorCount)} />
          <ResultCard label="Properties" value={String(insight.propertyCount)} />
          <ResultCard label="Media queries" value={String(insight.mediaQueryCount)} />
        </div>
      )}
    </div>
  );
}

function FormatOutput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <CopyButton value={value} />
      </div>
      <CodeBlock value={value} />
    </div>
  );
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "").padEnd(6, "0");
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const hsl = rgbToHsl(r, g, b);
  const s = max === 0 ? 0 : d / max;
  return `hsv(${hsl.h}, ${Math.round(s * 100)}%, ${Math.round((max / 255) * 100)}%)`;
}

function rgbToCmyk(r: number, g: number, b: number) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: Math.round(((1 - r / 255 - k) / (1 - k)) * 100), m: Math.round(((1 - g / 255 - k) / (1 - k)) * 100), y: Math.round(((1 - b / 255 - k) / (1 - k)) * 100), k: Math.round(k * 100) };
}
