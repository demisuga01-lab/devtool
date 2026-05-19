"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ToolShell } from "@/components/ToolShell";
import { Textarea, Label } from "@/components/ui";

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

  return (
    <ToolShell slug="markdown-preview">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label>Markdown</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} />
        </div>
        <div>
          <Label>Preview</Label>
          <div
            className="markdown-preview rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </ToolShell>
  );
}
