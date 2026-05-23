"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckSquare, Database, Files, Globe, LayoutList, Play, Plus, RefreshCw, Share2, Star, Terminal, X } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { createPaste } from "@/lib/paste-api";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "single" | "web" | "multi" | "notebook" | "tests" | "database" | "share";
type OutputTab = "stdin" | "stdout" | "stderr" | "info";
type Language = {
  label: string;
  group: string;
  language: string;
  version: string;
  badge: string;
  defaultCode: string;
  judgeId?: number;
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
  status_description?: string;
};
type ProjectFile = { id: string; filename: string; content: string };
type NotebookCell = { id: string; code: string; result: RunResult | null; running: boolean; error: string };
type TestCase = { id: string; name: string; stdin: string; expected: string; actual: string; status: "pending" | "running" | "passed" | "failed" };
type ShareItem = { id: string; title: string; language: string; url: string; createdAt: string };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "single", label: "Single File", icon: Play },
  { id: "web", label: "Web", icon: Globe },
  { id: "multi", label: "Multi-file", icon: Files },
  { id: "notebook", label: "Notebook", icon: LayoutList },
  { id: "tests", label: "Test Cases", icon: CheckSquare },
  { id: "database", label: "Database", icon: Database },
  { id: "share", label: "Share", icon: Share2 },
];

const languages: Language[] = [
  { group: "Scripting", label: "Python", language: "python", version: "3.12.0", badge: "py", judgeId: 71, defaultCode: 'name = input().strip() or "World"\nprint(f"Hello, {name}!")' },
  { group: "Scripting", label: "Ruby", language: "ruby", version: "3.0.1", badge: "rb", judgeId: 72, defaultCode: 'name = STDIN.read.strip\nputs "Hello, #{name.empty? ? "World" : name}!"' },
  { group: "Scripting", label: "PHP", language: "php", version: "8.2.3", badge: "php", judgeId: 68, defaultCode: '<?php\n$name = trim(stream_get_contents(STDIN)) ?: "World";\necho "Hello, $name!\\n";' },
  { group: "Scripting", label: "Perl", language: "perl", version: "5.36.0", badge: "pl", judgeId: 85, defaultCode: 'my $name = <STDIN> || "World";\nchomp $name;\nprint "Hello, $name!\\n";' },
  { group: "Scripting", label: "Bash", language: "bash", version: "5.2.0", badge: "sh", judgeId: 46, defaultCode: 'read name\nname=${name:-World}\necho "Hello, $name!"' },
  { group: "Scripting", label: "Lua", language: "lua", version: "5.4.4", badge: "lua", judgeId: 64, defaultCode: "local name = io.read('*l') or 'World'\nprint('Hello, ' .. name .. '!')" },
  { group: "Scripting", label: "R", language: "rscript", version: "4.x", badge: "r", judgeId: 80, defaultCode: 'values <- c(2, 3, 5, 8)\nprint(mean(values))' },
  { group: "JVM", label: "Java", language: "java", version: "15.0.2", badge: "java", judgeId: 62, defaultCode: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}' },
  { group: "JVM", label: "Kotlin", language: "kotlin", version: "1.8.20", badge: "kt", judgeId: 78, defaultCode: 'fun main() {\n  println("Hello, World!")\n}' },
  { group: "JVM", label: "Scala", language: "scala", version: "3.2.2", badge: "scala", judgeId: 81, defaultCode: 'object Main extends App {\n  println("Hello, World!")\n}' },
  { group: "JVM", label: "Groovy", language: "groovy", version: "3.0.7", badge: "gy", defaultCode: 'println "Hello, World!"' },
  { group: "JVM", label: "Clojure", language: "clojure", version: "1.10.3", badge: "clj", defaultCode: '(println "Hello, World!")' },
  { group: "Systems", label: "C", language: "c", version: "10.2.0", badge: "c", judgeId: 50, defaultCode: '#include <stdio.h>\nint main(void) {\n  printf("Hello, World!\\n");\n  return 0;\n}' },
  { group: "Systems", label: "C++", language: "cpp", version: "10.2.0", badge: "cpp", judgeId: 54, defaultCode: '#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}' },
  { group: "Systems", label: "Rust", language: "rust", version: "1.68.2", badge: "rs", judgeId: 73, defaultCode: 'fn main() {\n  println!("Hello, World!");\n}' },
  { group: "Systems", label: "Go", language: "go", version: "1.20.0", badge: "go", judgeId: 60, defaultCode: 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello, World!")\n}' },
  { group: "Systems", label: "Swift", language: "swift", version: "5.2.3", badge: "swift", judgeId: 83, defaultCode: 'print("Hello, World!")' },
  { group: "Systems", label: "D", language: "d", version: "2.089.1", badge: "d", judgeId: 56, defaultCode: 'import std.stdio;\nvoid main() {\n  writeln("Hello, World!");\n}' },
  { group: "Systems", label: "Fortran", language: "fortran", version: "9.2.0", badge: "f90", judgeId: 59, defaultCode: 'program hello\n  print *, "Hello, World!"\nend program hello' },
  { group: "Systems", label: "Assembly", language: "assembly", version: "nasm", badge: "asm", defaultCode: "; Assembly runtime availability depends on the backend." },
  { group: "Web", label: "JavaScript", language: "javascript", version: "18.15.0", badge: "js", judgeId: 63, defaultCode: 'console.log("Hello, World!");' },
  { group: "Web", label: "TypeScript", language: "typescript", version: "5.0.3", badge: "ts", judgeId: 74, defaultCode: 'const message: string = "Hello, World!";\nconsole.log(message);' },
  { group: "Web", label: "CoffeeScript", language: "coffeescript", version: "2.5.1", badge: "coffee", defaultCode: 'console.log "Hello, World!"' },
  { group: "Data", label: "Python (data)", language: "python", version: "3.12.0", badge: "py", judgeId: 71, defaultCode: 'values = [42, 37, 58, 63]\nprint(sum(values) / len(values))' },
  { group: "Data", label: "Julia", language: "julia", version: "latest", badge: "jl", judgeId: 72, defaultCode: 'values = [42, 37, 58, 63]\nprintln(sum(values) / length(values))' },
  { group: "Data", label: "SQLite", language: "sqlite3", version: "3.36.0", badge: "sql", defaultCode: 'CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, "Ada"), (2, "Grace");\nSELECT * FROM users;' },
  { group: "Other", label: "Haskell", language: "haskell", version: "8.8.1", badge: "hs", judgeId: 61, defaultCode: 'main = putStrLn "Hello, World!"' },
  { group: "Other", label: "Erlang", language: "erlang", version: "23.0.0", badge: "erl", defaultCode: 'io:format("Hello, World!~n").' },
  { group: "Other", label: "Elixir", language: "elixir", version: "1.11.3", badge: "ex", defaultCode: 'IO.puts("Hello, World!")' },
  { group: "Other", label: "F#", language: "fsharp", version: "5.0.201", badge: "fs", defaultCode: 'printfn "Hello, World!"' },
  { group: "Other", label: "OCaml", language: "ocaml", version: "4.10.0", badge: "ml", judgeId: 65, defaultCode: 'print_endline "Hello, World!";;' },
  { group: "Other", label: "Racket", language: "racket", version: "8.3.0", badge: "rkt", judgeId: 79, defaultCode: '#lang racket\n(displayln "Hello, World!")' },
  { group: "Other", label: "Prolog", language: "prolog", version: "8.4.2", badge: "pl", judgeId: 69, defaultCode: ':- initialization(main).\nmain :- write("Hello, World!"), nl, halt.' },
  { group: "Other", label: "Pascal", language: "pascal", version: "3.0.4", badge: "pas", judgeId: 67, defaultCode: 'program Hello;\nbegin\n  writeln("Hello, World!");\nend.' },
  { group: "Other", label: "COBOL", language: "cobol", version: "3.1.2", badge: "cbl", defaultCode: 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY "Hello, World!".\nSTOP RUN.' },
  { group: "Other", label: "Ada", language: "ada", version: "10.2.0", badge: "ada", defaultCode: 'with Ada.Text_IO; use Ada.Text_IO;\nprocedure Main is\nbegin\n  Put_Line ("Hello, World!");\nend Main;' },
  { group: "Other", label: "Nim", language: "nim", version: "1.6.2", badge: "nim", defaultCode: 'echo "Hello, World!"' },
  { group: "Other", label: "Crystal", language: "crystal", version: "0.36.1", badge: "cr", defaultCode: 'puts "Hello, World!"' },
  { group: "Other", label: "Zig", language: "zig", version: "0.10.1", badge: "zig", defaultCode: 'const std = @import("std");\npub fn main() void {\n  std.debug.print("Hello, World!\\n", .{});\n}' },
];

const databaseSample = `CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  salary REAL
);

INSERT INTO employees VALUES (1, 'Ada Lovelace', 'Engineering', 120000);
INSERT INTO employees VALUES (2, 'Grace Hopper', 'Engineering', 128000);
INSERT INTO employees VALUES (3, 'Katherine Johnson', 'Analysis', 118000);

SELECT department, COUNT(*) AS count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;`;

const defaultFiles: ProjectFile[] = [
  { id: "main", filename: "main.py", content: 'from utils import greet\n\nprint(greet("DevTools"))\n' },
  { id: "utils", filename: "utils.py", content: 'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n' },
];

export default function CodeWorkspacePage() {
  const [active, setActive] = useState<Tab>("single");
  const [languageIndex, setLanguageIndex] = useState(0);
  const language = languages[languageIndex] ?? languages[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("lang");
    if (!requested) return;
    const normalized = requested.toLowerCase();
    const aliases: Record<string, string> = { "c++": "cpp", csharp: "csharp", sqlite: "sqlite3", julia: "julia" };
    const matchValue = aliases[normalized] ?? normalized;
    const nextIndex = languages.findIndex(
      (item) => item.language.toLowerCase() === matchValue || item.label.toLowerCase() === matchValue || item.badge.toLowerCase() === matchValue,
    );
    if (nextIndex >= 0) setLanguageIndex(nextIndex);
  }, []);

  return (
    <WorkspaceShell
      title="Code Runner"
      subtitle="Run code in 40+ languages - single file, multi-file, web, notebook, and more"
      href="/tools/code"
      icon={Terminal}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="code"
      intentGroup="text"
      toolbar={<LanguageToolbar languageIndex={languageIndex} setLanguageIndex={setLanguageIndex} />}
    >
      {active === "single" && <SingleFileTab language={language} />}
      {active === "web" && <WebTab />}
      {active === "multi" && <MultiFileTab language={language} />}
      {active === "notebook" && <NotebookTab language={language} />}
      {active === "tests" && <TestCasesTab language={language} />}
      {active === "database" && <DatabaseTab />}
      {active === "share" && <ShareTab language={language} />}
    </WorkspaceShell>
  );
}

function LanguageToolbar({ languageIndex, setLanguageIndex }: { languageIndex: number; setLanguageIndex: (index: number) => void }) {
  const [query, setQuery] = useState("");
  const selected = languages[languageIndex] ?? languages[0];
  const visible = languages.filter((language) => `${language.group} ${language.label} ${language.language}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 dark:bg-zinc-900 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <FieldLabel>Global language</FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search languages..." className={inputClass} />
          <select value={languageIndex} onChange={(event) => setLanguageIndex(Number(event.target.value))} className={`${inputClass} min-w-64`}>
            {Array.from(new Set(visible.map((language) => language.group))).map((group) => (
              <optgroup key={group} label={group}>
                {visible.map((language) => ({ language, index: languages.indexOf(language) })).filter((item) => item.language.group === group).map(({ language, index }) => (
                  <option key={`${language.group}-${language.label}-${index}`} value={index}>{language.badge.toUpperCase()} - {language.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-muted-foreground dark:bg-zinc-800">
        <span className="font-medium text-foreground">{selected.label}</span> {selected.version} / {selected.group}
      </div>
    </div>
  );
}

function SingleFileTab({ language }: { language: Language }) {
  const [code, setCode] = useState(language.defaultCode);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<OutputTab>("stdout");

  useEffect(() => {
    setCode(language.defaultCode);
    setResult(null);
    setError("");
  }, [language]);

  async function run() {
    setRunning(true);
    setError("");
    setResult(null);
    setTab("stdout");
    try {
      setResult(await runCode(language, code, stdin));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run code.");
      setTab("stderr");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <IdeBar language={language} running={running} onRun={run} />
      <CodeEditor value={code} onChange={setCode} onRun={run} minHeight="min-h-[calc(100vh-280px)]" />
      <RunOutput tab={tab} setTab={setTab} stdin={stdin} setStdin={setStdin} result={result} error={error} />
      <StatusBar language={language} result={result} />
    </div>
  );
}

function WebTab() {
  const [html, setHtml] = useState("<main>\n  <h1>Hello Web Runner</h1>\n  <button id=\"btn\">Click me</button>\n</main>");
  const [css, setCss] = useState("body { font-family: system-ui; padding: 2rem; }\nh1 { color: #059669; }\nbutton { padding: .6rem 1rem; }");
  const [js, setJs] = useState("document.getElementById('btn').addEventListener('click', () => console.log('clicked'));");
  const [live, setLive] = useState(true);
  const [previewWidth, setPreviewWidth] = useState("100%");
  const [srcDoc, setSrcDoc] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);

  function run() {
    setConsoleLines([]);
    setSrcDoc(buildWebDocument(html, css, js));
  }

  useEffect(() => {
    run();
  }, []);

  useEffect(() => {
    if (!live) return;
    const timer = window.setTimeout(run, 500);
    return () => window.clearTimeout(timer);
  }, [html, css, js, live]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; args?: unknown[] };
      if (data?.source !== "devtools-web-runner") return;
      setConsoleLines((lines) => [...lines, `${data.type ?? "log"}: ${(data.args ?? []).map(String).join(" ")}`].slice(-100));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function openNewTab() {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)]">
      <div className="space-y-3">
        <MiniEditor label="HTML" value={html} onChange={setHtml} minHeight="min-h-[200px]" />
        <MiniEditor label="CSS" value={css} onChange={setCss} minHeight="min-h-[150px]" />
        <MiniEditor label="JavaScript" value={js} onChange={setJs} minHeight="min-h-[150px]" />
      </div>
      <div className="space-y-3">
        <WorkspaceCard>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={run}><Play className="h-4 w-4" />Run</PrimaryButton>
              <SecondaryButton onClick={() => { setHtml(""); setCss(""); setJs(""); }}>Reset</SecondaryButton>
              <SecondaryButton onClick={openNewTab}>Open in new tab</SecondaryButton>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} className="accent-emerald-600" /> Live</label>
              <select value={previewWidth} onChange={(event) => setPreviewWidth(event.target.value)} className={inputClass}>
                <option value="375px">Mobile</option>
                <option value="768px">Tablet</option>
                <option value="100%">Desktop</option>
              </select>
            </div>
          </div>
          <div className="flex justify-center overflow-auto rounded-lg bg-zinc-100 p-3 dark:bg-zinc-950">
            <iframe title="Web preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={srcDoc} style={{ width: previewWidth }} className="min-h-[500px] rounded-lg border border-border bg-white" />
          </div>
        </WorkspaceCard>
        <WorkspaceCard>
          <details open>
            <summary className="cursor-pointer text-sm font-medium text-foreground">Console</summary>
            <pre className="mt-3 min-h-28 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-emerald-300">{consoleLines.join("\n") || "Console output will appear here."}</pre>
          </details>
        </WorkspaceCard>
      </div>
    </div>
  );
}

function MultiFileTab({ language }: { language: Language }) {
  const [files, setFiles] = useState<ProjectFile[]>(defaultFiles);
  const [activeId, setActiveId] = useState("main");
  const [entry, setEntry] = useState("main.py");
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<OutputTab>("stdout");
  const active = files.find((file) => file.id === activeId) ?? files[0];

  function updateActive(patch: Partial<ProjectFile>) {
    if (!active) return;
    setFiles((items) => items.map((file) => file.id === active.id ? { ...file, ...patch } : file));
    if (patch.filename && active.filename === entry) setEntry(patch.filename);
  }

  async function run() {
    if (!language.judgeId) {
      setError("Multi-file execution is only available for languages with a Judge0 multi-file runtime.");
      setTab("stderr");
      return;
    }
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API_BASE}/tools/run-multifile`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: language.judgeId, files: files.map(({ filename, content }) => ({ filename, content })), main_file: entry, stdin }),
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, `Run failed with ${response.status}`));
      setResult(data as RunResult);
      setTab("stdout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run project.");
      setTab("stderr");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border">
        {files.map((file) => (
          <button key={file.id} type="button" onClick={() => setActiveId(file.id)} className={`flex h-11 items-center gap-2 border-b-2 px-2 text-sm ${active?.id === file.id ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground"}`}>
            {file.filename === entry && <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />}
            {file.filename}
            <X className="h-3.5 w-3.5" onClick={(event) => { event.stopPropagation(); setFiles((items) => items.length > 1 ? items.filter((item) => item.id !== file.id) : items); }} />
          </button>
        ))}
        <SecondaryButton onClick={() => { const file = { id: `file-${Date.now()}`, filename: `file${files.length + 1}.${language.badge}`, content: "" }; setFiles((items) => [...items, file]); setActiveId(file.id); }}><Plus className="h-4 w-4" />New file</SecondaryButton>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
        <input value={active?.filename ?? ""} onChange={(event) => updateActive({ filename: event.target.value })} className={monoInputClass} />
        <select value={entry} onChange={(event) => setEntry(event.target.value)} className={inputClass}>{files.map((file) => <option key={file.id}>{file.filename}</option>)}</select>
        <PrimaryButton onClick={() => void run()} disabled={running}>{running ? "Running..." : "Run project"}</PrimaryButton>
      </div>
      <CodeEditor value={active?.content ?? ""} onChange={(content) => updateActive({ content })} onRun={run} minHeight="min-h-[calc(100vh-320px)]" />
      <RunOutput tab={tab} setTab={setTab} stdin={stdin} setStdin={setStdin} result={result} error={error} />
    </div>
  );
}

function NotebookTab({ language }: { language: Language }) {
  const [cells, setCells] = useState<NotebookCell[]>(() => loadNotebook(language));
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => localStorage.setItem("devtools:code-notebook", JSON.stringify(cells)), 5000);
    return () => window.clearInterval(timer);
  }, [cells]);

  function update(id: string, patch: Partial<NotebookCell>) {
    setCells((items) => items.map((cell) => cell.id === id ? { ...cell, ...patch } : cell));
  }

  async function runCell(id: string) {
    const cell = cells.find((item) => item.id === id);
    if (!cell) return;
    update(id, { running: true, error: "", result: null });
    try {
      update(id, { result: await runCode(language, cell.code, ""), running: false });
    } catch (err) {
      update(id, { error: err instanceof Error ? err.message : "Cell failed.", running: false });
    }
  }

  async function runAll() {
    setRunningAll(true);
    for (const cell of cells) await runCell(cell.id);
    setRunningAll(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><PrimaryButton onClick={() => void runAll()} disabled={runningAll}>Run All</PrimaryButton><SecondaryButton onClick={() => setCells((items) => items.map((cell) => ({ ...cell, result: null, error: "" })))}>Clear Outputs</SecondaryButton></div>
      {cells.map((cell, index) => (
        <WorkspaceCard key={cell.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldLabel>Cell {index + 1}</FieldLabel>
            <div className="flex gap-2">
              <SecondaryButton onClick={() => void runCell(cell.id)}>{cell.running ? "Running..." : "Run"}</SecondaryButton>
              <SecondaryButton onClick={() => setCells((items) => moveItem(items, index, -1))}>Up</SecondaryButton>
              <SecondaryButton onClick={() => setCells((items) => moveItem(items, index, 1))}>Down</SecondaryButton>
              <SecondaryButton onClick={() => setCells((items) => items.filter((item) => item.id !== cell.id))}>Delete</SecondaryButton>
            </div>
          </div>
          <textarea value={cell.code} onChange={(event) => update(cell.id, { code: event.target.value })} className={`${textareaClass} min-h-[120px]`} />
          {(cell.result || cell.error) && <ResultBlock result={cell.result} error={cell.error} />}
        </WorkspaceCard>
      ))}
      <SecondaryButton onClick={() => setCells((items) => [...items, { id: `cell-${Date.now()}`, code: language.defaultCode, result: null, running: false, error: "" }])}><Plus className="h-4 w-4" />Add cell</SecondaryButton>
    </div>
  );
}

function TestCasesTab({ language }: { language: Language }) {
  const [code, setCode] = useState(language.defaultCode);
  const [cases, setCases] = useState<TestCase[]>([{ id: "case-1", name: "Default", stdin: "World", expected: "Hello, World!", actual: "", status: "pending" }]);
  const passed = cases.filter((item) => item.status === "passed").length;

  useEffect(() => setCode(language.defaultCode), [language]);

  function update(id: string, patch: Partial<TestCase>) {
    setCases((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function runCase(id: string) {
    const test = cases.find((item) => item.id === id);
    if (!test) return;
    update(id, { status: "running", actual: "" });
    try {
      const result = await runCode(language, code, test.stdin);
      const actual = (result.stdout || result.output || "").trim();
      update(id, { actual, status: actual === test.expected.trim() ? "passed" : "failed" });
    } catch (err) {
      update(id, { actual: err instanceof Error ? err.message : "Run failed.", status: "failed" });
    }
  }

  return (
    <div className="space-y-5">
      <CodeEditor value={code} onChange={setCode} onRun={() => void Promise.all(cases.map((item) => runCase(item.id)))} minHeight="min-h-[300px]" />
      <WorkspaceCard>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-foreground">Test cases</h3><span className="text-sm text-muted-foreground">{passed}/{cases.length} passed</span></div>
        <div className="space-y-3">
          {cases.map((test) => (
            <div key={test.id} className="grid gap-2 rounded-lg border border-border p-3 lg:grid-cols-[160px_1fr_1fr_120px_auto]">
              <input value={test.name} onChange={(event) => update(test.id, { name: event.target.value })} className={inputClass} />
              <textarea value={test.stdin} onChange={(event) => update(test.id, { stdin: event.target.value })} className={`${textareaClass} min-h-20`} placeholder="stdin" />
              <textarea value={test.expected} onChange={(event) => update(test.id, { expected: event.target.value })} className={`${textareaClass} min-h-20`} placeholder="expected output" />
              <StatusBadge status={test.status} />
              <SecondaryButton onClick={() => void runCase(test.id)}>Run</SecondaryButton>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <SecondaryButton onClick={() => setCases((items) => [...items, { id: `case-${Date.now()}`, name: "New case", stdin: "", expected: "", actual: "", status: "pending" }])}>Add test case</SecondaryButton>
          <PrimaryButton onClick={() => void Promise.all(cases.map((item) => runCase(item.id)))}>Run All</PrimaryButton>
          <CopyButton value={JSON.stringify(cases, null, 2)} label="Export JSON" />
        </div>
      </WorkspaceCard>
      <WorkspaceCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Coding challenges</h3>
          <p className="text-sm text-muted-foreground">Practice with saved challenge prompts and hidden test cases.</p>
        </div>
        <Link href="/tools/challenges" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
          Open challenges
        </Link>
      </WorkspaceCard>
    </div>
  );
}

function DatabaseTab() {
  const [sql, setSql] = useState(databaseSample);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const table = parsePipeTable(result?.stdout || result?.output || "");

  async function run() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      setResult(await runCode({ ...languages.find((item) => item.language === "sqlite3")!, version: "3.36.0" }, sql, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "SQL execution failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <WorkspaceCard>
        <details open>
          <summary className="cursor-pointer font-medium text-foreground">Schema</summary>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground"><p>employees</p><p className="pl-3 font-mono text-xs">id INTEGER</p><p className="pl-3 font-mono text-xs">name TEXT</p><p className="pl-3 font-mono text-xs">department TEXT</p><p className="pl-3 font-mono text-xs">salary REAL</p></div>
        </details>
      </WorkspaceCard>
      <div className="space-y-4">
        <CodeEditor value={sql} onChange={setSql} onRun={run} minHeight="min-h-[350px]" />
        <PrimaryButton onClick={() => void run()} disabled={running}>{running ? "Running..." : "Run SQL"}</PrimaryButton>
        {error && <WorkspaceCard className="border-red-500/40 text-sm text-red-600">{error}</WorkspaceCard>}
        {table ? <TableResult table={table} /> : <pre className="min-h-40 whitespace-pre-wrap rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{result?.stdout || result?.output || "Results will appear here."}</pre>}
      </div>
    </div>
  );
}

function ShareTab({ language }: { language: Language }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(language.defaultCode);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<ShareItem[]>(() => safeJson<ShareItem[]>("devtools:code-shares", []));

  useEffect(() => setCode(language.defaultCode), [language]);

  async function setShare(nextUrl: string) {
    setUrl(nextUrl);
    setQr(await QRCode.toDataURL(nextUrl, { margin: 1, width: 180 }));
    const item = { id: `share-${Date.now()}`, title: title || "Untitled", language: language.label, url: nextUrl, createdAt: new Date().toISOString() };
    const next = [item, ...recent].slice(0, 10);
    setRecent(next);
    localStorage.setItem("devtools:code-shares", JSON.stringify(next));
  }

  function createLink() {
    const encoded = btoa(unescape(encodeURIComponent(code))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    void setShare(`${location.origin}/tools/code?lang=${encodeURIComponent(language.language)}&code=${encoded}`);
  }

  async function savePaste() {
    setSaving(true);
    try {
      const paste = await createPaste({ content: code, language: language.language, title: title || "Shared code", expires_in: "30d" });
      await setShare(paste.url.startsWith("http") ? paste.url : `${location.origin}${paste.url}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
        <div><FieldLabel>Title</FieldLabel><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Language</FieldLabel><input value={language.label} readOnly className={inputClass} /></div>
        <div className="flex items-end"><PrimaryButton onClick={createLink}>Create share link</PrimaryButton></div>
        <div className="flex items-end"><SecondaryButton onClick={() => void savePaste()} disabled={saving}>{saving ? "Saving..." : "Save as paste"}</SecondaryButton></div>
      </div>
      <CodeEditor value={code} onChange={setCode} minHeight="min-h-[400px]" />
      {url && <WorkspaceCard><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><FieldLabel>Shareable URL</FieldLabel><code className="break-all text-xs">{url}</code></div><CopyButton value={url} label="Copy" />{qr && <img src={qr} alt="QR code for share URL" className="h-32 w-32 rounded-lg bg-white p-2" />}</div></WorkspaceCard>}
      <WorkspaceCard><h3 className="font-semibold text-foreground">Recent shares</h3><div className="mt-3 space-y-2">{recent.length ? recent.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.language} - {new Date(item.createdAt).toLocaleString()}</p></div><CopyButton value={item.url} /></div>) : <p className="text-sm text-muted-foreground">No recent shares from this browser.</p>}</div></WorkspaceCard>
    </div>
  );
}

function IdeBar({ language, running, onRun }: { language: Language; running: boolean; onRun: () => void | Promise<void> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm"><span className="rounded bg-emerald-500/10 px-2 py-1 font-mono text-emerald-700 dark:text-emerald-300">{language.badge}</span><span className="font-medium">{language.label}</span><span className="text-muted-foreground">{language.version}</span></div>
      <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Ctrl+Enter</span><PrimaryButton onClick={() => void onRun()} disabled={running}>{running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running ? "Running..." : "Run"}</PrimaryButton></div>
    </div>
  );
}

function CodeEditor({ value, onChange, onRun, minHeight }: { value: string; onChange: (value: string) => void; onRun?: () => void | Promise<void>; minHeight: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const lineCount = Math.max(1, value.split("\n").length);
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRun) {
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
    <div className={`grid ${minHeight} overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 grid-cols-[52px_1fr]`}>
      <div className="select-none overflow-hidden border-r border-zinc-800 bg-zinc-900 px-2 py-3 text-right font-mono text-xs leading-6 text-zinc-500">
        {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
      </div>
      <textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} spellCheck={false} className="h-full min-h-full resize-y border-0 bg-zinc-950 p-3 font-mono text-sm leading-6 text-zinc-100 outline-none" />
    </div>
  );
}

function MiniEditor({ label, value, onChange, minHeight }: { label: string; value: string; onChange: (value: string) => void; minHeight: string }) {
  return <div><FieldLabel>{label}</FieldLabel><textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${textareaClass} ${minHeight}`} /></div>;
}

function RunOutput({ tab, setTab, stdin, setStdin, result, error }: { tab: OutputTab; setTab: (tab: OutputTab) => void; stdin: string; setStdin: (value: string) => void; result: RunResult | null; error: string }) {
  const stdout = result?.stdout || result?.output || "";
  const stderr = [error, result?.stderr, result?.compile_output, result?.compile_stderr, result?.status_description].filter(Boolean).join("\n");
  return (
    <WorkspaceCard>
      <details open>
        <summary className="cursor-pointer font-medium text-foreground">Bottom panel</summary>
        <div className="mt-3 flex gap-1 border-b border-border">{(["stdin", "stdout", "stderr", "info"] as OutputTab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-3 py-2 text-sm ${tab === item ? "border-emerald-500 font-medium text-foreground" : "border-transparent text-muted-foreground"}`}>{item}</button>)}</div>
        {tab === "stdin" && <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} className={`${textareaClass} mt-3 min-h-28`} />}
        {tab === "stdout" && <pre className="mt-3 min-h-32 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-sm text-emerald-300">{stdout || "No stdout yet."}</pre>}
        {tab === "stderr" && <pre className="mt-3 min-h-32 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-sm text-red-300">{stderr || "No stderr."}</pre>}
        {tab === "info" && <pre className="mt-3 min-h-32 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-sm text-zinc-200">{JSON.stringify({ exit_code: result?.exit_code ?? null, signal: result?.signal ?? null, cpu_time: result?.cpu_time ?? null, wall_time: result?.wall_time ?? null, memory: result?.memory ?? null }, null, 2)}</pre>}
      </details>
    </WorkspaceCard>
  );
}

function StatusBar({ language, result }: { language: Language; result: RunResult | null }) {
  return <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground dark:bg-zinc-900"><span>{language.label} {language.version}</span><span>Exit: {result?.exit_code ?? "-"}</span><span>Time: {result?.wall_time ?? result?.cpu_time ?? "-"}ms</span><span>Memory: {result?.memory ?? "-"} KB</span></div>;
}

function ResultBlock({ result, error }: { result: RunResult | null; error: string }) {
  return <pre className={`whitespace-pre-wrap rounded-lg p-3 font-mono text-xs ${error ? "bg-red-950/30 text-red-300" : "bg-zinc-950 text-emerald-300"}`}>{error || result?.stdout || result?.output || "No output."}</pre>;
}

function StatusBadge({ status }: { status: TestCase["status"] }) {
  const classes = status === "passed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : status === "failed" ? "bg-red-500/10 text-red-700 dark:text-red-300" : status === "running" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300";
  return <span className={`inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

function TableResult({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return <WorkspaceCard className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{table.headers.map((header) => <th key={header} className="px-4 py-2">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index} className="border-b border-border last:border-b-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 font-mono text-xs">{cell}</td>)}</tr>)}</tbody></table></WorkspaceCard>;
}

async function runCode(language: Language, code: string, stdin: string) {
  const response = await fetch(`${API_BASE}/tools/run-code`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ language: language.language, version: language.version, code, stdin }),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readApiError(data, `Run failed with ${response.status}`));
  return data as RunResult;
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
}

function buildWebDocument(html: string, css: string, js: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>
["log","warn","error"].forEach((type) => {
  const original = console[type];
  console[type] = (...args) => {
    parent.postMessage({ source: "devtools-web-runner", type, args: args.map(String) }, "*");
    original.apply(console, args);
  };
});
window.onerror = (message, source, line) => parent.postMessage({ source: "devtools-web-runner", type: "error", args: [String(message) + " line " + line] }, "*");
<\/script><script>${js.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
}

function loadNotebook(language: Language): NotebookCell[] {
  if (typeof window === "undefined") return [{ id: "initial-cell", code: language.defaultCode, result: null, running: false, error: "" }];
  try {
    const raw = localStorage.getItem("devtools:code-notebook");
    const parsed = raw ? JSON.parse(raw) as NotebookCell[] : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return [{ id: "cell-1", code: language.defaultCode, result: null, running: false, error: "" }];
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function safeJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function parsePipeTable(value: string) {
  const lines = value.trim().split(/\r?\n/).filter((line) => line.includes("|"));
  if (lines.length < 2) return null;
  const rows = lines.map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean));
  return { headers: rows[0], rows: rows.slice(1) };
}
