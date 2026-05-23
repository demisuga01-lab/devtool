"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Textarea } from "@/components/ui";

type PasteSummary = {
  id: string;
  title: string;
  language: string;
  tags: string[];
  created_at: string | null;
  preview: string;
};

type Collection = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

export default function CollectionsPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [created, setCreated] = useState<(Collection & { admin_key: string }) | null>(null);
  const [collectionId, setCollectionId] = useState("");
  const [collection, setCollection] = useState<Collection | null>(null);
  const [pastes, setPastes] = useState<PasteSummary[]>([]);
  const [q, setQ] = useState("");
  const [tags, setTags] = useState("");
  const [searchResults, setSearchResults] = useState<PasteSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(data, `Request failed with ${res.status}`));
    return data as T;
  }

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreated(null);
    try {
      const result = await request<Collection & { admin_key: string }>("/collections", {
        method: "POST",
        body: JSON.stringify({ name, description, admin_password: adminPassword || undefined }),
      });
      setCreated(result);
      setCollectionId(result.id);
      setName("");
      setDescription("");
      setAdminPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create collection.");
    }
  }

  async function loadCollection(id = collectionId) {
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await request<{ collection: Collection; items: PasteSummary[] }>(`/collections/${encodeURIComponent(id.trim())}`);
      setCollection(result.collection);
      setPastes(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
    } finally {
      setLoading(false);
    }
  }

  async function searchPastes() {
    setError("");
    try {
      const params = new URLSearchParams({ q, tags });
      const result = await request<{ items: PasteSummary[] }>(`/paste/search?${params}`);
      setSearchResults(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search pastes.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (q || tags) searchPastes();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, tags]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paste</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Paste Collections</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Create collections, attach pastes by collection ID, and filter pastes by tags or content.
        </p>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <form onSubmit={createCollection} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Create collection</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
              </div>
              <div>
                <Label>Admin password</Label>
                <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Optional" />
              </div>
              <Button variant="primary" className="w-full">Create</Button>
            </div>
          </form>

          {created && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
              <p className="font-medium">Collection created</p>
              <p className="mt-2 text-xs">Collection ID</p>
              <code className="block break-all rounded-xl bg-white p-2 text-xs dark:bg-zinc-950">{created.id}</code>
              <p className="mt-3 text-xs">Admin key shown once</p>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-white p-2 dark:bg-zinc-950">
                <code className="min-w-0 flex-1 break-all text-xs">{created.admin_key}</code>
                <CopyButton value={created.admin_key} />
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label>Collection ID</Label>
                <Input value={collectionId} onChange={(event) => setCollectionId(event.target.value)} placeholder="Paste a collection ID" />
              </div>
              <Button type="button" onClick={() => loadCollection()} disabled={!collectionId || loading} className="self-end">
                {loading ? "Loading..." : "View collection"}
              </Button>
            </div>
            {collection && (
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{collection.name}</h2>
                {collection.description && <p className="mt-1 text-sm text-zinc-500">{collection.description}</p>}
                <PasteList items={pastes} empty="No pastes in this collection yet." />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Search pastes</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Search term</Label>
                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="logs, error, snippet" />
              </div>
              <div>
                <Label>Tags</Label>
                <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="api,python" />
              </div>
            </div>
            <div className="mt-4">
              <PasteList items={searchResults} empty="Enter a search term or tags to find pastes." />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PasteList({ items, empty }: { items: PasteSummary[]; empty: string }) {
  if (items.length === 0) return <p className="mt-4 text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
      {items.map((paste) => (
        <li key={paste.id} className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={`/paste/${paste.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-zinc-100">
                {paste.title || "Untitled paste"}
              </Link>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{paste.language}</span>
                {paste.tags.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
              {paste.preview && <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{paste.preview}</p>}
            </div>
            <Link href={`/paste/${paste.id}`} className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Open</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
