"use client";

import { useMemo, useState } from "react";
import { CopyButton, Input, Label } from "@/components/ui";
import { ToolShell } from "@/components/ToolShell";
import { AutoFixBanner, ERROR_MESSAGES, InlineError, isValidUrl, normalizeUrl } from "@/lib/toolErrors";

export default function UrlParserPage() {
  const [input, setInput] = useState("https://devtools.wellfriend.online/tools/url-parser?foo=bar&baz=qux#section");
  const [fixApplied, setFixApplied] = useState<{ fix: string; original: string; corrected: string } | null>(null);

  const normalized = useMemo(() => normalizeUrl(input), [input]);
  const parsed = useMemo(() => {
    if (!input.trim()) return { url: null as URL | null, error: null };
    if (!isValidUrl(normalized.url)) return { url: null, error: ERROR_MESSAGES.invalid_url };
    return { url: new URL(normalized.url), error: null };
  }, [input, normalized.url]);

  const applyNormalized = () => {
    if (!input.trim()) {
      setFixApplied(null);
      return;
    }
    const next = normalizeUrl(input);
    if (next.wasFixed && next.fixDescription) {
      setInput(next.url);
      setFixApplied({ fix: next.fixDescription, original: input, corrected: next.url });
    } else {
      setFixApplied(null);
    }
  };

  const rows = parsed.url
    ? [
        ["Protocol", parsed.url.protocol.replace(":", "")],
        ["Host", parsed.url.host],
        ["Pathname", parsed.url.pathname],
        ["Port", parsed.url.port],
        ["Search", parsed.url.search],
        ["Hash", parsed.url.hash],
        ["Origin", parsed.url.origin],
      ]
    : [];

  return (
    <ToolShell slug="url-parser">
      <div className="space-y-5">
        <div>
          <Label>URL</Label>
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) setFixApplied(null);
            }}
            onBlur={applyNormalized}
            onKeyDown={(e) => e.key === "Enter" && applyNormalized()}
            placeholder="https://example.com/path?query=value"
          />
          {fixApplied && <AutoFixBanner fix={fixApplied.fix} original={fixApplied.original} corrected={fixApplied.corrected} />}
          {parsed.error && (
            <InlineError
              error={{
                title: "Cannot parse URL",
                detail: "The input is not a valid URL.",
                suggestion: "A valid URL looks like: https://example.com/path?query=value",
              }}
            />
          )}
        </div>

        {parsed.url && (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {rows.map(([k, v]) => (
                <div key={k} className="flex border-b border-zinc-100 px-4 py-2 last:border-b-0 dark:border-zinc-800">
                  <div className="w-32 text-xs uppercase text-zinc-500">{k}</div>
                  <div className="flex-1 break-all font-mono text-xs">{v || "(empty)"}</div>
                </div>
              ))}
            </div>
            <div>
              <Label>Query Parameters</Label>
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {Array.from(parsed.url.searchParams.entries()).length === 0 ? (
                  <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">No query parameters.</div>
                ) : (
                  Array.from(parsed.url.searchParams.entries()).map(([k, v]) => (
                    <div key={`${k}-${v}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-zinc-100 px-4 py-2 text-sm last:border-b-0 dark:border-zinc-800">
                      <code>{k}</code>
                      <code>{v}</code>
                      <CopyButton value={v} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}
