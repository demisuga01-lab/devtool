"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Play, Trophy, XCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Select } from "@/components/ui";
import { CodeArea } from "@/components/tool-ui";

type Props = {
  params: Promise<{ id: string }>;
};

type TestCase = {
  id: string;
  input?: string;
  expected_output?: string;
  is_hidden: boolean;
  points: number;
  sort_order: number;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  language_ids: number[];
  template_code: Record<string, string>;
  test_cases: TestCase[];
  visible_test_count: number;
  hidden_test_count: number;
};

type SubmissionResult = {
  id: string;
  total_passed: number;
  total_tests: number;
  score: number;
  time_ms: number;
  memory_kb: number;
  results: Array<{
    index: number;
    hidden: boolean;
    passed: boolean;
    status: string;
    input?: string;
    expected_output?: string;
    actual_output?: string;
    stderr?: string;
    time_ms: number;
    points: number;
  }>;
};

const languageOptions = [
  { id: 71, label: "Python", language: "python", template: "# Write your solution here\n" },
  { id: 63, label: "JavaScript", language: "javascript", template: "// Write your solution here\n" },
  { id: 74, label: "TypeScript", language: "typescript", template: "// Write your solution here\n" },
  { id: 62, label: "Java", language: "java", template: "public class Main {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n" },
  { id: 54, label: "C++", language: "cpp", template: "#include <iostream>\nint main() {\n  return 0;\n}\n" },
  { id: 50, label: "C", language: "c", template: "#include <stdio.h>\nint main(void) {\n  return 0;\n}\n" },
  { id: 60, label: "Go", language: "go", template: "package main\n\nfunc main() {\n}\n" },
  { id: 73, label: "Rust", language: "rust", template: "fn main() {\n}\n" },
];

const difficultyClass = {
  easy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "bg-red-500/10 text-red-700 dark:text-red-300",
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") return (data as { detail: string }).detail;
  return fallback;
}

function languageLabel(id: number) {
  return languageOptions.find((item) => item.id === id)?.label ?? String(id);
}

function markdownBlocks(markdown: string) {
  return markdown.split(/\n{2,}/).map((block, index) => {
    const text = block.trim();
    if (!text) return null;
    if (text.startsWith("## ")) return <h2 key={index} className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{text.slice(3)}</h2>;
    if (text.startsWith("# ")) return <h2 key={index} className="mt-5 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{text.slice(2)}</h2>;
    return <p key={index} className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">{text.replace(/\*\*/g, "")}</p>;
  });
}

export default function ChallengeViewPage({ params }: Props) {
  const { id } = use(params);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [languageId, setLanguageId] = useState<number>(71);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"visible" | "all" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/challenges/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, "Could not load challenge."));
        const next = data as Challenge;
        if (cancelled) return;
        setChallenge(next);
        const firstLanguage = next.language_ids[0] ?? 71;
        setLanguageId(firstLanguage);
        const option = languageOptions.find((item) => item.id === firstLanguage);
        setCode(next.template_code[String(firstLanguage)] || option?.template || "");
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load challenge.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const language = useMemo(() => languageOptions.find((item) => item.id === languageId) ?? languageOptions[0], [languageId]);
  const visibleCases = challenge?.test_cases.filter((testCase) => !testCase.is_hidden) ?? [];
  const passPercent = result && result.total_tests > 0 ? Math.round((result.total_passed / result.total_tests) * 100) : 0;

  function changeLanguage(nextId: number) {
    setLanguageId(nextId);
    const option = languageOptions.find((item) => item.id === nextId);
    setCode(challenge?.template_code[String(nextId)] || option?.template || "");
  }

  async function submit(visibleOnly: boolean) {
    setSubmitting(visibleOnly ? "visible" : "all");
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/challenges/${encodeURIComponent(id)}/submit`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: languageId, source_code: code, visible_only: visibleOnly }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, "Submission failed."));
      setResult(data as SubmissionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading challenge
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <ErrorCard>{error || "Challenge unavailable."}</ErrorCard>
        <Link href="/tools/challenges" className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Back to challenges</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <Link href="/tools/challenges" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Back to challenges</Link>
      </div>
      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyClass[challenge.difficulty]}`}>{challenge.difficulty}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800">{challenge.visible_test_count} visible tests</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800">{challenge.hidden_test_count} hidden tests</span>
          </div>
          <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{challenge.title}</h1>
          <div className="mt-4">{markdownBlocks(challenge.description)}</div>

          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Visible test cases</h2>
            <div className="mt-3 space-y-3">
              {visibleCases.map((testCase, index) => (
                <div key={testCase.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Case {index + 1}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CodeBox label="Input" value={testCase.input || "(empty)"} />
                    <CodeBox label="Expected Output" value={testCase.expected_output || ""} />
                  </div>
                </div>
              ))}
              {!visibleCases.length && <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">No visible test cases.</p>}
            </div>
            {challenge.hidden_test_count > 0 && <p className="mt-3 text-sm text-zinc-500">{challenge.hidden_test_count} hidden test cases will run on submit.</p>}
          </div>
        </section>

        <section className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">Solution</span>
              </div>
              <Select value={languageId} onChange={(event) => changeLanguage(Number(event.target.value))}>
                {challenge.language_ids.map((idValue) => <option key={idValue} value={idValue}>{languageLabel(idValue)}</option>)}
              </Select>
            </div>
            <CodeArea value={code} onChange={setCode} language={language.language} className="min-h-[520px]" />
            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
              <Button type="button" onClick={() => void submit(true)} disabled={Boolean(submitting)}>
                {submitting === "visible" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run visible tests
              </Button>
              <Button type="button" variant="primary" onClick={() => void submit(false)} disabled={Boolean(submitting)}>
                {submitting === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>

          {result && (
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">Results</h2>
                  <p className="text-sm text-zinc-500">{result.total_passed}/{result.total_tests} tests passed. Score {result.score}. {Math.round(result.time_ms)}ms.</p>
                </div>
                <Button type="button" onClick={() => setResult(null)}>Try again</Button>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${passPercent}%` }} />
              </div>
              <div className="space-y-3">
                {result.results.map((row) => (
                  <div key={`${row.index}-${row.hidden}`} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {row.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        Test {row.index} {row.hidden ? "(hidden)" : ""}
                      </div>
                      <span className="text-xs text-zinc-500">{row.time_ms}ms</span>
                    </div>
                    {row.hidden ? (
                      <p className="text-sm text-zinc-500">Hidden test {row.passed ? "passed" : "failed"}.</p>
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-3">
                        <CodeBox label="Input" value={row.input || "(empty)"} />
                        <CodeBox label="Expected" value={row.expected_output || ""} />
                        <CodeBox label="Actual" value={row.actual_output || row.stderr || ""} error={!row.passed} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

function CodeBox({ label, value, error = false }: { label: string; value: string; error?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <pre className={`min-h-20 whitespace-pre-wrap rounded-xl border p-3 font-mono text-xs ${error ? "border-red-500 bg-red-950/10 text-red-500" : "border-zinc-200 bg-zinc-950 text-zinc-100 dark:border-zinc-800"}`}>{value}</pre>
    </div>
  );
}
