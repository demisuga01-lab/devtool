"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Panel, ToolTextarea, Label } from "@/components/tool-ui";

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
    </ToolShell>
  );
}
