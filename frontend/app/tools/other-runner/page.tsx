"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyboardEvent, ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { TabBar, ToolShell } from "@/components/tool-ui";
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
    label: "Swift",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="10" fill="#F05138"/><path d="M35 27c-2.5 4.5-7.5 7-12.5 6C16 32 11 27 11 21c0 4 2 8 6 10 3 1.5 6.5 1.5 9.5 0C30 29 33 26 35 23c0 0 2 2 0 4z" fill="white"/><path d="M35 18c0-4-3-8-8-10 3 3 4 6 3 9-1 2-3 4-5 5 3-1 7-2 10-4z" fill="white" opacity="0.8"/></svg>,
    language: "swift",
    version: "5.3.3",
    defaultCode: `// Swift 5.3
import Foundation

let languages = ["Swift", "Judge0", "DevTools"]
for name in languages {
    print("Hello from \\(name)!")
}`,
  },
  {
    label: "Fortran",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#734F96"/><path d="M12 12h24v5H17v5h15v5H17v9h-5V12z" fill="white"/></svg>,
    language: "fortran",
    version: "10.2.0",
    defaultCode: `program hello
  implicit none
  integer :: i
  character(len=20), dimension(3) :: languages

  languages = ['Fortran             ', 'Science             ', 'DevTools            ']

  do i = 1, 3
    write(*,*) 'Hello from ', trim(languages(i)), '!'
  end do
end program hello`,
  },
  {
    label: "D",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#B03931"/><path d="M12 12h10c8 0 14 5 14 12s-6 12-14 12H12V12zm5 5v14h5c5 0 9-3 9-7s-4-7-9-7h-5z" fill="white"/></svg>,
    language: "d",
    version: "10.2.0",
    defaultCode: `import std.stdio;

void main() {
    auto languages = ["D", "Systems", "DevTools"];

    foreach (language; languages) {
        writefln("Hello from %s!", language);
    }
}`,
  },
  {
    label: "Haskell",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#5D4F85"/><path d="M6 36l10-12L6 12h6l10 12-10 12H6zm12 0l10-12L18 12h6l10 12-10 12h-6zm14-5h10v-4H32l4-4h-4l-4 4 4 4z" fill="white"/></svg>,
    language: "haskell",
    version: "8.8.1",
    defaultCode: `main :: IO ()
main = do
  let languages = ["Haskell", "Functional", "DevTools"]
  mapM_ (putStrLn . ("Hello from " ++) . (++ "!")) languages`,
  },
  {
    label: "Elixir",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#6E4A7E"/><path d="M24 8c0 0-12 10-12 20 0 7 5 12 12 12s12-5 12-12C36 18 24 8 24 8zm0 26c-3.3 0-6-2.7-6-6 0-5 6-13 6-13s6 8 6 13c0 3.3-2.7 6-6 6z" fill="white"/></svg>,
    language: "elixir",
    version: "1.9.4",
    defaultCode: `languages = ["Elixir", "BEAM", "DevTools"]

Enum.each(languages, fn name ->
  IO.puts("Hello from #{name}!")
end)`,
  },
  {
    label: "Erlang",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#A90533"/><path d="M10 24c0-7 5-13 12-14.5v3c-5 1.5-8 6-8 11.5h-4zm28 0c0 7-5 13-12 14.5v-3c5-1.5 8-6 8-11.5h4zm-16 4h12v3H22v-3zm0-5h8v3h-8v-3z" fill="white"/></svg>,
    language: "erlang",
    version: "22.2",
    defaultCode: `main(_) ->
    Languages = ["Erlang", "BEAM", "DevTools"],
    lists:foreach(fun(Name) ->
        io:format("Hello from ~s!~n", [Name])
    end, Languages).`,
  },
  {
    label: "OCaml",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#EC6813"/><path d="M12 24c0-6.6 5.4-12 12-12 4 0 7.5 2 9.7 5H28c-1.5-1.9-3.8-3-6-3-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.5-1 6-3h5.7C31.5 30 28 32 24 32c-6.6 0-12-5.4-12-8z" fill="white"/></svg>,
    language: "ocaml",
    version: "4.09.0",
    defaultCode: `let languages = ["OCaml"; "Functional"; "DevTools"];;

List.iter (fun name ->
  Printf.printf "Hello from %s!\\n" name
) languages;;`,
  },
  {
    label: "Prolog",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#E61B23"/><path d="M14 12h8c4 0 8 2 8 7 0 3-1.5 5.5-4 6.5L32 36h-5l-5-10h-3v10h-5V12zm5 4v8h3c2 0 3.5-1.5 3.5-4S24 16 22 16h-3z" fill="white"/></svg>,
    language: "prolog",
    version: "1.4.5",
    defaultCode: `:- initialization(main).

main :-
    Languages = ['Prolog', 'Logic', 'DevTools'],
    forall(member(Name, Languages), format('Hello from ~w!~n', [Name])),
    halt.`,
  },
  {
    label: "Octave",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#0790C0"/><path d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S31.7 10 24 10zm0 22c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/></svg>,
    language: "octave",
    version: "5.1.0",
    defaultCode: `languages = {"Octave", "Numerics", "DevTools"};

for i = 1:numel(languages)
  printf("Hello from %s!\\n", languages{i});
end`,
  },
  {
    label: "COBOL",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#005A9C"/><path d="M26 15c-6 0-10 4-10 9s4 9 10 9c3 0 5.5-1.2 7.2-3.2l-2.7-2.1C29.4 29 27.8 30 26 30c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.8 0 3.4 1 4.5 2.3l2.7-2.1C31.5 16.2 29 15 26 15z" fill="white"/></svg>,
    language: "cobol",
    version: "2.2",
    defaultCode: `IDENTIFICATION DIVISION.
PROGRAM-ID. HELLO.
PROCEDURE DIVISION.
    DISPLAY "Hello from COBOL!".
    DISPLAY "Hello from DevTools!".
    STOP RUN.`,
  },
  {
    label: "Common Lisp",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#5D4F85"/><path d="M15 35c5-6 7-14 7-23h5c0 9 2 17 7 23h-5c-2.1-2.8-3.5-6-4.5-9.5C23.5 29 22.1 32.2 20 35h-5z" fill="white"/><path d="M12 16c0-3 2-5 5-5h3v4h-2c-1 0-1.5.5-1.5 1.5S17 18 18 18h2v4h-3c-3 0-5-2-5-5v-1zm24 0c0-3-2-5-5-5h-3v4h2c1 0 1.5.5 1.5 1.5S31 18 30 18h-2v4h3c3 0 5-2 5-5v-1z" fill="white" opacity="0.85"/></svg>,
    language: "commonlisp",
    version: "2.0.0",
    defaultCode: `(defparameter *languages* '("Common Lisp" "Macros" "DevTools"))

(dolist (name *languages*)
  (format t "Hello from ~a!~%" name))`,
  },
  {
    label: "Objective-C",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#438EFF"/><path d="M24 12c-6.6 0-12 5.4-12 12s5.4 12 12 12c3.5 0 6.6-1.5 8.8-3.8l-3-2.6C28.4 31.1 26.3 32 24 32c-4.4 0-8-3.6-8-8s3.6-8 8-8c2.3 0 4.4.9 5.8 2.4l3-2.6C30.6 13.5 27.5 12 24 12z" fill="white"/><path d="M32 19h4v10h-4z" fill="white"/><path d="M30 23h8v4h-8z" fill="white"/></svg>,
    language: "objectivec",
    version: "7.0.1",
    defaultCode: `#import <Foundation/Foundation.h>

int main(void) {
    @autoreleasepool {
        NSArray *languages = @[@"Objective-C", @"Foundation", @"DevTools"];
        for (NSString *name in languages) {
            NSLog(@"Hello from %@!", name);
        }
    }
    return 0;
}`,
  },
  {
    label: "Assembly NASM",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#6E4C13"/><path d="M10 36l6-24h4l4 16 4-16h4l6 24h-4l-4-16-4 16h-4l-4-16-4 16h-4z" fill="#F8C518"/></svg>,
    language: "nasm",
    version: "2.14.02",
    defaultCode: `section .data
    message db "Hello from NASM!", 10
    length equ $ - message

section .text
    global _start

_start:
    mov eax, 4
    mov ebx, 1
    mov ecx, message
    mov edx, length
    int 0x80

    mov eax, 1
    xor ebx, ebx
    int 0x80`,
  },
  {
    label: "Pascal",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#0070C5"/><path d="M12 12h14c4 0 8 2.5 8 7.5S30 27 26 27H17v9h-5V12zm5 5v10h7c2 0 4-1.5 4-5s-2-5-4-5h-7z" fill="white"/></svg>,
    language: "pascal",
    version: "3.0.4",
    defaultCode: `program Hello;
var
  i: Integer;
  languages: array[1..3] of String = ('Pascal', 'Classic', 'DevTools');
begin
  for i := 1 to 3 do
    Writeln('Hello from ', languages[i], '!');
end.`,
  },
  {
    label: "Visual Basic",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#512BD4"/><path d="M12 14h8c3 0 5 1.5 5 4 0 1.5-.8 2.8-2 3.5 1.5.7 2.5 2 2.5 3.8 0 2.8-2.2 4.7-5.5 4.7H12V14zm4 6.5h3c1 0 1.8-.7 1.8-1.8S20 17 19 17h-3v3.5zm0 7h3.5c1.2 0 2-.8 2-2s-.8-2-2-2H16V27.5zm16-13.5l-6 12h3l1-2.5h5l1 2.5h3l-6-12h-1zm.5 7l1.5-4 1.5 4H32.5z" fill="white"/></svg>,
    language: "vb",
    version: "0.0.0.5943",
    defaultCode: `Imports System

Public Module Program
    Public Sub Main()
        Dim languages = {"Visual Basic", ".NET", "DevTools"}

        For Each name In languages
            Console.WriteLine("Hello from " & name & "!")
        Next
    End Sub
End Module`,
  },
  {
    label: "F#",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#378BBA"/><path d="M12 24l12-12 12 12-12 12-12-12zm12-6l-6 6 6 6 6-6-6-6z" fill="white"/></svg>,
    language: "fsharp",
    version: "3.1.202",
    defaultCode: `let languages = [ "F#"; "Functional"; "DevTools" ]

languages
|> List.iter (fun name -> printfn "Hello from %s!" name)`,
  },
  {
    label: "Groovy",
    icon: <svg viewBox="0 0 48 48" className="h-6 w-6"><rect width="48" height="48" rx="4" fill="#4298B8"/><path d="M24 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14S32 10 24 10zm0 22c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
    language: "groovy",
    version: "3.0.3",
    defaultCode: `def languages = ["Groovy", "JVM", "DevTools"]

languages.each { name ->
    println "Hello from $name!"
}`,
  },
];

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

function OutputPanel({
  result,
  error,
  outputTab,
  setOutputTab,
  hasRun,
}: {
  result: RunResult | null;
  error: string;
  outputTab: OutputTab;
  setOutputTab: (tab: OutputTab) => void;
  hasRun: boolean;
}) {
  const stdout = result?.stdout || result?.output || "";
  const errors = [result?.stderr, result?.compile_output, result?.compile_stderr].filter(Boolean).join("\n");
  const memoryKb = result?.memory == null ? "-" : Math.round(result.memory / 1000).toString();

  return (
    <section className="flex min-h-[250px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[45%]">
      <div className="-m-4 mb-4 flex flex-wrap gap-2 border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
        {(["output", "errors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutputTab(tab)}
            className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 md:min-h-0 ${
              outputTab === tab
                ? "bg-emerald-600 text-white shadow shadow-emerald-600/20"
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
        {!hasRun
          ? "Select a language and run code to see output."
          : outputTab === "output"
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

function OtherRunnerPageContent() {
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
  const [outputTab, setOutputTab] = useState<OutputTab>("output");

  useEffect(() => {
    if (!langParam) return;
    const index = languages.findIndex((language) => language.language === langParam);
    if (index !== -1) setActiveIndex(index);
  }, [langParam]);

  useEffect(() => {
    setCode(active.defaultCode);
    setStdin("");
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

  return (
    <ToolShell className="max-w-none px-0 py-0 sm:px-0 sm:py-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-10">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tools
          </Link>
          <span>/</span>
          <span>Code Runners</span>
          <span>/</span>
          <span>Other Languages</span>
        </nav>

        <header>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">Other Languages</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Run additional compiled, functional, scientific, and JVM languages.</p>
        </header>

        <TabBar
          tabs={languages.map((language, index) => ({ value: String(index), label: language.label, icon: language.icon, badge: index === activeIndex ? language.version : undefined }))}
          active={String(activeIndex)}
          onChange={(value) => setActiveIndex(Number(value))}
          className="border-b border-zinc-200 pb-3 dark:border-zinc-800"
        />

        <div className="flex flex-col gap-2 md:gap-5 lg:h-[calc(100vh-8rem)] lg:min-h-[560px] lg:flex-row">
          <section className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-zinc-950/10 lg:min-h-0 lg:basis-[55%]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">{active.icon}<span>{active.label}</span></h2>
              <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                {active.language} {active.version}
              </span>
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleCodeKeyDown}
              spellCheck={false}
              className="min-h-[300px] w-full flex-1 resize-y overflow-auto border-0 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none transition-colors duration-200 lg:min-h-0"
            />

            <details className="border-t border-zinc-800 bg-zinc-900/80 p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300 transition-colors duration-200 hover:text-zinc-100">Standard Input (stdin)</summary>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                onKeyDown={handleStdinKeyDown}
                placeholder="Optional input for your program..."
                className={`${editorClass} mt-3 min-h-[90px] resize-y`}
              />
            </details>

            <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 border-t border-zinc-800 bg-zinc-900/95 px-3 py-2.5 backdrop-blur md:static md:px-4 md:py-3 md:backdrop-blur-none">
              <button
                type="button"
                onClick={runCode}
                disabled={running}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span className="hidden sm:inline">{running ? "Running..." : "Run"}</span>
              </button>
              <span className="text-xs text-zinc-400 dark:text-zinc-600">Ctrl+Enter to run</span>
            </div>
          </section>

          <OutputPanel result={result} error={error} outputTab={outputTab} setOutputTab={setOutputTab} hasRun={hasRun} />
        </div>
      </div>
    </ToolShell>
  );
}

export default function OtherRunnerPage() {
  return (
    <Suspense fallback={null}>
      <OtherRunnerPageContent />
    </Suspense>
  );
}
