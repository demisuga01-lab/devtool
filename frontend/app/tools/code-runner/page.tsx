"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Runtime = {
  language: string;
  version: string;
  aliases?: string[];
  runtime?: string;
};

type RuntimeOption = Runtime & {
  key: string;
  displayName: string;
};

type RunResult = {
  language: string;
  version: string;
  stdout: string;
  stderr: string;
  output: string;
  exit_code: number | null;
  signal: string | null;
  cpu_time: number | null;
  wall_time: number | null;
  memory: number | null;
  compile_output: string;
  compile_stderr: string;
  status: "ok" | "error";
};

const editorClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";

const cardClass = "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

function runtimeSignature(runtime: Runtime) {
  return `${runtime.runtime ?? ""} ${(runtime.aliases ?? []).join(" ")}`.toLowerCase();
}

function runtimeKey(runtime: Runtime) {
  const language = runtime.language.toLowerCase();
  const signature = runtimeSignature(runtime);
  if ((language === "javascript" || language === "typescript") && signature.includes("deno")) {
    return `${language}:deno`;
  }
  if ((language === "javascript" || language === "typescript") && signature.includes("node")) {
    return `${language}:node`;
  }
  return language;
}

function displayName(runtime: Runtime) {
  const language = runtime.language.toLowerCase();
  const signature = runtimeSignature(runtime);
  if (language === "c++" || language === "cpp") return "C++";
  if (language === "c") return "C";
  if (language === "csharp") return "C#";
  if (language === "javascript" && signature.includes("deno")) return "JavaScript (Deno)";
  if (language === "javascript") return "JavaScript (Node)";
  if (language === "typescript" && signature.includes("deno")) return "TypeScript (Deno)";
  if (language === "typescript") return "TypeScript";
  return language.charAt(0).toUpperCase() + language.slice(1);
}

function compareVersions(a: string, b: string) {
  const left = a.match(/\d+/g)?.map(Number) ?? [0];
  const right = b.match(/\d+/g)?.map(Number) ?? [0];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

function starterCode(runtime: Runtime | null) {
  const language = runtime?.language.toLowerCase() ?? "";
  const key = runtime ? runtimeKey(runtime) : "";
  if (language === "python") return 'print("Hello, World!")';
  if (key === "javascript:node" || language === "javascript") return 'console.log("Hello, World!");';
  if (language === "typescript") return 'const msg: string = "Hello, World!";\nconsole.log(msg);';
  if (language === "java") return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
  if (language === "c") return '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}';
  if (language === "c++" || language === "cpp") return '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}';
  if (language === "rust") return 'fn main() {\n    println!("Hello, World!");\n}';
  if (language === "go") return 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}';
  if (language === "kotlin") return 'fun main() {\n    println("Hello, World!")\n}';
  if (language === "php") return '<?php\necho "Hello, World!\\n";';
  if (language === "ruby") return 'puts "Hello, World!"';
  if (language === "swift") return 'print("Hello, World!")';
  if (language === "bash") return 'echo "Hello, World!"';
  if (language === "lua") return 'print("Hello, World!")';
  if (language === "dart") return "void main() {\n  print('Hello, World!');\n}";
  if (language === "scala") return 'object Main extends App {\n  println("Hello, World!")\n}';
  if (language === "perl") return 'print "Hello, World!\\n";';
  if (language === "csharp") return 'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}';
  return "";
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function CodeRunnerPage() {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [loadingRuntimes, setLoadingRuntimes] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "stderr">("output");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  const runtimeOptions = useMemo(() => {
    const latest = new Map<string, RuntimeOption>();
    for (const runtime of runtimes) {
      const key = runtimeKey(runtime);
      const current = latest.get(key);
      if (!current || compareVersions(runtime.version, current.version) > 0) {
        latest.set(key, { ...runtime, key, displayName: displayName(runtime) });
      }
    }
    return Array.from(latest.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [runtimes]);

  const selectedRuntime = runtimeOptions.find((runtime) => runtime.key === selectedKey) ?? null;
  const lineCount = Math.max(1, code.split("\n").length);
  const stderrText = [result?.compile_output, result?.compile_stderr, result?.stderr].filter(Boolean).join("\n");
  const outputText = result?.stdout || result?.output || "";

  useEffect(() => {
    async function loadRuntimes() {
      setLoadingRuntimes(true);
      try {
        const res = await fetch(`${API_BASE}/tools/runtimes`, { headers: { Accept: "application/json" } });
        const data: unknown = await res.json().catch(() => []);
        if (!res.ok || !Array.isArray(data)) {
          setRuntimes([]);
          return;
        }
        setRuntimes(data as Runtime[]);
      } finally {
        setLoadingRuntimes(false);
      }
    }

    loadRuntimes();
  }, []);

  useEffect(() => {
    if (!selectedKey && runtimeOptions.length > 0) {
      setSelectedKey(runtimeOptions[0].key);
    }
  }, [runtimeOptions, selectedKey]);

  useEffect(() => {
    setCode(starterCode(selectedRuntime));
    setResult(null);
    setError("");
  }, [selectedRuntime]);

  const runCode = useCallback(async () => {
    if (!selectedRuntime || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setActiveTab("output");

    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: selectedRuntime.language,
          version: selectedRuntime.version,
          code,
          stdin,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseError(data, `Request failed with status ${res.status}`));
      }
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run code.");
    } finally {
      setRunning(false);
    }
  }, [code, running, selectedRuntime, stdin]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runCode]);

  function handleCodeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${code.slice(0, start)}  ${code.slice(end)}`;
    setCode(next);
    window.requestAnimationFrame(() => {
      target.setSelectionRange(start + 2, start + 2);
    });
  }

  function syncLineNumbers() {
    if (lineNumbersRef.current && editorRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Code Runner</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Run Code
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Write and execute code through the configured Piston runtime service.
          </p>
        </header>

        <section className={`${cardClass} p-4 sm:p-5`}>
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Language
              </label>
              <select
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
                disabled={loadingRuntimes || running || runtimeOptions.length === 0}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {runtimeOptions.map((runtime) => (
                  <option key={runtime.key} value={runtime.key}>
                    {runtime.displayName} {runtime.version}
                  </option>
                ))}
              </select>
              {loadingRuntimes && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Loading runtimes...</p>}
              {!loadingRuntimes && runtimeOptions.length === 0 && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">No runtimes are available.</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Code
              </label>
              <div className="flex min-h-[320px] overflow-hidden rounded-xl">
                <div
                  ref={lineNumbersRef}
                  className="max-h-[640px] min-h-[320px] w-12 flex-shrink-0 overflow-hidden border border-r-0 border-zinc-200 bg-zinc-100 px-2 py-2 text-right font-mono text-sm leading-5 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"
                  aria-hidden="true"
                >
                  {Array.from({ length: lineCount }).map((_, index) => (
                    <div key={index}>{index + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  onScroll={syncLineNumbers}
                  placeholder="// Write your code here..."
                  spellCheck={false}
                  className={`${editorClass} min-h-[320px] resize-y rounded-l-none leading-5`}
                />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Standard Input (stdin)
            </label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder="Optional input for your program..."
              className={`${editorClass} min-h-20 resize-y`}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runCode}
              disabled={running || !selectedRuntime || !code.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running && <RefreshCw className="h-4 w-4 animate-spin" />}
              {running ? "Running..." : "Run"}
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">Ctrl+Enter</span>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
        </section>

        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {(["output", "stderr"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={
                  "border-b-2 px-4 py-3 text-sm font-medium capitalize transition-colors " +
                  (activeTab === tab
                    ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100")
                }
              >
                {tab === "stderr" ? "Stderr" : "Output"}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {result?.exit_code !== undefined && result?.exit_code !== null && result.exit_code !== 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                Exited with code {result.exit_code}
              </div>
            )}
            {result?.signal && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                Killed by signal {result.signal}
              </div>
            )}

            <pre className="max-h-96 min-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-mono text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
              {activeTab === "output"
                ? outputText || (result?.exit_code === 0 ? "Program exited with no output." : "")
                : stderrText || "No errors."}
            </pre>

            {result && (
              <div className="text-xs text-zinc-500 dark:text-zinc-500">
                CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {result.memory ?? "-"}KB
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
