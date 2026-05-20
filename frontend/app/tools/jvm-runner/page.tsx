"use client";

import Link from "next/link";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Coffee, Crosshair, FileText, Hash, Play, RefreshCw, Zap } from "lucide-react";
import { API_BASE } from "@/lib/api";

type OutputTab = "output" | "errors";

type Language = {
  label: string;
  icon: ReactNode;
  language: string;
  version: string;
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
    label: "Java",
    icon: <Coffee className="h-4 w-4" />,
    language: "java",
    version: "15.0.2",
    defaultCode: `public class Main {
    public static void main(String[] args) {
        String[] languages = {"Java", "Kotlin", "Scala"};
        for (String lang : languages) {
            System.out.println("Hello from " + lang + "!");
        }
    }
}`,
  },
  {
    label: "Kotlin",
    icon: <Crosshair className="h-4 w-4" />,
    language: "kotlin",
    version: "1.8.20",
    defaultCode: `fun main() {
    val languages = listOf("Kotlin", "Java", "Scala")
    languages.forEach { lang ->
        println("Hello from $lang!")
    }
}`,
  },
  {
    label: "Scala",
    icon: <Zap className="h-4 w-4" />,
    language: "scala",
    version: "3.2.2",
    defaultCode: `@main def hello(): Unit =
  val languages = List("Scala", "Java", "Kotlin")
  languages.foreach(lang => println(s"Hello from $lang!"))`,
  },
  {
    label: "C#",
    icon: <Hash className="h-4 w-4" />,
    language: "csharp",
    version: "6.12.0",
    defaultCode: `using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        var languages = new List<string> { "C#", "Java", "Kotlin" };
        foreach (var lang in languages) {
            Console.WriteLine($"Hello from {lang}!");
        }
    }
}`,
  },
  {
    label: "Basic",
    icon: <FileText className="h-4 w-4" />,
    language: "basic",
    version: "6.12.0",
    defaultCode: `MODULE Hello
    SUB Main()
        Dim languages() As String = {"Basic", "C#", "Java"}
        For Each lang As String In languages
            Console.WriteLine("Hello from " & lang & "!")
        Next
    END SUB
END MODULE`,
  },
];

const editorClass =
  "min-h-[360px] w-full flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 lg:min-h-0";

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

export default function JvmRunnerPage() {
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

  const compileOutput = [result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const stdout = result?.stdout || result?.output || "";
  const stderr = result?.stderr || "";
  const errors = [stderr, compileOutput].filter(Boolean).join("\n");
  const successful = result?.exit_code === 0 && !error;
  const failed = Boolean(error || (result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0));
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>JVM Runner</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">JVM Runner</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Run Java, Kotlin, Scala, C#, and Basic on the JVM and Mono runtime.
          </p>
        </header>

        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-end gap-1">
              {languages.map((language, index) => (
                <button
                  key={language.label}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-t-lg border-l border-r border-t px-4 py-2 text-sm font-medium transition-colors ${
                    index === activeIndex
                      ? "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:text-zinc-300"
                  }`}
                >
                  <span className="mr-2 inline-flex">{language.icon}</span>
                  {language.label}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-b-2xl rounded-tr-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                <span>
                  {active.label} · {active.language === "java" ? "jdk" : active.language} {active.version}
                </span>
                <span>Main file</span>
              </div>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={handleCodeKeyDown}
                spellCheck={false}
                className={editorClass}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">stdin:</label>
                <textarea
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  onKeyDown={handleStdinKeyDown}
                  placeholder="Optional input"
                  className="min-h-[60px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={runCode}
                  disabled={running}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {running ? "Running..." : "Run"}
                </button>
              </div>
            </div>
          </section>

          <section className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:min-h-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${successful ? "bg-emerald-500" : failed ? "bg-red-500" : "bg-zinc-400"}`} />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Build Output</h2>
              </div>
              {hasRun && (
                <span
                  className={`rounded-xl px-2 py-1 text-xs font-semibold ${
                    successful
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                  }`}
                >
                  {successful ? "BUILD SUCCESS" : "BUILD FAILED"}
                </span>
              )}
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

            {!hasRun && <p className="text-sm text-zinc-500 dark:text-zinc-500">Run a JVM or Mono program to see build output.</p>}

            {hasRun && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-wrap gap-2">
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

                {compileOutput && (
                  <div className="max-h-[200px] overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Compilation
                    </h3>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-amber-900 dark:text-amber-200">
                      {compileOutput}
                    </pre>
                  </div>
                )}

                {outputTab === "output" ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      Runtime Output
                    </h3>
                    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-mono text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")}
                    </pre>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      Runtime Errors
                    </h3>
                    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300">
                      {errors || <span className="text-zinc-400">No errors.</span>}
                    </pre>
                  </div>
                )}

                {result && (
                  <div className="text-xs text-zinc-400">
                    CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {memoryKb}KB
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
