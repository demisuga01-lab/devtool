"use client";

import { useMemo, useState } from "react";
import { Badge, Label, Panel, ResultCard, ToolHeader, ToolShell, ToolTextarea } from "@/components/tool-ui";
import { analyzeText, formatDuration } from "@/lib/tool-insights";

export default function WordCounterPage() {
  const [text, setText] = useState("");
  const stats = useMemo(() => analyzeText(text), [text]);

  const items = [
    { label: "Characters", value: stats.characters },
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
    { label: "Words", value: stats.words },
    { label: "Lines", value: stats.lines },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading time", value: stats.words ? formatDuration(stats.readingTimeSeconds) : "-" },
    { label: "Speaking time", value: stats.words ? formatDuration(stats.speakingTimeSeconds) : "-" },
  ];

  return (
    <ToolShell>
      <ToolHeader
        breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Word Counter" }]}
        title="Word Counter"
        description="Count words, structure, vocabulary, and estimated reading/speaking time."
      />
      <div className="space-y-5">
        <div>
          <Label>Text</Label>
          <ToolTextarea value={text} onChange={(event) => setText(event.target.value)} rows={14} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <Panel noPadding key={item.label} className="p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.value}</div>
            </Panel>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ResultCard label="Unique Words" value={String(stats.uniqueWords)} />
          <ResultCard label="Avg Word Length" value={stats.averageWordLength ? stats.averageWordLength.toFixed(1) : "-"} />
          <ResultCard label="Lexical Density" value={stats.words ? `${((stats.uniqueWords / stats.words) * 100).toFixed(0)}% unique` : "-"} />
        </div>
        <Panel noPadding className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Writing profile</h2>
            {stats.words > 0 && <Badge variant="info">{stats.words < 300 ? "short form" : stats.words < 1200 ? "article length" : "long form"}</Badge>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Most frequent words</p>
              <div className="flex flex-wrap gap-2">
                {stats.topWords.length ? stats.topWords.map((item) => <Badge key={item.word}>{item.word} x{item.count}</Badge>) : <span className="text-sm text-zinc-500">Add text to see word frequency.</span>}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Reading time assumes about 230 words per minute. Speaking time assumes about 150 words per minute, closer to a presentation pace.
            </p>
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}
