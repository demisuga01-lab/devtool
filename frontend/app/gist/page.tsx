"use client";

import Link from "next/link";
import { useState } from "react";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";

type GistFileDraft = {
  filename: string;
  language: string;
  content: string;
};

const LANGUAGES = ["plaintext", "javascript", "typescript", "python", "json", "html", "css", "sql", "bash", "markdown", "yaml", "go", "rust", "java"];
const EXPIRIES = [
  { label: "Never", hours: 0 },
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function GistCreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(0);
  const [files, setFiles] = useState<GistFileDraft[]>([{ filename: "main.txt", language: "plaintext", content: "" }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [created, setCreated] = useState<{ id: string; admin_key: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateFile(index: number, patch: Partial<GistFileDraft>) {
    setFiles((current) => current.map((file, fileIndex) => (fileIndex === index ? { ...file, ...patch } : file)));
  }

  function addFile() {
    if (files.length >= 10) return;
    setFiles((current) => [...current, { filename: `file-${current.length + 1}.txt`, language: "plaintext", content: "" }]);
    setActiveIndex(files.length);
  }

  function removeFile(index: number) {
    if (files.length === 1) return;
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setActiveIndex((current) => Math.max(0, Math.min(current, files.length - 2)));
  }

  async function createGist() {
    setSaving(true);
    setError("");
    setCreated(null);
    try {
      const res = await fetch(`${API_BASE}/gists`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          admin_password: adminPassword || undefined,
          expires_in_hours: expiresInHours || null,
          files,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Gist creation failed with ${res.status}`));
      setCreated(data as { id: string; admin_key: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create gist.");
    } finally {
      setSaving(false);
    }
  }

  const activeFile = files[activeIndex] ?? files[0];
  const createdUrl = created ? `${typeof window === "undefined" ? "" : window.location.origin}/gist/${created.id}` : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gist</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Multi-file snippet</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Create a gist-like paste with up to 10 files, language labels, an admin key, and optional expiry.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
              {files.map((file, index) => (
                <button
                  key={`${file.filename}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium ${activeIndex === index ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  {file.filename || `File ${index + 1}`}
                </button>
              ))}
              <Button type="button" onClick={addFile} disabled={files.length >= 10}>
                <Plus className="h-3.5 w-3.5" />
                Add file
              </Button>
            </div>
            <div className="grid gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-[1fr_220px_auto]">
              <div>
                <Label>Filename</Label>
                <Input value={activeFile.filename} onChange={(event) => updateFile(activeIndex, { filename: event.target.value })} />
              </div>
              <div>
                <Label>Language</Label>
                <Select value={activeFile.language} onChange={(event) => updateFile(activeIndex, { language: event.target.value })} className="w-full">
                  {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
                </Select>
              </div>
              <Button type="button" variant="danger" onClick={() => removeFile(activeIndex)} disabled={files.length === 1} className="self-end">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              value={activeFile.content}
              onChange={(event) => updateFile(activeIndex, { content: event.target.value })}
              rows={20}
              className="min-h-[480px] rounded-none border-0 focus:ring-0"
              placeholder="Paste code or notes for this file."
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <FilePlus2 className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Publish gist</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Expiry</Label>
                <Select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} className="w-full">
                  {EXPIRIES.map((item) => <option key={item.hours} value={item.hours}>{item.label}</option>)}
                </Select>
              </div>
              <div>
                <Label>Admin password</Label>
                <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Optional" />
              </div>
              <Button variant="primary" onClick={createGist} disabled={saving || files.some((file) => !file.filename || !file.content)} className="w-full">
                {saving ? "Creating..." : "Create gist"}
              </Button>
            </div>
          </div>
          {error && <ErrorCard>{error}</ErrorCard>}
          {created && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
              <p className="font-medium">Gist created</p>
              <div className="mt-3 rounded-xl bg-white p-2 dark:bg-zinc-950">
                <code className="break-all text-xs">{createdUrl}</code>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={createdUrl} label="Copy URL" />
                <Link href={`/gist/${created.id}`} className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Open gist
                </Link>
              </div>
              <p className="mt-4 text-xs">Admin key shown once</p>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-white p-2 dark:bg-zinc-950">
                <code className="min-w-0 flex-1 break-all text-xs">{created.admin_key}</code>
                <CopyButton value={created.admin_key} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
