"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { apiGet } from "@/lib/api";
import { Button, Checkbox, ErrorCard, Label, Textarea, Input } from "@/components/ui";

type RegexMatch = { start: number; end: number; value: string; groups: (string | null)[] };
type RegexResult = { total_matches: number; matches: RegexMatch[]; truncated?: boolean };

const flagOptions = ["CASE_INSENSITIVE", "MULTILINE", "DOTALL"];

function Highlighted({ text, matches }: { text: string; matches: RegexMatch[] }) {
  const parts = useMemo(() => {
    const output: { text: string; hit: boolean }[] = [];
    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue;
      if (match.start > cursor) output.push({ text: text.slice(cursor, match.start), hit: false });
      output.push({ text: text.slice(match.start, match.end), hit: true });
      cursor = match.end;
    }
    if (cursor < text.length) output.push({ text: text.slice(cursor), hit: false });
    return output;
  }, [matches, text]);
  return (
    <pre className="min-h-32 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      {parts.map((part, idx) => (
        <Fragment key={idx}>{part.hit ? <span className="rounded bg-emerald-100 dark:bg-emerald-900">{part.text}</span> : part.text}</Fragment>
      ))}
    </pre>
  );
}

export default function JavaRegexPage() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [input, setInput] = useState("Email support@wellfriend.online or contact@wellfriend.online");
  const [flags, setFlags] = useState<string[]>(["CASE_INSENSITIVE"]);
  const [result, setResult] = useState<RegexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!pattern || !input) return;
    setLoading(true);
    try {
      setResult(await apiGet<RegexResult>("/tools/java-regex", { pattern, input, flags: flags.join(",") }));
      setError("");
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Java regex request failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(run, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, input, flags.join(",")]);

  const toggleFlag = (flag: string, checked: boolean) => {
    setFlags((current) => checked ? [...current, flag] : current.filter((item) => item !== flag));
  };

  return (
    <ToolShell slug="java-regex">
      <div className="space-y-5">
        <div>
          <Label>Regex pattern</Label>
          <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="\\d+" />
        </div>
        <div className="flex flex-wrap gap-4">
          {flagOptions.map((flag) => <Checkbox key={flag} label={flag} checked={flags.includes(flag)} onChange={(checked) => toggleFlag(flag, checked)} />)}
        </div>
        <div>
          <Label>Test string</Label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={!pattern || !input || loading}>{loading ? "Testing..." : "Test"}</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setResult(null); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {result && (
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {result.total_matches} matches{result.truncated ? " (first 1000 shown)" : ""}
            </div>
            <Highlighted text={input} matches={result.matches} />
            <div className="space-y-2">
              <Label>Matches</Label>
              {result.matches.map((match, idx) => (
                <div key={`${match.start}-${idx}`} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="font-mono text-zinc-900 dark:text-zinc-100">{match.value}</div>
                  <div className="mt-1 text-xs text-zinc-500">Position {match.start} to {match.end}</div>
                  {match.groups.length > 0 && <div className="mt-2 text-xs text-zinc-500">Groups: {match.groups.map((group) => group ?? "null").join(", ")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Regex evaluated using Java 21 (java.util.regex) on the server.</p>
      </div>
    </ToolShell>
  );
}
