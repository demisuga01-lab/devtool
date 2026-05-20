"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

export type CodeRunnerLanguage = {
  label: string;
  language: string;
  version: string;
  defaultCode: string;
};

type CodeRunnerPanelProps = {
  title: string;
  description: string;
  languages: CodeRunnerLanguage[];
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

const editorClass =
  "font-mono text-sm min-h-[320px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
const tabBaseClass = "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors";
const inactiveTabClass =
  "border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100";
const activeTabClass = "bg-emerald-600 text-white";
const bannerClass =
  "rounded-xl border px-3 py-2 text-sm";

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export function CodeRunnerPanel({ title, description, languages }: CodeRunnerPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeLanguage = languages[activeIndex] ?? languages[0];
  const [code, setCode] = useState(activeLanguage?.defaultCode ?? "");
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [outputTab, setOutputTab] = useState<"output" | "errors">("output");

  useEffect(() => {
    setCode(activeLanguage?.defaultCode ?? "");
    setResult(null);
    setError("");
    setHasRun(false);
    setOutputTab("output");
  }, [activeLanguage]);

  const runCode = useCallback(async () => {
    if (!activeLanguage || running) return;
    setRunning(true);
    setHasRun(true);
    setError("");
    setResult(null);
    setOutputTab("output");

    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: activeLanguage.language,
          version: activeLanguage.version,
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
  }, [activeLanguage, code, running, stdin]);

  function handleCodeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${code.slice(0, start)}  ${code.slice(end)}`;
    setCode(next);
    window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }

  function handleShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
    }
  }

  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>{title}</span>
        </nav>

        <header>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {languages.map((language, index) => (
            <button
              key={language.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`${tabBaseClass} ${index === activeIndex ? activeTabClass : inactiveTabClass}`}
            >
              {language.label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={handleCodeKeyDown}
            spellCheck={false}
            className={editorClass}
          />

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Standard Input (stdin)
            </label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              onKeyDown={handleShortcut}
              placeholder="Optional input for your program..."
              className={`${editorClass} min-h-[80px]`}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runCode}
              disabled={running || !activeLanguage}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : "▶"}
              {running ? "Running..." : "Run"}
            </button>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">Ctrl+Enter to run</span>
          </div>
        </section>

        {hasRun && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["output", "errors"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setOutputTab(tab)}
                  className={`${tabBaseClass} text-xs ${outputTab === tab ? activeTabClass : inactiveTabClass}`}
                >
                  {tab === "output" ? "Output" : "Errors"}
                </button>
              ))}
            </div>

            {error && (
              <div className={`${bannerClass} mb-3 border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400`}>
                {error}
              </div>
            )}
            {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && (
              <div className={`${bannerClass} mb-3 border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400`}>
                Process exited with code {result.exit_code}
              </div>
            )}
            {result?.signal && (
              <div className={`${bannerClass} mb-3 border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400`}>
                Killed by signal {result.signal}
              </div>
            )}

            <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
              {outputTab === "output"
                ? stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")
                : errors || <span className="text-zinc-400">No errors.</span>}
            </pre>

            {result && (
              <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
                CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {memoryKb}KB
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
