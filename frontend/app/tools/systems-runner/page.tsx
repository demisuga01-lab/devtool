"use client";

import Link from "next/link";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Language = {
  label: "C" | "C++" | "Rust" | "Go";
  language: string;
  version: string;
  compiler: string;
  defaultCode: string;
  color: string;
  hint: string;
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
    label: "C",
    language: "c",
    version: "10.2.0",
    compiler: "gcc",
    color: "bg-blue-600 hover:bg-blue-700",
    hint: "Compile and run C/C++ code. Memory safe. Blazing fast.",
    defaultCode: `#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    label: "C++",
    language: "c++",
    version: "10.2.0",
    compiler: "g++",
    color: "bg-indigo-600 hover:bg-indigo-700",
    hint: "Compile and run C/C++ code. Memory safe. Blazing fast.",
    defaultCode: `#include <iostream>
#include <vector>
#include <string>
int main() {
    std::vector<std::string> languages = {"C++", "Rust", "Go"};
    for (const auto& lang : languages) {
        std::cout << "Hello from " << lang << "!" << std::endl;
    }
    return 0;
}`,
  },
  {
    label: "Rust",
    language: "rust",
    version: "1.68.2",
    compiler: "rustc",
    color: "bg-orange-600 hover:bg-orange-700",
    hint: "Write safe, concurrent Rust code.",
    defaultCode: `fn main() {
    let languages = vec!["Rust", "C++", "Go"];
    for lang in &languages {
        println!("Hello from {}!", lang);
    }
}`,
  },
  {
    label: "Go",
    language: "go",
    version: "1.16.2",
    compiler: "go",
    color: "bg-cyan-600 hover:bg-cyan-700",
    hint: "Simple, efficient Go programs.",
    defaultCode: `package main
import (
    "fmt"
    "strings"
)
func main() {
    languages := []string{"Go", "Rust", "C++"}
    fmt.Println(strings.Join(languages, ", "))
    fmt.Println("Hello, World!")
}`,
  },
];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function SystemsRunnerPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = languages[activeIndex];
  const [code, setCode] = useState(active.defaultCode);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [tab, setTab] = useState<"stdout" | "stderr">("stdout");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCode(active.defaultCode);
    setResult(null);
    setError("");
    setHasRun(false);
    setTab("stdout");
  }, [active]);

  const runCode = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setHasRun(true);
    setResult(null);
    setError("");
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
  }, [active, code, running, stdin]);

  function insertTab(event: KeyboardEvent<HTMLTextAreaElement>) {
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
    setCode(`${code.slice(0, start)}  ${code.slice(end)}`);
    if (typeof window !== "undefined") window.requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
  }

  function syncLines() {
    if (lineRef.current && editorRef.current) lineRef.current.scrollTop = editorRef.current.scrollTop;
  }

  const lines = Math.max(1, code.split("\n").length);
  const stdout = result?.stdout || result?.output || "";
  const stderr = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const success = result?.exit_code === 0;
  const dotClass = !hasRun ? "bg-zinc-400" : success ? "bg-emerald-500" : "bg-red-500";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb title="Systems Runner" />
        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Systems Runner</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Compile and run C, C++, Rust, and Go code with full compiler output.</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
              {languages.map((language, index) => (
                <button
                  key={language.label}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${index === activeIndex ? `${language.color} text-white` : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}
                >
                  {language.label}
                </button>
              ))}
            </div>
            <div className="border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
              {active.label} · {active.compiler} {active.version}
            </div>
            <div className="flex max-h-[640px] min-h-[480px] overflow-hidden bg-zinc-950">
              <div ref={lineRef} className="min-w-[2.5rem] overflow-hidden px-2 py-4 text-right font-mono text-sm leading-5 text-zinc-600 select-none">
                {Array.from({ length: lines }).map((_, index) => <div key={index}>{index + 1}</div>)}
              </div>
              <textarea ref={editorRef} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={insertTab} onScroll={syncLines} spellCheck={false} className="min-h-[480px] flex-1 resize-y bg-zinc-950 p-4 font-mono text-sm leading-5 text-zinc-100 outline-none" />
            </div>
            <div className="space-y-3 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">stdin</label>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    runCode();
                  }
                }}
                className="min-h-[60px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button type="button" onClick={runCode} disabled={running} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-white ${active.color} disabled:cursor-not-allowed disabled:opacity-60`}>
                {running && <RefreshCw className="h-4 w-4 animate-spin" />}
                {running ? "Running..." : `▶ Run ${active.label}`}
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Output</h2>
              </div>
              {result && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${success ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>exit {result.exit_code ?? "-"}</span>}
            </div>
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={() => setTab("stdout")} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${tab === "stdout" ? "bg-emerald-600 text-white" : "border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"}`}>stdout</button>
              <button type="button" onClick={() => setTab("stderr")} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${tab === "stderr" ? "bg-emerald-600 text-white" : "border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"}`}>stderr+compile</button>
            </div>
            {error && <Banner tone="red">{error}</Banner>}
            {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && <Banner tone="red">Process exited with code {result.exit_code}</Banner>}
            {result?.signal && <Banner tone="orange">Killed by signal {result.signal}</Banner>}
            <pre className="min-h-[200px] max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-100">{hasRun ? (tab === "stdout" ? stdout || (success ? "Program exited with no output." : "") : stderr || "No errors.") : active.hint}</pre>
            {result && <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-500"><Stat label="CPU" value={`${result.cpu_time ?? "-"}ms`} /><Stat label="Wall" value={`${result.wall_time ?? "-"}ms`} /><Stat label="Memory" value={`${result.memory == null ? "-" : Math.round(result.memory / 1000)}KB`} /></div>}
          </section>
        </div>
      </div>
    </main>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500"><Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">Tools</Link><span>/</span><span>Code Runners</span><span>/</span><span>{title}</span></nav>;
}

function Banner({ tone, children }: { tone: "red" | "orange"; children: ReactNode }) {
  return <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" : "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400"}`}>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <span className="rounded-lg bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{label}: {value}</span>;
}
