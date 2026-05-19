"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Textarea, Label } from "@/components/ui";

function fmtSeconds(s: number): string {
  if (s < 60) return `${Math.max(1, Math.round(s))}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s+/g, "").length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text === "" ? 0 : text.split(/\n/).length;
    const sentences = (text.match(/[.!?]+/g) || []).length;
    const paragraphs = text.trim() ? text.split(/\n{2,}/).filter((p) => p.trim()).length : 0;
    const reading = (words / 230) * 60;
    const speaking = (words / 150) * 60;
    return { chars, charsNoSpaces, words, lines, sentences, paragraphs, reading, speaking };
  }, [text]);

  const items = [
    { label: "Characters", value: stats.chars },
    { label: "Characters (no spaces)", value: stats.charsNoSpaces },
    { label: "Words", value: stats.words },
    { label: "Lines", value: stats.lines },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading time", value: stats.words ? fmtSeconds(stats.reading) : "—" },
    { label: "Speaking time", value: stats.words ? fmtSeconds(stats.speaking) : "—" },
  ];

  return (
    <ToolShell slug="word-counter">
      <div className="space-y-5">
        <div>
          <Label>Text</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((it) => (
            <div key={it.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{it.label}</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{it.value}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
