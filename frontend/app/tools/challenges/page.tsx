"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trophy, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard";

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  language_ids: number[];
  visible_test_count: number;
  hidden_test_count: number;
  test_count: number;
  created_at: string | null;
};

const languageOptions = [
  { id: 71, label: "Python" },
  { id: 63, label: "JavaScript" },
  { id: 74, label: "TypeScript" },
  { id: 62, label: "Java" },
  { id: 54, label: "C++" },
  { id: 50, label: "C" },
  { id: 60, label: "Go" },
  { id: 73, label: "Rust" },
];

const difficultyClass: Record<Difficulty, string> = {
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

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<{ id: string; key: string } | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "Write a function or program that solves the task.\n\n## Input\nDescribe input here.\n\n## Output\nDescribe output here.",
    difficulty: "easy" as Difficulty,
    languageIds: [71],
    template: "# Write your solution here\n",
    adminPassword: "",
    sampleInput: "",
    sampleExpected: "",
    hiddenInput: "",
    hiddenExpected: "",
  });

  useEffect(() => {
    void loadChallenges();
  }, []);

  async function loadChallenges() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/challenges`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, "Could not load challenges."));
      setChallenges(data as Challenge[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load challenges.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => difficulty === "all" ? challenges : challenges.filter((challenge) => challenge.difficulty === difficulty), [challenges, difficulty]);

  function toggleLanguage(id: number) {
    setForm((current) => {
      const exists = current.languageIds.includes(id);
      const next = exists ? current.languageIds.filter((item) => item !== id) : [...current.languageIds, id];
      return { ...current, languageIds: next.length ? next : [id] };
    });
  }

  async function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setCreatedKey(null);
    try {
      const template_code = Object.fromEntries(form.languageIds.map((id) => [String(id), form.template]));
      const res = await fetch(`${API_BASE}/challenges`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          difficulty: form.difficulty,
          language_ids: form.languageIds,
          template_code,
          admin_password: form.adminPassword || null,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, "Could not create challenge."));
      const created = data as Challenge & { admin_key: string };
      const cases = [
        { input: form.sampleInput, expected_output: form.sampleExpected, is_hidden: false, points: 1 },
        { input: form.hiddenInput, expected_output: form.hiddenExpected, is_hidden: true, points: 1 },
      ].filter((item) => item.expected_output.trim());
      for (const testCase of cases) {
        await fetch(`${API_BASE}/challenges/${encodeURIComponent(created.id)}/test-cases`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Admin-Key": created.admin_key },
          body: JSON.stringify(testCase),
        });
      }
      try {
        localStorage.setItem(`devtools:challenge-admin:${created.id}`, created.admin_key);
      } catch {
        // ignore storage failures
      }
      setCreatedKey({ id: created.id, key: created.admin_key });
      await loadChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create challenge.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Text & Code</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">Challenges</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Solve coding challenges with visible and hidden test cases.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Create challenge</Button>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{filtered.length} challenges</span>
        </div>
        <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as "all" | Difficulty)}>
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading challenges
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((challenge) => (
            <article key={challenge.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyClass[challenge.difficulty]}`}>{challenge.difficulty}</span>
                <span className="text-xs text-zinc-500">{challenge.test_count} tests</span>
              </div>
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{challenge.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{challenge.description.replace(/[#*_`]/g, "")}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {challenge.language_ids.map((id) => <span key={id} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{languageLabel(id)}</span>)}
              </div>
              <Link href={`/tools/challenges/${challenge.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Solve
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <Trophy className="mx-auto h-9 w-9 text-zinc-400" />
          <h2 className="mt-3 font-semibold text-zinc-950 dark:text-zinc-50">No challenges yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Create the first challenge to start testing solutions.</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <form onSubmit={createChallenge} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Create challenge</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as Difficulty })} className="w-full">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={8} />
            </div>
            <div className="mt-4">
              <Label>Supported languages</Label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((item) => (
                  <label key={item.id} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                    <input type="checkbox" checked={form.languageIds.includes(item.id)} onChange={() => toggleLanguage(item.id)} className="h-4 w-4 accent-emerald-500" />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Label>Starter template</Label>
              <Textarea value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value })} rows={7} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Sample input</Label>
                <Textarea value={form.sampleInput} onChange={(event) => setForm({ ...form, sampleInput: event.target.value })} rows={4} />
              </div>
              <div>
                <Label>Sample expected output</Label>
                <Textarea value={form.sampleExpected} onChange={(event) => setForm({ ...form, sampleExpected: event.target.value })} rows={4} />
              </div>
              <div>
                <Label>Hidden input</Label>
                <Textarea value={form.hiddenInput} onChange={(event) => setForm({ ...form, hiddenInput: event.target.value })} rows={4} />
              </div>
              <div>
                <Label>Hidden expected output</Label>
                <Textarea value={form.hiddenExpected} onChange={(event) => setForm({ ...form, hiddenExpected: event.target.value })} rows={4} />
              </div>
            </div>
            <div className="mt-4">
              <Label>Admin password or key seed</Label>
              <Input type="password" value={form.adminPassword} onChange={(event) => setForm({ ...form, adminPassword: event.target.value })} placeholder="Optional. Used to manage test cases." />
            </div>
            {createdKey && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                Challenge created. Save admin key: <code className="break-all">{createdKey.key}</code>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" onClick={() => setModalOpen(false)}>Close</Button>
              <Button variant="primary" disabled={creating || !form.title.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
