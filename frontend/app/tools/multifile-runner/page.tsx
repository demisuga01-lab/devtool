"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { Files, Plus, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { ActionBar, Button, CodeArea, ErrorCard, OutputPanel, RunButton, StdinSection, ToolShell } from "@/components/tool-ui";

type ProjectFile = {
  id: string;
  filename: string;
  content: string;
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
  status_description?: string;
};

type OutputTab = "output" | "errors";

const languages = [
  {
    label: "Python",
    languageId: 71,
    badge: "py",
    files: [
      { filename: "main.py", content: `from utils import greet\n\nprint(greet(\"DevTools\"))\n` },
      { filename: "utils.py", content: `def greet(name: str) -> str:\n    return f\"Hello, {name}!\"\n` },
    ],
  },
  {
    label: "JavaScript",
    languageId: 63,
    badge: "js",
    files: [
      { filename: "main.js", content: `const { greet } = require("./utils");\n\nconsole.log(greet("DevTools"));\n` },
      { filename: "utils.js", content: `exports.greet = (name) => \`Hello, \${name}!\`;\n` },
    ],
  },
  {
    label: "TypeScript",
    languageId: 74,
    badge: "ts",
    files: [
      { filename: "main.ts", content: `import { greet } from "./utils";\n\nconsole.log(greet("DevTools"));\n` },
      { filename: "utils.ts", content: `export function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n` },
    ],
  },
  {
    label: "Java",
    languageId: 62,
    badge: "java",
    files: [
      { filename: "Main.java", content: `public class Main {\n  public static void main(String[] args) {\n    Greeter greeter = new Greeter();\n    System.out.println(greeter.greet("DevTools"));\n  }\n}\n` },
      { filename: "Greeter.java", content: `public class Greeter {\n  public String greet(String name) {\n    return "Hello, " + name + "!";\n  }\n}\n` },
    ],
  },
  {
    label: "C",
    languageId: 50,
    badge: "c",
    files: [
      { filename: "main.c", content: `#include <stdio.h>\n#include "greet.h"\n\nint main(void) {\n  printf("%s\\n", greet("DevTools"));\n  return 0;\n}\n` },
      { filename: "greet.h", content: `const char* greet(const char* name);\n` },
      { filename: "greet.c", content: `#include <stdio.h>\n\nconst char* greet(const char* name) {\n  static char buffer[128];\n  snprintf(buffer, sizeof(buffer), "Hello, %s!", name);\n  return buffer;\n}\n` },
    ],
  },
  {
    label: "C++",
    languageId: 54,
    badge: "cpp",
    files: [
      { filename: "main.cpp", content: `#include <iostream>\n#include "greet.hpp"\n\nint main() {\n  std::cout << greet("DevTools") << std::endl;\n  return 0;\n}\n` },
      { filename: "greet.hpp", content: `#include <string>\nstd::string greet(const std::string& name);\n` },
      { filename: "greet.cpp", content: `#include "greet.hpp"\n\nstd::string greet(const std::string& name) {\n  return "Hello, " + name + "!";\n}\n` },
    ],
  },
  {
    label: "Go",
    languageId: 60,
    badge: "go",
    files: [
      { filename: "main.go", content: `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println(greet("DevTools"))\n}\n` },
      { filename: "greet.go", content: `package main\n\nfunc greet(name string) string {\n  return "Hello, " + name + "!"\n}\n` },
    ],
  },
  {
    label: "Rust",
    languageId: 73,
    badge: "rs",
    files: [
      { filename: "main.rs", content: `mod greet;\n\nfn main() {\n    println!("{}", greet::greet("DevTools"));\n}\n` },
      { filename: "greet.rs", content: `pub fn greet(name: &str) -> String {\n    format!("Hello, {}!", name)\n}\n` },
    ],
  },
];

function withIds(files: { filename: string; content: string }[]): ProjectFile[] {
  return files.map((file) => ({ ...file, id: crypto.randomUUID() }));
}

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") return (data as { detail: string }).detail;
  return fallback;
}

export default function MultifileRunnerPage() {
  const [languageIndex, setLanguageIndex] = useState(0);
  const [files, setFiles] = useState<ProjectFile[]>(() => withIds(languages[0].files));
  const [activeId, setActiveId] = useState(files[0]?.id ?? "");
  const [mainFile, setMainFile] = useState(languages[0].files[0].filename);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("output");
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState("");

  const language = languages[languageIndex];
  const activeFile = useMemo(() => files.find((file) => file.id === activeId) ?? files[0], [activeId, files]);
  const stderr = [result?.stderr, result?.compile_output, result?.compile_stderr, result?.status_description].filter(Boolean).join("\n");

  function changeLanguage(index: number) {
    const next = languages[index];
    const nextFiles = withIds(next.files);
    setLanguageIndex(index);
    setFiles(nextFiles);
    setActiveId(nextFiles[0]?.id ?? "");
    setMainFile(nextFiles[0]?.filename ?? "");
    setResult(null);
    setError("");
    setHasRun(false);
  }

  function updateActive(patch: Partial<ProjectFile>) {
    if (!activeFile) return;
    setFiles((current) => current.map((file) => {
      if (file.id !== activeFile.id) return file;
      const next = { ...file, ...patch };
      if (patch.filename && file.filename === mainFile) setMainFile(patch.filename);
      return next;
    }));
  }

  function addFile() {
    const extension = language.badge === "cpp" ? "cpp" : language.badge;
    const file = { id: crypto.randomUUID(), filename: `file${files.length + 1}.${extension}`, content: "" };
    setFiles((current) => [...current, file]);
    setActiveId(file.id);
  }

  function removeFile(id: string) {
    if (files.length <= 1) return;
    const next = files.filter((file) => file.id !== id);
    setFiles(next);
    if (activeId === id) setActiveId(next[0]?.id ?? "");
    if (!next.some((file) => file.filename === mainFile)) setMainFile(next[0]?.filename ?? "");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runProject();
    }
  }

  async function runProject() {
    setRunning(true);
    setHasRun(true);
    setResult(null);
    setError("");
    setOutputTab("output");
    try {
      const res = await fetch(`${API_BASE}/tools/run-multifile`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          language_id: language.languageId,
          files: files.map((file) => ({ filename: file.filename, content: file.content })),
          main_file: mainFile,
          stdin,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Run failed with status ${res.status}`));
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run project.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ToolShell slug="multifile-runner" className="max-w-none">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 lg:grid-cols-[220px_minmax(0,1fr)_220px_auto]">
            <select value={languageIndex} onChange={(event) => changeLanguage(Number(event.target.value))} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
              {languages.map((item, index) => <option key={item.languageId} value={index}>{item.label}</option>)}
            </select>
            <select value={mainFile} onChange={(event) => setMainFile(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
              {files.map((file) => <option key={file.id} value={file.filename}>{file.filename}</option>)}
            </select>
            <Button type="button" onClick={addFile}><Plus className="h-4 w-4" />Add file</Button>
            <RunButton running={running} onClick={runProject} disabled={!files.length || !mainFile} />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-3 dark:border-zinc-800">
            {files.map((file) => {
              const active = file.id === activeFile?.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setActiveId(file.id)}
                  className={`group relative flex max-w-64 shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 text-sm ${active ? "translate-y-px border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50" : "border-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                >
                  <Files className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate font-medium">{file.filename}</span>
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">{language.badge}</span>
                  {files.length > 1 && (
                    <span onClick={(event) => { event.stopPropagation(); removeFile(file.id); }} className="rounded-md p-1 text-zinc-400 hover:bg-red-500/10 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
                </button>
              );
            })}
          </div>

          {activeFile && (
            <>
              <div className="grid gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={activeFile.filename}
                  onChange={(event) => updateActive({ filename: event.target.value })}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <Button type="button" variant="danger" onClick={() => removeFile(activeFile.id)} disabled={files.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
              <CodeArea value={activeFile.content} onChange={(content) => updateActive({ content })} language={language.badge} onKeyDown={handleKeyDown} className="min-h-[520px]" />
              <StdinSection value={stdin} onChange={setStdin} onKeyDown={handleKeyDown} />
              <ActionBar>
                <span className="text-xs text-zinc-500">Main file: {mainFile}</span>
                <RunButton running={running} onClick={runProject} disabled={!mainFile} />
              </ActionBar>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
          {error && <div className="p-4"><ErrorCard>{error}</ErrorCard></div>}
          <OutputPanel
            hasRun={hasRun}
            stdout={result?.stdout || result?.output || ""}
            stderr={stderr}
            error={error}
            exitCode={result?.exit_code ?? null}
            signal={result?.signal ?? null}
            cpuTime={result?.cpu_time ?? result?.wall_time ?? null}
            wallTime={result?.wall_time ?? null}
            memory={result?.memory ?? null}
            activeTab={outputTab}
            onTabChange={setOutputTab}
          />
        </section>
      </div>
    </ToolShell>
  );
}
