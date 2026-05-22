"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Button, ToolInput, Label } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidUrl, normalizeUrl, type ToolError } from "@/lib/toolErrors";

type Result = {
  url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_type: string;
  og_site_name: string;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
  title: string;
};

function host(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-48 w-full object-cover" />
  ) : (
    <div className="flex h-48 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-950">No image</div>
  );
}

export default function OgPreviewPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => {
    if (!result) return [];
    return [
      ["og:title", result.og_title],
      ["og:description", result.og_description],
      ["og:image", result.og_image],
      ["og:type", result.og_type],
      ["og:site_name", result.og_site_name],
      ["twitter:card", result.twitter_card],
      ["twitter:title", result.twitter_title],
      ["twitter:description", result.twitter_description],
      ["twitter:image", result.twitter_image],
      ["title", result.title],
    ];
  }, [result]);

  const run = async () => {
    const normalized = normalizeUrl(url);
    setUrl(normalized.url);
    if (!isValidUrl(normalized.url)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_url);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiGet<Result>("/tools/og-preview", { url: normalized.url }));
    } catch (err) {
      setError(errorFromUnknown(err, "network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Web & Network" }, { label: "Open Graph Preview" }]} title="Open Graph Preview" description="Preview how a URL looks when shared on social media." />
      <div className="space-y-5">
        <Panel noPadding className="p-5">
          <Label>URL</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ToolInput value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="https://example.com/article" />
            <Button variant="primary" onClick={run} disabled={loading || !url.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Previewing...</> : "Preview"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </Panel>

        {loading && <LoadingSkeleton />}

        {result && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel noPadding className="overflow-hidden">
                <PreviewImage src={result.og_image} alt={result.og_title || result.title} />
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{host(result.url)}</p>
                  <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{result.og_title || result.title || "Missing title"}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{result.og_description || "Missing description"}</p>
                </div>
                <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">Facebook / LinkedIn preview</div>
              </Panel>

              <Panel noPadding className="overflow-hidden">
                <PreviewImage src={result.twitter_image || result.og_image} alt={result.twitter_title || result.og_title} />
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{result.twitter_title || result.og_title || result.title || "Missing title"}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{result.twitter_description || result.og_description || "Missing description"}</p>
                  <p className="mt-2 text-xs text-zinc-500">{host(result.url)}</p>
                </div>
                <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">Twitter card preview</div>
              </Panel>
            </div>

            <Panel noPadding className="overflow-hidden">
              <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Raw meta tags</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {rows.map(([name, value]) => (
                      <tr key={name}>
                        <td className="w-48 px-4 py-3 font-mono text-xs text-emerald-700 dark:text-emerald-400">{name}</td>
                        <td className="break-all px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{value || <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><AlertTriangle className="h-3.5 w-3.5" /> Missing</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </ToolShell>
  );
}
