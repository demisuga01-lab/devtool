"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronUp, Copy, ExternalLink, Maximize2, Minimize2, Play, Plus, RefreshCw, Terminal, Trash2, Upload, X } from "lucide-react";

type Mode = "combined" | "html" | "css" | "javascript" | "typescript";
type PanelKind = "html" | "css" | "js";
type FileKind = PanelKind | "typescript";
type ResponsiveMode = "mobile" | "tablet" | "desktop";
type ConsoleMethod = "log" | "error" | "warn" | "info";
type CodeFile = { id: string; name: string; content: string };
type ConsoleEntry = { id: string; method: ConsoleMethod; args: string[]; time: string };

const LANGUAGE_BADGES: Record<number, { abbr: string; bg: string; text: string }> = {
  71: { abbr: "PY", bg: "#3572A5", text: "#fff" },
  70: { abbr: "PY2", bg: "#3572A5", text: "#fff" },
  62: { abbr: "JV", bg: "#b07219", text: "#fff" },
  50: { abbr: "C", bg: "#555555", text: "#fff" },
  49: { abbr: "C", bg: "#555555", text: "#fff" },
  48: { abbr: "C", bg: "#555555", text: "#fff" },
  75: { abbr: "C", bg: "#555555", text: "#fff" },
  54: { abbr: "C++", bg: "#f34b7d", text: "#fff" },
  53: { abbr: "C++", bg: "#f34b7d", text: "#fff" },
  52: { abbr: "C++", bg: "#f34b7d", text: "#fff" },
  76: { abbr: "C++", bg: "#f34b7d", text: "#fff" },
  51: { abbr: "C#", bg: "#178600", text: "#fff" },
  73: { abbr: "RS", bg: "#dea584", text: "#000" },
  60: { abbr: "GO", bg: "#00ADD8", text: "#fff" },
  78: { abbr: "KT", bg: "#A97BFF", text: "#fff" },
  68: { abbr: "PHP", bg: "#4F5D95", text: "#fff" },
  72: { abbr: "RB", bg: "#701516", text: "#fff" },
  83: { abbr: "SW", bg: "#F05138", text: "#fff" },
  63: { abbr: "JS", bg: "#f1e05a", text: "#000" },
  74: { abbr: "TS", bg: "#3178c6", text: "#fff" },
  46: { abbr: "SH", bg: "#89e051", text: "#000" },
  85: { abbr: "PL", bg: "#0298c3", text: "#fff" },
  64: { abbr: "LUA", bg: "#000080", text: "#fff" },
  80: { abbr: "R", bg: "#198CE7", text: "#fff" },
  66: { abbr: "M", bg: "#0790C0", text: "#fff" },
  82: { abbr: "SQL", bg: "#e38c00", text: "#fff" },
  81: { abbr: "SC", bg: "#c22d40", text: "#fff" },
  86: { abbr: "CLJ", bg: "#db5855", text: "#fff" },
  88: { abbr: "GRV", bg: "#4298b8", text: "#fff" },
  47: { abbr: "BAS", bg: "#6e4a7e", text: "#fff" },
  84: { abbr: "VB", bg: "#945db7", text: "#fff" },
  87: { abbr: "FS", bg: "#b845fc", text: "#fff" },
  61: { abbr: "HS", bg: "#5e5086", text: "#fff" },
  57: { abbr: "EX", bg: "#6e4a7e", text: "#fff" },
  58: { abbr: "ERL", bg: "#B83998", text: "#fff" },
  65: { abbr: "ML", bg: "#3be133", text: "#000" },
  55: { abbr: "LISP", bg: "#3fb68b", text: "#fff" },
  69: { abbr: "PRO", bg: "#74283c", text: "#fff" },
  56: { abbr: "D", bg: "#ba595e", text: "#fff" },
  59: { abbr: "F", bg: "#4d41b1", text: "#fff" },
  67: { abbr: "PAS", bg: "#E3F171", text: "#000" },
  79: { abbr: "OC", bg: "#438eff", text: "#fff" },
  77: { abbr: "COB", bg: "#005A9C", text: "#fff" },
  45: { abbr: "ASM", bg: "#6e4a7e", text: "#fff" },
};

const RUN_STARTERS: Record<number, string> = {
  71: "# Python 3.8.1\nname = 'World'\nprint(f'Hello, {name}!')\n",
  70: "# Python 2.7.17\nprint 'Hello, World!'\n",
  62: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}\n",
  50: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  49: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  48: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  75: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  54: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  53: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  52: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  76: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  51: "using System;\n\nclass MainClass {\n    public static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}\n",
  73: "fn main() {\n    println!(\"Hello, World!\");\n}\n",
  60: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}\n",
  78: "fun main() {\n    println(\"Hello, World!\")\n}\n",
  68: "<?php\necho \"Hello, World!\\n\";\n",
  72: "puts \"Hello, World!\"\n",
  83: "print(\"Hello, World!\")\n",
  63: "console.log('Hello, World!');\n",
  74: "const message: string = 'Hello, World!';\nconsole.log(message);\n",
  46: "echo \"Hello, World!\"\n",
  85: "print \"Hello, World!\\n\";\n",
  64: "print(\"Hello, World!\")\n",
  80: "print(\"Hello, World!\")\n",
  66: "disp(\"Hello, World!\")\n",
  82: "SELECT 'Hello, World!' AS message;\n",
  81: "object Main extends App {\n    println(\"Hello, World!\")\n}\n",
  86: "(println \"Hello, World!\")\n",
  88: "println \"Hello, World!\"\n",
  47: "Print \"Hello, World!\"\n",
  84: "Module Main\n    Sub Main()\n        Console.WriteLine(\"Hello, World!\")\n    End Sub\nEnd Module\n",
  87: "printfn \"Hello, World!\"\n",
  61: "main = putStrLn \"Hello, World!\"\n",
  57: "IO.puts(\"Hello, World!\")\n",
  58: "main(_) ->\n    io:format(\"Hello, World!~n\").\n",
  65: "print_endline \"Hello, World!\";;\n",
  55: "(write-line \"Hello, World!\")\n",
  69: ":- initialization(main).\nmain :- write('Hello, World!'), nl, halt.\n",
  56: "import std.stdio;\n\nvoid main() {\n    writeln(\"Hello, World!\");\n}\n",
  59: "program hello\n    print *, \"Hello, World!\"\nend program hello\n",
  67: "program Hello;\nbegin\n    writeln('Hello, World!');\nend.\n",
  79: "#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@\"Hello, World!\");\n    return 0;\n}\n",
  77: "IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY \"Hello, World!\".\nSTOP RUN.\n",
  45: "section .text\n    global _start\n_start:\n    ; Start coding here\n",
};

const HTML_STARTER = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Start building something amazing.</p>\n</body>\n</html>";
const CSS_STARTER = "/* Styles */\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  color: #0f172a;\n}\n\nh1 {\n  color: #10b981;\n}";
const JS_STARTER = "// JavaScript\nconsole.log('Hello, World!');\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('DOM ready');\n});";
const TS_STARTER = "// TypeScript\nconst message: string = 'Hello, World!';\nconsole.log(message);\n\ninterface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = { name: 'Alice', age: 30 };\nconsole.log(`User: ${user.name}, Age: ${user.age}`);";

const MODES: { id: Mode; label: string; url: string }[] = [
  { id: "combined", label: "Combined", url: "combine" },
  { id: "html", label: "HTML only", url: "html" },
  { id: "css", label: "CSS only", url: "css" },
  { id: "javascript", label: "JavaScript", url: "javascript" },
  { id: "typescript", label: "TypeScript", url: "typescript" },
];

const PANEL_META: Record<FileKind, { label: string; abbr: string; bg: string; text: string; accept: string; extension: string; seed: string }> = {
  html: { label: "HTML", abbr: "HTML", bg: "#e34c26", text: "#fff", accept: ".html", extension: ".html", seed: "index" },
  css: { label: "CSS", abbr: "CSS", bg: "#264de4", text: "#fff", accept: ".css", extension: ".css", seed: "styles" },
  js: { label: "JavaScript", abbr: "JS", bg: "#f1e05a", text: "#000", accept: ".js", extension: ".js", seed: "script" },
  typescript: { label: "TypeScript", abbr: "TS", bg: "#3178c6", text: "#fff", accept: ".ts", extension: ".ts", seed: "main" },
};

function getLanguageBadge(langId: number) {
  return LANGUAGE_BADGES[langId] ?? { abbr: "TXT", bg: "#555555", text: "#fff" };
}

function getStarterCode(langId: number) {
  return RUN_STARTERS[langId] ?? "// Start coding here...\n";
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

const codeClass = "font-code compiler-scroll text-[13px] leading-[1.65] font-normal";

export default function WebCompilerPage() {
  const [mode, setMode] = useState<Mode>("combined");
  const [htmlFiles, setHtmlFiles] = useState<CodeFile[]>(() => [makeFile("index.html", HTML_STARTER)]);
  const [cssFiles, setCssFiles] = useState<CodeFile[]>(() => [makeFile("styles.css", CSS_STARTER)]);
  const [jsFiles, setJsFiles] = useState<CodeFile[]>(() => [makeFile("script.js", JS_STARTER)]);
  const [tsFiles, setTsFiles] = useState<CodeFile[]>(() => [makeFile("main.ts", TS_STARTER)]);
  const [activeHtmlFile, setActiveHtmlFile] = useState(0);
  const [activeCssFile, setActiveCssFile] = useState(0);
  const [activeJsFile, setActiveJsFile] = useState(0);
  const [activeTsFile, setActiveTsFile] = useState(0);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelKind | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<PanelKind>>(() => new Set());
  const [previewSrcDoc, setPreviewSrcDoc] = useState(() => buildCombinedDocument(HTML_STARTER, CSS_STARTER, JS_STARTER));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [responsiveMode, setResponsiveMode] = useState<ResponsiveMode>("desktop");
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [singleOutput, setSingleOutput] = useState("");
  const [splitPosition, setSplitPosition] = useState(58);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(normalizeMode(params.get("mode") || params.get("lang")));
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCurrentMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; method?: ConsoleMethod; args?: unknown[] } | null;
      if (data?.type !== "console") return;
      setConsoleEntries((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random()}`,
          method: data.method ?? "log",
          args: (data.args ?? []).map((item) => String(item)),
          time: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ].slice(-300));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const filesByKind = useMemo(() => ({
    html: { files: htmlFiles, setFiles: setHtmlFiles, active: activeHtmlFile, setActive: setActiveHtmlFile },
    css: { files: cssFiles, setFiles: setCssFiles, active: activeCssFile, setActive: setActiveCssFile },
    js: { files: jsFiles, setFiles: setJsFiles, active: activeJsFile, setActive: setActiveJsFile },
    typescript: { files: tsFiles, setFiles: setTsFiles, active: activeTsFile, setActive: setActiveTsFile },
  }), [activeCssFile, activeHtmlFile, activeJsFile, activeTsFile, cssFiles, htmlFiles, jsFiles, tsFiles]);

  function switchMode(next: Mode) {
    setMode(next);
    const urlMode = MODES.find((item) => item.id === next)?.url ?? "combine";
    window.history.replaceState(null, "", `/compilers/web?mode=${urlMode}`);
  }

  function runCurrentMode() {
    setConsoleEntries([]);
    if (mode === "combined") {
      setPreviewSrcDoc(buildCombinedDocument(joinFiles(htmlFiles), joinFiles(cssFiles), joinFiles(jsFiles)));
      return;
    }
    if (mode === "html") {
      setPreviewSrcDoc(buildCombinedDocument(joinFiles(htmlFiles), "", ""));
      return;
    }
    if (mode === "css") {
      const css = joinFiles(cssFiles);
      setSingleOutput(css);
      setPreviewSrcDoc(buildCssSample(css));
      return;
    }
    if (mode === "javascript") {
      setPreviewSrcDoc(buildCombinedDocument("<main><h1>JavaScript Console</h1><button id=\"sample\">Sample button</button></main>", "body{font-family:system-ui,sans-serif;padding:2rem;}button{padding:.7rem 1rem;border:0;border-radius:.5rem;background:#10b981;color:white;}", joinFiles(jsFiles)));
      return;
    }
    const js = transpileTypeScript(joinFiles(tsFiles));
    setSingleOutput(js);
    setPreviewSrcDoc(buildCombinedDocument("<main><h1>TypeScript Preview</h1></main>", "body{font-family:system-ui,sans-serif;padding:2rem;}", js));
  }

  function openPreview() {
    const blob = new Blob([previewSrcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 6000);
  }

  function refreshPreview() {
    setPreviewSrcDoc((current) => `${current}\n<!-- refreshed ${Date.now()} -->`);
  }

  function updateFile(kind: FileKind, content: string) {
    const bucket = filesByKind[kind];
    bucket.setFiles((current) => current.map((file, index) => index === bucket.active ? { ...file, content } : file));
  }

  function addFile(kind: FileKind) {
    const bucket = filesByKind[kind];
    if (bucket.files.length >= 20) {
      setToast("Maximum 20 files per panel");
      return;
    }
    const meta = PANEL_META[kind];
    const next = makeFile(`${meta.seed}${bucket.files.length + 1}${meta.extension}`, "");
    bucket.setFiles((current) => [...current, next]);
    bucket.setActive(bucket.files.length);
  }

  function removeFile(kind: FileKind, index: number) {
    const bucket = filesByKind[kind];
    if (bucket.files.length === 1) {
      bucket.setFiles([makeFile(`${PANEL_META[kind].seed}${PANEL_META[kind].extension}`, "")]);
      bucket.setActive(0);
      return;
    }
    bucket.setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    bucket.setActive(Math.max(0, Math.min(bucket.active, bucket.files.length - 2)));
  }

  function clearFile(kind: FileKind) {
    updateFile(kind, "");
  }

  function uploadFiles(kind: FileKind, list: FileList | null) {
    if (!list?.length) return;
    const bucket = filesByKind[kind];
    const incoming = Array.from(list);
    if (bucket.files.length + incoming.length > 20) {
      setToast("Maximum 20 files per panel");
      return;
    }
    const meta = PANEL_META[kind];
    if (incoming.some((file) => !file.name.toLowerCase().endsWith(meta.extension))) {
      setToast(`Only ${meta.extension} files accepted`);
      return;
    }
    if (incoming.some((file) => file.size > 500 * 1024)) {
      setToast("File must be under 500KB");
      return;
    }
    Promise.all(incoming.map(readFileAsCode)).then((nextFiles) => {
      bucket.setFiles((current) => [...current, ...nextFiles]);
      bucket.setActive(bucket.files.length);
    }).catch(() => setToast("Could not read selected file"));
  }

  function toggleCollapse(kind: PanelKind) {
    setCollapsedPanels((current) => {
      const next = new Set(current);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        if (next.size >= 2) return current;
        next.add(kind);
      }
      return next;
    });
  }

  function startVerticalResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingSplit(true);
    const onMove = (move: MouseEvent) => {
      const topOffset = 78;
      const available = window.innerHeight - topOffset;
      const percent = ((move.clientY - topOffset) / available) * 100;
      setSplitPosition(Math.min(75, Math.max(25, percent)));
    };
    const onUp = () => {
      setIsDraggingSplit(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const activeSingleKind: FileKind = mode === "typescript" ? "typescript" : mode === "javascript" ? "js" : mode === "html" ? "html" : "css";
  const activeSingleBucket = filesByKind[activeSingleKind];
  const activeSingleContent = activeSingleBucket.files[activeSingleBucket.active]?.content ?? "";
  const cssForOutput = joinFiles(cssFiles);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <TopBar />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-card px-4">
        {MODES.map((item) => (
          <button key={item.id} type="button" onClick={() => switchMode(item.id)} className={`h-7 rounded-md px-3 text-xs font-medium transition duration-150 ${mode === item.id ? "bg-[#10b981] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="min-h-0 flex-1 overflow-hidden">
        {mode === "combined" ? (
          <div className="flex h-full flex-col overflow-hidden md:flex-row">
            <div className="flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden border-r border-border">
              {(["html", "css", "js"] as PanelKind[]).map((kind) => {
                const bucket = filesByKind[kind];
                return (
                  <EditorPanel
                    key={kind}
                    kind={kind}
                    files={bucket.files}
                    activeIndex={bucket.active}
                    onActive={bucket.setActive}
                    onChange={(value) => updateFile(kind, value)}
                    onUpload={(files) => uploadFiles(kind, files)}
                    onAdd={() => addFile(kind)}
                    onRemove={(index) => removeFile(kind, index)}
                    onClear={() => clearFile(kind)}
                    onRun={runCurrentMode}
                    collapsed={collapsedPanels.has(kind)}
                    maximized={maximizedPanel === kind}
                    sizeClass={combinedPanelClass(kind, maximizedPanel, collapsedPanels)}
                    onCollapse={() => toggleCollapse(kind)}
                    onMaximize={() => setMaximizedPanel((current) => current === kind ? null : kind)}
                    allowCollapse
                  />
                );
              })}
            </div>
            <PreviewPane
              srcDoc={previewSrcDoc}
              responsiveMode={responsiveMode}
              setResponsiveMode={setResponsiveMode}
              onRun={runCurrentMode}
              onRefresh={refreshPreview}
              onOpen={openPreview}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              consoleEntries={consoleEntries}
              consoleOpen={consoleOpen}
              setConsoleOpen={setConsoleOpen}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            <div style={{ height: `${splitPosition}%` }} className="min-h-[220px] shrink-0 overflow-hidden">
              <EditorPanel
                kind={activeSingleKind}
                files={activeSingleBucket.files}
                activeIndex={activeSingleBucket.active}
                onActive={activeSingleBucket.setActive}
                onChange={(value) => updateFile(activeSingleKind, value)}
                onUpload={(files) => uploadFiles(activeSingleKind, files)}
                onAdd={() => addFile(activeSingleKind)}
                onRemove={(index) => removeFile(activeSingleKind, index)}
                onClear={() => clearFile(activeSingleKind)}
                onRun={runCurrentMode}
                collapsed={false}
                maximized={splitPosition > 74}
                sizeClass="h-full"
                onCollapse={() => undefined}
                onMaximize={() => setSplitPosition((value) => value > 74 ? 58 : 75)}
              />
            </div>
            <div onMouseDown={startVerticalResize} className={`h-1 shrink-0 cursor-row-resize bg-border transition hover:bg-[#10b981] ${isDraggingSplit ? "bg-[#10b981]" : ""}`} />
            <SingleOutput
              mode={mode}
              srcDoc={previewSrcDoc}
              responsiveMode={responsiveMode}
              setResponsiveMode={setResponsiveMode}
              onRun={runCurrentMode}
              onRefresh={refreshPreview}
              onOpen={openPreview}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              consoleEntries={consoleEntries}
              singleOutput={mode === "css" ? cssForOutput || singleOutput : singleOutput}
              clearConsole={() => setConsoleEntries([])}
            />
          </div>
        )}
      </section>
      <style jsx global>{compilerStyles}</style>
    </main>
  );
}

function TopBar() {
  return (
    <header className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-card px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/compilers" className="flex items-center gap-1 text-[11px] text-muted-foreground transition duration-150 hover:text-foreground">
          <ChevronLeft size={12} />
          Compilers
        </Link>
        <span className="mx-0.5 text-[11px] text-muted-foreground/40">/</span>
        <h1 className="truncate text-sm font-semibold">Web Compiler</h1>
      </div>
    </header>
  );
}

function EditorPanel({ kind, files, activeIndex, onActive, onChange, onUpload, onAdd, onRemove, onClear, onRun, collapsed, maximized, sizeClass, onCollapse, onMaximize, allowCollapse = false }: { kind: FileKind; files: CodeFile[]; activeIndex: number; onActive: (index: number) => void; onChange: (value: string) => void; onUpload: (files: FileList | null) => void; onAdd: () => void; onRemove: (index: number) => void; onClear: () => void; onRun: () => void; collapsed: boolean; maximized: boolean; sizeClass: string; onCollapse: () => void; onMaximize: () => void; allowCollapse?: boolean }) {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const meta = PANEL_META[kind];
  const activeFile = files[activeIndex] ?? files[0];

  return (
    <div className={`flex min-h-[38px] flex-col overflow-hidden border-b border-border last:border-b-0 transition-[flex] duration-200 ${sizeClass}`}>
      <div className={`flex h-[38px] shrink-0 items-center justify-between bg-card px-2.5 ${collapsed ? "" : "border-b border-border"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-code flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold" style={{ backgroundColor: meta.bg, color: meta.text }}>{meta.abbr}</span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{meta.label}</span>
          {!collapsed && <span className="text-[11px] text-muted-foreground/60">{formatBytes(new Blob([activeFile?.content ?? ""]).size)}</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <input ref={uploadRef} type="file" multiple accept={meta.accept} className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => { onUpload(event.target.files); event.currentTarget.value = ""; }} />
          <IconButton title={`Upload ${meta.label} files`} onClick={() => uploadRef.current?.click()}><Upload size={14} /></IconButton>
          <IconButton title={maximized ? "Restore" : "Maximize"} onClick={onMaximize}>{maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</IconButton>
          {allowCollapse && <IconButton title={collapsed ? "Expand" : "Collapse"} onClick={onCollapse}>{collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</IconButton>}
          <IconButton title={`Clear ${meta.label}`} onClick={onClear}><Trash2 size={14} /></IconButton>
        </div>
      </div>
      {!collapsed && files.length > 1 && <FileTabs files={files} activeIndex={activeIndex} onActive={onActive} onRemove={onRemove} onAdd={onAdd} />}
      {!collapsed && (
        <textarea
          value={activeFile?.content ?? ""}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => handleEditorKey(event, activeFile?.content ?? "", onChange, onRun)}
          spellCheck={false}
          autoComplete="off"
          className={`${codeClass} min-h-[150px] flex-1 resize-none border-0 bg-white px-3.5 py-2.5 text-[#1e1e1e] outline-none dark:bg-[#1e1e1e] dark:text-[#d4d4d4]`}
        />
      )}
    </div>
  );
}

function FileTabs({ files, activeIndex, onActive, onRemove, onAdd }: { files: CodeFile[]; activeIndex: number; onActive: (index: number) => void; onRemove: (index: number) => void; onAdd: () => void }) {
  return (
    <div className="compiler-scroll flex h-8 shrink-0 items-stretch overflow-x-auto border-b border-border bg-background px-2">
      {files.map((file, index) => (
        <button key={file.id} type="button" onClick={() => onActive(index)} className={`group flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium transition duration-150 ${index === activeIndex ? "border-[#10b981] text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}>
          <span className="truncate">{truncate(file.name, 16)}</span>
          <span onClick={(event) => { event.stopPropagation(); onRemove(index); }} className="rounded p-0.5 opacity-40 transition hover:bg-muted group-hover:opacity-100">
            <X size={10} />
          </span>
        </button>
      ))}
      <button type="button" title="Add file" onClick={onAdd} className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition hover:text-foreground">
        <Plus size={16} />
      </button>
    </div>
  );
}

function PreviewPane({ srcDoc, responsiveMode, setResponsiveMode, onRun, onRefresh, onOpen, isFullscreen, setIsFullscreen, consoleEntries, consoleOpen, setConsoleOpen }: { srcDoc: string; responsiveMode: ResponsiveMode; setResponsiveMode: (mode: ResponsiveMode) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; isFullscreen: boolean; setIsFullscreen: (value: boolean) => void; consoleEntries: ConsoleEntry[]; consoleOpen: boolean; setConsoleOpen: (value: boolean) => void }) {
  const errorCount = consoleEntries.filter((entry) => entry.method === "error").length;
  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-white" : "flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden"}>
      {!isFullscreen && (
        <PreviewToolbar
          label="Preview"
          responsiveMode={responsiveMode}
          setResponsiveMode={setResponsiveMode}
          onRun={onRun}
          onRefresh={onRefresh}
          onOpen={onOpen}
          onFullscreen={() => setIsFullscreen(true)}
        />
      )}
      {isFullscreen && (
        <button type="button" onClick={() => setIsFullscreen(false)} className="fixed right-3 top-3 z-[51] flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
          <X size={14} />
          Exit Fullscreen
        </button>
      )}
      <PreviewFrame srcDoc={srcDoc} responsiveMode={isFullscreen ? "desktop" : responsiveMode} />
      {!isFullscreen && (
        <>
          {consoleOpen && <ConsoleOutput entries={consoleEntries} fixedHeight />}
          <button type="button" onClick={() => setConsoleOpen(!consoleOpen)} className="flex h-8 shrink-0 cursor-pointer items-center justify-between border-t border-border bg-card px-2.5 transition hover:bg-muted/30">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Terminal size={12} />
              Console
              {errorCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-px text-[8px] text-white">{errorCount}</span>}
            </span>
            {consoleOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </>
      )}
    </div>
  );
}

function PreviewToolbar({ label, responsiveMode, setResponsiveMode, onRun, onRefresh, onOpen, onFullscreen }: { label: string; responsiveMode: ResponsiveMode; setResponsiveMode: (mode: ResponsiveMode) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; onFullscreen: () => void }) {
  return (
    <div className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onRun} className="flex h-7 items-center gap-1.5 rounded-md bg-[#10b981] px-3.5 text-xs font-semibold text-white transition hover:bg-[#059669] active:bg-[#047857]">
          <Play size={12} />
          Run
        </button>
        <span className="text-[11px] text-muted-foreground/50">Ctrl+Enter</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <ResponsiveToggle value={responsiveMode} onChange={setResponsiveMode} />
        <div className="mx-1 h-4 w-px bg-border" />
        <IconButton title="Refresh preview" onClick={onRefresh}><RefreshCw size={14} /></IconButton>
        <IconButton title="Open in new tab" onClick={onOpen}><ExternalLink size={14} /></IconButton>
        <IconButton title="Fullscreen preview" onClick={onFullscreen}><Maximize2 size={14} /></IconButton>
      </div>
    </div>
  );
}

function PreviewFrame({ srcDoc, responsiveMode }: { srcDoc: string; responsiveMode: ResponsiveMode }) {
  return (
    <div className={`flex min-h-0 flex-1 justify-center overflow-auto ${responsiveMode === "desktop" ? "bg-white" : "bg-muted/30"}`}>
      <iframe
        title="preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        srcDoc={srcDoc}
        className="h-full border-0 bg-white"
        style={{ width: iframeWidth(responsiveMode), boxShadow: responsiveMode === "desktop" ? "none" : "0 0 0 1px var(--border)" }}
      />
    </div>
  );
}

function SingleOutput({ mode, srcDoc, responsiveMode, setResponsiveMode, onRun, onRefresh, onOpen, isFullscreen, setIsFullscreen, consoleEntries, singleOutput, clearConsole }: { mode: Mode; srcDoc: string; responsiveMode: ResponsiveMode; setResponsiveMode: (mode: ResponsiveMode) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; isFullscreen: boolean; setIsFullscreen: (value: boolean) => void; consoleEntries: ConsoleEntry[]; singleOutput: string; clearConsole: () => void }) {
  if (mode === "javascript") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <OutputToolbar label="Console" onRun={onRun} right={<IconButton title="Clear console" onClick={clearConsole}><Trash2 size={14} /></IconButton>} />
        <ConsoleOutput entries={consoleEntries} />
        <iframe title="JavaScript execution" sandbox="allow-scripts allow-same-origin allow-forms allow-modals" srcDoc={srcDoc} className="hidden" />
      </div>
    );
  }

  if (mode === "typescript") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <OutputToolbar label="Transpiled JavaScript" onRun={onRun} runLabel="Transpile" right={<span className="text-[11px] text-muted-foreground/50">{formatMs(0)}</span>} />
        <pre className={`${codeClass} min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f5f5f5] px-3.5 py-2.5 text-[#1e1e1e] dark:bg-[#161616] dark:text-[#d4d4d4]`}>{singleOutput || "Transpiled JavaScript will appear here."}</pre>
      </div>
    );
  }

  if (mode === "css") {
    return (
      <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden border-r border-border">
          <OutputToolbar label="Preview" onRun={onRun} />
          <PreviewFrame srcDoc={srcDoc} responsiveMode="desktop" />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden">
          <OutputToolbar label="CSS Output" onRun={onRun} runLabel="Apply CSS" />
          <pre className={`${codeClass} min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f5f5f5] px-3.5 py-2.5 text-[#1e1e1e] dark:bg-[#161616] dark:text-[#d4d4d4]`}>{singleOutput || "Run to apply CSS to the sample preview."}</pre>
        </div>
      </div>
    );
  }

  return (
    <PreviewPane
      srcDoc={srcDoc}
      responsiveMode={responsiveMode}
      setResponsiveMode={setResponsiveMode}
      onRun={onRun}
      onRefresh={onRefresh}
      onOpen={onOpen}
      isFullscreen={isFullscreen}
      setIsFullscreen={setIsFullscreen}
      consoleEntries={[]}
      consoleOpen={false}
      setConsoleOpen={() => undefined}
    />
  );
}

function OutputToolbar({ label, onRun, runLabel = "Run", right }: { label: string; onRun: () => void; runLabel?: string; right?: ReactNode }) {
  return (
    <div className="grid h-[38px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <button type="button" onClick={onRun} className="flex h-7 items-center gap-1.5 rounded-md bg-[#10b981] px-3.5 text-xs font-semibold text-white transition hover:bg-[#059669] active:bg-[#047857]">
        <Play size={12} />
        {runLabel}
      </button>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}

function ConsoleOutput({ entries, fixedHeight = false }: { entries: ConsoleEntry[]; fixedHeight?: boolean }) {
  if (!entries.length) {
    return <div className={`${fixedHeight ? "h-[120px] shrink-0 border-t border-border" : "min-h-0 flex-1"} bg-[#f5f5f5] px-3 py-2.5 text-xs text-muted-foreground dark:bg-[#161616]`}>Console output will appear here</div>;
  }
  return (
    <div className={`${fixedHeight ? "h-[120px] shrink-0 border-t border-border" : "min-h-0 flex-1"} ${codeClass} overflow-auto bg-[#f5f5f5] px-3 py-1.5 dark:bg-[#161616]`}>
      {entries.map((entry) => (
        <div key={entry.id} className={`flex gap-2 py-0.5 ${entry.method === "error" ? "text-red-600 dark:text-red-400" : entry.method === "warn" ? "text-amber-600 dark:text-amber-400" : "text-[#1e1e1e] dark:text-[#d4d4d4]"}`}>
          <span className="w-14 shrink-0 text-[11px] text-muted-foreground/50">{entry.time}</span>
          {entry.method === "error" && <AlertCircle size={10} className="mt-1 shrink-0" />}
          {entry.method === "warn" && <AlertTriangle size={10} className="mt-1 shrink-0" />}
          <span>{entry.args.join(" ")}</span>
        </div>
      ))}
    </div>
  );
}

function ResponsiveToggle({ value, onChange }: { value: ResponsiveMode; onChange: (mode: ResponsiveMode) => void }) {
  return (
    <div className="flex rounded-full border border-border p-0.5">
      {(["mobile", "tablet", "desktop"] as ResponsiveMode[]).map((mode) => (
        <button key={mode} type="button" onClick={() => onChange(mode)} className={`h-6 rounded-full px-2.5 text-[10px] font-medium capitalize transition duration-150 ${value === mode ? "bg-[#10b981] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          {mode}
        </button>
      ))}
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground active:bg-muted/80">
      {children}
    </button>
  );
}

function handleEditorKey(event: KeyboardEvent<HTMLTextAreaElement>, value: string, onChange: (value: string) => void, onRun: () => void) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    onRun();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }
}

function combinedPanelClass(kind: PanelKind, maximized: PanelKind | null, collapsed: Set<PanelKind>) {
  if (collapsed.has(kind)) return "h-[38px] flex-none";
  if (!maximized) return "flex-1";
  return maximized === kind ? "flex-[3]" : "flex-1";
}

function normalizeMode(value: string | null): Mode {
  if (value === "html" || value === "css" || value === "javascript" || value === "typescript") return value;
  return "combined";
}

function makeFile(name: string, content: string): CodeFile {
  return { id: `${name}-${Math.random().toString(36).slice(2)}`, name, content };
}

function readFileAsCode(file: File): Promise<CodeFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(makeFile(file.name, String(reader.result ?? "")));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function joinFiles(files: CodeFile[]) {
  return files.map((file) => file.content).join("\n");
}

function buildCombinedDocument(html: string, css: string, js: string) {
  const styleTag = `<style>\n${css}\n</style>`;
  const scriptTag = `<script>\n${consoleCaptureScript()}\n${escapeScript(js)}\n<\/script>`;
  if (/<!doctype/i.test(html)) {
    let document = html;
    document = /<\/head>/i.test(document) ? document.replace(/<\/head>/i, `${styleTag}\n</head>`) : document.replace(/<html[^>]*>/i, "$&\n<head>\n" + styleTag + "\n</head>");
    document = /<\/body>/i.test(document) ? document.replace(/<\/body>/i, `${scriptTag}\n</body>`) : `${document}\n${scriptTag}`;
    return document;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${styleTag}
</head>
<body>
${html}
${scriptTag}
</body>
</html>`;
}

function buildCssSample(css: string) {
  return buildCombinedDocument(`<main class="sample">
  <section class="card">
    <p class="eyebrow">Sample interface</p>
    <h1>CSS Preview</h1>
    <h2>Heading level two</h2>
    <h3>Heading level three</h3>
    <p>Use this sample HTML to inspect typography, spacing, cards, controls, and links.</p>
    <input placeholder="Input field" />
    <div class="actions">
      <button>Primary Button</button>
      <a href="#">Example link</a>
    </div>
  </section>
</main>`, css, "");
}

function consoleCaptureScript() {
  return `const __console = window.console;
['log','error','warn','info'].forEach(method => {
  window.console[method] = (...args) => {
    __console[method](...args);
    window.parent.postMessage({
      type: 'console',
      method,
      args: args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
        catch { return String(a); }
      })
    }, '*');
  };
});
window.onerror = (message, source, line, column) => {
  window.parent.postMessage({ type: 'console', method: 'error', args: [String(message) + ' at ' + line + ':' + column] }, '*');
};`;
}

function escapeScript(source: string) {
  return source.replace(/<\/script/gi, "<\\/script");
}

function transpileTypeScript(source: string) {
  return source
    .replace(/^\s*interface\s+\w+\s*{[\s\S]*?}\s*$/gm, "")
    .replace(/^\s*type\s+\w+\s*=\s*[^;]+;?/gm, "")
    .replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>,\s[\]|&?]*(?=\s*[=,);])/g, "")
    .replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>,\s[\]|&?]*/g, "")
    .replace(/<([A-Za-z_$][A-Za-z0-9_$<>,\s]*)>\s*(?=[A-Za-z_$({])/g, "");
}

function iframeWidth(mode: ResponsiveMode) {
  if (mode === "mobile") return "375px";
  if (mode === "tablet") return "768px";
  return "100%";
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function Toast({ message }: { message: string }) {
  return <div className="compiler-toast fixed right-4 top-4 z-[70] rounded-lg bg-red-500/95 px-4 py-3 text-xs font-medium text-white shadow-lg">{message}</div>;
}

const compilerStyles = `
.font-code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace;
}
.compiler-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(128,128,128,0.35) transparent;
}
.compiler-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.compiler-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.compiler-scroll::-webkit-scrollbar-thumb {
  background: rgba(128,128,128,0.35);
  border-radius: 999px;
}
@keyframes compilerToast {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
.compiler-toast {
  animation: compilerToast 180ms ease-out both;
}
`;
