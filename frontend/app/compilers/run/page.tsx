"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronLeft, ChevronUp, Copy, FileText, Loader2, Play, Terminal, Trash2, Upload, X } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Category = "popular" | "scripting" | "jvm" | "systems" | "functional" | "data" | "database" | "lowlevel";
type OutputTab = "stdout" | "stderr" | "info";
type StatusKind = "idle" | "running" | "accepted" | "runtime" | "compile" | "tle";

type Language = {
  id: number;
  language: string;
  version: string;
  name: string;
  category: Category;
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

const LANGUAGES: Language[] = [
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

const GROUPS: { label: string; category: Category }[] = [
  { label: "Popular", category: "popular" },
  { label: "Scripting", category: "scripting" },
  { label: "JVM", category: "jvm" },
  { label: "Systems", category: "systems" },
  { label: "Functional", category: "functional" },
  { label: "Data", category: "data" },
  { label: "Database", category: "database" },
  { label: "Low-level", category: "lowlevel" },
];

const BADGES: Record<number, { abbr: string; bg: string; text: string }> = {
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

function getLanguageBadge(langId: number) {
  return BADGES[langId] ?? { abbr: "TXT", bg: "#555555", text: "#fff" };
}

function getStarterCode(langId: number) {
  const lang = LANGUAGES.find((item) => item.id === langId);
  if (!lang) return "// Start coding here...\n";
  const byLanguage: Record<string, string> = {
    bash: "#!/usr/bin/env bash\necho \"Hello, World!\"\n",
    basic: "Print \"Hello, World!\"\n",
    c: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
    clojure: "(println \"Hello, World!\")\n",
    cobol: "IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY \"Hello, World!\".\nSTOP RUN.\n",
    commonlisp: "(write-line \"Hello, World!\")\n",
    cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
    csharp: "using System;\n\nclass MainClass {\n    public static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}\n",
    d: "import std.stdio;\n\nvoid main() {\n    writeln(\"Hello, World!\");\n}\n",
    elixir: "IO.puts(\"Hello, World!\")\n",
    erlang: "main(_) ->\n    io:format(\"Hello, World!~n\").\n",
    fortran: "program hello\n    print *, \"Hello, World!\"\nend program hello\n",
    fsharp: "printfn \"Hello, World!\"\n",
    go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}\n",
    groovy: "println \"Hello, World!\"\n",
    haskell: "main = putStrLn \"Hello, World!\"\n",
    java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}\n",
    javascript: "// JavaScript Node.js\nconsole.log('Hello, World!');\n\n// Try: console.log(2 + 2);\n",
    kotlin: "fun main() {\n    println(\"Hello, World!\")\n}\n",
    lua: "print(\"Hello, World!\")\n",
    nasm: "section .data\n    msg db \"Hello, World!\", 10\n    len equ $ - msg\n\nsection .text\n    global _start\n_start:\n    mov eax, 4\n    mov ebx, 1\n    mov ecx, msg\n    mov edx, len\n    int 0x80\n    mov eax, 1\n    xor ebx, ebx\n    int 0x80\n",
    objectivec: "#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@\"Hello, World!\");\n    return 0;\n}\n",
    ocaml: "print_endline \"Hello, World!\";;\n",
    octave: "disp(\"Hello, World!\")\n",
    pascal: "program Hello;\nbegin\n    writeln('Hello, World!');\nend.\n",
    perl: "print \"Hello, World!\\n\";\n",
    php: "<?php\necho \"Hello, World!\\n\";\n",
    prolog: ":- initialization(main).\nmain :- write('Hello, World!'), nl, halt.\n",
    r: "print(\"Hello, World!\")\n",
    ruby: "puts \"Hello, World!\"\n",
    rust: "fn main() {\n    println!(\"Hello, World!\");\n}\n",
    scala: "object Main extends App {\n    println(\"Hello, World!\")\n}\n",
    sql: "CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, 'Ada'), (2, 'Grace');\nSELECT * FROM users;\n",
    swift: "print(\"Hello, World!\")\n",
    typescript: "const message: string = 'Hello, World!';\nconsole.log(message);\n",
    vb: "Module Main\n    Sub Main()\n        Console.WriteLine(\"Hello, World!\")\n    End Sub\nEnd Module\n",
  };
  if (lang.id === 70) return `# Python ${lang.version}\nprint \"Hello, World!\"\n`;
  if (lang.language === "python") return `# Python ${lang.version}\nname = \"World\"\nprint(f\"Hello, {name}!\")\n`;
  return byLanguage[lang.language] ?? "// Start coding here...\n";
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

const codeClass = "compiler-font-code text-[13px] leading-[1.65] font-normal";

export default function CompilerRunPage() {
  const [selectedLangId, setSelectedLangId] = useState(71);
  const selectedLang = useMemo(() => LANGUAGES.find((lang) => lang.id === selectedLangId) ?? LANGUAGES[0], [selectedLangId]);
  const [code, setCode] = useState(() => getStarterCode(71));
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("stdout");
  const [panelWidths, setPanelWidths] = useState({ left: 55, right: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState<"code" | "output" | "">("");
  const [uploadedName, setUploadedName] = useState("");
  const [toast, setToast] = useState("");
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("lang");
    const next = LANGUAGES.find((lang) => String(lang.id) === raw || lang.language === raw?.toLowerCase());
    if (next) {
      setSelectedLangId(next.id);
      setCode(getStarterCode(next.id));
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
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!uploadedName) return;
    const timer = window.setTimeout(() => setUploadedName(""), 2000);
    return () => window.clearTimeout(timer);
  }, [uploadedName]);

  function changeLanguage(id: number) {
    const next = LANGUAGES.find((lang) => lang.id === id) ?? LANGUAGES[0];
    setSelectedLangId(next.id);
    setCode(getStarterCode(next.id));
    setOutput(null);
    setActiveOutputTab("stdout");
    window.history.replaceState(null, "", `/compilers/run?lang=${next.id}`);
  }

  async function runCode() {
    setIsRunning(true);
    setOutput(null);
    setActiveOutputTab("stdout");
    try {
      const response = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang.language,
          version: selectedLang.version,
          code,
          stdin: stdin || "",
        }),
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, `Run failed with status ${response.status}.`));
      const result = data as RunResult;
      setOutput(result);
      if (hasError(result)) setActiveOutputTab("stderr");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run code.";
      setOutput({ stderr: message, exit_code: 1, status_description: "Runtime Error", status: "error" });
      setActiveOutputTab("stderr");
      setToast(message);
    } finally {
      setIsRunning(false);
    }
  }

  function startResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
    const onMove = (move: MouseEvent) => {
      const percent = (move.clientX / window.innerWidth) * 100;
      const left = Math.min(70, Math.max(30, percent));
      setPanelWidths({ left, right: 100 - left });
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const allowed = [".txt", ...(EXTENSIONS[selectedLang.language] ?? [])];
    if (!allowed.some((extension) => file.name.toLowerCase().endsWith(extension.toLowerCase()))) {
      setToast(`Only ${allowed.join(", ")} files accepted.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCode(String(reader.result ?? ""));
      setUploadedName(file.name);
    };
    reader.onerror = () => setToast("Could not read selected file.");
    reader.readAsText(file);
  }

  async function copyText(value: string, target: "code" | "output") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(""), 1500);
  }

  const lineCount = Math.max(1, code.split("\n").length);
  const stdout = output?.stdout || output?.output || "";
  const stderr = [output?.stderr, output?.compile_output, output?.compile_stderr, output?.message].filter(Boolean).join("\n");
  const status = getStatus(output, isRunning);
  const errorCount = stderr ? stderr.split(/\r?\n/).filter(Boolean).length : 0;

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar selectedLang={selectedLang} selectedLangId={selectedLangId} onLanguageChange={changeLanguage} isRunning={isRunning} onRun={() => void runCode()} />
        <section className="flex min-h-0 flex-1 overflow-hidden">
          <section style={{ width: `${panelWidths.left}%` }} className="flex min-w-0 flex-col overflow-hidden border-r border-border">
            <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-[var(--card,rgb(var(--background)))] px-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <LanguageBadge langId={selectedLang.id} />
                <span className="truncate text-xs font-semibold">{selectedLang.name}</span>
                <span className="text-xs text-muted-foreground">{selectedLang.version}</span>
                {uploadedName && <span className="ml-2 truncate text-[11px] text-muted-foreground">{uploadedName}</span>}
              </div>
              <div className="flex items-center gap-0.5">
                <input ref={uploadRef} type="file" className="hidden" accept={[".txt", ...(EXTENSIONS[selectedLang.language] ?? [])].join(",")} onChange={uploadFile} />
                <IconButton title="Upload file" onClick={() => uploadRef.current?.click()}><Upload size={14} /></IconButton>
                <IconButton title="Copy code" onClick={() => void copyText(code, "code")}>{copied === "code" ? <Check size={14} /> : <Copy size={14} />}</IconButton>
                <IconButton title="Clear editor" onClick={() => setCode("")}><Trash2 size={14} /></IconButton>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div ref={lineNumbersRef} className="compiler-font-code w-9 shrink-0 overflow-hidden border-r border-[rgba(128,128,128,0.1)] bg-[#f8f8f8] py-2.5 pr-2 text-right text-xs font-normal leading-[1.65] text-[rgba(128,128,128,0.6)] dark:bg-[#1e1e1e]">
                {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
              </div>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => handleEditorKey(event, code, setCode, runCode)}
                onScroll={(event) => {
                  if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                }}
                placeholder="// Start coding here..."
                spellCheck={false}
                autoComplete="off"
                className={`${codeClass} compiler-scroll min-h-0 flex-1 resize-none overflow-auto border-0 bg-white px-4 pb-20 pt-2.5 text-[#1e1e1e] outline-none placeholder:text-[rgba(128,128,128,0.3)] dark:bg-[#1e1e1e] dark:text-[#d4d4d4]`}
              />
            </div>
            <div className="shrink-0">
              <button type="button" onClick={() => setStdinOpen((value) => !value)} className="flex h-8 w-full cursor-pointer items-center justify-between border-t border-border bg-[rgb(var(--border)/0.18)] px-2.5 transition hover:bg-[rgb(var(--border)/0.32)]">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Terminal size={12} />stdin</span>
                {stdinOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {stdinOpen && (
                <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Program input (stdin)..." spellCheck={false} className={`${codeClass} compiler-scroll h-[100px] w-full resize-none border-0 border-t border-border bg-[#f0f0f0] px-3 py-2 text-foreground outline-none dark:bg-[#161616]`} />
              )}
            </div>
          </section>
          <div onMouseDown={startResize} className={`h-full w-1 shrink-0 cursor-col-resize bg-border transition ${isDragging ? "bg-emerald-500" : "hover:bg-emerald-500"}`} />
          <OutputPanel width={panelWidths.right} activeTab={activeOutputTab} setActiveTab={setActiveOutputTab} output={output} stdout={stdout} stderr={stderr} status={status} errorCount={errorCount} selectedLang={selectedLang} onCopy={() => void copyText(activeOutputTab === "stderr" ? stderr : stdout, "output")} onClear={() => setOutput(null)} copied={copied === "output"} />
        </section>
      </div>
      <style jsx global>{compilerStyles}</style>
    </main>
  );
}

function TopBar({ selectedLang, selectedLangId, onLanguageChange, isRunning, onRun }: { selectedLang: Language; selectedLangId: number; onLanguageChange: (id: number) => void; isRunning: boolean; onRun: () => void }) {
  return (
    <header className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-[var(--card,rgb(var(--background)))] px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/compilers" className="flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-foreground"><ChevronLeft size={12} />Compilers</Link>
        <span className="mx-0.5 text-[11px] text-muted-foreground/40">/</span>
        <LanguageBadge langId={selectedLang.id} />
        <h1 className="truncate text-sm font-medium">{selectedLang.name}</h1>
      </div>
      <div className="flex items-center gap-2">
        <select value={selectedLangId} onChange={(event) => onLanguageChange(Number(event.target.value))} className="h-7 w-60 cursor-pointer rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
          {GROUPS.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {LANGUAGES.filter((lang) => lang.category === group.category).map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="mx-1 h-5 w-px bg-border" />
        <button type="button" onClick={onRun} disabled={isRunning} className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-emerald-500 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-600 active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70">
          {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {isRunning ? "Running" : "Run"}
        </button>
        <span className="ml-1 text-[11px] text-muted-foreground/50">Ctrl+Enter</span>
      </div>
    </header>
  );
}

function OutputPanel({ width, activeTab, setActiveTab, output, stdout, stderr, status, errorCount, selectedLang, onCopy, onClear, copied }: { width: number; activeTab: OutputTab; setActiveTab: (tab: OutputTab) => void; output: RunResult | null; stdout: string; stderr: string; status: StatusKind; errorCount: number; selectedLang: Language; onCopy: () => void; onClear: () => void; copied: boolean }) {
  return (
    <section style={{ width: `${width}%` }} className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-[var(--card,rgb(var(--background)))] px-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Output</div>
        {output && <StatusBadge status={status} />}
        <div className="flex items-center gap-0.5">
          <IconButton title="Copy output" onClick={onCopy} disabled={!stdout && !stderr}>{copied ? <Check size={14} /> : <Copy size={14} />}</IconButton>
          <IconButton title="Clear output" onClick={onClear}><X size={14} /></IconButton>
        </div>
      </div>
      <div className="flex h-8 shrink-0 border-b border-border bg-[var(--card,rgb(var(--background)))]">
        {(["stdout", "stderr", "info"] as OutputTab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex h-8 cursor-pointer items-center border-b-2 px-3.5 text-xs font-medium transition ${activeTab === tab ? "border-[#10b981] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab}
            {tab === "stderr" && errorCount > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 py-px text-[8px] text-white">{errorCount}</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "stdout" && <Stdout output={output} stdout={stdout} />}
        {activeTab === "stderr" && <Stderr output={output} stderr={stderr} />}
        {activeTab === "info" && <Info output={output} selectedLang={selectedLang} status={status} />}
      </div>
    </section>
  );
}

function Stdout({ output, stdout }: { output: RunResult | null; stdout: string }) {
  if (!output) {
    return <EmptyState icon={<Play size={20} />} title="Run your code" subtitle="Press Ctrl+Enter or click Run to execute" />;
  }
  if (!stdout && output.exit_code !== 0) {
    return <pre className={`${codeClass} compiler-scroll h-full overflow-auto bg-[#f5f5f5] px-4 py-2.5 text-muted-foreground dark:bg-[#161616]`}>Process exited with code {output.exit_code ?? 1}</pre>;
  }
  return <pre className={`${codeClass} compiler-scroll h-full overflow-auto whitespace-pre-wrap bg-[#f5f5f5] px-4 py-2.5 ${output.exit_code === 0 ? "text-[#1a7a4a] dark:text-[#4ec994]" : "text-foreground"} dark:bg-[#161616]`}>{stdout || "No stdout."}</pre>;
}

function Stderr({ output, stderr }: { output: RunResult | null; stderr: string }) {
  if (!output || !stderr) return <EmptyState icon={<AlertCircle size={20} />} title="No errors" />;
  return (
    <div className={`${codeClass} compiler-scroll h-full overflow-auto bg-[#f5f5f5] px-4 py-2.5 text-[#c0392b] dark:bg-[#161616] dark:text-[#f48771]`}>
      {stderr.split(/\r?\n/).map((line, index) => line ? (
        <div key={`${index}-${line}`} className="flex gap-2 py-px">
          <AlertCircle size={12} className="mt-[3px] shrink-0" />
          <span>{line}</span>
        </div>
      ) : <br key={index} />)}
    </div>
  );
}

function Info({ output, selectedLang, status }: { output: RunResult | null; selectedLang: Language; status: StatusKind }) {
  if (!output) return <EmptyState icon={<FileText size={20} />} title="Run code to see details" />;
  const ms = output.wall_time ?? output.cpu_time ?? 0;
  const memoryBytes = output.memory ?? 0;
  const exit = output.exit_code ?? null;
  return (
    <div className="compiler-scroll h-full overflow-auto bg-[#f5f5f5] p-4 dark:bg-[#161616]">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Execution Time" value={formatMs(ms)} className={ms < 300 ? "text-emerald-500" : ms <= 1000 ? "text-amber-500" : "text-red-500"} />
        <Stat label="Memory" value={formatBytes(memoryBytes)} />
        <Stat label="Exit Code" value={exit === 0 ? "0 - Success" : `${exit ?? "-"} - Error`} className={exit === 0 ? "text-emerald-500" : "text-red-500"} />
        <Stat label="Language" value={`${selectedLang.name} ${selectedLang.version}`} />
        <Stat label="Status" value={output.status_description || labelForStatus(status)} />
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-[rgb(var(--border)/0.12)] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[13px] font-semibold ${className}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#f5f5f5] text-center dark:bg-[#161616]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--border)/0.35)] text-muted-foreground/50">{icon}</div>
      <div className="mt-3 text-sm font-medium">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function LanguageBadge({ langId }: { langId: number }) {
  const badge = getLanguageBadge(langId);
  return <span className="compiler-font-code flex h-[22px] min-w-[22px] items-center justify-center rounded px-1 text-[10px] font-bold" style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.abbr}</span>;
}

function IconButton({ title, onClick, children, disabled = false }: { title: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition duration-150 hover:bg-[rgb(var(--border)/0.4)] hover:text-foreground active:bg-[rgb(var(--border)/0.65)] disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: StatusKind }) {
  const style = {
    accepted: "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.12)] text-[#10b981]",
    runtime: "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]",
    compile: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] text-[#f59e0b]",
    tle: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] text-[#f59e0b]",
    running: "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] text-[#3b82f6]",
    idle: "border-border bg-[rgb(var(--border)/0.15)] text-muted-foreground",
  }[status];
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "running" ? "animate-pulse" : ""}`} style={{ backgroundColor: dotColor(status) }} />
      {labelForStatus(status)}
    </span>
  );
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

function getStatus(output: RunResult | null, running: boolean): StatusKind {
  if (running) return "running";
  if (!output) return "idle";
  const description = (output.status_description || "").toLowerCase();
  if (description.includes("time")) return "tle";
  if (description.includes("compilation") || output.compile_output || output.compile_stderr) return "compile";
  if (hasError(output)) return "runtime";
  return "accepted";
}

function hasError(output: RunResult) {
  return Boolean(output.stderr || output.compile_output || output.compile_stderr || (output.exit_code ?? 0) !== 0 || output.status === "error");
}

function labelForStatus(status: StatusKind) {
  if (status === "accepted") return "Accepted";
  if (status === "runtime") return "Runtime Error";
  if (status === "compile") return "Compile Error";
  if (status === "tle") return "Time Limit Exceeded";
  if (status === "running") return "Running";
  return "Idle";
}

function dotColor(status: StatusKind) {
  if (status === "accepted") return "#10b981";
  if (status === "runtime") return "#ef4444";
  if (status === "compile" || status === "tle") return "#f59e0b";
  if (status === "running") return "#3b82f6";
  return "rgb(var(--muted-foreground))";
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
}

function Toast({ message }: { message: string }) {
  return <div className="compiler-toast fixed right-4 top-12 z-50 rounded-lg bg-red-500/95 px-4 py-3 text-xs font-medium text-white shadow-lg">{message}</div>;
}

const compilerStyles = `
.compiler-font-code {
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
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
.compiler-toast {
  animation: compilerToast 180ms ease-out both;
}
`;
