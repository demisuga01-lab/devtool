"use client";

import { useMemo, useState } from "react";
import { Label, Panel, ToolInput, ToolTextarea, ResultCard } from "@/components/tool-ui";
import { ToolShell } from "@/components/tool-ui";

function words(s: string) { return s.toLowerCase().match(/[a-z0-9]+/g) || []; }
function title(s: string) { return words(s).map((w) => w[0].toUpperCase() + w.slice(1)).join(" "); }
function sentence(s: string) { const t = s.trim().toLowerCase(); return t ? t[0].toUpperCase() + t.slice(1) : ""; }
function camel(s: string) { const w = words(s); return w.map((x, i) => i ? x[0].toUpperCase() + x.slice(1) : x).join(""); }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }

export default function StringUtilitiesPage() {
  const [input, setInput] = useState("");
  const [needle, setNeedle] = useState("");
  const items = useMemo(() => {
    const lines = input.split(/\r?\n/);
    const w = words(input);
    return [
      ["UPPERCASE", input.toUpperCase()], ["lowercase", input.toLowerCase()], ["Title Case", title(input)], ["Sentence case", sentence(input)], ["camelCase", camel(input)], ["PascalCase", title(input).replace(/\s+/g, "")], ["snake_case", w.join("_")], ["kebab-case", w.join("-")], ["SCREAMING_SNAKE_CASE", w.join("_").toUpperCase()], ["dot.case", w.join(".")],
      ["Reverse text", [...input].reverse().join("")], ["Reverse words", input.split(/\s+/).reverse().join(" ")], ["Remove extra spaces", input.replace(/\s+/g, " ").trim()], ["Remove line breaks", input.replace(/\r?\n/g, " ")], ["Trim each line", lines.map((l) => l.trim()).join("\n")], ["Remove duplicate lines", Array.from(new Set(lines)).join("\n")], ["Sort lines A-Z", [...lines].sort().join("\n")], ["Sort lines Z-A", [...lines].sort().reverse().join("\n")], ["Shuffle lines", shuffle(lines).join("\n")],
      ["Characters", String(input.length)], ["Words", String(w.length)], ["Lines", String(input ? lines.length : 0)], ["Unique words", String(new Set(w).size)],
    ];
  }, [input]);
  const occurrences = useMemo(() => {
    if (!needle) return 0;
    return input.toLowerCase().split(needle.toLowerCase()).length - 1;
  }, [input, needle]);
  return <ToolShell slug="string-utilities"><div className="space-y-5"><div><Label>Text</Label><ToolTextarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} /></div><Panel noPadding className="p-4"><Label>Count occurrences</Label><div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px] sm:items-center"><ToolInput value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Search text..." /><ResultCard label="Occurrences" value={String(occurrences)} /></div></Panel><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([label, value]) => <ResultCard key={label} label={label} value={value} mono copyable />)}</div></div></ToolShell>;
}
