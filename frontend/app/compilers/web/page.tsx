"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  FileCode,
  Loader2,
  Maximize,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type FileEntry = { name: string; content: string };
type MaximizedPanel = "html" | "css" | "js" | null;
type ConsoleEntry = {
  method: "log" | "error" | "warn";
  text: string;
  timestamp: string;
};
type TypeScriptRunResult = {
  stdout: string;
  stderr: string;
  time: string;
  exitCode: string;
  status: string;
};

const HTML_STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Start building something amazing.</p>
  <button onclick="this.textContent='Clicked!'">Click me</button>
</body>
</html>`;

const CSS_STARTER = `/* Styles */
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  padding: 2rem;
}

h1 {
  color: #10b981;
  font-size: 2rem;
}

button {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #059669;
}`;

const JS_STARTER = `// JavaScript
console.log('Hello, World!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');

  const btn = document.querySelector('button');
  if (btn) {
    btn.addEventListener('click', () => {
      console.log('Button clicked!');
    });
  }
});`;

const TS_STARTER = `// TypeScript
const message: string = 'Hello, TypeScript!';
console.log(message);

interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 30 };
console.log(\`User: \${user.name}, Age: \${user.age}\`);`;

const PREVIEW_PLACEHOLDER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root { color-scheme: light; }
    html, body {
      margin: 0;
      min-height: 100%;
      font-family: system-ui, sans-serif;
      background: #ffffff;
      color: #475569;
    }
    body {
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    .panel {
      text-align: center;
      max-width: 28rem;
      padding: 2rem;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      color: #0f172a;
    }
    p {
      margin: 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Click Run to see preview</h1>
    <p>This shell is ready for HTML, CSS, JavaScript, and TypeScript work.</p>
  </div>
</body>
</html>`;

const WEB_BADGES: Record<"html" | "css" | "js" | "ts", { abbr: string; bg: string; color: string }> = {
  html: { abbr: "HTML", bg: "#e34c26", color: "#fff" },
  css: { abbr: "CSS", bg: "#264de4", color: "#fff" },
  js: { abbr: "JS", bg: "#f1e05a", color: "#000" },
  ts: { abbr: "TS", bg: "#3178c6", color: "#fff" },
};

const modeButtons: Array<{ mode: Mode; label: string }> = [
  { mode: "combined", label: "Combined" },
  { mode: "html", label: "HTML only" },
  { mode: "css", label: "CSS only" },
  { mode: "javascript", label: "JavaScript" },
  { mode: "typescript", label: "TypeScript" },
];

const MODE_LABELS: Record<Exclude<Mode, "combined">, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JAVASCRIPT",
  typescript: "TYPESCRIPT",
};

const MODE_BADGES: Record<Exclude<Mode, "combined">, keyof typeof WEB_BADGES> = {
  html: "html",
  css: "css",
  javascript: "js",
  typescript: "ts",
};

const PANEL_BADGES: Record<"html" | "css" | "js", keyof typeof WEB_BADGES> = {
  html: "html",
  css: "css",
  js: "js",
};

const SINGLE_STARTERS: Record<Exclude<Mode, "combined">, string> = {
  html: HTML_STARTER,
  css: CSS_STARTER,
  javascript: JS_STARTER,
  typescript: TS_STARTER,
};

const SINGLE_NAMES: Record<Exclude<Mode, "combined">, string> = {
  html: "index.html",
  css: "styles.css",
  javascript: "script.js",
  typescript: "main.ts",
};

const SINGLE_ACCEPTS: Record<Exclude<Mode, "combined">, string> = {
  html: ".html",
  css: ".css",
  javascript: ".js",
  typescript: ".ts",
};

const MAX_PANEL_FILES = 20;
const MAX_UPLOAD_FILE_SIZE = 500 * 1024;

const CONSOLE_CAPTURE_SCRIPT = `(function() {
  const orig = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  ['log', 'error', 'warn'].forEach(function(method) {
    console[method] = function() {
      orig[method].apply(console, arguments);
      const args = Array.from(arguments).map(function(a) {
        try {
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch (e) {
          return String(a);
        }
      });
      window.parent.postMessage({
        type: 'devtools-console',
        method: method,
        text: args.join(' ')
      }, '*');
    };
  });
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'devtools-console',
      method: 'error',
      text: e.message + ' (line ' + e.lineno + ')'
    }, '*');
  });
})();`;

const escapeTagContent = (content: string, tag: "script" | "style") =>
  content.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);

const prependIntoTag = (html: string, tag: "body", snippet: string) => {
  const openPattern = new RegExp(`<${tag}[^>]*>`, "i");
  if (openPattern.test(html)) {
    return html.replace(openPattern, (match) => `${match}${snippet}`);
  }

  const headClosePattern = /<\/head>/i;
  if (headClosePattern.test(html)) {
    return html.replace(headClosePattern, `</head><body>${snippet}`);
  }

  return html;
};

const joinFileContents = (files: FileEntry[]) =>
  files.length === 1 ? files[0]?.content || "" : files.map((file) => file.content).join("\n");

const extractBodyContent = (html: string) => {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];

  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<html\b[^>]*>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body\b[^>]*>/gi, "")
    .replace(/<\/body>/gi, "");
};

const injectIntoHead = (html: string, snippet: string) => {
  if (!snippet) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${snippet}</head>`);
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (match) => `${match}${snippet}`);
  if (/<body\b[^>]*>/i.test(html)) return html.replace(/<body\b[^>]*>/i, (match) => `<head>${snippet}</head>${match}`);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${snippet}</head>`);
  return `<head>${snippet}</head>${html}`;
};

const injectIntoBodyEnd = (html: string, snippet: string) => {
  if (!snippet) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `<body>${snippet}</body></html>`);
  if (/<body\b[^>]*>/i.test(html)) return html.replace(/<body\b[^>]*>/i, (match) => `${match}${snippet}`);
  return `${html}<body>${snippet}</body>`;
};

const buildCombinedPreviewDoc = (htmlFiles: FileEntry[], cssFiles: FileEntry[], jsFiles: FileEntry[]) => {
  const htmlContents = htmlFiles.map((file) => file.content).filter((content) => content.trim().length > 0);
  const combinedCss = cssFiles.map((file) => file.content).join("\n");
  const combinedJs = jsFiles.map((file) => file.content).join("\n");
  const styleBlock = combinedCss.trim() ? `<style>${escapeTagContent(combinedCss, "style")}</style>` : "";
  const consoleBlock = `<script>${CONSOLE_CAPTURE_SCRIPT}</script>`;
  const scriptBlock = combinedJs.trim() ? `<script>${escapeTagContent(combinedJs, "script")}</script>` : "";

  if (htmlContents.length === 0) {
    return `<!DOCTYPE html><html><head>${styleBlock}</head><body>${consoleBlock}${scriptBlock}</body></html>`;
  }

  const baseIndexWithDoctype = htmlContents.findIndex((content) => /<!doctype/i.test(content));
  const baseIndexWithHtml = htmlContents.findIndex((content) => /<html\b/i.test(content));
  const baseIndex = baseIndexWithDoctype >= 0 ? baseIndexWithDoctype : baseIndexWithHtml;

  if (baseIndex >= 0) {
    const extraBody = htmlContents
      .filter((_, index) => index !== baseIndex)
      .map(extractBodyContent)
      .filter((content) => content.trim().length > 0)
      .join("\n");
    let doc = injectIntoHead(htmlContents[baseIndex], styleBlock);
    doc = injectIntoBodyEnd(doc, [extraBody, consoleBlock, scriptBlock].filter(Boolean).join("\n"));
    return doc;
  }

  return `<!DOCTYPE html><html><head>${styleBlock}</head><body>${htmlContents.join("\n")}${consoleBlock}${scriptBlock}</body></html>`;
};

const buildSingleHtmlPreviewDoc = (files: FileEntry[]) => {
  const mergedHtml = joinFileContents(files);
  const consoleBlock = `<script>${CONSOLE_CAPTURE_SCRIPT}</script>`;

  if (/<\!doctype/i.test(mergedHtml)) {
    return prependIntoTag(mergedHtml, "body", consoleBlock);
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${consoleBlock}${mergedHtml}</body></html>`;
};

const buildCssPreviewDoc = (files: FileEntry[]) => {
  const combinedCss = joinFileContents(files);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 32px; font-family: system-ui, sans-serif; color: #111827; background: #ffffff; }
    main { max-width: 860px; margin: 0 auto; display: grid; gap: 22px; }
    section { display: grid; gap: 12px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .preview-card { padding: 18px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; }
    .button-secondary { background: transparent; color: #0f172a; border: 1px solid #cbd5e1; }
    input, select { min-height: 36px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    blockquote { margin: 0; padding-left: 14px; border-left: 4px solid #10b981; color: #475569; }
    code { padding: 2px 5px; border-radius: 4px; background: #e2e8f0; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 700; }
  </style>
  <style>${escapeTagContent(combinedCss, "style")}</style>
</head>
<body>
  <main>
    <section>
      <h1>Style Preview</h1>
      <h2>Interface Components</h2>
      <h3>Typography and Controls</h3>
      <p>This paragraph gives your CSS natural text to style across spacing, color, size, and line height.</p>
      <p>Another paragraph includes an <a href="#">example link</a> and an inline <code>code</code> element.</p>
    </section>

    <section class="row">
      <button type="button">Primary Button</button>
      <button type="button" class="button-secondary">Secondary Button</button>
      <span class="badge">Preview Badge</span>
      <span class="badge">Pill Label</span>
    </section>

    <section class="preview-card">
      <h2>Form Elements</h2>
      <div class="row">
        <input type="text" placeholder="Text input field" />
        <select>
          <option>Dropdown option</option>
          <option>Second option</option>
        </select>
      </div>
    </section>

    <section class="preview-card">
      <h2>Lists</h2>
      <ul>
        <li>Unordered item one</li>
        <li>Unordered item two</li>
      </ul>
      <ol>
        <li>Ordered item one</li>
        <li>Ordered item two</li>
      </ol>
    </section>

    <blockquote>Blockquote content for border, spacing, and quote styles.</blockquote>

    <section class="preview-card">
      <h2>Data Table</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Status</th><th>Score</th></tr>
        </thead>
        <tbody>
          <tr><td>Alpha</td><td>Ready</td><td>98</td></tr>
          <tr><td>Beta</td><td>Pending</td><td>84</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
};

const buildSingleJsPreviewDoc = (files: FileEntry[]) => {
  const combinedJs = joinFileContents(files);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><script>${CONSOLE_CAPTURE_SCRIPT}</script><script>${escapeTagContent(combinedJs, "script")}</script></body></html>`;
};

const readRunField = (data: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
};

export default function WebCompilerPage() {
  const [mode, setMode] = useState<Mode>("combined");

  const [htmlFiles, setHtmlFiles] = useState<FileEntry[]>([{ name: "index.html", content: HTML_STARTER }]);
  const [cssFiles, setCssFiles] = useState<FileEntry[]>([{ name: "styles.css", content: CSS_STARTER }]);
  const [jsFiles, setJsFiles] = useState<FileEntry[]>([{ name: "script.js", content: JS_STARTER }]);
  const [activeHtml, setActiveHtml] = useState(0);
  const [activeCss, setActiveCss] = useState(0);
  const [activeJs, setActiveJs] = useState(0);
  const [maximized, setMaximized] = useState<MaximizedPanel>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [previewSrc, setPreviewSrc] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [responsive, setResponsive] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  const [singleFiles, setSingleFiles] = useState<FileEntry[]>([{ name: "index.html", content: HTML_STARTER }]);
  const [activeSingle, setActiveSingle] = useState(0);
  const [singleOutput, setSingleOutput] = useState("");
  const [singlePreviewKey, setSinglePreviewKey] = useState(0);
  const [isSingleRunning, setIsSingleRunning] = useState(false);
  const [typeScriptRunResult, setTypeScriptRunResult] = useState<TypeScriptRunResult | null>(null);
  const [splitPos, setSplitPos] = useState(58);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const splitDragStartY = useRef(0);
  const splitDragStartPos = useRef(58);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const previewSrcRef = useRef("");
  const singleRunnerFrameRef = useRef<HTMLIFrameElement>(null);

  const uploadHtmlRef = useRef<HTMLInputElement>(null);
  const uploadCssRef = useRef<HTMLInputElement>(null);
  const uploadJsRef = useRef<HTMLInputElement>(null);
  const uploadSingleRef = useRef<HTMLInputElement>(null);

  const editorBackground = isDark ? "#1e1e1e" : "#ffffff";
  const editorText = isDark ? "#d4d4d4" : "#1e1e1e";
  const outputBackground = isDark ? "#161616" : "#f5f5f5";
  const outputText = isDark ? "#d4d4d4" : "#1e1e1e";
  const hasCombinedPreview = Boolean(previewSrc || previewSrcRef.current);
  const isNarrowLayout = viewportWidth <= 768;
  const isMobileLayout = viewportWidth <= 480;

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted-foreground)",
  };

  useEffect(() => {
    document.title = "Web Compiler — DevTools";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    if (m === "combine") {
      setMode("combined");
    } else if (m && ["combined", "html", "css", "javascript", "typescript"].includes(m)) {
      setMode(m as Mode);
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "devtools-theme" || event.key === "theme") updateTheme();
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);
    window.addEventListener("storage", handleStorage);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (mode === "combined") return;
    setSingleFiles([{ name: SINGLE_NAMES[mode], content: SINGLE_STARTERS[mode] }]);
    setActiveSingle(0);
    setSingleOutput("");
    setConsoleEntries([]);
    setTypeScriptRunResult(null);
  }, [mode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const delta = e.clientY - splitDragStartY.current;
      const pctDelta = (delta / rect.height) * 100;
      setSplitPos(Math.min(75, Math.max(25, splitDragStartPos.current + pctDelta)));
    };
    const handleMouseUp = () => setIsDraggingSplit(false);
    if (isDraggingSplit) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; method?: ConsoleEntry["method"]; text?: string } | null;
      if (!data || data.type !== "devtools-console") return;
      if (data.method !== "log" && data.method !== "error" && data.method !== "warn") return;
      if (typeof data.text !== "string") return;
      const { method, text } = data;
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setConsoleEntries((prev) => [...prev, { method, text, timestamp }]);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runCombinedPreview = React.useCallback(() => {
    const finalDoc = buildCombinedPreviewDoc(htmlFiles, cssFiles, jsFiles);
    previewSrcRef.current = finalDoc;
    setConsoleEntries([]);
    setPreviewSrc(finalDoc);
    setPreviewReloadKey((value) => value + 1);
  }, [htmlFiles, cssFiles, jsFiles]);

  const openFullscreen = () => {
    setIsFullscreen(true);
    setFullscreenVisible(false);
    requestAnimationFrame(() => setFullscreenVisible(true));
  };

  const closeFullscreen = () => {
    setFullscreenVisible(false);
    window.setTimeout(() => setIsFullscreen(false), 150);
  };

  const IconBtn = ({
    onClick,
    title,
    children,
    disabled,
  }: {
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: "none",
        backgroundColor: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "var(--muted-foreground)",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = "var(--muted)";
          e.currentTarget.style.color = "var(--foreground)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--muted-foreground)";
      }}
    >
      {children}
    </button>
  );

  const openUrl = (next: Mode) => {
    const value = next === "combined" ? "combine" : next;
    window.history.replaceState(null, "", `/compilers/web?mode=${value}`);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    openUrl(next);
  };

  const updatePanelContent = (panel: "html" | "css" | "js", content: string) => {
    if (panel === "html") {
      setHtmlFiles((prev) => {
        const next = [...prev];
        next[activeHtml] = { ...next[activeHtml], content };
        return next;
      });
    } else if (panel === "css") {
      setCssFiles((prev) => {
        const next = [...prev];
        next[activeCss] = { ...next[activeCss], content };
        return next;
      });
    } else {
      setJsFiles((prev) => {
        const next = [...prev];
        next[activeJs] = { ...next[activeJs], content };
        return next;
      });
    }
  };

  const clearPanelContent = (panel: "html" | "css" | "js") => updatePanelContent(panel, "");

  const addCombinedFile = (panel: "html" | "css" | "js") => {
    if (panel === "html") {
      setHtmlFiles((prev) => {
        if (prev.length >= 20) return prev;
        const next = [...prev, { name: `index${prev.length + 1}.html`, content: "" }];
        setActiveHtml(next.length - 1);
        return next;
      });
    } else if (panel === "css") {
      setCssFiles((prev) => {
        if (prev.length >= 20) return prev;
        const next = [...prev, { name: `styles${prev.length + 1}.css`, content: "" }];
        setActiveCss(next.length - 1);
        return next;
      });
    } else {
      setJsFiles((prev) => {
        if (prev.length >= 20) return prev;
        const next = [...prev, { name: `script${prev.length + 1}.js`, content: "" }];
        setActiveJs(next.length - 1);
        return next;
      });
    }
  };

  const removeCombinedFile = (panel: "html" | "css" | "js", index: number) => {
    if (panel === "html") {
      setHtmlFiles((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        setActiveHtml(Math.min(activeHtml, next.length - 1));
        return next;
      });
    } else if (panel === "css") {
      setCssFiles((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        setActiveCss(Math.min(activeCss, next.length - 1));
        return next;
      });
    } else {
      setJsFiles((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        setActiveJs(Math.min(activeJs, next.length - 1));
        return next;
      });
    }
  };

  const togglePanelCollapse = (panel: "html" | "css" | "js") => {
    if (maximized === panel) setMaximized(null);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
        return next;
      }
      if (next.size >= 2) return prev;
      next.add(panel);
      return next;
    });
  };

  const toggleMaximized = (panel: MaximizedPanel) => {
    setMaximized((prev) => (prev === panel ? null : panel));
    if (panel) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(panel);
        return next;
      });
    }
  };

  const handleUploadClick = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const uploadToPanel = async (panel: "html" | "css" | "js", files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const acceptedFiles: FileEntry[] = [];
    let skippedLarge = 0;

    for (const file of selectedFiles) {
      if (file.size > MAX_UPLOAD_FILE_SIZE) {
        skippedLarge += 1;
        continue;
      }

      try {
        const content = await readFile(file);
        acceptedFiles.push({ name: file.name, content });
      } catch {
        continue;
      }
    }

    const panelCount =
      panel === "html" ? htmlFiles.length : panel === "css" ? cssFiles.length : jsFiles.length;
    const remainingSlots = MAX_PANEL_FILES - panelCount;
    const skippedCount = Math.max(0, acceptedFiles.length - Math.max(0, remainingSlots));

    if (panel === "html") {
      setHtmlFiles((prev) => {
        const remaining = MAX_PANEL_FILES - prev.length;
        if (remaining <= 0) return prev;
        const additions = acceptedFiles.slice(0, remaining);
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions];
        setActiveHtml(prev.length);
        return next;
      });
    } else if (panel === "css") {
      setCssFiles((prev) => {
        const remaining = MAX_PANEL_FILES - prev.length;
        if (remaining <= 0) return prev;
        const additions = acceptedFiles.slice(0, remaining);
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions];
        setActiveCss(prev.length);
        return next;
      });
    } else {
      setJsFiles((prev) => {
        const remaining = MAX_PANEL_FILES - prev.length;
        if (remaining <= 0) return prev;
        const additions = acceptedFiles.slice(0, remaining);
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions];
        setActiveJs(prev.length);
        return next;
      });
    }

    if (skippedLarge > 0 || skippedCount > 0) {
      window.alert("Some files were skipped. Each panel supports up to 20 files, and files larger than 500KB are ignored.");
    }
  };

  const runSingleMode = React.useCallback(async () => {
    if (mode === "combined") return;
    if (mode === "typescript" && isSingleRunning) return;

    setConsoleEntries([]);
    setTypeScriptRunResult(null);

    if (mode === "html") {
      const doc = buildSingleHtmlPreviewDoc(singleFiles);
      setSingleOutput(doc);
      setSinglePreviewKey((value) => value + 1);
      return;
    }

    if (mode === "css") {
      const doc = buildCssPreviewDoc(singleFiles);
      setSingleOutput(doc);
      setSinglePreviewKey((value) => value + 1);
      return;
    }

    if (mode === "javascript") {
      const doc = buildSingleJsPreviewDoc(singleFiles);
      setSingleOutput(doc);
      setSinglePreviewKey((value) => value + 1);
      return;
    }

    setIsSingleRunning(true);
    setSingleOutput("");
    setSinglePreviewKey((value) => value + 1);

    try {
      const response = await fetch("/api/tools/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "typescript",
          version: "3.7.4",
          code: joinFileContents(singleFiles),
          stdin: "",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const stdout = readRunField(data, ["stdout", "output"]);
      const stderr = readRunField(data, ["stderr", "compile_output", "compile_stderr", "message"]);
      const fallbackStderr = response.ok ? "" : `Run failed with status ${response.status}`;
      const time = readRunField(data, ["wall_time", "cpu_time"]) || "-";
      const exitCodeValue = data.exit_code;
      const exitCode =
        typeof exitCodeValue === "number" || typeof exitCodeValue === "string"
          ? String(exitCodeValue)
          : stderr || fallbackStderr
          ? "1"
          : "0";
      const status = readRunField(data, ["status_description", "status"]) || (response.ok ? "completed" : "error");
      const finalStderr = stderr || fallbackStderr;

      setTypeScriptRunResult({
        stdout,
        stderr: finalStderr,
        time,
        exitCode,
        status,
      });
      setSingleOutput([stdout, finalStderr].filter(Boolean).join("\n"));
    } catch {
      const result = {
        stdout: "",
        stderr: "Failed to connect to execution service.",
        time: "-",
        exitCode: "1",
        status: "Network Error",
      };
      setTypeScriptRunResult(result);
      setSingleOutput(result.stderr);
    } finally {
      setIsSingleRunning(false);
    }
  }, [isSingleRunning, mode, singleFiles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      if (mode === "combined") {
        runCombinedPreview();
      } else {
        void runSingleMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode, runCombinedPreview, runSingleMode]);

  const uploadToSingle = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const acceptedFiles: FileEntry[] = [];
    let skippedLarge = 0;

    for (const file of selectedFiles) {
      if (file.size > MAX_UPLOAD_FILE_SIZE) {
        skippedLarge += 1;
        continue;
      }

      try {
        const content = await readFile(file);
        acceptedFiles.push({ name: file.name, content });
      } catch {
        continue;
      }
    }

    const remainingSlots = MAX_PANEL_FILES - singleFiles.length;
    const skippedCount = Math.max(0, acceptedFiles.length - Math.max(0, remainingSlots));

    setSingleFiles((prev) => {
      const remaining = MAX_PANEL_FILES - prev.length;
      if (remaining <= 0) return prev;
      const additions = acceptedFiles.slice(0, remaining);
      if (additions.length === 0) return prev;
      const next = [...prev, ...additions];
      setActiveSingle(prev.length);
      return next;
    });

    if (skippedLarge > 0 || skippedCount > 0) {
      window.alert("Some files were skipped. Single modes support up to 20 files, and files larger than 500KB are ignored.");
    }
  };

  const handleSingleContent = (content: string) => {
    setSingleFiles((prev) => {
      const next = [...prev];
      next[activeSingle] = { ...next[activeSingle], content };
      return next;
    });
  };

  const handleSingleUpload = () => {
    uploadSingleRef.current?.click();
  };

  const startSplitDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    splitDragStartY.current = e.clientY;
    splitDragStartPos.current = splitPos;
  };

  const setModeButtonHover = (e: React.MouseEvent<HTMLButtonElement>, active: boolean) => {
    if (active) return;
    e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--muted) 60%, transparent)";
    e.currentTarget.style.color = "var(--foreground)";
  };

  const clearModeButtonHover = (e: React.MouseEvent<HTMLButtonElement>, active: boolean) => {
    if (active) return;
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "var(--muted-foreground)";
  };

  const handleEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, target: "html" | "css" | "js" | "single") => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const start = e.currentTarget.selectionStart;
    const end = e.currentTarget.selectionEnd;
    const current = e.currentTarget.value;
    const next = `${current.substring(0, start)}  ${current.substring(end)}`;
    if (target === "single") {
      handleSingleContent(next);
    } else {
      updatePanelContent(target, next);
    }
    requestAnimationFrame(() => {
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
    });
  };

  const combinedPreviewDoc = previewSrc || previewSrcRef.current || PREVIEW_PLACEHOLDER;
  const singlePreviewDoc = singleOutput || PREVIEW_PLACEHOLDER;
  const errorCount = consoleEntries.filter((entry) => entry.method === "error").length;

  const renderConsoleLine = (entry: ConsoleEntry, index: number) => {
    const color =
      entry.method === "error" ? "#f48771" : entry.method === "warn" ? "#dca040" : outputText;
    const Icon = entry.method === "error" ? AlertCircle : entry.method === "warn" ? AlertTriangle : null;
    return (
      <div key={index} style={{ display: "flex", gap: 8, padding: "1px 0", alignItems: "flex-start" }}>
        <span
          style={{
            width: 64,
            flexShrink: 0,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.5,
            color: "var(--muted-foreground)",
          }}
        >
          {entry.timestamp}
        </span>
        {Icon ? <Icon size={10} style={{ color, flexShrink: 0, marginTop: 3 }} /> : <span style={{ width: 10 }} />}
        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5, color }}>
          {entry.text}
        </span>
      </div>
    );
  };

  const renderFileTabs = (
    files: FileEntry[],
    active: number,
    onSwitch: (i: number) => void,
    onClose: (i: number) => void,
    onAdd: () => void,
  ) => (
    <FileTabs files={files} active={active} onSwitch={onSwitch} onClose={onClose} onAdd={onAdd} />
  );

  const renderCombinedPanel = (panel: "html" | "css" | "js") => {
    const data =
      panel === "html"
        ? {
            files: htmlFiles,
            active: activeHtml,
            setActive: setActiveHtml,
            badge: PANEL_BADGES.html,
            label: "HTML",
            accept: ".html,.htm",
            uploadRef: uploadHtmlRef,
          }
        : panel === "css"
        ? {
            files: cssFiles,
            active: activeCss,
            setActive: setActiveCss,
            badge: PANEL_BADGES.css,
            label: "CSS",
            accept: ".css",
            uploadRef: uploadCssRef,
          }
        : {
            files: jsFiles,
            active: activeJs,
            setActive: setActiveJs,
            badge: PANEL_BADGES.js,
            label: "JAVASCRIPT",
            accept: ".js,.mjs",
            uploadRef: uploadJsRef,
          };

    const collapsedPanel = collapsed.has(panel);
    const isMaxed = maximized === panel;
    const collapsedCount = collapsed.size;
    const openCount = Math.max(1, 3 - collapsedCount);
    const panelHeight = collapsedPanel
      ? 38
      : collapsedCount > 0
      ? `calc((100% - ${collapsedCount * 38}px) / ${openCount})`
      : maximized
      ? isMaxed
        ? "60%"
        : "20%"
      : "33.3333%";

    return (
      <div
        key={panel}
        style={{
          height: panelHeight,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          transition: "height 200ms ease, min-height 200ms ease",
          minHeight: collapsedPanel ? 38 : 150,
        }}
      >
        <div
          style={{
            height: 38,
            minHeight: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            backgroundColor: "var(--card)",
            borderBottom: collapsedPanel ? "none" : "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WebBadge lang={data.badge} />
            <span style={labelStyle}>{data.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input
              ref={data.uploadRef}
              type="file"
              accept={data.accept}
              multiple
              style={{ display: "none" }}
              onChange={async (e) => {
                await uploadToPanel(panel, e.target.files);
                e.target.value = "";
              }}
            />
            <IconBtn title={`Upload ${data.label} files`} onClick={() => handleUploadClick(data.uploadRef)}>
              <Upload size={14} />
            </IconBtn>
            <IconBtn
              title={isMaxed ? "Restore" : "Maximize"}
              onClick={() => toggleMaximized(isMaxed ? null : panel)}
            >
              {isMaxed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </IconBtn>
            <IconBtn
              title={collapsedPanel ? "Expand" : "Collapse"}
              onClick={() => togglePanelCollapse(panel)}
            >
              {collapsedPanel ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </IconBtn>
            <IconBtn title={`Clear ${data.label}`} onClick={() => clearPanelContent(panel)}>
              <Trash2 size={14} />
            </IconBtn>
          </div>
        </div>

        {!collapsedPanel && data.files.length > 1 && (
          <div style={{ flexShrink: 0 }}>
            {renderFileTabs(
              data.files,
              data.active,
              data.setActive,
              (i) => removeCombinedFile(panel, i),
              () => addCombinedFile(panel),
            )}
          </div>
        )}

        {!collapsedPanel && (
          <textarea
            value={data.files[data.active]?.content || ""}
            onChange={(e) => updatePanelContent(panel, e.target.value)}
            onKeyDown={(e) => handleEditorKey(e, panel)}
            spellCheck={false}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              padding: "10px 14px",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.65,
              backgroundColor: editorBackground,
              color: editorText,
              tabSize: 2,
            }}
          />
        )}
      </div>
    );
  };

  const renderCombinedMode = () => (
    <div
      key="combined-mode"
      className="web-compiler-combined-main"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: isNarrowLayout ? "column" : "row",
        overflow: "hidden",
      }}
    >
      <div
        className="web-compiler-combined-editors"
        style={{
          width: isNarrowLayout ? "100%" : "50%",
          height: isNarrowLayout ? (isMobileLayout ? "50vh" : "52%") : undefined,
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          overflowY: "auto",
          borderRight: isNarrowLayout ? "none" : "1px solid var(--border)",
          borderBottom: isNarrowLayout ? "1px solid var(--border)" : "none",
          minHeight: 0,
        }}
      >
        {renderCombinedPanel("html")}
        {renderCombinedPanel("css")}
        {renderCombinedPanel("js")}
      </div>

      <div
        className="web-compiler-combined-preview"
        style={{
          flex: isNarrowLayout ? "none" : 1,
          height: isNarrowLayout ? (isMobileLayout ? "40vh" : "48%") : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            height: 40,
            minHeight: 40,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            backgroundColor: "var(--card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={labelStyle}>Preview</span>

          <button
            type="button"
            onClick={runCombinedPreview}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#047857";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#059669";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 14px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#059669",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <Play size={12} />
            Run
            <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>Ctrl+Enter</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", backgroundColor: "var(--muted)", borderRadius: 6, padding: 2, gap: 1 }}>
              {(["mobile", "tablet", "desktop"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setResponsive(value)}
                  style={{
                    height: 22,
                    padding: "0 8px",
                    borderRadius: 4,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    backgroundColor: responsive === value ? "rgb(var(--background))" : "transparent",
                    color: responsive === value ? "var(--foreground)" : "var(--muted-foreground)",
                    boxShadow: responsive === value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (responsive !== value) {
                      e.currentTarget.style.backgroundColor = "var(--muted)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (responsive !== value) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 16, backgroundColor: "var(--border)" }} />

            <IconBtn
              title="Refresh"
              onClick={() => {
                const doc = previewSrcRef.current || previewSrc;
                if (!doc) return;
                previewSrcRef.current = doc;
                setPreviewSrc("");
                window.setTimeout(() => {
                  setPreviewSrc(doc);
                  setPreviewReloadKey((value) => value + 1);
                }, 0);
              }}
            >
              <RefreshCw size={14} />
            </IconBtn>
            <IconBtn
              title="Open in new tab"
              onClick={() => {
                const doc = previewSrcRef.current || previewSrc || PREVIEW_PLACEHOLDER;
                const blob = new Blob([doc], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener");
                window.setTimeout(() => URL.revokeObjectURL(url), 5000);
              }}
            >
              <ExternalLink size={14} />
            </IconBtn>
            <IconBtn title="Fullscreen" onClick={openFullscreen}>
              <Maximize size={14} />
            </IconBtn>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            backgroundColor:
              responsive === "desktop" ? "white" : "color-mix(in srgb, var(--muted) 40%, transparent)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          {!hasCombinedPreview && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted-foreground)",
                pointerEvents: "none",
              }}
            >
              <Play size={32} style={{ opacity: 0.55 }} />
              <div style={{ marginTop: 10, fontSize: 13 }}>Click Run to see your preview</div>
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Ctrl+Enter</div>
            </div>
          )}
          {hasCombinedPreview && (
            <div
              style={{
                width: responsive === "mobile" ? 375 : responsive === "tablet" ? 768 : "100%",
                height: "100%",
                maxHeight: "100%",
                transition: "width 200ms ease",
                boxShadow: responsive === "desktop" ? "none" : "0 0 0 1px var(--border)",
                backgroundColor: "white",
              }}
            >
              <iframe
                key={previewReloadKey}
                srcDoc={combinedPreviewDoc}
                title="preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                style={{ width: "100%", height: "100%", maxHeight: "100%", border: "none" }}
              />
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0 }}>
          <div
            onClick={() => setConsoleOpen(!consoleOpen)}
            style={{
              height: 32,
              minHeight: 32,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              background:
                "linear-gradient(to bottom, color-mix(in srgb, var(--border) 18%, var(--card)), var(--card))",
              backgroundColor: "var(--card)",
              borderTop: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(127, 127, 127, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Terminal size={12} style={{ color: "var(--muted-foreground)" }} />
              <span
                style={labelStyle}
              >
                Console
              </span>
              {errorCount > 0 && (
                <span
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: "#ef4444",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "0 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {errorCount}
                </span>
              )}
            </div>

            {consoleOpen ? (
              <ChevronUp size={12} style={{ color: "var(--muted-foreground)" }} />
            ) : (
              <ChevronDown size={12} style={{ color: "var(--muted-foreground)" }} />
            )}
          </div>

          {consoleOpen && (
            <div
              style={{
                height: 120,
                minHeight: 120,
                maxHeight: 120,
                overflow: "auto",
                flexShrink: 0,
                backgroundColor: outputBackground,
                color: outputText,
                padding: "6px 12px",
              }}
            >
              {consoleEntries.length === 0 ? (
                <span style={{ fontSize: 12, color: outputText, fontFamily: "monospace", opacity: 0.7 }}>
                  Console output will appear here
                </span>
              ) : (
                consoleEntries.map((entry, index) => renderConsoleLine(entry, index))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSingleMode = () => {
    const singleMode = mode === "combined" ? "html" : mode;
    const label = MODE_LABELS[singleMode];
    const bottomLabel = singleMode === "html" || singleMode === "css" ? "PREVIEW" : singleMode === "javascript" ? "CONSOLE" : "OUTPUT";

    return (
      <div
        key="single-mode"
        className="web-compiler-single-main"
        ref={splitContainerRef}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
      >
        <div
          className="web-compiler-single-editor"
          style={{
            height: isMobileLayout ? "50vh" : `${splitPos}%`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: isMobileLayout ? "50vh" : "25%",
          }}
        >
          <div
            style={{
              height: 38,
              minHeight: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              backgroundColor: "var(--card)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <WebBadge lang={MODE_BADGES[singleMode]} />
              <span style={labelStyle}>{label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <input
                ref={uploadSingleRef}
                type="file"
                accept={SINGLE_ACCEPTS[singleMode]}
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                  await uploadToSingle(e.target.files);
                  e.target.value = "";
                }}
              />
              <IconBtn title={`Upload ${label} file`} onClick={handleSingleUpload}>
                <Upload size={14} />
              </IconBtn>
              <IconBtn title={`Clear ${label}`} onClick={() => handleSingleContent("")}>
                <Trash2 size={14} />
              </IconBtn>
            </div>
          </div>

          {singleFiles.length > 1 && (
            <div style={{ flexShrink: 0 }}>
              {renderFileTabs(
                singleFiles,
                activeSingle,
                setActiveSingle,
                (i) => {
                  setSingleFiles((prev) => {
                    if (prev.length <= 1) return prev;
                    const next = prev.filter((_, index) => index !== i);
                    setActiveSingle(Math.min(activeSingle, next.length - 1));
                    return next;
                  });
                },
                () => {
                  setSingleFiles((prev) => {
                    if (prev.length >= 20) return prev;
                    const extMap: Record<Exclude<Mode, "combined">, string> = {
                      html: ".html",
                      css: ".css",
                      javascript: ".js",
                      typescript: ".ts",
                    };
                    const ext = extMap[singleMode];
                    const next = [...prev, { name: `file${prev.length + 1}${ext}`, content: "" }];
                    setActiveSingle(next.length - 1);
                    return next;
                  });
                },
              )}
            </div>
          )}

          <textarea
            value={singleFiles[activeSingle]?.content || ""}
            onChange={(e) => handleSingleContent(e.target.value)}
            onKeyDown={(e) => handleEditorKey(e, "single")}
            spellCheck={false}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              padding: "10px 14px",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.65,
              backgroundColor: editorBackground,
              color: editorText,
              tabSize: 2,
            }}
          />
        </div>

        <div
          className="web-compiler-single-splitter"
          onMouseDown={startSplitDrag}
          style={{
            height: 4,
            flexShrink: 0,
            cursor: "row-resize",
            backgroundColor: isDraggingSplit ? "#10b981" : "var(--border)",
            transition: "background-color 150ms",
            display: isMobileLayout ? "none" : "block",
          }}
          onMouseEnter={(e) => {
            if (!isDraggingSplit) e.currentTarget.style.backgroundColor = "#10b981";
          }}
          onMouseLeave={(e) => {
            if (!isDraggingSplit) e.currentTarget.style.backgroundColor = "var(--border)";
          }}
        />

        <div
          className="web-compiler-single-output"
          style={{
            flex: isMobileLayout ? "none" : 1,
            height: isMobileLayout ? "40vh" : undefined,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: isMobileLayout ? "40vh" : "25%",
          }}
        >
          <div
            style={{
              height: 38,
              minHeight: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              backgroundColor: "var(--card)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={labelStyle}>{bottomLabel}</span>

            <button
              type="button"
              disabled={isSingleRunning && singleMode === "typescript"}
              onClick={() => void runSingleMode()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 14px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#10b981",
                color: "white",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {isSingleRunning && singleMode === "typescript" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              {isSingleRunning && singleMode === "typescript" ? "Running..." : "Run"}
              <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>Ctrl+Enter</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {mode === "javascript" && (
                <IconBtn title="Clear console" onClick={() => setConsoleEntries([])}>
                  <Trash2 size={14} />
                </IconBtn>
              )}
              {(mode === "html" || mode === "css") && (
                <IconBtn title="Fullscreen" onClick={openFullscreen}>
                  <Maximize size={14} />
                </IconBtn>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", position: "relative" }}>
            {singleMode === "html" || singleMode === "css" ? (
              <iframe
                key={singlePreviewKey}
                title={`${singleMode}-preview`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                srcDoc={singlePreviewDoc}
                style={{ border: "none", width: "100%", height: "100%", background: "#fff" }}
              />
            ) : singleMode === "javascript" ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: outputBackground,
                  color: outputText,
                  padding: "10px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.65,
                  overflowY: "auto",
                }}
              >
                {singleOutput && (
                  <iframe
                    ref={singleRunnerFrameRef}
                    key={singlePreviewKey}
                    title="javascript-runner"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    srcDoc={singleOutput}
                    style={{ display: "none" }}
                  />
                )}
                {consoleEntries.length > 0 ? (
                  consoleEntries.map((entry, index) => renderConsoleLine(entry, index))
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <Terminal size={20} />
                    <div style={{ fontSize: 12, marginTop: 8 }}>Run JavaScript to see console output</div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  background: outputBackground,
                  color: outputText,
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "var(--muted-foreground)",
                    padding: "6px 14px",
                    background: "var(--card)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Execution Result
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    background: outputBackground,
                    color: outputText,
                    padding: "12px 14px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {typeScriptRunResult ? (
                    <>
                      {typeScriptRunResult.stdout && (
                        <div style={{ color: outputText }}>{typeScriptRunResult.stdout}</div>
                      )}
                      {typeScriptRunResult.stderr && (
                        <div style={{ color: "#f48771", marginTop: typeScriptRunResult.stdout ? 8 : 0 }}>
                          {typeScriptRunResult.stderr}
                        </div>
                      )}
                      {!typeScriptRunResult.stdout && !typeScriptRunResult.stderr && (
                        <span style={{ color: "var(--muted-foreground)" }}>No output.</span>
                      )}
                    </>
                  ) : isSingleRunning ? (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Loader2 size={16} className="animate-spin" />
                      <span>Running TypeScript...</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <FileCode size={22} />
                      <span>Click Run to execute TypeScript</span>
                    </div>
                  )}
                </div>
                {typeScriptRunResult && (
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "7px 14px",
                      borderTop: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    <span>Time: {typeScriptRunResult.time}</span>
                    <span>Exit code: {typeScriptRunResult.exitCode}</span>
                    <span>Status: {typeScriptRunResult.status}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      className="fixed inset-0 z-[1000] bg-background text-foreground"
    >
      <style>{`
        .web-compiler-tab-scroll::-webkit-scrollbar { display: none; }
        .web-compiler-single-main { flex-direction: column !important; }
        @media (max-width: 768px) {
          .web-compiler-combined-main { flex-direction: column !important; }
          .web-compiler-combined-editors {
            width: 100% !important;
            height: 52% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border) !important;
          }
          .web-compiler-combined-preview {
            flex: none !important;
            height: 48% !important;
          }
        }
        @media (max-width: 480px) {
          .web-compiler-combined-editors,
          .web-compiler-single-editor {
            height: 50vh !important;
            min-height: 50vh !important;
          }
          .web-compiler-combined-preview,
          .web-compiler-single-output {
            flex: none !important;
            height: 40vh !important;
            min-height: 40vh !important;
          }
          .web-compiler-single-splitter {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="flex items-center justify-between border-b border-border bg-card px-3"
        style={{ height: 38, minHeight: 38 }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/compilers"
            className="flex items-center gap-1 text-[11px] text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            <ChevronLeft size={12} />
            Compilers
          </Link>
          <span className="text-[11px] text-muted-foreground/40">/</span>
          <span className="text-[13px] font-medium">Web Compiler</span>
        </div>
        <div />
      </div>

      <div
        style={{
          height: 40,
          minHeight: 40,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 4,
          overflowX: "auto",
          overflowY: "hidden",
          backgroundColor: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
        className="web-compiler-tab-scroll"
      >
        {modeButtons.map((item) => {
          const active = mode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => switchMode(item.mode)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                flexShrink: 0,
                cursor: "pointer",
                transition: "background-color 150ms, color 150ms, box-shadow 150ms ease",
                backgroundColor: active ? "#10b981" : "transparent",
                color: active ? "white" : "var(--muted-foreground)",
                boxShadow: active ? "0 1px 3px rgba(16,185,129,0.3)" : "none",
              }}
              onMouseEnter={(e) => setModeButtonHover(e, active)}
              onMouseLeave={(e) => clearModeButtonHover(e, active)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {mode === "combined" ? renderCombinedMode() : renderSingleMode()}

      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "white",
            opacity: fullscreenVisible ? 1 : 0,
            transition: `opacity ${fullscreenVisible ? 200 : 150}ms ease`,
          }}
        >
          <button
            onClick={closeFullscreen}
            style={{
              position: "fixed",
              top: 12,
              right: 12,
              zIndex: 51,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <X size={14} />
            Exit Fullscreen
          </button>
          <iframe
            title="preview-fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            key={mode === "combined" ? previewReloadKey : singlePreviewKey}
            srcDoc={mode === "combined" ? combinedPreviewDoc : singlePreviewDoc}
            style={{ width: "100vw", height: "100vh", border: "none" }}
          />
        </div>
      )}
    </div>
  );
}

function WebBadge({ lang }: { lang: "html" | "css" | "js" | "ts" }) {
  const b = WEB_BADGES[lang];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 20,
        padding: "0 6px",
        borderRadius: 4,
        backgroundColor: b.bg,
        color: b.color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "monospace",
        flexShrink: 0,
      }}
    >
      {b.abbr}
    </span>
  );
}

function FileTabs({
  files,
  active,
  onSwitch,
  onClose,
  onAdd,
}: {
  files: FileEntry[];
  active: number;
  onSwitch: (i: number) => void;
  onClose: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: 32,
        overflow: "hidden",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        flexShrink: 0,
      }}
    >
      <div
        className="web-compiler-tab-scroll"
        style={{
          display: "flex",
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => onSwitch(index)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: "100%",
              padding: "0 10px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 400,
              borderBottom: index === active ? "2px solid #10b981" : "2px solid transparent",
              color: index === active ? "var(--foreground)" : "var(--muted-foreground)",
              backgroundColor: "transparent",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 400 }}>
              {file.name}
            </span>
            {files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(index);
                }}
                style={{
                  width: 14,
                  height: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 3,
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "var(--muted-foreground)",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        title="Add file"
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          borderLeft: "1px solid var(--border)",
          backgroundColor: "transparent",
          cursor: "pointer",
          color: "var(--muted-foreground)",
          flexShrink: 0,
        }}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
