"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Braces, Code2, Coffee, Replace, Search } from "lucide-react";
import { Badge, CopyButton, ResultCard } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { NewToolPage } from "../_components/new-tool-pages";
import {
  FieldLabel,
  PrimaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "javascript" | "java" | "escape" | "replace" | "cheatsheet";
type Flag = "g" | "i" | "m" | "s" | "u";
type MatchInfo = { match: string; index: number; groups: string[]; named?: Record<string, string> };
type JavaMatch = { start: number; end: number; value: string; groups: (string | null)[] };
type JavaResult = { total_matches: number; matches: JavaMatch[]; truncated?: boolean };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "javascript", label: "JavaScript", icon: Code2 },
  { id: "java", label: "Java", icon: Coffee },
  { id: "escape", label: "Escape", icon: Braces },
  { id: "replace", label: "Replace", icon: Replace },
  { id: "cheatsheet", label: "Cheatsheet", icon: BookOpen },
];

const jsFlags: Flag[] = ["g", "i", "m", "s", "u"];
const javaFlags = ["CASE_INSENSITIVE", "MULTILINE", "DOTALL"];

export default function RegexWorkspacePage() {
  const [active, setActive] = useState<Tab>("javascript");

  return (
    <WorkspaceShell
      title="Regex Tools"
      subtitle="Test, escape, replace, and learn regular expressions"
      href="/tools/regex"
      icon={Search}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="regex"
      intentGroup="text"
    >
      {active === "javascript" && <JavaScriptRegexTab />}
      {active === "java" && <JavaRegexTab />}
      {active === "escape" && <RegexEscapeTab />}
      {active === "replace" && <NewToolPage slug="regex-replace" embedded />}
      {active === "cheatsheet" && <CheatsheetTab />}
    </WorkspaceShell>
  );
}

function JavaScriptRegexTab() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState<Record<Flag, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const [input, setInput] = useState("Email support@example.com or billing@example.com");
  const flagString = jsFlags.filter((flag) => flags[flag]).join("");
  const result = useMemo(() => evaluateRegex(pattern, flagString, input), [flagString, input, pattern]);

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <FieldLabel>Pattern</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">/</span>
              <input value={pattern} onChange={(event) => setPattern(event.target.value)} className={`${monoInputClass} ${result.error ? "border-red-500" : ""}`} />
              <span className="font-mono text-muted-foreground">/{flagString}</span>
            </div>
            {result.error && <p className="mt-2 text-sm text-red-500">{result.error}</p>}
          </div>
          <div>
            <FieldLabel>Flags</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {jsFlags.map((flag) => (
                <button key={flag} type="button" onClick={() => setFlags((current) => ({ ...current, [flag]: !current[flag] }))} className={`rounded-lg border border-border px-3 py-2 font-mono text-sm ${flags[flag] ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}>{flag}</button>
              ))}
            </div>
          </div>
        </div>
      </WorkspaceCard>
      <div>
        <FieldLabel>Test string</FieldLabel>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={10} className={`${textareaClass} min-h-[200px]`} />
      </div>
      <HighlightedText text={input} matches={result.matches.map((match) => ({ start: match.index, end: match.index + match.match.length }))} />
      <MatchResults matches={result.matches} flagString={flagString} />
    </div>
  );
}

function JavaRegexTab() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [input, setInput] = useState("Email support@example.com or billing@example.com");
  const [flags, setFlags] = useState<string[]>(["CASE_INSENSITIVE"]);
  const [result, setResult] = useState<JavaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!pattern.trim() || !input.trim()) {
      setError("Pattern and test string are required.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await apiGet<JavaResult>("/tools/java-regex", { pattern, input, flags: flags.join(",") }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Java regex request failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, input, flags.join(",")]);

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-3">
        <div><FieldLabel>Java regex pattern</FieldLabel><input value={pattern} onChange={(event) => setPattern(event.target.value)} className={`${monoInputClass} ${error ? "border-red-500" : ""}`} /></div>
        <div className="flex flex-wrap gap-3">
          {javaFlags.map((flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={flags.includes(flag)} onChange={(event) => setFlags((items) => event.target.checked ? [...items, flag] : items.filter((item) => item !== flag))} /> {flag}</label>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </WorkspaceCard>
      <div><FieldLabel>Test string</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={10} className={textareaClass} /></div>
      <PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Testing..." : "Test"}</PrimaryButton>
      {loading && <div className="h-24 animate-pulse rounded-lg border border-border bg-white dark:bg-zinc-900" />}
      {result && (
        <>
          <HighlightedText text={input} matches={result.matches.map((match) => ({ start: match.start, end: match.end }))} />
          <WorkspaceCard>
            <div className="mb-3"><Badge variant="success">{result.total_matches} matches{result.truncated ? " (truncated)" : ""}</Badge></div>
            <div className="space-y-2">
              {result.matches.map((match, index) => (
                <div key={`${match.start}-${index}`} className="rounded-lg border border-border p-3">
                  <code className="font-mono text-sm text-foreground">{match.value}</code>
                  <p className="text-xs text-muted-foreground">Position {match.start} to {match.end}</p>
                  {match.groups.length > 0 && <p className="text-xs text-muted-foreground">Groups: {match.groups.map((group) => group ?? "null").join(", ")}</p>}
                </div>
              ))}
            </div>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

function RegexEscapeTab() {
  const [input, setInput] = useState("hello. (devtools) [a-z]+?");
  const js = escapeRegex(input);
  const java = js.replace(/\\/g, "\\\\");
  const sql = input.replace(/[\\%_]/g, (char) => `\\${char}`);
  const escaped = Array.from(input).filter((char) => /[\\^$.*+?()[\]{}|]/.test(char));

  return (
    <div className="space-y-5">
      <div><FieldLabel>Enter text to escape for use in regex</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={6} className={textareaClass} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <ResultCard label="JavaScript escaped" value={`/${js}/`} copyable mono />
        <ResultCard label="Python escaped" value={`r"${js}"`} copyable mono />
        <ResultCard label="Java escaped" value={`"${java}"`} copyable mono />
        <ResultCard label="SQL LIKE escaped" value={sql} copyable mono />
      </div>
      <WorkspaceCard>
        <FieldLabel>Escaped characters</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {escaped.length ? escaped.map((char, index) => <Badge key={`${char}-${index}`} variant="info">{char} is regex syntax</Badge>) : <Badge variant="success">No regex syntax characters found</Badge>}
        </div>
      </WorkspaceCard>
    </div>
  );
}

function CheatsheetTab() {
  const [query, setQuery] = useState("");
  const entries = cheatsheetEntries.filter((entry) => `${entry.section} ${entry.syntax} ${entry.description} ${entry.example}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div><FieldLabel>Search cheatsheet</FieldLabel><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((entry) => (
          <WorkspaceCard key={`${entry.section}-${entry.syntax}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{entry.section}</p>
            <code className="mt-2 block font-mono text-sm text-foreground">{entry.syntax}</code>
            <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
            <p className="mt-2 font-mono text-xs text-emerald-600 dark:text-emerald-400">{entry.example}</p>
          </WorkspaceCard>
        ))}
      </div>
    </div>
  );
}

function evaluateRegex(pattern: string, flags: string, input: string) {
  if (!pattern) return { matches: [] as MatchInfo[], error: "" };
  try {
    const regex = new RegExp(pattern, flags);
    const matches: MatchInfo[] = [];
    if (regex.global) {
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(input)) !== null) {
        matches.push({ match: match[0], index: match.index, groups: match.slice(1), named: match.groups });
        if (match[0] === "") re.lastIndex++;
        if (matches.length > 1000) break;
      }
    } else {
      const match = regex.exec(input);
      if (match) matches.push({ match: match[0], index: match.index, groups: match.slice(1), named: match.groups });
    }
    return { matches, error: "" };
  } catch (err) {
    return { matches: [] as MatchInfo[], error: err instanceof Error ? err.message : "Invalid regular expression." };
  }
}

function HighlightedText({ text, matches }: { text: string; matches: { start: number; end: number }[] }) {
  let cursor = 0;
  const parts: ReactNode[] = [];
  matches.forEach((match, index) => {
    if (match.start < cursor) return;
    parts.push(text.slice(cursor, match.start));
    parts.push(<mark key={index} className="rounded bg-emerald-200 px-0.5 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100">{text.slice(match.start, match.end)}</mark>);
    cursor = match.end;
  });
  parts.push(text.slice(cursor));
  const lines = text.split(/\r?\n/).length;

  return (
    <WorkspaceCard className="overflow-auto bg-zinc-950 text-zinc-100">
      <pre className="flex font-mono text-sm leading-relaxed">
        <span className="mr-4 select-none text-right text-zinc-600">{Array.from({ length: lines }, (_, i) => <Fragment key={i}>{i + 1}<br /></Fragment>)}</span>
        <span className="whitespace-pre-wrap">{parts}</span>
      </pre>
    </WorkspaceCard>
  );
}

function MatchResults({ matches, flagString }: { matches: MatchInfo[]; flagString: string }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ResultCard label="Match count" value={String(matches.length)} />
        <ResultCard label="Capture groups" value={String(Math.max(0, ...matches.map((match) => match.groups.length)))} />
        <ResultCard label="Flags" value={flagString || "-"} />
      </div>
      <WorkspaceCard>
        <FieldLabel>Matches</FieldLabel>
        <div className="mt-2 space-y-2">
          {matches.length ? matches.map((match, index) => (
            <div key={`${match.index}-${index}`} className="rounded-lg border border-border p-3">
              <code className="font-mono text-sm text-foreground">{match.match}</code>
              <p className="text-xs text-muted-foreground">Index {match.index}</p>
              {match.groups.length > 0 && <p className="text-xs text-muted-foreground">Groups: {match.groups.map((group, i) => `$${i + 1}=${group}`).join(", ")}</p>}
              {match.named && <p className="text-xs text-muted-foreground">Named: {JSON.stringify(match.named)}</p>}
            </div>
          )) : <p className="text-sm text-muted-foreground">No matches yet.</p>}
        </div>
      </WorkspaceCard>
    </div>
  );
}

function escapeRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

const cheatsheetEntries = [
  { section: "Anchors", syntax: "^", description: "Start of string or line with multiline mode.", example: "^hello" },
  { section: "Anchors", syntax: "$", description: "End of string or line with multiline mode.", example: "world$" },
  { section: "Character Classes", syntax: "\\d", description: "Any digit.", example: "\\d{4}" },
  { section: "Character Classes", syntax: "\\w", description: "Word character.", example: "\\w+" },
  { section: "Character Classes", syntax: "[abc]", description: "One character from the set.", example: "[aeiou]" },
  { section: "Quantifiers", syntax: "* + ?", description: "Zero or more, one or more, optional.", example: "colou?r" },
  { section: "Quantifiers", syntax: "{n,m}", description: "Repeat between n and m times.", example: "\\d{2,4}" },
  { section: "Groups", syntax: "(...)", description: "Capture a group.", example: "(\\w+)@(\\w+)" },
  { section: "Groups", syntax: "(?:...)", description: "Group without capturing.", example: "(?:https?)://" },
  { section: "Lookaround", syntax: "(?=...)", description: "Positive lookahead.", example: "\\w+(?=;)" },
  { section: "Lookaround", syntax: "(?<=...)", description: "Positive lookbehind.", example: "(?<=#)\\w+" },
  { section: "Flags", syntax: "g i m s u", description: "Global, case-insensitive, multiline, dotall, unicode.", example: "/pattern/gim" },
];
