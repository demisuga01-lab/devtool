"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileCode2, GripVertical, KeyRound, Loader2, Plus, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, ErrorCard, Input, Label, Select } from "@/components/ui";

type GistFileDraft = {
  filename: string;
  language: string;
  content: string;
};

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "json",
  "html",
  "css",
  "sql",
  "bash",
  "markdown",
  "yaml",
  "go",
  "rust",
  "java",
  "php",
  "ruby",
  "cpp",
];

const EXPIRIES = [
  { label: "Never", hours: 0 },
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function languageLabel(value: string) {
  return value === "plaintext" ? "text" : value;
}

export default function GistCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(0);
  const [files, setFiles] = useState<GistFileDraft[]>([{ filename: "main.txt", language: "plaintext", content: "" }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeFile = files[activeIndex] ?? files[0];

  function updateFile(index: number, patch: Partial<GistFileDraft>) {
    setFiles((current) => current.map((file, fileIndex) => (fileIndex === index ? { ...file, ...patch } : file)));
  }

  function addFile() {
    if (files.length >= 10) return;
    const nextIndex = files.length;
    setFiles((current) => [...current, { filename: `file-${current.length + 1}.txt`, language: "plaintext", content: "" }]);
    setActiveIndex(nextIndex);
  }

  function removeFile(index: number) {
    if (files.length === 1) return;
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setActiveIndex((current) => Math.max(0, Math.min(current > index ? current - 1 : current, files.length - 2)));
  }

  async function createGist() {
    setSaving(true);
    setError("");
    try {
      const cleanedFiles = files.map((file, index) => ({
        filename: file.filename.trim() || `file-${index + 1}.txt`,
        language: file.language || "plaintext",
        content: file.content,
      }));
      const res = await fetch(`${API_BASE}/gists`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          admin_password: adminPassword || undefined,
          expires_in_hours: expiresInHours || null,
          files: cleanedFiles,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Gist creation failed with ${res.status}`));
      const created = data as { id: string; admin_key: string };
      localStorage.setItem(`devtools:gist-admin:${created.id}`, created.admin_key);
      router.push(`/gist/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create gist.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gist</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">Create multi-file gist</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Publish up to 10 files as one shareable snippet with language labels and optional expiry.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <section className="mb-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional gist title" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional short description" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 px-3 pt-3 dark:border-zinc-800">
          {files.map((file, index) => {
            const active = activeIndex === index;
            return (
              <div
                key={`${file.filename}-${index}`}
                className={`group relative flex max-w-64 shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 text-sm transition ${
                  active
                    ? "translate-y-px border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <button type="button" onClick={() => setActiveIndex(index)} className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{file.filename || `File ${index + 1}`}</span>
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                    {languageLabel(file.language)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={files.length === 1}
                  className="rounded-md p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={`Remove ${file.filename}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addFile}
            disabled={files.length >= 10}
            className="mb-2 inline-flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            <Plus className="h-4 w-4" />
            Add file
          </button>
          <span className="mb-2 ml-auto shrink-0 text-xs text-zinc-500">{files.length} file{files.length === 1 ? "" : "s"}</span>
        </div>

        <div className="grid gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <Label>Filename</Label>
            <Input value={activeFile.filename} onChange={(event) => updateFile(activeIndex, { filename: event.target.value })} placeholder="filename.ext" />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={activeFile.language} onChange={(event) => updateFile(activeIndex, { language: event.target.value })} className="w-full">
              {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
            </Select>
          </div>
        </div>

        <textarea
          value={activeFile.content}
          onChange={(event) => updateFile(activeIndex, { content: event.target.value })}
          spellCheck={false}
          className="min-h-[420px] w-full resize-y border-0 bg-white p-5 font-mono text-sm leading-6 text-zinc-950 outline-none focus:ring-0 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Paste code, configuration, logs, or notes for this file."
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-12px_36px_rgba(0,0,0,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label>Expiry</Label>
              <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                {EXPIRIES.map((item) => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setExpiresInHours(item.hours)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      expiresInHours === item.hours
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowAdminPassword((value) => !value)}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                <KeyRound className="h-4 w-4" />
                Set admin password (optional)
              </button>
              {showAdminPassword && (
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Optional admin password"
                  className="mt-2 w-72"
                />
              )}
            </div>
          </div>
          <Button variant="primary" onClick={createGist} disabled={saving || files.length === 0} className="px-6 py-3 text-base">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
            {saving ? "Publishing..." : "Publish Gist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
