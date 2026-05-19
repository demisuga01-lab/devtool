"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Input, CopyButton, Label, Toggle, Checkbox } from "@/components/ui";

const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "but", "by", "for", "from", "in", "is",
  "it", "of", "on", "or", "the", "to", "with", "this", "that", "these", "those",
]);

function slugify(text: string, opts: { sep: string; lower: boolean; removeStop: boolean; maxLen?: number }): string {
  let s = text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  if (opts.lower) s = s.toLowerCase();
  s = s.replace(/[^A-Za-z0-9\s-]/g, "");
  let tokens = s.split(/\s+/).filter(Boolean);
  if (opts.removeStop) {
    tokens = tokens.filter((t) => !STOP_WORDS.has(t.toLowerCase()));
  }
  let result = tokens.join(opts.sep);
  result = result.replace(new RegExp(`${opts.sep === "_" ? "_" : "-"}+`, "g"), opts.sep);
  result = result.replace(new RegExp(`^${opts.sep === "_" ? "_" : "-"}+|${opts.sep === "_" ? "_" : "-"}+$`, "g"), "");
  if (opts.maxLen && opts.maxLen > 0) {
    result = result.slice(0, opts.maxLen).replace(new RegExp(`${opts.sep === "_" ? "_" : "-"}+$`), "");
  }
  return result;
}

export default function SlugGeneratorPage() {
  const [text, setText] = useState("");
  const [sep, setSep] = useState("-");
  const [lower, setLower] = useState(true);
  const [removeStop, setRemoveStop] = useState(false);
  const [maxLen, setMaxLen] = useState<number | "">("");

  const slug = useMemo(
    () =>
      slugify(text, {
        sep,
        lower,
        removeStop,
        maxLen: typeof maxLen === "number" ? maxLen : undefined,
      }),
    [text, sep, lower, removeStop, maxLen],
  );

  return (
    <ToolShell slug="slug-generator">
      <div className="space-y-5">
        <div>
          <Label>Title or phrase</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="My great blog post" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            value={sep}
            onChange={setSep}
            options={[{ label: "Hyphen", value: "-" }, { label: "Underscore", value: "_" }]}
          />
          <Checkbox checked={lower} onChange={setLower} label="Lowercase" />
          <Checkbox checked={removeStop} onChange={setRemoveStop} label="Remove stop words" />
          <div>
            <Label>Max length</Label>
            <Input
              type="number"
              min={1}
              value={maxLen}
              onChange={(e) => setMaxLen(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              className="w-24"
              placeholder="—"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Slug</Label>
            {slug && <CopyButton value={slug} />}
          </div>
          <div className="break-all rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
            {slug || <span className="text-zinc-400">—</span>}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
