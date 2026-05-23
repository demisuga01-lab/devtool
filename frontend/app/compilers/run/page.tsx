"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Copy, Eraser, FileUp, Loader2, Play, Terminal } from "lucide-react";
import { API_BASE } from "@/lib/api";

type LanguageCategory = "popular" | "scripting" | "jvm" | "systems" | "functional" | "data" | "database" | "lowlevel";
type LanguageGroup = "Popular" | "Scripting" | "JVM" | "Systems" | "Functional" | "Data" | "Database" | "Low-level";

type LanguageSeed = {
  id: number;
  language: string;
  version: string;
  name: string;
  category: LanguageCategory;
};

type CompilerLanguage = LanguageSeed & {
  group: LanguageGroup;
  badge: string;
  extensions: string[];
  accent: string;
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

type OutputTab = "stdout" | "stderr" | "info";

const hello = {
  python: "# Write your Python code here\nprint('Hello, World!')",
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  c: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  cpp: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  js: 'console.log("Hello, World!");',
  ts: 'const message: string = "Hello, World!";\nconsole.log(message);',
  ruby: 'puts "Hello, World!"',
  php: '<?php\necho "Hello, World!\\n";',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  rust: 'fn main() {\n    println!("Hello, World!");\n}',
  sql: 'CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, "Ada"), (2, "Grace");\nSELECT * FROM users;',
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

const categoryLabels: Record<LanguageCategory, LanguageGroup> = {
  popular: "Popular",
  scripting: "Scripting",
  jvm: "JVM",
  systems: "Systems",
  functional: "Functional",
  data: "Data",
  database: "Database",
  lowlevel: "Low-level",
};

const groups: { category: LanguageCategory; label: LanguageGroup }[] = [
  { category: "popular", label: "Popular" },
  { category: "scripting", label: "Scripting" },
  { category: "jvm", label: "JVM" },
  { category: "systems", label: "Systems" },
  { category: "functional", label: "Functional" },
  { category: "data", label: "Data" },
  { category: "database", label: "Database" },
  { category: "lowlevel", label: "Low-level" },
];

const extensionByLanguage: Record<string, string[]> = {
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

const badgeByLanguage: Record<string, string> = {
  commonlisp: "lisp",
  csharp: "cs",
  fsharp: "fs",
  javascript: "js",
  objectivec: "m",
  python: "py",
  typescript: "ts",
};

const accentByCategory: Record<LanguageCategory, string> = {
  popular: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  scripting: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  jvm: "bg-red-500/10 text-red-600 dark:text-red-300",
  systems: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  functional: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  data: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  database: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  lowlevel: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
};

const languages: CompilerLanguage[] = LANGUAGES.map((item) => ({
  ...item,
  group: categoryLabels[item.category],
  badge: badgeByLanguage[item.language] ?? item.language,
  extensions: extensionByLanguage[item.language] ?? [".txt"],
  accent: accentByCategory[item.category],
  starter: starterForLanguage(item),
}));

function starterForLanguage(item: LanguageSeed) {
  if (item.id === 70) return 'print "Hello, World!"';
  if (item.language === "python") return hello.python;
  if (item.language === "java") return hello.java;
  if (item.language === "c") return hello.c;
  if (item.language === "cpp") return hello.cpp;
  if (item.language === "csharp") return 'using System;\n\nclass MainClass {\n    public static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}';
  if (item.language === "rust") return hello.rust;
  if (item.language === "go") return hello.go;
  if (item.language === "kotlin") return 'fun main() {\n    println("Hello, World!")\n}';
  if (item.language === "php") return hello.php;
  if (item.language === "ruby") return hello.ruby;
  if (item.language === "swift") return 'print("Hello, World!")';
  if (item.language === "javascript") return hello.js;
  if (item.language === "typescript") return hello.ts;
  if (item.language === "bash") return 'echo "Hello, World!"';
  if (item.language === "perl") return 'print "Hello, World!\\n";';
  if (item.language === "lua") return 'print("Hello, World!")';
  if (item.language === "r") return 'print("Hello, World!")';
  if (item.language === "octave") return 'disp("Hello, World!")';
  if (item.language === "sql") return hello.sql;
  if (item.language === "scala") return 'object Main extends App {\n    println("Hello, World!")\n}';
  if (item.language === "clojure") return '(println "Hello, World!")';
  if (item.language === "groovy") return 'println "Hello, World!"';
  if (item.language === "basic") return 'Print "Hello, World!"';
  if (item.language === "vb") return 'Module Main\n    Sub Main()\n        Console.WriteLine("Hello, World!")\n    End Sub\nEnd Module';
  if (item.language === "fsharp") return 'printfn "Hello, World!"';
  if (item.language === "haskell") return 'main = putStrLn "Hello, World!"';
  if (item.language === "elixir") return 'IO.puts("Hello, World!")';
  if (item.language === "erlang") return 'main(_) ->\n    io:format("Hello, World!~n").';
  if (item.language === "ocaml") return 'print_endline "Hello, World!";;';
  if (item.language === "commonlisp") return '(write-line "Hello, World!")';
  if (item.language === "prolog") return ':- initialization(main).\nmain :- write("Hello, World!"), nl, halt.';
  if (item.language === "d") return 'import std.stdio;\n\nvoid main() {\n    writeln("Hello, World!");\n}';
  if (item.language === "fortran") return 'program hello\n    print *, "Hello, World!"\nend program hello';
  if (item.language === "pascal") return 'program Hello;\nbegin\n  writeln("Hello, World!");\nend.';
  if (item.language === "objectivec") return '#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, World!");\n    return 0;\n}';
  if (item.language === "cobol") return 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY "Hello, World!".\nSTOP RUN.';
  if (item.language === "nasm") return 'section .data\n    msg db "Hello, World!", 10\n    len equ $ - msg\n\nsection .text\n    global _start\n_start:\n    mov eax, 4\n    mov ebx, 1\n    mov ecx, msg\n    mov edx, len\n    int 0x80\n    mov eax, 1\n    xor ebx, ebx\n    int 0x80';
  return `# Write your ${item.name} code here`;
}

export default function CompilerRunPage() {
  const [selectedId, setSelectedId] = useState(71);
  const [code, setCode] = useState(hello.python);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<OutputTab>("stdout");
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState("");
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const language = useMemo(() => languages.find((item) => item.id === selectedId) ?? languages[0], [selectedId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("lang");
    if (!raw) return;
    const next = languages.find((item) => String(item.id) === raw || item.language === raw.toLowerCase() || item.name.toLowerCase() === raw.toLowerCase());
    if (next) {
      setSelectedId(next.id);
      setCode(next.starter);
    }
  }, []);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "Enter") {
        event.preventDefault();
        void run();
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        clearEditor();
      }
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        uploadRef.current?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function switchLanguage(id: number) {
    const next = languages.find((item) => item.id === id) ?? languages[0];
    setSelectedId(next.id);
    setCode(next.starter);
    setFilename("");
    setResult(null);
    setTab("stdout");
    window.history.replaceState(null, "", `/compilers/run?lang=${next.id}`);
  }

  async function run() {
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
      if (hasError(next)) setTab("stderr");
    } catch (error) {
      setResult({ stderr: error instanceof Error ? error.message : "Unable to run code.", status: "error", status_description: "Network Error", exit_code: 1 });
      setTab("stderr");
      setToast(error instanceof Error ? error.message : "Unable to run code.");
    } finally {
      setRunning(false);
    }
  }

  function clearEditor() {
    setCode("");
    setResult(null);
    setFilename("");
  }

  async function copy(value: string, label: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const allowed = [".txt", ...language.extensions];
    if (!allowed.some((extension) => file.name.toLowerCase().endsWith(extension.toLowerCase()))) {
      setToast(`Only ${allowed.join(", ")} files accepted.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCode(String(reader.result ?? ""));
      setFilename(file.name);
    };
    reader.onerror = () => setToast("Could not read the selected file.");
    reader.readAsText(file);
  }

  const stdout = result?.stdout || result?.output || "";
  const stderr = [result?.stderr, result?.compile_output, result?.compile_stderr, result?.message].filter(Boolean).join("\n");
  const status = statusLabel(result);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {toast && <Toast message={toast} />}
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-4">
        <header className="grid gap-3 rounded-xl border border-border bg-white p-4 dark:bg-zinc-900 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="space-y-1">
            <Link href="/compilers" className="text-sm text-muted-foreground transition hover:text-foreground">← All Languages</Link>
            <div className="text-xs text-muted-foreground">
              <Link href="/compilers" className="hover:text-foreground">Compilers</Link>
              <span className="mx-2">/</span>
              <span>{language.name}</span>
            </div>
          </div>
          <div className="text-left lg:text-center">
            <h1 className="text-2xl font-bold">{language.name} Compiler</h1>
            <p className="text-sm text-muted-foreground">{language.version}</p>
          </div>
          <div className="lg:justify-self-end">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Language</label>
            <select value={language.id} onChange={(event) => switchLanguage(Number(event.target.value))} className="w-full rounded-lg border border-border bg-background text-foreground text-sm font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 lg:min-w-80">
              {groups.map((group) => (
                <optgroup key={group.category} label={group.label}>
                  {languages.filter((item) => item.category === group.category).map((item) => (
                    <option key={`${item.id}-${item.name}-${item.version}`} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </header>

        <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,55fr)_minmax(360px,45fr)]">
          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${language.accent}`}>{language.name}</span>
                {filename && <span className="max-w-[220px] truncate text-xs text-muted-foreground">{filename}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={uploadRef} type="file" accept={[".txt", ...language.extensions].join(",")} className="hidden" onChange={onUpload} />
                <IconButton onClick={() => uploadRef.current?.click()} icon={<FileUp className="h-4 w-4" />} label="Upload file" />
                <IconButton onClick={clearEditor} icon={<Eraser className="h-4 w-4" />} label="Clear" />
                <IconButton onClick={() => void copy(code, "code")} icon={<Copy className="h-4 w-4" />} label={copied === "code" ? "Copied" : "Copy"} />
                <button type="button" onClick={() => void run()} disabled={running} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {running ? "Running..." : "Run"}
                </button>
              </div>
            </div>
            <CodeEditor value={code} onChange={setCode} onRun={run} placeholder={language.starter} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
              <span>{lineCount(code)} lines · {code.length} characters</span>
              <span>{language.name} · {language.version}</span>
            </div>
            <div className="rounded-lg border border-border">
              <button type="button" onClick={() => setStdinOpen((value) => !value)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium">
                {stdinOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Standard Input (stdin)
              </button>
              {stdinOpen && (
                <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Enter input for your program..." className="h-[100px] w-full resize-y border-t border-border bg-transparent p-3 font-mono text-sm outline-none" />
              )}
            </div>
          </div>

          <OutputPanel tab={tab} setTab={setTab} stdout={stdout} stderr={stderr} result={result} status={status} language={language} onClear={() => setResult(null)} onCopy={() => void copy(tab === "stderr" ? stderr : stdout, "output")} copied={copied === "output"} />
        </section>

        <div className="rounded-xl border border-border bg-white px-4 py-2 text-xs text-muted-foreground dark:bg-zinc-900">
          Ctrl+Enter: Run | Ctrl+L: Clear | Ctrl+U: Upload file
        </div>
      </div>
    </main>
  );
}

function CodeEditor({ value, onChange, onRun, placeholder }: { value: string; onChange: (value: string) => void; onRun: () => void | Promise<void>; placeholder: string }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const numbersRef = useRef<HTMLDivElement | null>(null);
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
  return (
    <div className="grid h-[50vh] min-h-[500px] overflow-hidden rounded-lg border border-border bg-[#fafafa] dark:bg-[#0d0d0d] lg:h-[calc(100vh-220px)] grid-cols-[54px_1fr]">
      <div ref={numbersRef} className="select-none overflow-hidden border-r border-border bg-zinc-100 px-2 py-4 text-right font-mono text-xs leading-[1.6rem] text-zinc-500 dark:bg-zinc-950">
        {Array.from({ length: lineCount(value) }, (_, index) => <div key={index}>{index + 1}</div>)}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          if (numbersRef.current) numbersRef.current.scrollTop = event.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        spellCheck={false}
        className="h-full resize-none bg-transparent p-4 font-mono text-sm leading-[1.6rem] text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-700"
      />
    </div>
  );
}

function OutputPanel({ tab, setTab, stdout, stderr, result, status, language, onClear, onCopy, copied }: { tab: OutputTab; setTab: (tab: OutputTab) => void; stdout: string; stderr: string; result: RunResult | null; status: { label: string; color: string }; language: CompilerLanguage; onClear: () => void; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-white p-4 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Output</h2>
        <div className="flex flex-wrap items-center gap-2">
          {result && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>}
          {result && <IconButton onClick={onCopy} icon={<Copy className="h-4 w-4" />} label={copied ? "Copied" : "Copy output"} />}
          <IconButton onClick={onClear} icon={<Eraser className="h-4 w-4" />} label="Clear" />
        </div>
      </div>
      <div className="mt-3 flex gap-1 border-b border-border">
        {(["stdout", "stderr", "info"] as OutputTab[]).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-3 py-2 text-sm ${tab === item ? "border-emerald-500 font-semibold text-foreground" : "border-transparent text-muted-foreground"}`}>{item}</button>
        ))}
      </div>
      {tab === "stdout" && <OutputBox value={stdout} empty="Run your code to see output here" tone="stdout" hasRun={Boolean(result)} />}
      {tab === "stderr" && <ErrorBox value={stderr} result={result} />}
      {tab === "info" && <InfoBox result={result} language={language} status={status.label} />}
    </div>
  );
}

function OutputBox({ value, empty, tone, hasRun }: { value: string; empty: string; tone: "stdout" | "stderr"; hasRun: boolean }) {
  if (!hasRun) {
    return (
      <div className="mt-3 flex h-[40vh] min-h-[400px] items-center justify-center rounded-lg border border-border bg-[#f5f5f5] text-center dark:bg-[#111111] lg:h-[calc(100vh-320px)]">
        <div className="space-y-3 text-muted-foreground">
          <Play className="mx-auto h-12 w-12" />
          <p className="text-sm">{empty}</p>
        </div>
      </div>
    );
  }
  return <pre className={`mt-3 h-[40vh] min-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-[#f5f5f5] p-4 font-mono text-[13px] leading-relaxed dark:bg-[#111111] lg:h-[calc(100vh-320px)] ${tone === "stdout" ? "text-zinc-900 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>{value || "No output."}</pre>;
}

function ErrorBox({ value, result }: { value: string; result: RunResult | null }) {
  if (!result) {
    return (
      <div className="mt-3 flex h-[40vh] min-h-[400px] items-center justify-center rounded-lg border border-border bg-[#f5f5f5] text-sm text-muted-foreground dark:bg-[#111111] lg:h-[calc(100vh-320px)]">
        No errors
      </div>
    );
  }
  if (!value) return <OutputBox value="No errors" empty="No errors" tone="stderr" hasRun />;
  return (
    <div className="mt-3 h-[40vh] min-h-[400px] overflow-auto rounded-lg border border-border bg-[#f5f5f5] p-4 dark:bg-[#111111] lg:h-[calc(100vh-320px)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-red-500">
        <AlertCircle className="h-4 w-4" />
        {errorTitle(result)}
      </div>
      <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-red-600 dark:text-red-300">
        {value.split(/\r?\n/).map((line, index) => (
          <span key={`${index}-${line}`} className="block">
            {line ? <AlertCircle className="mr-1 inline h-3.5 w-3.5 text-red-500" /> : null}
            {lineReference(line) ? <button type="button" className="mr-1 rounded text-amber-500 underline decoration-dotted">{lineReference(line)}</button> : null}
            {line}
          </span>
        ))}
      </pre>
    </div>
  );
}

function InfoBox({ result, language, status }: { result: RunResult | null; language: CompilerLanguage; status: string }) {
  if (!result) return <div className="mt-3 rounded-lg border border-border p-6 text-sm text-muted-foreground">Run code to see execution statistics.</div>;
  const time = result.wall_time ?? result.cpu_time ?? 0;
  const memory = result.memory ?? 0;
  const cards = [
    { label: "Execution Time", value: `${time} ms`, className: time < 1000 ? "text-emerald-500" : time <= 3000 ? "text-amber-500" : "text-red-500" },
    { label: "Memory Used", value: formatMemory(memory), className: "text-blue-400" },
    { label: "Exit Code", value: String(result.exit_code ?? "-"), className: (result.exit_code ?? 1) === 0 ? "text-emerald-500" : "text-red-500" },
    { label: "Language", value: `${language.name} ${language.version}`, className: "text-foreground" },
    { label: "Status", value: result.status_description || status, className: status === "Accepted" ? "text-emerald-500" : "text-amber-500" },
  ];
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-[#f5f5f5] p-4 dark:bg-[#111111]">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
          <p className={`mt-2 break-words text-sm font-semibold ${card.className}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function IconButton({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</div>;
}

function hasError(result: RunResult) {
  return Boolean(result.stderr || result.compile_output || result.compile_stderr || (result.exit_code ?? 0) !== 0 || result.status === "error");
}

function statusLabel(result: RunResult | null) {
  if (!result) return { label: "Not run", color: "bg-zinc-500/10 text-zinc-500" };
  const description = (result.status_description || "").toLowerCase();
  if (description.includes("time")) return { label: "Time Limit Exceeded", color: "bg-amber-500/10 text-amber-600 dark:text-amber-300" };
  if (description.includes("compilation")) return { label: "Compile Error", color: "bg-red-500/10 text-red-600 dark:text-red-300" };
  if (hasError(result)) return { label: "Runtime Error", color: "bg-red-500/10 text-red-600 dark:text-red-300" };
  return { label: "Accepted", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" };
}

function errorTitle(result: RunResult) {
  const description = (result.status_description || "").toLowerCase();
  if (description.includes("compilation")) return "Compile Error";
  if (description.includes("time")) return "Time Limit Exceeded";
  return "Runtime Error";
}

function lineReference(line: string) {
  return line.match(/(\d+):(\d+)/)?.[0] ?? line.match(/line\s+(\d+)/i)?.[0] ?? "";
}

function lineCount(value: string) {
  return Math.max(1, value.split("\n").length);
}

function formatMemory(value: number) {
  if (!value) return "0 KB";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.round(value / 1024)} KB`;
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
}

