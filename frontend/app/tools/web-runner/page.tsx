"use client";

import { useSearchParams } from "next/navigation";
import { DragEvent, KeyboardEvent, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Link2,
  Maximize2,
  PanelLeft,
  PanelTop,
  RefreshCw,
  Square,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { RunButton, TabBar, ToolHeader, ToolShell } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type Layout = "horizontal" | "vertical" | "bottom";
type ConsoleLine = { id: number; type: "log" | "warn" | "error"; text: string; timestamp: string };

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

function injectPreviewNavigation(html: string) {
  const script = `<script>
(() => {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    const anchor = target ? target.closest("a") : null;
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;
    event.preventDefault();
    window.parent.postMessage({ source: "web-runner-preview", type: "navigate", href }, "*");
  });
})();
</script>`;

  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}\n</body>`) : `${html}\n${script}`;
}

function injectErrorHandlers(html: string): string {
  const script = `<script>
(() => {
  window.onerror = (msg, src, line) => {
    window.parent.postMessage({ source: "web-runner-console", type: "error", args: [String(msg) + " (line " + line + ")"] }, "*");
  };
  window.addEventListener("unhandledrejection", (event) => {
    window.parent.postMessage({ source: "web-runner-console", type: "error", args: [String(event.reason)] }, "*");
  });
})();
</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}\n</body>`) : `${html}\n${script}`;
}

function injectBaseTag(html: string): string {
  if (/<base\s+href/i.test(html)) return html;
  const tag = `<base href="about:blank">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/(<head[^>]*>)/i, `$1\n${tag}`) : html;
}

function enhancePreviewDoc(html: string): string {
  return injectErrorHandlers(injectBaseTag(html));
}

function cssDocument(css: string) {
  return enhancePreviewDoc(cssDemoHtml.replace("</head>", `<style>${escapeStyle(css)}</style>\n</head>`));
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

function normalizeHtmlHref(value: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const withoutHash = decoded.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  const parts = withoutQuery.split(/[\\/]/).filter(Boolean);
  return (parts[parts.length - 1] || withoutQuery).trim().toLowerCase();
}

function findHtmlFileByHref(files: UploadedFile[], href: string) {
  const target = normalizeHtmlHref(href);
  if (!target) return null;
  return files.find((file) => normalizeHtmlHref(file.name) === target) || null;
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

const FILE_KIND_TEXT: Record<FileKind, string> = {
  html: "text-orange-400",
  css: "text-blue-400",
  js: "text-yellow-400",
};

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
    <div className="border-b border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
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
      <div className="flex items-center justify-between gap-2">
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
          className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs transition-all duration-200 ${
            dragging
              ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
              : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-emerald-500 hover:bg-emerald-950/20 hover:text-zinc-200"
          }`}
          title={prompt}
        >
          <Upload className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium">Upload</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {groups.map((group) => (
            <span
              key={group.kind}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
            >
              <span className={FILE_KIND_TEXT[group.kind]}>{group.label}</span>
              <span>{group.files.length}/{MAX_FILES_PER_KIND}</span>
            </span>
          ))}
        </div>
      </div>

      {error && <div className="mt-1 text-[11px] font-medium text-red-400">{error}</div>}

      {files.length > 0 && (
        <div className="mt-1 flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
          {files.map((file) => (
            <span
              key={`${file.kind}-${file.index}-${file.name}`}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
            >
              <span className={`mr-0.5 text-[10px] font-bold ${FILE_KIND_TEXT[file.kind]}`}>{file.label}</span>
              <span className="max-w-[80px] truncate">{file.name}</span>
              <span className="text-zinc-500">{formatFileSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemove(file.kind, file.index)}
                className="ml-0.5 text-zinc-600 transition-colors duration-200 hover:text-red-400"
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

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
      <div className="flex items-center border-b border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-xs font-semibold">
        <span className={labelClass}>{label}</span>
        {readOnly && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">merged upload</span>}
        <div className="ml-auto flex items-center gap-1">
          {lintErrors && <LintIndicator errors={lintErrors} />}
          {onMaximize && (
            <button
              type="button"
              title="Maximize editor"
              onClick={onMaximize}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onNewTab && (
            <button
              type="button"
              title="Open in new tab"
              onClick={onNewTab}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-200"
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
        className={`flex-1 min-h-0 w-full resize-none border-0 outline-none bg-zinc-950 text-zinc-100 font-mono text-[13px] leading-relaxed p-4 ${readOnly ? "cursor-default text-zinc-300" : ""}`}
      />
    </section>
  );
}

function LintIndicator({ errors }: { errors: LintError[] }) {
  const [open, setOpen] = useState(false);
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

  if (errorCount === 0 && warnCount === 0) {
    return (
      <span title="No lint issues" className="inline-flex h-6 w-6 items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
    );
  }

  const isError = errorCount > 0;
  const count = isError ? errorCount : warnCount;
  const Icon = isError ? XCircle : AlertTriangle;
  const iconClass = isError ? "text-red-400" : "text-amber-400";

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-lg p-1 transition-colors duration-200 hover:bg-zinc-800 ${iconClass}`}
        title={`${count} lint ${isError ? "error" : "warning"}${count !== 1 ? "s" : ""}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">{count}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-w-xs rounded-xl border border-zinc-700 bg-zinc-800 p-3 shadow-xl">
          <div className="flex flex-col gap-1">
            {errors.map((err, index) => (
              <div
                key={index}
                className={`text-xs font-mono ${err.severity === "error" ? "text-red-400" : "text-amber-400"}`}
              >
                <span className="opacity-70">{err.line}:{err.col}</span> {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

function WebPreviewPanel({
  doc,
  previewKey,
  currentFile,
  canGoBack,
  canGoForward,
  zoom,
  onBack,
  onForward,
  onZoomChange,
  onRefresh,
  onMaximize,
  onNewTab,
}: {
  doc: string;
  previewKey: number;
  currentFile?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  zoom: number;
  onBack?: () => void;
  onForward?: () => void;
  onZoomChange: (zoom: number) => void;
  onRefresh: () => void;
  onMaximize?: () => void;
  onNewTab?: () => void;
}) {
  return (
    <section className="flex flex-col min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm lg:basis-[45%] h-full">
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {onBack && (
            <button
              type="button"
              title="Back"
              disabled={!canGoBack}
              onClick={onBack}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {onForward && (
            <button
              type="button"
              title="Forward"
              disabled={!canGoForward}
              onClick={onForward}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Refresh preview"
            onClick={onRefresh}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <span className="ml-1 font-semibold text-zinc-100">Preview</span>
          {currentFile && (
            <span className="ml-1 truncate rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300" title={currentFile}>
              {currentFile}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <select
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            title="Zoom level"
            className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-300 outline-none transition-colors duration-200 hover:bg-zinc-800 focus:border-emerald-500"
          >
            {ZOOM_LEVELS.map((level) => (
              <option key={level} value={level}>{Math.round(level * 100)}%</option>
            ))}
          </select>
          {onMaximize && (
            <button
              type="button"
              title="Maximize preview"
              onClick={onMaximize}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onNewTab && (
            <button
              type="button"
              title="Open in new tab"
              onClick={onNewTab}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden bg-white">
        <iframe
          key={previewKey}
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          srcDoc={doc}
          style={{
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
          className="block border-0 bg-white"
        />
      </div>
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
    <section className="flex flex-col min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm lg:basis-[45%] h-full">
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
        <span className="text-sm font-semibold text-zinc-100">Console</span>
        <button type="button" onClick={clearConsole} className="rounded-full px-2 py-1 text-xs text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100">
          Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100">
        {consoleLines.length === 0 ? (
          <p className="flex h-full items-center justify-center text-zinc-600">Run code to see output</p>
        ) : (
          <div className="space-y-1">
            {consoleLines.map((line) => {
              const prefixClass =
                line.type === "error" ? "text-red-400" : line.type === "warn" ? "text-amber-400" : "text-zinc-300";
              return (
                <div key={line.id} className="flex items-start gap-2">
                  <span className="shrink-0 text-zinc-600">{line.timestamp}</span>
                  <span className={`shrink-0 ${prefixClass}`}>[{line.type}]</span>
                  <span className={prefixClass}>{line.text}</span>
                </div>
              );
            })}
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
    <section className="flex flex-col min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm lg:basis-[45%] h-full">
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-zinc-100">Output</span>
        {result && <span className="text-xs text-zinc-500">exit {result.exit_code ?? "-"}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100">
        {!hasRun && <p className="flex h-full items-center justify-center text-zinc-600">Run code to see output</p>}
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
  const [currentPreviewFile, setCurrentPreviewFile] = useState<string | null>(null);
  const [previewHistory, setPreviewHistory] = useState<(string | null)[]>([]);
  const [previewForward, setPreviewForward] = useState<(string | null)[]>([]);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [uploadErrors, setUploadErrors] = useState<Record<UploadTarget, string>>({
    html: "",
    css: "",
    js: "",
    combined: "",
  });

  const effectiveHtml = htmlFiles.length > 0 ? mergeHtmlFiles(htmlFiles) : html;
  const effectiveCss = cssFiles.length > 0 ? mergeCssFiles(cssFiles) : css;
  const effectiveJs = jsFiles.length > 0 ? mergeJsFiles(jsFiles) : js;
  const activePreviewHtmlFile = currentPreviewFile ? htmlFiles.find((file) => file.name === currentPreviewFile) || null : null;
  const previewHtmlContent = activePreviewHtmlFile?.content || effectiveHtml;
  const shouldRouteUploadedHtml = htmlFiles.length > 1 && (mode === "combined" || mode === "html");
  const htmlModeDocument = htmlFiles.length > 0
    ? injectOptionalCssAndJs(previewHtmlContent, cssFiles.length > 0 ? effectiveCss : "", jsFiles.length > 0 ? effectiveJs : "")
    : html;
  const routedHtmlModeDocument = enhancePreviewDoc(shouldRouteUploadedHtml ? injectPreviewNavigation(htmlModeDocument) : htmlModeDocument);
  const combinedHtmlDocument = enhancePreviewDoc(htmlFiles.length > 0
    ? injectPreviewNavigation(injectCssAndJs(previewHtmlContent, effectiveCss, effectiveJs))
    : injectCssAndJs(effectiveHtml, effectiveCss, effectiveJs));
  const previewFileLabel = activePreviewHtmlFile?.name || (htmlFiles.length > 1 ? "Merged HTML" : htmlFiles[0]?.name);
  const htmlLintSource = mode === "html" && htmlFiles.length > 0 ? htmlModeDocument : effectiveHtml;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("webrunner_state");
      if (!saved) return;
      const data = JSON.parse(saved);
      if (typeof data.html === "string") setHtml(data.html);
      if (typeof data.css === "string") setCss(data.css);
      if (typeof data.js === "string") setJs(data.js);
      if (typeof data.ts === "string") setTs(data.ts);
      if (Array.isArray(data.htmlFiles)) setHtmlFiles(data.htmlFiles);
      if (Array.isArray(data.cssFiles)) setCssFiles(data.cssFiles);
      if (Array.isArray(data.jsFiles)) setJsFiles(data.jsFiles);
      if (typeof data.mode === "string") setMode(data.mode as Mode);
    } catch {
      // ignore corrupt state
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          "webrunner_state",
          JSON.stringify({ html, css, js, ts, htmlFiles, cssFiles, jsFiles, mode }),
        );
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [html, css, js, ts, htmlFiles, cssFiles, jsFiles, mode]);

  useEffect(() => {
    if (!langParam) return;
    const selectedMode = modes.find((item) => item.value === langParam);
    if (selectedMode) setMode(selectedMode.value);
  }, [langParam]);

  useEffect(() => {
    setHasRun(false);
  }, [mode]);

  useEffect(() => {
    if (htmlFiles.length === 0) {
      setCurrentPreviewFile(null);
      setPreviewHistory([]);
      setPreviewForward([]);
      return;
    }
    if (currentPreviewFile && !htmlFiles.some((file) => file.name === currentPreviewFile)) {
      setCurrentPreviewFile(null);
    }
    setPreviewHistory((current) => current.filter((fileName) => fileName === null || htmlFiles.some((file) => file.name === fileName)));
    setPreviewForward((current) => current.filter((fileName) => fileName === null || htmlFiles.some((file) => file.name === fileName)));
  }, [currentPreviewFile, htmlFiles]);

  useEffect(() => {
    if (mode !== "combined" && mode !== "html" && mode !== "css") return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      if (mode === "combined") setPreviewDoc(combinedHtmlDocument);
      if (mode === "html") setPreviewDoc(routedHtmlModeDocument);
      if (mode === "css") setPreviewDoc(cssDocument(effectiveCss));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [combinedHtmlDocument, effectiveCss, routedHtmlModeDocument, mode]);

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
      if (!data || typeof data !== "object") return;

      if (data.type === "navigate" && typeof data.href === "string" && shouldRouteUploadedHtml) {
        const targetFile = findHtmlFileByHref(htmlFiles, data.href);
        if (!targetFile) return;
        setPreviewHistory((current) => [...current, currentPreviewFile]);
        setPreviewForward([]);
        setCurrentPreviewFile(targetFile.name);
        setHasRun(true);
        return;
      }

      if (data.source !== "web-runner-console") return;
      const type = data.type === "warn" || data.type === "error" ? data.type : "log";
      const text = Array.isArray(data.args) ? data.args.join(" ") : "";
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      consoleIdRef.current += 1;
      setConsoleLines((current) => [...current, { id: consoleIdRef.current, type, text, timestamp }]);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentPreviewFile, htmlFiles, shouldRouteUploadedHtml]);

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
      setPreviewDoc(combinedHtmlDocument);
      setPreviewKey((key) => key + 1);
    } else if (mode === "html") {
      setPreviewDoc(routedHtmlModeDocument);
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
  }, [combinedHtmlDocument, effectiveCss, effectiveJs, mode, routedHtmlModeDocument, runTypeScript, running]);

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

  function openPreviewInNewTab() {
    if (typeof window === "undefined") return;
    const blob = new Blob([previewDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank");
    if (!opened) {
      URL.revokeObjectURL(url);
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function refreshPreview() {
    setPreviewKey((key) => key + 1);
  }

  function goBackPreviewFile() {
    if (previewHistory.length === 0) return;
    const previous = previewHistory[previewHistory.length - 1];
    setPreviewForward((current) => [...current, currentPreviewFile]);
    setCurrentPreviewFile(previous);
    setPreviewHistory((current) => current.slice(0, -1));
    setHasRun(true);
  }

  function goForwardPreviewFile() {
    if (previewForward.length === 0) return;
    const next = previewForward[previewForward.length - 1];
    setPreviewHistory((current) => [...current, currentPreviewFile]);
    setCurrentPreviewFile(next);
    setPreviewForward((current) => current.slice(0, -1));
    setHasRun(true);
  }

  const runButton = (
    <RunButton running={running} onClick={runPreview} />
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
    <section className="flex flex-col min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm lg:basis-[55%] h-full">
      {mode === "combined" && (
        <>
          {combinedUploadZone}
          {htmlEditor}
          {cssEditor}
          {jsEditor}
        </>
      )}
      {mode === "html" && (
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
      )}
      {mode === "css" && (
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
      )}
      {mode === "javascript" && (
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
          <details className="border-t border-zinc-800 bg-zinc-900 p-4">
            <summary className="cursor-pointer text-sm font-medium text-zinc-300 transition-colors duration-200 hover:text-zinc-100">Standard Input (stdin)</summary>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              onKeyDown={handleStdinKeyDown}
              placeholder="Optional input"
              className="mt-3 min-h-[90px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </details>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
            {runButton}
            <span className="text-xs text-zinc-500">Ctrl+Enter to run</span>
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
        currentFile={mode === "combined" || mode === "html" ? previewFileLabel : undefined}
        canGoBack={previewHistory.length > 0}
        canGoForward={previewForward.length > 0}
        zoom={previewZoom}
        onBack={goBackPreviewFile}
        onForward={goForwardPreviewFile}
        onZoomChange={setPreviewZoom}
        onRefresh={refreshPreview}
        onMaximize={() => setModalTarget("preview")}
        onNewTab={openPreviewInNewTab}
      />
    );

  return (
    <ToolShell className="flex min-h-screen max-w-none flex-col px-0 py-0 sm:px-0 sm:py-0">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6">
          <ToolHeader
            breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Code Runners" }, { label: "Web Runner" }]}
            title="Web Runner"
            description="Run HTML, CSS, and JavaScript with a live preview. Supports combined and solo modes."
            actions={(
              <div className="flex items-center gap-2">
              {runButton}
              <span className="hidden text-xs text-zinc-500 lg:inline">Ctrl+Enter</span>
              </div>
            )}
          />

        <TabBar
          tabs={modes.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))}
          active={mode}
          onChange={(value) => setMode(value as Mode)}
          className="border-b border-zinc-200 pb-3 dark:border-zinc-800"
        />

        <div className="hidden items-center gap-3 lg:flex">
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
                  className={`rounded-lg p-2 transition-colors duration-200 ${
                    layout === item.value
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors duration-200 hover:bg-zinc-800"
          >
            <Link2 className="h-3.5 w-3.5" />
            Import URL
          </button>
        </div>
        </div>
      </header>

      {showUrlBar && (
        <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
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
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="button"
            onClick={() => void loadUrl()}
            disabled={urlLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-50"
          >
            {urlLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {urlLoading ? "Loading..." : "Load"}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlBar(false)}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
          {urlError && <span className="text-xs text-red-500">{urlError}</span>}
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl flex-1 overflow-auto px-3 py-3 sm:px-6 lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
        {layout === "horizontal" && (
          <div className="flex flex-col gap-4 lg:flex-row h-[calc(100vh-12rem)] min-h-[500px]">
            {editorPane}
            {outputPane}
          </div>
        )}

        {layout === "vertical" && (
          <div className="flex h-full flex-col gap-5">
            <div className="h-1/2 min-h-0 overflow-hidden">{editorPane}</div>
            <div className="h-1/2 min-h-0 overflow-hidden">{outputPane}</div>
          </div>
        )}

        {layout === "bottom" && (
          <div className="flex h-full flex-col gap-5 overflow-auto">
            <div className="min-h-[320px]">{editorPane}</div>
            {hasRun && <div className="min-h-[500px]">{outputPane}</div>}
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
    </ToolShell>
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
