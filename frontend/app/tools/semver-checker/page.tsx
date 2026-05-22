"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { CopyButton, ToolInput, Label, ToolTextarea } from "@/components/tool-ui";

type Version = { major: number; minor: number; patch: number; pre: string[]; build: string };
const re = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

function parse(value: string): Version | null {
  const match = value.trim().match(re);
  if (!match) return null;
  return { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4]?.split(".") ?? [], build: match[5] ?? "" };
}

function cmp(a: Version, b: Version) {
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (!a.pre.length && b.pre.length) return 1;
  if (a.pre.length && !b.pre.length) return -1;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const av = a.pre[i], bv = b.pre[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    const an = /^\d+$/.test(av), bn = /^\d+$/.test(bv);
    if (an && bn && +av !== +bv) return +av > +bv ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function satisfies(versionText: string, range: string) {
  const version = parse(versionText);
  if (!version) return false;
  return range.trim().split(/\s+/).every((part) => {
    if (part.startsWith("^")) {
      const base = parse(part.slice(1));
      return base ? cmp(version, base) >= 0 && cmp(version, { ...base, major: base.major + 1, minor: 0, patch: 0, pre: [], build: "" }) < 0 : false;
    }
    if (part.startsWith("~")) {
      const base = parse(part.slice(1));
      return base ? cmp(version, base) >= 0 && cmp(version, { ...base, minor: base.minor + 1, patch: 0, pre: [], build: "" }) < 0 : false;
    }
    const op = part.match(/^(>=|<=|>|<|=)?(.+)$/);
    const base = op ? parse(op[2]) : null;
    if (!base || !op) return false;
    const result = cmp(version, base);
    return op[1] === ">" ? result > 0 : op[1] === ">=" ? result >= 0 : op[1] === "<" ? result < 0 : op[1] === "<=" ? result <= 0 : result === 0;
  });
}

export default function SemverCheckerPage() {
  const [parseInput, setParseInput] = useState("1.2.3-beta.1+build.123");
  const [a, setA] = useState("1.2.3");
  const [b, setB] = useState("1.3.0");
  const [rangeVersion, setRangeVersion] = useState("1.2.3");
  const [range, setRange] = useState("^1.0.0");
  const parsed = parse(parseInput);
  const comparison = useMemo(() => {
    const av = parse(a), bv = parse(b);
    if (!av || !bv) return "Invalid version";
    const result = cmp(av, bv);
    return result > 0 ? "A > B" : result < 0 ? "A < B" : "A === B";
  }, [a, b]);
  const ok = satisfies(rangeVersion, range);

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "Semver Checker" }]} title="Semver Checker" description="Parse and compare semantic version strings." />
      <div className="space-y-5">
        <Panel noPadding className="space-y-3 p-4">
          <Label>Parse version</Label>
          <ToolInput value={parseInput} onChange={(event) => setParseInput(event.target.value)} />
          {parsed ? (
            <div className="grid gap-2 text-sm sm:grid-cols-5">
              {Object.entries({ major: parsed.major, minor: parsed.minor, patch: parsed.patch, prerelease: parsed.pre.join(".") || "-", build: parsed.build || "-" }).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950"><span className="block text-xs uppercase text-zinc-500">{key}</span><span className="font-mono">{value}</span></div>
              ))}
            </div>
          ) : <p className="text-sm text-red-600">Invalid semantic version.</p>}
        </Panel>
        <Panel noPadding className="space-y-3 p-4">
          <Label>Compare</Label>
          <div className="grid gap-3 sm:grid-cols-2"><ToolInput value={a} onChange={(event) => setA(event.target.value)} /><ToolInput value={b} onChange={(event) => setB(event.target.value)} /></div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{comparison}</p>
        </Panel>
        <Panel noPadding className="space-y-3 p-4">
          <Label>Range check</Label>
          <div className="grid gap-3 sm:grid-cols-2"><ToolInput value={rangeVersion} onChange={(event) => setRangeVersion(event.target.value)} /><ToolInput value={range} onChange={(event) => setRange(event.target.value)} /></div>
          <p className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{ok ? "✓ Satisfies range" : "✗ Does not satisfy range"}</p>
        </Panel>
        <div className="hidden"><ToolTextarea value={comparison} readOnly /><CopyButton value={comparison} /></div>
      </div>
    </ToolShell>
  );
}
