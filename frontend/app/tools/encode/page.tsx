"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Binary, Code2, Cpu, Database, FileCode, Hash, Link, Radio, Type } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
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

type Tab = "base64" | "url" | "html" | "javascript" | "sql" | "unicode" | "hex" | "binary" | "morse";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "base64", label: "Base64", icon: Binary },
  { id: "url", label: "URL", icon: Link },
  { id: "html", label: "HTML", icon: FileCode },
  { id: "javascript", label: "JavaScript", icon: Code2 },
  { id: "sql", label: "SQL", icon: Database },
  { id: "unicode", label: "Unicode", icon: Type },
  { id: "hex", label: "Hex", icon: Hash },
  { id: "binary", label: "Binary", icon: Cpu },
  { id: "morse", label: "Morse", icon: Radio },
];

export default function EncodeWorkspacePage() {
  const [active, setActive] = useState<Tab>("base64");

  return (
    <WorkspaceShell
      title="Encode & Decode"
      subtitle="Encode, decode, escape, and convert between formats"
      href="/tools/encode"
      icon={ArrowLeftRight}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="encode"
      intentGroup="convert"
    >
      {active === "base64" && <Base64Tab />}
      {active === "url" && <UrlTab />}
      {active === "html" && <HtmlTab />}
      {active === "javascript" && <JavaScriptTab />}
      {active === "sql" && <SqlTab />}
      {active === "unicode" && <UnicodeTab />}
      {active === "hex" && <HexTab />}
      {active === "binary" && <BinaryTab />}
      {active === "morse" && <MorseTab />}
    </WorkspaceShell>
  );
}

function Base64Tab() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  async function loadFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    setMode("encode");
    setInput(bytesToBase64(bytes));
    setOutput(toUrlSafe(bytesToBase64(bytes), urlSafe));
    setFileName(`${file.name} (${formatBytes(file.size)})`);
  }

  function convert() {
    try {
      setError("");
      if (mode === "encode") setOutput(toUrlSafe(bytesToBase64(new TextEncoder().encode(input)), urlSafe));
      else setOutput(new TextDecoder().decode(base64ToBytes(fromUrlSafe(input, urlSafe))));
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Invalid Base64 input.");
    }
  }

  return (
    <CodecLayout
      controls={<><Segmented value={mode} onChange={setMode} options={[["encode", "Encode"], ["decode", "Decode"]]} /><Checkbox checked={urlSafe} onChange={setUrlSafe} label="URL-safe Base64" /></>}
      input={input}
      setInput={setInput}
      output={output}
      inputLabel="Input"
      outputLabel="Output"
      onConvert={convert}
      error={error}
      extraTop={<WorkspaceCard><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">File encode</p><p className="text-xs text-muted-foreground">Choose a file to encode locally as Base64.</p></div><input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm dark:file:bg-zinc-800 dark:file:text-zinc-100" /></div>{fileName && <p className="mt-2 text-xs text-muted-foreground">Loaded {fileName}</p>}</WorkspaceCard>}
      footer={<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Input: {input.length.toLocaleString()} characters</span><span>Output: {output.length.toLocaleString()} characters</span>{mode === "decode" && output && <SecondaryButton onClick={() => downloadBytes("decoded.bin", new TextEncoder().encode(output))}>Download decoded file</SecondaryButton>}</div>}
    />
  );
}

function UrlTab() {
  const [sub, setSub] = useState<"codec" | "parse" | "build">("codec");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [plusSpace, setPlusSpace] = useState(false);
  const [input, setInput] = useState("https://example.com/search?q=hello world#top");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [builder, setBuilder] = useState({ protocol: "https", host: "example.com", port: "", path: "/search", fragment: "top" });
  const [params, setParams] = useState([{ key: "q", value: "hello world" }]);

  function convert() {
    try {
      setError("");
      if (sub === "codec") {
        const next = mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(plusSpace ? input.replace(/\+/g, "%20") : input);
        setOutput(plusSpace && mode === "encode" ? next.replace(/%20/g, "+") : next);
      }
      if (sub === "parse") {
        const url = new URL(normalizeUrl(input));
        setOutput(JSON.stringify(urlParts(url), null, 2));
      }
      if (sub === "build") {
        const url = new URL(`${builder.protocol}://${builder.host}${builder.port ? `:${builder.port}` : ""}${builder.path || "/"}`);
        params.filter((param) => param.key).forEach((param) => url.searchParams.append(param.key, param.value));
        url.hash = builder.fragment;
        setOutput(url.toString());
      }
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "URL operation failed.");
    }
  }

  return (
    <div className="space-y-5">
      <Segmented value={sub} onChange={setSub} options={[["codec", "Encode / Decode"], ["parse", "Parse"], ["build", "Build"]]} />
      {sub === "codec" && <CodecLayout controls={<><Segmented value={mode} onChange={setMode} options={[["encode", "Encode"], ["decode", "Decode"]]} /><Checkbox checked={plusSpace} onChange={setPlusSpace} label="Space as +" /></>} input={input} setInput={setInput} output={output} onConvert={convert} error={error} inputLabel="Text or URL component" outputLabel="Converted output" />}
      {sub === "parse" && (
        <div className="space-y-4">
          <div><FieldLabel>URL</FieldLabel><input value={input} onChange={(event) => setInput(event.target.value)} className={inputClass} /></div>
          <PrimaryButton onClick={convert}>Parse</PrimaryButton>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {output && <UrlPartsTable value={JSON.parse(output) as Record<string, string | [string, string][]>} />}
        </div>
      )}
      {sub === "build" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div><FieldLabel>Protocol</FieldLabel><input value={builder.protocol} onChange={(event) => setBuilder({ ...builder, protocol: event.target.value })} className={inputClass} /></div>
            <div><FieldLabel>Host</FieldLabel><input value={builder.host} onChange={(event) => setBuilder({ ...builder, host: event.target.value })} className={inputClass} /></div>
            <div><FieldLabel>Port</FieldLabel><input value={builder.port} onChange={(event) => setBuilder({ ...builder, port: event.target.value })} className={inputClass} /></div>
            <div><FieldLabel>Path</FieldLabel><input value={builder.path} onChange={(event) => setBuilder({ ...builder, path: event.target.value })} className={inputClass} /></div>
            <div><FieldLabel>Fragment</FieldLabel><input value={builder.fragment} onChange={(event) => setBuilder({ ...builder, fragment: event.target.value })} className={inputClass} /></div>
          </div>
          <WorkspaceCard className="space-y-3">
            <FieldLabel>Query params</FieldLabel>
            {params.map((param, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input value={param.key} onChange={(event) => setParams(params.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} className={inputClass} placeholder="key" />
                <input value={param.value} onChange={(event) => setParams(params.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} className={inputClass} placeholder="value" />
                <SecondaryButton onClick={() => setParams(params.filter((_, i) => i !== index))}>Remove</SecondaryButton>
              </div>
            ))}
            <SecondaryButton onClick={() => setParams([...params, { key: "", value: "" }])}>Add row</SecondaryButton>
          </WorkspaceCard>
          <PrimaryButton onClick={convert}>Build URL</PrimaryButton>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <OutputBox label="Assembled URL" value={output} />
        </div>
      )}
    </div>
  );
}

function HtmlTab() {
  const [mode, setMode] = useState<"escape" | "unescape" | "entities">("escape");
  const [input, setInput] = useState("");
  const [quotes, setQuotes] = useState(true);
  const [apos, setApos] = useState(true);
  const [query, setQuery] = useState("");
  const output = mode === "escape" ? escapeHtml(input, quotes, apos) : mode === "unescape" ? unescapeHtml(input) : "";
  const filtered = htmlEntities.filter((item) => `${item.name} ${item.description} ${item.code}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"], ["entities", "Entities"]]} />
      {mode === "entities" ? (
        <>
          <div><FieldLabel>Search entities</FieldLabel><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="amp, arrow, copyright" /></div>
          <WorkspaceCard className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Character</th><th className="px-4 py-2">Description</th><th /></tr></thead>
              <tbody>{filtered.map((entity) => <tr key={entity.name} className="border-b border-border last:border-b-0"><td className="px-4 py-2 font-mono">&amp;{entity.name};</td><td className="px-4 py-2 font-mono">{entity.code}</td><td className="px-4 py-2">{entity.char}</td><td className="px-4 py-2 text-muted-foreground">{entity.description}</td><td className="px-4 py-2"><CopyButton value={`&${entity.name};`} /></td></tr>)}</tbody>
            </table>
          </WorkspaceCard>
        </>
      ) : (
        <CodecLayout controls={<><Checkbox checked={quotes} onChange={setQuotes} label="Escape quotes" /><Checkbox checked={apos} onChange={setApos} label="Escape apostrophes" /></>} input={input} setInput={setInput} output={output} onConvert={() => undefined} inputLabel="Input" outputLabel="Output" auto />
      )}
    </div>
  );
}

function JavaScriptTab() {
  const [mode, setMode] = useState<"escape" | "unescape">("escape");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function convert() {
    try {
      setOutput(mode === "escape" ? JSON.stringify(input).slice(1, -1).replace(/'/g, "\\'") : JSON.parse(`"${input.replace(/\\'/g, "'")}"`));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not unescape JavaScript string.");
    }
  }

  return <CodecLayout controls={<Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"]]} />} input={input} setInput={setInput} output={output} onConvert={convert} error={error} inputLabel="JavaScript string" outputLabel="Output" footer={<WorkspaceCard><p className="font-mono text-sm text-muted-foreground">Escapes: \\n, \\t, \\', \\", \\\\, \\uXXXX</p></WorkspaceCard>} />;
}

function SqlTab() {
  const [mode, setMode] = useState<"escape" | "unescape">("escape");
  const [dialect, setDialect] = useState("mysql");
  const [input, setInput] = useState("");
  const output = mode === "escape" ? sqlEscape(input, dialect) : sqlUnescape(input, dialect);

  return <CodecLayout controls={<><Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"]]} /><div><FieldLabel>Dialect</FieldLabel><select value={dialect} onChange={(event) => setDialect(event.target.value)} className={inputClass}><option>mysql</option><option>postgresql</option><option>sqlite</option><option>mssql</option></select></div></>} input={input} setInput={setInput} output={output} onConvert={() => undefined} inputLabel="SQL string" outputLabel="Output" auto footer={<p className="text-xs text-muted-foreground">Use parameterized queries for production data access.</p>} />;
}

function UnicodeTab() {
  const [mode, setMode] = useState<"escape" | "unescape">("escape");
  const [format, setFormat] = useState<"u" | "U" | "html" | "percent">("u");
  const [input, setInput] = useState("Hello");
  const [output, setOutput] = useState("");
  const chars = Array.from(input);

  function convert() {
    setOutput(mode === "escape" ? chars.map((char) => unicodeEscape(char, format)).join("") : unicodeUnescape(input));
  }

  return (
    <div className="space-y-5">
      <CodecLayout controls={<><Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"]]} /><div><FieldLabel>Format</FieldLabel><select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className={inputClass}><option value="u">\\uXXXX</option><option value="U">\\UXXXXXXXX</option><option value="html">&amp;#xXXXX;</option><option value="percent">%uXXXX</option></select></div></>} input={input} setInput={setInput} output={output} onConvert={convert} inputLabel="Input" outputLabel="Output" />
      <WorkspaceCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Char</th><th className="px-4 py-2">Code point</th></tr></thead>
          <tbody>{chars.map((char, index) => <tr key={`${char}-${index}`} className="border-b border-border last:border-b-0"><td className="px-4 py-2 font-mono">{JSON.stringify(char)}</td><td className="px-4 py-2 font-mono">U+{(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}</td></tr>)}</tbody>
        </table>
      </WorkspaceCard>
    </div>
  );
}

function HexTab() {
  const [mode, setMode] = useState<"toHex" | "toText">("toHex");
  const [delimiter, setDelimiter] = useState<"space" | "none" | "prefix">("space");
  const [input, setInput] = useState("DevTools");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function convert() {
    try {
      if (mode === "toHex") {
        const hex = Array.from(new TextEncoder().encode(input)).map((byte) => byte.toString(16).padStart(2, "0"));
        setOutput(delimiter === "none" ? hex.join("") : delimiter === "prefix" ? hex.map((value) => `0x${value}`).join(" ") : hex.join(" "));
      } else {
        const clean = input.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "");
        if (clean.length % 2) throw new Error("Hex input must contain complete byte pairs.");
        setOutput(new TextDecoder().decode(new Uint8Array(clean.match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [])));
      }
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Hex conversion failed.");
    }
  }

  return <CodecLayout controls={<><Segmented value={mode} onChange={setMode} options={[["toHex", "Text to Hex"], ["toText", "Hex to Text"]]} /><div><FieldLabel>Delimiter</FieldLabel><select value={delimiter} onChange={(event) => setDelimiter(event.target.value as typeof delimiter)} className={inputClass}><option value="space">Space</option><option value="none">None</option><option value="prefix">0x prefix</option></select></div></>} input={input} setInput={setInput} output={output} onConvert={convert} error={error} inputLabel="Input" outputLabel="Output" />;
}

function BinaryTab() {
  const [mode, setMode] = useState<"toBin" | "toText">("toBin");
  const [spaced, setSpaced] = useState(true);
  const [input, setInput] = useState("DevTools");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function convert() {
    try {
      if (mode === "toBin") {
        const bits = Array.from(new TextEncoder().encode(input)).map((byte) => byte.toString(2).padStart(8, "0"));
        setOutput(bits.join(spaced ? " " : ""));
      } else {
        const clean = input.replace(/\s+/g, "");
        if (clean.length % 8) throw new Error("Binary input must contain complete 8-bit bytes.");
        if (!/^[01]*$/.test(clean)) throw new Error("Binary input can only contain 0 and 1.");
        setOutput(new TextDecoder().decode(new Uint8Array(clean.match(/.{8}/g)?.map((part) => parseInt(part, 2)) ?? [])));
      }
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Binary conversion failed.");
    }
  }

  return <CodecLayout controls={<><Segmented value={mode} onChange={setMode} options={[["toBin", "Text to Binary"], ["toText", "Binary to Text"]]} /><Checkbox checked={spaced} onChange={setSpaced} label="Space between bytes" /></>} input={input} setInput={setInput} output={output} onConvert={convert} error={error} inputLabel="Input" outputLabel="Output" />;
}

function MorseTab() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("SOS from DevTools");
  const output = useMemo(() => mode === "encode" ? textToMorse(input) : morseToText(input), [input, mode]);
  const [audioError, setAudioError] = useState("");

  async function play() {
    try {
      setAudioError("");
      await playMorse(output);
    } catch {
      setAudioError("Audio playback is not available in this browser.");
    }
  }

  return (
    <div className="space-y-5">
      <CodecLayout controls={<Segmented value={mode} onChange={setMode} options={[["encode", "Text to Morse"], ["decode", "Morse to Text"]]} />} input={input} setInput={setInput} output={output} onConvert={() => undefined} inputLabel="Input" outputLabel="Output" auto />
      <SecondaryButton onClick={() => void play()} disabled={!output || mode !== "encode"}><Radio className="h-4 w-4" />Play audio</SecondaryButton>
      {audioError && <p className="text-sm text-red-600">{audioError}</p>}
    </div>
  );
}

function CodecLayout({
  controls,
  input,
  setInput,
  output,
  onConvert,
  error,
  inputLabel,
  outputLabel,
  footer,
  extraTop,
  auto = false,
}: {
  controls?: React.ReactNode;
  input: string;
  setInput: (value: string) => void;
  output: string;
  onConvert: () => void;
  error?: string;
  inputLabel: string;
  outputLabel: string;
  footer?: React.ReactNode;
  extraTop?: React.ReactNode;
  auto?: boolean;
}) {
  return (
    <div className="space-y-5">
      {controls && <div className="flex flex-wrap items-end gap-3">{controls}</div>}
      {extraTop}
      <div className="grid gap-4 lg:grid-cols-2">
        <div><div className="flex items-center justify-between"><FieldLabel>{inputLabel}</FieldLabel><button type="button" onClick={() => setInput("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button></div><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[260px] ${error ? "border-red-500" : ""}`} /></div>
        <div><div className="flex items-center justify-between"><FieldLabel>{outputLabel}</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[260px]`} /></div>
      </div>
      {!auto && <PrimaryButton onClick={onConvert}>Convert</PrimaryButton>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {footer}
    </div>
  );
}

function OutputBox({ label, value }: { label: string; value: string }) {
  return <div><div className="flex items-center justify-between"><FieldLabel>{label}</FieldLabel><CopyButton value={value} label="Copy" /></div><input value={value} readOnly className={monoInputClass} /></div>;
}

function UrlPartsTable({ value }: { value: Record<string, string | [string, string][]> }) {
  return (
    <WorkspaceCard className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <tbody>{Object.entries(value).map(([key, val]) => <tr key={key} className="border-b border-border last:border-b-0"><td className="w-40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">{key}</td><td className="break-all px-4 py-2 font-mono text-xs">{Array.isArray(val) ? val.map(([k, v]) => `${k}=${v}`).join("\n") || "(none)" : val || "(empty)"}</td><td className="px-4 py-2"><CopyButton value={Array.isArray(val) ? JSON.stringify(val) : val} /></td></tr>)}</tbody>
      </table>
    </WorkspaceCard>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex min-h-10 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />{label}</label>;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">{options.map(([id, label]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toUrlSafe(value: string, enabled: boolean) {
  return enabled ? value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") : value;
}

function fromUrlSafe(value: string, enabled: boolean) {
  let next = enabled ? value.replace(/-/g, "+").replace(/_/g, "/") : value;
  while (next.length % 4) next += "=";
  return next;
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
}

function urlParts(url: URL) {
  return {
    protocol: url.protocol.replace(":", ""),
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    query: Array.from(url.searchParams.entries()),
    fragment: url.hash.replace("#", ""),
    username: url.username,
  };
}

const htmlEntities = [
  { char: " ", name: "nbsp", code: "&#160;", description: "Non-breaking space" },
  { char: "<", name: "lt", code: "&#60;", description: "Less-than sign" },
  { char: ">", name: "gt", code: "&#62;", description: "Greater-than sign" },
  { char: "&", name: "amp", code: "&#38;", description: "Ampersand" },
  { char: '"', name: "quot", code: "&#34;", description: "Quotation mark" },
  { char: "'", name: "apos", code: "&#39;", description: "Apostrophe" },
  { char: String.fromCharCode(169), name: "copy", code: "&#169;", description: "Copyright" },
  { char: String.fromCharCode(174), name: "reg", code: "&#174;", description: "Registered trademark" },
  { char: String.fromCharCode(8364), name: "euro", code: "&#8364;", description: "Euro" },
  { char: String.fromCharCode(8594), name: "rarr", code: "&#8594;", description: "Right arrow" },
  { char: String.fromCharCode(8592), name: "larr", code: "&#8592;", description: "Left arrow" },
];

function escapeHtml(value: string, quotes: boolean, apos: boolean) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === '"' && !quotes) return char;
    if (char === "'" && !apos) return char;
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char;
  });
}

function unescapeHtml(value: string) {
  return value.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec))).replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" }[entity] ?? entity));
}

function sqlEscape(value: string, dialect: string) {
  const quoteEscaped = value.replace(/'/g, "''");
  return dialect === "mysql" || dialect === "sqlite" ? quoteEscaped.replace(/\\/g, "\\\\") : quoteEscaped;
}

function sqlUnescape(value: string, dialect: string) {
  const slash = dialect === "mysql" || dialect === "sqlite" ? value.replace(/\\\\/g, "\\") : value;
  return slash.replace(/''/g, "'");
}

function unicodeEscape(char: string, format: "u" | "U" | "html" | "percent") {
  const code = (char.codePointAt(0) ?? 0).toString(16).toUpperCase();
  if (format === "U") return `\\U${code.padStart(8, "0")}`;
  if (format === "html") return `&#x${code};`;
  if (format === "percent") return `%u${code.padStart(4, "0")}`;
  return `\\u${code.padStart(4, "0")}`;
}

function unicodeUnescape(value: string) {
  return value
    .replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

const morse: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-", '"': ".-..-.", "@": ".--.-.",
};
const reverseMorse = Object.fromEntries(Object.entries(morse).map(([key, value]) => [value, key]));

function textToMorse(value: string) {
  return value.toUpperCase().split(/\s+/).map((word) => word.split("").map((char) => morse[char] || "").filter(Boolean).join(" ")).join(" / ");
}

function morseToText(value: string) {
  return value.split(" / ").map((word) => word.trim().split(/\s+/).map((code) => reverseMorse[code] || "").join("")).join(" ");
}

async function playMorse(value: string) {
  const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("No audio context.");
  const context = new AudioCtor();
  let time = context.currentTime;
  for (const char of value) {
    if (char === "." || char === "-") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 620;
      osc.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.2, time + 0.01);
      const duration = char === "." ? 0.08 : 0.24;
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.start(time);
      osc.stop(time + duration + 0.02);
      time += duration + 0.08;
    } else {
      time += char === "/" ? 0.35 : 0.14;
    }
  }
}

function downloadBytes(filename: string, bytes: Uint8Array) {
  const blobBytes = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([blobBytes.buffer]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
