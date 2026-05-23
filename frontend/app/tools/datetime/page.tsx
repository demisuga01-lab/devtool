"use client";

import { useEffect, useMemo, useState } from "react";
import cronstrue from "cronstrue";
import { Activity, Calendar, Clock, Globe, RotateCcw, Settings, Timer, User } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { NewToolPage } from "../_components/new-tool-pages";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "timestamp" | "timezone" | "date-diff" | "duration" | "age" | "cron" | "quartz" | "heartbeat";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "timestamp", label: "Timestamp", icon: Clock },
  { id: "timezone", label: "Timezone", icon: Globe },
  { id: "date-diff", label: "Date Diff", icon: Calendar },
  { id: "duration", label: "Duration", icon: Timer },
  { id: "age", label: "Age", icon: User },
  { id: "cron", label: "Cron", icon: RotateCcw },
  { id: "quartz", label: "Quartz", icon: Settings },
  { id: "heartbeat", label: "Heartbeat", icon: Activity },
];

const cronPresets = [
  ["* * * * *", "Every minute"],
  ["0 * * * *", "Every hour"],
  ["0 9 * * *", "Daily at 09:00"],
  ["0 9 * * 1", "Weekly on Monday"],
  ["0 9 1 * *", "Monthly on the first"],
  ["0 0 1 1 *", "Yearly"],
  ["0 9 * * 1-5", "Weekdays"],
  ["0 9 * * 0,6", "Weekends"],
] as const;

export default function DateTimeWorkspacePage() {
  const [active, setActive] = useState<Tab>("timestamp");

  return (
    <WorkspaceShell
      title="Date & Time Tools"
      subtitle="Convert timestamps, timezones, calculate durations, and manage cron"
      href="/tools/datetime"
      icon={Clock}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="datetime"
      intentGroup="text"
    >
      {active === "timestamp" && <TimestampTab />}
      {active === "timezone" && <NewToolPage slug="timezone-converter" embedded />}
      {active === "date-diff" && <DateDiffTab />}
      {active === "duration" && <NewToolPage slug="duration-calculator" embedded />}
      {active === "age" && <AgeTab />}
      {active === "cron" && <CronTab />}
      {active === "quartz" && <QuartzTab />}
      {active === "heartbeat" && <HeartbeatTab />}
    </WorkspaceShell>
  );
}

function TimestampTab() {
  const [now, setNow] = useState(() => new Date());
  const [unix, setUnix] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [dateValue, setDateValue] = useState(() => toDateTimeLocal(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(() => new Date(dateValue), [dateValue]);
  const formats = selected && !Number.isNaN(selected.getTime())
    ? [
        ["Unix seconds", String(Math.floor(selected.getTime() / 1000))],
        ["Unix milliseconds", String(selected.getTime())],
        ["ISO 8601", selected.toISOString()],
        ["UTC", selected.toUTCString()],
        ["Local", selected.toLocaleString()],
        ["Relative", relativeTime(selected)],
      ]
    : [];

  function setFromUnix(value: string) {
    setUnix(value);
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const date = new Date(value.length > 10 ? numeric : numeric * 1000);
      if (!Number.isNaN(date.getTime())) setDateValue(toDateTimeLocal(date));
    }
  }

  function setFromDate(value: string) {
    setDateValue(value);
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) setUnix(String(Math.floor(date.getTime() / 1000)));
  }

  function preset(kind: "now" | "day" | "week" | "month" | "year") {
    const date = new Date();
    if (kind === "day") date.setHours(0, 0, 0, 0);
    if (kind === "week") {
      const offset = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - offset);
      date.setHours(0, 0, 0, 0);
    }
    if (kind === "month") {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    }
    if (kind === "year") {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }
    setFromDate(toDateTimeLocal(date));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <NowCard label="Unix" value={String(Math.floor(now.getTime() / 1000))} />
        <NowCard label="ISO 8601" value={now.toISOString()} />
        <NowCard label="UTC" value={now.toUTCString()} />
        <NowCard label="Local" value={now.toLocaleString()} />
      </div>
      <WorkspaceCard className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Unix timestamp</FieldLabel>
            <input value={unix} onChange={(event) => setFromUnix(event.target.value)} className={monoInputClass} />
          </div>
          <div>
            <FieldLabel>Date and time</FieldLabel>
            <input type="datetime-local" value={dateValue} onChange={(event) => setFromDate(event.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => preset("now")}>Now</SecondaryButton>
          <SecondaryButton onClick={() => preset("day")}>Start of today</SecondaryButton>
          <SecondaryButton onClick={() => preset("week")}>Start of week</SecondaryButton>
          <SecondaryButton onClick={() => preset("month")}>Start of month</SecondaryButton>
          <SecondaryButton onClick={() => preset("year")}>Start of year</SecondaryButton>
        </div>
      </WorkspaceCard>
      <WorkspaceCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <tbody>
            {formats.map(([label, value]) => (
              <tr key={label} className="border-b border-border last:border-b-0">
                <td className="w-44 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</td>
                <td className="break-all px-4 py-3 font-mono">{value}</td>
                <td className="px-4 py-3 text-right"><CopyButton value={value} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspaceCard>
    </div>
  );
}

function DateDiffTab() {
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const result = useMemo(() => diffDates(start, end), [start, end]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div><FieldLabel>Start date</FieldLabel><input type="date" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>End date</FieldLabel><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass} /></div>
      </div>
      {result.error ? (
        <WorkspaceCard className="border-red-500/50 text-sm text-red-600">{result.error}</WorkspaceCard>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Years" value={String(result.years)} />
            <StatCard label="Months" value={String(result.months)} />
            <StatCard label="Weeks" value={String(Math.floor(result.totalDays / 7))} />
            <StatCard label="Days" value={String(result.days)} />
          </div>
          <WorkspaceCard>
            <p className="text-lg font-semibold text-foreground">{result.human}</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <p>Total days: {result.totalDays.toLocaleString()}</p>
              <p>Business days: {result.businessDays.toLocaleString()}</p>
              <p>Hours: {(result.totalDays * 24).toLocaleString()}</p>
              <p>Minutes: {(result.totalDays * 1440).toLocaleString()}</p>
            </div>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

function AgeTab() {
  const [birth, setBirth] = useState("1990-01-01");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const result = useMemo(() => calculateAge(birth, asOf), [birth, asOf]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div><FieldLabel>Birth date</FieldLabel><input type="date" value={birth} onChange={(event) => setBirth(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Calculate as of</FieldLabel><input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className={inputClass} /></div>
      </div>
      {result.error ? (
        <WorkspaceCard className="border-red-500/50 text-sm text-red-600">{result.error}</WorkspaceCard>
      ) : (
        <>
          <WorkspaceCard className="border-emerald-500/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Exact age</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{result.years} years, {result.months} months, {result.days} days</p>
          </WorkspaceCard>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Total months" value={result.totalMonths.toLocaleString()} />
            <StatCard label="Total days" value={result.totalDays.toLocaleString()} />
            <StatCard label="Total hours" value={result.totalHours.toLocaleString()} />
          </div>
          <WorkspaceCard className="grid gap-3 text-sm md:grid-cols-2">
            <p><span className="font-medium text-foreground">Next birthday:</span> {result.nextBirthday} ({result.daysToBirthday} days away)</p>
            <p><span className="font-medium text-foreground">Born on:</span> {result.dayBorn}</p>
            <p><span className="font-medium text-foreground">Western zodiac:</span> {result.zodiac}</p>
            <p><span className="font-medium text-foreground">Chinese zodiac:</span> {result.chineseZodiac}</p>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

function CronTab() {
  const [sub, setSub] = useState<"parse" | "build">("parse");
  return (
    <div className="space-y-5">
      <Segmented value={sub} onChange={setSub} options={[["parse", "Parse"], ["build", "Build"]]} />
      {sub === "parse" ? <CronParse standard /> : <CronBuild />}
    </div>
  );
}

function CronParse({ standard }: { standard: boolean }) {
  const [expression, setExpression] = useState(standard ? "*/15 9-17 * * 1-5" : "0 */15 9-17 ? * MON-FRI *");
  const [timezone, setTimezone] = useState("local");
  const parsed = useMemo(() => parseCronExpression(expression, standard), [expression, standard]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <div>
          <FieldLabel>{standard ? "Cron expression" : "Quartz expression"}</FieldLabel>
          <input value={expression} onChange={(event) => setExpression(event.target.value)} className={`${monoInputClass} ${parsed.error ? "border-red-500" : ""}`} />
          {parsed.error && <p className="mt-2 text-sm text-red-600">{parsed.error}</p>}
        </div>
        <div>
          <FieldLabel>Timezone</FieldLabel>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={inputClass}>
            <option value="local">Local timezone</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">New York</option>
            <option value="Europe/London">London</option>
            <option value="Asia/Kolkata">Kolkata</option>
          </select>
        </div>
        <div className="flex items-end"><CopyButton value={expression} label="Copy" /></div>
      </div>
      {!parsed.error && (
        <>
          <WorkspaceCard>
            <p className="text-lg font-semibold text-foreground">{parsed.description}</p>
            {!standard && <p className="mt-2 text-sm text-muted-foreground">Quartz Scheduler format - different from Unix cron.</p>}
          </WorkspaceCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <WorkspaceCard>
              <FieldLabel>Next runs</FieldLabel>
              <ol className="mt-3 space-y-2 text-sm">
                {parsed.runs.map((run) => <li key={run} className="rounded-lg bg-zinc-50 px-3 py-2 font-mono dark:bg-zinc-800">{formatDateForZone(new Date(run), timezone)}</li>)}
              </ol>
            </WorkspaceCard>
            <WorkspaceCard className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Field</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Meaning</th></tr></thead>
                <tbody>{parsed.fields.map((field) => <tr key={field.name} className="border-b border-border last:border-b-0"><td className="px-4 py-3 font-medium">{field.name}</td><td className="px-4 py-3 font-mono">{field.value}</td><td className="px-4 py-3 text-muted-foreground">{field.meaning}</td></tr>)}</tbody>
              </table>
            </WorkspaceCard>
          </div>
        </>
      )}
    </div>
  );
}

function CronBuild() {
  const [expression, setExpression] = useState("0 9 * * 1-5");
  const parts = expression.split(/\s+/);
  const parsed = parseCronExpression(expression, true);

  function updatePart(index: number, value: string) {
    const next = [...parts];
    next[index] = value || "*";
    setExpression(next.join(" "));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {cronPresets.map(([value, label]) => <SecondaryButton key={value} onClick={() => setExpression(value)}>{label}</SecondaryButton>)}
      </div>
      <WorkspaceCard className="grid gap-3 md:grid-cols-5">
        {["Minute", "Hour", "Day of Month", "Month", "Day of Week"].map((label, index) => (
          <div key={label}>
            <FieldLabel>{label}</FieldLabel>
            <input value={parts[index] ?? "*"} onChange={(event) => updatePart(index, event.target.value)} className={monoInputClass} />
          </div>
        ))}
      </WorkspaceCard>
      <WorkspaceCard className="space-y-3">
        <FieldLabel>Live preview</FieldLabel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <code className="break-all rounded-lg bg-zinc-100 px-3 py-2 font-mono text-sm dark:bg-zinc-800">{expression}</code>
          <CopyButton value={expression} label="Copy expression" />
        </div>
        <p className={parsed.error ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>{parsed.error || parsed.description}</p>
      </WorkspaceCard>
      {!parsed.error && <div className="grid gap-2 md:grid-cols-5">{parsed.runs.slice(0, 5).map((run) => <StatCard key={run} label="Run" value={new Date(run).toLocaleString()} />)}</div>}
    </div>
  );
}

function QuartzTab() {
  return <CronParse standard={false} />;
}

type Heartbeat = {
  id?: string;
  name: string;
  interval_seconds?: number;
  grace_seconds?: number;
  ping_url?: string;
  status?: string;
  last_ping_at?: string | null;
  next_expected_at?: string | null;
  history?: { status?: string; at?: string }[];
};

function HeartbeatTab() {
  const [monitors, setMonitors] = useState<Heartbeat[]>([]);
  const [name, setName] = useState("");
  const [interval, setIntervalValue] = useState("3600");
  const [grace, setGrace] = useState("300");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/heartbeats`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, "Could not load heartbeat monitors."));
      setMonitors(Array.isArray(data) ? data : data.monitors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load heartbeat monitors.");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!name.trim()) {
      setError("Monitor name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/heartbeats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, interval_seconds: Number(interval), grace_seconds: Number(grace) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, "Could not create the monitor."));
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the monitor.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/heartbeats/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete the monitor.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the monitor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <div><FieldLabel>Name</FieldLabel><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></div>
          <div><FieldLabel>Expected interval</FieldLabel><select value={interval} onChange={(event) => setIntervalValue(event.target.value)} className={inputClass}><option value="300">5 minutes</option><option value="900">15 minutes</option><option value="3600">1 hour</option><option value="86400">1 day</option></select></div>
          <div><FieldLabel>Grace seconds</FieldLabel><input type="number" value={grace} onChange={(event) => setGrace(event.target.value)} className={inputClass} /></div>
          <div className="flex items-end"><PrimaryButton onClick={() => void create()} disabled={loading}>Create monitor</PrimaryButton></div>
        </div>
        <p className="text-xs text-muted-foreground">Ping URLs are generated by the backend and can be called from cron jobs or scheduled tasks.</p>
      </WorkspaceCard>
      {error && (
        <WorkspaceCard className="border-red-500/50">
          <p className="text-sm text-red-600">{error}</p>
          <SecondaryButton onClick={() => void load()} className="mt-3">Retry</SecondaryButton>
        </WorkspaceCard>
      )}
      {loading && <WorkspaceCard><p className="text-sm text-muted-foreground">Loading heartbeat monitors...</p></WorkspaceCard>}
      {!loading && monitors.length === 0 && (
        <WorkspaceCard className="flex min-h-40 flex-col items-center justify-center text-center">
          <Activity className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No monitors yet. Create one to get a ping URL.</p>
        </WorkspaceCard>
      )}
      <div className="grid gap-4">
        {monitors.map((monitor) => {
          const status = monitor.status || "NEVER PINGED";
          const pingUrl = monitor.ping_url || `${API_BASE}/heartbeats/${monitor.id ?? "id"}/ping`;
          return (
            <WorkspaceCard key={monitor.id ?? monitor.name} className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{monitor.name}</h3><StatusBadge status={status} /></div>
                  <p className="mt-1 text-sm text-muted-foreground">Last ping: {monitor.last_ping_at ? new Date(monitor.last_ping_at).toLocaleString() : "Never"}</p>
                  <p className="text-sm text-muted-foreground">Next expected: {monitor.next_expected_at ? new Date(monitor.next_expected_at).toLocaleString() : "Waiting for first ping"}</p>
                </div>
                <SecondaryButton onClick={() => void remove(monitor.id)} disabled={loading}>Delete</SecondaryButton>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <code className="break-all text-xs">{pingUrl}</code>
                  <CopyButton value={pingUrl} />
                </div>
                <code className="mt-2 block break-all text-xs text-muted-foreground">curl -fsS {pingUrl}</code>
              </div>
              <div className="flex gap-1">
                {(monitor.history ?? []).slice(0, 30).map((item, index) => <span key={`${item.at ?? "history"}-${index}`} className={`h-2 flex-1 rounded-full ${statusClass(item.status ?? status)}`} />)}
              </div>
            </WorkspaceCard>
          );
        })}
      </div>
    </div>
  );
}

function NowCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <CopyButton value={value} />
      </div>
      <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">{value}</p>
    </WorkspaceCard>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-xl font-semibold text-foreground">{value}</p>
    </WorkspaceCard>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: readonly (readonly [T, string])[] }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-1">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
      ))}
    </div>
  );
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function relativeTime(date: Date) {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000000], ["month", 2592000000], ["day", 86400000], ["hour", 3600000], ["minute", 60000], ["second", 1000]];
  const [unit, ms] = units.find(([, value]) => abs >= value) ?? ["second", 1000];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(diff / ms), unit);
}

function diffDates(startText: string, endText: string) {
  const start = new Date(`${startText}T00:00:00`);
  const end = new Date(`${endText}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "Both dates must be valid.", years: 0, months: 0, days: 0, totalDays: 0, businessDays: 0, human: "" };
  const forward = end >= start;
  const a = forward ? start : end;
  const b = forward ? end : start;
  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.round((b.getTime() - a.getTime()) / 86400000);
  const human = `${forward ? "" : "-"}${years} years, ${months} months, and ${days} days`;
  return { error: "", years, months, days, totalDays, businessDays: countBusinessDays(a, b), human };
}

function countBusinessDays(start: Date, end: Date) {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function calculateAge(birthText: string, asOfText: string) {
  const birth = new Date(`${birthText}T00:00:00`);
  const asOf = new Date(`${asOfText}T00:00:00`);
  const empty = { error: "Both dates must be valid.", years: 0, months: 0, days: 0, totalMonths: 0, totalDays: 0, totalHours: 0, nextBirthday: "", daysToBirthday: 0, dayBorn: "", zodiac: "", chineseZodiac: "" };
  if (Number.isNaN(birth.getTime()) || Number.isNaN(asOf.getTime())) return empty;
  if (birth > asOf) return { ...empty, error: "Birth date must be before the as-of date." };
  const diff = diffDates(birthText, asOfText);
  const totalDays = Math.floor((asOf.getTime() - birth.getTime()) / 86400000);
  const next = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < asOf) next.setFullYear(next.getFullYear() + 1);
  return {
    error: "",
    years: diff.years,
    months: diff.months,
    days: diff.days,
    totalMonths: diff.years * 12 + diff.months,
    totalDays,
    totalHours: totalDays * 24,
    nextBirthday: next.toLocaleDateString(),
    daysToBirthday: Math.ceil((next.getTime() - asOf.getTime()) / 86400000),
    dayBorn: birth.toLocaleDateString(undefined, { weekday: "long" }),
    zodiac: westernZodiac(birth.getMonth() + 1, birth.getDate()),
    chineseZodiac: ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"][(birth.getFullYear() - 1900) % 12],
  };
}

function westernZodiac(month: number, day: number) {
  const signs = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"];
  const starts = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  return day < starts[month - 1] ? signs[month - 1] : signs[month];
}

function parseCronExpression(expression: string, standard: boolean) {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  const expected = standard ? [5, 6] : [6, 7];
  if (!expected.includes(parts.length)) {
    return { error: standard ? "Use 5 fields, or 6 with seconds." : "Use 6 fields, or 7 with optional year.", description: "", runs: [] as string[], fields: [] as { name: string; value: string; meaning: string }[] };
  }
  const normalized = standard && parts.length === 6 ? parts.slice(1) : standard ? parts : parts.slice(1, 6).map((part) => part.replace(/\?/g, "*"));
  try {
    const description = cronstrue.toString(expression, { use24HourTimeFormat: true });
    const fieldNames = standard
      ? (parts.length === 6 ? ["Seconds", "Minutes", "Hours", "Day of Month", "Month", "Day of Week"] : ["Minutes", "Hours", "Day of Month", "Month", "Day of Week"])
      : (parts.length === 7 ? ["Seconds", "Minutes", "Hours", "Day of Month", "Month", "Day of Week", "Year"] : ["Seconds", "Minutes", "Hours", "Day of Month", "Month", "Day of Week"]);
    return {
      error: "",
      description,
      runs: nextCronRuns(normalized.join(" "), standard ? 10 : 10).map((date) => date.toISOString()),
      fields: fieldNames.map((name, index) => ({ name, value: parts[index], meaning: explainCronField(name, parts[index]) })),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid cron expression.", description: "", runs: [] as string[], fields: [] as { name: string; value: string; meaning: string }[] };
  }
}

function nextCronRuns(expression: string, count: number) {
  const parts = expression.split(/\s+/);
  const [minText, hourText, domText, monthText, dowText] = parts;
  const minutes = parseCronSet(minText, 0, 59);
  const hours = parseCronSet(hourText, 0, 23);
  const dom = parseCronSet(domText, 1, 31);
  const months = parseCronSet(monthText, 1, 12);
  const dow = parseCronSet(dowText, 0, 7).map((value) => value === 7 ? 0 : value);
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  for (let attempts = 0; attempts < 200000 && out.length < count; attempts += 1) {
    if (months.includes(cursor.getMonth() + 1) && dom.includes(cursor.getDate()) && dow.includes(cursor.getDay()) && hours.includes(cursor.getHours()) && minutes.includes(cursor.getMinutes())) {
      out.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return out;
}

function parseCronSet(value: string, min: number, max: number) {
  const cleaned = value.toUpperCase().replace(/\?/g, "*").replace(/MON/g, "1").replace(/TUE/g, "2").replace(/WED/g, "3").replace(/THU/g, "4").replace(/FRI/g, "5").replace(/SAT/g, "6").replace(/SUN/g, "0").replace(/JAN/g, "1").replace(/FEB/g, "2").replace(/MAR/g, "3").replace(/APR/g, "4").replace(/MAY/g, "5").replace(/JUN/g, "6").replace(/JUL/g, "7").replace(/AUG/g, "8").replace(/SEP/g, "9").replace(/OCT/g, "10").replace(/NOV/g, "11").replace(/DEC/g, "12");
  const values = new Set<number>();
  for (const part of cleaned.split(",")) {
    const [range, stepText] = part.split("/");
    const step = Math.max(1, Number(stepText || "1"));
    const [startText, endText] = range === "*" ? [String(min), String(max)] : range.split("-");
    const start = Number(startText);
    const end = Number(endText ?? startText);
    for (let valueAt = start; valueAt <= end; valueAt += step) {
      if (Number.isFinite(valueAt) && valueAt >= min && valueAt <= max) values.add(valueAt);
    }
  }
  return Array.from(values).sort((a, b) => a - b);
}

function explainCronField(name: string, value: string) {
  if (value === "*" || value === "?") return `Every ${name.toLowerCase()}`;
  if (value.startsWith("*/")) return `Every ${value.slice(2)} ${name.toLowerCase()} units`;
  if (value.includes(",")) return `Specific ${name.toLowerCase()} values`;
  if (value.includes("-")) return `Range of ${name.toLowerCase()} values`;
  return `At ${value}`;
}

function formatDateForZone(date: Date, zone: string) {
  if (zone === "local") return date.toLocaleString();
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium", timeZone: zone }).format(date);
}

function statusClass(status: string) {
  const upper = status.toUpperCase();
  if (upper.includes("UP")) return "bg-emerald-500";
  if (upper.includes("LATE")) return "bg-amber-500";
  if (upper.includes("DOWN")) return "bg-red-500";
  return "bg-zinc-300 dark:bg-zinc-700";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${statusClass(status)}`}>{status.toUpperCase()}</span>;
}

function readApiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : fallback;
}
