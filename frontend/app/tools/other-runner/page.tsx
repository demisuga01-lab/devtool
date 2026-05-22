"use client";

import Link from "next/link";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type OutputTab = "output" | "errors";

type Language = {
  label: string;
  icon: ReactNode;
  language: string;
  version: string;
  description: string;
  note: string;
  defaultCode: string;
};

type RunResult = {
  stdout: string;
  stderr: string;
  output: string;
  exit_code: number | null;
  signal: string | null;
  cpu_time: number | null;
  wall_time: number | null;
  memory: number | null;
  compile_output: string;
  compile_stderr?: string;
};

const languages: Language[] = [
  {
    label: "Swift",
    icon: <svg viewBox="0 0 48 48" className="h-8 w-8"><rect width="48" height="48" rx="10" fill="#F05138"/><path d="M35 27c-2.5 4.5-7.5 7-12.5 6C16 32 11 27 11 21c0 4 2 8 6 10 3 1.5 6.5 1.5 9.5 0C30 29 33 26 35 23c0 0 2 2 0 4z" fill="white"/><path d="M35 18c0-4-3-8-8-10 3 3 4 6 3 9-1 2-3 4-5 5 3-1 7-2 10-4z" fill="white" opacity="0.8"/></svg>,
    language: "swift",
    version: "5.3.3",
    description: "Apple's modern language for iOS, macOS, and server-side development.",
    note: "Good for expressive app and server code with strong safety.",
    defaultCode: `// Swift 5.3
import Foundation

struct Greeter {
    let name: String

    func greet() -> String {
        return "Hello, \\(name)!"
    }
}

let names = ["World", "Swift", "DevTools"]
for name in names {
    let greeter = Greeter(name: name)
    print(greeter.greet())
}`,
  },
  {
    label: "Fortran",
    icon: <svg viewBox="0 0 48 48" className="h-8 w-8"><rect width="48" height="48" rx="4" fill="#734F96"/><path d="M12 12h24v5H17v5h15v5H17v9h-5V12z" fill="white"/></svg>,
    language: "fortran",
    version: "10.2.0",
    description: "Classic scientific computing language, still widely used in HPC.",
    note: "Good for numerical routines, arrays, and scientific code.",
    defaultCode: `program hello
  implicit none
  integer :: i
  character(len=20), dimension(3) :: languages

  languages = ['Fortran             ', 'Science             ', 'HPC                 ']

  do i = 1, 3
    write(*,*) 'Hello from ', trim(languages(i)), '!'
  end do
end program hello`,
  },
  {
    label: "D",
    icon: <svg viewBox="0 0 48 48" className="h-8 w-8"><rect width="48" height="48" rx="4" fill="#B03931"/><path d="M12 12h10c8 0 14 5 14 12s-6 12-14 12H12V12zm5 5v14h5c5 0 9-3 9-7s-4-7-9-7h-5z" fill="white"/></svg>,
    language: "d",
    version: "10.2.0",
    description: "Systems programming with productivity of dynamic languages.",
    note: "Good for native programs with modern language conveniences.",
    defaultCode: `import std.stdio;
import std.algorithm;
import std.array;

void main() {
    auto languages = ["D", "Systems", "DevTools"];

    foreach (lang; languages) {
        writefln("Hello from %s!", lang);
    }

    // D's powerful ranges
    auto squares = [1, 2, 3, 4, 5]
        .map!(x => x * x)
        .array;
    writeln("Squares: ", squares);
}`,
  },
];

const editorClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function insertTab(value: string, onChange: (value: string) => void, event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Tab") return false;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }
  return true;
}

function OutputPanel({
  result,
  error,
  outputTab,
  setOutputTab,
  hasRun,
}: {
  result: RunResult | null;
  error: string;
  outputTab: OutputTab;
  setOutputTab: (tab: OutputTab) => void;
  hasRun: boolean;
}) {
  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <section className="flex min-h-[250px] flex-1 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:min-h-0">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["output", "errors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutputTab(tab)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              outputTab === tab
                ? "bg-emerald-600 text-white"
                : "border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
            }`}
          >
            {tab === "output" ? "Output" : "Errors"}
          </button>
        ))}
      </div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Process exited with code {result.exit_code}
        </div>
      )}
      {result?.signal && (
        <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
          Killed by signal {result.signal}
        </div>
      )}
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
        {!hasRun
          ? "Select a language and run code to see output."
          : outputTab === "output"
            ? stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")
            : errors || <span className="text-zinc-400">No errors.</span>}
      </pre>
      {result && (
        <div className="mt-3 text-xs text-zinc-400">
          CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {memoryKb}KB
        </div>
      )}
    </section>
  );
}

export default function OtherRunnerPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = languages[activeIndex];
  const [code, setCode] = useState(active.defaultCode);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [outputTab, setOutputTab] = useState<OutputTab>("output");

  useEffect(() => {
    setCode(active.defaultCode);
    setStdin("");
    setResult(null);
    setError("");
    setHasRun(false);
    setOutputTab("output");
  }, [active]);

  const runCode = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setHasRun(true);
    setResult(null);
    setError("");
    setOutputTab("output");

    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language: active.language, version: active.version, code, stdin }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run code.");
    } finally {
      setRunning(false);
    }
  }, [active.language, active.version, code, running, stdin]);

  function handleCodeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
      return;
    }
    insertTab(code, setCode, event);
  }

  function handleStdinKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-3 py-8 dark:bg-zinc-950 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 min-h-0">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>Other Languages</span>
        </nav>

        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Other Languages</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Run Swift, Fortran, and D code.</p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {languages.map((language, index) => (
            <button
              key={language.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-2xl border p-4 text-left transition ${
                index === activeIndex
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                  : "border-zinc-200 bg-white hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              <div className="mb-3">{language.icon}</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{language.label}</div>
              <div className="mt-1 text-xs text-zinc-500">{language.version}</div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{language.description}</p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{language.note}</p>
            </button>
          ))}
        </section>

        <div className="flex min-h-[560px] flex-col gap-5 lg:h-[calc(100vh-8rem)] lg:flex-row">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{active.label} Editor</h2>
              <span className="text-xs text-zinc-500">{active.language} {active.version}</span>
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleCodeKeyDown}
              spellCheck={false}
              className={`${editorClass} min-h-[300px] resize-none rounded-none border-x-0 lg:flex-1`}
            />

            <label className="mb-1.5 mt-4 block px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Standard Input (stdin)</label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              onKeyDown={handleStdinKeyDown}
              placeholder="Optional input for your program..."
              className={`${editorClass} mx-4 min-h-[80px] w-auto`}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3 px-4 pb-4">
              <button
                type="button"
                onClick={runCode}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? "Running..." : "Run"}
              </button>
              <span className="text-xs text-zinc-400 dark:text-zinc-600">Ctrl+Enter to run</span>
            </div>
          </section>

          <OutputPanel result={result} error={error} outputTab={outputTab} setOutputTab={setOutputTab} hasRun={hasRun} />
        </div>
      </div>
    </main>
  );
}
