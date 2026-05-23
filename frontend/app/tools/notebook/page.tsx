"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, LayoutList, Loader2, Plus, Play, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CodeArea, ToolShell } from "@/components/tool-ui";

type Language = {
  label: string;
  language: string;
  version: string;
  languageId: number;
  template: string;
};

type CellResult = {
  stdout: string;
  stderr: string;
  output: string;
  exit_code: number | null;
  cpu_time: number | null;
  wall_time: number | null;
  memory: number | null;
  compile_output: string;
};

type NotebookCell = {
  id: string;
  code: string;
  result: CellResult | null;
  error: string;
  running: boolean;
};

const STORAGE_KEY = "devtools:notebook";
const languages: Language[] = [
  { label: "Python", language: "python", version: "3.12.0", languageId: 71, template: `print("Hello from a notebook cell")` },
  { label: "JavaScript", language: "javascript", version: "Node.js 20", languageId: 63, template: `console.log("Hello from JavaScript")` },
  { label: "TypeScript", language: "typescript", version: "5.x", languageId: 74, template: `const message: string = "Hello from TypeScript";\nconsole.log(message);` },
  { label: "Ruby", language: "ruby", version: "3.0.1", languageId: 72, template: `puts "Hello from Ruby"` },
  { label: "Bash", language: "bash", version: "5.2.0", languageId: 46, template: `echo "Hello from Bash"` },
  { label: "Java", language: "java", version: "OpenJDK", languageId: 62, template: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java");\n  }\n}` },
];

function createCell(code = languages[0].template): NotebookCell {
  return { id: crypto.randomUUID(), code, result: null, error: "", running: false };
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") return (data as { detail: string }).detail;
  return fallback;
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function NotebookRunnerPage() {
  const [languageIndex, setLanguageIndex] = useState(0);
  const [cells, setCells] = useState<NotebookCell[]>(() => [createCell()]);
  const [runningAll, setRunningAll] = useState(false);
  const [progress, setProgress] = useState("");
  const language = languages[languageIndex];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { languageIndex?: number; cells?: NotebookCell[] };
      if (typeof parsed.languageIndex === "number" && languages[parsed.languageIndex]) setLanguageIndex(parsed.languageIndex);
      if (Array.isArray(parsed.cells) && parsed.cells.length) {
        setCells(parsed.cells.map((cell) => ({ ...cell, running: false, error: cell.error || "" })));
      }
    } catch {
      // ignore restore failures
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ languageIndex, cells: cells.map((cell) => ({ ...cell, running: false })) }));
      } catch {
        // ignore storage failures
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [cells, languageIndex]);

  const totalOutputs = useMemo(() => cells.filter((cell) => cell.result || cell.error).length, [cells]);

  function updateCell(id: string, patch: Partial<NotebookCell>) {
    setCells((current) => current.map((cell) => cell.id === id ? { ...cell, ...patch } : cell));
  }

  function addCell() {
    setCells((current) => [...current, createCell(language.template)]);
  }

  function deleteCell(id: string) {
    setCells((current) => current.length <= 1 ? current : current.filter((cell) => cell.id !== id));
  }

  function moveCell(index: number, direction: -1 | 1) {
    setCells((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function runCell(cell: NotebookCell) {
    updateCell(cell.id, { running: true, error: "", result: null });
    try {
      const res = await fetch(`${API_BASE}/tools/run-code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language: language.language, version: language.version, code: cell.code, stdin: "" }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Run failed with status ${res.status}`));
      updateCell(cell.id, { result: data as CellResult, running: false });
      return data as CellResult;
    } catch (err) {
      updateCell(cell.id, { error: err instanceof Error ? err.message : "Cell failed.", running: false });
      return null;
    }
  }

  async function runAll() {
    setRunningAll(true);
    for (let index = 0; index < cells.length; index += 1) {
      setProgress(`Running cell ${index + 1}/${cells.length}...`);
      const latest = cells[index];
      await runCell(latest);
    }
    setProgress("");
    setRunningAll(false);
  }

  function clearOutputs() {
    setCells((current) => current.map((cell) => ({ ...cell, result: null, error: "", running: false })));
  }

  function newNotebook() {
    setCells([createCell(language.template)]);
    setProgress("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }

  function exportNotebook() {
    downloadJson("devtools-notebook.json", {
      version: 1,
      language: language.language,
      language_id: language.languageId,
      cells: cells.map((cell, index) => ({ index: index + 1, code: cell.code, output: cell.result, error: cell.error })),
      exported_at: new Date().toISOString(),
    });
  }

  return (
    <ToolShell slug="notebook" className="max-w-6xl">
      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <LayoutList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cells.length} cells</p>
              <p className="text-xs text-zinc-500">{totalOutputs} outputs saved locally</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={languageIndex} onChange={(event) => setLanguageIndex(Number(event.target.value))} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
              {languages.map((item, index) => <option key={item.language} value={index}>{item.label}</option>)}
            </select>
            <Button type="button" onClick={newNotebook}>New notebook</Button>
          </div>
        </div>
        {progress && <div className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">{progress}</div>}
      </section>

      <div className="space-y-4">
        {cells.map((cell, index) => (
          <article key={cell.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Cell {index + 1}</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-300">{language.label}</span>
                {cell.running && <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Running</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button type="button" onClick={() => void runCell(cell)} disabled={cell.running || runningAll} className="px-3 py-1.5">
                  {cell.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run
                </Button>
                <IconButton label="Move up" onClick={() => moveCell(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></IconButton>
                <IconButton label="Move down" onClick={() => moveCell(index, 1)} disabled={index === cells.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                <IconButton label="Delete cell" onClick={() => deleteCell(cell.id)} disabled={cells.length <= 1} danger><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </div>
            <CodeArea value={cell.code} onChange={(code) => updateCell(cell.id, { code })} language={language.language} className="min-h-[160px] lg:min-h-[180px]" />
            {(cell.result || cell.error) && (
              <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cell.error || (cell.result?.exit_code ?? 0) !== 0 ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {cell.error || (cell.result?.exit_code ?? 0) !== 0 ? "error" : "success"}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {cell.result && <span>{cell.result.wall_time ?? cell.result.cpu_time ?? 0}ms</span>}
                    <button type="button" onClick={() => updateCell(cell.id, { result: null, error: "" })} className="inline-flex items-center gap-1 font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><X className="h-3.5 w-3.5" />Clear output</button>
                  </div>
                </div>
                {cell.error && <pre className="whitespace-pre-wrap rounded-xl bg-red-950/20 p-3 font-mono text-xs text-red-500">{cell.error}</pre>}
                {cell.result?.stdout && <pre className="whitespace-pre-wrap rounded-xl bg-zinc-950 p-3 font-mono text-xs text-zinc-100">{cell.result.stdout}</pre>}
                {(cell.result?.stderr || cell.result?.compile_output) && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-red-950/20 p-3 font-mono text-xs text-red-500">{[cell.result.stderr, cell.result.compile_output].filter(Boolean).join("\n")}</pre>}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <Button type="button" onClick={addCell}><Plus className="h-4 w-4" />Add cell</Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={clearOutputs}>Clear all outputs</Button>
          <Button type="button" onClick={exportNotebook}><Download className="h-4 w-4" />Export JSON</Button>
          <Button type="button" variant="primary" onClick={() => void runAll()} disabled={runningAll}>
            {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run All
          </Button>
        </div>
      </div>
    </ToolShell>
  );
}

function IconButton({ children, label, onClick, disabled, danger = false }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800 ${danger ? "hover:text-red-500" : "hover:text-zinc-900 dark:hover:text-zinc-100"}`}
    >
      {children}
    </button>
  );
}
