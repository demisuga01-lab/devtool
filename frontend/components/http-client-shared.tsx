"use client";

import { useMemo, useState } from "react";
import hljs from "highlight.js";
import { Check, Copy, Download, Eye, History, Plus, Trash2, X } from "lucide-react";
import { Button, Input } from "@/components/ui";

export type KeyValueRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type HttpHeader = {
  key: string;
  value: string;
};

export type HttpProxyResponse = {
  status_code: number;
  status_text: string;
  headers: HttpHeader[];
  body: string;
  body_is_base64?: boolean;
  content_type?: string;
  body_size_bytes: number;
  response_time_ms: number;
  redirect_chain: { url: string; status_code: number }[];
  final_url?: string;
  data?: unknown;
  errors?: unknown[];
  extensions?: unknown;
};

export type HistoryEntry = {
  id: string;
  method: string;
  url: string;
  status?: number;
  timeMs?: number;
  savedAt: number;
  payload: unknown;
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  POST: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-300",
  PATCH: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  HEAD: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  OPTIONS: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] ?? char));
}

function prettyXml(value: string) {
  return value.replace(/>\s*</g, ">\n<").split("\n").map((line, index, lines) => {
    const closing = /^<\//.test(line);
    const opening = /^<[^!?/][^>]*[^/]?>$/.test(line);
    const depth = Math.max(0, lines.slice(0, index).reduce((level, previous) => {
      if (/^<\//.test(previous)) return level - 1;
      if (/^<[^!?/][^>]*[^/]?>$/.test(previous)) return level + 1;
      return level;
    }, 0) - (closing ? 1 : 0));
    return `${"  ".repeat(depth)}${line}${opening ? "" : ""}`;
  }).join("\n");
}

export function createRow(key = "", value = "", enabled = true): KeyValueRow {
  return { id: crypto.randomUUID(), key, value, enabled };
}

export function enabledPairs(rows: KeyValueRow[]) {
  return rows.filter((row) => row.enabled && row.key.trim()).map((row) => ({ key: row.key.trim(), value: row.value, enabled: row.enabled }));
}

export function rowsFromPairs(rows: { key: string; value: string; enabled?: boolean }[] = []) {
  return rows.length ? rows.map((row) => createRow(row.key, row.value, row.enabled !== false)) : [createRow()];
}

export function MethodBadge({ method }: { method: string }) {
  const upper = method.toUpperCase();
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${methodColors[upper] ?? methodColors.GET}`}>
      {upper}
    </span>
  );
}

export function StatusBadge({ status }: { status?: number }) {
  if (!status) return <span className="rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-500">No response</span>;
  const color =
    status >= 500 ? "bg-red-500/10 text-red-700 dark:text-red-300" :
    status >= 400 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" :
    status >= 300 ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" :
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>{status}</span>;
}

export function KeyValueTable({
  rows,
  onChange,
  suggestions = [],
  valuePlaceholder = "Value",
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  suggestions?: string[];
  valuePlaceholder?: string;
}) {
  function update(id: string, patch: Partial<KeyValueRow>) {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }
  function remove(id: string) {
    const next = rows.filter((row) => row.id !== id);
    onChange(next.length ? next : [createRow()]);
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => update(row.id, { enabled: event.target.checked })}
            className="h-4 w-4 rounded accent-emerald-500"
            aria-label="Enable row"
          />
          <Input
            value={row.key}
            onChange={(event) => update(row.id, { key: event.target.value })}
            placeholder="Key"
            list={suggestions.length ? "http-client-header-suggestions" : undefined}
          />
          <Input value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} placeholder={valuePlaceholder} />
          <button type="button" onClick={() => remove(row.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800" aria-label="Delete row">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {suggestions.length > 0 && (
        <datalist id="http-client-header-suggestions">
          {suggestions.map((item) => <option key={item} value={item} />)}
        </datalist>
      )}
      <Button type="button" onClick={() => onChange([...rows, createRow()])}>
        <Plus className="h-4 w-4" />
        Add row
      </Button>
    </div>
  );
}

export function ResponseBody({ response }: { response: HttpProxyResponse }) {
  const [previewHtml, setPreviewHtml] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentType = response.content_type || response.headers.find((header) => header.key.toLowerCase() === "content-type")?.value || "";
  const decodedUrl = response.body_is_base64 ? `data:${contentType || "application/octet-stream"};base64,${response.body}` : "";
  const bodyText = response.body_is_base64 ? "" : response.body;
  const isJson = contentType.includes("json") || /^[\s\n\r]*[{\[]/.test(bodyText);
  const isXml = contentType.includes("xml") || /^[\s\n\r]*</.test(bodyText);
  const isHtml = contentType.includes("html");
  const isImage = contentType.startsWith("image/");

  const display = useMemo(() => {
    if (response.body_is_base64) return response.body;
    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(bodyText), null, 2);
      } catch {
        return bodyText;
      }
    }
    if (isXml) return prettyXml(bodyText);
    return bodyText;
  }, [bodyText, isJson, isXml, response.body, response.body_is_base64]);

  const highlighted = useMemo(() => {
    try {
      const lang = isJson ? "json" : isXml || isHtml ? "xml" : "plaintext";
      return lang === "plaintext" ? escapeHtml(display) : hljs.highlight(display, { language: lang, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(display);
    }
  }, [display, isHtml, isJson, isXml]);

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard failures
    }
  }

  function downloadBody() {
    const bytes = response.body_is_base64 ? Uint8Array.from(atob(response.body), (char) => char.charCodeAt(0)) : new TextEncoder().encode(response.body);
    const blob = new Blob([bytes], { type: contentType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "response";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        {isHtml && !response.body_is_base64 && (
          <Button type="button" onClick={() => setPreviewHtml((value) => !value)}>
            <Eye className="h-4 w-4" />
            {previewHtml ? "Raw HTML" : "Preview in iframe"}
          </Button>
        )}
        <Button type="button" onClick={copyBody}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</Button>
        <Button type="button" onClick={downloadBody}><Download className="h-4 w-4" />Download</Button>
      </div>
      {isImage && response.body_is_base64 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <img src={decodedUrl} alt="Response body" className="max-h-[520px] max-w-full rounded-lg object-contain" />
        </div>
      ) : previewHtml ? (
        <iframe title="HTML response preview" srcDoc={bodyText} className="h-[520px] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800" />
      ) : (
        <pre className="max-h-[620px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-xs leading-6 text-zinc-100 dark:border-zinc-800">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      )}
    </div>
  );
}

export function HistoryPanel({
  entries,
  onRestore,
  onClear,
}: {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(entries.length > 0);
  if (!entries.length) return null;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        <span className="inline-flex items-center gap-2"><History className="h-4 w-4" />History</span>
        <span className="text-xs text-zinc-500">{entries.length} saved</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {entries.map((entry) => (
              <button key={entry.id} type="button" onClick={() => onRestore(entry)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <MethodBadge method={entry.method} />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">{entry.url}</span>
                <StatusBadge status={entry.status} />
                {typeof entry.timeMs === "number" && <span className="text-xs text-zinc-400">{entry.timeMs}ms</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClear} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
            <X className="h-3.5 w-3.5" />
            Clear history
          </button>
        </div>
      )}
    </section>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
