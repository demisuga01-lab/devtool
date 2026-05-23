"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  FileText,
  GripVertical,
  Play,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";

const LANGUAGES = [
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

const BADGE_MAP: Record<number, { abbr: string; bg: string; color: string }> = {
  71: { abbr: "PY", bg: "#3572A5", color: "#fff" },
  70: { abbr: "PY2", bg: "#3572A5", color: "#fff" },
  62: { abbr: "JV", bg: "#b07219", color: "#fff" },
  50: { abbr: "C", bg: "#555555", color: "#fff" },
  49: { abbr: "C", bg: "#555555", color: "#fff" },
  48: { abbr: "C", bg: "#555555", color: "#fff" },
  75: { abbr: "C", bg: "#555555", color: "#fff" },
  54: { abbr: "C++", bg: "#f34b7d", color: "#fff" },
  53: { abbr: "C++", bg: "#f34b7d", color: "#fff" },
  52: { abbr: "C++", bg: "#f34b7d", color: "#fff" },
  76: { abbr: "C++", bg: "#f34b7d", color: "#fff" },
  51: { abbr: "C#", bg: "#178600", color: "#fff" },
  73: { abbr: "RS", bg: "#dea584", color: "#000" },
  60: { abbr: "GO", bg: "#00ADD8", color: "#fff" },
  78: { abbr: "KT", bg: "#A97BFF", color: "#fff" },
  68: { abbr: "PHP", bg: "#4F5D95", color: "#fff" },
  72: { abbr: "RB", bg: "#701516", color: "#fff" },
  83: { abbr: "SW", bg: "#F05138", color: "#fff" },
  63: { abbr: "JS", bg: "#f1e05a", color: "#000" },
  74: { abbr: "TS", bg: "#3178c6", color: "#fff" },
  46: { abbr: "SH", bg: "#89e051", color: "#000" },
  85: { abbr: "PL", bg: "#0298c3", color: "#fff" },
  64: { abbr: "LUA", bg: "#000080", color: "#fff" },
  80: { abbr: "R", bg: "#198CE7", color: "#fff" },
  66: { abbr: "M", bg: "#0790C0", color: "#fff" },
  82: { abbr: "SQL", bg: "#e38c00", color: "#fff" },
  81: { abbr: "SC", bg: "#c22d40", color: "#fff" },
  86: { abbr: "CLJ", bg: "#db5855", color: "#fff" },
  88: { abbr: "GRV", bg: "#4298b8", color: "#fff" },
  47: { abbr: "BAS", bg: "#6e4a7e", color: "#fff" },
  84: { abbr: "VB", bg: "#945db7", color: "#fff" },
  87: { abbr: "FS", bg: "#b845fc", color: "#fff" },
  61: { abbr: "HS", bg: "#5e5086", color: "#fff" },
  57: { abbr: "EX", bg: "#6e4a7e", color: "#fff" },
  58: { abbr: "ERL", bg: "#B83998", color: "#fff" },
  65: { abbr: "ML", bg: "#3fb68b", color: "#fff" },
  55: { abbr: "LISP", bg: "#3fb68b", color: "#fff" },
  69: { abbr: "PRO", bg: "#74283c", color: "#fff" },
  56: { abbr: "D", bg: "#ba595e", color: "#fff" },
  59: { abbr: "F", bg: "#4d41b1", color: "#fff" },
  67: { abbr: "PAS", bg: "#E3F171", color: "#000" },
  79: { abbr: "OC", bg: "#438eff", color: "#fff" },
  77: { abbr: "COB", bg: "#005A9C", color: "#fff" },
  45: { abbr: "ASM", bg: "#6e4a7e", color: "#fff" },
};

const STARTER_CODE: Record<number, string> = {
  71: "# Python 3\nprint('Hello, World!')\n\n# Try input:\n# name = input('Enter name: ')\n# print(f'Hello, {name}!')",
  70: "# Python 2\nprint 'Hello, World!'",
  62: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}",
  50: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
  49: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
  48: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
  75: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
  54: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  53: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  52: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  76: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  51: "using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}",
  73: "fn main() {\n    println!(\"Hello, World!\");\n}",
  60: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}",
  78: "fun main() {\n    println(\"Hello, World!\")\n}",
  68: "<?php\necho \"Hello, World!\\n\";\n?>",
  72: "puts 'Hello, World!'",
  83: "print(\"Hello, World!\")",
  63: "console.log('Hello, World!');",
  74: "const message: string = 'Hello, World!';\nconsole.log(message);",
  46: "#!/bin/bash\necho \"Hello, World!\"",
  85: "print \"Hello, World!\\n\";",
  64: "print(\"Hello, World!\")",
  80: "cat(\"Hello, World!\\n\")",
  66: "disp('Hello, World!')",
  82: "SELECT 'Hello, World!';",
  81: "object Main extends App {\n  println(\"Hello, World!\")\n}",
  86: "(println \"Hello, World!\")",
  88: "println 'Hello, World!'",
  47: "PRINT \"Hello, World!\"",
  84: "Module Program\n    Sub Main()\n        Console.WriteLine(\"Hello, World!\")\n    End Sub\nEnd Module",
  87: "[<EntryPoint>]\nlet main argv =\n    printfn \"Hello, World!\"\n    0",
  61: "main :: IO ()\nmain = putStrLn \"Hello, World!\"",
  57: "IO.puts \"Hello, World!\"",
  58: "main() ->\n    io:format(\"Hello, World!~n\").",
  65: "let () = print_endline \"Hello, World!\"",
  55: "(write-line \"Hello, World!\")",
  69: ":- initialization(main).\nmain :- write('Hello, World!'), nl.",
  56: "import std.stdio;\nvoid main() {\n    writeln(\"Hello, World!\");\n}",
  59: "program hello\n  print *, 'Hello, World!'\nend program hello",
  67: "program Hello;\nbegin\n  writeln('Hello, World!');\nend.",
  79: "#import <Foundation/Foundation.h>\nint main() {\n    NSLog(@\"Hello, World!\");\n    return 0;\n}",
  77: "IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n    DISPLAY 'Hello, World!'.\n    STOP RUN.",
  45: "section .data\n    msg db 'Hello, World!', 0xa\n    len equ $ - msg\nsection .text\n    global _start\n_start:\n    mov eax, 4\n    mov ebx, 1\n    mov ecx, msg\n    mov edx, len\n    int 0x80\n    mov eax, 1\n    xor ebx, ebx\n    int 0x80",
};

type OutputTab = "stdout" | "stderr" | "info";
type RunInfo = {
  cpuTime: number;
  memory: number;
  exitCode: number;
  status: string;
  statusDesc: string;
};
type StatusKind = "accepted" | "runtime" | "compile" | "tle";

const CATEGORIES = ["popular", "scripting", "jvm", "systems", "functional", "data", "database", "lowlevel"];
const OUTPUT_TABS: OutputTab[] = ["stdout", "stderr", "info"];
const iconButtonClass =
  "flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-0 bg-transparent cursor-pointer";

function editorPlaceholder(language: { language: string; name: string }) {
  if (language.language === "python") return "# Write Python code here...";
  if (language.language === "java") return "// Write Java code here...";
  if (language.language === "c" || language.language === "cpp") return "// Write C code here...";
  return "// Start coding here...";
}

export default function RunPage() {
  const [selectedLangId, setSelectedLangId] = useState(71);
  const [code, setCode] = useState(() => STARTER_CODE[71] || "// Start coding here...");
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<"stdout" | "stderr" | "info">("stdout");
  const [leftWidth, setLeftWidth] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [outputCopyDone, setOutputCopyDone] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );
  const [isMac, setIsMac] = useState(() =>
    typeof navigator !== "undefined" ? navigator.platform.includes("Mac") : false,
  );

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(55);

  const selectedLang = LANGUAGES.find((l) => l.id === selectedLangId) || LANGUAGES[0];
  const badge = BADGE_MAP[selectedLangId];
  const editorBackground = isDark ? "#1e1e1e" : "#ffffff";
  const editorText = isDark ? "#d4d4d4" : "#1e1e1e";
  const outputBackground = isDark ? "#161616" : "#f5f5f5";
  const outputText = isDark ? "#d4d4d4" : "#1e1e1e";
  const shortcutLabel = isMac ? "⌘↵" : "Ctrl+↵";
  const placeholderText = editorPlaceholder(selectedLang);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langId = Number(params.get("lang"));
    if (LANGUAGES.some((lang) => lang.id === langId)) {
      setSelectedLangId(langId);
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac"));
  }, []);

  useEffect(() => {
    const starter = STARTER_CODE[selectedLangId] || "// Start coding here...";
    setCode(starter);
    setLineCount(starter.split("\n").length);
    setStdout("");
    setStderr("");
    setRunInfo(null);
  }, [selectedLangId]);

  useEffect(() => {
    setLineCount(code.split("\n").length);
  }, [code]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = leftWidth;
    },
    [leftWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const delta = e.clientX - dragStartX.current;
      const deltaPercent = (delta / containerWidth) * 100;
      const newWidth = Math.min(70, Math.max(30, dragStartWidth.current + deltaPercent));
      setLeftWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStdout("");
    setStderr("");
    setRunInfo(null);
    setActiveOutputTab("stdout");

    const lang = LANGUAGES.find((l) => l.id === selectedLangId);
    if (!lang) {
      setIsRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/tools/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.language,
          version: lang.version,
          code: code,
          stdin: stdin || "",
        }),
      });

      const data = await res.json();

      setStdout(data.stdout || "");
      setStderr(data.stderr || data.compile_output || data.message || "");
      setRunInfo({
        cpuTime: data.cpu_time || data.wall_time || 0,
        memory: Math.round((data.memory || 0) / 1000),
        exitCode: data.exit_code ?? 1,
        status: data.status || "error",
        statusDesc: data.status_description || "",
      });

      if (data.stderr || data.compile_output) {
        setActiveOutputTab("stderr");
      }
    } catch (err) {
      setStderr("Failed to connect to execution service.");
      setRunInfo({
        cpuTime: 0,
        memory: 0,
        exitCode: 1,
        status: "error",
        statusDesc: "Network Error",
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selectedLangId, code, stdin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleRun]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setLineCount(e.target.value.split("\n").length);
  }, []);

  const handleUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCode(content);
      setLineCount(content.split("\n").length);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(stdout);
    setOutputCopyDone(true);
    setTimeout(() => setOutputCopyDone(false), 1500);
  };

  const handleClearOutput = () => {
    setStdout("");
    setStderr("");
    setRunInfo(null);
    setActiveOutputTab("stdout");
  };

  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
    }
  }, []);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newCode = code.substring(0, start) + "  " + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = start + 2;
            editorRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
    },
    [code],
  );

  const renderBadge = () => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 4,
        backgroundColor: badge?.bg || "#555",
        color: badge?.color || "#fff",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "monospace",
        flexShrink: 0,
      }}
    >
      {badge?.abbr || "??"}
    </span>
  );

  const renderEmptyState = () => {
    if (activeOutputTab === "stderr") {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <AlertCircle size={24} className="text-muted-foreground/30" />
          <span className="mt-3 text-[14px] text-muted-foreground">No errors</span>
        </div>
      );
    }

    if (activeOutputTab === "info") {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <FileText size={24} className="text-muted-foreground/30" />
          <span className="mt-3 text-[14px] text-muted-foreground">Run code to see details</span>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Play size={24} className="text-muted-foreground/30" />
        <span className="mt-3 text-[14px] text-muted-foreground">Run your code to see output</span>
        <span className="mt-1 text-[12px] text-muted-foreground/60">Press {shortcutLabel} or click Run</span>
      </div>
    );
  };

  const getStatusKind = (): StatusKind => {
    if (!runInfo) return "runtime";
    if (runInfo.exitCode === 0) return "accepted";
    if (runInfo.statusDesc.includes("Time")) return "tle";
    if (stdout === "" && stderr !== "") return "compile";
    return "runtime";
  };

  const renderStatusBadge = () => {
    if (isRunning) {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: "#10b981",
            }}
          />
          Running
        </div>
      );
    }

    if (!runInfo) return <div />;

    const statusKind = getStatusKind();
    const styles: Record<StatusKind, { bg: string; border: string; text: string; label: string }> = {
      accepted: {
        bg: "rgba(16,185,129,0.12)",
        border: "1px solid rgba(16,185,129,0.3)",
        text: "#10b981",
        label: "Accepted",
      },
      runtime: {
        bg: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.3)",
        text: "#ef4444",
        label: "Runtime Error",
      },
      compile: {
        bg: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.3)",
        text: "#f59e0b",
        label: "Compile Error",
      },
      tle: {
        bg: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.3)",
        text: "#f59e0b",
        label: "Time Limit",
      },
    };
    const style = styles[statusKind];

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: style.bg,
          border: style.border,
          color: style.text,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: style.text,
          }}
        />
        {style.label}
      </div>
    );
  };

  const renderStatCard = (label: string, value: string, color = "rgb(var(--foreground))") => (
    <div
      style={{
        backgroundColor: "rgba(128,128,128,0.08)",
        border: "1px solid rgb(var(--border))",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "rgb(var(--muted-foreground))",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );

  const renderOutputContent = () => {
    if (activeOutputTab === "stdout") {
      if (!runInfo) return renderEmptyState();
      return (
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: outputText,
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          {stdout || (runInfo.exitCode !== 0 ? `Process exited with code ${runInfo.exitCode}` : "No output")}
        </pre>
      );
    }

    if (activeOutputTab === "stderr") {
      if (!stderr) return renderEmptyState();
      return (
        <>
          {stderr
            .split("\n")
            .filter(Boolean)
            .map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "1px 0" }}>
                <AlertCircle
                  size={12}
                  style={{
                    color: "#f48771",
                    flexShrink: 0,
                    marginTop: 3,
                  }}
                />
                <span
                  style={{
                    color: "#f48771",
                    fontFamily: "monospace",
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
        </>
      );
    }

    if (!runInfo) return renderEmptyState();
    const timeColor = runInfo.cpuTime < 300 ? "#10b981" : runInfo.cpuTime <= 1000 ? "#f59e0b" : "#ef4444";

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {renderStatCard("Execution Time", `${runInfo.cpuTime}ms`, timeColor)}
        {renderStatCard("Memory", `${runInfo.memory}KB`)}
        {renderStatCard(
          "Exit Code",
          runInfo.exitCode === 0 ? "0 — Success" : `${runInfo.exitCode} — Error`,
          runInfo.exitCode === 0 ? "#10b981" : "#ef4444",
        )}
        {renderStatCard("Language", `${selectedLang.name}`)}
        {renderStatCard("Status", runInfo.statusDesc || runInfo.status)}
        {renderStatCard("Version", selectedLang.version)}
      </div>
    );
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      className="fixed inset-0 z-[1000] bg-background text-foreground"
    >
      <div
        className="flex items-center justify-between border-b border-border bg-card bg-white px-3 dark:bg-zinc-900"
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
          {renderBadge()}
          <span className="truncate text-[13px] font-medium">{selectedLang.name}</span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <select
            value={selectedLangId}
            onChange={(e) => setSelectedLangId(Number(e.target.value))}
            className="h-[28px] w-[220px] cursor-pointer rounded-md border border-border bg-background px-2 text-[12px] font-medium text-foreground focus:border-emerald-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => {
              const langs = LANGUAGES.filter((l) => l.category === cat);
              if (!langs.length) return null;
              return (
                <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                  {langs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <div className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="flex h-[28px] cursor-pointer items-center gap-1.5 rounded-md border-0 bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700"
            style={{
              opacity: isRunning ? 0.7 : 1,
              cursor: isRunning ? "not-allowed" : "pointer",
            }}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <Play size={12} />
                Run
              </>
            )}
          </button>

          <span className="text-[11px] text-muted-foreground/40">{shortcutLabel}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            width: `${leftWidth}%`,
            minWidth: "30%",
            maxWidth: "70%",
          }}
          className="flex flex-col overflow-hidden border-r border-border"
        >
          <div
            className="flex items-center justify-between border-b border-border bg-card bg-white px-2.5 dark:bg-zinc-900"
            style={{ height: 38, minHeight: 38 }}
          >
            <div className="flex min-w-0 items-center gap-2">
              {renderBadge()}
              <span className="truncate text-[12px] font-semibold">{selectedLang.name}</span>
              <span className="text-[12px] text-muted-foreground">{selectedLang.version}</span>
            </div>

            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept=".txt,.py,.js,.ts,.java,.c,.cpp,.cs,.rs,.go,.rb,.php,.swift,.sh,.lua,.r,.sql,.scala,.hs,.ex,.erl,.ml,.lisp,.pl,.d,.f90,.pas,.m,.cob,.asm,.kt,.groovy,.bas,.vb,.fs,.clj,.pro"
              />
              <button type="button" className={iconButtonClass} title="Upload file" onClick={handleUpload}>
                <Upload size={14} />
              </button>
              <button type="button" className={iconButtonClass} title="Copy code" onClick={handleCopy}>
                {copyDone ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                className={iconButtonClass}
                title="Clear editor"
                onClick={() => {
                  setCode("");
                  setLineCount(1);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            <div
              ref={lineNumRef}
              style={{
                width: 36,
                flexShrink: 0,
                overflowY: "hidden",
                paddingTop: 10,
                paddingRight: 8,
                textAlign: "right",
                fontSize: 12,
                lineHeight: "1.65",
                color: "rgba(128,128,128,0.5)",
                fontFamily: "monospace",
                backgroundColor: editorBackground,
                borderRight: "1px solid rgba(128,128,128,0.1)",
                userSelect: "none",
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1} style={{ height: "1.65em" }}>
                  {i + 1}
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex" }}>
              {code === "" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    padding: "10px 16px 80px 12px",
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "rgba(128,128,128,0.3)",
                    whiteSpace: "pre",
                  }}
                >
                  {placeholderText}
                </div>
              )}
              <textarea
                ref={editorRef}
                value={code}
                onChange={handleCodeChange}
                onScroll={handleEditorScroll}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: "10px 16px 80px 12px",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                  fontSize: 13,
                  lineHeight: 1.65,
                  backgroundColor: editorBackground,
                  color: editorText,
                  width: "100%",
                  height: "100%",
                  tabSize: 2,
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  overflowX: "auto",
                  overflowY: "auto",
                }}
              />
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <div
              onClick={() => setStdinOpen(!stdinOpen)}
              className="flex cursor-pointer items-center justify-between border-t border-border px-2.5 transition-colors hover:bg-muted/30"
              style={{ height: 32, minHeight: 32 }}
            >
              <div className="flex items-center gap-1.5">
                <Terminal size={12} className="text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  stdin
                </span>
              </div>
              {stdinOpen ? (
                <ChevronUp size={12} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={12} className="text-muted-foreground" />
              )}
            </div>

            {stdinOpen && (
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Program input (stdin)..."
                style={{
                  height: 100,
                  minHeight: 100,
                  maxHeight: 100,
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  borderTop: "1px solid rgb(var(--border))",
                  outline: "none",
                  resize: "none",
                  fontFamily: "monospace",
                  fontSize: 13,
                  backgroundColor: outputBackground,
                  color: outputText,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            width: 4,
            flexShrink: 0,
            cursor: "col-resize",
            backgroundColor: isDragging ? "#10b981" : "rgb(var(--border))",
            transition: isDragging ? "none" : "background-color 150ms",
          }}
          className="group relative hover:bg-emerald-500"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical size={12} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }} className="flex flex-col overflow-hidden">
          <div
            className="flex items-center justify-between border-b border-border bg-card bg-white px-2.5 dark:bg-zinc-900"
            style={{ height: 38, minHeight: 38 }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Output
            </span>
            {renderStatusBadge()}
            <div className="flex items-center gap-0.5">
              <button type="button" className={iconButtonClass} title="Copy output" onClick={handleCopyOutput}>
                {outputCopyDone ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button type="button" className={iconButtonClass} title="Clear output" onClick={handleClearOutput}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div
            className="flex flex-shrink-0 border-b border-border bg-card bg-white dark:bg-zinc-900"
            style={{ height: 32, minHeight: 32 }}
          >
            {OUTPUT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveOutputTab(tab)}
                className={`h-full cursor-pointer border-0 border-b-2 bg-transparent px-3.5 text-[12px] font-medium transition-colors ${
                  activeOutputTab === tab
                    ? "border-emerald-500 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {tab === "stderr" && stderr && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      backgroundColor: "#ef4444",
                      color: "white",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "0 4px",
                      marginLeft: 4,
                    }}
                  >
                    {stderr.split("\n").filter(Boolean).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: outputBackground,
              color: outputText,
              padding: "14px 16px",
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            {renderOutputContent()}
          </div>
        </div>
      </div>

    </div>
  );
}
