"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import hljs from "highlight.js";
import { Download, Edit3, FileCode2, Flag, Loader2, Save, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

type GistFile = {
  id: string;
  filename: string;
  language: string;
  content: string;
  size_bytes: number;
};

type Gist = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string | null;
  expires_at: string | null;
  view_count: number;
  files: GistFile[];
};

const LANGUAGES = ["plaintext", "javascript", "typescript", "python", "json", "html", "css", "sql", "bash", "markdown", "yaml", "go", "rust", "java", "php", "ruby", "cpp"];

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] ?? char));
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function adminStorageKey(id: string) {
  return `devtools:gist-admin:${id}`;
}

function languageLabel(value: string) {
  return value === "plaintext" ? "text" : value;
}

export default function GistViewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [gist, setGist] = useState<Gist | null>(null);
  const [draft, setDraft] = useState<Gist | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadGist() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/gists/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `Gist request failed with ${res.status}`));
        if (!cancelled) {
          setGist(data as Gist);
          setActiveIndex(0);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load gist.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadGist();
    try {
      setAdminKey(localStorage.getItem(adminStorageKey(id)) || "");
    } catch {
      setAdminKey("");
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submitReport() {
    setReportStatus("");
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: "gist", content_id: id, reason: reportReason, details: reportDetails }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, "Could not submit report."));
      setReportStatus("Report submitted");
      setReportDetails("");
      window.setTimeout(() => setReportOpen(false), 900);
    } catch (err) {
      setReportStatus(err instanceof Error ? err.message : "Could not submit report.");
    }
  }

  function downloadZip() {
    if (!gist) return;
    const blob = createZip(gist.files.map((file) => ({ name: file.filename, content: file.content })));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${gist.id}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function startEdit() {
    if (!gist) return;
    setDraft({
      ...gist,
      files: gist.files.map((file) => ({ ...file })),
    });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function updateDraftFile(index: number, patch: Partial<GistFile>) {
    setDraft((current) => current ? {
      ...current,
      files: current.files.map((file, fileIndex) => (fileIndex === index ? { ...file, ...patch } : file)),
    } : current);
  }

  async function saveEdit() {
    if (!draft || !adminKey) return;
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/gists/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_key: adminKey,
          title: draft.title || null,
          description: draft.description || null,
          files: draft.files.map((file, index) => ({
            filename: file.filename.trim() || `file-${index + 1}.txt`,
            language: file.language || "plaintext",
            content: file.content,
          })),
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Gist update failed with ${res.status}`));
      setGist(data as Gist);
      setDraft(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update gist.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteGist() {
    if (!adminKey || !window.confirm("Delete this gist permanently?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/gists/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ admin_key: adminKey }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Gist delete failed with ${res.status}`));
      localStorage.removeItem(adminStorageKey(id));
      router.push("/gist");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete gist.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading gist
      </div>
    );
  }

  if (error && !gist) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <ErrorCard>{error}</ErrorCard>
        <Link href="/gist" className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Create a gist
        </Link>
      </div>
    );
  }

  if (!gist) return null;

  const source = editing && draft ? draft : gist;
  const activeFile = source.files[activeIndex] ?? source.files[0];
  const allText = gist.files.map((file) => `// ${file.filename}\n${file.content}`).join("\n\n");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {editing && draft ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gist</p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{gist.title || "Untitled gist"}</h1>
            {gist.description && <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{gist.description}</p>}
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">Created {formatDate(gist.created_at)}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">Expires {formatDate(gist.expires_at)}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{gist.files.length} file{gist.files.length === 1 ? "" : "s"}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{gist.view_count} views</span>
        </div>
      </header>

      {error && <div className="mb-5"><ErrorCard>{error}</ErrorCard></div>}

      <div className="mb-4 flex flex-wrap gap-2">
        <CopyButton value={allText} label="Copy all" />
        <Button onClick={downloadZip}>
          <Download className="h-3.5 w-3.5" />
          Download ZIP
        </Button>
        <Button variant="ghost" onClick={() => setReportOpen(true)}>
          <Flag className="h-3.5 w-3.5" />
          Report
        </Button>
        {adminKey && !editing && (
          <Button onClick={startEdit}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        {adminKey && editing && (
          <>
            <Button variant="primary" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button onClick={cancelEdit}>Cancel</Button>
          </>
        )}
        {adminKey && (
          <Button variant="danger" onClick={deleteGist} disabled={deleting}>
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 px-3 pt-3 dark:border-zinc-800">
          {source.files.map((file, index) => {
            const active = activeIndex === index;
            return (
              <button
                key={file.id || `${file.filename}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative flex max-w-64 shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 text-sm transition ${
                  active
                    ? "translate-y-px border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <FileCode2 className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate font-medium">{file.filename}</span>
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                  {languageLabel(file.language)}
                </span>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
              </button>
            );
          })}
        </div>

        {activeFile && editing && draft ? (
          <div>
            <div className="grid gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <Label>Filename</Label>
                <Input value={activeFile.filename} onChange={(event) => updateDraftFile(activeIndex, { filename: event.target.value })} />
              </div>
              <div>
                <Label>Language</Label>
                <Select value={activeFile.language} onChange={(event) => updateDraftFile(activeIndex, { language: event.target.value })} className="w-full">
                  {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
                </Select>
              </div>
            </div>
            <Textarea
              value={activeFile.content}
              onChange={(event) => updateDraftFile(activeIndex, { content: event.target.value, size_bytes: new TextEncoder().encode(event.target.value).length })}
              rows={20}
              className="min-h-[420px] resize-y rounded-none border-0 focus:ring-0"
            />
          </div>
        ) : activeFile ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <div className="font-medium text-zinc-950 dark:text-zinc-50">{activeFile.filename}</div>
                <div className="text-xs text-zinc-500">{activeFile.language} · {activeFile.size_bytes.toLocaleString()} bytes</div>
              </div>
              <CopyButton value={activeFile.content} label="Copy file" />
            </div>
            <HighlightedCode code={activeFile.content} language={activeFile.language} />
          </>
        ) : null}
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Report gist</h2>
              <button type="button" onClick={() => setReportOpen(false)} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Label>Reason</Label>
            <Select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mb-3 w-full">
              <option value="spam">Spam</option>
              <option value="illegal">Illegal</option>
              <option value="malware">Malware</option>
              <option value="other">Other</option>
            </Select>
            <Label>Details</Label>
            <Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} rows={4} className="mb-4" />
            {reportStatus && <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{reportStatus}</p>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={submitReport}>Submit report</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const html = useMemo(() => {
    try {
      if (language !== "plaintext" && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  return (
    <pre className="min-h-[420px] overflow-x-auto bg-zinc-950 p-5 font-mono text-sm leading-6 text-zinc-100">
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(files: { name: string; content: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name || "file.txt");
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, contentBytes.length);
    writeUint32(localView, 22, contentBytes.length);
    writeUint16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30);
    localParts.push(local, contentBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, contentBytes.length);
    writeUint32(centralView, 24, contentBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + contentBytes.length;
  }

  const centralDirectory = concat(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  const zipBytes = concat([...localParts, centralDirectory, end]);
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" });
}
