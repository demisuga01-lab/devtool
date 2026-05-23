"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Maximize2, Play, RefreshCw, Upload, X } from "lucide-react";

type Mode = "combine" | "html" | "css" | "javascript" | "typescript";
type Kind = "html" | "css" | "javascript" | "typescript";
type Viewport = "mobile" | "tablet" | "desktop";
type ConsoleLine = { id: string; type: "log" | "warn" | "error"; text: string };
type SourceFile = { id: string; name: string; content: string; uploaded?: boolean };

const MODES: { id: Mode; label: string }[] = [
  { id: "combine", label: "Combined" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
];

const KIND_META: Record<Kind, { label: string; badge: string; accept: string; extension: string; className: string }> = {
  html: { label: "HTML", badge: "HTML", accept: ".html", extension: ".html", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  css: { label: "CSS", badge: "CSS", accept: ".css", extension: ".css", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  javascript: { label: "JavaScript", badge: "JS", accept: ".js", extension: ".js", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  typescript: { label: "TypeScript", badge: "TS", accept: ".ts", extension: ".ts", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
};

const DEFAULT_FILES: Record<Kind, SourceFile[]> = {
  html: [{ id: "html-main", name: "index.html", content: '<main class="app">\n  <h1>Hello Web Compiler</h1>\n  <button id="action">Click me</button>\n</main>' }],
  css: [{ id: "css-main", name: "styles.css", content: "body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  color: #0f172a;\n}\n\n.app {\n  padding: 3rem;\n}\n\nbutton {\n  border: 0;\n  border-radius: 8px;\n  background: #059669;\n  color: white;\n  padding: 0.75rem 1rem;\n}" }],
  javascript: [{ id: "js-main", name: "script.js", content: 'document.getElementById("action")?.addEventListener("click", () => {\n  console.log("Button clicked");\n});' }],
  typescript: [{ id: "ts-main", name: "main.ts", content: 'const message: string = "Hello from TypeScript";\nconsole.log(message);\n\ndocument.body.insertAdjacentHTML("beforeend", `<p>${message}</p>`);' }],
};

const EDITOR_AREA =
  "editor-scroll font-mono text-[13px] leading-[1.6] [font-family:'JetBrains_Mono','Fira_Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]";

export default function WebCompilerPage() {
  const [mode, setMode] = useState<Mode>("combine");
  const [files, setFiles] = useState<Record<Kind, SourceFile[]>>(DEFAULT_FILES);
  const [active, setActive] = useState<Record<Kind, string>>({ html: "html-main", css: "css-main", javascript: "js-main", typescript: "ts-main" });
  const [collapsed, setCollapsed] = useState<Record<"html" | "css" | "javascript", boolean>>({ html: false, css: false, javascript: false });
  const [maximized, setMaximized] = useState<"html" | "css" | "javascript" | null>(null);
  const [srcDoc, setSrcDoc] = useState(() => buildDocument(DEFAULT_FILES.html[0].content, DEFAULT_FILES.css[0].content, DEFAULT_FILES.javascript[0].content));
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [compiledJs, setCompiledJs] = useState("");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [split, setSplit] = useState(58);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("mode") || params.get("lang") || "combine";
    if (isMode(raw)) setMode(raw);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: ConsoleLine["type"]; args?: unknown[] };
      if (data?.source !== "devtools-web-compiler") return;
      const type: ConsoleLine["type"] = data.type === "warn" || data.type === "error" ? data.type : "log";
      setConsoleLines((lines) => [...lines, { id: `${Date.now()}-${Math.random()}`, type, text: (data.args ?? []).map(formatConsoleArg).join(" ") }].slice(-300));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFullscreen(false);
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    document.body.style.overflow = previewFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewFullscreen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function switchMode(next: Mode) {
    setMode(next);
    window.history.replaceState(null, "", `/compilers/web?mode=${next}`);
  }

  function activeContent(kind: Kind) {
    return files[kind].find((file) => file.id === active[kind])?.content ?? "";
  }

  function updateActive(kind: Kind, content: string) {
    setFiles((current) => ({ ...current, [kind]: current[kind].map((file) => file.id === active[kind] ? { ...file, content } : file) }));
  }

  function clearActive(kind: Kind) {
    updateActive(kind, "");
  }

  function addFile(kind: Kind) {
    if (files[kind].length >= 20) {
      setToast(`Maximum 20 ${KIND_META[kind].label} files reached.`);
      return;
    }
    const next = { id: `${kind}-${Date.now()}`, name: `untitled-${files[kind].length + 1}${KIND_META[kind].extension}`, content: "", uploaded: true };
    setFiles((current) => ({ ...current, [kind]: [...current[kind], next] }));
    setActive((current) => ({ ...current, [kind]: next.id }));
  }

  function removeFile(kind: Kind, id: string) {
    setFiles((current) => {
      const remaining = current[kind].filter((file) => file.id !== id);
      const safeFiles = remaining.length ? remaining : [{ id: `${kind}-empty`, name: `untitled${KIND_META[kind].extension}`, content: "" }];
      setActive((activeMap) => ({ ...activeMap, [kind]: safeFiles[0].id }));
      return { ...current, [kind]: safeFiles };
    });
  }

  function uploadFiles(kind: Kind, list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    if (files[kind].length + incoming.length > 20) {
      setToast(`Maximum 20 ${KIND_META[kind].label} files reached.`);
      return;
    }
    const invalid = incoming.find((file) => !file.name.toLowerCase().endsWith(KIND_META[kind].extension));
    if (invalid) {
      setToast(`Only ${KIND_META[kind].extension} files accepted.`);
      return;
    }
    const tooLarge = incoming.find((file) => file.size > 500 * 1024);
    if (tooLarge) {
      setToast("File size limit is 500KB each.");
      return;
    }
    Promise.all(incoming.map(readFile)).then((nextFiles) => {
      setFiles((current) => ({ ...current, [kind]: [...current[kind], ...nextFiles] }));
      setActive((current) => ({ ...current, [kind]: nextFiles[0]?.id ?? current[kind] }));
    }).catch(() => setToast("Could not read selected file."));
  }

  function run() {
    try {
      setConsoleLines([]);
      if (mode === "combine") {
        setSrcDoc(buildDocument(activeContent("html"), activeContent("css"), activeContent("javascript")));
        return;
      }
      if (mode === "html") {
        setSrcDoc(buildDocument(joinFiles(files.html), "", ""));
        return;
      }
      if (mode === "css") {
        setSrcDoc(buildCssSample(joinFiles(files.css)));
        return;
      }
      if (mode === "javascript") {
        setSrcDoc(buildDocument('<main class="app"><h1>JavaScript Runner</h1><button id="action">Sample button</button></main>', "body { font-family: system-ui, sans-serif; padding: 2rem; }", joinFiles(files.javascript)));
        return;
      }
      const js = transpileTypeScript(joinFiles(files.typescript));
      setCompiledJs(js);
      setSrcDoc(buildDocument('<main class="app"><h1>TypeScript Preview</h1></main>', "body { font-family: system-ui, sans-serif; padding: 2rem; }", js));
    } catch {
      setToast("Could not run this project.");
    }
  }

  function openPreview() {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function startResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startSplit = split;
    const onMove = (move: MouseEvent) => {
      const height = window.innerHeight - 40;
      const delta = ((move.clientY - startY) / height) * 100;
      setSplit(Math.min(78, Math.max(35, startSplit + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const activeKind = mode === "combine" ? "html" : mode;
  const errorCount = consoleLines.filter((line) => line.type === "error").length;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <header className="flex h-10 flex-none items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <Link href="/compilers" className="text-xs font-medium text-muted-foreground transition hover:text-foreground">{"<- Compilers"}</Link>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xl font-semibold tracking-tight">Web Compiler</span>
        </div>
        <div className="flex items-center gap-1">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => switchMode(item.id)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === item.id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-border/30 hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {mode === "combine" ? (
        <section className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 basis-1/2 flex-col border-r border-border">
            {(["html", "css", "javascript"] as const).map((kind) => (
              <WebEditorPanel
                key={kind}
                kind={kind}
                files={files[kind]}
                activeId={active[kind]}
                value={activeContent(kind)}
                onActive={(id) => setActive((current) => ({ ...current, [kind]: id }))}
                onChange={(value) => updateActive(kind, value)}
                onUpload={(list) => uploadFiles(kind, list)}
                onAdd={() => addFile(kind)}
                onRemove={(id) => removeFile(kind, id)}
                onClear={() => clearActive(kind)}
                onRun={run}
                collapsed={collapsed[kind]}
                maximized={maximized === kind}
                sizeClass={panelSize(kind, maximized, collapsed)}
                onCollapse={() => setCollapsed((current) => ({ ...current, [kind]: !current[kind] }))}
                onMaximize={() => setMaximized((current) => current === kind ? null : kind)}
              />
            ))}
          </div>
          <PreviewPanel srcDoc={srcDoc} viewport={viewport} setViewport={setViewport} onRun={run} onRefresh={run} onOpen={openPreview} fullscreen={previewFullscreen} setFullscreen={setPreviewFullscreen} consoleLines={consoleLines} consoleOpen={consoleOpen} setConsoleOpen={setConsoleOpen} errorCount={errorCount} />
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col">
          <div style={{ height: `${split}%` }} className="min-h-[260px] flex-none">
            <WebEditorPanel
              kind={activeKind}
              files={files[activeKind]}
              activeId={active[activeKind]}
              value={activeContent(activeKind)}
              onActive={(id) => setActive((current) => ({ ...current, [activeKind]: id }))}
              onChange={(value) => updateActive(activeKind, value)}
              onUpload={(list) => uploadFiles(activeKind, list)}
              onAdd={() => addFile(activeKind)}
              onRemove={(id) => removeFile(activeKind, id)}
              onClear={() => clearActive(activeKind)}
              onRun={run}
              collapsed={false}
              maximized={false}
              sizeClass="h-full"
              onCollapse={() => undefined}
              onMaximize={() => setSplit((value) => value > 80 ? 58 : 92)}
            />
          </div>
          <div onMouseDown={startResize} className="h-1 flex-none cursor-row-resize bg-border transition hover:bg-emerald-500" />
          <SingleOutput mode={mode} srcDoc={srcDoc} viewport={viewport} setViewport={setViewport} onRun={run} onRefresh={run} onOpen={openPreview} fullscreen={previewFullscreen} setFullscreen={setPreviewFullscreen} consoleLines={consoleLines} compiledJs={compiledJs} />
        </section>
      )}
      <style jsx global>{scrollbarStyles}</style>
    </main>
  );
}

function WebEditorPanel({ kind, files, activeId, value, onActive, onChange, onUpload, onAdd, onRemove, onClear, onRun, collapsed, maximized, sizeClass, onCollapse, onMaximize }: { kind: Kind; files: SourceFile[]; activeId: string; value: string; onActive: (id: string) => void; onChange: (value: string) => void; onUpload: (files: FileList | null) => void; onAdd: () => void; onRemove: (id: string) => void; onClear: () => void; onRun: () => void; collapsed: boolean; maximized: boolean; sizeClass: string; onCollapse: () => void; onMaximize: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showTabs = files.length > 1 || files.some((file) => file.uploaded);
  return (
    <div className={`flex min-h-0 flex-col border-b border-border last:border-b-0 ${sizeClass}`}>
      <div className="flex h-8 flex-none items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${KIND_META[kind].className}`}>{KIND_META[kind].badge}</span>
          <span className="text-xs font-semibold">{KIND_META[kind].label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input ref={inputRef} type="file" multiple accept={KIND_META[kind].accept} className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => { onUpload(event.target.files); event.currentTarget.value = ""; }} />
          <IconButton title="Upload" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /></IconButton>
          <IconButton title={maximized ? "Restore" : "Maximize"} onClick={onMaximize}><Maximize2 className="h-4 w-4" /></IconButton>
          <IconButton title={collapsed ? "Expand" : "Collapse"} onClick={onCollapse}>{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</IconButton>
          <IconButton title="Clear" onClick={onClear}><X className="h-4 w-4" /></IconButton>
        </div>
      </div>
      {!collapsed && showTabs && <FileTabs files={files} activeId={activeId} onActive={onActive} onAdd={onAdd} onRemove={onRemove} />}
      {!collapsed && (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => handleEditorKey(event, value, onChange, onRun)}
          spellCheck={false}
          className={`${EDITOR_AREA} min-h-[150px] flex-1 resize-none border-0 bg-white p-3 text-[#1e1e1e] outline-none dark:bg-[#1e1e1e] dark:text-[#d4d4d4]`}
        />
      )}
    </div>
  );
}

function FileTabs({ files, activeId, onActive, onAdd, onRemove }: { files: SourceFile[]; activeId: string; onActive: (id: string) => void; onAdd: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="editor-scroll flex h-8 flex-none items-end gap-1 overflow-x-auto border-b border-border bg-border/10 px-2">
      {files.map((file) => (
        <button key={file.id} type="button" onClick={() => onActive(file.id)} className={`flex h-7 max-w-[160px] items-center gap-1 border-b-2 px-2 text-xs transition ${activeId === file.id ? "border-emerald-500 bg-background text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <span className="truncate">{truncate(file.name, 18)}</span>
          <span onClick={(event) => { event.stopPropagation(); onRemove(file.id); }} className="rounded p-0.5 hover:bg-border/40"><X className="h-3 w-3" /></span>
        </button>
      ))}
      <button type="button" onClick={onAdd} title="New file" className="mb-0.5 h-6 rounded px-2 text-sm text-muted-foreground transition hover:bg-border/30 hover:text-foreground">+</button>
    </div>
  );
}

function PreviewPanel({ srcDoc, viewport, setViewport, onRun, onRefresh, onOpen, fullscreen, setFullscreen, consoleLines, consoleOpen, setConsoleOpen, errorCount }: { srcDoc: string; viewport: Viewport; setViewport: (value: Viewport) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; fullscreen: boolean; setFullscreen: (value: boolean) => void; consoleLines: ConsoleLine[]; consoleOpen: boolean; setConsoleOpen: (value: boolean) => void; errorCount: number }) {
  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background" : "flex min-h-0 basis-1/2 flex-col"}>
      {!fullscreen && <PreviewHeader viewport={viewport} setViewport={setViewport} onRun={onRun} onRefresh={onRefresh} onOpen={onOpen} onFullscreen={() => setFullscreen(true)} />}
      <div className={`${fullscreen ? "min-h-0 flex-1" : "min-h-0 flex-1"} flex justify-center overflow-auto bg-border/20`}>
        <iframe title="Web preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} style={{ width: fullscreen ? "100%" : viewportWidth(viewport) }} className="h-full border-0 bg-white" />
      </div>
      {consoleOpen && !fullscreen && <ConsoleOutput lines={consoleLines} />}
      {!fullscreen && (
        <button type="button" onClick={() => setConsoleOpen(!consoleOpen)} className="flex h-7 flex-none items-center justify-between border-t border-border bg-background px-4 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          <span>Console <span className="ml-2 rounded-full bg-red-500/15 px-1.5 py-0.5 text-red-500">{errorCount}</span></span>
          {consoleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      )}
      {fullscreen && <button type="button" onClick={() => setFullscreen(false)} className="fixed right-4 top-4 z-[60] inline-flex h-9 items-center gap-2 rounded-md bg-background px-3 text-sm font-semibold text-foreground shadow-lg ring-1 ring-border"><X className="h-4 w-4" />Exit</button>}
    </div>
  );
}

function PreviewHeader({ viewport, setViewport, onRun, onRefresh, onOpen, onFullscreen }: { viewport: Viewport; setViewport: (value: Viewport) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; onFullscreen: () => void }) {
  return (
    <div className="grid h-10 flex-none grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Preview</div>
      <button type="button" onClick={onRun} className="inline-flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">
        <Play className="h-4 w-4" />
        Run
        <span className="text-xs font-medium text-white/70">Ctrl+Enter</span>
      </button>
      <div className="flex items-center justify-end gap-2">
        <ViewportToggle viewport={viewport} setViewport={setViewport} />
        <div className="h-5 w-px bg-border" />
        <IconButton title="Refresh" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></IconButton>
        <IconButton title="Open in new tab" onClick={onOpen}><ExternalLink className="h-4 w-4" /></IconButton>
        <IconButton title="Fullscreen" onClick={onFullscreen}><Maximize2 className="h-4 w-4" /></IconButton>
      </div>
    </div>
  );
}

function SingleOutput({ mode, srcDoc, viewport, setViewport, onRun, onRefresh, onOpen, fullscreen, setFullscreen, consoleLines, compiledJs }: { mode: Mode; srcDoc: string; viewport: Viewport; setViewport: (value: Viewport) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; fullscreen: boolean; setFullscreen: (value: boolean) => void; consoleLines: ConsoleLine[]; compiledJs: string }) {
  if (mode === "javascript") {
    return (
      <div className="min-h-0 flex-1 border-t border-border">
        <PanelHeader label="Console" onRun={onRun} />
        <ConsoleOutput lines={consoleLines} fill />
        <iframe title="JavaScript execution frame" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} className="hidden" />
      </div>
    );
  }
  if (mode === "typescript") {
    return (
      <div className="grid min-h-0 flex-1 border-t border-border md:grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-border">
          <PanelHeader label="Transpiled JavaScript" onRun={onRun} runLabel="Transpile" />
          <pre className={`${EDITOR_AREA} editor-scroll min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f8f8f8] p-3 text-[#1e1e1e] dark:bg-[#141414] dark:text-[#d4d4d4]`}>{compiledJs || "Transpiled JavaScript will appear here."}</pre>
        </div>
        <div className="flex min-h-0 flex-col">
          <PanelHeader label="Preview" onRun={onRun} runLabel="Run transpiled JS" />
          <iframe title="TypeScript preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} className="min-h-0 flex-1 border-0 bg-white" />
        </div>
      </div>
    );
  }
  if (mode === "css") {
    return (
      <div className="grid min-h-0 flex-1 border-t border-border md:grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-border">
          <PanelHeader label="CSS Output" onRun={onRun} />
          <pre className={`${EDITOR_AREA} editor-scroll min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f8f8f8] p-3 text-[#1e1e1e] dark:bg-[#141414] dark:text-[#d4d4d4]`}>{"/* Run to apply CSS to the preview. */"}</pre>
        </div>
        <div className="flex min-h-0 flex-col">
          <PreviewHeader viewport={viewport} setViewport={setViewport} onRun={onRun} onRefresh={onRefresh} onOpen={onOpen} onFullscreen={() => setFullscreen(true)} />
          <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-border/20">
            <iframe title="CSS preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} style={{ width: viewportWidth(viewport) }} className="h-full border-0 bg-white" />
          </div>
          {fullscreen && <PreviewPanel srcDoc={srcDoc} viewport={viewport} setViewport={setViewport} onRun={onRun} onRefresh={onRefresh} onOpen={onOpen} fullscreen={fullscreen} setFullscreen={setFullscreen} consoleLines={[]} consoleOpen={false} setConsoleOpen={() => undefined} errorCount={0} />}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 border-t border-border">
      <PreviewPanel srcDoc={srcDoc} viewport={viewport} setViewport={setViewport} onRun={onRun} onRefresh={onRefresh} onOpen={onOpen} fullscreen={fullscreen} setFullscreen={setFullscreen} consoleLines={[]} consoleOpen={false} setConsoleOpen={() => undefined} errorCount={0} />
    </div>
  );
}

function PanelHeader({ label, onRun, runLabel = "Run" }: { label: string; onRun: () => void; runLabel?: string }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-border bg-background px-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <button type="button" onClick={onRun} className="inline-flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700"><Play className="h-4 w-4" />{runLabel}</button>
    </div>
  );
}

function ViewportToggle({ viewport, setViewport }: { viewport: Viewport; setViewport: (value: Viewport) => void }) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {(["mobile", "tablet", "desktop"] as Viewport[]).map((item) => (
        <button key={item} type="button" onClick={() => setViewport(item)} className={`rounded px-2 py-1 text-xs font-medium capitalize transition ${viewport === item ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-border/30 hover:text-foreground"}`}>{item}</button>
      ))}
    </div>
  );
}

function ConsoleOutput({ lines, fill = false }: { lines: ConsoleLine[]; fill?: boolean }) {
  const className = fill ? "h-full" : "h-[120px] flex-none border-t border-border";
  if (!lines.length) return <div className={`${className} bg-[#f8f8f8] p-3 text-sm text-muted-foreground dark:bg-[#141414]`}>Console output will appear here.</div>;
  return (
    <pre className={`${EDITOR_AREA} editor-scroll ${className} overflow-auto whitespace-pre-wrap bg-[#f8f8f8] p-3 dark:bg-[#141414]`}>
      {lines.map((line) => <span key={line.id} className={`block ${line.type === "error" ? "text-red-600 dark:text-red-400" : line.type === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>[{line.type}] {line.text}</span>)}
    </pre>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} onClick={onClick} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition hover:bg-border/40 hover:text-foreground">{children}</button>;
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

function panelSize(kind: "html" | "css" | "javascript", maximized: "html" | "css" | "javascript" | null, collapsed: Record<"html" | "css" | "javascript", boolean>) {
  if (collapsed[kind]) return "h-8 flex-none";
  if (!maximized) return "min-h-[150px] flex-1";
  return maximized === kind ? "min-h-[260px] flex-[7]" : "min-h-[150px] flex-[1.5]";
}

function viewportWidth(viewport: Viewport) {
  if (viewport === "mobile") return "375px";
  if (viewport === "tablet") return "768px";
  return "100%";
}

function joinFiles(files: SourceFile[]) {
  return files.map((file) => file.content).join("\n\n");
}

function readFile(file: File): Promise<SourceFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, content: String(reader.result ?? ""), uploaded: true });
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function buildDocument(html: string, css: string, js: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${html}<script>
["log","warn","error"].forEach((type) => {
  const original = console[type];
  console[type] = (...args) => {
    parent.postMessage({ source: "devtools-web-compiler", type, args: args.map((arg) => {
      try { return typeof arg === "object" ? JSON.stringify(arg) : String(arg); } catch { return String(arg); }
    }) }, "*");
    original.apply(console, args);
  };
});
window.onerror = (message, source, line, column) => {
  parent.postMessage({ source: "devtools-web-compiler", type: "error", args: [String(message) + " at " + line + ":" + column] }, "*");
};
<\/script><script>${js.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
}

function buildCssSample(css: string) {
  return buildDocument('<main class="sample"><h1>CSS Preview</h1><p>Apply your CSS to headings, paragraphs, cards, and buttons.</p><button>Primary button</button><div class="card"><h2>Sample card</h2><p>Nested content inside a card.</p></div></main>', css, "");
}

function transpileTypeScript(source: string) {
  return source
    .replace(/^\s*interface\s+\w+\s*{[\s\S]*?}\s*$/gm, "")
    .replace(/^\s*type\s+\w+\s*=\s*[^;]+;?/gm, "")
    .replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>,\s[\]|&?]*(?=\s*[=,);])/g, "")
    .replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>,\s[\]|&?]*/g, "")
    .replace(/<([A-Za-z_$][A-Za-z0-9_$<>,\s]*)>\s*(?=[A-Za-z_$({])/g, "");
}

function formatConsoleArg(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function isMode(value: string): value is Mode {
  return value === "combine" || value === "html" || value === "css" || value === "javascript" || value === "typescript";
}

function Toast({ message }: { message: string }) {
  return <div className="fixed right-4 top-12 z-[70] rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</div>;
}

const scrollbarStyles = `
.editor-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--muted-foreground) / 0.35) transparent;
}
.editor-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.editor-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.editor-scroll::-webkit-scrollbar-thumb {
  background: rgb(var(--muted-foreground) / 0.28);
  border-radius: 999px;
}
`;
