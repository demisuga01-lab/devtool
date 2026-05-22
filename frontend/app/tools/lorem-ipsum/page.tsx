"use client";

import { useState } from "react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolInput, CopyButton, Label, TabBar, Checkbox, ToolTextarea } from "@/components/tool-ui";

const WORDS = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum").split(" ");

function pick(rand: () => number): string {
  return WORDS[Math.floor(rand() * WORDS.length)];
}

function sentence(rand: () => number, len = 8 + Math.floor(rand() * 8)): string {
  const words: string[] = [];
  for (let i = 0; i < len; i++) words.push(pick(rand));
  let s = words.join(" ");
  s = s[0].toUpperCase() + s.slice(1) + ".";
  return s;
}

function paragraph(rand: () => number, sentences = 4 + Math.floor(rand() * 3)): string {
  const out: string[] = [];
  for (let i = 0; i < sentences; i++) out.push(sentence(rand));
  return out.join(" ");
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Mode = "paragraphs" | "sentences" | "words" | "lists";

export default function LoremIpsumPage() {
  const [mode, setMode] = useState<Mode>("paragraphs");
  const [count, setCount] = useState(3);
  const [startStandard, setStartStandard] = useState(true);
  const [output, setOutput] = useState("");

  const generate = () => {
    const rand = mulberry32(Math.floor(Math.random() * 1e9));
    const safeCount = Math.min(Math.max(1, count), 50);
    let lines: string[] = [];
    if (mode === "paragraphs") {
      for (let i = 0; i < safeCount; i++) lines.push(paragraph(rand));
    } else if (mode === "sentences") {
      for (let i = 0; i < safeCount; i++) lines.push(sentence(rand));
    } else if (mode === "words") {
      const words: string[] = [];
      for (let i = 0; i < safeCount; i++) words.push(pick(rand));
      lines = [words.join(" ")];
    } else {
      for (let i = 0; i < safeCount; i++) lines.push(`- ${sentence(rand, 4 + Math.floor(rand() * 4))}`);
    }
    if (startStandard && lines.length > 0) {
      const first = lines[0];
      const standard = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      lines[0] = first.toLowerCase().startsWith("lorem ipsum") ? first : `${standard} ${first}`;
    }
    setOutput(lines.join(mode === "paragraphs" ? "\n\n" : "\n"));
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Lorem Ipsum" }]} title="Lorem Ipsum" description="Generate placeholder Lorem Ipsum text." />
      <div className="space-y-5">
        <TabBar
          active={mode}
          onChange={(v) => setMode(v as Mode)}
          tabs={[
            { label: "Paragraphs", value: "paragraphs" },
            { label: "Sentences", value: "sentences" },
            { label: "Words", value: "words" },
            { label: "Lists", value: "lists" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <Label>Count</Label>
            <ToolInput
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
              className="w-24"
            />
          </div>
          <Checkbox checked={startStandard} onChange={setStartStandard} label='Start with "Lorem ipsum..."' />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={generate}>Generate</Button>
          <Button variant="ghost" onClick={() => setOutput("")}>Clear</Button>
        </div>
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <CopyButton value={output} />
            </div>
            <ToolTextarea value={output} readOnly rows={12} />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
