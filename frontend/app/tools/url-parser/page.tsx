"use client";

import { useMemo, useState } from "react";
import { CopyButton, ErrorCard, Input, Label } from "@/components/ui";
import { ToolShell } from "@/components/ToolShell";

export default function UrlParserPage() {
  const [input, setInput] = useState("https://devtools.wellfriend.online/tools/url-parser?foo=bar&baz=qux#section");
  const parsed = useMemo(() => { try { const url = new URL(input); return { url, error: "" }; } catch { return { url: null, error: "Invalid URL" }; } }, [input]);
  const rows = parsed.url ? [["Protocol", parsed.url.protocol.replace(":", "")], ["Host", parsed.url.host], ["Pathname", parsed.url.pathname], ["Port", parsed.url.port], ["Search", parsed.url.search], ["Hash", parsed.url.hash], ["Origin", parsed.url.origin]] : [];
  return <ToolShell slug="url-parser"><div className="space-y-5"><div><Label>URL</Label><Input value={input} onChange={(e) => setInput(e.target.value)} /></div>{parsed.error && <ErrorCard>{parsed.error}</ErrorCard>}{parsed.url && <><div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">{rows.map(([k, v]) => <div key={k} className="flex border-b border-zinc-100 px-4 py-2 last:border-b-0 dark:border-zinc-800"><div className="w-32 text-xs uppercase text-zinc-500">{k}</div><div className="flex-1 break-all font-mono text-xs">{v || "(empty)"}</div></div>)}</div><div><Label>Query Parameters</Label><div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">{Array.from(parsed.url.searchParams.entries()).map(([k, v]) => <div key={`${k}-${v}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-zinc-100 px-4 py-2 text-sm last:border-b-0 dark:border-zinc-800"><code>{k}</code><code>{v}</code><CopyButton value={v} /></div>)}</div></div></>}</div></ToolShell>;
}
