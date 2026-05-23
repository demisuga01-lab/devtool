"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { decryptText, encryptText } from "@/lib/secure-share";
import { Button, CopyButton, ErrorCard, Label, Select, Textarea } from "@/components/ui";

type SecretResponse = {
  id: string;
  encrypted_content: string;
  iv: string;
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

export default function OneTimeSecretPage() {
  return (
    <Suspense fallback={<SecretShellLoading />}>
      <OneTimeSecretContent />
    </Suspense>
  );
}

function SecretShellLoading() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading
    </div>
  );
}

function OneTimeSecretContent() {
  const searchParams = useSearchParams();
  const secretId = searchParams.get("id");
  const [message, setMessage] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [createdLink, setCreatedLink] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [loading, setLoading] = useState(Boolean(secretId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isRecipient = Boolean(secretId);

  useEffect(() => {
    if (!secretId) return;
    const currentSecretId = secretId;
    const key = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("key") || window.location.hash.replace(/^#/, "");
    if (!key) {
      setError("Missing decryption key from the URL fragment.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadSecret() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/secrets/${encodeURIComponent(currentSecretId)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseError(data, `Secret request failed with ${res.status}`));
        const secret = data as SecretResponse;
        const plain = await decryptText(secret.encrypted_content, secret.iv, key);
        if (!cancelled) setDecrypted(plain);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open this secret.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSecret();
    return () => {
      cancelled = true;
    };
  }, [secretId]);

  const byteCount = useMemo(() => new TextEncoder().encode(message).length, [message]);

  async function createSecret() {
    setSaving(true);
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
      if (!res.ok) throw new Error(parseError(data, `Secret creation failed with ${res.status}`));
      const result = data as { id: string };
      setCreatedLink(`${window.location.origin}/tools/one-time-secret?id=${encodeURIComponent(result.id)}#key=${encrypted.key}`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create secret.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Security & Crypto</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">One-Time Secret</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Share secrets that self-destruct after reading. Encryption happens in your browser and the key stays in the URL fragment.
        </p>
      </header>

      {isRecipient ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening secret
            </div>
          ) : error ? (
            <ErrorCard>{error}</ErrorCard>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>This secret will be deleted after you close this page.</span>
              </div>
              <Textarea value={decrypted} readOnly rows={10} className="min-h-56" />
              <CopyButton value={decrypted} label="Copy secret" />
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label>Secret Message</Label>
              <span className="text-xs text-zinc-500">{byteCount.toLocaleString()} bytes</span>
            </div>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={14}
              placeholder="Paste the secret you want to share once."
              className="min-h-80"
            />
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Secret settings</p>
              </div>
              <Label>Expiry</Label>
              <Select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} className="mb-4 w-full">
                {EXPIRIES.map((item) => (
                  <option key={item.hours} value={item.hours}>{item.label}</option>
                ))}
              </Select>
              <Button variant="primary" onClick={createSecret} disabled={!message || saving} className="w-full">
                {saving ? "Encrypting..." : "Create secret link"}
              </Button>
            </div>
            {error && <ErrorCard>{error}</ErrorCard>}
            {createdLink && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
                <div className="mb-3 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Secret link created
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-2 dark:border-emerald-800 dark:bg-zinc-950">
                  <code className="break-all text-xs">{createdLink}</code>
                </div>
                <div className="mt-3">
                  <CopyButton value={createdLink} label="Copy link" />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
