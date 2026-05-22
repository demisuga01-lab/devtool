"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DragEvent, KeyboardEvent, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
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
  Upload,
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
type FileKind = "html" | "css" | "js";
type UploadTarget = FileKind | "combined";
type UploadedFile = { name: string; content: string; size: number };
type UploadGroup = { label: string; kind: FileKind; files: UploadedFile[] };

const MAX_FILES_PER_UPLOAD = 5;
const MAX_FILES_PER_KIND = 20;
const MAX_FILE_SIZE_BYTES = 500 * 1024;

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

function escapeStyle(value: string) {
  return value.replace(/<\/style/gi, "<\\/style");
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

function injectOptionalCssAndJs(html: string, css: string, js: string) {
  let doc = ensureDocument(html);
  const cssValue = css.trim();
  const jsValue = js.trim();

  if (cssValue) {
    const style = `<style>${escapeStyle(css)}</style>`;
    doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}\n</head>`) : `${style}\n${doc}`;
  }

  if (jsValue) {
    const script = `<script>${escapeScript(js)}</script>`;
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}\n</body>`) : `${doc}\n${script}`;
  }

  return doc;
}

function injectCssAndJs(html: string, css: string, js: string) {
  let doc = ensureDocument(html);
  const style = `<style>${escapeStyle(css)}</style>`;
  const script = `<script>${escapeScript(js)}</script>`;

  doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}\n</head>`) : `${style}\n${doc}`;
  doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}\n</body>`) : `${doc}\n${script}`;
  return doc;
}

function cssDocument(css: string) {
  return cssDemoHtml.replace("</head>", `<style>${escapeStyle(css)}</style>\n</head>`);
}

function fallbackMergeHtmlFiles(files: UploadedFile[]) {
  return ensureDocument(files.map((file) => file.content).join("\n"));
}

function mergeHtmlFiles(files: UploadedFile[]): string {
  if (files.length === 0) return "";
  if (typeof DOMParser === "undefined") return fallbackMergeHtmlFiles(files);

  const parser = new DOMParser();
  const parsed = files.map((file) => ({
    file,
    doc: parser.parseFromString(file.content, "text/html"),
  }));
  const fullDocumentIndex = files.findIndex((file) => /<!doctype\s+html/i.test(file.content) && /<body[\s>]/i.test(file.content));
  const baseIndex = fullDocumentIndex >= 0 ? fullDocumentIndex : 0;
  const baseDoc = parser.parseFromString(files[baseIndex].content, "text/html");
  const baseHead = baseDoc.head;
  const baseBody = baseDoc.body;

  baseHead.innerHTML = "";
  baseBody.innerHTML = parsed[baseIndex].doc.body?.innerHTML || files[baseIndex].content;

  const firstTitle = parsed
    .map(({ doc }) => doc.head?.querySelector("title"))
    .find((title): title is HTMLTitleElement => Boolean(title));
  if (firstTitle) baseHead.appendChild(baseDoc.importNode(firstTitle, true));

  const seenHead = new Set<string>();
  const seenLinks = new Set<string>();

  for (const { doc } of parsed) {
    const headChildren = Array.from(doc.head?.children || []);
    for (const node of headChildren) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === "title") continue;

      if (tagName === "link") {
        const link = node as HTMLLinkElement;
        const key = `${link.rel}|${link.href}`;
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);
        baseHead.appendChild(baseDoc.importNode(node, true));
        continue;
      }

      if (tagName !== "style") {
        const key = node.outerHTML;
        if (seenHead.has(key)) continue;
        seenHead.add(key);
      }

      baseHead.appendChild(baseDoc.importNode(node, true));
    }
  }

  parsed.forEach(({ file, doc }, index) => {
    if (index === baseIndex) return;
    const bodyNodes = Array.from(doc.body?.childNodes || []);
    if (bodyNodes.length === 0) return;
    baseBody.appendChild(baseDoc.createTextNode("\n"));
    baseBody.appendChild(baseDoc.createComment(` ${file.name} `));
    baseBody.appendChild(baseDoc.createTextNode("\n"));
    bodyNodes.forEach((node) => baseBody.appendChild(baseDoc.importNode(node, true)));
  });

  return `<!DOCTYPE html>\n${baseDoc.documentElement.outerHTML}`;
}

function mergeCssFiles(files: UploadedFile[]): string {
  return files
    .map((file) => `/* --- ${file.name} --- */\n${file.content}`)
    .join("\n\n");
}

function mergeJsFiles(files: UploadedFile[]): string {
  return files
    .map((file) => `// --- ${file.name} ---\n${file.content}`)
    .join("\n\n");
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  return `${Math.round(size / 1024)} KB`;
}

function getFileKind(name: string): FileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js")) return "js";
  return null;
}

function readUploadedFile(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, content: String(reader.result || ""), size: file.size });
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsText(file);
  });
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

function UploadZone({
  accept,
  prompt,
  groups,
  error,
  onFiles,
  onRemove,
}: {
  accept: string;
  prompt: string;
  groups: UploadGroup[];
  error: string;
  onFiles: (files: File[]) => void;
  onRemove: (kind: FileKind, index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const files = groups.flatMap((group) => group.files.map((file, index) => ({ ...file, index, kind: group.kind, label: group.label })));

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-900 p-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(Array.from(event.target.files || []));
          event.currentTarget.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${
          dragging
            ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
            : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-emerald-500 hover:text-zinc-200"
        }`}
      >
        <Upload className="mb-2 h-5 w-5" />
        <span className="text-sm font-medium">{prompt}</span>
        <span className="mt-1 text-xs text-zinc-500">Up to {MAX_FILES_PER_UPLOAD} files per upload, {MAX_FILE_SIZE_BYTES / 1024}KB each</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {groups.map((group) => (
          <span
            key={group.kind}
            className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-400"
          >
            {groups.length === 1 ? `${group.files.length}/${MAX_FILES_PER_KIND} files` : `${group.label} ${group.files.length}/${MAX_FILES_PER_KIND}`}
          </span>
        ))}
        {error && <span className="text-xs font-medium text-red-400">{error}</span>}
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={`${file.kind}-${file.index}-${file.name}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
            >
              {groups.length > 1 && <span className="font-semibold text-zinc-500">{file.label}</span>}
              <span className="max-w-[12rem] truncate">{file.name}</span>
              <span className="shrink-0 text-zinc-500">{formatFileSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemove(file.kind, file.index)}
                className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeEditor({
  label,
  value,
  onChange,
  onKeyDown,
  tone,
  lintErrors,
  readOnly = false,
  uploadZone,
  onMaximize,
  onNewTab,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  tone: "html" | "css" | "js" | "ts";
  lintErrors?: LintError[];
  readOnly?: boolean;
  uploadZone?: ReactNode;
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
        {readOnly && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">merged upload</span>}
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
      {uploadZone}
      <textarea
        value={value}
        onChange={(event) => {
          if (!readOnly) onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (readOnly && event.key === "Tab") return;
          onKeyDown(event);
        }}
        readOnly={readOnly}
        spellCheck={false}
        className={`min-h-[300px] w-full resize-none bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none lg:flex-1 ${
          readOnly ? "cursor-default text-zinc-300" : ""
        }`}
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
    <section className="flex h-full min-h-[250px] flex-col bg-white lg:min-h-0">
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
    <section className="flex h-full min-h-[250px] flex-col bg-zinc-950 lg:min-h-0">
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
    <section className="flex h-full min-h-[250px] flex-col bg-zinc-950 lg:min-h-0">
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

function WebRunnerPageContent() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
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
  const [htmlFiles, setHtmlFiles] = useState<UploadedFile[]>([]);
  const [cssFiles, setCssFiles] = useState<UploadedFile[]>([]);
  const [jsFiles, setJsFiles] = useState<UploadedFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<Record<UploadTarget, string>>({
    html: "",
    css: "",
    js: "",
    combined: "",
  });

  const effectiveHtml = htmlFiles.length > 0 ? mergeHtmlFiles(htmlFiles) : html;
  const effectiveCss = cssFiles.length > 0 ? mergeCssFiles(cssFiles) : css;
  const effectiveJs = jsFiles.length > 0 ? mergeJsFiles(jsFiles) : js;
  const htmlModeDocument = htmlFiles.length > 0
    ? injectOptionalCssAndJs(effectiveHtml, cssFiles.length > 0 ? effectiveCss : "", jsFiles.length > 0 ? effectiveJs : "")
    : html;
  const htmlLintSource = mode === "html" && htmlFiles.length > 0 ? htmlModeDocument : effectiveHtml;

  useEffect(() => {
    if (!langParam) return;
    const selectedMode = modes.find((item) => item.value === langParam);
    if (selectedMode) setMode(selectedMode.value);
  }, [langParam]);

  useEffect(() => {
    setHasRun(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== "combined" && mode !== "html" && mode !== "css") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      if (mode === "combined") setPreviewDoc(injectCssAndJs(effectiveHtml, effectiveCss, effectiveJs));
      if (mode === "html") setPreviewDoc(htmlModeDocument);
      if (mode === "css") setPreviewDoc(cssDocument(effectiveCss));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [effectiveCss, effectiveHtml, effectiveJs, htmlModeDocument, mode]);

  useEffect(() => {
    if (mode !== "javascript") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      setConsoleLines([]);
      setConsoleDoc(jsDocument(effectiveJs));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [effectiveJs, mode]);

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
    const timer = window.setTimeout(() => setHtmlLint(lintHtml(htmlLintSource).errors), 800);
    return () => window.clearTimeout(timer);
  }, [htmlLintSource]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCssLint(lintCss(effectiveCss).errors), 800);
    return () => window.clearTimeout(timer);
  }, [effectiveCss]);

  useEffect(() => {
    const timer = window.setTimeout(() => setJsLint(lintJs(effectiveJs).errors), 800);
    return () => window.clearTimeout(timer);
  }, [effectiveJs]);

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
      setPreviewDoc(injectCssAndJs(effectiveHtml, effectiveCss, effectiveJs));
      setPreviewKey((key) => key + 1);
    } else if (mode === "html") {
      setPreviewDoc(htmlModeDocument);
      setPreviewKey((key) => key + 1);
    } else if (mode === "css") {
      setPreviewDoc(cssDocument(effectiveCss));
      setPreviewKey((key) => key + 1);
    } else if (mode === "javascript") {
      setConsoleLines([]);
      setConsoleDoc(jsDocument(effectiveJs));
      setConsoleKey((key) => key + 1);
    }

    if (typeof window !== "undefined") {
      window.setTimeout(() => setRunning(false), 100);
    } else {
      setRunning(false);
    }
  }, [effectiveCss, effectiveHtml, effectiveJs, htmlModeDocument, mode, runTypeScript, running]);

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
      setHtmlFiles([]);
      setCssFiles([]);
      setJsFiles([]);
      setShowUrlBar(false);
      setUrlInput("");
      setMode("combined");
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Failed to load URL");
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, urlLoading]);

  const handleUploadFiles = useCallback(async (target: UploadTarget, selectedFiles: File[]) => {
    const files = selectedFiles.filter(Boolean);
    const acceptedKinds: FileKind[] = target === "combined" ? ["html", "css", "js"] : [target as FileKind];
    const currentCounts: Record<FileKind, number> = {
      html: htmlFiles.length,
      css: cssFiles.length,
      js: jsFiles.length,
    };

    if (files.length === 0) return;
    if (files.length > MAX_FILES_PER_UPLOAD) {
      setUploadErrors((current) => ({ ...current, [target]: "Maximum 5 files per upload" }));
      return;
    }

    const grouped: Record<FileKind, File[]> = { html: [], css: [], js: [] };
    const errors: string[] = [];

    for (const file of files) {
      const kind = getFileKind(file.name);
      if (!kind || !acceptedKinds.includes(kind)) {
        errors.push(`Invalid file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`File too large (max 500KB): ${file.name}`);
        continue;
      }
      grouped[kind].push(file);
    }

    for (const kind of acceptedKinds) {
      if (currentCounts[kind] + grouped[kind].length > MAX_FILES_PER_KIND) {
        setUploadErrors((current) => ({ ...current, [target]: "Maximum 20 files total" }));
        return;
      }
    }

    let htmlReads: UploadedFile[] = [];
    let cssReads: UploadedFile[] = [];
    let jsReads: UploadedFile[] = [];

    try {
      [htmlReads, cssReads, jsReads] = await Promise.all([
        Promise.all(grouped.html.map(readUploadedFile)),
        Promise.all(grouped.css.map(readUploadedFile)),
        Promise.all(grouped.js.map(readUploadedFile)),
      ]);
    } catch (error) {
      setUploadErrors((current) => ({
        ...current,
        [target]: error instanceof Error ? error.message : "Unable to read file",
      }));
      return;
    }

    if (htmlReads.length > 0) setHtmlFiles((current) => [...current, ...htmlReads]);
    if (cssReads.length > 0) setCssFiles((current) => [...current, ...cssReads]);
    if (jsReads.length > 0) setJsFiles((current) => [...current, ...jsReads]);

    setUploadErrors((current) => ({ ...current, [target]: errors.join("; ") }));
  }, [cssFiles.length, htmlFiles.length, jsFiles.length]);

  function removeUploadedFile(kind: FileKind, index: number) {
    const removeAt = (files: UploadedFile[]) => files.filter((_, fileIndex) => fileIndex !== index);
    if (kind === "html") setHtmlFiles(removeAt);
    if (kind === "css") setCssFiles(removeAt);
    if (kind === "js") setJsFiles(removeAt);
  }

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

  function handleReadOnlyEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      runPreview();
    }
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

  const combinedUploadZone = (
    <UploadZone
      accept=".html,.css,.js"
      prompt="Drop .html, .css, or .js files here or click to browse"
      groups={[
        { label: "HTML", kind: "html", files: htmlFiles },
        { label: "CSS", kind: "css", files: cssFiles },
        { label: "JS", kind: "js", files: jsFiles },
      ]}
      error={uploadErrors.combined}
      onFiles={(files) => void handleUploadFiles("combined", files)}
      onRemove={removeUploadedFile}
    />
  );

  const htmlUploadZone = (
    <UploadZone
      accept=".html"
      prompt="Drop .html files here or click to browse"
      groups={[{ label: "HTML", kind: "html", files: htmlFiles }]}
      error={uploadErrors.html}
      onFiles={(files) => void handleUploadFiles("html", files)}
      onRemove={removeUploadedFile}
    />
  );

  const cssUploadZone = (
    <UploadZone
      accept=".css"
      prompt="Drop .css files here or click to browse"
      groups={[{ label: "CSS", kind: "css", files: cssFiles }]}
      error={uploadErrors.css}
      onFiles={(files) => void handleUploadFiles("css", files)}
      onRemove={removeUploadedFile}
    />
  );

  const jsUploadZone = (
    <UploadZone
      accept=".js"
      prompt="Drop .js files here or click to browse"
      groups={[{ label: "JS", kind: "js", files: jsFiles }]}
      error={uploadErrors.js}
      onFiles={(files) => void handleUploadFiles("js", files)}
      onRemove={removeUploadedFile}
    />
  );

  const htmlEditor = (
    <CodeEditor
      label="HTML"
      value={effectiveHtml}
      onChange={setHtml}
      tone="html"
      onKeyDown={htmlFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(html, setHtml, event)}
      lintErrors={htmlLint}
      readOnly={htmlFiles.length > 0}
      onMaximize={() => setModalTarget("html")}
      onNewTab={() => openInNewTab(effectiveHtml)}
    />
  );
  const cssEditor = (
    <CodeEditor
      label="CSS"
      value={effectiveCss}
      onChange={setCss}
      tone="css"
      onKeyDown={cssFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(css, setCss, event)}
      lintErrors={cssLint}
      readOnly={cssFiles.length > 0}
      onMaximize={() => setModalTarget("css")}
      onNewTab={() => openInNewTab(cssDocument(effectiveCss))}
    />
  );
  const jsEditor = (
    <CodeEditor
      label="JS"
      value={effectiveJs}
      onChange={setJs}
      tone="js"
      onKeyDown={jsFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(js, setJs, event)}
      lintErrors={jsLint}
      readOnly={jsFiles.length > 0}
      onMaximize={() => setModalTarget("js")}
      onNewTab={() => openInNewTab(jsDocument(effectiveJs))}
    />
  );

  const editorPane = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
      {mode === "combined" && (
        <>
          {combinedUploadZone}
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
            value={htmlFiles.length > 0 ? htmlModeDocument : html}
            onChange={setHtml}
            tone="html"
            onKeyDown={htmlFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(html, setHtml, event)}
            lintErrors={htmlLint}
            readOnly={htmlFiles.length > 0}
            uploadZone={htmlUploadZone}
            onMaximize={() => setModalTarget("html")}
            onNewTab={() => openInNewTab(htmlFiles.length > 0 ? htmlModeDocument : html)}
          />
          <LintPanel errors={htmlLint} />
        </>
      )}
      {mode === "css" && (
        <>
          <CodeEditor
            label="CSS"
            value={effectiveCss}
            onChange={setCss}
            tone="css"
            onKeyDown={cssFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(css, setCss, event)}
            lintErrors={cssLint}
            readOnly={cssFiles.length > 0}
            uploadZone={cssUploadZone}
            onMaximize={() => setModalTarget("css")}
            onNewTab={() => openInNewTab(cssDocument(effectiveCss))}
          />
          <LintPanel errors={cssLint} />
        </>
      )}
      {mode === "javascript" && (
        <>
          <CodeEditor
            label="JavaScript"
            value={effectiveJs}
            onChange={setJs}
            tone="js"
            onKeyDown={jsFiles.length > 0 ? handleReadOnlyEditorKeyDown : (event) => handleEditorKeyDown(js, setJs, event)}
            lintErrors={jsLint}
            readOnly={jsFiles.length > 0}
            uploadZone={jsUploadZone}
            onMaximize={() => setModalTarget("js")}
            onNewTab={() => openInNewTab(jsDocument(effectiveJs))}
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
      <div className="border-t border-zinc-800 bg-zinc-900 p-3 lg:hidden">
        {runButton}
      </div>
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
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between px-3 py-2">
          <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-zinc-500">
            <Link href="/tools" className="shrink-0 hover:text-zinc-900 dark:hover:text-zinc-100">
              Tools
            </Link>
            <span>/</span>
            <span className="shrink-0">Code Runners</span>
            <span>/</span>
            <span className="truncate">Web Runner</span>
          </nav>

          <div className="flex items-center gap-2">
            {runButton}
            <span className="hidden text-xs text-zinc-400 lg:inline">Ctrl+Enter</span>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 scrollbar-hide">
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

        <div className="hidden items-center gap-3 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800 lg:flex">
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

      <div className="min-h-[560px] overflow-auto lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
        {layout === "horizontal" && (
          <div className="flex h-full flex-col lg:flex-row">
            <div className="flex min-h-[300px] min-w-0 flex-col overflow-hidden border-b border-zinc-200 dark:border-zinc-800 lg:min-h-0 lg:w-1/2 lg:border-b-0 lg:border-r">{editorPane}</div>
            <div className="flex min-h-[250px] min-w-0 flex-col overflow-hidden lg:min-h-0 lg:w-1/2">{outputPane}</div>
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
            <div className="min-h-[300px]">{editorPane}</div>
            {hasRun && <div className="min-h-[500px] border-t border-zinc-200 dark:border-zinc-800">{outputPane}</div>}
          </div>
        )}
      </div>

      {modalTarget === "html" && (
        <ExpandModal
          title="HTML"
          tone="html"
          value={mode === "html" && htmlFiles.length > 0 ? htmlModeDocument : effectiveHtml}
          onChange={setHtml}
          onClose={() => setModalTarget(null)}
          readOnly={htmlFiles.length > 0}
        />
      )}
      {modalTarget === "css" && (
        <ExpandModal
          title="CSS"
          tone="css"
          value={effectiveCss}
          onChange={setCss}
          onClose={() => setModalTarget(null)}
          readOnly={cssFiles.length > 0}
        />
      )}
      {modalTarget === "js" && (
        <ExpandModal
          title="JavaScript"
          tone="js"
          value={effectiveJs}
          onChange={setJs}
          onClose={() => setModalTarget(null)}
          readOnly={jsFiles.length > 0}
        />
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
  readOnly = false,
}: {
  title: string;
  tone: "html" | "css" | "js" | "ts";
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  readOnly?: boolean;
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
    if (readOnly && event.key === "Tab") return;
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
        onChange={(event) => {
          if (!readOnly) onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        autoFocus
        className={`flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm text-zinc-100 outline-none ${readOnly ? "text-zinc-300" : ""}`}
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

export default function WebRunnerPage() {
  return (
    <Suspense fallback={null}>
      <WebRunnerPageContent />
    </Suspense>
  );
}
