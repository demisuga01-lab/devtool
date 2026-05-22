"use client";

import { useEffect, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { ToolTextarea, CopyButton, Label, Checkbox } from "@/components/tool-ui";
import { md5 } from "@/lib/md5";

type Algo = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

async function digest(algo: Exclude<Algo, "MD5">, text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashGeneratorPage() {
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState<Record<Algo, boolean>>({
    MD5: true,
    "SHA-1": true,
    "SHA-256": true,
    "SHA-512": true,
  });
  const [hashes, setHashes] = useState<Partial<Record<Algo, string>>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!text) {
        setHashes({});
        return;
      }
      const next: Partial<Record<Algo, string>> = {};
      if (enabled.MD5) next.MD5 = md5(text);
      if (enabled["SHA-1"]) next["SHA-1"] = await digest("SHA-1", text);
      if (enabled["SHA-256"]) next["SHA-256"] = await digest("SHA-256", text);
      if (enabled["SHA-512"]) next["SHA-512"] = await digest("SHA-512", text);
      if (!cancelled) setHashes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [text, enabled]);

  const algos: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "Hash Generator" }]} title="Hash Generator" description="Generate MD5, SHA-1, SHA-256, and SHA-512 hashes." />
      <div className="space-y-5">
        <div>
          <Label>Text to hash</Label>
          <ToolTextarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        </div>
        <div className="flex flex-wrap gap-4">
          {algos.map((a) => (
            <Checkbox
              key={a}
              checked={enabled[a]}
              onChange={(v) => setEnabled((prev) => ({ ...prev, [a]: v }))}
              label={a}
            />
          ))}
        </div>
        <Panel noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="w-24 px-4 py-2.5">Algorithm</th>
                <th className="px-4 py-2.5">Hash</th>
                <th className="w-24 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {algos.map((a) => (
                <tr key={a}>
                  <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{a}</td>
                  <td className="break-all px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {enabled[a] ? hashes[a] ?? "-" : <span className="text-zinc-400">disabled</span>}
                  </td>
                  <td className="px-4 py-3">
                    {enabled[a] && hashes[a] && <CopyButton value={hashes[a]!} />}
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

