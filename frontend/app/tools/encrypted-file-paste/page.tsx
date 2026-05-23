"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { decryptBytes, encryptBytes } from "@/lib/secure-share";
import { Button, Checkbox, CopyButton, ErrorCard, Label, Select } from "@/components/ui";

type FilePasteResponse = {
  id: string;
  filename: string;
  mime_type: string;
  encrypted_content: string;
  iv: string;
  file_size_bytes: number;
  expires_at: string | null;
};

const EXPIRIES = [
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

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function EncryptedFilePastePage() {
  return (
    <Suspense fallback={<Loading />}>
      <EncryptedFilePasteContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading
    </div>
  );
}

function EncryptedFilePasteContent() {
  const searchParams = useSearchParams();
  const pasteId = searchParams.get("id");
  const [file, setFile] = useState<File | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [receivedFile, setReceivedFile] = useState<FilePasteResponse | null>(null);
  const [decryptedUrl, setDecryptedUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(pasteId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const key = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("key") || window.location.hash.replace(/^#/, "");
  }, []);

  useEffect(() => {
    if (!pasteId) return;
    const currentPasteId = pasteId;
    if (!key) {
      setError("Missing decryption key from the URL fragment.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    async function loadFilePaste() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/file-paste/${encodeURIComponent(currentPasteId)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `File request failed with ${res.status}`));
        const result = data as FilePasteResponse;
        const bytes = await decryptBytes(result.encrypted_content, result.iv, key);
        const blobBytes = bytes.slice();
        const blob = new Blob([blobBytes.buffer as ArrayBuffer], { type: result.mime_type || "application/octet-stream" });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setReceivedFile(result);
          setDecryptedUrl(objectUrl);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not decrypt file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFilePaste();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, pasteId]);

  async function uploadFile() {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10MB or less.");
      return;
    }
    setSaving(true);
    setError("");
    setShareLink("");
    try {
      const encrypted = await encryptBytes(new Uint8Array(await file.arrayBuffer()));
      const res = await fetch(`${API_BASE}/file-paste`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          encrypted_content: encrypted.encrypted_content,
          iv: encrypted.iv,
          file_size_bytes: file.size,
          expires_in_hours: expiresInHours,
          burn_after_read: burnAfterRead,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseError(data, `Upload failed with ${res.status}`));
      const result = data as { id: string };
      setShareLink(`${window.location.origin}/tools/encrypted-file-paste?id=${encodeURIComponent(result.id)}#key=${encrypted.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload encrypted file.");
    } finally {
      setSaving(false);
    }
  }

  const isRecipient = Boolean(pasteId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Security & Crypto</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Encrypted File Paste</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Share encrypted files with self-destruct. The server stores only ciphertext; the key stays in the link fragment.
        </p>
      </header>

      {isRecipient ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Decrypting file
            </div>
          ) : error ? (
            <ErrorCard>{error}</ErrorCard>
          ) : receivedFile && decryptedUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{receivedFile.filename}</h2>
                  <p className="text-sm text-zinc-500">{formatBytes(receivedFile.file_size_bytes)} - {receivedFile.mime_type}</p>
                </div>
              </div>
              <a
                href={decryptedUrl}
                download={receivedFile.filename}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Download decrypted file
              </a>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const nextFile = event.dataTransfer.files.item(0);
              if (nextFile) setFile(nextFile);
            }}
            className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <FileUp className="h-10 w-10 text-zinc-400" />
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {file ? file.name : "Drop a file here"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{file ? formatBytes(file.size) : "Maximum 10MB before encryption"}</p>
            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
              Choose file
              <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.item(0) ?? null)} />
            </label>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Label>Expiry</Label>
              <Select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} className="mb-4 w-full">
                {EXPIRIES.map((item) => (
                  <option key={item.hours} value={item.hours}>{item.label}</option>
                ))}
              </Select>
              <div className="mb-4">
                <Checkbox checked={burnAfterRead} onChange={setBurnAfterRead} label="Burn after read" />
              </div>
              <Button variant="primary" onClick={uploadFile} disabled={!file || saving} className="w-full">
                {saving ? "Encrypting..." : "Create file link"}
              </Button>
            </div>
            {error && <ErrorCard>{error}</ErrorCard>}
            {shareLink && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
                <div className="mb-3 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  File link created
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-2 dark:border-emerald-800 dark:bg-zinc-950">
                  <code className="break-all text-xs">{shareLink}</code>
                </div>
                <div className="mt-3">
                  <CopyButton value={shareLink} label="Copy link" />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
