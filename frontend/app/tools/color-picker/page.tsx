"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { CopyButton, Label } from "@/components/ui";

const names: Record<string, string> = { "#000000": "black", "#ffffff": "white", "#ff0000": "red", "#0000ff": "blue", "#008000": "green", "#ffff00": "yellow", "#ffa500": "orange", "#800080": "purple", "#808080": "gray", "#ffc0cb": "pink" };

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function rgbToCmyk(r: number, g: number, b: number) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: Math.round(((1 - r / 255 - k) / (1 - k)) * 100), m: Math.round(((1 - g / 255 - k) / (1 - k)) * 100), y: Math.round(((1 - b / 255 - k) / (1 - k)) * 100), k: Math.round(k * 100) };
}
function contrast({ r, g, b }: { r: number; g: number; b: number }, text: "black" | "white") {
  const lum = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const l1 = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  const l2 = text === "black" ? 0 : 1;
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export default function ColorPickerPage() {
  const [color, setColor] = useState("#ff5733");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(JSON.parse(localStorage.getItem("devtools-recent-colors") || "[]") as string[]);
  }, []);
  useEffect(() => {
    const next = [color, ...recent.filter((item) => item !== color)].slice(0, 10);
    localStorage.setItem("devtools-recent-colors", JSON.stringify(next));
  }, [color, recent]);

  const data = useMemo(() => {
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    return [
      ["HEX", color.toUpperCase()],
      ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
      ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
      ["CMYK", `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`],
      ["CSS name", names[color.toLowerCase()] || "-"],
    ];
  }, [color]);
  const rgb = hexToRgb(color);
  const black = contrast(rgb, "black");
  const white = contrast(rgb, "white");

  return (
    <ToolShell slug="color-picker">
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Label>Pick color</Label>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-32 w-full cursor-pointer rounded-xl" />
          </div>
          <div className="min-h-32 rounded-2xl border border-zinc-200 p-6 shadow-sm dark:border-zinc-800" style={{ backgroundColor: color }}>
            <p className="text-3xl font-bold" style={{ color: black >= white ? "#000" : "#fff" }}>{color.toUpperCase()}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {data.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr_auto] items-center gap-3 border-b border-zinc-100 px-4 py-3 text-sm last:border-0 dark:border-zinc-800">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{value}</span>
              <CopyButton value={value === "-" ? "" : value} />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[["Black text", black], ["White text", white]].map(([label, ratio]) => (
            <div key={label as string} className="rounded-2xl border border-zinc-200 p-4 shadow-sm dark:border-zinc-800" style={{ backgroundColor: color, color: label === "Black text" ? "#000" : "#fff" }}>
              <p className="text-xl font-semibold">{label}</p>
              <p>Contrast {(ratio as number).toFixed(2)}:1 - {(ratio as number) >= 7 ? "AAA" : (ratio as number) >= 4.5 ? "AA" : "Fail"}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {recent.map((item) => <button key={item} type="button" aria-label={item} onClick={() => setColor(item)} className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800" style={{ backgroundColor: item }} />)}
        </div>
      </div>
    </ToolShell>
  );
}
