"use client";

import Link from "next/link";
import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RefreshCw,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
  Upload,
  X,
  Monitor,
} from "lucide-react";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type PanelKey = "html" | "css" | "js";
type ResponsiveMode = "mobile" | "tablet" | "desktop";
type ConsoleLevel = "log" | "error" | "warn" | "info";

type FileItem = { name: string; content: string };
type ConsoleEntry = { level: ConsoleLevel; text: string; timestamp: number };

type BadgeStyle = { abbr: string; bg: string; text: string };

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
</body>
</html>`;

const CSS_STARTER = `/* Styles */
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

h1 {
  color: #10b981;
}`;

const JS_STARTER = `// JavaScript
console.log('Hello, World!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
});`;

const TS_STARTER = `// TypeScript
const message: string = 'Hello, World!';
console.log(message);

interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 30 };
console.log(\`User: \${user.name}, Age: \${user.age}\`);`;

const CSS_SAMPLE_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>__CSS__</style></head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
  <p>This is a paragraph showing how text renders with your styles applied. Edit the CSS to change the look.</p>
  <button>Sample button</button>
  <div class="card" style="padding:1rem;border:1px solid #e5e7eb;border-radius:8px;margin-top:12px;max-width:320px">
    <strong>Card title</strong>
    <p>Card body content.</p>
  </div>
  <p style="margin-top:12px"><label>Input: <input type="text" placeholder="Type here" /></label></p>
</body></html>`;

const PANEL_BADGES: Record<PanelKey, BadgeStyle> = {
  html: { abbr: "HTML", bg: "#e34c26", text: "#fff" },
  css: { abbr: "CSS", bg: "#264de4", text: "#fff" },
  js: { abbr: "JS", bg: "#f1e05a", text: "#000" },
};

const PANEL_LABELS: Record<PanelKey, string> = {
  html: "HTML",
  css: "CSS",
  js: "JAVASCRIPT",
};

const PANEL_ACCEPT: Record<PanelKey, string> = {
  html: ".html,.htm",
  css: ".css",
  js: ".js,.mjs",
};

const MAX_FILES_PER_PANEL = 20;
const MAX_FILE_SIZE = 500 * 1024;

const CONSOLE_INJECT = `(function(){
  if (window.__consoleHooked) return;
  window.__consoleHooked = true;
  var orig = {
    log: window.console.log.bind(window.console),
    error: window.console.error.bind(window.console),
    warn: window.console.warn.bind(window.console),
    info: window.console.info.bind(window.console)
  };
  function safe(args){ try { return Array.prototype.slice.call(args).map(function(a){
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a === 'object') { try { return JSON.stringify(a); } catch(e) { return String(a); } }
    return String(a);
  }); } catch(e) { return ['<unserializable>']; } }
  ['log','error','warn','info'].forEach(function(method){
    window.console[method] = function(){
      try { orig[method].apply(null, arguments); } catch(e) {}
      try {
        window.parent.postMessage({ __cmp_console: true, method: method, args: safe(arguments) }, '*');
      } catch(e) {}
    };
  });
  window.addEventListener('error', function(e){
    try {
      window.parent.postMessage({ __cmp_console: true, method: 'error', args: [String(e.message) + ' (line ' + e.lineno + ')'] }, '*');
    } catch(_) {}
  });
  window.addEventListener('unhandledrejection', function(e){
    try {
      window.parent.postMessage({ __cmp_console: true, method: 'error', args: ['Unhandled rejection: ' + String(e.reason)] }, '*');
    } catch(_) {}
  });
})();`;

function stripTypeAnnotations(src: string): string {
  let result = src;
  result = result.replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\}\s*$/gm, "");
  result = result.replace(/^\s*type\s+\w+\s*=\s*[^;\n]+;?\s*$/gm, "");
  result = result.replace(
    /:\s*(?:string|number|boolean|any|unknown|void|null|undefined|object|never|\{[^}]*\}|[A-Z]\w*(?:\s*<[^>]+>)?(?:\s*\[\])*|\([^)]*\)\s*=>\s*[\w<>[\]|&\s]+)(?=\s*[=,)\];}])/g,
    "",
  );
  result = result.replace(/<[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*>/g, "");
  result = result.replace(/\s+as\s+(?:string|number|boolean|any|unknown|[A-Z]\w*)/g, "");
  result = result.replace(/^\s*export\s+(?:type|interface)\b.*$/gm, "");
  return result;
}

export default function WebCompilerPage() {
  const [mode, setMode] = useState<Mode>("combined");

  // Combined mode state
  const [htmlFiles, setHtmlFiles] = useState<FileItem[]>([
    { name: "index.html", content: HTML_STARTER },
  ]);
  const [cssFiles, setCssFiles] = useState<FileItem[]>([
    { name: "styles.css", content: CSS_STARTER },
  ]);
  const [jsFiles, setJsFiles] = useState<FileItem[]>([
    { name: "script.js", content: JS_STARTER },
  ]);
  const [activeHtmlFile, setActiveHtmlFile] = useState<number>(0);
  const [activeCssFile, setActiveCssFile] = useState<number>(0);
  const [activeJsFile, setActiveJsFile] = useState<number>(0);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelKey | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<PanelKey>>(new Set());
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [responsiveMode, setResponsiveMode] = useState<ResponsiveMode>("desktop");
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  // Single mode state
  const [singleFiles, setSingleFiles] = useState<FileItem[]>([
    { name: "index.html", content: HTML_STARTER },
  ]);
  const [activeSingleFile, setActiveSingleFile] = useState<number>(0);
  const [singleSrcDoc, setSingleSrcDoc] = useState<string>("");
  const [singleConsoleEntries, setSingleConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [transpiledOutput, setTranspiledOutput] = useState<string>("");
  const [splitPosition, setSplitPosition] = useState<number>(58);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [singleFullscreen, setSingleFullscreen] = useState<boolean>(false);

  const [toast, setToast] = useState<string>("");

  const uploadRefHtml = useRef<HTMLInputElement | null>(null);
  const uploadRefCss = useRef<HTMLInputElement | null>(null);
  const uploadRefJs = useRef<HTMLInputElement | null>(null);
  const uploadRefSingle = useRef<HTMLInputElement | null>(null);

  // Load initial mode from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    if (modeParam) {
      const valid: Mode[] = ["combined", "html", "css", "javascript", "typescript"];
      const normalized = modeParam === "combine" ? "combined" : modeParam;
      if ((valid as string[]).includes(normalized)) {
        applyMode(normalized as Mode, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyMode(next: Mode, push: boolean = true) {
    setMode(next);
    if (next === "html") {
      setSingleFiles([{ name: "index.html", content: HTML_STARTER }]);
    } else if (next === "css") {
      setSingleFiles([{ name: "styles.css", content: CSS_STARTER }]);
    } else if (next === "javascript") {
      setSingleFiles([{ name: "script.js", content: JS_STARTER }]);
    } else if (next === "typescript") {
      setSingleFiles([{ name: "main.ts", content: TS_STARTER }]);
    }
    setActiveSingleFile(0);
    setSingleSrcDoc("");
    setSingleConsoleEntries([]);
    setTranspiledOutput("");
    if (push && typeof window !== "undefined") {
      window.history.replaceState(null, "", `/compilers/web?mode=${next}`);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Console message listener
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      const obj = data as { __cmp_console?: boolean; method?: string; args?: unknown };
      if (!obj.__cmp_console) return;
      const method = obj.method;
      const level: ConsoleLevel =
        method === "error" ? "error" : method === "warn" ? "warn" : method === "info" ? "info" : "log";
      const args = Array.isArray(obj.args) ? (obj.args as string[]) : [];
      const text = args.join(" ");
      const entry: ConsoleEntry = { level, text, timestamp: Date.now() };
      if (mode === "combined") {
        setConsoleEntries((prev) => [...prev, entry]);
      } else {
        setSingleConsoleEntries((prev) => [...prev, entry]);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode]);

  // ============================ COMBINED MODE ============================

  function buildCombinedDoc(): string {
    const combinedHtml = htmlFiles.map((f) => f.content).join("\n");
    const combinedCss = cssFiles.map((f) => f.content).join("\n");
    const combinedJs = jsFiles.map((f) => f.content).join("\n");
    const scriptTag = `<script>${CONSOLE_INJECT}\n${combinedJs}<\/script>`;
    const styleTag = `<style>${combinedCss}<\/style>`;

    if (/<!DOCTYPE/i.test(combinedHtml)) {
      let doc = combinedHtml;
      if (/<\/head>/i.test(doc)) {
        doc = doc.replace(/<\/head>/i, `${styleTag}</head>`);
      } else if (/<head[^>]*>/i.test(doc)) {
        doc = doc.replace(/(<head[^>]*>)/i, `$1${styleTag}`);
      } else if (/<html[^>]*>/i.test(doc)) {
        doc = doc.replace(/(<html[^>]*>)/i, `$1<head>${styleTag}</head>`);
      }
      if (/<\/body>/i.test(doc)) {
        doc = doc.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        doc = doc + scriptTag;
      }
      return doc;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${styleTag}
</head>
<body>
${combinedHtml}
${scriptTag}
</body>
</html>`;
  }

  function runCombined() {
    setConsoleEntries([]);
    const doc = buildCombinedDoc();
    setPreviewSrcDoc(doc);
  }

  function refreshCombined() {
    if (!previewSrcDoc) {
      runCombined();
      return;
    }
    const current = previewSrcDoc;
    setPreviewSrcDoc("");
    requestAnimationFrame(() => setPreviewSrcDoc(current));
  }

  function openCombinedInNewTab() {
    if (typeof window === "undefined") return;
    const doc = previewSrcDoc || buildCombinedDoc();
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function togglePanelMax(panel: PanelKey) {
    setMaximizedPanel((prev) => (prev === panel ? null : panel));
  }

  function togglePanelCollapse(panel: PanelKey) {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        if (next.size >= 2) {
          setToast("At least one panel must stay open");
          return prev;
        }
        next.add(panel);
      }
      return next;
    });
  }

  function getFilesForPanel(panel: PanelKey): {
    files: FileItem[];
    setFiles: (files: FileItem[]) => void;
    active: number;
    setActive: (n: number) => void;
  } {
    if (panel === "html") {
      return {
        files: htmlFiles,
        setFiles: setHtmlFiles,
        active: activeHtmlFile,
        setActive: setActiveHtmlFile,
      };
    }
    if (panel === "css") {
      return {
        files: cssFiles,
        setFiles: setCssFiles,
        active: activeCssFile,
        setActive: setActiveCssFile,
      };
    }
    return {
      files: jsFiles,
      setFiles: setJsFiles,
      active: activeJsFile,
      setActive: setActiveJsFile,
    };
  }

  function updatePanelFileContent(panel: PanelKey, content: string) {
    const { files, setFiles, active } = getFilesForPanel(panel);
    const next = files.slice();
    next[active] = { ...next[active], content };
    setFiles(next);
  }

  function clearPanelActiveFile(panel: PanelKey) {
    updatePanelFileContent(panel, "");
  }

  function addPanelFile(panel: PanelKey) {
    const { files, setFiles, setActive } = getFilesForPanel(panel);
    if (files.length >= MAX_FILES_PER_PANEL) {
      setToast(`Maximum ${MAX_FILES_PER_PANEL} files per panel`);
      return;
    }
    const ext = panel === "html" ? ".html" : panel === "css" ? ".css" : ".js";
    const base = panel === "html" ? "index" : panel === "css" ? "styles" : "script";
    const newName = `${base}${files.length + 1}${ext}`;
    const next = [...files, { name: newName, content: "" }];
    setFiles(next);
    setActive(next.length - 1);
  }

  function removePanelFile(panel: PanelKey, index: number) {
    const { files, setFiles, active, setActive } = getFilesForPanel(panel);
    if (files.length <= 1) {
      setToast("Cannot remove last file");
      return;
    }
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    if (active >= next.length) setActive(next.length - 1);
    else if (active === index) setActive(Math.max(0, index - 1));
  }

  function uploadFilesToPanel(panel: PanelKey, fileList: FileList) {
    const { files, setFiles, setActive } = getFilesForPanel(panel);
    const accept =
      panel === "html"
        ? [".html", ".htm"]
        : panel === "css"
        ? [".css"]
        : [".js", ".mjs"];
    const incoming = Array.from(fileList);
    const valid: File[] = [];
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      const ok = accept.some((ext) => lower.endsWith(ext));
      if (!ok) {
        setToast(`Only ${accept.join("/")} files accepted`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setToast(`${f.name} exceeds 500KB`);
        return;
      }
      valid.push(f);
    }
    if (files.length + valid.length > MAX_FILES_PER_PANEL) {
      setToast(`Maximum ${MAX_FILES_PER_PANEL} files per panel`);
      return;
    }
    Promise.all(
      valid.map(
        (f) =>
          new Promise<FileItem>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: f.name, content: String(reader.result || "") });
            reader.onerror = () => reject(reader.error);
            reader.readAsText(f);
          }),
      ),
    )
      .then((items) => {
        const next = [...files, ...items];
        setFiles(next);
        setActive(next.length - 1);
      })
      .catch(() => setToast("Failed to read upload"));
  }

  // ============================ SINGLE MODES ============================

  function updateSingleContent(content: string) {
    const next = singleFiles.slice();
    next[activeSingleFile] = { ...next[activeSingleFile], content };
    setSingleFiles(next);
  }

  function singleExtension(): string {
    if (mode === "html") return ".html";
    if (mode === "css") return ".css";
    if (mode === "javascript") return ".js";
    if (mode === "typescript") return ".ts";
    return ".txt";
  }

  function singleAccept(): string {
    if (mode === "html") return ".html,.htm";
    if (mode === "css") return ".css";
    if (mode === "javascript") return ".js,.mjs";
    if (mode === "typescript") return ".ts,.tsx";
    return "";
  }

  function addSingleFile() {
    if (singleFiles.length >= MAX_FILES_PER_PANEL) {
      setToast(`Maximum ${MAX_FILES_PER_PANEL} files`);
      return;
    }
    const ext = singleExtension();
    const base =
      mode === "html"
        ? "index"
        : mode === "css"
        ? "styles"
        : mode === "javascript"
        ? "script"
        : "main";
    const newName = `${base}${singleFiles.length + 1}${ext}`;
    const next = [...singleFiles, { name: newName, content: "" }];
    setSingleFiles(next);
    setActiveSingleFile(next.length - 1);
  }

  function removeSingleFile(index: number) {
    if (singleFiles.length <= 1) {
      setToast("Cannot remove last file");
      return;
    }
    const next = singleFiles.filter((_, i) => i !== index);
    setSingleFiles(next);
    if (activeSingleFile >= next.length) setActiveSingleFile(next.length - 1);
    else if (activeSingleFile === index) setActiveSingleFile(Math.max(0, index - 1));
  }

  function uploadSingle(fileList: FileList) {
    const accept = singleAccept()
      .split(",")
      .map((s) => s.trim().toLowerCase());
    const incoming = Array.from(fileList);
    const valid: File[] = [];
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      const ok = accept.some((ext) => lower.endsWith(ext));
      if (!ok) {
        setToast(`Only ${accept.join("/")} files accepted`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setToast(`${f.name} exceeds 500KB`);
        return;
      }
      valid.push(f);
    }
    if (singleFiles.length + valid.length > MAX_FILES_PER_PANEL) {
      setToast(`Maximum ${MAX_FILES_PER_PANEL} files`);
      return;
    }
    Promise.all(
      valid.map(
        (f) =>
          new Promise<FileItem>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: f.name, content: String(reader.result || "") });
            reader.onerror = () => reject(reader.error);
            reader.readAsText(f);
          }),
      ),
    )
      .then((items) => {
        const next = [...singleFiles, ...items];
        setSingleFiles(next);
        setActiveSingleFile(next.length - 1);
      })
      .catch(() => setToast("Failed to read upload"));
  }

  function runSingle() {
    const allContent = singleFiles.map((f) => f.content).join("\n");
    setSingleConsoleEntries([]);
    setTranspiledOutput("");

    if (mode === "html") {
      const doc = /<!DOCTYPE/i.test(allContent)
        ? /<\/body>/i.test(allContent)
          ? allContent.replace(/<\/body>/i, `<script>${CONSOLE_INJECT}<\/script></body>`)
          : `${allContent}<script>${CONSOLE_INJECT}<\/script>`
        : `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${allContent}<script>${CONSOLE_INJECT}<\/script></body></html>`;
      setSingleSrcDoc(doc);
    } else if (mode === "css") {
      const doc = CSS_SAMPLE_HTML.replace("__CSS__", allContent);
      setSingleSrcDoc(doc);
    } else if (mode === "javascript") {
      const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>${CONSOLE_INJECT}\ntry{\n${allContent}\n}catch(e){console.error(e && e.message ? e.message : String(e));}<\/script></body></html>`;
      setSingleSrcDoc(doc);
    } else if (mode === "typescript") {
      const transpiled = stripTypeAnnotations(allContent);
      setTranspiledOutput(transpiled);
      const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>${CONSOLE_INJECT}\ntry{\n${transpiled}\n}catch(e){console.error(e && e.message ? e.message : String(e));}<\/script></body></html>`;
      setSingleSrcDoc(doc);
    }
  }

  function refreshSingle() {
    if (!singleSrcDoc) {
      runSingle();
      return;
    }
    const current = singleSrcDoc;
    setSingleSrcDoc("");
    requestAnimationFrame(() => setSingleSrcDoc(current));
  }

  function startSplitDrag(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingSplit(true);
    const containerEl = (event.currentTarget.parentElement as HTMLElement) || null;
    const onMove = (move: MouseEvent) => {
      const rect = containerEl?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.top;
      const height = rect.height;
      const pct = ((move.clientY - top) / height) * 100;
      const clamped = Math.min(75, Math.max(25, pct));
      setSplitPosition(clamped);
    };
    const onUp = () => {
      setIsDraggingSplit(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ============================ EDITOR KEY HANDLER ============================

  function handleEditorKey(
    event: KeyboardEvent<HTMLTextAreaElement>,
    panel: PanelKey | "single",
  ) {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const current = target.value;
      const newValue = current.substring(0, start) + "  " + current.substring(end);
      if (panel === "single") {
        updateSingleContent(newValue);
      } else {
        updatePanelFileContent(panel, newValue);
      }
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (panel === "single") {
        runSingle();
      } else {
        runCombined();
      }
    }
  }

  // ============================ RENDER COMBINED PANEL ============================

  function renderPanel(panel: PanelKey) {
    const { files, active, setActive } = getFilesForPanel(panel);
    const isCollapsed = collapsedPanels.has(panel);
    const isMaxed = maximizedPanel === panel;
    const otherIsMaxed = maximizedPanel !== null && maximizedPanel !== panel;
    let flexValue: number = 1;
    if (isMaxed) flexValue = 3;
    else if (otherIsMaxed) flexValue = 1;

    const badge = PANEL_BADGES[panel];
    const label = PANEL_LABELS[panel];
    const activeFile = files[active] || { name: "", content: "" };

    const uploadRef =
      panel === "html" ? uploadRefHtml : panel === "css" ? uploadRefCss : uploadRefJs;

    return (
      <div
        key={panel}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: isCollapsed ? "0 0 auto" : `${flexValue} ${flexValue} 0`,
          minHeight: isCollapsed ? 38 : 80,
          maxHeight: isCollapsed ? 38 : "none",
          borderBottom: panel !== "js" ? "1px solid var(--border)" : "none",
          overflow: "hidden",
          transition: "flex 200ms ease",
        }}
      >
        <div
          style={{
            height: 38,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            background: "var(--card)",
            borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                height: 20,
                padding: "0 6px",
                borderRadius: 4,
                background: badge.bg,
                color: badge.text,
                display: "inline-flex",
                alignItems: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {badge.abbr}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted-foreground)",
              }}
            >
              {label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input
              ref={uploadRef}
              type="file"
              accept={PANEL_ACCEPT[panel]}
              multiple
              style={{ display: "none" }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFilesToPanel(panel, e.target.files);
                }
                e.target.value = "";
              }}
            />
            <button
              className="cmp-icon-btn"
              title={`Upload ${label} files`}
              onClick={() => uploadRef.current?.click()}
            >
              <Upload size={14} />
            </button>
            <button
              className="cmp-icon-btn"
              title={isMaxed ? "Restore" : "Maximize"}
              onClick={() => togglePanelMax(panel)}
            >
              {isMaxed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              className="cmp-icon-btn"
              title={isCollapsed ? "Expand" : "Collapse"}
              onClick={() => togglePanelCollapse(panel)}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
              className="cmp-icon-btn"
              title={`Clear ${label}`}
              onClick={() => clearPanelActiveFile(panel)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            <div
              style={{
                height: 32,
                flexShrink: 0,
                background: "var(--background)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                overflowX: "auto",
                padding: "0 8px",
              }}
            >
              {files.map((f, i) => (
                <FileTab
                  key={i}
                  name={f.name}
                  active={i === active}
                  canClose={files.length > 1}
                  onClick={() => setActive(i)}
                  onClose={() => removePanelFile(panel, i)}
                />
              ))}
              <button
                className="cmp-icon-btn"
                title="Add file"
                onClick={() => addPanelFile(panel)}
                style={{ alignSelf: "center" }}
              >
                <Plus size={16} />
              </button>
            </div>

            <textarea
              value={activeFile.content}
              onChange={(e) => updatePanelFileContent(panel, e.target.value)}
              onKeyDown={(e) => handleEditorKey(e, panel)}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              placeholder={`// ${label} here...`}
              className="cmp-editor"
            />
          </>
        )}
      </div>
    );
  }

  // ============================ RENDER ============================

  const consoleErrorCount = consoleEntries.filter((e) => e.level === "error").length;
  const singleConsoleErrorCount = singleConsoleEntries.filter((e) => e.level === "error").length;

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <style>{`
        .cmp-icon-btn {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: transparent;
          color: var(--muted-foreground);
          border: none;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
        }
        .cmp-icon-btn:hover {
          background: var(--muted);
          color: var(--foreground);
        }
        .cmp-icon-btn:active { background: rgba(127,127,127,0.18); }
        .cmp-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cmp-editor {
          flex: 1;
          min-height: 0;
          width: 100%;
          background: var(--editor-bg);
          color: var(--editor-fg);
          border: none;
          outline: none;
          resize: none;
          padding: 10px 14px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.65;
          tab-size: 2;
          white-space: pre;
          overflow: auto;
        }
        .cmp-editor::placeholder { color: rgba(128,128,128,0.3); }
        .cmp-runbtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 28px;
          padding: 0 14px;
          border-radius: 6px;
          background: #10b981;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 150ms ease;
        }
        .cmp-runbtn:hover { background: #059669; }
        .cmp-runbtn:active { background: #047857; }
        .cmp-mode-btn {
          height: 28px;
          padding: 0 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          background: transparent;
          color: var(--muted-foreground);
          transition: background 150ms ease, color 150ms ease;
        }
        .cmp-mode-btn:hover { background: var(--muted); color: var(--foreground); }
        .cmp-mode-btn.active { background: #10b981; color: #fff; }
        .cmp-resp-btn {
          height: 24px;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--muted-foreground);
          border-radius: 999px;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .cmp-resp-btn.active { background: #10b981; color: #fff; }
        .cmp-file-tab {
          height: 32px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          background: transparent;
          color: var(--muted-foreground);
          border: none;
          border-bottom: 2px solid transparent;
          transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
        }
        .cmp-file-tab:hover { background: rgba(127,127,127,0.08); color: var(--foreground); }
        .cmp-file-tab.active {
          background: var(--background);
          color: var(--foreground);
          border-bottom-color: #10b981;
        }
        :root {
          --editor-bg: #ffffff;
          --editor-fg: #1e1e1e;
          --output-bg: #f5f5f5;
        }
        :root.dark, .dark {
          --editor-bg: #1e1e1e;
          --editor-fg: #d4d4d4;
          --output-bg: #161616;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --editor-bg: #1e1e1e;
            --editor-fg: #d4d4d4;
            --output-bg: #161616;
          }
        }
      `}</style>

      {/* TOP BAR */}
      <div
        style={{
          height: 38,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/compilers"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--muted-foreground)",
              fontSize: 11,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <ChevronLeft size={12} />
            <span>Compilers</span>
          </Link>
          <span style={{ fontSize: 11, color: "rgba(128,128,128,0.4)", margin: "0 2px" }}>
            /
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Web Compiler</span>
        </div>
      </div>

      {/* MODE SWITCHER */}
      <div
        style={{
          height: 40,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 16px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          className={`cmp-mode-btn ${mode === "combined" ? "active" : ""}`}
          onClick={() => applyMode("combined")}
        >
          Combined
        </button>
        <button
          className={`cmp-mode-btn ${mode === "html" ? "active" : ""}`}
          onClick={() => applyMode("html")}
        >
          HTML only
        </button>
        <button
          className={`cmp-mode-btn ${mode === "css" ? "active" : ""}`}
          onClick={() => applyMode("css")}
        >
          CSS only
        </button>
        <button
          className={`cmp-mode-btn ${mode === "javascript" ? "active" : ""}`}
          onClick={() => applyMode("javascript")}
        >
          JavaScript
        </button>
        <button
          className={`cmp-mode-btn ${mode === "typescript" ? "active" : ""}`}
          onClick={() => applyMode("typescript")}
        >
          TypeScript
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {mode === "combined" ? (
          <div style={{ height: "100%", display: "flex" }}>
            {/* Left side: editors */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid var(--border)",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              {renderPanel("html")}
              {renderPanel("css")}
              {renderPanel("js")}
            </div>

            {/* Right side: preview */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  height: 40,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  background: "var(--card)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Preview
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={runCombined} className="cmp-runbtn">
                    <Play size={12} />
                    <span>Run</span>
                  </button>
                  <span style={{ fontSize: 11, opacity: 0.4 }}>Ctrl+Enter</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: 2,
                      background: "rgba(127,127,127,0.08)",
                      borderRadius: 999,
                    }}
                  >
                    <button
                      className={`cmp-resp-btn ${responsiveMode === "mobile" ? "active" : ""}`}
                      title="Mobile"
                      onClick={() => setResponsiveMode("mobile")}
                    >
                      <Smartphone size={11} />
                    </button>
                    <button
                      className={`cmp-resp-btn ${responsiveMode === "tablet" ? "active" : ""}`}
                      title="Tablet"
                      onClick={() => setResponsiveMode("tablet")}
                    >
                      <Tablet size={11} />
                    </button>
                    <button
                      className={`cmp-resp-btn ${responsiveMode === "desktop" ? "active" : ""}`}
                      title="Desktop"
                      onClick={() => setResponsiveMode("desktop")}
                    >
                      <Monitor size={11} />
                    </button>
                  </div>
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: "var(--border)",
                      margin: "0 4px",
                    }}
                  />
                  <button
                    className="cmp-icon-btn"
                    title="Refresh preview"
                    onClick={refreshCombined}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className="cmp-icon-btn"
                    title="Open in new tab"
                    onClick={openCombinedInNewTab}
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    className="cmp-icon-btn"
                    title="Fullscreen preview"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  background:
                    responsiveMode === "desktop"
                      ? "#fff"
                      : "rgba(127,127,127,0.08)",
                }}
              >
                <iframe
                  title="preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  srcDoc={previewSrcDoc}
                  style={{
                    border: "none",
                    background: "#fff",
                    width:
                      responsiveMode === "mobile"
                        ? 375
                        : responsiveMode === "tablet"
                        ? 768
                        : "100%",
                    height: "100%",
                    boxShadow:
                      responsiveMode !== "desktop"
                        ? "0 0 0 1px var(--border)"
                        : undefined,
                  }}
                />
              </div>

              {/* Console */}
              <div style={{ flexShrink: 0 }}>
                <div
                  onClick={() => setConsoleOpen(!consoleOpen)}
                  style={{
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 10px",
                    background: "var(--card)",
                    borderTop: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Terminal size={12} color="var(--muted-foreground)" />
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Console
                    </span>
                    {consoleErrorCount > 0 && (
                      <span
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          fontSize: 8,
                          fontWeight: 700,
                          borderRadius: 999,
                          padding: "1px 5px",
                        }}
                      >
                        {consoleErrorCount}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {consoleEntries.length > 0 && (
                      <button
                        className="cmp-icon-btn"
                        title="Clear console"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConsoleEntries([]);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {consoleOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </div>
                </div>
                {consoleOpen && (
                  <div
                    style={{
                      height: 120,
                      background: "var(--output-bg)",
                      padding: "6px 12px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      overflowY: "auto",
                    }}
                  >
                    {consoleEntries.length === 0 ? (
                      <div style={{ color: "var(--muted-foreground)" }}>
                        Console output will appear here
                      </div>
                    ) : (
                      consoleEntries.map((entry, i) => (
                        <ConsoleLine key={i} entry={entry} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen overlay (combined) */}
            {isFullscreen && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 50,
                  background: "#fff",
                }}
              >
                <button
                  onClick={() => setIsFullscreen(false)}
                  style={{
                    position: "fixed",
                    top: 12,
                    right: 12,
                    zIndex: 51,
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <X size={14} />
                  <span>Exit Fullscreen</span>
                </button>
                <iframe
                  title="preview-fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  srcDoc={previewSrcDoc}
                  style={{ border: "none", width: "100vw", height: "100vh" }}
                />
              </div>
            )}
          </div>
        ) : (
          <SingleModeView
            mode={mode}
            files={singleFiles}
            activeIndex={activeSingleFile}
            setActiveIndex={setActiveSingleFile}
            updateContent={updateSingleContent}
            addFile={addSingleFile}
            removeFile={removeSingleFile}
            uploadFiles={uploadSingle}
            uploadRef={uploadRefSingle}
            accept={singleAccept()}
            srcDoc={singleSrcDoc}
            transpiled={transpiledOutput}
            consoleEntries={singleConsoleEntries}
            clearConsole={() => setSingleConsoleEntries([])}
            consoleErrorCount={singleConsoleErrorCount}
            run={runSingle}
            refresh={refreshSingle}
            splitPosition={splitPosition}
            startSplitDrag={startSplitDrag}
            isDraggingSplit={isDraggingSplit}
            isFullscreen={singleFullscreen}
            setIsFullscreen={setSingleFullscreen}
            handleEditorKey={(e) => handleEditorKey(e, "single")}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 60,
            padding: "8px 14px",
            background: "rgba(239,68,68,0.95)",
            color: "#fff",
            fontSize: 12,
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            maxWidth: 320,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function FileTab({
  name,
  active,
  canClose,
  onClick,
  onClose,
}: {
  name: string;
  active: boolean;
  canClose: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  const display = name.length > 16 ? name.substring(0, 14) + "…" : name;
  return (
    <button className={`cmp-file-tab ${active ? "active" : ""}`} onClick={onClick}>
      <span>{display}</span>
      {canClose && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: 4,
            opacity: active ? 0.6 : 0.4,
          }}
          title="Close"
        >
          <X size={10} />
        </span>
      )}
    </button>
  );
}

function SingleModeView(props: {
  mode: Mode;
  files: FileItem[];
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  updateContent: (s: string) => void;
  addFile: () => void;
  removeFile: (i: number) => void;
  uploadFiles: (fl: FileList) => void;
  uploadRef: React.MutableRefObject<HTMLInputElement | null>;
  accept: string;
  srcDoc: string;
  transpiled: string;
  consoleEntries: ConsoleEntry[];
  clearConsole: () => void;
  consoleErrorCount: number;
  run: () => void;
  refresh: () => void;
  splitPosition: number;
  startSplitDrag: (e: ReactMouseEvent<HTMLDivElement>) => void;
  isDraggingSplit: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (b: boolean) => void;
  handleEditorKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const {
    mode,
    files,
    activeIndex,
    setActiveIndex,
    updateContent,
    addFile,
    removeFile,
    uploadFiles,
    uploadRef,
    accept,
    srcDoc,
    transpiled,
    consoleEntries,
    clearConsole,
    consoleErrorCount,
    run,
    refresh,
    splitPosition,
    startSplitDrag,
    isDraggingSplit,
    isFullscreen,
    setIsFullscreen,
    handleEditorKey,
  } = props;

  const activeFile = files[activeIndex] || { name: "", content: "" };

  let badge: BadgeStyle;
  let label: string;
  if (mode === "html") {
    badge = { abbr: "HTML", bg: "#e34c26", text: "#fff" };
    label = "HTML";
  } else if (mode === "css") {
    badge = { abbr: "CSS", bg: "#264de4", text: "#fff" };
    label = "CSS";
  } else if (mode === "javascript") {
    badge = { abbr: "JS", bg: "#f1e05a", text: "#000" };
    label = "JavaScript";
  } else {
    badge = { abbr: "TS", bg: "#3178c6", text: "#fff" };
    label = "TypeScript";
  }

  const bottomLabel =
    mode === "html"
      ? "Preview"
      : mode === "css"
      ? "Preview"
      : mode === "javascript"
      ? "Console"
      : "Output";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: `${splitPosition}%`,
          minHeight: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 38,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                height: 20,
                padding: "0 6px",
                borderRadius: 4,
                background: badge.bg,
                color: badge.text,
                display: "inline-flex",
                alignItems: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {badge.abbr}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted-foreground)",
              }}
            >
              {label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input
              ref={uploadRef}
              type="file"
              accept={accept}
              multiple
              style={{ display: "none" }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFiles(e.target.files);
                }
                e.target.value = "";
              }}
            />
            <button
              className="cmp-icon-btn"
              title="Upload file"
              onClick={() => uploadRef.current?.click()}
            >
              <Upload size={14} />
            </button>
            <button
              className="cmp-icon-btn"
              title={`Clear ${label}`}
              onClick={() => updateContent("")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div
          style={{
            height: 32,
            flexShrink: 0,
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            overflowX: "auto",
            padding: "0 8px",
          }}
        >
          {files.map((f, i) => (
            <FileTab
              key={i}
              name={f.name}
              active={i === activeIndex}
              canClose={files.length > 1}
              onClick={() => setActiveIndex(i)}
              onClose={() => removeFile(i)}
            />
          ))}
          <button
            className="cmp-icon-btn"
            title="Add file"
            onClick={addFile}
            style={{ alignSelf: "center" }}
          >
            <Plus size={16} />
          </button>
        </div>

        <textarea
          value={activeFile.content}
          onChange={(e) => updateContent(e.target.value)}
          onKeyDown={handleEditorKey}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          placeholder={`// ${label} here...`}
          className="cmp-editor"
        />
      </div>

      <div
        onMouseDown={startSplitDrag}
        style={{
          height: 4,
          flexShrink: 0,
          cursor: "row-resize",
          background: isDraggingSplit ? "#10b981" : "var(--border)",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (!isDraggingSplit) e.currentTarget.style.background = "#10b981";
        }}
        onMouseLeave={(e) => {
          if (!isDraggingSplit) e.currentTarget.style.background = "var(--border)";
        }}
      />

      <div
        style={{
          flex: 1,
          minHeight: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 38,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "var(--muted-foreground)",
            }}
          >
            {bottomLabel}
            {(mode === "javascript" || mode === "typescript") &&
              consoleErrorCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 5px",
                    marginLeft: 8,
                  }}
                >
                  {consoleErrorCount}
                </span>
              )}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={run} className="cmp-runbtn">
              <Play size={12} />
              <span>Run</span>
            </button>
            <span style={{ fontSize: 11, opacity: 0.4 }}>Ctrl+Enter</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {(mode === "javascript" || mode === "typescript") &&
              consoleEntries.length > 0 && (
                <button
                  className="cmp-icon-btn"
                  title="Clear console"
                  onClick={clearConsole}
                >
                  <Trash2 size={14} />
                </button>
              )}
            <button className="cmp-icon-btn" title="Refresh" onClick={refresh}>
              <RefreshCw size={14} />
            </button>
            {(mode === "html" || mode === "css") && (
              <button
                className="cmp-icon-btn"
                title="Fullscreen"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            position: "relative",
          }}
        >
          {mode === "html" && (
            <iframe
              title="html-preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              srcDoc={srcDoc}
              style={{
                border: "none",
                width: "100%",
                height: "100%",
                background: "#fff",
              }}
            />
          )}

          {mode === "css" && (
            <iframe
              title="css-preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              srcDoc={srcDoc}
              style={{
                border: "none",
                width: "100%",
                height: "100%",
                background: "#fff",
              }}
            />
          )}

          {mode === "javascript" && (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--output-bg)",
                padding: "10px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 1.65,
                overflowY: "auto",
                position: "relative",
              }}
            >
              <iframe
                title="js-runner"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={srcDoc}
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  border: "none",
                  visibility: "hidden",
                }}
              />
              {consoleEntries.length === 0 ? (
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
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Run JavaScript to see console output
                  </div>
                </div>
              ) : (
                consoleEntries.map((entry, i) => (
                  <ConsoleLine key={i} entry={entry} showTimestamp />
                ))
              )}
            </div>
          )}

          {mode === "typescript" && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  padding: "6px 14px",
                  background: "var(--card)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Transpiled JavaScript
              </div>
              <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                <pre
                  style={{
                    flex: 1,
                    margin: 0,
                    padding: "10px 14px",
                    background: "var(--editor-bg)",
                    color: "var(--editor-fg)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    overflow: "auto",
                    borderRight: "1px solid var(--border)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {transpiled || "// Run code to see transpiled output"}
                </pre>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "var(--output-bg)",
                    padding: "10px 14px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    overflowY: "auto",
                    position: "relative",
                  }}
                >
                  <iframe
                    title="ts-runner"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={srcDoc}
                    style={{
                      position: "absolute",
                      width: 0,
                      height: 0,
                      border: "none",
                      visibility: "hidden",
                    }}
                  />
                  {consoleEntries.length === 0 ? (
                    <div style={{ color: "var(--muted-foreground)" }}>
                      Console output will appear here
                    </div>
                  ) : (
                    consoleEntries.map((entry, i) => (
                      <ConsoleLine key={i} entry={entry} showTimestamp />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isFullscreen && (mode === "html" || mode === "css") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "#fff",
          }}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              position: "fixed",
              top: 12,
              right: 12,
              zIndex: 51,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <X size={14} />
            <span>Exit Fullscreen</span>
          </button>
          <iframe
            title="single-fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            srcDoc={srcDoc}
            style={{ border: "none", width: "100vw", height: "100vh" }}
          />
        </div>
      )}
    </div>
  );
}

function ConsoleLine({
  entry,
  showTimestamp,
}: {
  entry: ConsoleEntry;
  showTimestamp?: boolean;
}) {
  const color =
    entry.level === "error"
      ? "#f48771"
      : entry.level === "warn"
      ? "#dca040"
      : entry.level === "info"
      ? "#3b82f6"
      : "var(--editor-fg)";
  const Icon =
    entry.level === "error"
      ? AlertCircle
      : entry.level === "warn"
      ? AlertTriangle
      : entry.level === "info"
      ? FileText
      : null;
  const ts = showTimestamp
    ? new Date(entry.timestamp).toLocaleTimeString(undefined, { hour12: false })
    : null;
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "2px 0",
        color,
        alignItems: "flex-start",
      }}
    >
      {Icon ? (
        <Icon size={10} style={{ flexShrink: 0, marginTop: 4 }} />
      ) : (
        <span style={{ width: 10, flexShrink: 0 }} />
      )}
      {ts && (
        <span
          style={{ color: "var(--muted-foreground)", opacity: 0.6, flexShrink: 0 }}
        >
          {ts}
        </span>
      )}
      <span style={{ whiteSpace: "pre-wrap", flex: 1 }}>{entry.text}</span>
    </div>
  );
}
