"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { AlignLeft, BookOpen, Fingerprint, Hash, Key, Link, Lock, QrCode, Sparkles } from "lucide-react";
import { CopyButton, ResultCard } from "@/components/tool-ui";
import { passwordEntropy } from "@/lib/tool-insights";
import { NewToolPage } from "../_components/new-tool-pages";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "password" | "passphrase" | "token" | "uuid" | "nanoid" | "ulid" | "qr" | "lorem" | "slug";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "password", label: "Password", icon: Lock },
  { id: "passphrase", label: "Passphrase", icon: BookOpen },
  { id: "token", label: "Token", icon: Key },
  { id: "uuid", label: "UUID", icon: Fingerprint },
  { id: "nanoid", label: "NanoID", icon: Hash },
  { id: "ulid", label: "ULID", icon: Hash },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "lorem", label: "Lorem Ipsum", icon: AlignLeft },
  { id: "slug", label: "Slug", icon: Link },
];

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>/?";
const AMBIGUOUS = "{}[]()/'\"`~,;:.<>";
const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat".split(" ");
const STOP_WORDS = new Set(["a", "an", "and", "as", "at", "be", "but", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with"]);
const NAMESPACES: Record<string, string> = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
};

export default function GeneratorsWorkspacePage() {
  const [active, setActive] = useState<Tab>("password");

  return (
    <WorkspaceShell
      title="Generators"
      subtitle="Generate passwords, tokens, IDs, QR codes, and more"
      href="/tools/generators"
      icon={Sparkles}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="generators"
      intentGroup="generate"
    >
      {active === "password" && <PasswordTab />}
      {active === "passphrase" && <NewToolPage slug="passphrase-generator" embedded />}
      {active === "token" && <NewToolPage slug="random-token-generator" embedded />}
      {active === "uuid" && <UuidTab />}
      {active === "nanoid" && <NewToolPage slug="nanoid-generator" embedded />}
      {active === "ulid" && <NewToolPage slug="ulid-generator" embedded />}
      {active === "qr" && <QrTab />}
      {active === "lorem" && <LoremTab />}
      {active === "slug" && <SlugTab />}
    </WorkspaceShell>
  );
}

function PasswordTab() {
  const [length, setLength] = useState(20);
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [exclude, setExclude] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function generate() {
    setLoading(true);
    setTimeout(() => {
      let pool = `${upper ? UPPER : ""}${lower ? LOWER : ""}${numbers ? NUMBERS : ""}${symbols ? SYMBOLS : ""}`;
      if (exclude) pool = pool.split("").filter((char) => !AMBIGUOUS.includes(char)).join("");
      pool = Array.from(new Set(pool)).join("");
      if (!pool) {
        setItems([]);
        setLoading(false);
        return;
      }
      setItems(Array.from({ length: count }, () => randomString(pool, length)));
      setLoading(false);
    }, 0);
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 md:grid-cols-3">
        <div><FieldLabel>Length {length}</FieldLabel><input type="range" min={8} max={128} value={length} onChange={(event) => setLength(Number(event.target.value))} className={inputClass} /></div>
        <div><FieldLabel>Bulk count</FieldLabel><input type="number" min={1} max={20} value={count} onChange={(event) => setCount(clamp(Number(event.target.value), 1, 20))} className={inputClass} /></div>
        <div className="flex items-end"><PrimaryButton className="w-full" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate"}</PrimaryButton></div>
        <Check label="Uppercase" checked={upper} setChecked={setUpper} />
        <Check label="Lowercase" checked={lower} setChecked={setLower} />
        <Check label="Numbers" checked={numbers} setChecked={setNumbers} />
        <Check label="Symbols" checked={symbols} setChecked={setSymbols} />
        <Check label="Exclude ambiguous" checked={exclude} setChecked={setExclude} />
      </WorkspaceCard>
      {items.length > 0 && <CopyButton value={items.join("\n")} label="Copy all" />}
      <ResultList items={items} extra={(item) => {
        const entropy = passwordEntropy(item);
        return <span className="text-xs text-muted-foreground">{entropy.entropy.toFixed(1)} bits, {entropy.label}</span>;
      }} />
    </div>
  );
}

function UuidTab() {
  const [mode, setMode] = useState<"v4" | "v5">("v4");
  const [count, setCount] = useState(5);
  const [namespaceKind, setNamespaceKind] = useState("dns");
  const [customNamespace, setCustomNamespace] = useState(NAMESPACES.dns);
  const [name, setName] = useState("devtools.wellfriend.online");
  const [items, setItems] = useState<string[]>([]);
  const [error, setError] = useState("");
  const namespace = namespaceKind === "custom" ? customNamespace : NAMESPACES[namespaceKind];

  async function generate() {
    setError("");
    setTimeout(() => {
      void (async () => {
        try {
          const list: string[] = [];
          for (let i = 0; i < count; i++) list.push(mode === "v4" ? crypto.randomUUID() : await uuidv5(namespace, count === 1 ? name : `${name}-${i + 1}`));
          setItems(list);
        } catch (err) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Unable to generate UUIDs.");
        }
      })();
    }, 0);
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 md:grid-cols-3">
        <div><FieldLabel>Version</FieldLabel><select value={mode} onChange={(event) => setMode(event.target.value as "v4" | "v5")} className={inputClass}><option value="v4">v4 random</option><option value="v5">v5 namespace</option></select></div>
        <div><FieldLabel>Bulk count</FieldLabel><input type="number" min={1} max={100} value={count} onChange={(event) => setCount(clamp(Number(event.target.value), 1, 100))} className={inputClass} /></div>
        <div className="flex items-end"><PrimaryButton className="w-full" onClick={generate}>Generate</PrimaryButton></div>
        {mode === "v5" && (
          <>
            <div><FieldLabel>Namespace</FieldLabel><select value={namespaceKind} onChange={(event) => setNamespaceKind(event.target.value)} className={inputClass}><option value="dns">DNS</option><option value="url">URL</option><option value="custom">Custom</option></select></div>
            <div><FieldLabel>Name</FieldLabel><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></div>
            {namespaceKind === "custom" && <div><FieldLabel>Custom namespace</FieldLabel><input value={customNamespace} onChange={(event) => setCustomNamespace(event.target.value)} className={inputClass} /></div>}
          </>
        )}
      </WorkspaceCard>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {items.length > 0 && <CopyButton value={items.join("\n")} label="Copy all" />}
      <ResultList items={items} />
    </div>
  );
}

function QrTab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState("https://devtools.wellfriend.online");
  const [size, setSize] = useState(256);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!text.trim()) {
      setError("Enter content before generating a QR code.");
      return;
    }
    QRCode.toCanvas(canvas, text, { width: size, errorCorrectionLevel: level, color: { dark, light } }).then(() => setError("")).catch((err: unknown) => setError(err instanceof Error ? err.message : "QR generation failed."));
  }, [text, size, level, dark, light]);

  function download(type: "png" | "svg") {
    if (type === "png") {
      const url = canvasRef.current?.toDataURL("image/png");
      if (!url) return;
      downloadUrl(url, "qr-code.png");
      return;
    }
    void QRCode.toString(text, { type: "svg", errorCorrectionLevel: level, color: { dark, light } }).then((svg) => {
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      downloadUrl(url, "qr-code.svg");
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-4">
        <div><FieldLabel>Content</FieldLabel><input value={text} onChange={(event) => setText(event.target.value)} className={inputClass} /></div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><FieldLabel>Size</FieldLabel><select value={size} onChange={(event) => setSize(Number(event.target.value))} className={inputClass}><option>128</option><option>256</option><option>512</option></select></div>
          <div><FieldLabel>Error correction</FieldLabel><select value={level} onChange={(event) => setLevel(event.target.value as "L" | "M" | "Q" | "H")} className={inputClass}><option>L</option><option>M</option><option>Q</option><option>H</option></select></div>
          <div><FieldLabel>Foreground</FieldLabel><input type="color" value={dark} onChange={(event) => setDark(event.target.value)} className={inputClass} /></div>
          <div><FieldLabel>Background</FieldLabel><input type="color" value={light} onChange={(event) => setLight(event.target.value)} className={inputClass} /></div>
        </div>
      </WorkspaceCard>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <WorkspaceCard className="text-center">
        <canvas ref={canvasRef} className="mx-auto" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <SecondaryButton onClick={() => download("png")}>Download PNG</SecondaryButton>
          <SecondaryButton onClick={() => download("svg")}>Download SVG</SecondaryButton>
        </div>
      </WorkspaceCard>
    </div>
  );
}

function LoremTab() {
  const [type, setType] = useState("paragraphs");
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState("");

  function generate() {
    setTimeout(() => {
      const lines: string[] = [];
      if (type === "words") lines.push(Array.from({ length: count }, () => pick(WORDS)).join(" "));
      else {
        const unitCount = clamp(count, 1, 50);
        for (let i = 0; i < unitCount; i++) lines.push(type === "sentences" ? sentence() : paragraph());
      }
      setOutput(lines.join(type === "paragraphs" ? "\n\n" : "\n"));
    }, 0);
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="grid gap-4 sm:grid-cols-[180px_160px_auto]">
        <div><FieldLabel>Type</FieldLabel><select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}><option>paragraphs</option><option>sentences</option><option>words</option></select></div>
        <div><FieldLabel>Count</FieldLabel><input type="number" min={1} max={50} value={count} onChange={(event) => setCount(Number(event.target.value))} className={inputClass} /></div>
        <div className="flex items-end"><PrimaryButton onClick={generate}>Generate</PrimaryButton></div>
      </WorkspaceCard>
      <div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} /></div>
      <textarea value={output} readOnly rows={14} className={textareaClass} />
    </div>
  );
}

function SlugTab() {
  const [text, setText] = useState("");
  const [separator, setSeparator] = useState("-");
  const [lowercase, setLowercase] = useState(true);
  const [removeStop, setRemoveStop] = useState(false);
  const slug = useMemo(() => slugify(text, separator, lowercase, removeStop), [text, separator, lowercase, removeStop]);

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-4">
        <div><FieldLabel>Input text</FieldLabel><input value={text} onChange={(event) => setText(event.target.value)} placeholder="My great blog post" className={inputClass} /></div>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-foreground"><input type="radio" checked={separator === "-"} onChange={() => setSeparator("-")} /> Hyphen</label>
          <label className="text-sm text-foreground"><input type="radio" checked={separator === "_"} onChange={() => setSeparator("_")} /> Underscore</label>
          <Check label="Lowercase" checked={lowercase} setChecked={setLowercase} />
          <Check label="Remove stopwords" checked={removeStop} setChecked={setRemoveStop} />
        </div>
      </WorkspaceCard>
      <WorkspaceCard>
        <div className="flex items-center justify-between"><FieldLabel>Slug</FieldLabel><CopyButton value={slug} /></div>
        <code className="block break-all font-mono text-sm text-foreground">{slug || "-"}</code>
      </WorkspaceCard>
      <div className="grid gap-3 md:grid-cols-3">
        <ResultCard label="Length" value={String(slug.length)} />
        <ResultCard label="Words" value={String(wordTokens(text).length)} />
        <ResultCard label="URL safe" value={/^[a-z0-9_-]*$/i.test(slug) ? "Yes" : "No"} />
      </div>
    </div>
  );
}

function ResultList({ items, extra }: { items: string[]; extra?: (item: string) => ReactNode }) {
  return (
    <WorkspaceCard className="p-0">
      {items.length ? (
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <code className="break-all font-mono text-sm text-foreground">{item}</code>
                {extra?.(item)}
              </div>
              <CopyButton value={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
          Generate values to see results.
        </div>
      )}
    </WorkspaceCard>
  );
}

function Check({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> {label}</label>;
}

function randomString(pool: string, length: number) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => pool[byte % pool.length]).join("");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function pick(items: string[]) {
  return items[Math.floor(Math.random() * items.length)] ?? "lorem";
}

function sentence() {
  const words = Array.from({ length: 8 + Math.floor(Math.random() * 8) }, () => pick(WORDS));
  const text = words.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function paragraph() {
  return Array.from({ length: 4 }, sentence).join(" ");
}

function wordTokens(text: string) {
  return Array.from(text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").matchAll(/[A-Za-z0-9]+/g), (match) => match[0]);
}

function slugify(text: string, separator: string, lowercase: boolean, removeStop: boolean) {
  let tokens = wordTokens(text);
  if (lowercase) tokens = tokens.map((token) => token.toLowerCase());
  if (removeStop) tokens = tokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
  return tokens.join(separator);
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

function uuidToBytes(uuid: string) {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("Namespace must be a valid UUID.");
  return new Uint8Array(hex.match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? []);
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function uuidv5(namespace: string, name: string) {
  const ns = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(ns.length + nameBytes.length);
  input.set(ns);
  input.set(nameBytes, ns.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", input));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}
