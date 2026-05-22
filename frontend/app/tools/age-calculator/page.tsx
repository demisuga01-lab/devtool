"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { ToolInput, Label } from "@/components/tool-ui";

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
function diffParts(a: Date, b: Date) {
  const sign = b >= a ? 1 : -1;
  let start = sign === 1 ? new Date(a) : new Date(b);
  const end = sign === 1 ? new Date(b) : new Date(a);
  let years = end.getFullYear() - start.getFullYear();
  start.setFullYear(start.getFullYear() + years);
  if (start > end) { years--; start.setFullYear(start.getFullYear() - 1); }
  let months = end.getMonth() - start.getMonth();
  if (months < 0) months += 12;
  start.setMonth(start.getMonth() + months);
  if (start > end) { months--; start.setMonth(start.getMonth() - 1); }
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return { years, months, days };
}
function zodiac(month: number, day: number) {
  const signs = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];
  const starts = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  return day < starts[month] ? signs[(month + 11) % 12] : signs[month];
}
const chinese = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];

export default function AgeCalculatorPage() {
  const today = dateInput(new Date());
  const [birth, setBirth] = useState("1990-01-01");
  const [target, setTarget] = useState(today);
  const [a, setA] = useState("2020-01-01");
  const [b, setB] = useState(today);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const info = useMemo(() => {
    const dob = new Date(`${birth}T00:00:00`);
    const end = new Date(`${target}T00:00:00`);
    const exact = diffParts(dob, end);
    const ms = Math.abs((target === today ? now : end).getTime() - dob.getTime());
    const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < now) next.setFullYear(next.getFullYear() + 1);
    return { dob, exact, days: Math.floor(ms / 86400000), hours: Math.floor(ms / 3600000), minutes: Math.floor(ms / 60000), seconds: Math.floor(ms / 1000), nextDays: Math.ceil((next.getTime() - now.getTime()) / 86400000) };
  }, [birth, now, target, today]);
  const compare = diffParts(new Date(`${a}T00:00:00`), new Date(`${b}T00:00:00`));
  const cards = [
    ["Exact age", `${info.exact.years} years, ${info.exact.months} months, ${info.exact.days} days`],
    ["Total", `${info.days} days, ${info.hours} hours, ${info.minutes} minutes, ${info.seconds} seconds`],
    ["Next birthday", info.nextDays === 0 ? "Today!" : `in ${info.nextDays} days`],
    ["Day born", info.dob.toLocaleDateString(undefined, { weekday: "long" })],
    ["Age in weeks", Math.floor(info.days / 7).toLocaleString()],
    ["Zodiac", zodiac(info.dob.getMonth(), info.dob.getDate())],
    ["Chinese zodiac", chinese[(info.dob.getFullYear() - 1900) % 12]],
  ];

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "Age Calculator" }]} title="Age Calculator" description="Calculate exact age and time since or until any date." />
      <div className="space-y-5">
        <Panel noPadding className="grid gap-4 p-4 sm:grid-cols-2">
          <div><Label>Date of birth</Label><ToolInput type="date" value={birth} onChange={(event) => setBirth(event.target.value)} /></div>
          <div><Label>Target date</Label><ToolInput type="date" value={target} onChange={(event) => setTarget(event.target.value)} /></div>
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <Panel noPadding key={label} className="p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p></Panel>)}</div>
        <Panel noPadding className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Compare two dates</h2>
          <div className="grid gap-3 sm:grid-cols-2"><ToolInput type="date" value={a} onChange={(event) => setA(event.target.value)} /><ToolInput type="date" value={b} onChange={(event) => setB(event.target.value)} /></div>
          <p className="font-mono text-[13px] text-zinc-900 dark:text-zinc-100">{compare.years} years, {compare.months} months, {compare.days} days</p>
        </Panel>
      </div>
    </ToolShell>
  );
}
