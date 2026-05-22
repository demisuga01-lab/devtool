"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyboardEvent, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { TabBar, ToolShell } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";

type Language = {
  label: "C" | "C++" | "Rust" | "Go";
  icon: ReactNode;
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
    icon: <svg viewBox="0 0 48 48" className="h-5 w-5"><circle cx="24" cy="24" r="20" fill="#5C6BC0"/><path d="M30 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S20.9 16.5 25 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6z" fill="white"/></svg>,
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
    icon: <svg viewBox="0 0 48 48" className="h-5 w-5"><circle cx="24" cy="24" r="20" fill="#00599C"/><path d="M22 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S12.9 16.5 17 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6zM31 22v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z" fill="white"/></svg>,
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
    icon: <svg viewBox="0 0 48 48" className="h-5 w-5"><circle cx="24" cy="24" r="20" fill="#CE422B"/><path d="M24 8l1.5 2.5h-3L24 8zm0 32l-1.5-2.5h3L24 40zm16-16l-2.5 1.5v-3L40 24zM8 24l2.5-1.5v3L8 24z" fill="white"/><circle cx="24" cy="24" r="8" fill="none" stroke="white" strokeWidth="2"/><path d="M20 22h8M20 26h8" stroke="white" strokeWidth="2"/></svg>,
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
    icon: <svg viewBox="0 0 48 48" className="h-5 w-5"><rect width="48" height="48" rx="4" fill="#00ACD7"/><path d="M8 20.5c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2h13.5c.2 0 .2.1.1.3l-.5.8c-.1.1-.3.2-.5.2H8zM5 23c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2H22c.2 0 .3.1.2.3l-.3.7c-.1.2-.3.3-.5.3H5zM11 25.5c-.2 0-.2-.1-.1-.3l.5-.8c.1-.1.3-.2.5-.2h7c.2 0 .3.1.3.3l-.1.7c0 .2-.2.3-.4.3H11z" fill="white"/><path d="M36 16v2h-4v2h4v2h-6v-8h6v2zm-12 6c0 1.7-1.3 3-3 3h-3v-8h3c1.7 0 3 1.3 3 3zm-4 1h1c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-1v4z" fill="white"/></svg>,
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

function SystemsRunnerPageContent() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
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
    if (!langParam) return;
    const index = languages.findIndex((language) => language.language === langParam);
    if (index !== -1) setActiveIndex(index);
  }, [langParam]);

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
    <ToolShell className="flex min-h-screen max-w-none flex-col px-0 py-0 sm:px-0 sm:py-0">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-6 sm:px-6 sm:py-10">
        <Breadcrumb title="Systems Runner" />
        <header className="mt-6">
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">Systems Runner</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Compile and run C, C++, Rust, and Go code with full compiler output.</p>
        </header>

        <TabBar
          tabs={languages.map((language, index) => ({ value: String(index), label: language.label, icon: language.icon, badge: index === activeIndex ? language.version : undefined }))}
          active={String(activeIndex)}
          onChange={(value) => setActiveIndex(Number(value))}
          className="mt-6 border-b border-zinc-200 pb-3 dark:border-zinc-800"
        />

        <div className="mt-5 flex flex-col gap-2 md:gap-5 lg:h-[calc(100vh-8rem)] lg:min-h-[560px] lg:flex-row">
          <section className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[55%]">
            <div className="border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-300">
              {active.label} · {active.compiler} {active.version}
            </div>
            <div className="flex min-h-[300px] flex-1 overflow-hidden bg-zinc-950 lg:min-h-0">
              <div ref={lineRef} className="h-full w-8 min-w-8 overflow-hidden px-2 py-4 text-right font-mono text-xs leading-relaxed text-zinc-600 select-none lg:w-12 lg:min-w-12 lg:text-sm">
                {Array.from({ length: lines }).map((_, index) => <div key={index}>{index + 1}</div>)}
              </div>
              <textarea
                ref={editorRef}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={insertTab}
                onScroll={syncLines}
                spellCheck={false}
                className="min-h-[300px] min-w-0 flex-1 resize-y overflow-auto bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none transition-colors duration-200 lg:min-h-0 lg:flex-1"
              />
            </div>
            <details className="border-t border-zinc-800 bg-zinc-900/80 p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300 transition-colors duration-200 hover:text-zinc-100">Standard Input (stdin)</summary>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    runCode();
                  }
                }}
                className="mt-3 min-h-[90px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </details>
            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/95 px-3 py-2.5 backdrop-blur md:static md:px-4 md:py-3 md:backdrop-blur-none">
              <button type="button" onClick={runCode} disabled={running} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span className="hidden sm:inline">{running ? "Running..." : "Run"}</span>
              </button>
              <span className="text-xs text-zinc-500">Ctrl+Enter to run</span>
            </div>
          </section>

          <section className="flex min-h-[250px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[45%]">
            <div className="-m-4 mb-4 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                <h2 className="font-semibold text-zinc-100">Output</h2>
              </div>
              {result && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${success ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>exit {result.exit_code ?? "-"}</span>}
            </div>
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={() => setTab("stdout")} className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 md:min-h-0 ${tab === "stdout" ? "bg-emerald-600 text-white shadow shadow-emerald-600/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}>stdout</button>
              <button type="button" onClick={() => setTab("stderr")} className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 md:min-h-0 ${tab === "stderr" ? "bg-emerald-600 text-white shadow shadow-emerald-600/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}>stderr+compile</button>
            </div>
            {error && <Banner tone="red">{error}</Banner>}
            {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && <Banner tone="red">Process exited with code {result.exit_code}</Banner>}
            {result?.signal && <Banner tone="orange">Killed by signal {result.signal}</Banner>}
            <pre className="min-h-[200px] flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200 lg:min-h-0">
              {hasRun ? (tab === "stdout" ? stdout || (success ? "Program exited with no output." : "") : stderr || "No errors.") : "Run code to see output"}
            </pre>
            {result && <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500"><Stat label="CPU" value={`${result.cpu_time ?? "-"}ms`} /><Stat label="Wall" value={`${result.wall_time ?? "-"}ms`} /><Stat label="Memory" value={`${result.memory == null ? "-" : Math.round(result.memory / 1000)}KB`} /></div>}
          </section>
        </div>
      </div>
    </ToolShell>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500"><Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">Tools</Link><span>/</span><span>Code Runners</span><span>/</span><span>{title}</span></nav>;
}

function Banner({ tone, children }: { tone: "red" | "orange"; children: ReactNode }) {
  return <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" : "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400"}`}>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <span className="rounded-lg bg-zinc-800 px-2 py-1">{label}: {value}</span>;
}

export default function SystemsRunnerPage() {
  return (
    <Suspense fallback={null}>
      <SystemsRunnerPageContent />
    </Suspense>
  );
}
