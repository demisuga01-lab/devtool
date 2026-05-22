"use client";

import { useEffect, useState } from "react";
import { ToolShell, Panel, ToolHeader, Badge, ResultCard } from "@/components/tool-ui";
import { ToolTextarea, CopyButton, Label, ToolInput } from "@/components/tool-ui";
import { md5 } from "@/lib/md5";

type Algo = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512" | "CRC32" | "BLAKE2";

async function digest(algo: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512", text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function crc32(text: string): string {
  let crc = 0 ^ -1;
  const bytes = new TextEncoder().encode(text);
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, "0");
}

const meta: Record<Algo, { bits: string; use: string; rating: "error" | "warning" | "success" | "info" }> = {
  MD5: { bits: "128", use: "Checksums only. Broken for security.", rating: "error" },
  "SHA-1": { bits: "160", use: "Legacy checksums. Collision-broken.", rating: "error" },
  "SHA-256": { bits: "256", use: "General secure hashing and signatures.", rating: "success" },
  "SHA-384": { bits: "384", use: "SHA-2 with larger digest.", rating: "success" },
  "SHA-512": { bits: "512", use: "High-strength SHA-2 digest.", rating: "success" },
  CRC32: { bits: "32", use: "Fast accidental-corruption check.", rating: "warning" },
  BLAKE2: { bits: "256/512", use: "Modern fast hash. Not exposed by Web Crypto here.", rating: "info" },
};

export default function HashGeneratorPage() {
  const [text, setText] = useState("");
  const [hashes, setHashes] = useState<Partial<Record<Algo, string>>>({});
  const [compare, setCompare] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!text) {
        setHashes({});
        return;
      }
      const next: Partial<Record<Algo, string>> = {};
      next.MD5 = md5(text);
      next["SHA-1"] = await digest("SHA-1", text);
      next["SHA-256"] = await digest("SHA-256", text);
      next["SHA-384"] = await digest("SHA-384", text);
      next["SHA-512"] = await digest("SHA-512", text);
      next.CRC32 = crc32(text);
      next.BLAKE2 = "";
      if (!cancelled) setHashes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  const algos: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512", "CRC32", "BLAKE2"];
  const normalizedCompare = compare.trim().toLowerCase();
  const compareMatches = normalizedCompare ? algos.filter((algo) => hashes[algo]?.toLowerCase() === normalizedCompare) : [];

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "Hash Generator" }]} title="Hash Generator" description="Generate MD5, SHA-1, SHA-256, and SHA-512 hashes." />
      <div className="space-y-5">
        <div>
          <Label>Text to hash</Label>
          <ToolTextarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ResultCard label="Input Bytes" value={String(new TextEncoder().encode(text).length)} />
          <ResultCard label="Algorithms" value={String(algos.length)} />
          <ResultCard label="Security Note" value="MD5/SHA-1 are broken for security" />
        </div>
        <div>
          <Label>Compare known hash</Label>
          <ToolInput value={compare} onChange={(event) => setCompare(event.target.value)} placeholder="Paste a hash to verify against all outputs" className="font-mono" />
          {normalizedCompare && (
            <div className="mt-2 flex flex-wrap gap-2">
              {compareMatches.length ? compareMatches.map((algo) => <Badge key={algo} variant="success">matches {algo}</Badge>) : <Badge variant="warning">no match</Badge>}
            </div>
          )}
        </div>
        <Panel noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="w-24 px-4 py-2.5">Algorithm</th>
                <th className="px-4 py-2.5">Hash</th>
                <th className="w-20 px-4 py-2.5">Bits</th>
                <th className="px-4 py-2.5">Use case / rating</th>
                <th className="w-16 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {algos.map((a) => (
                <tr key={a}>
                  <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{a}</td>
                  <td className="break-all px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {a === "BLAKE2" ? <span className="text-zinc-500">Unavailable in browser Web Crypto</span> : hashes[a] ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{meta[a].bits}</td>
                  <td className="px-4 py-3">
                    <Badge variant={meta[a].rating}>{meta[a].use}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {hashes[a] && <CopyButton value={hashes[a]!} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <p className="text-xs text-zinc-500">
          Hashed in your browser. Input never sent to any server.
        </p>
      </div>
    </ToolShell>
  );
}

