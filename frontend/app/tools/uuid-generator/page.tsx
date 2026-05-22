"use client";

import { useMemo, useState } from "react";
import { Badge, Button, CopyButton, Label, Panel, ResultCard, TabBar, ToolHeader, ToolInput, ToolSelect, ToolShell } from "@/components/tool-ui";

const NAMESPACES: Record<string, string> = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
};

function uuidv4(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("Namespace must be a valid UUID.");
  return new Uint8Array(hex.match(/.{2}/g)?.map((part) => parseInt(part, 16)) || []);
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function uuidv5(namespace: string, name: string): Promise<string> {
  const ns = uuidToBytes(namespace);
  const input = new Uint8Array(ns.length + new TextEncoder().encode(name).length);
  input.set(ns, 0);
  input.set(new TextEncoder().encode(name), ns.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", input));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function describeUuid(uuid: string) {
  const version = uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])/i)?.[1] || "?";
  const variantNibble = parseInt(uuid.split("-")[3]?.[0] || "0", 16);
  const variant = variantNibble >= 8 && variantNibble <= 11 ? "RFC 4122" : "non-standard";
  return { version, variant };
}

export default function UuidGeneratorPage() {
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<"v4" | "v5">("v4");
  const [namespaceKind, setNamespaceKind] = useState("dns");
  const [customNamespace, setCustomNamespace] = useState(NAMESPACES.dns);
  const [name, setName] = useState("devtools.wellfriend.online");
  const [generated, setGenerated] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");

  const namespace = namespaceKind === "custom" ? customNamespace : NAMESPACES[namespaceKind];
  const firstInfo = useMemo(() => generated[0] ? describeUuid(generated[0]) : null, [generated]);

  const generate = async () => {
    setError("");
    try {
      const list: string[] = [];
      for (let i = 0; i < count; i++) {
        if (mode === "v4") list.push(uuidv4());
        else list.push(await uuidv5(namespace, count === 1 ? name : `${name}-${i + 1}`));
      }
      setGenerated(list);
      setHistory((prev) => [...list, ...prev].slice(0, 10));
    } catch (err) {
      setGenerated([]);
      setError(err instanceof Error ? err.message : "Unable to generate UUID.");
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "UUID Generator" }]} title="UUID Generator" description="Generate UUID v4 identifiers in bulk." />
      <div className="space-y-5">
        <TabBar active={mode} onChange={(value) => setMode(value as "v4" | "v5")} tabs={[{ label: "v4 random", value: "v4" }, { label: "v5 namespace", value: "v5" }]} />
        {mode === "v5" && (
          <Panel noPadding className="grid gap-3 p-4 sm:grid-cols-[180px_1fr]">
            <div>
              <Label>Namespace</Label>
              <ToolSelect value={namespaceKind} onChange={(event) => setNamespaceKind(event.target.value)}>
                <option value="dns">DNS</option>
                <option value="url">URL</option>
                <option value="oid">OID</option>
                <option value="x500">X.500</option>
                <option value="custom">Custom</option>
              </ToolSelect>
            </div>
            <div>
              <Label>Name</Label>
              <ToolInput value={name} onChange={(event) => setName(event.target.value)} placeholder="example.com" />
            </div>
            {namespaceKind === "custom" && (
              <div className="sm:col-span-2">
                <Label>Custom namespace UUID</Label>
                <ToolInput value={customNamespace} onChange={(event) => setCustomNamespace(event.target.value)} className="font-mono" />
              </div>
            )}
          </Panel>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Label>Quantity</Label>
          <Panel noPadding className="inline-flex flex-wrap p-0.5">
            {[1, 5, 10, 25, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
                  (count === n
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                }
              >
                {n}
              </button>
            ))}
          </Panel>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void generate()}>Generate</Button>
          {generated.length > 0 && <CopyButton value={generated.join("\n")} label="Copy all" />}
        </div>
        {error && <Panel noPadding className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</Panel>}
        {firstInfo && (
          <div className="grid gap-3 md:grid-cols-4">
            <ResultCard label="Version" value={`v${firstInfo.version}`} />
            <ResultCard label="Variant" value={firstInfo.variant} />
            <ResultCard label="Source" value={mode === "v4" ? "Random 122 bits" : "SHA-1 namespace/name"} />
            <ResultCard label="Structure" value="8-4-4-4-12 hex groups" />
          </div>
        )}
        <Panel noPadding className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">UUID structure</h2>
            <Badge variant="info">time_low-time_mid-time_high-clock-node</Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">v4 UUIDs are random and best for general identifiers. v5 UUIDs are deterministic for the same namespace and name. v1 UUIDs are timestamp-based and can reveal creation time and node identity, so this tool describes them but does not generate them by default.</p>
        </Panel>
        {generated.length > 0 && (
          <Panel noPadding>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {generated.map((u, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{u}</code>
                  <CopyButton value={u} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {history.length > 0 && (
          <div>
            <Label>Recent (this session)</Label>
            <Panel noPadding className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <ul className="space-y-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {history.map((u, i) => <li key={i} className="break-all">{u}</li>)}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
