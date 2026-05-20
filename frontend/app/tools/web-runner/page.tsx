"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type OutputTab = "output" | "errors";
type ConsoleLine = { id: number; type: "log" | "warn" | "error"; text: string };

type RunResult = {
  stdout: string;
  stderr: string;
  output: string;
  exit_code: number | null;
  signal: string | null;
  cpu_time: number | null;
  wall_time: number | null;
  memory: number | null;
  compile_output: string;
  compile_stderr?: string;
};

const modes: { label: string; value: Mode }[] = [
  { label: "Combined", value: "combined" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
];

const defaultHtml = `<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Edit this HTML to see live preview.</p>
</body>
</html>`;

const defaultCss = `body {
  font-family: sans-serif;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  padding: 2rem;
}

h1 {
  color: #059669;
}`;

const defaultJs = `// JavaScript runs in the browser
console.log("Hello, World!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
});`;

const defaultTs = `const greeting: string = "Hello, World!";
console.log(greeting);

interface User {
  name: string;
  age: number;
}

const user: User = { name: "DevTools", age: 1 };
console.log(user);`;

const cssDemoHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CSS Preview</title>
</head>
<body>
  <main>
    <h1>CSS Preview</h1>
    <h2>Style real elements</h2>
    <p>This scaffold includes text, links, buttons, lists, and a card so your CSS has something to shape.</p>
    <button>Sample button</button>
    <p><a href="#">Sample link</a></p>
    <ul>
      <li>First list item</li>
      <li>Second list item</li>
      <li>Third list item</li>
    </ul>
    <div class="card">
      <strong>Card element</strong>
      <p>Target .card in your CSS.</p>
    </div>
  </main>
</body>
</html>`;

const cardClass = "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const tabBaseClass = "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors";
const inactiveTabClass = "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";
const editorClass =
  "w-full resize-none bg-zinc-50 p-3 font-mono text-sm text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-100";
const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function escapeScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function ensureDocument(value: string) {
  if (/<html[\s>]/i.test(value)) return value;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preview</title>
</head>
<body>
${value}
</body>
</html>`;
}

function injectCssAndJs(html: string, css: string, js: string) {
  let doc = ensureDocument(html);
  const style = `<style>${css}</style>`;
  const script = `<script>${escapeScript(js)}</script>`;

  doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}\n</head>`) : `${style}\n${doc}`;
  doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}\n</body>`) : `${doc}\n${script}`;
  return doc;
}

function cssDocument(css: string) {
  return cssDemoHtml.replace("</head>", `<style>${css}</style>\n</head>`);
}

function jsDocument(js: string) {
  return `<!DOCTYPE html>
<html>
<body>
<script>
const send = (type, args) => {
  parent.postMessage({
    source: "web-runner-console",
    type,
    args: args.map((item) => {
      try {
        return typeof item === "string" ? item : JSON.stringify(item);
      } catch {
        return String(item);
      }
    }),
  }, "*");
};
["log", "warn", "error"].forEach((type) => {
  const original = console[type];
  console[type] = (...args) => {
    send(type, args);
    original.apply(console, args);
  };
});
window.addEventListener("error", (event) => send("error", [event.message]));
try {
${js}
} catch (error) {
  send("error", [error && error.message ? error.message : String(error)]);
}
</script>
</body>
</html>`;
}

function handleTab(value: string, onChange: (value: string) => void, event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Tab") return false;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }
  return true;
}

function EditorPanel({
  label,
  value,
  onChange,
  minHeight,
  tone,
  onRun,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight: string;
  tone: "html" | "css" | "js" | "ts";
  onRun?: () => void;
}) {
  const toneClass = {
    html: "border-l-orange-500 text-orange-600 dark:text-orange-400",
    css: "border-l-blue-500 text-blue-600 dark:text-blue-400",
    js: "border-l-yellow-500 text-yellow-600 dark:text-yellow-500",
    ts: "border-l-sky-500 text-sky-600 dark:text-sky-400",
  }[tone];

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRun) {
      event.preventDefault();
      onRun();
      return;
    }
    handleTab(value, onChange, event);
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className={`border-b border-l-4 border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide dark:border-zinc-800 ${toneClass}`}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className={editorClass}
        style={{ minHeight }}
      />
    </section>
  );
}

function PreviewPanel({ doc, tall = false }: { doc: string; tall?: boolean }) {
  return (
    <section className={`${cardClass} flex min-h-[400px] flex-col overflow-hidden ${tall ? "lg:min-h-[500px]" : ""}`}>
      <div className="border-b border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Preview
      </div>
      <iframe
        title="Preview"
        sandbox="allow-scripts"
        srcDoc={doc}
        className={`w-full flex-1 bg-white ${tall ? "min-h-[500px]" : "h-[400px]"}`}
      />
      <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Live preview · Auto-updating
      </div>
    </section>
  );
}

function OutputPanel({
  result,
  error,
  outputTab,
  setOutputTab,
}: {
  result: RunResult | null;
  error: string;
  outputTab: OutputTab;
  setOutputTab: (tab: OutputTab) => void;
}) {
  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <section className={`${cardClass} p-4`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["output", "errors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutputTab(tab)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              outputTab === tab
                ? "bg-emerald-600 text-white"
                : "border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {tab === "output" ? "Output" : "Errors"}
          </button>
        ))}
      </div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Process exited with code {result.exit_code}
        </div>
      )}
      {result?.signal && (
        <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
          Killed by signal {result.signal}
        </div>
      )}
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
        {outputTab === "output"
          ? stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")
          : errors || <span className="text-zinc-400">No errors.</span>}
      </pre>
      {result && (
        <div className="mt-3 text-xs text-zinc-400">
          CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {memoryKb}KB
        </div>
      )}
    </section>
  );
}

export default function WebRunnerPage() {
  const [mode, setMode] = useState<Mode>("combined");
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [js, setJs] = useState(defaultJs);
  const [ts, setTs] = useState(defaultTs);
  const [stdin, setStdin] = useState("");
  const [previewDoc, setPreviewDoc] = useState("");
  const [consoleDoc, setConsoleDoc] = useState("");
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [tsResult, setTsResult] = useState<RunResult | null>(null);
  const [tsError, setTsError] = useState("");
  const [tsRunning, setTsRunning] = useState(false);
  const [hasTsRun, setHasTsRun] = useState(false);
  const [outputTab, setOutputTab] = useState<OutputTab>("output");
  const consoleIdRef = useRef(0);

  const nextPreview = useMemo(() => {
    if (mode === "combined") return injectCssAndJs(html, css, js);
    if (mode === "html") return html;
    if (mode === "css") return cssDocument(css);
    return "";
  }, [css, html, js, mode]);

  useEffect(() => {
    if (mode !== "combined" && mode !== "html" && mode !== "css") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setPreviewDoc(nextPreview), 500);
    return () => window.clearTimeout(timer);
  }, [mode, nextPreview]);

  useEffect(() => {
    if (mode !== "javascript") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      setConsoleLines([]);
      setConsoleDoc(jsDocument(js));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [js, mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object" || data.source !== "web-runner-console") return;
      const type = data.type === "warn" || data.type === "error" ? data.type : "log";
      const text = Array.isArray(data.args) ? data.args.join(" ") : "";
      consoleIdRef.current += 1;
      setConsoleLines((current) => [...current, { id: consoleIdRef.current, type, text }]);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runTypeScript = useCallback(async () => {
    if (tsRunning) return;
    setTsRunning(true);
    setHasTsRun(true);
    setTsError("");
    setTsResult(null);
    setOutputTab("output");

    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language: "typescript", version: "5.0.3", code: ts, stdin }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
      setTsResult(data as RunResult);
    } catch (error) {
      setTsError(error instanceof Error ? error.message : "Unable to run TypeScript.");
    } finally {
      setTsRunning(false);
    }
  }, [stdin, ts, tsRunning]);

  function handleStdinKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runTypeScript();
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>Web Runner</span>
        </nav>

        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Web Runner</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Run HTML, CSS, JavaScript, and TypeScript with live preview.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`${tabBaseClass} ${mode === item.value ? "bg-emerald-600 text-white" : inactiveTabClass}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === "combined" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-stretch">
            <div className="space-y-4">
              <EditorPanel label="HTML" value={html} onChange={setHtml} minHeight="180px" tone="html" />
              <EditorPanel label="CSS" value={css} onChange={setCss} minHeight="140px" tone="css" />
              <EditorPanel label="JavaScript" value={js} onChange={setJs} minHeight="140px" tone="js" />
            </div>
            <PreviewPanel doc={previewDoc} tall />
          </div>
        )}

        {mode === "html" && (
          <div className="space-y-5">
            <EditorPanel label="HTML" value={html} onChange={setHtml} minHeight="400px" tone="html" />
            <PreviewPanel doc={previewDoc} />
          </div>
        )}

        {mode === "css" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <EditorPanel label="CSS" value={css} onChange={setCss} minHeight="400px" tone="css" />
            <PreviewPanel doc={previewDoc} />
          </div>
        )}

        {mode === "javascript" && (
          <div className="space-y-5">
            <EditorPanel label="JavaScript" value={js} onChange={setJs} minHeight="400px" tone="js" />
            <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <span className="text-sm font-semibold text-zinc-200">Console</span>
                <button type="button" onClick={() => setConsoleLines([])} className="text-xs text-zinc-400 hover:text-zinc-200">
                  Clear
                </button>
              </div>
              <div className="min-h-[200px] max-h-[400px] overflow-auto p-4 font-mono text-sm">
                {consoleLines.length === 0 ? (
                  <p className="text-zinc-600">Console output will appear here...</p>
                ) : (
                  <div className="space-y-1">
                    {consoleLines.map((line) => (
                      <div
                        key={line.id}
                        className={
                          line.type === "error" ? "text-red-400" : line.type === "warn" ? "text-yellow-400" : "text-zinc-100"
                        }
                      >
                        [{line.type}] {line.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <iframe title="JavaScript runtime" sandbox="allow-scripts" srcDoc={consoleDoc} className="hidden" />
          </div>
        )}

        {mode === "typescript" && (
          <div className="space-y-5">
            <EditorPanel label="TypeScript" value={ts} onChange={setTs} minHeight="400px" tone="ts" onRun={runTypeScript} />
            <p className="text-xs text-zinc-400">TypeScript is compiled and executed server-side via Piston.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Standard Input (stdin)
              </label>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                onKeyDown={handleStdinKeyDown}
                placeholder="Optional input for your program..."
                className={`${inputClass} min-h-[80px]`}
              />
            </div>
            <button
              type="button"
              onClick={runTypeScript}
              disabled={tsRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tsRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : "▶"}
              {tsRunning ? "Running..." : "Run TypeScript"}
            </button>
            {hasTsRun && (
              <OutputPanel result={tsResult} error={tsError} outputTab={outputTab} setOutputTab={setOutputTab} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
