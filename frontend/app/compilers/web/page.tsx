"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Eraser,
  ExternalLink,
  FilePlus2,
  FileUp,
  Maximize2,
  Play,
  RefreshCw,
  X,
} from "lucide-react";

type Mode = "combine" | "html" | "css" | "javascript" | "typescript";
type FileKind = "html" | "css" | "javascript" | "typescript";
type SourceFile = { id: string; name: string; content: string };
type ConsoleLine = { id: string; type: "log" | "warn" | "error"; text: string };

const modes: { id: Mode; label: string }[] = [
  { id: "combine", label: "Combined" },
  { id: "html", label: "HTML only" },
  { id: "css", label: "CSS only" },
  { id: "javascript", label: "JavaScript only" },
  { id: "typescript", label: "TypeScript only" },
];

const defaults: Record<FileKind, SourceFile[]> = {
  html: [{ id: "html-main", name: "index.html", content: '<main class="app">\n  <h1>Hello Web Compiler</h1>\n  <button id="action">Click me</button>\n</main>' }],
  css: [{ id: "css-main", name: "styles.css", content: "body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  color: #0f172a;\n}\n\n.app {\n  padding: 3rem;\n}\n\nbutton {\n  border: 0;\n  border-radius: 8px;\n  background: #059669;\n  color: white;\n  padding: 0.7rem 1rem;\n}" }],
  javascript: [{ id: "js-main", name: "script.js", content: 'document.getElementById("action")?.addEventListener("click", () => {\n  console.log("Button clicked");\n});' }],
  typescript: [{ id: "ts-main", name: "main.ts", content: 'const message: string = "Hello from TypeScript";\nconsole.log(message);\n\ndocument.body.insertAdjacentHTML("beforeend", `<p>${message}</p>`);' }],
};

const config: Record<FileKind, { label: string; badge: string; accept: string; max: number; placeholder: string; extension: string; tone: string }> = {
  html: { label: "HTML", badge: "HTML", accept: ".html", max: 20, placeholder: "<!-- Write HTML here -->", extension: ".html", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-300" },
  css: { label: "CSS", badge: "CSS", accept: ".css", max: 20, placeholder: "/* Write CSS here */", extension: ".css", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  javascript: { label: "JavaScript", badge: "JS", accept: ".js", max: 20, placeholder: "// Write JavaScript here", extension: ".js", tone: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
  typescript: { label: "TypeScript", badge: "TS", accept: ".ts", max: 20, placeholder: "// Write TypeScript here", extension: ".ts", tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
};

function initialDocument() {
  return buildDocument(defaults.html[0].content, defaults.css[0].content, defaults.javascript[0].content);
}

export default function WebCompilerPage() {
  const [mode, setMode] = useState<Mode>("combine");
  const [files, setFiles] = useState<Record<FileKind, SourceFile[]>>(defaults);
  const [active, setActive] = useState<Record<FileKind, string>>({ html: "html-main", css: "css-main", javascript: "js-main", typescript: "ts-main" });
  const [errors, setErrors] = useState<Record<FileKind, string>>({ html: "", css: "", javascript: "", typescript: "" });
  const [collapsed, setCollapsed] = useState<Record<"html" | "css" | "javascript", boolean>>({ html: false, css: false, javascript: false });
  const [srcDoc, setSrcDoc] = useState(initialDocument);
  const [compiledJs, setCompiledJs] = useState("");
  const [previewWidth, setPreviewWidth] = useState("100%");
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [toast, setToast] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("mode") || params.get("lang") || "combine";
    if (isMode(raw)) setMode(raw);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: ConsoleLine["type"]; args?: unknown[] };
      if (data?.source !== "devtools-web-compiler") return;
      const type: ConsoleLine["type"] = data.type === "error" || data.type === "warn" ? data.type : "log";
      setConsoleLines((lines) => [...lines, { id: `${Date.now()}-${Math.random()}`, type, text: (data.args ?? []).map(formatConsoleArg).join(" ") }].slice(-200));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  function switchMode(next: Mode) {
    setMode(next);
    const param = next === "combine" ? "mode=combine" : `mode=${next}`;
    window.history.replaceState(null, "", `/compilers/web?${param}`);
  }

  function activeContent(kind: FileKind) {
    return files[kind].find((file) => file.id === active[kind])?.content ?? "";
  }

  function updateActive(kind: FileKind, content: string) {
    const activeId = active[kind];
    setFiles((current) => ({ ...current, [kind]: current[kind].map((file) => file.id === activeId ? { ...file, content } : file) }));
  }

  function addEmptyFile(kind: FileKind) {
    if (files[kind].length >= config[kind].max) {
      setErrors((current) => ({ ...current, [kind]: `Maximum ${config[kind].max} files reached.` }));
      return;
    }
    const next: SourceFile = { id: `${kind}-${Date.now()}`, name: `untitled-${files[kind].length + 1}${config[kind].extension}`, content: "" };
    setFiles((current) => ({ ...current, [kind]: [...current[kind], next] }));
    setActive((current) => ({ ...current, [kind]: next.id }));
    setErrors((current) => ({ ...current, [kind]: "" }));
  }

  function removeFile(kind: FileKind, id: string) {
    setFiles((current) => {
      const remaining = current[kind].filter((file) => file.id !== id);
      const nextFiles = remaining.length ? remaining : [{ id: `${kind}-empty`, name: `untitled${config[kind].extension}`, content: "" }];
      setActive((activeMap) => ({ ...activeMap, [kind]: nextFiles[0].id }));
      return { ...current, [kind]: nextFiles };
    });
  }

  function onUpload(kind: FileKind, picked: FileList | null) {
    if (!picked?.length) return;
    const incoming = Array.from(picked);
    if (files[kind].length + incoming.length > config[kind].max) {
      setErrors((current) => ({ ...current, [kind]: `Maximum ${config[kind].max} files reached.` }));
      return;
    }
    const invalid = incoming.find((file) => !file.name.toLowerCase().endsWith(config[kind].extension));
    if (invalid) {
      setErrors((current) => ({ ...current, [kind]: `Only ${config[kind].extension} files accepted.` }));
      return;
    }
    const tooLarge = incoming.find((file) => file.size > 500 * 1024);
    if (tooLarge) {
      setErrors((current) => ({ ...current, [kind]: "File size limit is 500KB per file." }));
      return;
    }
    Promise.all(incoming.map(readFile)).then((nextFiles) => {
      setFiles((current) => ({ ...current, [kind]: [...current[kind], ...nextFiles] }));
      setActive((current) => ({ ...current, [kind]: nextFiles[0]?.id ?? current[kind] }));
      setErrors((current) => ({ ...current, [kind]: "" }));
    }).catch(() => {
      setErrors((current) => ({ ...current, [kind]: "Could not read one of the selected files." }));
    });
  }

  function run() {
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
  }

  function openNewTab() {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const activeKind = mode === "combine" ? "html" : mode;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-4">
        <header className="rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/compilers" className="text-sm text-muted-foreground transition hover:text-foreground">&lt;- All Languages</Link>
              <div className="mt-1 text-xs text-muted-foreground">
                <Link href="/compilers" className="hover:text-foreground">Compilers</Link>
                <span className="mx-2">/</span>
                <span>Web Compiler</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold">Web Compiler</h1>
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-zinc-50 p-1 dark:bg-zinc-950">
              {modes.map((item) => (
                <button key={item.id} type="button" onClick={() => switchMode(item.id)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition ${mode === item.id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-zinc-900"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {mode === "combine" ? (
          <section className="grid h-auto gap-4 lg:h-[calc(100vh-120px)] lg:grid-cols-2">
            <div className="flex h-[60vh] min-h-[520px] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-white p-4 dark:bg-zinc-900 lg:h-[calc(100vh-160px)]">
              <div className="rounded-lg border border-border bg-zinc-50 px-3 py-2 text-sm text-muted-foreground dark:bg-zinc-950">
                Combined mode: write HTML, CSS and JavaScript together
              </div>
              <CombinedEditorPanel kind="html" value={activeContent("html")} onChange={(value) => updateActive("html", value)} onClear={() => updateActive("html", "")} collapsed={collapsed.html} onToggle={() => setCollapsed((current) => ({ ...current, html: !current.html }))} onRun={run} />
              <CombinedEditorPanel kind="css" value={activeContent("css")} onChange={(value) => updateActive("css", value)} onClear={() => updateActive("css", "")} collapsed={collapsed.css} onToggle={() => setCollapsed((current) => ({ ...current, css: !current.css }))} onRun={run} />
              <CombinedEditorPanel kind="javascript" value={activeContent("javascript")} onChange={(value) => updateActive("javascript", value)} onClear={() => updateActive("javascript", "")} collapsed={collapsed.javascript} onToggle={() => setCollapsed((current) => ({ ...current, javascript: !current.javascript }))} onRun={run} />
            </div>
            <PreviewPane srcDoc={srcDoc} previewWidth={previewWidth} setPreviewWidth={setPreviewWidth} onRun={run} onRefresh={() => undefined} onOpen={openNewTab} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4">
            <SingleModeEditor mode={mode} files={files[activeKind]} activeId={active[activeKind]} onActive={(id) => setActive((current) => ({ ...current, [activeKind]: id }))} onChange={(value) => updateActive(activeKind, value)} onUpload={(list) => onUpload(activeKind, list)} onAdd={() => addEmptyFile(activeKind)} onRemove={(id) => removeFile(activeKind, id)} onClear={() => updateActive(activeKind, "")} error={errors[activeKind]} onRun={run} />
            <SingleModeOutput mode={mode} srcDoc={srcDoc} previewWidth={previewWidth} setPreviewWidth={setPreviewWidth} onRefresh={() => undefined} onOpen={openNewTab} compiledJs={compiledJs} consoleLines={consoleLines} />
          </section>
        )}

        <div className="rounded-xl border border-border bg-white px-4 py-2 text-xs text-muted-foreground dark:bg-zinc-900">
          Ctrl+Enter: Run
        </div>
      </div>
    </main>
  );
}

function CombinedEditorPanel({ kind, value, onChange, onClear, collapsed, onToggle, onRun }: { kind: "html" | "css" | "javascript"; value: string; onChange: (value: string) => void; onClear: () => void; collapsed: boolean; onToggle: () => void; onRun: () => void }) {
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-border ${collapsed ? "h-10 min-h-10 flex-none" : "min-h-[220px] flex-1"}`}>
      <div className="flex h-10 flex-none items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${config[kind].tone}`}>{config[kind].badge}</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{config[kind].label}</h2>
        </div>
        <div className="flex gap-2">
          <SmallButton onClick={onClear} icon={<Eraser className="h-4 w-4" />} label="Clear" />
          <SmallButton onClick={onToggle} icon={collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} label={collapsed ? "Expand" : "Collapse"} />
        </div>
      </div>
      {!collapsed && <CodeArea value={value} onChange={onChange} placeholder={config[kind].placeholder} className="min-h-0 flex-1 rounded-none border-x-0 border-b-0" onRun={onRun} />}
    </div>
  );
}

function SingleModeEditor({ mode, files, activeId, onActive, onChange, onUpload, onAdd, onRemove, onClear, error, onRun }: { mode: FileKind; files: SourceFile[]; activeId: string; onActive: (id: string) => void; onChange: (value: string) => void; onUpload: (files: FileList | null) => void; onAdd: () => void; onRemove: (id: string) => void; onClear: () => void; error: string; onRun: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeFile = files.find((file) => file.id === activeId) ?? files[0];
  const editorHeight = mode === "css" ? "h-[calc(100vh-260px)] min-h-[520px]" : "h-[55vh] min-h-[360px]";
  return (
    <div className="rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${config[mode].tone}`}>{config[mode].badge}</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{config[mode].label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" multiple accept={config[mode].accept} className="hidden" onChange={(event) => { onUpload(event.target.files); event.currentTarget.value = ""; }} />
          <SmallButton onClick={() => inputRef.current?.click()} icon={<FileUp className="h-4 w-4" />} label="Upload" />
          <SmallButton onClick={onAdd} icon={<FilePlus2 className="h-4 w-4" />} label="Add file" />
          <SmallButton onClick={onClear} icon={<Eraser className="h-4 w-4" />} label="Clear" />
          <button type="button" onClick={onRun} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
            {mode === "typescript" ? "Transpile" : "Run"} <Play className="h-4 w-4" />
          </button>
        </div>
      </div>
      <FileTabs files={files} activeId={activeId} onActive={onActive} onAdd={onAdd} onRemove={onRemove} />
      {error && <InlineError text={error} />}
      <CodeArea value={activeFile?.content ?? ""} onChange={onChange} placeholder={config[mode].placeholder} className={`mt-3 ${editorHeight}`} onRun={onRun} />
    </div>
  );
}

function SingleModeOutput({ mode, srcDoc, previewWidth, setPreviewWidth, onRefresh, onOpen, compiledJs, consoleLines }: { mode: FileKind; srcDoc: string; previewWidth: string; setPreviewWidth: (value: string) => void; onRefresh: () => void; onOpen: () => void; compiledJs: string; consoleLines: ConsoleLine[] }) {
  if (mode === "typescript") {
    return (
      <div className="h-[45vh] min-h-[320px] rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Transpiled JavaScript</h2>
          <CopyButton value={compiledJs} />
        </div>
        <pre className="h-[calc(100%-36px)] overflow-auto rounded-lg border border-border bg-[#f5f5f5] p-4 font-mono text-sm dark:bg-[#111111]">{compiledJs || "Transpiled JavaScript will appear here."}</pre>
      </div>
    );
  }

  if (mode === "javascript") {
    return (
      <div className="h-[45vh] min-h-[320px] rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Output</h2>
        <ConsoleOutput lines={consoleLines} className="h-[calc(100%-28px)] rounded-lg border border-border" />
        <iframe title="JavaScript execution frame" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} className="hidden" />
      </div>
    );
  }

  return (
    <div className={`${mode === "html" ? "h-[45vh]" : "min-h-[280px]"} rounded-xl border border-border bg-white p-4 dark:bg-zinc-900`}>
      <PreviewHeader previewWidth={previewWidth} setPreviewWidth={setPreviewWidth} onRefresh={onRefresh} onOpen={onOpen} />
      <div className="mt-3 flex h-[calc(100%-48px)] justify-center overflow-auto rounded-lg border border-border bg-zinc-100 p-3 dark:bg-zinc-950">
        <iframe title={mode === "css" ? "CSS sample preview" : "HTML preview"} sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} style={{ width: previewWidth }} className="h-full min-h-[220px] rounded-lg border border-border bg-white" />
      </div>
    </div>
  );
}

function CodeArea({ value, onChange, placeholder, className, onRun }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string; onRun?: () => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRun) {
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
  return <textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} spellCheck={false} className={`w-full resize-none rounded-lg border border-border bg-[#fafafa] p-4 font-mono text-sm leading-relaxed text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-emerald-500 dark:bg-[#0d0d0d] dark:text-zinc-100 dark:placeholder:text-zinc-700 ${className ?? ""}`} />;
}

function FileTabs({ files, activeId, onActive, onAdd, onRemove }: { files: SourceFile[]; activeId: string; onActive: (id: string) => void; onAdd: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="mt-3 flex gap-1 overflow-x-auto border-b border-border">
      {files.map((file) => (
        <button key={file.id} type="button" onClick={() => onActive(file.id)} className={`group flex max-w-[180px] items-center gap-1 border-b-2 px-3 py-2 text-xs ${activeId === file.id ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground"}`}>
          <span className="truncate">{truncate(file.name, 15)}</span>
          <span onClick={(event) => { event.stopPropagation(); onRemove(file.id); }} className="rounded p-0.5 opacity-70 hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
      <button type="button" onClick={onAdd} className="border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground hover:text-foreground">+ Add file</button>
    </div>
  );
}

function PreviewPane({ srcDoc, previewWidth, setPreviewWidth, onRun, onRefresh, onOpen, isFullscreen, setIsFullscreen }: { srcDoc: string; previewWidth: string; setPreviewWidth: (value: string) => void; onRun: () => void; onRefresh: () => void; onOpen: () => void; isFullscreen: boolean; setIsFullscreen: (value: boolean) => void }) {
  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-white dark:bg-zinc-950" : "flex h-[40vh] min-h-[320px] flex-col rounded-xl border border-border bg-white p-4 dark:bg-zinc-900 lg:h-[calc(100vh-160px)] lg:min-h-[420px]"}>
      <div className={isFullscreen ? "hidden" : ""}>
        <PreviewHeader previewWidth={previewWidth} setPreviewWidth={setPreviewWidth} onRefresh={onRefresh} onOpen={onOpen} onFullscreen={() => setIsFullscreen(true)} onRun={onRun} />
      </div>
      <div className={isFullscreen ? "flex min-h-0 flex-1 justify-center overflow-hidden" : "mt-3 flex min-h-0 flex-1 justify-center overflow-auto rounded-lg border border-border bg-zinc-100 p-3 dark:bg-zinc-950"}>
        <iframe title="Web preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} style={{ width: isFullscreen ? "100%" : previewWidth }} className={isFullscreen ? "h-full w-full border-0 bg-white" : "h-full min-h-full rounded-lg border border-border bg-white"} />
      </div>
      {isFullscreen && (
        <button type="button" onClick={() => setIsFullscreen(false)} className="fixed right-4 top-4 z-[60] inline-flex min-h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-950">
          <X className="h-4 w-4" />
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}

function PreviewHeader({ previewWidth, setPreviewWidth, onRefresh, onOpen, onFullscreen, onRun }: { previewWidth: string; setPreviewWidth: (value: string) => void; onRefresh: () => void; onOpen: () => void; onFullscreen?: () => void; onRun?: () => void }) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preview</h2>
        {onRun && (
          <button type="button" onClick={onRun} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
            Run <Play className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="inline-flex justify-self-start rounded-lg border border-border p-0.5 lg:justify-self-center">
        {[["375px", "Mobile"], ["768px", "Tablet"], ["100%", "Desktop"]].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setPreviewWidth(value)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${previewWidth === value ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-self-end">
        <SmallButton onClick={onRefresh} icon={<RefreshCw className="h-4 w-4" />} label="Refresh" />
        <SmallButton onClick={onOpen} icon={<ExternalLink className="h-4 w-4" />} label="Open" />
        {onFullscreen && <SmallButton onClick={onFullscreen} icon={<Maximize2 className="h-4 w-4" />} label="Fullscreen" />}
      </div>
    </div>
  );
}

function ConsoleOutput({ lines, className = "" }: { lines: ConsoleLine[]; className?: string }) {
  if (!lines.length) return <div className={`p-4 text-sm text-muted-foreground ${className}`}>Console output will appear here</div>;
  return (
    <pre className={`overflow-auto bg-[#111111] p-3 font-mono text-[13px] leading-relaxed ${className}`}>
      {lines.map((line) => (
        <span key={line.id} className={`block ${line.type === "error" ? "text-red-400" : line.type === "warn" ? "text-amber-300" : "text-white"}`}>[{line.type}] {line.text}</span>
      ))}
    </pre>
  );
}

function SmallButton({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" onClick={onClick} title={label} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-zinc-100 dark:hover:bg-zinc-800">{icon}<span>{label}</span></button>;
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <SmallButton
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
      icon={<Copy className="h-4 w-4" />}
      label={done ? "Copied" : "Copy"}
    />
  );
}

function InlineError({ text }: { text: string }) {
  return <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-500"><AlertCircle className="h-4 w-4" />{text}</div>;
}

function Toast({ message }: { message: string }) {
  return <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</div>;
}

function joinFiles(files: SourceFile[]) {
  return files.map((file) => file.content).join("\n\n");
}

function readFile(file: File): Promise<SourceFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, content: String(reader.result ?? "") });
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
  return buildDocument('<main class="app"><h1>CSS Preview</h1><p>Apply your styles to this sample document.</p><button>Sample button</button><section class="card"><strong>Sample card</strong><span>with nested text</span></section></main>', css, "");
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

function truncate(value: string, size: number) {
  return value.length > size ? `${value.slice(0, size - 3)}...` : value;
}

function isMode(value: string): value is Mode {
  return value === "combine" || value === "html" || value === "css" || value === "javascript" || value === "typescript";
}
