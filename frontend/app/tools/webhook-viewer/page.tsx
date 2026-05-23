"use client";

import { useMemo, useState } from "react";
import { CodeBlock, Label, Textarea } from "@/components/ui";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function splitRequest(raw: string): { requestLine: string; headers: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.includes("\n\n")) {
    return { requestLine: "", headers: {}, body: raw };
  }
  const [head, ...bodyParts] = normalized.split(/\n\n/);
  const lines = head.split("\n").filter(Boolean);
  const requestLine = lines[0]?.includes(":") ? "" : lines.shift() ?? "";
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index > -1) headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  const body = bodyParts.join("\n\n") || (requestLine ? bodyParts.join("\n\n") : raw);
  return { requestLine, headers, body: bodyParts.length ? body : raw };
}

function formatXml(value: string) {
  return value.replace(/>\s*</g, ">\n<");
}

function parseMultipart(body: string, contentType: string) {
  const match = contentType.match(/boundary=([^;]+)/i);
  if (!match) return [];
  const boundary = match[1].replace(/^"|"$/g, "");
  return body
    .split(`--${boundary}`)
    .map((part) => part.trim())
    .filter((part) => part && part !== "--")
    .map((part, index) => {
      const [head, ...rest] = part.replace(/\r\n/g, "\n").split(/\n\n/);
      return { name: `part-${index + 1}`, headers: head, body: rest.join("\n\n") };
    });
}

function detect(body: string, headers: Record<string, string>) {
  const contentType = headers["content-type"] ?? "";
  const trimmed = body.trim();
  if (contentType.includes("multipart/form-data")) return "multipart";
  if (contentType.includes("x-www-form-urlencoded") || /^[^=\s]+=[\s\S]*&?/.test(trimmed)) return "form";
  if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (contentType.includes("xml") || trimmed.startsWith("<")) return "xml";
  return "text";
}

export default function WebhookViewerPage() {
  const [raw, setRaw] = useState('POST /webhook HTTP/1.1\nContent-Type: application/json\nX-Signature: sha256=...\n\n{"event":"deploy","status":"ok"}');
  const parsed = useMemo(() => splitRequest(raw), [raw]);
  const kind = useMemo(() => detect(parsed.body, parsed.headers), [parsed.body, parsed.headers]);

  const bodyPanel = useMemo(() => {
    if (kind === "json") {
      try {
        const json = JSON.parse(parsed.body) as JsonValue;
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock value={JSON.stringify(json, null, 2)} />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <JsonTree value={json} />
            </div>
          </div>
        );
      } catch {
        return <CodeBlock value={parsed.body} />;
      }
    }
    if (kind === "xml") return <CodeBlock value={formatXml(parsed.body)} />;
    if (kind === "form") {
      const params = new URLSearchParams(parsed.body);
      return <KeyValue values={Object.fromEntries(params.entries())} />;
    }
    if (kind === "multipart") {
      const parts = parseMultipart(parsed.body, parsed.headers["content-type"] ?? "");
      return (
        <div className="space-y-3">
          {parts.map((part) => (
            <div key={part.name} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{part.name}</div>
              <CodeBlock value={`${part.headers}\n\n${part.body}`} />
            </div>
          ))}
          {parts.length === 0 && <CodeBlock value={parsed.body} />}
        </div>
      );
    }
    return <CodeBlock value={parsed.body} />;
  }, [kind, parsed.body, parsed.headers]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network & Web</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Webhook Payload Viewer</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Parse and inspect HTTP request payloads, headers, JSON, XML, forms, and multipart bodies.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Label>Raw request or body</Label>
          <Textarea value={raw} onChange={(event) => setRaw(event.target.value)} rows={24} className="min-h-[560px]" />
        </section>
        <section className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Detected: {kind}</span>
              {parsed.requestLine && <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{parsed.requestLine}</span>}
            </div>
            <Label>Headers</Label>
            <KeyValue values={parsed.headers} />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Label>Payload</Label>
            {bodyPanel}
          </div>
        </section>
      </div>
    </div>
  );
}

function KeyValue({ values }: { values: Record<string, string> }) {
  const entries = Object.entries(values);
  if (entries.length === 0) return <p className="text-sm text-zinc-500">None</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 dark:border-zinc-800 sm:grid-cols-[180px_1fr]">
          <span className="font-mono text-xs text-zinc-500">{key}</span>
          <span className="break-all text-zinc-800 dark:text-zinc-200">{value}</span>
        </div>
      ))}
    </div>
  );
}

function JsonTree({ value, name }: { value: JsonValue; name?: string }) {
  if (value === null || typeof value !== "object") {
    return (
      <div className="font-mono text-xs">
        {name && <span className="text-zinc-500">{name}: </span>}
        <span className="text-emerald-700 dark:text-emerald-300">{JSON.stringify(value)}</span>
      </div>
    );
  }
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  return (
    <details open className="pl-3">
      <summary className="cursor-pointer font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {name ? `${name} ` : ""}{Array.isArray(value) ? `Array(${value.length})` : "Object"}
      </summary>
      <div className="mt-1 space-y-1 border-l border-zinc-200 pl-3 dark:border-zinc-800">
        {entries.map(([key, child]) => <JsonTree key={key} name={key} value={child as JsonValue} />)}
      </div>
    </details>
  );
}
