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
  const [responsive, setResponsive] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  const [singleFiles, setSingleFiles] = useState<FileEntry[]>([{ name: "index.html", content: HTML_STARTER }]);
  const [activeSingle, setActiveSingle] = useState(0);
  const [singleOutput, setSingleOutput] = useState("");
  const [splitPos, setSplitPos] = useState(58);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const splitDragStartY = useRef(0);
  const splitDragStartPos = useRef(58);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const uploadHtmlRef = useRef<HTMLInputElement>(null);
  const uploadCssRef = useRef<HTMLInputElement>(null);
  const uploadJsRef = useRef<HTMLInputElement>(null);
  const uploadSingleRef = useRef<HTMLInputElement>(null);

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
    if (mode === "combined") return;
    setSingleFiles([{ name: SINGLE_NAMES[mode], content: SINGLE_STARTERS[mode] }]);
    setActiveSingle(0);
    setSingleOutput("");
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

  const uploadToPanel = async (panel: "html" | "css" | "js", file: File | null) => {
    if (!file) return;
    const content = await readFile(file);
    if (panel === "html") {
      setHtmlFiles((prev) => {
        const next = [...prev];
        next[activeHtml] = { name: file.name, content };
        return next;
      });
    } else if (panel === "css") {
      setCssFiles((prev) => {
        const next = [...prev];
        next[activeCss] = { name: file.name, content };
        return next;
      });
    } else {
      setJsFiles((prev) => {
        const next = [...prev];
        next[activeJs] = { name: file.name, content };
        return next;
      });
    }
  };

  const uploadToSingle = async (file: File | null) => {
    if (!file) return;
    const content = await readFile(file);
    setSingleFiles((prev) => {
      const next = [...prev];
      next[activeSingle] = { name: file.name, content };
      return next;
    });
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
    e.currentTarget.style.backgroundColor = "var(--muted)";
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

  const combinedPreviewDoc = previewSrc || PREVIEW_PLACEHOLDER;
  const singlePreviewDoc = singleOutput || PREVIEW_PLACEHOLDER;
  const errorCount = consoleEntries.filter((entry) => entry.method === "error").length;

  const renderConsoleLine = (entry: ConsoleEntry, index: number) => {
    const color =
      entry.method === "error" ? "#f48771" : entry.method === "warn" ? "#dca040" : "#d4d4d4";
    const Icon = entry.method === "error" ? AlertCircle : entry.method === "warn" ? AlertTriangle : null;
    return (
      <div key={index} style={{ display: "flex", gap: 8, padding: "1px 0", alignItems: "flex-start" }}>
        {Icon ? <Icon size={10} style={{ color, flexShrink: 0, marginTop: 3 }} /> : <span style={{ width: 10 }} />}
        <span style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.5, color }}>{entry.text}</span>
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
    const otherIsMaxed = maximized !== null && maximized !== panel;
    const flexValue = isMaxed ? 3 : otherIsMaxed ? 1 : 1;

    return (
      <div
        key={panel}
        style={{
          flex: collapsedPanel ? undefined : flexValue,
          height: collapsedPanel ? 38 : undefined,
          flexShrink: collapsedPanel ? 0 : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          transition: "flex 200ms ease",
          minHeight: collapsedPanel ? 38 : 100,
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
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted-foreground)",
              }}
            >
              {data.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input
              ref={data.uploadRef}
              type="file"
              accept={data.accept}
              style={{ display: "none" }}
              onChange={async (e) => {
                await uploadToPanel(panel, e.target.files?.[0] || null);
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
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              tabSize: 2,
            }}
          />
        )}
      </div>
    );
  };

  const renderCombinedMode = () => (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid var(--border)",
        }}
      >
        {renderCombinedPanel("html")}
        {renderCombinedPanel("css")}
        {renderCombinedPanel("js")}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted-foreground)",
            }}
          >
            Preview
          </span>

          <button
            type="button"
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
              fontWeight: 600,
              cursor: "pointer",
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

            <IconBtn title="Refresh" onClick={() => setPreviewSrc((prev) => prev || "")}>
              <RefreshCw size={14} />
            </IconBtn>
            <IconBtn
              title="Open in new tab"
              onClick={() => {
                const doc = previewSrc || PREVIEW_PLACEHOLDER;
                const blob = new Blob([doc], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener");
                setTimeout(() => URL.revokeObjectURL(url), 30000);
              }}
            >
              <ExternalLink size={14} />
            </IconBtn>
            <IconBtn title="Fullscreen" onClick={() => setIsFullscreen(true)}>
              <Maximize size={14} />
            </IconBtn>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              width: responsive === "mobile" ? 375 : responsive === "tablet" ? 768 : "100%",
              height: "100%",
              transition: "width 200ms ease",
            }}
          >
            <iframe
              srcDoc={combinedPreviewDoc}
              title="preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
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
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--muted-foreground)",
                }}
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
                    fontSize: 9,
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
                backgroundColor: "#161616",
                padding: "6px 12px",
              }}
            >
              {consoleEntries.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
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
        ref={splitContainerRef}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
      >
        <div
          style={{
            height: `${splitPos}%`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: "25%",
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
                ref={uploadSingleRef}
                type="file"
                accept={singleMode === "html" ? ".html,.htm" : singleMode === "css" ? ".css" : singleMode === "javascript" ? ".js,.mjs" : ".ts,.tsx"}
                style={{ display: "none" }}
                onChange={async (e) => {
                  await uploadToSingle(e.target.files?.[0] || null);
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
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              tabSize: 2,
            }}
          />
        </div>

        <div
          onMouseDown={startSplitDrag}
          style={{
            height: 4,
            flexShrink: 0,
            cursor: "row-resize",
            backgroundColor: isDraggingSplit ? "#10b981" : "var(--border)",
            transition: "background-color 150ms",
          }}
          onMouseEnter={(e) => {
            if (!isDraggingSplit) e.currentTarget.style.backgroundColor = "#10b981";
          }}
          onMouseLeave={(e) => {
            if (!isDraggingSplit) e.currentTarget.style.backgroundColor = "var(--border)";
          }}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "25%" }}>
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
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted-foreground)",
              }}
            >
              {bottomLabel}
            </span>

            <button
              type="button"
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
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Play size={12} />
              Run
              <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>Ctrl+Enter</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {(mode === "html" || mode === "css") && (
                <IconBtn title="Fullscreen" onClick={() => setIsFullscreen(true)}>
                  <Maximize size={14} />
                </IconBtn>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", position: "relative" }}>
            {singleMode === "html" || singleMode === "css" ? (
              <iframe
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
                  background: "var(--output-bg)",
                  padding: "10px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.65,
                  overflowY: "auto",
                }}
              >
                {singleOutput ? (
                  singleOutput.split("\n").map((line, index) => (
                    <div key={index} style={{ whiteSpace: "pre-wrap" }}>
                      {line}
                    </div>
                  ))
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
                  background: "var(--output-bg)",
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
                    {singleOutput || (
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--muted-foreground)" }}>
                        <FileCode size={22} />
                        <span>Click Run to transpile TypeScript</span>
                      </span>
                    )}
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
                    }}
                  >
                    {singleOutput ? (
                      singleOutput.split("\n").map((line, index) => (
                        <div key={index} style={{ whiteSpace: "pre-wrap" }}>
                          {line}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--muted-foreground)" }}>Console output will appear here</div>
                    )}
                  </div>
                </div>
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
          backgroundColor: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
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
                cursor: "pointer",
                transition: "background-color 150ms, color 150ms",
                backgroundColor: active ? "#10b981" : "transparent",
                color: active ? "white" : "var(--muted-foreground)",
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
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "white" }}>
          <button
            onClick={() => setIsFullscreen(false)}
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
        style={{
          display: "flex",
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
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
              fontWeight: 500,
              borderBottom: index === active ? "2px solid #10b981" : "2px solid transparent",
              color: index === active ? "var(--foreground)" : "var(--muted-foreground)",
              backgroundColor: "transparent",
              userSelect: "none",
            }}
          >
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
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
