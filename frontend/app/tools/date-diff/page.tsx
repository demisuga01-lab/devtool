"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { ToolInput, Label } from "@/components/tool-ui";
import { InlineError, WarningBanner } from "@/lib/toolErrors";

function workingDays(start: Date, end: Date): number {
  if (end < start) [start, end] = [end, start];
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (cursor <= stop) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function ymd(start: Date, end: Date) {
  if (end < start) [start, end] = [end, start];
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export default function DateDiffPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);

  const startDate = useMemo(() => new Date(start), [start]);
  const endDate = useMemo(() => new Date(end), [end]);
  const startError = Number.isNaN(startDate.getTime())
    ? { title: "Invalid date", detail: `Invalid date: "${start}"`, suggestion: "Use formats like 2024-01-15, Jan 15 2024, or 2024-01-15T12:00:00Z." }
    : null;
  const endError = Number.isNaN(endDate.getTime())
    ? { title: "Invalid date", detail: `Invalid date: "${end}"`, suggestion: "Use formats like 2024-01-15, Jan 15 2024, or 2024-01-15T12:00:00Z." }
    : null;

  const stats = useMemo(() => {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    const ms = Math.abs(b.getTime() - a.getTime());
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    const approxMonths = Math.floor(totalDays / 30.4375);
    const ymdv = ymd(a, b);
    return {
      totalDays,
      weeks,
      days,
      approxMonths,
      ymd: ymdv,
      working: workingDays(a, b),
      totalHours,
      totalMinutes,
      totalSeconds,
    };
  }, [start, end]);

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Date & Time" }, { label: "Date Diff" }]} title="Date Diff" description="Calculate the difference between two dates." />
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Start date</Label>
            <ToolInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            {startError && <InlineError error={startError} />}
          </div>
          <div>
            <Label>End date</Label>
            <ToolInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            {endError && <InlineError error={endError} />}
          </div>
        </div>
        {!startError && !endError && endDate < startDate && (
          <WarningBanner title="End date before start date">End date is before start date. Showing absolute difference.</WarningBanner>
        )}
        {stats && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat label="Total days" value={`${stats.totalDays}`} />
            <Stat label="Weeks + days" value={`${stats.weeks} weeks, ${stats.days} days`} />
            <Stat label="Approx. months" value={`${stats.approxMonths}`} />
            <Stat
              label="Years, months, days"
              value={`${stats.ymd.years}y ${stats.ymd.months}m ${stats.ymd.days}d`}
            />
            <Stat label="Working days (Mon-Fri)" value={`${stats.working}`} />
            <Stat
              label="Hours / minutes / seconds"
              value={`${stats.totalHours.toLocaleString()} h � ${stats.totalMinutes.toLocaleString()} m � ${stats.totalSeconds.toLocaleString()} s`}
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel noPadding className="p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[13px] text-zinc-900 dark:text-zinc-100">{value}</div>
    </Panel>
  );
}

