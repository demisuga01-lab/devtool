"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { PanelLeft, PanelTop, Play, RefreshCw, Square } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type Layout = "horizontal" | "vertical" | "bottom";
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

const layouts: { label: string; value: Layout; icon: typeof PanelLeft }[] = [
  { label: "Horizontal split", value: "horizontal", icon: PanelLeft },
  { label: "Vertical split", value: "vertical", icon: PanelTop },
  { label: "Editor only", value: "bottom", icon: Square },
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

function CodeEditor({
  label,
  value,
  onChange,
  onKeyDown,
  tone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  tone: "html" | "css" | "js" | "ts";
}) {
  const labelClass = {
    html: "text-orange-400",
    css: "text-blue-400",
    js: "text-yellow-400",
    ts: "text-sky-400",
  }[tone];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <div className={`border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold ${labelClass}`}>{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="min-h-0 w-full flex-1 resize-none bg-zinc-950 p-3 font-mono text-sm text-zinc-100 outline-none"
      />
    </section>
  );
}

function WebPreviewPanel({ doc, previewKey }: { doc: string; previewKey: number }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-800">
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">Preview</span>
        <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Auto-updating
        </span>
      </div>
      <iframe
        key={previewKey}
        title="Preview"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={doc}
        className="w-full flex-1 border-0 bg-white"
      />
    </section>
  );
}

function ConsolePanel({
  consoleDoc,
  consoleKey,
  consoleLines,
  clearConsole,
}: {
  consoleDoc: string;
  consoleKey: number;
  consoleLines: ConsoleLine[];
  clearConsole: () => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="text-sm font-semibold text-zinc-100">Console</span>
        <button type="button" onClick={clearConsole} className="text-xs text-zinc-400 hover:text-zinc-200">
          Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100">
        {consoleLines.length === 0 ? (
          <p className="text-zinc-600">Console output will appear here...</p>
        ) : (
          <div className="space-y-1">
            {consoleLines.map((line) => (
              <div
                key={line.id}
                className={line.type === "error" ? "text-red-400" : line.type === "warn" ? "text-yellow-400" : "text-zinc-100"}
              >
                [{line.type}] {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
      <iframe key={consoleKey} title="JavaScript runtime" sandbox="allow-scripts allow-same-origin" srcDoc={consoleDoc} className="hidden" />
    </section>
  );
}

function TypeScriptOutputPanel({ result, error, hasRun }: { result: RunResult | null; error: string; hasRun: boolean }) {
  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const failed = result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0;

  return (
    <section className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
        <span className="font-semibold text-zinc-100">Output</span>
        {result && <span className="text-xs text-zinc-500">exit {result.exit_code ?? "-"}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100">
        {!hasRun && <p className="text-zinc-600">Run TypeScript to see output.</p>}
        {error && <div className="mb-3 rounded-xl border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">{error}</div>}
        {failed && <div className="mb-3 rounded-xl border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">Exited with code {result.exit_code}</div>}
        {hasRun && (
          <>
            <pre className="whitespace-pre-wrap text-zinc-100">
              {stdout || (result?.exit_code === 0 ? <span className="text-zinc-500">Program exited with no output.</span> : "")}
            </pre>
            {errors && <pre className="mt-4 whitespace-pre-wrap text-red-400">{errors}</pre>}
          </>
        )}
      </div>
    </section>
  );
}

export default function WebRunnerPage() {
  const [mode, setMode] = useState<Mode>("combined");
  const [layout, setLayout] = useState<Layout>("horizontal");
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [js, setJs] = useState(defaultJs);
  const [ts, setTs] = useState(defaultTs);
  const [stdin, setStdin] = useState("");
  const [previewDoc, setPreviewDoc] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [consoleDoc, setConsoleDoc] = useState("");
  const [consoleKey, setConsoleKey] = useState(0);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [tsResult, setTsResult] = useState<RunResult | null>(null);
  const [tsError, setTsError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const consoleIdRef = useRef(0);

  useEffect(() => {
    setHasRun(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== "combined" && mode !== "html" && mode !== "css") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      if (mode === "combined") setPreviewDoc(injectCssAndJs(html, css, js));
      if (mode === "html") setPreviewDoc(html);
      if (mode === "css") setPreviewDoc(cssDocument(css));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [css, html, js, mode]);

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
    if (running) return;
    setRunning(true);
    setHasRun(true);
    setTsError("");
    setTsResult(null);

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
      setRunning(false);
    }
  }, [running, stdin, ts]);

  const runPreview = useCallback(() => {
    if (mode === "typescript") {
      void runTypeScript();
      return;
    }
    if (running) return;
    setRunning(true);
    setHasRun(true);

    if (mode === "combined") {
      setPreviewDoc(injectCssAndJs(html, css, js));
      setPreviewKey((key) => key + 1);
    } else if (mode === "html") {
      setPreviewDoc(html);
      setPreviewKey((key) => key + 1);
    } else if (mode === "css") {
      setPreviewDoc(cssDocument(css));
      setPreviewKey((key) => key + 1);
    } else if (mode === "javascript") {
      setConsoleLines([]);
      setConsoleDoc(jsDocument(js));
      setConsoleKey((key) => key + 1);
    }

    if (typeof window !== "undefined") {
      window.setTimeout(() => setRunning(false), 100);
    } else {
      setRunning(false);
    }
  }, [css, html, js, mode, runTypeScript, running]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleGlobalRun(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runPreview();
      }
    }
    window.addEventListener("keydown", handleGlobalRun);
    return () => window.removeEventListener("keydown", handleGlobalRun);
  }, [runPreview]);

  function handleEditorKeyDown(
    value: string,
    onChange: (value: string) => void,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      runPreview();
      return;
    }
    handleTab(value, onChange, event);
  }

  function handleStdinKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      runPreview();
    }
  }

  const runButton = (
    <button
      type="button"
      onClick={runPreview}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {running ? "Running..." : "Run"}
    </button>
  );

  const editorPane = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
      {mode === "combined" && (
        <>
          <CodeEditor label="HTML" value={html} onChange={setHtml} tone="html" onKeyDown={(event) => handleEditorKeyDown(html, setHtml, event)} />
          <CodeEditor label="CSS" value={css} onChange={setCss} tone="css" onKeyDown={(event) => handleEditorKeyDown(css, setCss, event)} />
          <CodeEditor label="JS" value={js} onChange={setJs} tone="js" onKeyDown={(event) => handleEditorKeyDown(js, setJs, event)} />
        </>
      )}
      {mode === "html" && (
        <CodeEditor label="HTML" value={html} onChange={setHtml} tone="html" onKeyDown={(event) => handleEditorKeyDown(html, setHtml, event)} />
      )}
      {mode === "css" && (
        <CodeEditor label="CSS" value={css} onChange={setCss} tone="css" onKeyDown={(event) => handleEditorKeyDown(css, setCss, event)} />
      )}
      {mode === "javascript" && (
        <CodeEditor
          label="JavaScript"
          value={js}
          onChange={setJs}
          tone="js"
          onKeyDown={(event) => handleEditorKeyDown(js, setJs, event)}
        />
      )}
      {mode === "typescript" && (
        <>
          <CodeEditor
            label="TypeScript"
            value={ts}
            onChange={setTs}
            tone="ts"
            onKeyDown={(event) => handleEditorKeyDown(ts, setTs, event)}
          />
          <div className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-900 p-3 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">stdin</label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              onKeyDown={handleStdinKeyDown}
              placeholder="Optional input"
              className="min-h-[42px] flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
            {runButton}
          </div>
        </>
      )}
    </section>
  );

  const outputPane =
    mode === "javascript" ? (
      <ConsolePanel
        consoleDoc={consoleDoc}
        consoleKey={consoleKey}
        consoleLines={consoleLines}
        clearConsole={() => setConsoleLines([])}
      />
    ) : mode === "typescript" ? (
      <TypeScriptOutputPanel result={tsResult} error={tsError} hasRun={hasRun} />
    ) : (
      <WebPreviewPanel doc={previewDoc} previewKey={previewKey} />
    );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
        <nav className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-zinc-500">
          <Link href="/tools" className="shrink-0 hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span className="shrink-0">Code Runners</span>
          <span>/</span>
          <span className="truncate">Web Runner</span>
        </nav>

        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                mode === item.value
                  ? "bg-emerald-600 font-semibold text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="flex items-center gap-1">
            {layouts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => setLayout(item.value)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    layout === item.value
                      ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          {runButton}
          <span className="hidden text-xs text-zinc-400 md:inline">Ctrl+Enter to run</span>
        </div>
      </header>

      <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
        {layout === "horizontal" && (
          <div className="flex h-full">
            <div className="flex w-1/2 min-w-0 flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">{editorPane}</div>
            <div className="flex w-1/2 min-w-0 flex-col overflow-hidden">{outputPane}</div>
          </div>
        )}

        {layout === "vertical" && (
          <div className="flex h-full flex-col">
            <div className="h-1/2 min-h-0 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">{editorPane}</div>
            <div className="h-1/2 min-h-0 overflow-hidden">{outputPane}</div>
          </div>
        )}

        {layout === "bottom" && (
          <div className="flex h-full flex-col overflow-auto">
            <div className="min-h-[400px]">{editorPane}</div>
            {hasRun && <div className="min-h-[500px] border-t border-zinc-200 dark:border-zinc-800">{outputPane}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
