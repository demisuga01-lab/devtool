"use client";

import Link from "next/link";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Code, Code2, FileCode, Gem, Play, RefreshCw, Terminal } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Language = { label: string; icon: ReactNode; language: string; version: string; defaultCode: string; color: string };
type RunResult = { stdout: string; stderr: string; output: string; exit_code: number | null; signal: string | null; cpu_time: number | null; wall_time: number | null; memory: number | null; compile_output: string; compile_stderr?: string };
type OutputTab = "output" | "errors";

const languages: Language[] = [
  { label: "Python", icon: <Code2 className="h-4 w-4" />, language: "python", version: "3.12.0", color: "bg-blue-500 hover:bg-blue-600", defaultCode: `# Python 3.12
def greet(name: str) -> str:
    return f"Hello, {name}!"

names = ["World", "Python", "DevTools"]
for name in names:
    print(greet(name))` },
  { label: "Ruby", icon: <Gem className="h-4 w-4" />, language: "ruby", version: "3.0.1", color: "bg-red-500 hover:bg-red-600", defaultCode: `# Ruby 3.0
def greet(name)
  "Hello, #{name}!"
end

["World", "Ruby", "DevTools"].each do |name|
  puts greet(name)
end` },
  { label: "PHP", icon: <FileCode className="h-4 w-4" />, language: "php", version: "8.2.3", color: "bg-violet-500 hover:bg-violet-600", defaultCode: `<?php
function greet(string $name): string {
    return "Hello, $name!";
}

$names = ["World", "PHP", "DevTools"];
foreach ($names as $name) {
    echo greet($name) . "\\n";
}` },
  { label: "Perl", icon: <FileCode className="h-4 w-4" />, language: "perl", version: "5.36.0", color: "bg-yellow-600 hover:bg-yellow-700", defaultCode: `use strict;
use warnings;

sub greet {
    my ($name) = @_;
    return "Hello, $name!";
}

my @names = ("World", "Perl", "DevTools");
foreach my $name (@names) {
    print greet($name) . "\\n";
}` },
  { label: "Bash", icon: <Terminal className="h-4 w-4" />, language: "bash", version: "5.2.0", color: "bg-zinc-700 hover:bg-zinc-800", defaultCode: `#!/bin/bash
greet() {
    echo "Hello, $1!"
}

for name in "World" "Bash" "DevTools"; do
    greet "$name"
done` },
  { label: "Lua", icon: <Code className="h-4 w-4" />, language: "lua", version: "5.4.4", color: "bg-indigo-500 hover:bg-indigo-600", defaultCode: `-- Lua 5.4
local function greet(name)
    return string.format("Hello, %s!", name)
end

local names = {"World", "Lua", "DevTools"}
for _, name in ipairs(names) do
    print(greet(name))
end` },
];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") return (data as { detail: string }).detail;
  return fallback;
}

export default function ScriptingRunnerPage() {
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
      const res = await fetch(`${API_BASE}/tools/run-code`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ language: active.language, version: active.version, code, stdin }) });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run script.");
    } finally {
      setRunning(false);
    }
  }, [active, code, running, stdin]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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

  const stdout = result?.stdout || result?.output || "";
  const errors = [error, result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumb title="Scripting Runner" />
        <header className="mt-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Scripting Runner</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Run Python, Ruby, PHP, Perl, Bash, and Lua scripts instantly.</p>
        </header>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {languages.map((language, index) => (
            <button key={language.label} type="button" onClick={() => setActiveIndex(index)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${index === activeIndex ? `${language.color} text-white` : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
              <span className="mr-2 inline-flex">{language.icon}</span>{language.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <textarea value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={handleKeyDown} spellCheck={false} className="min-h-[360px] w-full flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 lg:min-h-0" />
            <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">stdin</label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  runCode();
                }
              }}
              className="mt-1 min-h-[80px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={runCode} disabled={running} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white ${active.color} disabled:cursor-not-allowed disabled:opacity-60`}>{running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running ? "Running..." : `Run ${active.label}`}</button>
              <span className="text-xs text-zinc-400 dark:text-zinc-600">Ctrl+Enter to run</span>
            </div>
          </section>

          <section className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm lg:min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div className="font-semibold text-zinc-100">Output</div>
              <div className="flex items-center gap-2">
                {(["output", "errors"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setOutputTab(tab)}
                    className={`rounded-xl px-2 py-1 text-xs font-semibold ${outputTab === tab ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
                  >
                    {tab === "output" ? "Output" : "Errors"}
                  </button>
                ))}
                <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400">{active.label} {active.version}</span>
                <button type="button" onClick={() => typeof navigator !== "undefined" && navigator.clipboard?.writeText(stdout)} className="text-xs text-zinc-400 hover:text-zinc-200">Copy output</button>
                <button type="button" onClick={() => { setResult(null); setError(""); setHasRun(false); setOutputTab("output"); }} className="text-xs text-zinc-400 hover:text-zinc-200">Clear</button>
              </div>
            </div>
            {result?.exit_code !== null && result?.exit_code !== undefined && result.exit_code !== 0 && (
              <div className="mx-4 mt-4 rounded-xl border border-red-800 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                Process exited with code {result.exit_code}
              </div>
            )}
            {result?.signal && (
              <div className="mx-4 mt-4 rounded-xl border border-orange-800 bg-orange-950/30 px-3 py-2 text-sm text-orange-400">
                Killed by signal {result.signal}
              </div>
            )}
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm">
              {!hasRun && <span className="text-zinc-600">{">>>"} Run your script to see output</span>}
              {hasRun && outputTab === "output" && stdout && stdout.split("\n").map((line, index) => <span key={index} className="block text-zinc-100">&gt; {line}</span>)}
              {hasRun && outputTab === "output" && !stdout && result?.exit_code === 0 && <span className="text-zinc-400">Program exited with no output.</span>}
              {hasRun && outputTab === "errors" && errors && errors.split("\n").map((line, index) => <span key={`e-${index}`} className="block text-red-400">x {line}</span>)}
              {hasRun && outputTab === "errors" && !errors && <span className="text-zinc-400">No errors.</span>}
            </pre>
            {result && <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {result.memory == null ? "-" : Math.round(result.memory / 1000)}KB</div>}
          </section>
        </div>
      </div>
    </main>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500"><Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">Tools</Link><span>/</span><span>Code Runners</span><span>/</span><span>{title}</span></nav>;
}
