"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ResultCard, ToolInput, Label, ToolSelect } from "@/components/tool-ui";
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

function addDuration(date: Date, amount: number, unit: string): Date {
  const next = new Date(date);
  if (unit === "minutes") next.setMinutes(next.getMinutes() + amount);
  if (unit === "hours") next.setHours(next.getHours() + amount);
  if (unit === "days") next.setDate(next.getDate() + amount);
  if (unit === "weeks") next.setDate(next.getDate() + amount * 7);
  if (unit === "months") next.setMonth(next.getMonth() + amount);
  if (unit === "years") next.setFullYear(next.getFullYear() + amount);
  return next;
}

export default function DateDiffPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [duration, setDuration] = useState(30);
  const [durationUnit, setDurationUnit] = useState("days");
  const [durationSign, setDurationSign] = useState<"add" | "subtract">("add");

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
    return {
      totalDays,
      weeks,
      days,
      approxMonths,
      ymd: ymd(a, b),
      working: workingDays(a, b),
      totalHours,
      totalMinutes,
      totalSeconds,
    };
  }, [start, end]);

  const adjustedDate = useMemo(() => {
    if (Number.isNaN(startDate.getTime())) return null;
    return addDuration(startDate, durationSign === "add" ? duration : -duration, durationUnit);
  }, [startDate, duration, durationSign, durationUnit]);
  const relation = endDate < startDate ? "End is earlier" : endDate > startDate ? "End is later" : "Same instant";

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
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ResultCard label="Earlier / Later" value={<Badge variant={relation === "Same instant" ? "info" : "success"}>{relation}</Badge>} />
              <ResultCard label="Years, Months, Days" value={`${stats.ymd.years}y ${stats.ymd.months}m ${stats.ymd.days}d`} />
              <ResultCard label="Weeks + Days" value={`${stats.weeks} weeks, ${stats.days} days`} />
              <ResultCard label="Total Days" value={stats.totalDays.toLocaleString()} />
              <ResultCard label="Total Hours" value={stats.totalHours.toLocaleString()} />
              <ResultCard label="Total Minutes" value={stats.totalMinutes.toLocaleString()} />
              <ResultCard label="Total Seconds" value={stats.totalSeconds.toLocaleString()} />
              <ResultCard label="Approx. Months" value={stats.approxMonths.toLocaleString()} />
              <ResultCard label="Working Days" value={`${stats.working.toLocaleString()} Mon-Fri days`} />
            </div>
            <Panel noPadding className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add or subtract duration</h2>
                  <p className="text-xs text-zinc-500">Uses the start date as the base date.</p>
                </div>
                {adjustedDate && <Badge variant="info">{adjustedDate.toISOString().slice(0, 10)}</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_160px_auto] sm:items-end">
                <div className="flex gap-2">
                  <Button type="button" variant={durationSign === "add" ? "primary" : "secondary"} onClick={() => setDurationSign("add")}>Add</Button>
                  <Button type="button" variant={durationSign === "subtract" ? "primary" : "secondary"} onClick={() => setDurationSign("subtract")}>Subtract</Button>
                </div>
                <div>
                  <Label>Amount</Label>
                  <ToolInput type="number" min={0} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
                </div>
                <div>
                  <Label>Unit</Label>
                  <ToolSelect value={durationUnit} onChange={(event) => setDurationUnit(event.target.value)}>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </ToolSelect>
                </div>
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{adjustedDate?.toLocaleString() || "-"}</div>
              </div>
            </Panel>
          </>
        )}
      </div>
    </ToolShell>
  );
}
