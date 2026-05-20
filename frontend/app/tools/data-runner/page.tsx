"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Mode = "sqlite" | "julia";
type OutputTab = "output" | "errors";

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

type TableData = {
  headers: string[];
  rows: string[][];
};

const sqliteCode = `-- Create a sample database and query it
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    salary REAL
);

INSERT INTO employees VALUES (1, 'Alice Johnson', 'Engineering', 95000);
INSERT INTO employees VALUES (2, 'Bob Smith', 'Marketing', 72000);
INSERT INTO employees VALUES (3, 'Carol Williams', 'Engineering', 88000);
INSERT INTO employees VALUES (4, 'David Brown', 'Sales', 65000);
INSERT INTO employees VALUES (5, 'Eve Davis', 'Engineering', 102000);

SELECT department, COUNT(*) as count, AVG(salary) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;`;

const juliaCode = `# Julia - High Performance Scientific Computing
println("Julia Data Analysis Example")
println("=" ^ 35)

# Basic statistics
data = [23, 45, 12, 67, 34, 89, 11, 56, 78, 42]

n = length(data)
mean_val = sum(data) / n
sorted = sort(data)
median_val = n % 2 == 0 ? (sorted[n÷2] + sorted[n÷2+1]) / 2 : sorted[(n+1)÷2]

println("Data: ", data)
println("Count: ", n)
println("Sum: ", sum(data))
println("Mean: ", round(mean_val, digits=2))
println("Median: ", median_val)
println("Min: ", minimum(data))
println("Max: ", maximum(data))`;

const editorClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

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

function parseTable(value: string): TableData | null {
  const lines = value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const splitLine = (line: string) => {
    if (line.includes("|")) return line.split("|").map((cell) => cell.trim()).filter(Boolean);
    return line.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
  };

  const rows = lines.map(splitLine).filter((row) => row.length > 1);
  if (rows.length < 2) return null;
  const width = rows[0].length;
  if (!rows.every((row) => row.length === width)) return null;
  return { headers: rows[0], rows: rows.slice(1) };
}

function OutputPanel({
  result,
  error,
  outputTab,
  setOutputTab,
  accent = "emerald",
}: {
  result: RunResult | null;
  error: string;
  outputTab: OutputTab;
  setOutputTab: (tab: OutputTab) => void;
  accent?: "emerald" | "purple";
}) {
  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <section className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 ${accent === "purple" ? "border-purple-200 dark:border-purple-900" : "border-zinc-200 dark:border-zinc-800"}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["output", "errors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutputTab(tab)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              outputTab === tab
                ? accent === "purple"
                  ? "bg-purple-600 text-white"
                  : "bg-emerald-600 text-white"
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
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
        {outputTab === "output"
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

export default function DataRunnerPage() {
  const [mode, setMode] = useState<Mode>("sqlite");
  const [code, setCode] = useState(sqliteCode);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [outputTab, setOutputTab] = useState<OutputTab>("output");

  useEffect(() => {
    setCode(mode === "sqlite" ? sqliteCode : juliaCode);
    setStdin("");
    setResult(null);
    setError("");
    setHasRun(false);
    setOutputTab("output");
  }, [mode]);

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
        body: JSON.stringify({
          language: mode === "sqlite" ? "sqlite3" : "julia",
          version: mode === "sqlite" ? "3.36.0" : "1.8.5",
          code,
          stdin: mode === "sqlite" ? "" : stdin,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run code.");
    } finally {
      setRunning(false);
    }
  }, [code, mode, running, stdin]);

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

  const stdout = result?.stdout || result?.output || "";
  const table = mode === "sqlite" ? parseTable(stdout) : null;
  const sqlErrors = [error, result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>Data Runner</span>
        </nav>

        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Data Runner</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Run SQLite queries and Julia scripts for data analysis.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {([
            ["sqlite", "SQLite"],
            ["julia", "Julia"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === value
                  ? value === "julia"
                    ? "bg-purple-600 text-white"
                    : "bg-emerald-600 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "sqlite" ? (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                <span>🗄️</span>
                SQL Query
              </div>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={handleCodeKeyDown}
                spellCheck={false}
                className={`${editorClass} min-h-[200px] rounded-none border-0 focus:ring-0`}
              />
            </section>
            <button
              type="button"
              onClick={runCode}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : "▶"}
              {running ? "Running..." : "Execute Query"}
            </button>

            {hasRun && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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

                {table ? (
                  <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          {table.headers.map((header) => (
                            <th
                              key={header}
                              className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, rowIndex) => (
                          <tr key={`${row.join("-")}-${rowIndex}`} className={rowIndex % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-900/50" : ""}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${cell}-${cellIndex}`}
                                className="border-b border-zinc-100 px-4 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
                    {stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")}
                  </pre>
                )}

                {sqlErrors && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-mono text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                    {sqlErrors}
                  </pre>
                )}
                {table && <div className="mt-2 text-xs text-zinc-500">{table.rows.length} rows returned</div>}
              </section>
            )}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-purple-700 dark:border-zinc-800 dark:text-purple-400">
                <span>🔬</span>
                Julia Script
              </div>
              <div className="p-4">
                <textarea
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  spellCheck={false}
                  className={`${editorClass} min-h-[360px]`}
                />
                <label className="mb-1.5 mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Standard Input (stdin)</label>
                <textarea
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  onKeyDown={handleStdinKeyDown}
                  placeholder="Optional input for your program..."
                  className={`${editorClass} min-h-[80px]`}
                />
                <button
                  type="button"
                  onClick={runCode}
                  disabled={running}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : "▶"}
                  {running ? "Running..." : "Run Julia"}
                </button>
              </div>
            </section>
            {hasRun ? (
              <OutputPanel result={result} error={error} outputTab={outputTab} setOutputTab={setOutputTab} accent="purple" />
            ) : (
              <section className="rounded-2xl border border-purple-200 bg-white p-4 text-sm text-zinc-500 shadow-sm dark:border-purple-900 dark:bg-zinc-900 dark:text-zinc-500">
                Julia output will appear here after the first run.
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
