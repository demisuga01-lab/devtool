"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Loader2, Play, Upload, X } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Category = "popular" | "scripting" | "jvm" | "systems" | "functional" | "data" | "database" | "lowlevel";
type GroupLabel = "Popular" | "Scripting" | "JVM" | "Systems" | "Functional" | "Data" | "Database" | "Low-level";
type OutputTab = "stdout" | "stderr" | "info";

type LanguageSeed = {
  id: number;
  language: string;
  version: string;
  name: string;
  category: Category;
};

type Language = LanguageSeed & {
  abbreviation: string;
  extensions: string[];
  starter: string;
};

type RunResult = {
  stdout?: string;
  stderr?: string;
  output?: string;
  exit_code?: number | null;
  signal?: string | null;
  cpu_time?: number | null;
  wall_time?: number | null;
  memory?: number | null;
  compile_output?: string;
  compile_stderr?: string;
  status?: string;
  status_description?: string;
  message?: string;
};

const LANGUAGES: LanguageSeed[] = [
  { id: 71, language: "python", version: "3.8.1", name: "Python 3", category: "popular" },
  { id: 70, language: "python", version: "2.7.17", name: "Python 2", category: "scripting" },
  { id: 62, language: "java", version: "13.0.1", name: "Java", category: "popular" },
  { id: 50, language: "c", version: "9.2.0", name: "C (GCC 9.2.0)", category: "popular" },
  { id: 49, language: "c", version: "8.3.0", name: "C (GCC 8.3.0)", category: "systems" },
  { id: 48, language: "c", version: "7.4.0", name: "C (GCC 7.4.0)", category: "systems" },
  { id: 75, language: "c", version: "7.0.1", name: "C (Clang 7.0.1)", category: "systems" },
  { id: 54, language: "cpp", version: "9.2.0", name: "C++ (GCC 9.2.0)", category: "popular" },
  { id: 53, language: "cpp", version: "8.3.0", name: "C++ (GCC 8.3.0)", category: "systems" },
  { id: 52, language: "cpp", version: "7.4.0", name: "C++ (GCC 7.4.0)", category: "systems" },
  { id: 76, language: "cpp", version: "7.0.1", name: "C++ (Clang 7.0.1)", category: "systems" },
  { id: 51, language: "csharp", version: "6.6.0", name: "C#", category: "popular" },
  { id: 73, language: "rust", version: "1.40.0", name: "Rust", category: "popular" },
  { id: 60, language: "go", version: "1.13.5", name: "Go", category: "popular" },
  { id: 78, language: "kotlin", version: "1.3.70", name: "Kotlin", category: "popular" },
  { id: 68, language: "php", version: "7.4.1", name: "PHP", category: "popular" },
  { id: 72, language: "ruby", version: "2.7.0", name: "Ruby", category: "popular" },
  { id: 83, language: "swift", version: "5.2.3", name: "Swift", category: "popular" },
  { id: 63, language: "javascript", version: "12.14.0", name: "JavaScript", category: "popular" },
  { id: 74, language: "typescript", version: "3.7.4", name: "TypeScript", category: "popular" },
  { id: 46, language: "bash", version: "5.0.0", name: "Bash", category: "scripting" },
  { id: 85, language: "perl", version: "5.28.1", name: "Perl", category: "scripting" },
  { id: 64, language: "lua", version: "5.3.5", name: "Lua", category: "scripting" },
  { id: 80, language: "r", version: "4.0.0", name: "R", category: "data" },
  { id: 66, language: "octave", version: "5.1.0", name: "Octave", category: "data" },
  { id: 82, language: "sql", version: "3.27.2", name: "SQL (SQLite)", category: "database" },
  { id: 81, language: "scala", version: "2.13.2", name: "Scala", category: "jvm" },
  { id: 86, language: "clojure", version: "1.10.1", name: "Clojure", category: "jvm" },
  { id: 88, language: "groovy", version: "3.0.3", name: "Groovy", category: "jvm" },
  { id: 47, language: "basic", version: "1.07.1", name: "Basic", category: "systems" },
  { id: 84, language: "vb", version: "0.0.0.5943", name: "Visual Basic", category: "jvm" },
  { id: 87, language: "fsharp", version: "3.1.202", name: "F#", category: "functional" },
  { id: 61, language: "haskell", version: "8.8.1", name: "Haskell", category: "functional" },
  { id: 57, language: "elixir", version: "1.9.4", name: "Elixir", category: "functional" },
  { id: 58, language: "erlang", version: "22.2", name: "Erlang", category: "functional" },
  { id: 65, language: "ocaml", version: "4.09.0", name: "OCaml", category: "functional" },
  { id: 55, language: "commonlisp", version: "2.0.0", name: "Common Lisp", category: "functional" },
  { id: 69, language: "prolog", version: "1.4.5", name: "Prolog", category: "functional" },
  { id: 56, language: "d", version: "2.089.1", name: "D", category: "systems" },
  { id: 59, language: "fortran", version: "9.2.0", name: "Fortran", category: "systems" },
  { id: 67, language: "pascal", version: "3.0.4", name: "Pascal", category: "systems" },
  { id: 79, language: "objectivec", version: "7.0.1", name: "Objective-C", category: "systems" },
  { id: 77, language: "cobol", version: "2.2", name: "COBOL", category: "data" },
  { id: 45, language: "nasm", version: "2.14.02", name: "Assembly (NASM)", category: "lowlevel" },
];

const GROUPS: { category: Category; label: GroupLabel }[] = [
  { category: "popular", label: "Popular" },
  { category: "scripting", label: "Scripting" },
  { category: "jvm", label: "JVM" },
  { category: "systems", label: "Systems" },
  { category: "functional", label: "Functional" },
  { category: "data", label: "Data" },
  { category: "database", label: "Database" },
  { category: "lowlevel", label: "Low-level" },
];

const EXTENSIONS: Record<string, string[]> = {
  bash: [".sh", ".bash"],
  basic: [".bas"],
  c: [".c", ".h"],
  clojure: [".clj"],
  cobol: [".cob", ".cbl"],
  commonlisp: [".lisp", ".cl"],
  cpp: [".cpp", ".cc", ".cxx", ".hpp"],
  csharp: [".cs"],
  d: [".d"],
  elixir: [".ex", ".exs"],
  erlang: [".erl"],
  fortran: [".f90", ".f", ".for"],
  fsharp: [".fs"],
  go: [".go"],
  groovy: [".groovy"],
  haskell: [".hs"],
  java: [".java"],
  javascript: [".js", ".mjs"],
  kotlin: [".kt", ".kts"],
  lua: [".lua"],
  nasm: [".asm", ".s"],
  objectivec: [".m"],
  ocaml: [".ml"],
  octave: [".m"],
  pascal: [".pas"],
  perl: [".pl", ".pm"],
  php: [".php"],
  prolog: [".pl"],
  python: [".py"],
  r: [".r", ".R"],
  ruby: [".rb"],
  rust: [".rs"],
  scala: [".scala"],
  sql: [".sql"],
  swift: [".swift"],
  typescript: [".ts"],
  vb: [".vb"],
};

const ABBR: Record<string, string> = {
  commonlisp: "CL",
  cpp: "C++",
  csharp: "CS",
  fsharp: "FS",
  javascript: "JS",
  objectivec: "OC",
  python: "PY",
  typescript: "TS",
};

const CATEGORY_CLASSES: Record<Category, string> = {
  popular: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  scripting: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  jvm: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  systems: "bg-red-500/15 text-red-600 dark:text-red-400",
  functional: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  data: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  database: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  lowlevel: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const EDITOR_AREA =
  "editor-scroll font-mono text-[13px] leading-[1.6] [font-family:'JetBrains_Mono','Fira_Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]";

const LANGUAGES_READY: Language[] = LANGUAGES.map((item) => ({
  ...item,
  abbreviation: ABBR[item.language] ?? item.language.slice(0, 3).toUpperCase(),
  extensions: EXTENSIONS[item.language] ?? [".txt"],
  starter: starterCode(item),
}));

export default function CompilerRunPage() {
  const [selectedId, setSelectedId] = useState(71);
  const language = useMemo(() => LANGUAGES_READY.find((item) => item.id === selectedId) ?? LANGUAGES_READY[0], [selectedId]);
  const [code, setCode] = useState(() => language.starter);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [tab, setTab] = useState<OutputTab>("stdout");
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState<"code" | "output" | "">("");
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("lang");
    const match = LANGUAGES_READY.find((item) => String(item.id) === raw || item.language === raw?.toLowerCase() || item.name.toLowerCase() === raw?.toLowerCase());
    if (match) {
      setSelectedId(match.id);
      setCode(match.starter);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void runCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function changeLanguage(id: number) {
    const next = LANGUAGES_READY.find((item) => item.id === id) ?? LANGUAGES_READY[0];
    setSelectedId(next.id);
    setCode(next.starter);
    setResult(null);
    setTab("stdout");
    window.history.replaceState(null, "", `/compilers/run?lang=${next.id}`);
  }

  async function runCode() {
    setRunning(true);
    setResult(null);
    setTab("stdout");
    try {
      const lang = LANGUAGES.find((item) => item.id === selectedId) ?? LANGUAGES[0];
      const response = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.language,
          version: lang.version,
          code,
          stdin: stdin || "",
        }),
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, `Run failed with status ${response.status}.`));
      const next = data as RunResult;
      setResult(next);
      if (hasErrors(next)) setTab("stderr");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run code.";
      setResult({ stderr: message, exit_code: 1, status: "error", status_description: "Run failed" });
      setTab("stderr");
      setToast(message);
    } finally {
      setRunning(false);
    }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const allowed = [".txt", ...language.extensions];
    if (!allowed.some((extension) => file.name.toLowerCase().endsWith(extension.toLowerCase()))) {
      setToast(`Only ${allowed.join(", ")} files accepted.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result ?? ""));
    reader.onerror = () => setToast("Could not read the selected file.");
    reader.readAsText(file);
  }

  async function copyText(value: string, target: "code" | "output") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(""), 1200);
  }

  const stdout = result?.stdout || result?.output || "";
  const stderr = [result?.stderr, result?.compile_output, result?.compile_stderr, result?.message].filter(Boolean).join("\n");
  const status = getStatus(result, running);
  const lineCount = Math.max(1, code.split("\n").length);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <TopBar language={language} selectedId={selectedId} onLanguageChange={changeLanguage} running={running} onRun={() => void runCode()} />
      <section className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 basis-[55%] flex-col">
          <div className="flex h-9 flex-none items-center justify-between border-b border-border bg-background px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[10px] font-bold ${CATEGORY_CLASSES[language.category]}`}>{language.abbreviation}</span>
              <span className="truncate text-xs font-semibold">{language.name}</span>
              <span className="text-xs text-muted-foreground">{language.version}</span>
            </div>
            <div className="flex items-center gap-1">
              <input ref={uploadRef} type="file" accept={[".txt", ...language.extensions].join(",")} className="hidden" onChange={handleUpload} />
              <IconButton title="Upload file" onClick={() => uploadRef.current?.click()}><Upload className="h-4 w-4" /></IconButton>
              <IconButton title={copied === "code" ? "Copied" : "Copy"} onClick={() => void copyText(code, "code")}><Copy className="h-4 w-4" /></IconButton>
              <IconButton title="Clear" onClick={() => { setCode(""); setResult(null); }}><X className="h-4 w-4" /></IconButton>
            </div>
          </div>
          <div className="flex min-h-0 flex-1">
            <LineNumbers count={lineCount} />
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => handleEditorKey(event, code, setCode, runCode)}
              spellCheck={false}
              className={`${EDITOR_AREA} min-h-0 flex-1 resize-none border-0 bg-white py-3 pl-0 pr-3 text-[#1e1e1e] outline-none dark:bg-[#1e1e1e] dark:text-[#d4d4d4]`}
            />
          </div>
          <div className="flex-none border-t border-border">
            <button type="button" onClick={() => setStdinOpen((value) => !value)} className="flex h-7 w-full items-center gap-2 bg-border/20 px-4 text-xs font-medium text-muted-foreground transition hover:bg-border/40 hover:text-foreground">
              {stdinOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              stdin
            </button>
            {stdinOpen && (
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Program input (stdin)..."
                spellCheck={false}
                className={`${EDITOR_AREA} h-[120px] w-full resize-none border-0 bg-[#f8f8f8] p-3 text-[#1e1e1e] outline-none dark:bg-[#141414] dark:text-[#d4d4d4]`}
              />
            )}
          </div>
        </div>
        <OutputPanel tab={tab} setTab={setTab} result={result} running={running} status={status} stdout={stdout} stderr={stderr} language={language} onCopy={() => void copyText(tab === "stderr" ? stderr : stdout, "output")} onClear={() => setResult(null)} copied={copied === "output"} />
      </section>
      <style jsx global>{scrollbarStyles}</style>
    </main>
  );
}

function TopBar({ language, selectedId, onLanguageChange, running, onRun }: { language: Language; selectedId: number; onLanguageChange: (id: number) => void; running: boolean; onRun: () => void }) {
  return (
    <header className="flex h-10 flex-none items-center justify-between border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/compilers" className="text-xs font-medium text-muted-foreground transition hover:text-foreground">{"<- Compilers"}</Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className={`truncate rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_CLASSES[language.category]}`}>{language.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(event) => onLanguageChange(Number(event.target.value))}
          className="h-8 w-[220px] rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        >
          {GROUPS.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {LANGUAGES_READY.filter((item) => item.category === group.category).map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.version}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Ctrl+Enter</span>
        <button type="button" onClick={onRun} disabled={running} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Running..." : "Run"}
        </button>
      </div>
    </header>
  );
}

function LineNumbers({ count }: { count: number }) {
  return (
    <div className={`${EDITOR_AREA} editor-scroll w-8 flex-none overflow-hidden border-r border-border bg-white px-2 py-3 text-right text-muted-foreground/40 dark:bg-[#1e1e1e]`}>
      {Array.from({ length: count }, (_, index) => <div key={index}>{index + 1}</div>)}
    </div>
  );
}

function OutputPanel({ tab, setTab, result, running, status, stdout, stderr, language, onCopy, onClear, copied }: { tab: OutputTab; setTab: (tab: OutputTab) => void; result: RunResult | null; running: boolean; status: StatusInfo; stdout: string; stderr: string; language: Language; onCopy: () => void; onClear: () => void; copied: boolean }) {
  return (
    <aside className="flex min-h-0 basis-[45%] flex-col border-l border-border">
      <div className="flex h-9 flex-none items-center justify-between border-b border-border bg-background px-4 py-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Output</div>
        <StatusBadge status={status} />
        <div className="flex items-center gap-1">
          <IconButton title={copied ? "Copied" : "Copy output"} onClick={onCopy}><Copy className="h-4 w-4" /></IconButton>
          <IconButton title="Clear output" onClick={onClear}><X className="h-4 w-4" /></IconButton>
        </div>
      </div>
      <div className="flex h-7 flex-none border-b border-border bg-background">
        {(["stdout", "stderr", "info"] as OutputTab[]).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-3 py-1.5 text-xs font-medium transition ${tab === item ? "border-emerald-500 bg-background text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {item}
          </button>
        ))}
      </div>
      {tab === "stdout" && <StdoutView result={result} running={running} value={stdout} />}
      {tab === "stderr" && <StderrView result={result} value={stderr} />}
      {tab === "info" && <InfoView result={result} language={language} status={status} />}
    </aside>
  );
}

function StdoutView({ result, running, value }: { result: RunResult | null; running: boolean; value: string }) {
  if (!result && !running) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f8f8f8] text-center dark:bg-[#141414]">
        <div>
          <Play className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Run your code to see output</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Press Ctrl+Enter or click Run</p>
        </div>
      </div>
    );
  }
  return <pre className={`${EDITOR_AREA} editor-scroll min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f8f8f8] px-4 py-3 text-emerald-800 dark:bg-[#141414] dark:text-emerald-300`}>{running ? "Running..." : value || "No stdout."}</pre>;
}

function StderrView({ result, value }: { result: RunResult | null; value: string }) {
  if (!result) return <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f8f8f8] text-sm text-muted-foreground dark:bg-[#141414]">No errors</div>;
  return (
    <pre className={`${EDITOR_AREA} editor-scroll min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#f8f8f8] px-4 py-3 text-red-600 dark:bg-[#141414] dark:text-red-400`}>
      {value ? value.split(/\r?\n/).map((line) => line ? `x ${line}` : "").join("\n") : "No errors"}
    </pre>
  );
}

function InfoView({ result, language, status }: { result: RunResult | null; language: Language; status: StatusInfo }) {
  if (!result) return <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f8f8f8] text-sm text-muted-foreground dark:bg-[#141414]">Run code to see execution details</div>;
  const time = result.wall_time ?? result.cpu_time ?? 0;
  const exitCode = result.exit_code ?? null;
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#f8f8f8] p-4 dark:bg-[#141414]">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Execution Time" value={`${time}ms`} className={time < 500 ? "text-emerald-600 dark:text-emerald-400" : time < 2000 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"} />
        <Stat label="Memory" value={`${formatMemoryKb(result.memory ?? 0)}KB`} />
        <Stat label="Exit Code" value={exitCode === 0 ? "0 Success" : `${exitCode ?? "-"} Error`} className={exitCode === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
        <Stat label="Language" value={`${language.name} ${language.version}`} />
        <Stat label="Status" value={result.status_description || status.label} />
      </div>
    </div>
  );
}

function Stat({ label, value, className = "text-foreground" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${className}`}>{value}</div>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="inline-flex h-7 w-7 items-center justify-center rounded-md p-1.5 text-muted-foreground transition hover:bg-border/40 hover:text-foreground">
      {children}
    </button>
  );
}

type StatusInfo = { label: string; className: string };

function StatusBadge({ status }: { status: StatusInfo }) {
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>;
}

function getStatus(result: RunResult | null, running: boolean): StatusInfo {
  if (running) return { label: "Running", className: "border-blue-500/30 bg-blue-500/15 text-blue-500 animate-pulse" };
  if (!result) return { label: "Idle", className: "border-border bg-border/20 text-muted-foreground" };
  const description = (result.status_description || "").toLowerCase();
  if (description.includes("time")) return { label: "TLE", className: "border-amber-500/30 bg-amber-500/15 text-amber-500" };
  if (hasErrors(result)) return { label: "Error", className: "border-red-500/30 bg-red-500/15 text-red-500" };
  return { label: "Accepted", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500" };
}

function handleEditorKey(event: KeyboardEvent<HTMLTextAreaElement>, value: string, onChange: (value: string) => void, onRun: () => void | Promise<void>) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    void onRun();
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

function starterCode(language: LanguageSeed) {
  const map: Record<string, string> = {
    bash: 'echo "Hello, World!"',
    basic: 'Print "Hello, World!"',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    clojure: '(println "Hello, World!")',
    cobol: 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY "Hello, World!".\nSTOP RUN.',
    commonlisp: '(write-line "Hello, World!")',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    csharp: 'using System;\n\nclass MainClass {\n    public static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    d: 'import std.stdio;\n\nvoid main() {\n    writeln("Hello, World!");\n}',
    elixir: 'IO.puts("Hello, World!")',
    erlang: 'main(_) ->\n    io:format("Hello, World!~n").',
    fortran: 'program hello\n    print *, "Hello, World!"\nend program hello',
    fsharp: 'printfn "Hello, World!"',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    groovy: 'println "Hello, World!"',
    haskell: 'main = putStrLn "Hello, World!"',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    javascript: "// JavaScript Node.js\nconsole.log('Hello, World!');\n\n// Try: console.log(2 + 2);",
    kotlin: 'fun main() {\n    println("Hello, World!")\n}',
    lua: 'print("Hello, World!")',
    nasm: 'section .data\n    msg db "Hello, World!", 10\n    len equ $ - msg\n\nsection .text\n    global _start\n_start:\n    mov eax, 4\n    mov ebx, 1\n    mov ecx, msg\n    mov edx, len\n    int 0x80\n    mov eax, 1\n    xor ebx, ebx\n    int 0x80',
    objectivec: '#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, World!");\n    return 0;\n}',
    ocaml: 'print_endline "Hello, World!";;',
    octave: 'disp("Hello, World!")',
    pascal: 'program Hello;\nbegin\n    writeln("Hello, World!");\nend.',
    perl: 'print "Hello, World!\\n";',
    php: '<?php\necho "Hello, World!\\n";',
    prolog: ':- initialization(main).\nmain :- write("Hello, World!"), nl, halt.',
    r: 'print("Hello, World!")',
    ruby: 'puts "Hello, World!"',
    rust: 'fn main() {\n    println!("Hello, World!");\n}',
    scala: 'object Main extends App {\n    println("Hello, World!")\n}',
    sql: 'CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, "Ada"), (2, "Grace");\nSELECT * FROM users;',
    swift: 'print("Hello, World!")',
    typescript: 'const message: string = "Hello, World!";\nconsole.log(message);',
    vb: 'Module Main\n    Sub Main()\n        Console.WriteLine("Hello, World!")\n    End Sub\nEnd Module',
  };
  if (language.id === 70) return `# Python ${language.version}\nprint "Hello, World!"`;
  if (language.language === "python") return `# Python ${language.version}\nname = "World"\nprint(f"Hello, {name}!")`;
  return map[language.language] ?? `// ${language.name} ${language.version}\n`;
}

function hasErrors(result: RunResult) {
  return Boolean(result.stderr || result.compile_output || result.compile_stderr || (result.exit_code ?? 0) !== 0 || result.status === "error");
}

function formatMemoryKb(value: number) {
  return value > 1024 ? Math.round(value / 1024) : value;
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
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
