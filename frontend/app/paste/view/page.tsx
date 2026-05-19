"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorCard, Input, Label } from "@/components/ui";

function extractPasteId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const pasteIndex = parts.indexOf("paste");
    if (pasteIndex !== -1 && parts[pasteIndex + 1]) {
      return parts[pasteIndex + 1];
    }
  } catch {
    // Treat plain input as the paste ID.
  }
  return trimmed.replace(/^\/?paste\//, "").split(/[/?#]/, 1)[0];
}

export default function ViewPastePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const id = extractPasteId(value);
    if (!id) {
      setError("Enter a paste ID or URL.");
      return;
    }
    router.push(`/paste/${encodeURIComponent(id)}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paste</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          View a Paste
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter a paste ID or URL to view it
        </p>
        <div className="mt-5">
          <Label>Paste ID or URL</Label>
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="aB3xK9mN2pQr"
            autoFocus
          />
        </div>
        <Button variant="primary" onClick={submit} className="mt-4 w-full">
          View Paste
        </Button>
        {error && (
          <div className="mt-4">
            <ErrorCard>{error}</ErrorCard>
          </div>
        )}
      </div>
    </div>
  );
}
