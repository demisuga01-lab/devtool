"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import hljs from "highlight.js";
import { AlertTriangle, Clock, ExternalLink, Flag, Loader2, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button, CopyButton, ErrorCard, Input, Label, Select, Textarea } from "@/components/ui";
import { deletePaste, getPaste, PasteApiError, PasteResult } from "@/lib/paste-api";

type Props = {
  params: Promise<{ id: string }>;
};

const LANGUAGE_MAP: Record<string, string> = {
  plaintext: "plaintext",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  json: "json",
  html: "xml",
  css: "css",
  sql: "sql",
  bash: "bash",
  markdown: "markdown",
  yaml: "yaml",
  go: "go",
  rust: "rust",
  java: "java",
  cpp: "cpp",
  php: "php",
  ruby: "ruby",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
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

export default function PasteView({ params }: Props) {
  const { id } = use(params);
  const [paste, setPaste] = useState<PasteResult | null>(null);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [burnPreview, setBurnPreview] = useState<PasteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState("");

  const loadPaste = async (opts: { preview?: boolean; password?: string } = {}) => {
    setError("");
    setLoading(!opts.password);
    setUnlocking(Boolean(opts.password));
    try {
      const data = await getPaste(id, opts);
      if (opts.preview && data.burn_after_read && !data.content) {
        setBurnPreview(data);
        setPaste(null);
      } else {
        setPaste(data);
        setBurnPreview(null);
      }
      setPasswordRequired(false);
    } catch (e) {
      if (e instanceof PasteApiError && e.status === 403 && e.message === "password_required") {
        setPasswordRequired(true);
        setError("");
      } else if (e instanceof PasteApiError && e.status === 403) {
        setPasswordRequired(true);
        setError(e.message);
      } else {
        setError("This paste has expired or does not exist.");
      }
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  useEffect(() => {
    loadPaste({ preview: true });
  }, [id]);

  const unlock = async () => {
    await loadPaste({ preview: true, password });
  };

  const confirmBurn = async () => {
    await loadPaste({ password });
  };

  const removePaste = async () => {
    const token = window.prompt("Enter the delete token for this paste.");
    if (!token) return;
    setDeleteError("");
    try {
      await deletePaste(id, token);
      setDeleted(true);
      setPaste(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete paste.");
    }
  };

  const submitReport = async () => {
    setReportStatus("");
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: "paste", content_id: id, reason: reportReason, details: reportDetails }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : "Could not submit report.";
        throw new Error(detail);
      }
      setReportStatus("Report submitted");
      setReportDetails("");
      window.setTimeout(() => setReportOpen(false), 900);
    } catch (err) {
      setReportStatus(err instanceof Error ? err.message : "Could not submit report.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading paste
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <CenteredCard title="Paste deleted" description="This paste was deleted with its delete token." />
    );
  }

  if (passwordRequired) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Protected paste</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Unlock Paste</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Password protection uses bcrypt hashing.
          </p>
          <div className="mt-5">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && unlock()}
              autoFocus
            />
          </div>
          <Button variant="primary" onClick={unlock} disabled={!password || unlocking} className="mt-4 w-full">
            {unlocking ? "Unlocking..." : "Unlock Paste"}
          </Button>
          {error && <div className="mt-4"><ErrorCard>{error}</ErrorCard></div>}
        </div>
      </div>
    );
  }

  if (burnPreview) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <h1 className="text-xl font-semibold">This paste will be deleted after you view it.</h1>
              <p className="mt-2 text-sm">Burn after read deletes on first view.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={confirmBurn}>View and delete</Button>
            <Link href="/paste" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
              Create new paste
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !paste || !paste.content) {
    return (
      <CenteredCard
        title="Paste unavailable"
        description="This paste has expired or does not exist."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {paste.language}
          </span>
          {paste.is_private && (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Private
            </span>
          )}
          {paste.tags.map((tag) => (
            <span key={tag} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              #{tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          {paste.title || "Untitled paste"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Created {timeAgo(paste.created_at)}
          </span>
          <span>Expires: {formatDate(paste.expires_at)}</span>
          {paste.view_limit && <span>Views: {paste.view_count} / {paste.view_limit}</span>}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <CopyButton value={paste.content} label="Copy content" />
        <Link href={`/paste/${id}/raw`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <ExternalLink className="h-3.5 w-3.5" />
          View raw
        </Link>
        <Button variant="danger" onClick={removePaste}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete paste
        </Button>
        <Button variant="ghost" onClick={() => setReportOpen(true)}>
          <Flag className="h-3.5 w-3.5" />
          Report
        </Button>
      </div>

      {deleteError && <div className="mb-4"><ErrorCard>{deleteError}</ErrorCard></div>}

      <HighlightedCode code={paste.content} language={paste.language} />
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Report paste</h2>
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
    const mapped = LANGUAGE_MAP[language] ?? language;
    try {
      if (mapped !== "plaintext" && hljs.getLanguage(mapped)) {
        return hljs.highlight(code, { language: mapped, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\"": "&quot;",
          "'": "&#039;",
        };
        return entities[char];
      });
    }
  }, [code, language]);

  const lines = html.split(/\n/);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
      <pre className="overflow-auto font-mono text-xs leading-6 text-zinc-100">
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[3.25rem_1fr]">
            <span className="select-none border-r border-zinc-800 bg-zinc-950 px-3 text-right text-zinc-500">
              {index + 1}
            </span>
            <code
              className="min-w-0 px-4"
              dangerouslySetInnerHTML={{ __html: line || " " }}
            />
          </div>
        ))}
      </pre>
    </div>
  );
}

function CenteredCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        <Link href="/paste" className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Create new paste
        </Link>
      </div>
    </div>
  );
}
