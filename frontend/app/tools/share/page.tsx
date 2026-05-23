"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import { marked } from "marked";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  File as FileIcon,
  Flame,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";
import { createPaste, getPaste, type ExpiresIn } from "@/lib/paste-api";
import { decryptBytes, decryptText, encryptBytes, encryptText } from "@/lib/secure-share";
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

type Tab = "secret" | "zk" | "file" | "recent" | "notes";
type SecretResponse = { id: string; encrypted_content: string; iv: string; expires_at: string | null };
type FilePasteResponse = {
  id: string;
  filename: string;
  mime_type: string;
  encrypted_content: string;
  iv: string;
  file_size_bytes: number;
  expires_at: string | null;
};
type RecentItem = { id: string; type: Tab; title: string; url: string; createdAt: string; expiresAt?: string | null; language?: string };
type Note = { id: string; title: string; content: string; createdAt: string; updatedAt: string };

const tabs: WorkspaceTab<Tab>[] = [
  { id: "secret", label: "One-Time Secret", icon: Flame },
  { id: "zk", label: "ZK Paste", icon: ShieldCheck },
  { id: "file", label: "Encrypted File", icon: FileIcon },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "notes", label: "Notes", icon: StickyNote },
];

const hourExpiries = [
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "24 hours", value: 24 },
  { label: "7 days", value: 24 * 7 },
  { label: "30 days", value: 24 * 30 },
];
const pasteExpiries: ExpiresIn[] = ["1h", "6h", "24h", "7d", "30d", "never"];
const recentKey = "devtools:secure-sharing:recent";
const notesKey = "devtools:share-notes";

export default function SecureSharingPage() {
  return (
    <Suspense fallback={<LoadingWorkspace />}>
      <SecureSharingContent />
    </Suspense>
  );
}

function LoadingWorkspace() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading secure sharing
    </div>
  );
}

function SecureSharingContent() {
  const params = useSearchParams();
  const requestedMode = params.get("view");
  const [active, setActive] = useState<Tab>(() => (requestedMode === "zk" || requestedMode === "file" ? requestedMode : "secret"));

  return (
    <WorkspaceShell
      title="Secure Sharing"
      subtitle="Share secrets, files, and notes with encryption and self-destruct"
      href="/tools/share"
      icon={Lock}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="share"
      intentGroup="security"
    >
      {active === "secret" && <OneTimeSecretTab />}
      {active === "zk" && <ZkPasteTab />}
      {active === "file" && <EncryptedFileTab />}
      {active === "recent" && <RecentTab />}
      {active === "notes" && <NotesTab />}
    </WorkspaceShell>
  );
}

function OneTimeSecretTab() {
  const params = useSearchParams();
  const secretId = params.get("id");
  const isViewMode = Boolean(secretId) && (params.get("view") === "secret" || !params.get("view"));
  const [message, setMessage] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [createdLink, setCreatedLink] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function createSecret() {
    if (!message.trim()) {
      setError("Enter a secret message before creating a link.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setCreatedLink("");
    try {
      const encrypted = await encryptText(message);
      const res = await fetch(`${API_BASE}/secrets`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_content: encrypted.encrypted_content,
          iv: encrypted.iv,
          expires_in_hours: expiresInHours,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `Secret creation failed with status ${res.status}.`));
      const result = data as { id: string };
      const link = `${window.location.origin}/tools/share?view=secret&id=${encodeURIComponent(result.id)}#key=${encrypted.key}`;
      setCreatedLink(link);
      recordRecent({ id: result.id, type: "secret", title: "One-time secret", url: link, createdAt: new Date().toISOString() });
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the secret link.");
    } finally {
      setBusy(false);
    }
  }

  async function decryptSecret() {
    if (!secretId) return;
    const key = readHashKey();
    if (!key) {
      setError("Missing the decryption key from the URL fragment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/secrets/${encodeURIComponent(secretId)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `Secret request failed with status ${res.status}.`));
      const secret = data as SecretResponse;
      setDecrypted(await decryptText(secret.encrypted_content, secret.iv, key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "This secret no longer exists or could not be decrypted.");
    } finally {
      setBusy(false);
    }
  }

  if (isViewMode) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <WorkspaceCard className="space-y-4">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">You received a secret message</h2>
              <p className="text-sm text-muted-foreground">Decrypt it in this browser. The encrypted server copy is consumed when opened.</p>
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          {decrypted ? (
            <div className="space-y-3">
              <textarea value={decrypted} readOnly className={`${textareaClass} min-h-72 border-emerald-500/60`} />
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                This secret has been deleted from our servers. Save the content now if you need it.
              </div>
              <CopyButton value={decrypted} label="Copy secret" />
            </div>
          ) : (
            <PrimaryButton onClick={decryptSecret} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Decrypt secret
            </PrimaryButton>
          )}
        </WorkspaceCard>
        <SecuritySteps active={busy ? 2 : decrypted ? 3 : 1} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <WorkspaceCard className="space-y-4">
        <div>
          <FieldLabel>Secret message</FieldLabel>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Paste the secret you want to share once."
            className={`${textareaClass} min-h-80 ${error && !message.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{new TextEncoder().encode(message).length.toLocaleString()} bytes</span>
            <button type="button" onClick={() => setMessage("")} className="hover:text-foreground">
              Clear
            </button>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </WorkspaceCard>
      <div className="space-y-4">
        <WorkspaceCard className="space-y-4">
          <FieldLabel>Expiry</FieldLabel>
          <select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} className={inputClass}>
            {hourExpiries.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <PrimaryButton onClick={createSecret} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {busy ? "Encrypting" : "Encrypt and create"}
          </PrimaryButton>
        </WorkspaceCard>
        {createdLink && <ShareResult title="Secret link created" url={createdLink} warning="This link works only once. Save it now." />}
      </div>
    </div>
  );
}

function ZkPasteTab() {
  const params = useSearchParams();
  const pasteId = params.get("id");
  const isViewMode = Boolean(pasteId) && params.get("view") === "zk";
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("text");
  const [expiry, setExpiry] = useState<ExpiresIn>("24h");
  const [burnAfterRead, setBurnAfterRead] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function createZkPaste() {
    if (!text.trim()) {
      setError("Enter paste content before creating a link.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setShareLink("");
    try {
      const encrypted = await encryptText(text);
      const paste = await createPaste({
        content: JSON.stringify({ v: 1, encrypted_content: encrypted.encrypted_content, iv: encrypted.iv }),
        language,
        title: "Zero-knowledge paste",
        expires_in: expiry,
        burn_after_read: burnAfterRead,
        is_private: true,
      });
      const link = `${window.location.origin}/tools/share?view=zk&id=${encodeURIComponent(paste.id)}#key=${encrypted.key}`;
      setShareLink(link);
      recordRecent({ id: paste.id, type: "zk", title: "Zero-knowledge paste", url: link, createdAt: new Date().toISOString(), language });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the zero-knowledge paste.");
    } finally {
      setBusy(false);
    }
  }

  async function decryptPaste() {
    if (!pasteId) return;
    const key = readHashKey();
    if (!key) {
      setError("Missing the decryption key from the URL fragment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const paste = await getPaste(pasteId);
      const payload = JSON.parse(paste.content ?? "{}") as { encrypted_content?: string; iv?: string };
      if (!payload.encrypted_content || !payload.iv) throw new Error("This paste payload is not a recognized encrypted paste.");
      setDecrypted(await decryptText(payload.encrypted_content, payload.iv, key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the encrypted paste.");
    } finally {
      setBusy(false);
    }
  }

  if (isViewMode) {
    return (
      <WorkspaceCard className="space-y-4">
        <InfoBanner>The server never sees your content. Your encryption key lives only in the URL fragment.</InfoBanner>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Encrypted paste received</h2>
            <p className="text-sm text-muted-foreground">Decrypt locally to reveal the content.</p>
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {decrypted ? (
          <div className="space-y-3">
            <textarea value={decrypted} readOnly className={`${textareaClass} min-h-80 border-emerald-500/60`} />
            <CopyButton value={decrypted} label="Copy content" />
          </div>
        ) : (
          <PrimaryButton onClick={decryptPaste} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Decrypt paste
          </PrimaryButton>
        )}
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-5">
      <InfoBanner>The server never sees your content. Your encryption key lives only in the URL fragment.</InfoBanner>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <WorkspaceCard>
          <FieldLabel>Paste content</FieldLabel>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste code, notes, credentials, or any text to encrypt."
            className={`${textareaClass} min-h-96 ${error && !text.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          />
          {error && <ErrorText>{error}</ErrorText>}
        </WorkspaceCard>
        <div className="space-y-4">
          <WorkspaceCard className="space-y-4">
            <div>
              <FieldLabel>Display language</FieldLabel>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}>
                {["text", "markdown", "json", "javascript", "typescript", "python", "bash", "sql"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Expiry</FieldLabel>
              <select value={expiry} onChange={(event) => setExpiry(event.target.value as ExpiresIn)} className={inputClass}>
                {pasteExpiries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={burnAfterRead}
                onChange={(event) => setBurnAfterRead(event.target.checked)}
                className="h-4 w-4 rounded border-border accent-emerald-600"
              />
              Burn after read
            </label>
            <PrimaryButton onClick={createZkPaste} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Encrypting" : "Encrypt and create"}
            </PrimaryButton>
          </WorkspaceCard>
          {shareLink && <ShareResult title="Encrypted paste created" url={shareLink} warning="Share the full URL, including the key fragment." />}
        </div>
      </div>
    </div>
  );
}

function EncryptedFileTab() {
  const params = useSearchParams();
  const fileId = params.get("id");
  const isViewMode = Boolean(fileId) && params.get("view") === "file";
  const [file, setFile] = useState<File | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [burnAfterRead, setBurnAfterRead] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [receivedFile, setReceivedFile] = useState<FilePasteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setError("");
    setShareLink("");
  }

  async function uploadEncryptedFile() {
    if (!file) {
      setError("Choose a file before creating a share link.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10MB or less.");
      return;
    }
    setBusy(true);
    setError("");
    setShareLink("");
    try {
      setStatus("Encrypting in your browser");
      const encrypted = await encryptBytes(new Uint8Array(await file.arrayBuffer()));
      setStatus("Uploading encrypted blob");
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
      if (!res.ok) throw new Error(readApiError(data, `File upload failed with status ${res.status}.`));
      const result = data as { id: string };
      const link = `${window.location.origin}/tools/share?view=file&id=${encodeURIComponent(result.id)}#key=${encrypted.key}`;
      setShareLink(link);
      recordRecent({ id: result.id, type: "file", title: file.name, url: link, createdAt: new Date().toISOString() });
      setStatus("Share link ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the encrypted file link.");
    } finally {
      setBusy(false);
    }
  }

  async function decryptAndDownload() {
    if (!fileId) return;
    const key = readHashKey();
    if (!key) {
      setError("Missing the decryption key from the URL fragment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setStatus("Downloading encrypted file");
      const res = await fetch(`${API_BASE}/file-paste/${encodeURIComponent(fileId)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, `File request failed with status ${res.status}.`));
      const result = data as FilePasteResponse;
      setReceivedFile(result);
      setStatus("Decrypting in your browser");
      const bytes = await decryptBytes(result.encrypted_content, result.iv, key);
      const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: result.mime_type || "application/octet-stream" });
      downloadBlob(blob, result.filename || "decrypted-file");
      setStatus("Download ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decrypt this file.");
    } finally {
      setBusy(false);
    }
  }

  if (isViewMode) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <WorkspaceCard className="space-y-4">
          <div className="flex items-center gap-3">
            <FileIcon className="h-8 w-8 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Someone shared an encrypted file with you</h2>
              <p className="text-sm text-muted-foreground">The file decrypts locally and downloads after the encrypted payload is fetched.</p>
            </div>
          </div>
          {receivedFile && (
            <div className="grid gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-3">
              <Metric label="Name" value={receivedFile.filename} />
              <Metric label="Size" value={formatBytes(receivedFile.file_size_bytes)} />
              <Metric label="Type" value={receivedFile.mime_type || "application/octet-stream"} />
            </div>
          )}
          {status && <ProgressNote active={busy}>{status}</ProgressNote>}
          {error && <ErrorText>{error}</ErrorText>}
          <PrimaryButton onClick={decryptAndDownload} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Decrypt and download
          </PrimaryButton>
        </WorkspaceCard>
        <InfoCard title="Private by design">
          Files are encrypted with AES-256-GCM before upload. The server stores ciphertext and metadata; the key remains in the URL fragment.
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <WorkspaceCard
        className={`flex min-h-96 flex-col items-center justify-center border-dashed text-center ${
          error && !file ? "border-red-500" : "border-border"
        }`}
      >
        <div
          className="flex w-full flex-col items-center justify-center rounded-lg p-8"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFile(event.dataTransfer.files.item(0));
          }}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{file ? file.name : "Drop a file here"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{file ? formatBytes(file.size) : "Maximum 10MB before encryption"}</p>
          <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Choose file
            <input type="file" className="hidden" onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)} />
          </label>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </WorkspaceCard>
      <div className="space-y-4">
        <WorkspaceCard className="space-y-4">
          <FieldLabel>Expiry</FieldLabel>
          <select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} className={inputClass}>
            {hourExpiries.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={burnAfterRead}
              onChange={(event) => setBurnAfterRead(event.target.checked)}
              className="h-4 w-4 rounded border-border accent-emerald-600"
            />
            Burn after read
          </label>
          {status && <ProgressNote active={busy}>{status}</ProgressNote>}
          <PrimaryButton onClick={uploadEncryptedFile} disabled={!file || busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {busy ? "Encrypting" : "Encrypt and upload"}
          </PrimaryButton>
        </WorkspaceCard>
        {shareLink && <ShareResult title="Encrypted file link created" url={shareLink} warning="Only someone with the full URL fragment can decrypt this file." />}
      </div>
    </div>
  );
}

function RecentTab() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(readJson<RecentItem[]>(recentKey, []));
  }, []);

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    writeJson(recentKey, next);
  }

  function clearAll() {
    if (!window.confirm("Clear recent secure sharing links from this browser?")) return;
    setItems([]);
    writeJson(recentKey, []);
  }

  if (!items.length) {
    return (
      <WorkspaceCard className="flex min-h-72 flex-col items-center justify-center text-center">
        <Clock className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">No recent shares yet</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">Secrets, encrypted files, and zero-knowledge paste links you create in this browser appear here.</p>
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SecondaryButton onClick={clearAll}>
          <Trash2 className="h-4 w-4" />
          Clear all
        </SecondaryButton>
      </div>
      <WorkspaceCard className="divide-y divide-border p-0">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}-${item.createdAt}`} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">{labelForType(item.type)}</span>
                <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(item.createdAt)}</p>
              <code className="mt-2 block truncate rounded bg-zinc-100 px-2 py-1 text-xs text-muted-foreground dark:bg-zinc-800">{item.url}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={item.url} label="Copy" />
              <Link href={item.url} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ExternalLink className="h-4 w-4" />
                Open
              </Link>
              <SecondaryButton onClick={() => remove(item.id)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </SecondaryButton>
            </div>
          </div>
        ))}
      </WorkspaceCard>
      <p className="text-sm text-muted-foreground">This list is stored in your browser only.</p>
    </div>
  );
}

function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const [saveState, setSaveState] = useState("Saved");

  useEffect(() => {
    const loaded = readJson<Note[]>(notesKey, []);
    const next = loaded.length ? loaded : [newNote()];
    setNotes(next);
    setActiveId(next[0]?.id ?? "");
  }, []);

  useEffect(() => {
    if (!notes.length) return;
    setSaveState("Saving...");
    const timer = window.setTimeout(() => {
      writeJson(notesKey, notes);
      setSaveState("Saved");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [notes]);

  const active = notes.find((note) => note.id === activeId) ?? notes[0];
  const visible = notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()));
  const previewHtml = useMemo(() => (active ? DOMPurify.sanitize(marked.parse(active.content, { async: false }) as string) : ""), [active]);

  function addNote() {
    const note = newNote();
    setNotes((items) => [note, ...items]);
    setActiveId(note.id);
    setMode("edit");
  }

  function updateActive(patch: Partial<Note>) {
    setNotes((items) => items.map((note) => (note.id === active?.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note)));
  }

  function deleteActive() {
    if (!active || !window.confirm("Delete this note from this browser?")) return;
    const next = notes.filter((note) => note.id !== active.id);
    const fallback = next.length ? next : [newNote()];
    setNotes(fallback);
    setActiveId(fallback[0].id);
  }

  function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (!file) return;
    void file.text().then((content) => {
      const note = newNote(file.name.replace(/\.md$/i, ""), content);
      setNotes((items) => [note, ...items]);
      setActiveId(note.id);
    });
  }

  if (!active) {
    return (
      <WorkspaceCard className="flex min-h-72 flex-col items-center justify-center text-center">
        <StickyNote className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">No notes</h2>
        <PrimaryButton onClick={addNote} className="mt-4">
          <Plus className="h-4 w-4" />
          New note
        </PrimaryButton>
      </WorkspaceCard>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <WorkspaceCard className="space-y-3 p-3">
        <PrimaryButton onClick={addNote} className="w-full">
          <Plus className="h-4 w-4" />
          New note
        </PrimaryButton>
        <div>
          <FieldLabel>Search</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Find notes" />
          </div>
        </div>
        <label className="block cursor-pointer rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
          Import .md
          <input type="file" accept=".md,text/markdown,text/plain" className="hidden" onChange={importMarkdown} />
        </label>
        <div className="max-h-[520px] space-y-1 overflow-y-auto">
          {visible.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setActiveId(note.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                note.id === active.id ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="block truncate text-sm font-medium">{note.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(note.updatedAt)}</span>
            </button>
          ))}
        </div>
      </WorkspaceCard>
      <WorkspaceCard className="space-y-4">
        <div>
          <FieldLabel>Title</FieldLabel>
          <input value={active.title} onChange={(event) => updateActive({ title: event.target.value })} className={inputClass} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border p-1">
            {(["edit", "preview", "split"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                  mode === item ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => downloadText(`${active.title || "note"}.md`, active.content, "text/markdown")}>
              <Download className="h-4 w-4" />
              Export
            </SecondaryButton>
            <SecondaryButton onClick={() => downloadText("devtools-notes.json", JSON.stringify(notes, null, 2), "application/json")}>
              <Download className="h-4 w-4" />
              Export all
            </SecondaryButton>
            <SecondaryButton onClick={deleteActive}>
              <Trash2 className="h-4 w-4" />
              Delete
            </SecondaryButton>
          </div>
        </div>
        <div className={mode === "split" ? "grid gap-4 xl:grid-cols-2" : ""}>
          {(mode === "edit" || mode === "split") && (
            <textarea value={active.content} onChange={(event) => updateActive({ content: event.target.value })} className={`${textareaClass} min-h-[520px]`} />
          )}
          {(mode === "preview" || mode === "split") && (
            <div
              className="markdown-preview min-h-[520px] overflow-auto rounded-lg border border-border bg-background p-4 text-sm text-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <span>{wordCount(active.content).toLocaleString()} words</span>
          <span>{saveState} at {new Date(active.updatedAt).toLocaleTimeString()}</span>
        </div>
      </WorkspaceCard>
    </div>
  );
}

function SecuritySteps({ active }: { active: number }) {
  const steps = ["Decrypting in your browser with AES-256-GCM", "Fetching encrypted blob from server", "Secret opened and server copy consumed"];
  return (
    <WorkspaceCard className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Secure open flow</h3>
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3 text-sm">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index + 1 <= active ? "bg-emerald-600 text-white" : "bg-zinc-100 text-muted-foreground dark:bg-zinc-800"}`}>
            {index + 1}
          </span>
          <span className={index + 1 <= active ? "text-foreground" : "text-muted-foreground"}>{step}</span>
        </div>
      ))}
    </WorkspaceCard>
  );
}

function ShareResult({ title, url, warning }: { title: string; url: string; warning: string }) {
  return (
    <WorkspaceCard className="space-y-3 border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
        <CheckCircle2 className="h-4 w-4" />
        {title}
      </div>
      <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-zinc-950">
        <code className="break-all text-xs text-foreground">{url}</code>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={url} label="Copy link" />
        <Link href={url} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-100 dark:hover:bg-emerald-950">
          <ExternalLink className="h-4 w-4" />
          Open
        </Link>
      </div>
      <QrPreview value={url} />
      <p className="text-sm text-emerald-900 dark:text-emerald-100">{warning}</p>
    </WorkspaceCard>
  );
}

function QrPreview({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc("");
      return;
    }
    void QRCode.toDataURL(value, { margin: 1, width: 180 }).then((next) => {
      if (!cancelled) setSrc(next);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (!src) return null;
  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="QR code for share link" className="h-36 w-36" />
    </div>
  );
}

function InfoBanner({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
      <ShieldCheck className="mt-0.5 h-4 w-4" />
      <span>{children}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: string }) {
  return (
    <WorkspaceCard className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </WorkspaceCard>
  );
}

function ProgressNote({ active, children }: { active: boolean; children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
      {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      {children}
    </div>
  );
}

function ErrorText({ children }: { children: string }) {
  return <p className="mt-2 rounded-lg border border-red-500/50 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function readApiError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") {
    return (data as { detail: string }).detail;
  }
  return fallback;
}

function readHashKey() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("key") || window.location.hash.replace(/^#/, "");
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function recordRecent(item: RecentItem) {
  const current = readJson<RecentItem[]>(recentKey, []);
  writeJson(recentKey, [item, ...current.filter((entry) => entry.url !== item.url)].slice(0, 20));
}

function newNote(title = "Untitled note", content = "# New note\n\nStart writing..."): Note {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title, content, createdAt: now, updatedAt: now };
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function labelForType(type: Tab) {
  if (type === "secret") return "One-time secret";
  if (type === "zk") return "ZK paste";
  if (type === "file") return "Encrypted file";
  if (type === "notes") return "Note";
  return "Recent";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function downloadText(filename: string, content: string, type: string) {
  downloadBlob(new Blob([content], { type }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
