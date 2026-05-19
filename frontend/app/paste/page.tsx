"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, Eye, EyeOff, ExternalLink, Trash2 } from "lucide-react";
import { Button, Checkbox, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";
import { createPaste, ExpiresIn, PasteCreateResult } from "@/lib/paste-api";

type RecentPaste = {
  id: string;
  title: string;
  language: string;
  created_at: string;
  url: string;
};

const RECENT_KEY = "devtools-recent-pastes";
const LANGUAGES = [
  ["plaintext", "Plain Text"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["json", "JSON"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["sql", "SQL"],
  ["bash", "Bash"],
  ["markdown", "Markdown"],
  ["yaml", "YAML"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["java", "Java"],
  ["cpp", "C/C++"],
  ["php", "PHP"],
  ["ruby", "Ruby"],
  ["other", "Other"],
];

const EXPIRIES: { value: ExpiresIn; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function loadRecent(): RecentPaste[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timeAgo(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function PasteHome() {
  return (
    <Suspense fallback={<PastePageFallback />}>
      <PasteHomeContent />
    </Suspense>
  );
}

function PastePageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="h-48 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

function PasteHomeContent() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [title, setTitle] = useState("");
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>("never");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [viewLimit, setViewLimit] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<PasteCreateResult | null>(null);
  const [recent, setRecent] = useState<RecentPaste[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const lang = searchParams.get("lang");
    const mode = searchParams.get("mode");

    if (lang && LANGUAGES.some(([value]) => value === lang)) {
      setLanguage(lang);
    }
    if (mode === "burn") {
      setBurnAfterRead(true);
    }
    if (mode === "password") {
      window.setTimeout(() => document.getElementById("paste-password")?.focus(), 0);
    }
    if (mode === "secret") {
      setBurnAfterRead(true);
      setViewLimit("1");
    }
    if (mode === "expiry") {
      setExpiresIn("24h");
      window.setTimeout(() => document.getElementById("paste-expiry")?.focus(), 0);
    }
  }, [searchParams]);

  const lineNumbers = useMemo(() => {
    const count = Math.max(1, content.split("\n").length);
    return Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }, [content]);

  const saveRecent = (item: RecentPaste) => {
    const next = [item, ...recent.filter((p) => p.id !== item.id)].slice(0, 20);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const submit = async () => {
    setError("");
    setCreated(null);
    setLoading(true);
    try {
      const limit = viewLimit.trim() ? Number(viewLimit) : null;
      const result = await createPaste({
        content,
        language,
        title,
        password: password || undefined,
        burn_after_read: burnAfterRead,
        view_limit: limit,
        expires_in: expiresIn,
        is_private: isPrivate,
      });
      setCreated(result);
      saveRecent({
        id: result.id,
        title: title || "Untitled paste",
        language,
        created_at: new Date().toISOString(),
        url: result.url,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create paste.");
    } finally {
      setLoading(false);
    }
  };

  const createAnother = () => {
    setContent("");
    setTitle("");
    setPassword("");
    setViewLimit("");
    setBurnAfterRead(false);
    setIsPrivate(false);
    setExpiresIn("never");
    setCreated(null);
    setError("");
  };

  const removeRecent = (id: string) => {
    const next = recent.filter((p) => p.id !== id);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paste</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Temporary notes and code snippets
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Pastes are stored temporarily on our server. Password protection uses bcrypt hashing.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="min-w-52">
                {LANGUAGES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="text-xs text-zinc-500">
              {new TextEncoder().encode(content).length.toLocaleString()} / 512,000 bytes
            </div>
          </div>

          <div className="grid min-h-[400px] grid-cols-[3.25rem_1fr] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <pre className="select-none overflow-hidden border-r border-zinc-200 bg-zinc-50 px-3 py-3 text-right font-mono text-sm leading-6 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
              {lineNumbers}
            </pre>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              placeholder="Paste code, notes, logs, or configuration here."
              className="min-h-[400px] resize-y rounded-none border-0 shadow-none focus:ring-0"
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Settings</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Optional" />
              </div>
              <div>
                <Label>Expiry</Label>
                <Select
                  id="paste-expiry"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value as ExpiresIn)}
                  className="w-full"
                >
                  {EXPIRIES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="paste-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional"
                  />
                  <Button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Checkbox checked={burnAfterRead} onChange={setBurnAfterRead} label="Burn after read" />
                <p className="text-xs text-zinc-500">Deleted after first view. Burn after read deletes on first view.</p>
              </div>
              <div>
                <Label>View limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={viewLimit}
                  onChange={(e) => setViewLimit(e.target.value)}
                  placeholder="Optional"
                />
                <p className="mt-1 text-xs text-zinc-500">Auto-deletes after X views.</p>
              </div>
              <div>
                <Label>Visibility</Label>
                <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                  {[
                    { label: "Public", value: false },
                    { label: "Private", value: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setIsPrivate(item.value)}
                      className={
                        "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition " +
                        (isPrivate === item.value
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="primary" onClick={submit} disabled={!content || loading} className="w-full">
                {loading ? "Creating..." : "Create Paste"}
              </Button>
            </div>
          </div>

          {error && <ErrorCard>{error}</ErrorCard>}

          {created && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
              <div className="mb-4 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Paste created
              </div>
              <ResultRow label="Paste URL" value={created.url} />
              <ResultRow label="Raw URL" value={`${created.url}/raw`} />
              <p className="mt-4 text-xs font-medium">Save your delete token - it won't be shown again.</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2 dark:border-emerald-800 dark:bg-zinc-950">
                <code className="flex-1 break-all font-mono text-xs">{created.delete_token}</code>
                <CopyButton value={created.delete_token} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/paste/${created.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  View Paste
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Button onClick={createAnother}>Create Another</Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {recent.length > 0 && (
        <section id="recent" className="mt-10 scroll-mt-24">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Pastes</h2>
            <span className="text-xs text-zinc-500">Stored in this browser</span>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recent.map((paste) => (
                <li key={paste.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{paste.title}</div>
                    <div className="text-xs text-zinc-500">{paste.language} - {timeAgo(paste.created_at)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/paste/${paste.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <Button onClick={() => navigator.clipboard.writeText(paste.url)}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </Button>
                    <Button variant="ghost" onClick={() => removeRecent(paste.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2 dark:border-emerald-800 dark:bg-zinc-950">
        <code className="flex-1 break-all font-mono text-xs">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}
