"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { InlineError, SuccessBanner, WarningBanner, regexSuggestion } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";
import { ToolInput, ToolTextarea, Label, Checkbox } from "@/components/tool-ui";

type Flag = "g" | "i" | "m" | "s" | "u";
const ALL_FLAGS: Flag[] = ["g", "i", "m", "s", "u"];

type MatchInfo = {
  match: string;
  index: number;
  groups: string[];
};

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Record<Flag, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const [test, setTest] = useState("");

  const flagString = ALL_FLAGS.filter((f) => flags[f]).join("");

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null as RegExp | null, error: null as ToolError | null };
    try {
      return { regex: new RegExp(pattern, flagString), error: null as ToolError | null };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid regex";
      return { regex: null, error: { title: "Invalid regular expression", detail: message, suggestion: regexSuggestion(message) } };
    }
  }, [pattern, flagString]);

  const matches: MatchInfo[] = useMemo(() => {
    if (!regex || !test) return [];
    const out: MatchInfo[] = [];
    if (regex.global) {
      const re = new RegExp(regex.source, regex.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(test)) !== null) {
        out.push({ match: m[0], index: m.index, groups: m.slice(1) });
        if (m[0] === "") re.lastIndex++;
        if (out.length > 1000) break;
      }
    } else {
      const m = regex.exec(test);
      if (m) out.push({ match: m[0], index: m.index, groups: m.slice(1) });
    }
    return out;
  }, [regex, test]);

  const highlighted = useMemo(() => {
    if (!regex || !test || matches.length === 0) return null;
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) parts.push({ text: test.slice(cursor, m.index), match: false });
      parts.push({ text: m.match || "", match: true });
      cursor = m.index + m.match.length;
    }
    if (cursor < test.length) parts.push({ text: test.slice(cursor), match: false });
    return parts;
  }, [matches, regex, test]);

  return (
    <ToolShell slug="regex-tester">
      <div className="space-y-5">
        <div>
          <Label>Pattern</Label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-500">/</span>
            <ToolInput
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="\\b\\w+@\\w+\\.\\w+\\b"
              className="font-mono"
            />
            <span className="font-mono text-zinc-500">/{flagString}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {ALL_FLAGS.map((f) => (
            <Checkbox
              key={f}
              checked={flags[f]}
              onChange={(v) => setFlags((prev) => ({ ...prev, [f]: v }))}
              label={f}
            />
          ))}
        </div>

        {error && <InlineError error={error} />}

        <div>
          <Label>Test string</Label>
          <ToolTextarea value={test} onChange={(e) => setTest(e.target.value)} rows={8} />
        </div>

        {pattern && test && !error && matches.length === 0 && (
          <WarningBanner title="No matches found">The pattern does not match anything in the test string.</WarningBanner>
        )}
        {pattern && test && !error && matches.length > 0 && (
          <SuccessBanner>Found {matches.length} match{matches.length === 1 ? "" : "es"}.</SuccessBanner>
        )}
        <Panel noPadding className="px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Matches</span>
            <span className="font-mono">{matches.length}</span>
          </div>
        </Panel>

        {highlighted && (
          <div>
            <Label>Matches highlighted</Label>
            <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed text-zinc-100">
              {highlighted.map((p, i) =>
                p.match ? (
                  <mark
                    key={i}
                    className="rounded bg-emerald-200 px-0.5 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100"
                  >
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </pre>
          </div>
        )}

        {matches.some((m) => m.groups.length > 0) && (
          <div>
            <Label>Capture groups</Label>
            <Panel noPadding className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Match</th>
                    <th className="px-4 py-2">Index</th>
                    <th className="px-4 py-2">Groups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {matches.map((m, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs">{m.match}</td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500">{m.index}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {m.groups.length ? m.groups.map((g, j) => <div key={j}>${j + 1}: {g}</div>) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

