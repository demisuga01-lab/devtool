"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Link2,
  Maximize2,
  PanelLeft,
  PanelTop,
  Play,
  RefreshCw,
  Square,
  X,
} from "lucide-react";
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

type LintError = { line: number; col: number; message: string; severity: "error" | "warning" };
type LintResult = { errors: LintError[] };
type ModalTarget = "html" | "css" | "js" | "ts" | "preview" | null;

const modes: { label: string; value: Mode; icon: JSX.Element }[] = [
  {
    label: "Combined",
    value: "combined",
    icon: <svg viewBox="0 0 16 16" className="h-4 w-4"><rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/><rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/><rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/></svg>,
  },
  {
    label: "HTML",
    value: "html",
    icon: <svg viewBox="0 0 48 48" className="h-4 w-4"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#E44D26"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#F16529"/><path d="M24 21h-7l-.5-5H24v-5H12l1.5 15H24v-5zm0 8h-5.5l-.5-5H24v5h-0.5l-4-.5-.3-3H15l.5 7 8.5 2.5V29z" fill="#EBEBEB"/><path d="M24 21h6.5l-.5 5H24v5h5.5l-.5 5-5 1.5V37l4-.5.3-3H24v-5h7.5l.5-15H24v5z" fill="white"/></svg>,
  },
  {
    label: "CSS",
    value: "css",
    icon: <svg viewBox="0 0 48 48" className="h-4 w-4"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#1572B6"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#33A9DC"/><path d="M24 22.5H17l.5 5H24v-5zm0-8H16.5l.5 5H24v-5zm0 16l-4.5-1.3-.3-3.5H15l.5 7.5 8.5 2.3V30.5zm0 0h5l-.5 4.5-4.5 1.3V30.5zm0-8h5.5l-.5-5H24v5zm1-8h5l-.5-5H24v5z" fill="white"/></svg>,
  },
  {
    label: "JavaScript",
    value: "javascript",
    icon: <svg viewBox="0 0 48 48" className="h-4 w-4"><rect width="48" height="48" rx="4" fill="#F7DF1E"/><path d="M13 36.5l3.2-1.9c.6 1.1 1.2 2 2.5 2 1.3 0 2-.5 2-2.5V22h4v12.2c0 4.1-2.4 6-5.9 6-3.2 0-5-1.7-5.8-3.7zM28 36l3.2-1.9c.8 1.4 1.9 2.4 3.8 2.4 1.6 0 2.6-.8 2.6-1.9 0-1.3-.9-1.8-3.1-2.6l-1.1-.5c-3.1-1.3-5.1-3-5.1-6.5 0-3.2 2.5-5.7 6.3-5.7 2.7 0 4.7 1 6.1 3.4l-3.1 2c-.7-1.3-1.5-1.8-2.9-1.8-1.4 0-2.2.9-2.2 2 0 1.4.9 1.9 2.9 2.7l1.1.5c3.6 1.5 5.6 3.1 5.6 6.7 0 3.8-3 6-7 6-3.9 0-6.4-1.9-7.1-4.8z" fill="#000"/></svg>,
  },
  {
    label: "TypeScript",
    value: "typescript",
    icon: <svg viewBox="0 0 48 48" className="h-4 w-4"><rect width="48" height="48" rx="4" fill="#3178C6"/><path d="M22 22h-8v3h5v13h3V22zM26 31.5c.5 1 1.5 1.8 3 1.8 1.3 0 2-.6 2-1.5 0-.9-.6-1.4-2.2-2l-.8-.3c-2.3-.9-3.5-2.2-3.5-4.2 0-2.5 2-4.3 5-4.3 2.2 0 3.8.8 4.8 2.5l-2.3 1.5c-.5-.9-1.1-1.4-2.4-1.4-1.1 0-1.8.6-1.8 1.4 0 .9.6 1.3 2 1.9l.8.3c2.7 1.1 4 2.4 4 4.5 0 2.7-2.1 4.5-5.4 4.5-2.8 0-4.8-1.4-5.7-3.5l2.5-1.2z" fill="white"/></svg>,
  },
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

// ---------------------------------------------------------------------------
// Linters
// ---------------------------------------------------------------------------

function posToLineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function lintHtml(html: string): LintResult {
  const errors: LintError[] = [];
  const pairedTags = [
    "div", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6",
    "section", "article", "header", "footer", "main", "nav",
    "ul", "ol", "table", "form",
  ];

  for (const tag of pairedTags) {
    const openRe = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "gi");
    const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
    const opens = (html.match(openRe) || []).length;
    const closes = (html.match(closeRe) || []).length;
    if (opens > closes) {
      const m = openRe.exec(html);
      const { line, col } = m ? posToLineCol(html, m.index) : { line: 1, col: 1 };
      errors.push({
        line,
        col,
        message: `Unclosed <${tag}> tag (${opens} opening, ${closes} closing)`,
        severity: "error",
      });
    }
  }

  const imgRe = /<img\b([^>]*)>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRe.exec(html))) {
    if (!/\balt\s*=/i.test(imgMatch[1])) {
      const { line, col } = posToLineCol(html, imgMatch.index);
      errors.push({ line, col, message: "img element missing alt attribute", severity: "warning" });
    }
  }

  const anchorRe = /<a\b([^>]*)>/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorRe.exec(html))) {
    if (!/\bhref\s*=/i.test(anchorMatch[1])) {
      const { line, col } = posToLineCol(html, anchorMatch.index);
      errors.push({ line, col, message: "anchor element missing href attribute", severity: "warning" });
    }
  }

  const styleRe = /\bstyle\s*=\s*["']/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRe.exec(html))) {
    const { line, col } = posToLineCol(html, styleMatch.index);
    errors.push({ line, col, message: "Avoid inline styles, use CSS classes instead", severity: "warning" });
  }

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRe.exec(html))) {
    if (/\bsrc\s*=/i.test(scriptMatch[1]) && scriptMatch[2].trim().length > 0) {
      const { line, col } = posToLineCol(html, scriptMatch.index);
      errors.push({
        line,
        col,
        message: "Script tag has both src and inline content",
        severity: "warning",
      });
    }
  }

  return { errors };
}

function lintCss(css: string): LintResult {
  const errors: LintError[] = [];
  const lines = css.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNum = i + 1;

    if (line.length === 0) continue;
    const noComment = line.replace(/\/\*.*?\*\//g, "").trim();
    if (noComment.length === 0) continue;

    if (
      noComment.includes(":") &&
      !noComment.endsWith("{") &&
      !noComment.endsWith("}") &&
      !noComment.endsWith(";") &&
      !noComment.endsWith(",") &&
      !/^\s*\/\//.test(noComment) &&
      !/^@/.test(noComment) &&
      !/^[.#&:\[a-zA-Z*]/.test(noComment.split(":")[0].trim()) === false &&
      /^[\w-]+\s*:/.test(noComment)
    ) {
      errors.push({ line: lineNum, col: 1, message: "Missing semicolon", severity: "error" });
    }

    if (/!important\b/i.test(raw)) {
      const col = raw.indexOf("!important") + 1;
      errors.push({ line: lineNum, col, message: "Avoid using !important", severity: "warning" });
    }

    if (raw.length > 120) {
      errors.push({ line: lineNum, col: 121, message: "Line too long (>120 chars)", severity: "warning" });
    }
  }

  const emptyRuleRe = /([^{}]+)\{\s*\}/g;
  let emptyMatch: RegExpExecArray | null;
  while ((emptyMatch = emptyRuleRe.exec(css))) {
    const { line, col } = posToLineCol(css, emptyMatch.index);
    errors.push({ line, col, message: "Empty rule block", severity: "warning" });
  }

  const vendorRe = /(-webkit-|-moz-|-ms-|-o-)([\w-]+)\s*:/g;
  let vendorMatch: RegExpExecArray | null;
  while ((vendorMatch = vendorRe.exec(css))) {
    const standardProp = vendorMatch[2];
    const stdRe = new RegExp(`(?<!-)\\b${standardProp}\\s*:`);
    if (!stdRe.test(css)) {
      const { line, col } = posToLineCol(css, vendorMatch.index);
      errors.push({
        line,
        col,
        message: `Vendor prefix ${vendorMatch[1]}${standardProp} used without standard property`,
        severity: "warning",
      });
    }
  }

  return { errors };
}

function lintJs(js: string): LintResult {
  const errors: LintError[] = [];
  const lines = js.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNum = i + 1;
    const stripped = raw.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");

    const varMatch = /\bvar\s+/.exec(stripped);
    if (varMatch) {
      errors.push({
        line: lineNum,
        col: varMatch.index + 1,
        message: "Use let or const instead of var",
        severity: "warning",
      });
    }

    const consoleMatch = /\bconsole\.log\s*\(/.exec(stripped);
    if (consoleMatch) {
      errors.push({
        line: lineNum,
        col: consoleMatch.index + 1,
        message: "console.log found (remove before production)",
        severity: "warning",
      });
    }

    const eqMatch = /[^=!<>]==[^=]/.exec(stripped);
    if (eqMatch) {
      errors.push({
        line: lineNum,
        col: eqMatch.index + 2,
        message: "Use === instead of ==",
        severity: "warning",
      });
    }

    const neqMatch = /[^!]!=[^=]/.exec(stripped);
    if (neqMatch) {
      errors.push({
        line: lineNum,
        col: neqMatch.index + 2,
        message: "Use !== instead of !=",
        severity: "warning",
      });
    }
  }

  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  for (let i = 0; i < js.length; i++) {
    const ch = js[i];
    const next = js[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  if (braces !== 0) {
    errors.push({ line: lines.length, col: 1, message: `Mismatched braces (${braces > 0 ? "unclosed" : "extra"})`, severity: "error" });
  }
  if (parens !== 0) {
    errors.push({ line: lines.length, col: 1, message: `Mismatched parens (${parens > 0 ? "unclosed" : "extra"})`, severity: "error" });
  }
  if (brackets !== 0) {
    errors.push({ line: lines.length, col: 1, message: `Mismatched brackets (${brackets > 0 ? "unclosed" : "extra"})`, severity: "error" });
  }

  return { errors };
}

function CodeEditor({
  label,
  value,
  onChange,
  onKeyDown,
  tone,
  lintErrors,
  onMaximize,
  onNewTab,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  tone: "html" | "css" | "js" | "ts";
  lintErrors?: LintError[];
  onMaximize?: () => void;
  onNewTab?: () => void;
}) {
  const labelClass = {
    html: "text-orange-400",
    css: "text-blue-400",
    js: "text-yellow-400",
    ts: "text-sky-400",
  }[tone];

  const errorCount = (lintErrors || []).filter((e) => e.severity === "error").length;
  const warnCount = (lintErrors || []).filter((e) => e.severity === "warning").length;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold">
        <span className={labelClass}>{label}</span>
        {errorCount > 0 && (
          <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">{errorCount}</span>
        )}
        {warnCount > 0 && (
          <span className="ml-1 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">{warnCount}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onMaximize && (
            <button
              type="button"
              title="Maximize editor"
              onClick={onMaximize}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onNewTab && (
            <button
              type="button"
              title="Open in new tab"
              onClick={onNewTab}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="min-h-[200px] w-full flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none"
      />
    </section>
  );
}

function LintPanel({ errors }: { errors: LintError[] }) {
  if (errors.length === 0) {
    return (
      <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-emerald-400">
        ✓ No issues found
      </div>
    );
  }

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-400">
        {errorCount > 0 && <span className="text-red-400">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
        {warnCount > 0 && <span className="text-yellow-400">{warnCount} warning{warnCount !== 1 ? "s" : ""}</span>}
      </div>
      <div className="max-h-[120px] overflow-auto">
        {errors.map((err, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 px-3 py-1 text-xs ${err.severity === "error" ? "text-red-400" : "text-yellow-400"}`}
          >
            <span className="shrink-0">Line {err.line}:{err.col}</span>
            <span>{err.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebPreviewPanel({
  doc,
  previewKey,
  onMaximize,
  onNewTab,
}: {
  doc: string;
  previewKey: number;
  onMaximize?: () => void;
  onNewTab?: () => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-800">
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">Preview</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Auto-updating
          </span>
          {onMaximize && (
            <button
              type="button"
              title="Maximize preview"
              onClick={onMaximize}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onNewTab && (
            <button
              type="button"
              title="Open in new tab"
              onClick={onNewTab}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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

  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);

  const [htmlLint, setHtmlLint] = useState<LintError[]>([]);
  const [cssLint, setCssLint] = useState<LintError[]>([]);
  const [jsLint, setJsLint] = useState<LintError[]>([]);

  const [showUrlBar, setShowUrlBar] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

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

  useEffect(() => {
    const timer = window.setTimeout(() => setHtmlLint(lintHtml(html).errors), 800);
    return () => window.clearTimeout(timer);
  }, [html]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCssLint(lintCss(css).errors), 800);
    return () => window.clearTimeout(timer);
  }, [css]);

  useEffect(() => {
    const timer = window.setTimeout(() => setJsLint(lintJs(js).errors), 800);
    return () => window.clearTimeout(timer);
  }, [js]);

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

  const loadUrl = useCallback(async () => {
    if (!urlInput.trim() || urlLoading) return;
    setUrlLoading(true);
    setUrlError("");
    try {
      const res = await fetch(`${API_BASE}/tools/fetch-url?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch URL");

      if (data.html) setHtml(data.html);
      if (data.css) setCss(data.css);
      if (data.js) setJs(data.js);
      setShowUrlBar(false);
      setUrlInput("");
      setMode("combined");
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Failed to load URL");
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, urlLoading]);

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

  function openInNewTab(content: string) {
    const w = window.open("about:blank");
    if (w) {
      w.document.write(content);
      w.document.close();
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

  const htmlEditor = (
    <CodeEditor
      label="HTML"
      value={html}
      onChange={setHtml}
      tone="html"
      onKeyDown={(event) => handleEditorKeyDown(html, setHtml, event)}
      lintErrors={htmlLint}
      onMaximize={() => setModalTarget("html")}
      onNewTab={() => openInNewTab(html)}
    />
  );
  const cssEditor = (
    <CodeEditor
      label="CSS"
      value={css}
      onChange={setCss}
      tone="css"
      onKeyDown={(event) => handleEditorKeyDown(css, setCss, event)}
      lintErrors={cssLint}
      onMaximize={() => setModalTarget("css")}
      onNewTab={() => openInNewTab(`<style>${css}</style>${cssDemoHtml}`)}
    />
  );
  const jsEditor = (
    <CodeEditor
      label="JS"
      value={js}
      onChange={setJs}
      tone="js"
      onKeyDown={(event) => handleEditorKeyDown(js, setJs, event)}
      lintErrors={jsLint}
      onMaximize={() => setModalTarget("js")}
      onNewTab={() => openInNewTab(jsDocument(js))}
    />
  );

  const editorPane = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
      {mode === "combined" && (
        <>
          {htmlEditor}
          <LintPanel errors={htmlLint} />
          {cssEditor}
          <LintPanel errors={cssLint} />
          {jsEditor}
          <LintPanel errors={jsLint} />
        </>
      )}
      {mode === "html" && (
        <>
          <CodeEditor
            label="HTML"
            value={html}
            onChange={setHtml}
            tone="html"
            onKeyDown={(event) => handleEditorKeyDown(html, setHtml, event)}
            lintErrors={htmlLint}
            onMaximize={() => setModalTarget("html")}
            onNewTab={() => openInNewTab(html)}
          />
          <LintPanel errors={htmlLint} />
        </>
      )}
      {mode === "css" && (
        <>
          <CodeEditor
            label="CSS"
            value={css}
            onChange={setCss}
            tone="css"
            onKeyDown={(event) => handleEditorKeyDown(css, setCss, event)}
            lintErrors={cssLint}
            onMaximize={() => setModalTarget("css")}
            onNewTab={() => openInNewTab(`<style>${css}</style>${cssDemoHtml}`)}
          />
          <LintPanel errors={cssLint} />
        </>
      )}
      {mode === "javascript" && (
        <>
          <CodeEditor
            label="JavaScript"
            value={js}
            onChange={setJs}
            tone="js"
            onKeyDown={(event) => handleEditorKeyDown(js, setJs, event)}
            lintErrors={jsLint}
            onMaximize={() => setModalTarget("js")}
            onNewTab={() => openInNewTab(jsDocument(js))}
          />
          <LintPanel errors={jsLint} />
        </>
      )}
      {mode === "typescript" && (
        <>
          <CodeEditor
            label="TypeScript"
            value={ts}
            onChange={setTs}
            tone="ts"
            onKeyDown={(event) => handleEditorKeyDown(ts, setTs, event)}
            onMaximize={() => setModalTarget("ts")}
            onNewTab={() => openInNewTab(`<pre>${ts}</pre>`)}
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
      <WebPreviewPanel
        doc={previewDoc}
        previewKey={previewKey}
        onMaximize={() => setModalTarget("preview")}
        onNewTab={() => openInNewTab(previewDoc)}
      />
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
              <span className="flex items-center gap-1.5">
                {item.icon}
                {item.label}
              </span>
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
          <button
            type="button"
            onClick={() => setShowUrlBar((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Link2 className="h-3.5 w-3.5" />
            Import URL
          </button>
          {runButton}
          <span className="hidden text-xs text-zinc-400 md:inline">Ctrl+Enter to run</span>
        </div>
      </header>

      {showUrlBar && (
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            type="url"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadUrl();
              if (event.key === "Escape") setShowUrlBar(false);
            }}
            placeholder="https://example.com — fetches HTML, extracts inline CSS and JS"
            autoFocus
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => void loadUrl()}
            disabled={urlLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {urlLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {urlLoading ? "Loading..." : "Load"}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlBar(false)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
          {urlError && <span className="text-xs text-red-500">{urlError}</span>}
        </div>
      )}

      <div className="h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden">
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
            <div className="min-h-[480px]">{editorPane}</div>
            {hasRun && <div className="min-h-[500px] border-t border-zinc-200 dark:border-zinc-800">{outputPane}</div>}
          </div>
        )}
      </div>

      {modalTarget === "html" && (
        <ExpandModal title="HTML" tone="html" value={html} onChange={setHtml} onClose={() => setModalTarget(null)} />
      )}
      {modalTarget === "css" && (
        <ExpandModal title="CSS" tone="css" value={css} onChange={setCss} onClose={() => setModalTarget(null)} />
      )}
      {modalTarget === "js" && (
        <ExpandModal title="JavaScript" tone="js" value={js} onChange={setJs} onClose={() => setModalTarget(null)} />
      )}
      {modalTarget === "ts" && (
        <ExpandModal title="TypeScript" tone="ts" value={ts} onChange={setTs} onClose={() => setModalTarget(null)} />
      )}
      {modalTarget === "preview" && <PreviewModal doc={previewDoc} onClose={() => setModalTarget(null)} />}
    </main>
  );
}

function ExpandModal({
  title,
  tone,
  value,
  onChange,
  onClose,
}: {
  title: string;
  tone: "html" | "css" | "js" | "ts";
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const labelClass = {
    html: "text-orange-400",
    css: "text-blue-400",
    js: "text-yellow-400",
    ts: "text-sky-400",
  }[tone];

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <span className={`text-sm font-semibold ${labelClass}`}>{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoFocus
        className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm text-zinc-100 outline-none"
      />
    </div>
  );
}

function PreviewModal({ doc, onClose }: { doc: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 py-2">
        <span className="text-sm font-semibold text-zinc-700">Preview</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <iframe
        title="Preview fullscreen"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={doc}
        className="flex-1 border-0"
      />
    </div>
  );
}
