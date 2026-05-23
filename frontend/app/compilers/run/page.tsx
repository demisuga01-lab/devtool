"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Copy, Eraser, FileUp, Loader2, Play, Terminal } from "lucide-react";
import { API_BASE } from "@/lib/api";

type LanguageGroup = "Popular" | "Scripting" | "JVM" | "Systems" | "Functional" | "Data" | "Database";

type CompilerLanguage = {
  id: number;
  name: string;
  version: string;
  group: LanguageGroup;
  alias: string;
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

const languages: CompilerLanguage[] = [
  { id: 71, name: "Python 3", version: "3.8.1", group: "Popular", alias: "python", badge: "py", extensions: [".py"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: hello.python },
  { id: 62, name: "Java", version: "OpenJDK 13.0.1", group: "Popular", alias: "java", badge: "java", extensions: [".java"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: hello.java },
  { id: 50, name: "C", version: "GCC 9.2.0", group: "Popular", alias: "c", badge: "c", extensions: [".c", ".h"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 54, name: "C++", version: "GCC 9.2.0", group: "Popular", alias: "cpp", badge: "cpp", extensions: [".cpp", ".cc", ".cxx", ".hpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 73, name: "Rust", version: "1.40.0", group: "Popular", alias: "rust", badge: "rs", extensions: [".rs"], accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", starter: hello.rust },
  { id: 60, name: "Go", version: "1.13.5", group: "Popular", alias: "go", badge: "go", extensions: [".go"], accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", starter: hello.go },
  { id: 68, name: "PHP", version: "7.4.1", group: "Popular", alias: "php", badge: "php", extensions: [".php"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: hello.php },
  { id: 72, name: "Ruby", version: "2.7.0", group: "Popular", alias: "ruby", badge: "rb", extensions: [".rb"], accent: "bg-rose-500/10 text-rose-600 dark:text-rose-300", starter: hello.ruby },
  { id: 46, name: "Bash", version: "5.0.0", group: "Scripting", alias: "bash", badge: "sh", extensions: [".sh", ".bash"], accent: "bg-lime-500/10 text-lime-700 dark:text-lime-300", starter: 'echo "Hello, World!"' },
  { id: 85, name: "Perl", version: "5.28.1", group: "Scripting", alias: "perl", badge: "pl", extensions: [".pl", ".pm"], accent: "bg-slate-500/10 text-slate-600 dark:text-slate-300", starter: 'print "Hello, World!\\n";' },
  { id: 64, name: "Lua", version: "5.3.5", group: "Scripting", alias: "lua", badge: "lua", extensions: [".lua"], accent: "bg-blue-500/10 text-blue-700 dark:text-blue-300", starter: 'print("Hello, World!")' },
  { id: 70, name: "Python 2", version: "2.7.17", group: "Scripting", alias: "python", badge: "py2", extensions: [".py"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: 'print "Hello, World!"' },
  { id: 63, name: "JavaScript", version: "Node.js 12.14.0", group: "Scripting", alias: "javascript", badge: "js", extensions: [".js", ".mjs"], accent: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300", starter: hello.js },
  { id: 74, name: "TypeScript", version: "3.7.4", group: "Scripting", alias: "typescript", badge: "ts", extensions: [".ts"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: hello.ts },
  { id: 51, name: "C#", version: "Mono 6.6.0", group: "JVM", alias: "csharp", badge: "cs", extensions: [".cs"], accent: "bg-purple-500/10 text-purple-600 dark:text-purple-300", starter: 'using System;\n\nclass MainClass {\n    public static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}' },
  { id: 78, name: "Kotlin", version: "1.3.70", group: "JVM", alias: "kotlin", badge: "kt", extensions: [".kt", ".kts"], accent: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300", starter: 'fun main() {\n    println("Hello, World!")\n}' },
  { id: 81, name: "Scala", version: "2.13.2", group: "JVM", alias: "scala", badge: "scala", extensions: [".scala"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: 'object Main extends App {\n    println("Hello, World!")\n}' },
  { id: 86, name: "Clojure", version: "1.10.1", group: "JVM", alias: "clojure", badge: "clj", extensions: [".clj"], accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", starter: '(println "Hello, World!")' },
  { id: 88, name: "Groovy", version: "3.0.3", group: "JVM", alias: "groovy", badge: "gy", extensions: [".groovy"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: 'println "Hello, World!"' },
  { id: 84, name: "Visual Basic", version: "vbnc 0.0.0.5943", group: "JVM", alias: "visualbasic", badge: "vb", extensions: [".vb"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: 'Module Main\n    Sub Main()\n        Console.WriteLine("Hello, World!")\n    End Sub\nEnd Module' },
  { id: 48, name: "C", version: "GCC 7.4.0", group: "Systems", alias: "c", badge: "c", extensions: [".c", ".h"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 49, name: "C", version: "GCC 8.3.0", group: "Systems", alias: "c", badge: "c", extensions: [".c", ".h"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 75, name: "C", version: "Clang 7.0.1", group: "Systems", alias: "c", badge: "clang", extensions: [".c", ".h"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 52, name: "C++", version: "GCC 7.4.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp", ".cc", ".cxx", ".hpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 53, name: "C++", version: "GCC 8.3.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp", ".cc", ".cxx", ".hpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 76, name: "C++", version: "Clang 7.0.1", group: "Systems", alias: "cpp", badge: "clang++", extensions: [".cpp", ".cc", ".cxx", ".hpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 45, name: "Assembly", version: "NASM 2.14.02", group: "Systems", alias: "assembly", badge: "asm", extensions: [".asm", ".s"], accent: "bg-amber-500/10 text-amber-700 dark:text-amber-300", starter: 'section .data\n    msg db "Hello, World!", 10\n    len equ $ - msg\n\nsection .text\n    global _start\n_start:\n    mov eax, 4\n    mov ebx, 1\n    mov ecx, msg\n    mov edx, len\n    int 0x80\n    mov eax, 1\n    xor ebx, ebx\n    int 0x80' },
  { id: 47, name: "Basic", version: "FBC 1.07.1", group: "Systems", alias: "basic", badge: "bas", extensions: [".bas"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: 'Print "Hello, World!"' },
  { id: 56, name: "D", version: "DMD 2.089.1", group: "Systems", alias: "d", badge: "d", extensions: [".d"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: 'import std.stdio;\n\nvoid main() {\n    writeln("Hello, World!");\n}' },
  { id: 59, name: "Fortran", version: "GFortran 9.2.0", group: "Systems", alias: "fortran", badge: "f90", extensions: [".f90", ".f", ".for"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: 'program hello\n    print *, "Hello, World!"\nend program hello' },
  { id: 79, name: "Objective-C", version: "Clang 7.0.1", group: "Systems", alias: "objc", badge: "m", extensions: [".m"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: '#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, World!");\n    return 0;\n}' },
  { id: 83, name: "Swift", version: "5.2.3", group: "Systems", alias: "swift", badge: "swift", extensions: [".swift"], accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", starter: 'print("Hello, World!")' },
  { id: 55, name: "Common Lisp", version: "SBCL 2.0.0", group: "Functional", alias: "commonlisp", badge: "lisp", extensions: [".lisp", ".cl"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: '(write-line "Hello, World!")' },
  { id: 57, name: "Elixir", version: "1.9.4", group: "Functional", alias: "elixir", badge: "ex", extensions: [".ex", ".exs"], accent: "bg-purple-500/10 text-purple-600 dark:text-purple-300", starter: 'IO.puts("Hello, World!")' },
  { id: 58, name: "Erlang", version: "OTP 22.2", group: "Functional", alias: "erlang", badge: "erl", extensions: [".erl"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: 'main(_) ->\n    io:format("Hello, World!~n").' },
  { id: 61, name: "Haskell", version: "GHC 8.8.1", group: "Functional", alias: "haskell", badge: "hs", extensions: [".hs"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: 'main = putStrLn "Hello, World!"' },
  { id: 65, name: "OCaml", version: "4.09.0", group: "Functional", alias: "ocaml", badge: "ml", extensions: [".ml"], accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", starter: 'print_endline "Hello, World!";;' },
  { id: 69, name: "Prolog", version: "GNU Prolog 1.4.5", group: "Functional", alias: "prolog", badge: "pl", extensions: [".pl"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: ':- initialization(main).\nmain :- write("Hello, World!"), nl, halt.' },
  { id: 87, name: "F#", version: ".NET Core SDK 3.1.202", group: "Functional", alias: "fsharp", badge: "fs", extensions: [".fs"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: 'printfn "Hello, World!"' },
  { id: 66, name: "Octave", version: "5.1.0", group: "Data", alias: "octave", badge: "m", extensions: [".m"], accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", starter: 'disp("Hello, World!")' },
  { id: 77, name: "COBOL", version: "GnuCOBOL 2.2", group: "Data", alias: "cobol", badge: "cbl", extensions: [".cob", ".cbl"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY "Hello, World!".\nSTOP RUN.' },
  { id: 80, name: "R", version: "4.0.0", group: "Data", alias: "rscript", badge: "r", extensions: [".r", ".R"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: 'print("Hello, World!")' },
  { id: 82, name: "SQL", version: "SQLite 3.27.2", group: "Database", alias: "sqlite3", badge: "sql", extensions: [".sql"], accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", starter: hello.sql },
  { id: 1, name: "Bash", version: "4.4.0", group: "Scripting", alias: "bash", badge: "sh", extensions: [".sh"], accent: "bg-lime-500/10 text-lime-700 dark:text-lime-300", starter: 'echo "Hello, World!"' },
  { id: 4, name: "C", version: "GCC 7.2.0", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 10, name: "C++", version: "GCC 7.2.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 15, name: "Java", version: "OpenJDK 9", group: "JVM", alias: "java", badge: "java", extensions: [".java"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: hello.java },
  { id: 18, name: "JavaScript", version: "Node.js 9.2.0", group: "Scripting", alias: "javascript", badge: "js", extensions: [".js"], accent: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300", starter: hello.js },
  { id: 26, name: "Python 3", version: "3.6.0", group: "Scripting", alias: "python", badge: "py", extensions: [".py"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: hello.python },
  { id: 29, name: "Ruby", version: "2.4.0", group: "Scripting", alias: "ruby", badge: "rb", extensions: [".rb"], accent: "bg-rose-500/10 text-rose-600 dark:text-rose-300", starter: hello.ruby },
  { id: 31, name: "Rust", version: "1.20.0", group: "Systems", alias: "rust", badge: "rs", extensions: [".rs"], accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", starter: hello.rust },
  { id: 33, name: "Swift", version: "4.0.2", group: "Systems", alias: "swift", badge: "swift", extensions: [".swift"], accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", starter: 'print("Hello, World!")' },
  { id: 2, name: "Bash", version: "4.0.0", group: "Scripting", alias: "bash", badge: "sh", extensions: [".sh"], accent: "bg-lime-500/10 text-lime-700 dark:text-lime-300", starter: 'echo "Hello, World!"' },
  { id: 3, name: "Basic", version: "FBC 1.05.0", group: "Systems", alias: "basic", badge: "bas", extensions: [".bas"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: 'Print "Hello, World!"' },
  { id: 5, name: "C", version: "GCC 6.4.0", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 6, name: "C", version: "GCC 6.3.0", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 7, name: "C", version: "GCC 5.4.0", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 8, name: "C", version: "GCC 4.9.4", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 9, name: "C", version: "GCC 4.8.5", group: "Systems", alias: "c", badge: "c", extensions: [".c"], accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", starter: hello.c },
  { id: 11, name: "C++", version: "GCC 6.4.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 12, name: "C++", version: "GCC 6.3.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 13, name: "C++", version: "GCC 5.4.0", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 14, name: "C++", version: "GCC 4.9.4", group: "Systems", alias: "cpp", badge: "cpp", extensions: [".cpp"], accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", starter: hello.cpp },
  { id: 16, name: "Java", version: "OpenJDK 8", group: "JVM", alias: "java", badge: "java", extensions: [".java"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: hello.java },
  { id: 17, name: "Java", version: "OpenJDK 7", group: "JVM", alias: "java", badge: "java", extensions: [".java"], accent: "bg-red-500/10 text-red-600 dark:text-red-300", starter: hello.java },
  { id: 19, name: "PHP", version: "7.1.11", group: "Scripting", alias: "php", badge: "php", extensions: [".php"], accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", starter: hello.php },
  { id: 20, name: "Python 2", version: "2.7.9", group: "Scripting", alias: "python", badge: "py2", extensions: [".py"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: 'print "Hello, World!"' },
  { id: 21, name: "Python 3", version: "3.5.3", group: "Scripting", alias: "python", badge: "py", extensions: [".py"], accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", starter: hello.python },
];

const groups: LanguageGroup[] = ["Popular", "Scripting", "JVM", "Systems", "Functional", "Data", "Database"];

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
    const next = languages.find((item) => String(item.id) === raw || item.alias === raw.toLowerCase() || item.name.toLowerCase() === raw.toLowerCase());
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
      const response = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language: language.alias, version: language.version, code, stdin }),
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
            <select value={language.id} onChange={(event) => switchLanguage(Number(event.target.value))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 lg:min-w-80">
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {languages.filter((item) => item.group === group).map((item) => (
                    <option key={`${item.id}-${item.name}-${item.version}`} value={item.id}>
                      {item.name} - {item.version}
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
