"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Badge, Panel, ToolTextarea, Label, ResultCard } from "@/components/tool-ui";
import { analyzeText, formatDuration } from "@/lib/tool-insights";

const SAMPLE = `# Hello

This is **markdown**.

- one
- two
- three

\`\`\`js
console.log("hi");
\`\`\`
`;

export default function MarkdownPreviewPage() {
  const [text, setText] = useState(SAMPLE);

  const html = useMemo(() => {
    const raw = marked.parse(text, { async: false }) as string;
    if (typeof window === "undefined") return raw;
    return DOMPurify.sanitize(raw);
  }, [text]);
  const stats = useMemo(() => analyzeText(text), [text]);
  const headings = useMemo(() => Array.from(text.matchAll(/^(#{1,6})\s+(.+)$/gm)).map((match) => ({ level: match[1].length, text: match[2].trim() })), [text]);
  const relativeLinks = useMemo(() => Array.from(text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((match) => match[1]).filter((href) => !/^(https?:|mailto:|tel:|#)/i.test(href)), [text]);
  const missingAlt = useMemo(() => (text.match(/!\[\]\([^)]+\)/g) ?? []).length, [text]);

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "Markdown Preview" }]} title="Markdown Preview" description="Render Markdown to sanitized HTML." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label>Markdown</Label>
          <ToolTextarea value={text} onChange={(e) => setText(e.target.value)} rows={20} />
        </div>
        <div>
          <Label>Preview</Label>
          <Panel noPadding>
            <div
              className="markdown-preview p-4 text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Panel>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <ResultCard label="Words" value={String(stats.words)} />
          <ResultCard label="Read Time" value={stats.words ? formatDuration(stats.readingTimeSeconds) : "-"} />
          <ResultCard label="Headings" value={String(headings.length)} />
          <ResultCard label="Links" value={String((text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length)} />
        </div>
        <Panel noPadding className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {relativeLinks.length > 0 && <Badge variant="warning">{relativeLinks.length} relative links</Badge>}
            {missingAlt > 0 && <Badge variant="warning">{missingAlt} images missing alt</Badge>}
            {!relativeLinks.length && !missingAlt && <Badge variant="success">no common markdown warnings</Badge>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Outline</p>
              <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                {headings.length ? headings.map((heading, index) => <div key={`${heading.text}-${index}`} style={{ paddingLeft: (heading.level - 1) * 12 }}>{heading.text}</div>) : "No headings found."}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Link warnings</p>
              <div className="space-y-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {relativeLinks.length ? relativeLinks.slice(0, 10).map((href) => <div key={href}>{href}</div>) : "No relative links detected."}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}
