"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";

type TypeScriptResult = {
  stdout: string;
  stderr: string;
  output: string;
  exit_code: number | null;
  signal: string | null;
  compile_output: string;
  compile_stderr: string;
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
  <title>CSS Preview</title>
</head>
<body>
  <main>
    <h1>CSS Preview</h1>
    <p>Style this demo content to see your CSS update live.</p>
    <button>Sample button</button>
  </main>
</body>
</html>`;

const editorClass =
  "w-full font-mono text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 outline-none resize-none min-h-[280px]";
const cardClass = "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const labelClass =
  "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800";

function escapeScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function combinedDocument(html: string, css: string, js: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
</head>
<body>
${html}
  <script>${escapeScript(js)}</script>
</body>
</html>`;
}

function cssDocument(css: string) {
  return cssDemoHtml.replace("</head>", `  <style>${css}</style>\n</head>`);
}

function jsDocument(js: string) {
  return `<!DOCTYPE html>
<html>
<body>
<script>
const send = (type, args) => parent.postMessage({ source: "web-runner", type, args: args.map((item) => {
  try {
    return typeof item === "string" ? item : JSON.stringify(item);
  } catch {
    return String(item);
  }
}) }, "*");
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

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function EditorPanel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className={labelClass}>{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={editorClass}
      />
    </section>
  );
}

export default function WebRunnerPage() {
  const [mode, setMode] = useState<Mode>("combined");
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [js, setJs] = useState(defaultJs);
  const [ts, setTs] = useState(defaultTs);
  const [previewDoc, setPreviewDoc] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [tsResult, setTsResult] = useState<TypeScriptResult | null>(null);
  const [tsError, setTsError] = useState("");
  const [tsRunning, setTsRunning] = useState(false);

  const nextDoc = useMemo(() => {
    if (mode === "combined") return combinedDocument(html, css, js);
    if (mode === "html") return html;
    if (mode === "css") return cssDocument(css);
    if (mode === "javascript") return jsDocument(js);
    return "";
  }, [css, html, js, mode]);

  useEffect(() => {
    if (mode === "typescript") return;
    const timer = window.setTimeout(() => {
      if (mode === "javascript") setConsoleLines([]);
      setPreviewDoc(nextDoc);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [mode, nextDoc]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object" || data.source !== "web-runner") return;
      const args = Array.isArray(data.args) ? data.args.join(" ") : "";
      setConsoleLines((current) => [...current, `[${data.type}] ${args}`]);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runTypeScript = useCallback(async () => {
    setTsRunning(true);
    setTsError("");
    setTsResult(null);
    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: "typescript",
          version: "5.0.3",
          code: ts,
          stdin: "",
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseError(data, `Request failed with status ${res.status}`));
      }
      setTsResult(data as TypeScriptResult);
    } catch (error) {
      setTsError(error instanceof Error ? error.message : "Unable to run TypeScript.");
    } finally {
      setTsRunning(false);
    }
  }, [ts]);

  const tsOutput = tsResult ? tsResult.stdout || tsResult.output || "Program exited with no output." : "";
  const tsErrors = tsResult ? [tsResult.compile_output, tsResult.compile_stderr, tsResult.stderr].filter(Boolean).join("\n") : "";

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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">Web Runner</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Run HTML, CSS, JavaScript, and TypeScript with live preview.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={
                mode === item.value
                  ? "rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === "combined" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <EditorPanel label="HTML" value={html} onChange={setHtml} />
            <EditorPanel label="CSS" value={css} onChange={setCss} />
            <EditorPanel label="JavaScript" value={js} onChange={setJs} />
          </div>
        )}

        {mode === "html" && <EditorPanel label="HTML" value={html} onChange={setHtml} />}
        {mode === "css" && <EditorPanel label="CSS" value={css} onChange={setCss} />}
        {mode === "javascript" && <EditorPanel label="JavaScript" value={js} onChange={setJs} />}
        {mode === "typescript" && (
          <div className="space-y-4">
            <EditorPanel label="TypeScript" value={ts} onChange={setTs} />
            <button
              type="button"
              onClick={runTypeScript}
              disabled={tsRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tsRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
              {tsRunning ? "Running..." : "Run TypeScript"}
            </button>
          </div>
        )}

        {mode !== "typescript" && mode !== "javascript" && (
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Preview
            </div>
            <iframe
              title="Preview"
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className="h-[400px] w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800"
            />
          </section>
        )}

        {mode === "javascript" && (
          <section className={`${cardClass} overflow-hidden`}>
            <div className={labelClass}>Console</div>
            <pre className="min-h-[240px] max-h-96 overflow-auto whitespace-pre-wrap bg-zinc-950 p-4 font-mono text-sm text-zinc-100">
              {consoleLines.length > 0 ? consoleLines.join("\n") : "Console output will appear here."}
            </pre>
            <iframe title="JavaScript runtime" sandbox="allow-scripts" srcDoc={previewDoc} className="hidden" />
          </section>
        )}

        {mode === "typescript" && (
          <section className={`${cardClass} overflow-hidden`}>
            <div className={labelClass}>Output</div>
            <div className="space-y-3 p-4">
              {tsError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  {tsError}
                </div>
              )}
              {tsResult?.exit_code !== null && tsResult?.exit_code !== undefined && tsResult.exit_code !== 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  Exited with code {tsResult.exit_code}
                </div>
              )}
              {tsResult?.signal && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  Killed by signal {tsResult.signal}
                </div>
              )}
              <pre className="max-h-96 min-h-[180px] overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-mono text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                {tsErrors || tsOutput || "Run TypeScript to see output."}
              </pre>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
