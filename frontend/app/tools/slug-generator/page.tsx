"use client";

import { useMemo, useState } from "react";
import { Badge, Checkbox, CodeBlock, CopyButton, Label, Panel, ResultCard, TabBar, ToolInput, ToolShell } from "@/components/tool-ui";

const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "but", "by", "for", "from", "in", "is",
  "it", "of", "on", "or", "the", "to", "with", "this", "that", "these", "those",
]);

function words(text: string): string[] {
  return Array.from(text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").matchAll(/[A-Za-z0-9]+/g), (match) => match[0]);
}

function slugify(text: string, opts: { sep: string; lower: boolean; removeStop: boolean; maxLen?: number }): string {
  let tokens = words(text);
  if (opts.lower) tokens = tokens.map((token) => token.toLowerCase());
  if (opts.removeStop) tokens = tokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
  let result = tokens.join(opts.sep);
  if (opts.maxLen && opts.maxLen > 0) {
    result = result.slice(0, opts.maxLen).replace(new RegExp(`${opts.sep === "_" ? "_" : "-"}+$`), "");
  }
  return result;
}

function camelCase(text: string, pascal = false) {
  return words(text)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0 && !pascal) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
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

  const variants = useMemo(() => {
    const baseWords = words(text);
    return [
      ["lowercase-hyphen", slugify(text, { sep: "-", lower: true, removeStop })],
      ["snake_case", slugify(text, { sep: "_", lower: true, removeStop })],
      ["camelCase", camelCase(text)],
      ["PascalCase", camelCase(text, true)],
      ["SCREAMING_SNAKE", baseWords.join("_").toUpperCase()],
    ] as const;
  }, [text, removeStop]);

  return (
    <ToolShell slug="slug-generator">
      <div className="space-y-5">
        <div>
          <Label>Title or phrase</Label>
          <ToolInput value={text} onChange={(event) => setText(event.target.value)} placeholder="My great blog post" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <TabBar
            active={sep}
            onChange={setSep}
            tabs={[{ label: "Hyphen", value: "-" }, { label: "Underscore", value: "_" }]}
          />
          <Checkbox checked={lower} onChange={setLower} label="Lowercase" />
          <Checkbox checked={removeStop} onChange={setRemoveStop} label="Remove stop words" />
          <div>
            <Label>Max length</Label>
            <ToolInput
              type="number"
              min={1}
              value={maxLen}
              onChange={(event) => setMaxLen(event.target.value === "" ? "" : parseInt(event.target.value, 10))}
              className="w-24"
              placeholder="-"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Slug</Label>
            {slug && <CopyButton value={slug} />}
          </div>
          <CodeBlock value={slug || "-"} />
        </div>
        {text && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <ResultCard label="Length" value={String(slug.length)} />
              <ResultCard label="URL Safe" value={/^[a-z0-9_-]*$/i.test(slug) ? "Yes" : "No"} />
              <ResultCard label="Words" value={String(words(text).length)} />
            </div>
            <Panel noPadding className="overflow-hidden">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Slug variants</h2>
                  <Badge variant="success">URL-ready</Badge>
                  {slug.length > 80 && <Badge variant="warning">long slug</Badge>}
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {variants.map(([label, value]) => (
                  <div key={label} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[160px_1fr_auto] sm:items-center">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
                    <code className="break-all font-mono text-zinc-900 dark:text-zinc-100">{value || "-"}</code>
                    <CopyButton value={value} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
