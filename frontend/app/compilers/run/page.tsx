"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Copy,
  FileText,
  Loader2,
  Play,
  Terminal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

type Category =
  | "popular"
  | "scripting"
  | "jvm"
  | "systems"
  | "functional"
  | "data"
  | "database"
  | "lowlevel";

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

type BadgeStyle = { abbr: string; bg: string; text: string };

const LANGUAGES: Language[] = [
  { id: 71, language: "python", version: "3.8.1", name: "Python 3", category: "popular" },
  { id: 70, language: "python", version: "2.7.17", name: "Python 2", category: "scripting" },
  { id: 62, language: "java", version: "13.0.1", name: "Java", category: "jvm" },
  { id: 50, language: "c", version: "9.2.0", name: "C (GCC 9.2.0)", category: "popular" },
  { id: 49, language: "c", version: "8.3.0", name: "C (GCC 8.3.0)", category: "systems" },
  { id: 48, language: "c", version: "7.4.0", name: "C (GCC 7.4.0)", category: "systems" },
  { id: 75, language: "c", version: "7.0.1", name: "C (Clang 7.0.1)", category: "systems" },
  { id: 54, language: "cpp", version: "9.2.0", name: "C++ (GCC 9.2.0)", category: "popular" },
  { id: 53, language: "cpp", version: "8.3.0", name: "C++ (GCC 8.3.0)", category: "systems" },
  { id: 52, language: "cpp", version: "7.4.0", name: "C++ (GCC 7.4.0)", category: "systems" },
  { id: 76, language: "cpp", version: "7.0.1", name: "C++ (Clang 7.0.1)", category: "systems" },
  { id: 51, language: "csharp", version: "6.6.0", name: "C#", category: "popular" },
  { id: 73, language: "rust", version: "1.40.0", name: "Rust", category: "systems" },
  { id: 60, language: "go", version: "1.13.5", name: "Go", category: "popular" },
  { id: 78, language: "kotlin", version: "1.3.70", name: "Kotlin", category: "jvm" },
  { id: 68, language: "php", version: "7.4.1", name: "PHP", category: "scripting" },
  { id: 72, language: "ruby", version: "2.7.0", name: "Ruby", category: "scripting" },
  { id: 83, language: "swift", version: "5.2.3", name: "Swift", category: "systems" },
  { id: 63, language: "javascript", version: "12.14.0", name: "JavaScript (Node.js)", category: "popular" },
  { id: 74, language: "typescript", version: "3.7.4", name: "TypeScript", category: "popular" },
  { id: 46, language: "bash", version: "5.0.0", name: "Bash", category: "scripting" },
  { id: 85, language: "perl", version: "5.28.1", name: "Perl", category: "scripting" },
  { id: 64, language: "lua", version: "5.3.5", name: "Lua", category: "scripting" },
  { id: 80, language: "r", version: "4.0.0", name: "R", category: "data" },
  { id: 66, language: "octave", version: "5.1.0", name: "Octave", category: "data" },
  { id: 82, language: "sqlite", version: "3.27.2", name: "SQL (SQLite)", category: "database" },
  { id: 81, language: "scala", version: "2.13.2", name: "Scala", category: "jvm" },
  { id: 86, language: "clojure", version: "1.10.1", name: "Clojure", category: "jvm" },
  { id: 88, language: "groovy", version: "3.0.3", name: "Groovy", category: "jvm" },
  { id: 47, language: "basic", version: "1.7.0", name: "Basic (FBC)", category: "lowlevel" },
  { id: 84, language: "vb", version: "0.0.0", name: "Visual Basic", category: "lowlevel" },
  { id: 87, language: "fsharp", version: "0.0.0", name: "F#", category: "functional" },
  { id: 61, language: "haskell", version: "8.8.1", name: "Haskell", category: "functional" },
  { id: 57, language: "elixir", version: "1.9.4", name: "Elixir", category: "functional" },
  { id: 58, language: "erlang", version: "22.2", name: "Erlang", category: "functional" },
  { id: 65, language: "ocaml", version: "4.09.0", name: "OCaml", category: "functional" },
  { id: 55, language: "lisp", version: "2.0.0", name: "Common Lisp", category: "functional" },
  { id: 69, language: "prolog", version: "8.0.0", name: "Prolog", category: "functional" },
  { id: 56, language: "d", version: "8.3.0", name: "D", category: "systems" },
  { id: 59, language: "fortran", version: "9.2.0", name: "Fortran", category: "lowlevel" },
  { id: 67, language: "pascal", version: "3.0.4", name: "Pascal", category: "lowlevel" },
  { id: 79, language: "objc", version: "9.2.0", name: "Objective-C", category: "systems" },
  { id: 77, language: "cobol", version: "2.2", name: "COBOL", category: "lowlevel" },
  { id: 45, language: "assembly", version: "2.14.02", name: "Assembly", category: "lowlevel" },
];

const BADGES: Record<number, BadgeStyle> = {
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

function getLanguageBadge(langId: number): BadgeStyle {
  return BADGES[langId] || { abbr: "?", bg: "#6b7280", text: "#fff" };
}

const STARTERS: Record<number, string> = {
  71: "print('Hello, World!')\n",
  70: "print 'Hello, World!'\n",
  62: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}\n",
  50: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  49: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  48: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  75: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  54: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  53: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  52: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  76: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n",
  51: "using System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}\n",
  73: "fn main() {\n    println!(\"Hello, World!\");\n}\n",
  60: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}\n",
  78: "fun main() {\n    println(\"Hello, World!\")\n}\n",
  68: "<?php\necho \"Hello, World!\\n\";\n",
  72: "puts 'Hello, World!'\n",
  83: "print(\"Hello, World!\")\n",
  63: "console.log('Hello, World!');\n",
  74: "const message: string = 'Hello, World!';\nconsole.log(message);\n",
  46: "#!/bin/bash\necho \"Hello, World!\"\n",
  85: "use strict;\nuse warnings;\n\nprint \"Hello, World!\\n\";\n",
  64: "print('Hello, World!')\n",
  80: "cat('Hello, World!\\n')\n",
  66: "disp('Hello, World!')\n",
  82: "SELECT 'Hello, World!' AS greeting;\n",
  81: "object Main extends App {\n    println(\"Hello, World!\")\n}\n",
  86: "(println \"Hello, World!\")\n",
  88: "println 'Hello, World!'\n",
  47: "PRINT \"Hello, World!\"\nEND\n",
  84: "Module HelloWorld\n    Sub Main()\n        Console.WriteLine(\"Hello, World!\")\n    End Sub\nEnd Module\n",
  87: "printfn \"Hello, World!\"\n",
  61: "main :: IO ()\nmain = putStrLn \"Hello, World!\"\n",
  57: "IO.puts \"Hello, World!\"\n",
  58: "-module(main).\n-export([main/0]).\n\nmain() ->\n    io:format(\"Hello, World!~n\").\n",
  65: "print_endline \"Hello, World!\"\n",
  55: "(format t \"Hello, World!~%\")\n",
  69: ":- initialization(main).\nmain :- write('Hello, World!'), nl.\n",
  56: "import std.stdio;\n\nvoid main() {\n    writeln(\"Hello, World!\");\n}\n",
  59: "program hello\n    print *, 'Hello, World!'\nend program hello\n",
  67: "program Hello;\nbegin\n    writeln('Hello, World!');\nend.\n",
  79: "#import <Foundation/Foundation.h>\n\nint main(int argc, const char * argv[]) {\n    @autoreleasepool {\n        NSLog(@\"Hello, World!\");\n    }\n    return 0;\n}\n",
  77: "IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n    DISPLAY 'Hello, World!'.\n    STOP RUN.\n",
  45: "section .data\n    msg db 'Hello, World!', 0xA\n    len equ $ - msg\n\nsection .text\n    global _start\n_start:\n    mov rax, 1\n    mov rdi, 1\n    mov rsi, msg\n    mov rdx, len\n    syscall\n    mov rax, 60\n    xor rdi, rdi\n    syscall\n",
};

function getStarterCode(langId: number): string {
  return STARTERS[langId] || "// Start coding here...\n";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function readApiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

const CATEGORY_LABELS: { key: Category; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "scripting", label: "Scripting" },
  { key: "jvm", label: "JVM" },
  { key: "systems", label: "Systems" },
  { key: "functional", label: "Functional" },
  { key: "data", label: "Data" },
  { key: "database", label: "Database" },
  { key: "lowlevel", label: "Low-level" },
];

function getStatusKind(result: RunResult | null, isRunning: boolean): StatusKind {
  if (isRunning) return "running";
  if (!result) return "idle";
  const desc = (result.status_description || "").toLowerCase();
  if (desc.includes("time limit")) return "tle";
  if (desc.includes("compil")) return "compile";
  if (result.exit_code === 0 && !result.stderr && !result.compile_output) return "accepted";
  if (result.exit_code !== 0 || result.stderr || result.compile_output) return "runtime";
  return "accepted";
}

function statusLabel(kind: StatusKind, result: RunResult | null): string {
  switch (kind) {
    case "running":
      return "Running";
    case "accepted":
      return "Accepted";
    case "runtime":
      return "Runtime Error";
    case "compile":
      return "Compile Error";
    case "tle":
      return "Time Limit Exceeded";
    default:
      return result?.status_description || "Idle";
  }
}

function statusColors(kind: StatusKind): { bg: string; border: string; color: string; dot: string } {
  switch (kind) {
    case "accepted":
      return {
        bg: "rgba(16,185,129,0.12)",
        border: "rgba(16,185,129,0.3)",
        color: "#10b981",
        dot: "#10b981",
      };
    case "runtime":
      return {
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.3)",
        color: "#ef4444",
        dot: "#ef4444",
      };
    case "compile":
    case "tle":
      return {
        bg: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.3)",
        color: "#f59e0b",
        dot: "#f59e0b",
      };
    case "running":
      return {
        bg: "rgba(59,130,246,0.12)",
        border: "rgba(59,130,246,0.3)",
        color: "#3b82f6",
        dot: "#3b82f6",
      };
    default:
      return {
        bg: "rgba(128,128,128,0.12)",
        border: "rgba(128,128,128,0.3)",
        color: "#888",
        dot: "#888",
      };
  }
}

function fileExtension(language: string): string {
  const map: Record<string, string> = {
    python: ".py",
    java: ".java",
    c: ".c",
    cpp: ".cpp",
    csharp: ".cs",
    rust: ".rs",
    go: ".go",
    kotlin: ".kt",
    php: ".php",
    ruby: ".rb",
    swift: ".swift",
    javascript: ".js",
    typescript: ".ts",
    bash: ".sh",
    perl: ".pl",
    lua: ".lua",
    r: ".r",
    octave: ".m",
    sqlite: ".sql",
    scala: ".scala",
    clojure: ".clj",
    groovy: ".groovy",
    basic: ".bas",
    vb: ".vb",
    fsharp: ".fs",
    haskell: ".hs",
    elixir: ".ex",
    erlang: ".erl",
    ocaml: ".ml",
    lisp: ".lisp",
    prolog: ".pl",
    d: ".d",
    fortran: ".f90",
    pascal: ".pas",
    objc: ".m",
    cobol: ".cob",
    assembly: ".asm",
  };
  return map[language] || ".txt";
}

export default function RunPage() {
  const [selectedLangId, setSelectedLangId] = useState<number>(71);
  const selectedLang = useMemo(
    () => LANGUAGES.find((l) => l.id === selectedLangId) || LANGUAGES[0],
    [selectedLangId],
  );

  const [code, setCode] = useState<string>(getStarterCode(71));
  const [stdin, setStdin] = useState<string>("");
  const [stdinOpen, setStdinOpen] = useState<boolean>(false);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("stdout");
  const [leftPercent, setLeftPercent] = useState<number>(55);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [uploadFlash, setUploadFlash] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get("lang");
    if (langParam) {
      const parsed = Number(langParam);
      const lang = LANGUAGES.find((l) => l.id === parsed);
      if (lang) {
        setSelectedLangId(lang.id);
        setCode(getStarterCode(lang.id));
      }
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!uploadFlash) return;
    const t = setTimeout(() => setUploadFlash(""), 2000);
    return () => clearTimeout(t);
  }, [uploadFlash]);

  useEffect(() => {
    if (!copiedCode) return;
    const t = setTimeout(() => setCopiedCode(false), 1500);
    return () => clearTimeout(t);
  }, [copiedCode]);

  useEffect(() => {
    if (!copiedOutput) return;
    const t = setTimeout(() => setCopiedOutput(false), 1500);
    return () => clearTimeout(t);
  }, [copiedOutput]);

  const lineNumbers = useMemo(() => {
    const count = code.split("\n").length;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [code]);

  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    const id = Number(event.target.value);
    const lang = LANGUAGES.find((l) => l.id === id);
    if (!lang) return;
    setSelectedLangId(id);
    setCode(getStarterCode(id));
    setOutput(null);
    setActiveOutputTab("stdout");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/compilers/run?lang=${id}`);
    }
  }

  async function runCode() {
    setIsRunning(true);
    setOutput(null);
    setActiveOutputTab("stdout");
    const start = Date.now();
    setRunStartedAt(start);
    setElapsedMs(null);
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
      setElapsedMs(Date.now() - start);
      if (result.stderr || result.compile_output || (result.exit_code !== 0 && result.exit_code != null)) {
        setActiveOutputTab(result.stderr || result.compile_output ? "stderr" : "stdout");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run code.";
      setOutput({ stderr: message, exit_code: 1, status_description: "Runtime Error", status: "error" });
      setElapsedMs(Date.now() - start);
      setActiveOutputTab("stderr");
      setToast(message);
    } finally {
      setIsRunning(false);
    }
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = code.substring(0, start) + "  " + code.substring(end);
      setCode(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isRunning) {
        void runCode();
      }
    }
  }

  function handleEditorScroll() {
    if (editorRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }

  function handleCopyCode() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => setCopiedCode(true));
  }

  function handleClearEditor() {
    setCode("");
    editorRef.current?.focus();
  }

  function handleCopyOutput() {
    if (typeof navigator === "undefined" || !navigator.clipboard || !output) return;
    const text = (output.stdout || "") + (output.stderr ? `\n${output.stderr}` : "");
    void navigator.clipboard.writeText(text).then(() => setCopiedOutput(true));
  }

  function handleClearOutput() {
    setOutput(null);
    setElapsedMs(null);
    setRunStartedAt(null);
  }

  function triggerUpload() {
    fileInputRef.current?.click();
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setToast("File must be under 500KB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setCode(result);
        setUploadFlash(file.name);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function startResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
    const onMove = (move: MouseEvent) => {
      const percent = (move.clientX / window.innerWidth) * 100;
      const clamped = Math.min(70, Math.max(30, percent));
      setLeftPercent(clamped);
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const statusKind = getStatusKind(output, isRunning);
  const status = statusColors(statusKind);
  const badge = getLanguageBadge(selectedLang.id);

  const stderrLines = useMemo(() => {
    const text = output?.stderr || output?.compile_output || "";
    if (!text.trim()) return [] as string[];
    return text.split("\n");
  }, [output]);

  const errorCount = stderrLines.length;

  const accept = fileExtension(selectedLang.language);

  const memoryDisplay = useMemo(() => {
    if (!output || output.memory == null) return null;
    return formatBytes(output.memory * 1024);
  }, [output]);

  const timeDisplay = useMemo(() => {
    if (!output) return null;
    const ms = (output.cpu_time ?? output.wall_time ?? (elapsedMs ?? 0) / 1000) * 1000;
    if (!Number.isFinite(ms)) return null;
    return formatMs(ms);
  }, [output, elapsedMs]);

  const timeColor = useMemo(() => {
    if (!output) return undefined;
    const seconds = output.cpu_time ?? output.wall_time;
    if (seconds == null) return undefined;
    const ms = seconds * 1000;
    if (ms < 300) return "#10b981";
    if (ms < 1000) return "#f59e0b";
    return "#ef4444";
  }, [output]);

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
        .compilers-run-code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
        }
        .compilers-run-icon-btn {
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
        .compilers-run-icon-btn:hover {
          background: var(--muted);
          color: var(--foreground);
        }
        .compilers-run-icon-btn:active {
          background: rgba(127,127,127,0.18);
        }
        .compilers-run-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .compilers-run-select {
          width: 240px;
          height: 28px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          font-size: 12px;
          font-weight: 500;
          padding: 0 8px;
          cursor: pointer;
          outline: none;
        }
        .compilers-run-select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.15);
        }
        .compilers-run-runbtn {
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
        .compilers-run-runbtn:hover { background: #059669; }
        .compilers-run-runbtn:active { background: #047857; }
        .compilers-run-runbtn:disabled { opacity: 0.7; cursor: not-allowed; }
        .compilers-run-editor {
          width: 100%;
          height: 100%;
          background: var(--editor-bg);
          color: var(--editor-fg);
          border: none;
          outline: none;
          resize: none;
          padding: 10px 16px 80px 12px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.65;
          tab-size: 2;
          white-space: pre;
          overflow: auto;
        }
        .compilers-run-editor::placeholder { color: rgba(128,128,128,0.3); }
        .compilers-run-tab {
          height: 32px;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--muted-foreground);
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .compilers-run-tab.active {
          color: var(--foreground);
          border-bottom-color: #10b981;
        }
        .compilers-run-tab:hover { color: var(--foreground); }
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
        @keyframes compRunPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .compilers-run-dot-pulse { animation: compRunPulse 1.2s ease-in-out infinite; }
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
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <ChevronLeft size={12} />
            <span>Compilers</span>
          </Link>
          <span style={{ fontSize: 11, color: "rgba(128,128,128,0.4)", margin: "0 2px" }}>/</span>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: badge.bg,
              color: badge.text,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {badge.abbr}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
            {selectedLang.name}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={selectedLangId}
            onChange={handleLanguageChange}
            className="compilers-run-select"
          >
            {CATEGORY_LABELS.map((cat) => {
              const langsInCat = LANGUAGES.filter((l) => l.category === cat.key);
              if (langsInCat.length === 0) return null;
              return (
                <optgroup key={cat.key} label={cat.label}>
                  {langsInCat.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <div
            style={{
              width: 1,
              height: 20,
              background: "var(--border)",
              margin: "0 4px",
            }}
          />

          <button onClick={runCode} disabled={isRunning} className="compilers-run-runbtn">
            {isRunning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <Play size={12} />
                <span>Run</span>
              </>
            )}
          </button>
          <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 6 }}>Ctrl+Enter</span>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* LEFT PANEL */}
        <div
          style={{
            width: `${leftPercent}%`,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Editor toolbar */}
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
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: badge.bg,
                  color: badge.text,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {badge.abbr}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                {selectedLang.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", marginLeft: 4 }}>
                {selectedLang.version}
              </span>
              {uploadFlash && (
                <span style={{ fontSize: 11, color: "#10b981", marginLeft: 8 }}>
                  Loaded {uploadFlash}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept={`.txt,${accept}`}
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <button
                className="compilers-run-icon-btn"
                title="Upload file"
                onClick={triggerUpload}
              >
                <Upload size={14} />
              </button>
              <button
                className="compilers-run-icon-btn"
                title="Copy code"
                onClick={handleCopyCode}
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="compilers-run-icon-btn"
                title="Clear editor"
                onClick={handleClearEditor}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Line numbers + editor */}
          <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
            <div
              ref={lineNumbersRef}
              style={{
                width: 36,
                flexShrink: 0,
                background: "var(--editor-bg)",
                borderRight: "1px solid rgba(128,128,128,0.1)",
                overflow: "hidden",
                paddingTop: 10,
                textAlign: "right",
                paddingRight: 8,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: 12,
                color: "rgba(128,128,128,0.5)",
                lineHeight: "1.65",
                userSelect: "none",
              }}
            >
              {lineNumbers.map((n) => (
                <div key={n} style={{ height: "1.65em" }}>
                  {n}
                </div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              onScroll={handleEditorScroll}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="// Start coding here..."
              className="compilers-run-editor"
            />
          </div>

          {/* Stdin panel */}
          <div style={{ flexShrink: 0 }}>
            <div
              onClick={() => setStdinOpen((v) => !v)}
              style={{
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                background: "rgba(127,127,127,0.08)",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(127,127,127,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(127,127,127,0.08)")}
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
                  stdin
                </span>
              </div>
              {stdinOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </div>
            {stdinOpen && (
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Program input (stdin)..."
                style={{
                  width: "100%",
                  height: 100,
                  background: "var(--output-bg)",
                  color: "var(--foreground)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  padding: "8px 12px",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  borderTop: "1px solid var(--border)",
                }}
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* RESIZE HANDLE */}
        <div
          onMouseDown={startResize}
          style={{
            width: 4,
            flexShrink: 0,
            cursor: "col-resize",
            background: isDragging ? "#10b981" : "var(--border)",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => {
            if (!isDragging) e.currentTarget.style.background = "#10b981";
          }}
          onMouseLeave={(e) => {
            if (!isDragging) e.currentTarget.style.background = "var(--border)";
          }}
        />

        {/* RIGHT PANEL */}
        <div
          style={{
            width: `${100 - leftPercent}%`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Output toolbar */}
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
              Output
            </span>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
              {(output || isRunning) && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: status.bg,
                    border: `1px solid ${status.border}`,
                    color: status.color,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: status.dot,
                    }}
                    className={statusKind === "running" ? "compilers-run-dot-pulse" : ""}
                  />
                  {statusLabel(statusKind, output)}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                className="compilers-run-icon-btn"
                title="Copy output"
                disabled={!output}
                onClick={handleCopyOutput}
              >
                {copiedOutput ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="compilers-run-icon-btn"
                title="Clear output"
                disabled={!output}
                onClick={handleClearOutput}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Output tabs */}
          <div
            style={{
              height: 32,
              flexShrink: 0,
              display: "flex",
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <button
              className={`compilers-run-tab ${activeOutputTab === "stdout" ? "active" : ""}`}
              onClick={() => setActiveOutputTab("stdout")}
            >
              stdout
            </button>
            <button
              className={`compilers-run-tab ${activeOutputTab === "stderr" ? "active" : ""}`}
              onClick={() => setActiveOutputTab("stderr")}
            >
              stderr
              {errorCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 5px",
                    marginLeft: 4,
                  }}
                >
                  {errorCount}
                </span>
              )}
            </button>
            <button
              className={`compilers-run-tab ${activeOutputTab === "info" ? "active" : ""}`}
              onClick={() => setActiveOutputTab("info")}
            >
              info
            </button>
          </div>

          {/* Output content */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              background: "var(--output-bg)",
              minHeight: 0,
            }}
          >
            {activeOutputTab === "stdout" && (
              <div
                style={{
                  minHeight: "100%",
                  padding: "14px 16px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {!output && !isRunning ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      minHeight: 240,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "rgba(127,127,127,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Play size={20} color="rgba(128,128,128,0.6)" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>
                      Run your code
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        marginTop: 4,
                      }}
                    >
                      Press Ctrl+Enter or click Run to execute
                    </div>
                  </div>
                ) : isRunning ? (
                  <div style={{ color: "var(--muted-foreground)" }}>Running...</div>
                ) : output?.stdout ? (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      color: output.exit_code === 0 ? "var(--success-color, #1a7a4a)" : undefined,
                    }}
                    className="compilers-run-stdout-pre"
                  >
                    <span
                      style={{
                        color:
                          output.exit_code === 0
                            ? "var(--editor-fg)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {output.stdout}
                    </span>
                  </pre>
                ) : output && output.exit_code != null ? (
                  <div style={{ color: "var(--muted-foreground)" }}>
                    Process exited with code {output.exit_code}
                  </div>
                ) : (
                  <div style={{ color: "var(--muted-foreground)" }}>(no output)</div>
                )}
              </div>
            )}

            {activeOutputTab === "stderr" && (
              <div
                style={{
                  minHeight: "100%",
                  padding: "14px 16px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {stderrLines.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      minHeight: 240,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <AlertCircle size={20} />
                    <div style={{ fontSize: 12, marginTop: 8 }}>No errors</div>
                  </div>
                ) : (
                  stderrLines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        color: "#f48771",
                      }}
                    >
                      <AlertCircle
                        size={12}
                        style={{ flexShrink: 0, marginTop: 3, color: "#f48771" }}
                      />
                      <span style={{ whiteSpace: "pre-wrap", flex: 1 }}>{line}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeOutputTab === "info" && (
              <div
                style={{
                  padding: "14px 16px",
                  minHeight: "100%",
                }}
              >
                {!output ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      minHeight: 240,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <FileText size={20} />
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      Run code to see details
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <StatCard label="Execution Time" value={timeDisplay || "—"} color={timeColor} />
                    <StatCard label="Memory" value={memoryDisplay || "—"} />
                    <StatCard
                      label="Exit Code"
                      value={
                        output.exit_code === 0
                          ? "0 — Success"
                          : output.exit_code != null
                          ? `${output.exit_code} — Error`
                          : "—"
                      }
                      color={output.exit_code === 0 ? "#10b981" : "#ef4444"}
                    />
                    <StatCard
                      label="Language"
                      value={`${selectedLang.name} ${selectedLang.version}`}
                    />
                    <StatCard
                      label="Status"
                      value={output.status_description || statusLabel(statusKind, output)}
                    />
                    {output.signal && (
                      <StatCard label="Signal" value={output.signal} color="#f59e0b" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(127,127,127,0.08)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--muted-foreground)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: color || "var(--foreground)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
