"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyboardEvent, Suspense, useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TabBar, ToolShell } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";

type Mode = "sqlite" | "mysql" | "postgresql" | "mongodb";
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

const mysqlCode = `-- MySQL Query
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
SELECT * FROM users;
DROP TABLE IF EXISTS users;`;

const postgresqlCode = `-- PostgreSQL Query
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO products (name, price) VALUES ('Widget', 9.99);
INSERT INTO products (name, price) VALUES ('Gadget', 24.99);
SELECT * FROM products;
DROP TABLE IF EXISTS products;`;

const mongodbCode = `// MongoDB Shell
db.users.drop();
db.users.insertMany([
  { name: "Alice", age: 30, role: "admin" },
  { name: "Bob", age: 25, role: "user" },
  { name: "Carol", age: 35, role: "user" }
]);
db.users.find({}).forEach(doc => print(JSON.stringify(doc)));
print("Total users: " + db.users.countDocuments({}));`;

const defaultCodeByMode: Record<Mode, string> = {
  sqlite: sqliteCode,
  mysql: mysqlCode,
  postgresql: postgresqlCode,
  mongodb: mongodbCode,
};

const modeMeta: Record<
  Mode,
  {
    label: string;
    editorLabel: string;
    runLabel: string;
    icon: JSX.Element;
    activeClass: string;
    runButtonClass: string;
    isDatabase: boolean;
  }
> = {
  sqlite: {
    label: "SQLite",
    editorLabel: "SQL Query",
    runLabel: "Execute Query",
    icon: <svg viewBox="0 0 48 48" className="h-4 w-4"><path d="M36 4c-6 0-12 8-12 20s6 20 12 20c2 0 4-1 4-3V7c0-2-2-3-4-3z" fill="#0F80CC"/><path d="M24 24c0-12-6-20-12-20C8 4 6 5 6 7v34c0 2 2 3 4 3 6 0 14-8 14-20z" fill="#003B57"/></svg>,
    activeClass: "bg-emerald-600 text-white",
    runButtonClass: "bg-emerald-600 hover:bg-emerald-700",
    isDatabase: true,
  },
  mysql: {
    label: "MySQL",
    editorLabel: "MySQL Query",
    runLabel: "▶ Execute MySQL",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-1.08c0 .57-.162 1.02-.486 1.35-.324.33-.762.495-1.308.495-.54 0-.968-.163-1.29-.489-.32-.325-.484-.76-.484-1.307 0-.573.164-1.024.49-1.352.324-.33.765-.494 1.314-.494.54 0 .966.164 1.285.49.32.327.48.762.48 1.307zm-1.818-.72c-.174.205-.262.508-.262.912 0 .395.087.692.26.89.174.2.4.3.68.3.282 0 .508-.1.68-.302.172-.2.258-.495.258-.88 0-.4-.085-.702-.256-.905-.172-.204-.4-.307-.682-.307-.282 0-.507.104-.678.292zm7.21.576h-2.57c.015.548.163.956.444 1.224.28.27.668.403 1.165.403.49 0 .94-.11 1.35-.33v.77c-.41.2-.89.3-1.44.3-.576 0-1.03-.17-1.36-.51-.33-.34-.493-.83-.493-1.45 0-.59.174-1.058.52-1.41.35-.35.79-.53 1.32-.53.55 0 .97.172 1.266.514.296.344.444.827.444 1.452v.166zm-.844-.56c-.02-.348-.1-.61-.243-.785-.145-.178-.352-.266-.625-.266-.27 0-.484.09-.64.27-.16.18-.252.44-.275.78h1.783zm7.447 1.084c0 .57-.162 1.02-.486 1.35-.324.33-.762.495-1.308.495-.54 0-.968-.163-1.29-.489-.32-.325-.484-.76-.484-1.307 0-.573.164-1.024.49-1.352.324-.33.765-.494 1.314-.494.54 0 .966.164 1.285.49.32.327.48.762.48 1.307zm-1.818-.72c-.174.205-.262.508-.262.912 0 .395.087.692.26.89.174.2.4.3.68.3.282 0 .508-.1.68-.302.172-.2.258-.495.258-.88 0-.4-.085-.702-.256-.905-.172-.204-.4-.307-.682-.307-.282 0-.507.104-.678.292z" fill="#4479A1"/></svg>,
    activeClass: "bg-orange-500 text-white",
    runButtonClass: "bg-orange-500 hover:bg-orange-600",
    isDatabase: true,
  },
  postgresql: {
    label: "PostgreSQL",
    editorLabel: "PostgreSQL Query",
    runLabel: "▶ Execute PostgreSQL",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M23.5 12c0 6.351-5.149 11.5-11.5 11.5S.5 18.351.5 12 5.649.5 12 .5 23.5 5.649 23.5 12z" fill="#336791"/><path d="M12 6a6 6 0 100 12A6 6 0 0012 6z" fill="white"/><circle cx="12" cy="12" r="3" fill="#336791"/></svg>,
    activeClass: "bg-blue-600 text-white",
    runButtonClass: "bg-blue-600 hover:bg-blue-700",
    isDatabase: true,
  },
  mongodb: {
    label: "MongoDB",
    editorLabel: "MongoDB Shell",
    runLabel: "▶ Execute MongoDB",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M12 2C12 2 7 8 7 13c0 2.76 2.24 5 5 5s5-2.24 5-5C17 8 12 2 12 2z" fill="#13AA52"/><path d="M12 19v3" stroke="#B8C4BA" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    activeClass: "bg-green-600 text-white",
    runButtonClass: "bg-green-600 hover:bg-green-700",
    isDatabase: true,
  },
};

const editorClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

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
    <section className={`flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border bg-zinc-900 p-4 shadow-xl shadow-zinc-950/10 lg:min-h-0 ${accent === "purple" ? "border-purple-900" : "border-zinc-800"}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["output", "errors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutputTab(tab)}
            className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 md:min-h-0 ${
              outputTab === tab
                ? accent === "purple"
                  ? "bg-purple-600 text-white"
                  : "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
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
      <pre className="min-h-[200px] flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200 lg:min-h-0">
        {outputTab === "output"
          ? stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")
          : errors || <span className="text-zinc-400">No errors.</span>}
      </pre>
      {result && (
        <div className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          CPU: {result.cpu_time ?? "-"}ms · Wall: {result.wall_time ?? "-"}ms · Memory: {memoryKb}KB
        </div>
      )}
    </section>
  );
}

export default function DataRunnerPage() {
  return (
    <Suspense fallback={null}>
      <DataRunnerPageContent />
    </Suspense>
  );
}

function DatabaseResultsPanel({
  hasRun,
  result,
  table,
  stdout,
  queryErrors,
}: {
  hasRun: boolean;
  result: RunResult | null;
  table: TableData | null;
  stdout: string;
  queryErrors: string;
}) {
  return (
    <section className="flex min-h-[250px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[45%]">
      <div className="-m-4 mb-4 border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-100">Results</h2>
      </div>
      {!hasRun ? (
        <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-600 lg:min-h-0">
          Run a query to see results
        </div>
      ) : (
        <>
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
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {table.headers.map((header) => (
                      <th
                        key={header}
                        className="sticky top-0 border-b border-zinc-700 bg-zinc-800 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${row.join("-")}-${rowIndex}`} className={rowIndex % 2 === 1 ? "bg-zinc-950/40" : "bg-zinc-900"}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${cell}-${cellIndex}`}
                          className="border-b border-zinc-800 px-4 py-2 text-sm text-zinc-200"
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
            <pre className="min-h-[200px] flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200 lg:min-h-0">
              {stdout || (result?.exit_code === 0 ? <span className="text-zinc-400">Program exited with no output.</span> : "")}
            </pre>
          )}

          {queryErrors && (
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-mono text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {queryErrors}
            </pre>
          )}
          {table && <div className="mt-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500">{table.rows.length} rows returned</div>}
        </>
      )}
    </section>
  );
}

function DataRunnerPageContent() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
  const [mode, setMode] = useState<Mode>("sqlite");
  const [code, setCode] = useState(sqliteCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const currentMode = modeMeta[mode];

  useEffect(() => {
    if (langParam === "sqlite" || langParam === "mysql" || langParam === "postgresql" || langParam === "mongodb") {
      setMode(langParam);
    }
  }, [langParam]);

  useEffect(() => {
    setCode(defaultCodeByMode[mode]);
    setResult(null);
    setError("");
    setHasRun(false);
  }, [mode]);

  const runCode = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setHasRun(true);
    setResult(null);
    setError("");

    try {
      const request =
        mode === "sqlite"
          ? {
              url: `${API_BASE}/tools/run-code`,
              body: {
                language: "sqlite3",
                version: "3.36.0",
                code,
                stdin: "",
              },
            }
          : mode === "mysql"
              ? {
                  url: `${API_BASE}/tools/run-mysql`,
                  body: {
                    query: code,
                    database: "coderunner_scratch",
                  },
                }
              : mode === "postgresql"
                ? {
                    url: `${API_BASE}/tools/run-postgresql`,
                    body: {
                      query: code,
                      database: "coderunner_scratch",
                    },
                  }
                : {
                    url: `${API_BASE}/tools/run-mongodb`,
                    body: {
                      code,
                      database: "coderunner_scratch",
                    },
                  };

      const res = await fetch(request.url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run code.");
    } finally {
      setRunning(false);
    }
  }, [code, mode, running]);

  function handleCodeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
      return;
    }
    insertTab(code, setCode, event);
  }

  const stdout = result?.stdout || result?.output || "";
  const table = stdout.includes("|") ? parseTable(stdout) : null;
  const queryErrors = [error, result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");

  return (
    <ToolShell className="flex min-h-screen max-w-none flex-col px-0 py-0 sm:px-0 sm:py-0">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-6 sm:px-6 sm:py-10">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>Data Runner</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">Data Runner</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Run SQLite, MySQL, PostgreSQL, and MongoDB workflows for data analysis.</p>
        </header>

        <TabBar
          tabs={(["sqlite", "mysql", "postgresql", "mongodb"] as const).map((value) => ({ value, label: modeMeta[value].label, icon: modeMeta[value].icon }))}
          active={mode}
          onChange={(value) => setMode(value as Mode)}
          className="mt-6 border-b border-zinc-200 pb-3 dark:border-zinc-800"
        />

        <div className="mt-5 flex flex-col gap-2 md:gap-5 lg:h-[calc(100vh-8rem)] lg:min-h-[560px] lg:flex-row">
          <section className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[55%]">
            <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-semibold text-zinc-100">
              {currentMode.icon}
              {currentMode.editorLabel}
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleCodeKeyDown}
              spellCheck={false}
              className={`${editorClass} min-h-[300px] flex-1 resize-y overflow-auto rounded-none border-0 focus:ring-0 lg:min-h-0`}
            />
            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/95 px-3 py-2.5 backdrop-blur md:static md:px-4 md:py-3 md:backdrop-blur-none">
              <button
                type="button"
                onClick={runCode}
                disabled={running}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${currentMode.runButtonClass}`}
              >
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {running ? "Running..." : currentMode.runLabel}
              </button>
              <span className="text-xs text-zinc-500">Ctrl+Enter to run</span>
            </div>
          </section>
          <DatabaseResultsPanel hasRun={hasRun} result={result} table={table} stdout={stdout} queryErrors={queryErrors} />
        </div>
      </div>
    </ToolShell>
  );
}
