"use client";

import { useEffect, useMemo, useState } from "react";
import { diffLines, type Change } from "diff";
import yaml from "js-yaml";
import {
  Badge,
  Button,
  Checkbox,
  CodeBlock,
  CopyButton,
  Label,
  Panel,
  ResultCard,
  TabBar,
  ToolInput,
  ToolSelect,
  ToolShell,
  ToolTextarea,
} from "@/components/tool-ui";
import { md5 } from "@/lib/md5";

type NewToolSlug =
  | "ulid-generator"
  | "nanoid-generator"
  | "random-token-generator"
  | "passphrase-generator"
  | "duplicate-line-remover"
  | "case-converter"
  | "regex-replace"
  | "regex-escape"
  | "timezone-converter"
  | "duration-calculator"
  | "hex-rgb-hsl-converter"
  | "contrast-checker"
  | "css-clamp-calculator"
  | "unicode-escape"
  | "blake2-generator"
  | "hash-verifier"
  | "jwt-verifier"
  | "jsonpath-tester"
  | "json-tree-viewer"
  | "yaml-diff"
  | "code-diff"
  | "recent-pastes"
  | "url-query-builder"
  | "docker-compose-validator"
  | "nginx-config-checker"
  | "systemd-unit-generator"
  | "toml-formatter"
  | "toml-validator"
  | "toml-to-json";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;
type TomlPrimitive = string | number | boolean;
type TomlValue = TomlPrimitive | TomlPrimitive[] | Record<string, TomlPrimitive>;
interface TomlObject {
  [key: string]: TomlValue | TomlObject;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const COMMON_WORDS = `
able about above accept across action active actual address admire adult advice after again agent agree ahead alarm album alert alive allow almost alone along alter always among amount anchor angle angry animal annual answer anyone apart apple apply arena argue arise around artist aspect asset audio audit avoid aware badly baker basic beach began begin being below bench berry birth black blame blank blend blind block blood board bonus boost brain brand bread break brick brief bring broad brown brush build buyer cable calm candy carry catch cause chain chair chart chase cheap check chest chief child claim class clean clear clerk climb clock close cloud coach coast color comic common coral count cover craft crash cream creek crime cross crowd crown daily dance dated deals death debug delay depth diary dirty dozen draft drama dream dress drink drive early earth eager eagle eight elder empty enemy enjoy enter entry equal error event every exact exist extra faith false fancy fault favor feast fence field final first flame flash fleet floor focus force forge frame fresh front frost fruit giant gift glass globe glory grace grade grain grand grape graph grass great green greet grief gross group guard guest habit happy harbor heavy hello hence honey honor hotel house human ideal image imply index inner input issue ivory jewel joint judge juice knife known label large later laugh layer learn lease least leave legal lemon level light limit local lodge logic loose lucky lunch magic major maker mango maple march match maybe medal mercy metal meter might minor model money month moral motor mount mouse mouth movie music naive nerve never night noble noise north novel nurse occur ocean offer often olive onion opera orbit order other outer owner paint panel paper party peace peach pearl phase phone piano piece pilot pitch place plain plant plate point power price pride prime print prize proof proud quiet radio raise range rapid reach ready relay reply right river roast robot rocky royal ruler salad scale scene scope score scrap sense serve seven shade shape share sharp sheet shelf shell shift shine shirt shock shore short shown sight since skill sleep slice smart smile smoke snake solid solve sound south space spare speak speed spend spice spike split sport stack stage stair stand start state steam steel stick stone store storm story strip style sugar suite sunny super sweet swing table taste teach thank theme thick thing think third thorn three throw tiger title today token total tower trace track trade train trend trial truck trust truth uncle under union unity upper urban usual valid value video visit voice waste watch water wheat wheel where white whole whose woman world worry worth write wrong young youth zebra zero absent absorb accent access accord accuse adapt adjust adopt advance afford agency agenda almost answer assign assist assume assure attend august author backup banner barrel basket beacon belief bother branch budget burden butter camera campus cancel carbon career castle casual center chance circle client coffee column comply copper corner cotton couple cousin custom damage danger decide defect demand depend design device direct divide domain double effect effort engine estate expand export fabric factor famous filter future garden gather gentle golden handle hidden impact import income inside island laptop legacy market member method minute modern option output packet parent phrase policy public record remote report sample search secure select signal simple socket source status stream submit syntax system target thread update useful vendor window wizard
`.trim().split(/\s+/);

const TIMEZONES = [
  ["UTC", "UTC"],
  ["US Eastern", "America/New_York"],
  ["US Central", "America/Chicago"],
  ["US Mountain", "America/Denver"],
  ["US Pacific", "America/Los_Angeles"],
  ["London", "Europe/London"],
  ["Paris", "Europe/Paris"],
  ["Berlin", "Europe/Berlin"],
  ["Moscow", "Europe/Moscow"],
  ["Dubai", "Asia/Dubai"],
  ["India", "Asia/Kolkata"],
  ["Bangkok", "Asia/Bangkok"],
  ["Singapore", "Asia/Singapore"],
  ["Tokyo", "Asia/Tokyo"],
  ["Seoul", "Asia/Seoul"],
  ["Sydney", "Australia/Sydney"],
  ["Auckland", "Pacific/Auckland"],
  ["Sao Paulo", "America/Sao_Paulo"],
  ["Mexico City", "America/Mexico_City"],
  ["Toronto", "America/Toronto"],
  ["Johannesburg", "Africa/Johannesburg"],
  ["Cairo", "Africa/Cairo"],
] as const;

const COLOR_NAMES: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  gray: "#808080",
  grey: "#808080",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  transparent: "#00000000",
};

const TAILWIND_COLORS: Record<string, string> = {
  "slate-500": "#64748b",
  "gray-500": "#6b7280",
  "zinc-500": "#71717a",
  "neutral-500": "#737373",
  "stone-500": "#78716c",
  "red-500": "#ef4444",
  "orange-500": "#f97316",
  "amber-500": "#f59e0b",
  "yellow-500": "#eab308",
  "lime-500": "#84cc16",
  "green-500": "#22c55e",
  "emerald-500": "#10b981",
  "teal-500": "#14b8a6",
  "cyan-500": "#06b6d4",
  "sky-500": "#0ea5e9",
  "blue-500": "#3b82f6",
  "indigo-500": "#6366f1",
  "violet-500": "#8b5cf6",
  "purple-500": "#a855f7",
  "fuchsia-500": "#d946ef",
  "pink-500": "#ec4899",
  "rose-500": "#f43f5e",
};

const COMMON_NGINX_DIRECTIVES = new Set([
  "events",
  "http",
  "server",
  "location",
  "upstream",
  "listen",
  "server_name",
  "root",
  "index",
  "proxy_pass",
  "proxy_set_header",
  "ssl_certificate",
  "ssl_certificate_key",
  "ssl_protocols",
  "ssl_ciphers",
  "gzip",
  "add_header",
  "return",
  "rewrite",
  "try_files",
  "include",
  "access_log",
  "error_log",
  "client_max_body_size",
]);

export function NewToolPage({ slug }: { slug: NewToolSlug }) {
  switch (slug) {
    case "ulid-generator":
      return <UlidGenerator />;
    case "nanoid-generator":
      return <NanoidGenerator />;
    case "random-token-generator":
      return <RandomTokenGenerator />;
    case "passphrase-generator":
      return <PassphraseGenerator />;
    case "duplicate-line-remover":
      return <DuplicateLineRemover />;
    case "case-converter":
      return <CaseConverter />;
    case "regex-replace":
      return <RegexReplace />;
    case "regex-escape":
      return <RegexEscape />;
    case "timezone-converter":
      return <TimezoneConverter />;
    case "duration-calculator":
      return <DurationCalculator />;
    case "hex-rgb-hsl-converter":
      return <ColorConverter />;
    case "contrast-checker":
      return <ContrastChecker />;
    case "css-clamp-calculator":
      return <CssClampCalculator />;
    case "unicode-escape":
      return <UnicodeEscapeTool />;
    case "blake2-generator":
      return <Blake2Generator />;
    case "hash-verifier":
      return <HashVerifier />;
    case "jwt-verifier":
      return <JwtVerifier />;
    case "jsonpath-tester":
      return <JsonPathTester />;
    case "json-tree-viewer":
      return <JsonTreeViewer />;
    case "yaml-diff":
      return <YamlDiff />;
    case "code-diff":
      return <CodeDiff />;
    case "recent-pastes":
      return <RecentPastes />;
    case "url-query-builder":
      return <UrlQueryBuilder />;
    case "docker-compose-validator":
      return <DockerComposeValidator />;
    case "nginx-config-checker":
      return <NginxConfigChecker />;
    case "systemd-unit-generator":
      return <SystemdUnitGenerator />;
    case "toml-formatter":
      return <TomlFormatter />;
    case "toml-validator":
      return <TomlValidator />;
    case "toml-to-json":
      return <TomlToJson />;
  }
}

function ToolFrame({ slug, children }: { slug: NewToolSlug; children: React.ReactNode }) {
  return (
    <ToolShell slug={slug} footer>
      <div className="space-y-5">{children}</div>
    </ToolShell>
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomInt(max: number) {
  if (max <= 0) return 0;
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % max;
}

function metric(label: string, value: string, variant: "default" | "success" | "error" = "default") {
  return <ResultCard label={label} value={value} variant={variant} />;
}

function deferCompute(setLoading: (value: boolean) => void, compute: () => void) {
  setLoading(true);
  setTimeout(() => {
    try {
      compute();
    } finally {
      setLoading(false);
    }
  }, 0);
}

function LoadingBadge({ label = "Computing..." }: { label?: string }) {
  return (
    <Badge variant="info" className="gap-2">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </Badge>
  );
}

function SimpleOutput({ label, value, rows = 8 }: { label: string; value: string; rows?: number }) {
  return (
    <Panel noPadding className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <CopyButton value={value} label="Copy" />
      </div>
      <ToolTextarea value={value} readOnly rows={rows} className="font-mono" />
    </Panel>
  );
}

function UlidGenerator() {
  const [count, setCount] = useState(5);
  const [items, setItems] = useState<string[]>(() => [generateUlid()]);
  const [loading, setLoading] = useState(false);
  const first = items[0] ? decodeUlid(items[0]) : null;

  function generate() {
    deferCompute(setLoading, () => {
      setItems(Array.from({ length: count }, () => generateUlid()));
    });
  }

  return (
    <ToolFrame slug="ulid-generator">
      <div className="flex flex-wrap items-end gap-3">
        <ToolInput label="Bulk count" type="number" min={1} max={100} value={count} onChange={(event) => setCount(clampNumber(event.target.value, 1, 100))} />
        <Button variant="primary" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate ULIDs"}</Button>
        <CopyButton value={items.join("\n")} label="Copy all" />
        {loading && <LoadingBadge label="Generating ULIDs..." />}
      </div>
      {first && (
        <div className="grid gap-3 md:grid-cols-3">
          {metric("Timestamp", first.date)}
          {metric("Unix ms", String(first.timestamp))}
          {metric("Randomness", first.randomness)}
        </div>
      )}
      <Panel noPadding>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{item}</code>
              <CopyButton value={item} />
            </li>
          ))}
        </ul>
      </Panel>
    </ToolFrame>
  );
}

function generateUlid(date = Date.now()) {
  let time = BigInt(date);
  let encodedTime = "";
  for (let i = 0; i < 10; i++) {
    encodedTime = ULID_ALPHABET[Number(time % 32n)] + encodedTime;
    time /= 32n;
  }
  const bytes = randomBytes(10);
  let random = 0n;
  bytes.forEach((byte) => {
    random = (random << 8n) | BigInt(byte);
  });
  let encodedRandom = "";
  for (let i = 0; i < 16; i++) {
    encodedRandom = ULID_ALPHABET[Number(random % 32n)] + encodedRandom;
    random /= 32n;
  }
  return encodedTime + encodedRandom;
}

function decodeUlid(value: string) {
  let timestamp = 0n;
  for (const char of value.slice(0, 10)) {
    timestamp = timestamp * 32n + BigInt(ULID_ALPHABET.indexOf(char));
  }
  const ms = Number(timestamp);
  return { timestamp: ms, date: new Date(ms).toISOString(), randomness: value.slice(10) };
}

function NanoidGenerator() {
  const [size, setSize] = useState(21);
  const [alphabet, setAlphabet] = useState(URL_ALPHABET);
  const [count, setCount] = useState(5);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const entropy = size * Math.log2(Math.max(1, new Set(alphabet).size));
  const collision = count > 1 ? (count * (count - 1)) / (2 * 2 ** Math.min(entropy, 1024)) : 0;

  function generate() {
    deferCompute(setLoading, () => {
      const chars = Array.from(new Set(alphabet.split("")));
      setItems(Array.from({ length: count }, () => Array.from({ length: size }, () => chars[randomInt(chars.length)] ?? "").join("")));
    });
  }

  return (
    <ToolFrame slug="nanoid-generator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-3">
        <ToolInput label="Size" type="range" min={4} max={64} value={size} onChange={(event) => setSize(clampNumber(event.target.value, 4, 64))} />
        <ToolInput label="Bulk count" type="number" min={1} max={100} value={count} onChange={(event) => setCount(clampNumber(event.target.value, 1, 100))} />
        <ToolInput label="Alphabet" value={alphabet} onChange={(event) => setAlphabet(event.target.value)} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Character count", String(size))}
        {metric("Entropy", `${entropy.toFixed(1)} bits`)}
        {metric("Collision chance", collision < 1e-12 ? "< 1e-12" : collision.toExponential(3))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={generate} disabled={!alphabet || loading}>{loading ? "Generating..." : "Generate NanoIDs"}</Button>
        <CopyButton value={items.join("\n")} label="Copy all" />
        {loading && <LoadingBadge label="Generating NanoIDs..." />}
      </div>
      <SimpleList items={items} />
    </ToolFrame>
  );
}

function RandomTokenGenerator() {
  const [bytes, setBytes] = useState(32);
  const [format, setFormat] = useState("base64url");
  const [count, setCount] = useState(5);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function tokenFromBytes(value: Uint8Array) {
    if (format === "hex") return bytesToHex(value);
    if (format === "base64") return bytesToBase64(value);
    if (format === "base64url") return bytesToBase64Url(value);
    if (format === "alnum") return Array.from({ length: bytes }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[randomInt(62)]).join("");
    const uuidBytes = value.slice(0, 16);
    uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40;
    uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;
    const hex = bytesToHex(uuidBytes);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function generate() {
    deferCompute(setLoading, () => {
      setItems(Array.from({ length: count }, () => tokenFromBytes(randomBytes(Math.max(bytes, 16)))));
    });
  }

  return (
    <ToolFrame slug="random-token-generator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-3">
        <ToolSelect label="Format" value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="hex">Hex</option>
          <option value="base64">Base64</option>
          <option value="base64url">Base64URL</option>
          <option value="alnum">Alphanumeric</option>
          <option value="uuid">UUID-like</option>
        </ToolSelect>
        <ToolInput label="Bytes / length" type="number" min={8} max={256} value={bytes} onChange={(event) => setBytes(clampNumber(event.target.value, 8, 256))} />
        <ToolInput label="Bulk count" type="number" min={1} max={20} value={count} onChange={(event) => setCount(clampNumber(event.target.value, 1, 20))} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {metric("Entropy", `${bytes * 8} bits`)}
        {metric("Generated", String(items.length))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate tokens"}</Button>
        <CopyButton value={items.join("\n")} label="Copy all" />
        {loading && <LoadingBadge label="Generating tokens..." />}
      </div>
      <SimpleList items={items} />
    </ToolFrame>
  );
}

function PassphraseGenerator() {
  const [words, setWords] = useState(5);
  const [separator, setSeparator] = useState("hyphen");
  const [capitalize, setCapitalize] = useState(false);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const entropy = words * Math.log2(COMMON_WORDS.length);
  const crackSeconds = 2 ** Math.min(entropy, 200) / 1e10;

  function sep(index: number) {
    if (separator === "space") return " ";
    if (separator === "underscore") return "_";
    if (separator === "dot") return ".";
    if (separator === "number") return String((index % 9) + 1);
    return "-";
  }

  function generate() {
    deferCompute(setLoading, () => {
      setPhrases(
        Array.from({ length: 10 }, () =>
          Array.from({ length: words }, (_, index) => {
            const word = COMMON_WORDS[randomInt(COMMON_WORDS.length)] ?? "word";
            return (capitalize ? word[0].toUpperCase() + word.slice(1) : word) + (index < words - 1 ? sep(index) : "");
          }).join(""),
        ),
      );
    });
  }

  return (
    <ToolFrame slug="passphrase-generator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-3">
        <ToolInput label="Word count" type="range" min={3} max={8} value={words} onChange={(event) => setWords(clampNumber(event.target.value, 3, 8))} />
        <ToolSelect label="Separator" value={separator} onChange={(event) => setSeparator(event.target.value)}>
          <option value="space">space</option>
          <option value="hyphen">hyphen</option>
          <option value="underscore">underscore</option>
          <option value="dot">dot</option>
          <option value="number">number</option>
        </ToolSelect>
        <div className="flex items-end"><Checkbox checked={capitalize} onChange={setCapitalize} label="Capitalize first letter" /></div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Wordlist size", String(COMMON_WORDS.length))}
        {metric("Entropy", `${entropy.toFixed(1)} bits`)}
        {metric("Crack time", formatDuration(crackSeconds))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate passphrases"}</Button>
        <CopyButton value={phrases.join("\n")} label="Copy all" />
        {loading && <LoadingBadge label="Generating passphrases..." />}
      </div>
      <SimpleList items={phrases} />
    </ToolFrame>
  );
}

function DuplicateLineRemover() {
  const [input, setInput] = useState("Apple\nbanana\napple\nBanana\ncarrot");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trim, setTrim] = useState(true);
  const [sort, setSort] = useState(false);
  const result = useMemo(() => {
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const line of lines) {
      const comparable = (trim ? line.trim() : line).normalize();
      const key = caseSensitive ? comparable : comparable.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(trim ? line.trim() : line);
      }
    }
    if (sort) unique.sort((a, b) => a.localeCompare(b));
    return { lines, unique, output: unique.join("\n") };
  }, [caseSensitive, input, sort, trim]);

  return (
    <ToolFrame slug="duplicate-line-remover">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Input" value={input} onChange={(event) => setInput(event.target.value)} rows={14} />
        <SimpleOutput label="Output" value={result.output} rows={14} />
      </div>
      <div className="flex flex-wrap gap-4">
        <Checkbox checked={caseSensitive} onChange={setCaseSensitive} label="Case sensitive" />
        <Checkbox checked={trim} onChange={setTrim} label="Trim whitespace before comparing" />
        <Checkbox checked={sort} onChange={setSort} label="Sort output" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Original lines", String(result.lines.length))}
        {metric("Unique lines", String(result.unique.length))}
        {metric("Removed", String(result.lines.length - result.unique.length))}
      </div>
    </ToolFrame>
  );
}

function CaseConverter() {
  const [input, setInput] = useState("hello dev tools world");
  const words = tokenizeWords(input);
  const conversions = [
    ["camelCase", words.map((word, index) => (index ? capitalize(word) : word.toLowerCase())).join("")],
    ["PascalCase", words.map(capitalize).join("")],
    ["snake_case", words.map((word) => word.toLowerCase()).join("_")],
    ["kebab-case", words.map((word) => word.toLowerCase()).join("-")],
    ["SCREAMING_SNAKE_CASE", words.map((word) => word.toUpperCase()).join("_")],
    ["Title Case", words.map(capitalize).join(" ")],
    ["dot.case", words.map((word) => word.toLowerCase()).join(".")],
    ["UPPER CASE", input.toUpperCase()],
    ["lower case", input.toLowerCase()],
    ["Sentence case", sentenceCase(input)],
  ];

  return (
    <ToolFrame slug="case-converter">
      <ToolTextarea label="Input" value={input} onChange={(event) => setInput(event.target.value)} rows={5} />
      <div className="grid gap-3 md:grid-cols-2">
        {conversions.map(([label, value]) => (
          <ResultCard key={label} label={label} value={value} copyable mono />
        ))}
      </div>
    </ToolFrame>
  );
}

function RegexReplace() {
  const [input, setInput] = useState("alpha=1\nbeta=2\nalpha=3");
  const [pattern, setPattern] = useState("alpha=(\\d+)");
  const [replacement, setReplacement] = useState("alpha:$1");
  const [flags, setFlags] = useState({ g: true, i: false, m: true, s: false });
  const flagText = Object.entries(flags).filter(([, enabled]) => enabled).map(([flag]) => flag).join("");
  const result = useMemo(() => {
    try {
      const regex = new RegExp(pattern, flagText);
      const matches = Array.from(input.matchAll(flags.g ? regex : new RegExp(pattern, `${flagText}g`)));
      return { output: input.replace(regex, replacement), matches, error: "" };
    } catch (error) {
      return { output: "", matches: [], error: error instanceof Error ? error.message : "Invalid regex." };
    }
  }, [flagText, flags.g, input, pattern, replacement]);

  return (
    <ToolFrame slug="regex-replace">
      <Panel noPadding className="grid gap-3 p-4 md:grid-cols-[1fr_180px_1fr]">
        <ToolInput label="Pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} className="font-mono" />
        <div>
          <Label>Flags</Label>
          <div className="flex flex-wrap gap-2">
            {(["g", "i", "m", "s"] as const).map((flag) => (
              <Checkbox key={flag} checked={flags[flag]} onChange={(checked) => setFlags((prev) => ({ ...prev, [flag]: checked }))} label={flag} />
            ))}
          </div>
        </div>
        <ToolInput label="Replacement" value={replacement} onChange={(event) => setReplacement(event.target.value)} className="font-mono" />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Input" value={input} onChange={(event) => setInput(event.target.value)} rows={12} />
        <SimpleOutput label="Output" value={result.error || result.output} rows={12} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Matches", String(result.matches.length), result.error ? "error" : "default")}
        {metric("Replacement count", flags.g ? String(result.matches.length) : String(Math.min(result.matches.length, 1)))}
        {metric("Flags", flagText || "none")}
      </div>
      <Panel noPadding className="p-4">
        <Label>Input match preview</Label>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-100">
          <RegexHighlight input={input} matches={result.matches} />
        </pre>
      </Panel>
    </ToolFrame>
  );
}

function RegexHighlight({ input, matches }: { input: string; matches: RegExpMatchArray[] }) {
  let cursor = 0;
  const parts: React.ReactNode[] = [];
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const text = match[0];
    if (start < cursor || text.length === 0) return;
    parts.push(input.slice(cursor, start));
    parts.push(<mark key={index} className="rounded bg-emerald-500/30 px-0.5 text-emerald-100">{text}</mark>);
    cursor = start + text.length;
  });
  parts.push(input.slice(cursor));
  return <>{parts}</>;
}

function RegexEscape() {
  const [input, setInput] = useState("hello. (devtools) [a-z]+?");
  const escaped = escapeRegex(input);
  const sqlLike = input.replace(/[\\%_]/g, (char) => `\\${char}`);
  const escapedChars = Array.from(input).filter((char) => /[\\^$.*+?()[\]{}|]/.test(char));

  return (
    <ToolFrame slug="regex-escape">
      <ToolTextarea label="Raw string" value={input} onChange={(event) => setInput(event.target.value)} rows={5} />
      <div className="grid gap-3 md:grid-cols-3">
        <ResultCard label="JavaScript regex" value={escaped} copyable mono />
        <ResultCard label="Python regex" value={escaped} copyable mono />
        <ResultCard label="SQL LIKE" value={sqlLike} copyable mono />
      </div>
      <Panel noPadding className="p-4">
        <Label>Escaped characters</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {escapedChars.length ? escapedChars.map((char, index) => <Badge key={`${char}-${index}`} variant="info">{char} is regex syntax</Badge>) : <Badge variant="success">No regex syntax characters found</Badge>}
        </div>
      </Panel>
    </ToolFrame>
  );
}

function TimezoneConverter() {
  const now = new Date();
  const [dateTime, setDateTime] = useState(now.toISOString().slice(0, 16));
  const [sourceZone, setSourceZone] = useState("UTC");
  const utcDate = useMemo(() => zonedTimeToDate(dateTime, sourceZone), [dateTime, sourceZone]);

  return (
    <ToolFrame slug="timezone-converter">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto]">
        <ToolInput label="Date and time" type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} />
        <ToolSelect label="Source timezone" value={sourceZone} onChange={(event) => setSourceZone(event.target.value)}>
          {TIMEZONES.map(([label, zone]) => <option key={zone} value={zone}>{label} - {zone}</option>)}
        </ToolSelect>
        <div className="flex items-end"><Button onClick={() => setDateTime(new Date().toISOString().slice(0, 16))}>Current time</Button></div>
      </Panel>
      <Panel noPadding>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800"><th className="px-4 py-2">Zone</th><th className="px-4 py-2">Converted time</th><th className="px-4 py-2">Offset</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {TIMEZONES.map(([label, zone]) => (
              <tr key={zone}>
                <td className="px-4 py-2 font-medium">{label}</td>
                <td className="px-4 py-2 font-mono">{formatInZone(utcDate, zone)}</td>
                <td className="px-4 py-2 text-zinc-500">{zoneOffsetLabel(utcDate, zone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </ToolFrame>
  );
}

function DurationCalculator() {
  const [start, setStart] = useState(new Date().toISOString().slice(0, 16));
  const [operation, setOperation] = useState("add");
  const [duration, setDuration] = useState({ years: 0, months: 0, days: 7, hours: 0, minutes: 0, seconds: 0 });
  const [end, setEnd] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const result = useMemo(() => applyDuration(new Date(start), duration, operation === "add" ? 1 : -1), [duration, operation, start]);
  const between = breakdownDuration(new Date(start), new Date(end));

  return (
    <ToolFrame slug="duration-calculator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-3">
        <ToolInput label="Start date/time" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        <ToolSelect label="Operation" value={operation} onChange={(event) => setOperation(event.target.value)}><option value="add">Add</option><option value="subtract">Subtract</option></ToolSelect>
        <ResultCard label="Result" value={Number.isNaN(result.getTime()) ? "Invalid date" : result.toLocaleString()} />
      </Panel>
      <Panel noPadding className="grid gap-3 p-4 md:grid-cols-6">
        {Object.entries(duration).map(([key, value]) => (
          <ToolInput key={key} label={capitalize(key)} type="number" value={value} onChange={(event) => setDuration((prev) => ({ ...prev, [key]: Number(event.target.value) }))} />
        ))}
      </Panel>
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-[1fr_1fr]">
        <ToolInput label="Compare from" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        <ToolInput label="Compare to" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-6">
        {Object.entries(between).map(([label, value]) => metric(label, String(value)))}
      </div>
    </ToolFrame>
  );
}

function ColorConverter() {
  const [input, setInput] = useState("#10b981");
  const parsed = parseColor(input);
  const formats = parsed ? colorFormats(parsed) : null;

  return (
    <ToolFrame slug="hex-rgb-hsl-converter">
      <ToolInput label="Color" value={input} onChange={(event) => setInput(event.target.value)} placeholder="#fff, rgb(255,255,255), hsl(0 100% 50%), blue" />
      {formats ? (
        <>
          <Panel noPadding className="p-4">
            <div className="h-32 rounded-xl border border-zinc-200 dark:border-zinc-800" style={{ backgroundColor: formats.rgba }} />
          </Panel>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(formats).map(([label, value]) => <ResultCard key={label} label={label} value={value} copyable mono />)}
          </div>
        </>
      ) : <Badge variant="error">Could not parse color</Badge>}
    </ToolFrame>
  );
}

function ContrastChecker() {
  const [fg, setFg] = useState("#111827");
  const [bg, setBg] = useState("#ffffff");
  const fgColor = parseColor(fg) ?? { r: 0, g: 0, b: 0, a: 1 };
  const bgColor = parseColor(bg) ?? { r: 255, g: 255, b: 255, a: 1 };
  const ratio = contrastRatio(fgColor, bgColor);
  const suggestions = suggestContrast(fgColor, bgColor);

  return (
    <ToolFrame slug="contrast-checker">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-2">
        <ToolInput label="Foreground" type="color" value={rgbToHex(fgColor)} onChange={(event) => setFg(event.target.value)} />
        <ToolInput label="Background" type="color" value={rgbToHex(bgColor)} onChange={(event) => setBg(event.target.value)} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-5">
        {metric("Contrast ratio", `${ratio.toFixed(2)}:1`)}
        {metric("AA normal", ratio >= 4.5 ? "Pass" : "Fail", ratio >= 4.5 ? "success" : "error")}
        {metric("AA large", ratio >= 3 ? "Pass" : "Fail", ratio >= 3 ? "success" : "error")}
        {metric("AAA normal", ratio >= 7 ? "Pass" : "Fail", ratio >= 7 ? "success" : "error")}
        {metric("AAA large", ratio >= 4.5 ? "Pass" : "Fail", ratio >= 4.5 ? "success" : "error")}
      </div>
      <Panel noPadding className="p-6" style={{ color: rgbToHex(fgColor), backgroundColor: rgbToHex(bgColor) }}>
        <p className="text-xl font-semibold">Readable sample text</p>
        <p className="mt-2 text-sm">This preview uses the selected foreground and background colors.</p>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <ResultCard label="AA suggestion" value={suggestions.aa} copyable mono />
        <ResultCard label="AAA suggestion" value={suggestions.aaa} copyable mono />
      </div>
    </ToolFrame>
  );
}

function CssClampCalculator() {
  const [min, setMin] = useState(16);
  const [max, setMax] = useState(48);
  const [minVp, setMinVp] = useState(320);
  const [maxVp, setMaxVp] = useState(1280);
  const [unit, setUnit] = useState("px");
  const slope = (max - min) / (maxVp - minVp);
  const vw = slope * 100;
  const intercept = min - slope * minVp;
  const clamp = `clamp(${min}${unit}, calc(${intercept.toFixed(4)}${unit} + ${vw.toFixed(4)}vw), ${max}${unit})`;

  return (
    <ToolFrame slug="css-clamp-calculator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-5">
        <ToolInput label="Min value" type="number" value={min} onChange={(event) => setMin(Number(event.target.value))} />
        <ToolInput label="Max value" type="number" value={max} onChange={(event) => setMax(Number(event.target.value))} />
        <ToolInput label="Min viewport px" type="number" value={minVp} onChange={(event) => setMinVp(Number(event.target.value))} />
        <ToolInput label="Max viewport px" type="number" value={maxVp} onChange={(event) => setMaxVp(Number(event.target.value))} />
        <ToolSelect label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)}><option>px</option><option>rem</option></ToolSelect>
      </Panel>
      <ResultCard label="CSS clamp" value={clamp} copyable mono />
      <Panel noPadding className="p-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Preferred value is computed as intercept plus viewport slope: {intercept.toFixed(4)}{unit} + {vw.toFixed(4)}vw.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[320, 768, 1024, 1440].map((width) => metric(`${width}px`, `${Math.min(max, Math.max(min, intercept + slope * width)).toFixed(2)}${unit}`))}
        </div>
      </Panel>
    </ToolFrame>
  );
}

function UnicodeEscapeTool() {
  const [input, setInput] = useState("Hello ☕ 世界");
  const [mode, setMode] = useState("js");
  const [reverse, setReverse] = useState(false);
  const output = reverse ? unescapeUnicode(input) : escapeUnicode(input, mode);

  return (
    <ToolFrame slug="unicode-escape">
      <div className="flex flex-wrap gap-3">
        <TabBar active={mode} onChange={setMode} tabs={["js", "python", "html", "url", "byte"].map((value) => ({ value, label: value.toUpperCase() }))} />
        <Checkbox checked={reverse} onChange={setReverse} label="Reverse escapes to text" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Input" value={input} onChange={(event) => setInput(event.target.value)} rows={10} />
        <SimpleOutput label="Output" value={output} rows={10} />
      </div>
      <Panel noPadding>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800"><th className="px-4 py-2">Character</th><th className="px-4 py-2">Code point</th></tr></thead>
          <tbody>{Array.from(input).map((char, index) => <tr key={`${char}-${index}`} className="border-b border-zinc-100 dark:border-zinc-800"><td className="px-4 py-2">{char}</td><td className="px-4 py-2 font-mono">U+{(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}</td></tr>)}</tbody>
        </table>
      </Panel>
    </ToolFrame>
  );
}

function Blake2Generator() {
  const [text, setText] = useState("DevTools");
  const [fileName, setFileName] = useState("");
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [hashes, setHashes] = useState(() => computeBlake2Hashes(encoder.encode("DevTools")));

  function computeHashes(inputBytes = bytes ?? encoder.encode(text)) {
    deferCompute(setLoading, () => {
      setHashes(computeBlake2Hashes(inputBytes));
    });
  }

  async function onFile(file: File | null) {
    if (!file) {
      setBytes(null);
      setFileName("");
      return;
    }
    const next = new Uint8Array(await file.arrayBuffer());
    setFileName(file.name);
    setBytes(next);
    computeHashes(next);
  }

  return (
    <ToolFrame slug="blake2-generator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-2">
        <ToolTextarea label="Text input" value={text} onChange={(event) => { setText(event.target.value); setBytes(null); setFileName(""); }} rows={6} />
        <ToolInput label="File input" type="file" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
      </Panel>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => computeHashes()} disabled={loading}>{loading ? "Computing..." : "Compute hashes"}</Button>
        {fileName && <Badge variant="info">Hashing file: {fileName}</Badge>}
        {loading && <LoadingBadge label="Computing BLAKE2 hashes..." />}
      </div>
      <div className="grid gap-3">
        <ResultCard label="BLAKE2b-256" value={hashes.b2b256} copyable mono />
        <ResultCard label="BLAKE2b-512" value={hashes.b2b512} copyable mono />
        <ResultCard label="BLAKE2s-256" value={hashes.b2s256} copyable mono />
      </div>
    </ToolFrame>
  );
}

function computeBlake2Hashes(data: Uint8Array) {
  return {
    b2b256: blake2b(data, 32),
    b2b512: blake2b(data, 64),
    b2s256: blake2s(data, 32),
  };
}

function HashVerifier() {
  const [text, setText] = useState("DevTools");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [algorithm, setAlgorithm] = useState("Unknown");
  const [fileName, setFileName] = useState("");

  async function verify(inputBytes = encoder.encode(text)) {
    const detected = detectHash(expected);
    setAlgorithm(detected);
    const next = await digestForAlgorithm(detected, inputBytes);
    setActual(next);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    await verify(new Uint8Array(await file.arrayBuffer()));
  }

  const matches = Boolean(expected.trim() && actual && expected.trim().toLowerCase() === actual.toLowerCase());

  return (
    <ToolFrame slug="hash-verifier">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Text input" value={text} onChange={(event) => setText(event.target.value)} rows={8} />
        <Panel noPadding className="space-y-3 p-4">
          <ToolInput label="Expected hash" value={expected} onChange={(event) => setExpected(event.target.value)} className="font-mono" />
          <ToolInput label="Or file input" type="file" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
          {fileName && <Badge variant="info">{fileName}</Badge>}
          <Button variant="primary" onClick={() => void verify()}>Verify text</Button>
        </Panel>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Detected algorithm", algorithm)}
        {metric("Status", expected ? (matches ? "Match" : "No match") : "Waiting", matches ? "success" : expected ? "error" : "default")}
        {metric("Actual hash length", String(actual.length))}
      </div>
      <ResultCard label="Actual hash" value={actual || "-"} copyable mono />
    </ToolFrame>
  );
}

function JwtVerifier() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("secret");
  const [result, setResult] = useState<{ valid: boolean; header: JsonValue | null; payload: JsonValue | null; warnings: string[]; status: string }>({ valid: false, header: null, payload: null, warnings: [], status: "Not verified" });

  async function verify() {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("JWT must have header, payload, and signature.");
      const header = JSON.parse(decoder.decode(base64UrlToBytes(parts[0]))) as JsonObject;
      const payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[1]))) as JsonObject;
      const alg = String(header.alg ?? "");
      const warnings = jwtWarnings(header, payload);
      let valid = false;
      if (alg === "none") {
        warnings.push("Algorithm none means there is no cryptographic signature.");
      } else if (["HS256", "HS384", "HS512"].includes(alg)) {
        const hash = alg === "HS256" ? "SHA-256" : alg === "HS384" ? "SHA-384" : "SHA-512";
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash }, false, ["verify"]);
        valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
      } else {
        warnings.push(`Unsupported verifier for ${alg}. Only HS256, HS384, and HS512 are verified here.`);
      }
      setResult({ valid, header, payload, warnings, status: jwtTimeStatus(payload) });
    } catch (error) {
      setResult({ valid: false, header: null, payload: null, warnings: [error instanceof Error ? error.message : "Could not verify token."], status: "Invalid token" });
    }
  }

  return (
    <ToolFrame slug="jwt-verifier">
      <ToolTextarea label="JWT token" value={token} onChange={(event) => setToken(event.target.value)} rows={6} />
      <div className="flex flex-wrap items-end gap-3">
        <ToolInput label="Secret key" value={secret} onChange={(event) => setSecret(event.target.value)} />
        <Button variant="primary" onClick={() => void verify()}>Verify JWT</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Signature", result.valid ? "Valid" : "Invalid", result.valid ? "success" : "error")}
        {metric("Claims status", result.status)}
        {metric("Warnings", String(result.warnings.length))}
      </div>
      {result.warnings.length > 0 && <Panel noPadding className="space-y-2 p-4">{result.warnings.map((warning) => <Badge key={warning} variant="warning">{warning}</Badge>)}</Panel>}
      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard label="Decoded header" value={JSON.stringify(result.header, null, 2)} copyable mono />
        <ResultCard label="Decoded payload" value={JSON.stringify(result.payload, null, 2)} copyable mono />
      </div>
    </ToolFrame>
  );
}

function JsonPathTester() {
  const [json, setJson] = useState('{\n  "users": [\n    { "name": "Ada", "age": 36 },\n    { "name": "Grace", "age": 85 }\n  ]\n}');
  const [path, setPath] = useState("$.users[*].name");
  const result = useMemo(() => {
    try {
      return { matches: jsonPath(JSON.parse(json) as JsonValue, path), error: "" };
    } catch (error) {
      return { matches: [], error: error instanceof Error ? error.message : "Invalid JSONPath." };
    }
  }, [json, path]);

  return (
    <ToolFrame slug="jsonpath-tester">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="JSON" value={json} onChange={(event) => setJson(event.target.value)} rows={12} />
        <Panel noPadding className="space-y-3 p-4">
          <ToolInput label="JSONPath" value={path} onChange={(event) => setPath(event.target.value)} className="font-mono" />
          {metric("Match count", String(result.matches.length), result.error ? "error" : "default")}
          {result.error && <Badge variant="error">{result.error}</Badge>}
          <CodeBlock value={JSON.stringify(result.matches.map((match) => ({ path: match.path, value: match.value })), null, 2)} />
        </Panel>
      </div>
    </ToolFrame>
  );
}

function JsonTreeViewer() {
  const [json, setJson] = useState('{\n  "project": "DevTools",\n  "enabled": true,\n  "items": [1, 2, null]\n}');
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(json) as JsonValue, error: "" };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : "Invalid JSON." };
    }
  }, [json]);

  function setAll(value: boolean) {
    const paths: Record<string, boolean> = {};
    collectJsonPaths(parsed.value, "$", paths, value);
    setCollapsed(paths);
  }

  return (
    <ToolFrame slug="json-tree-viewer">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="JSON" value={json} onChange={(event) => setJson(event.target.value)} rows={14} />
        <Panel noPadding className="p-4">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <ToolInput label="Search keys" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Button onClick={() => setAll(false)}>Expand all</Button>
            <Button onClick={() => setAll(true)}>Collapse all</Button>
          </div>
          {parsed.error ? <Badge variant="error">{parsed.error}</Badge> : <JsonNodeView name="$" value={parsed.value} path="$" collapsed={collapsed} setCollapsed={setCollapsed} query={query} />}
        </Panel>
      </div>
    </ToolFrame>
  );
}

function YamlDiff() {
  const [left, setLeft] = useState("name: devtools\nversion: 1\nfeatures:\n  - tools");
  const [right, setRight] = useState("name: devtools\nversion: 2\nfeatures:\n  - tools\n  - paste");
  const [changes, setChanges] = useState<Change[]>(() => diffLines("name: devtools\nversion: 1\nfeatures:\n  - tools", "name: devtools\nversion: 2\nfeatures:\n  - tools\n  - paste"));
  const [keyDiff, setKeyDiff] = useState<string[]>(() => diffKeys(parseYamlObject("name: devtools\nversion: 1\nfeatures:\n  - tools"), parseYamlObject("name: devtools\nversion: 2\nfeatures:\n  - tools\n  - paste")));
  const [loading, setLoading] = useState(false);

  function compare() {
    deferCompute(setLoading, () => {
      setChanges(diffLines(left, right));
      setKeyDiff(diffKeys(parseYamlObject(left), parseYamlObject(right)));
    });
  }

  return (
    <ToolFrame slug="yaml-diff">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="YAML A" value={left} onChange={(event) => setLeft(event.target.value)} rows={12} />
        <ToolTextarea label="YAML B" value={right} onChange={(event) => setRight(event.target.value)} rows={12} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={compare} disabled={loading}>{loading ? "Comparing..." : "Compare YAML"}</Button>
        {loading && <LoadingBadge label="Computing YAML diff..." />}
      </div>
      <DiffStats changes={changes} />
      <DiffView changes={changes} />
      <Panel noPadding className="p-4">
        <Label>Key-level diff</Label>
        <div className="mt-2 flex flex-wrap gap-2">{keyDiff.map((item) => <Badge key={item} variant={item.startsWith("+") ? "success" : item.startsWith("-") ? "error" : "warning"}>{item}</Badge>)}</div>
      </Panel>
    </ToolFrame>
  );
}

function CodeDiff() {
  const [left, setLeft] = useState("const value = 1;\nconsole.log(value);");
  const [right, setRight] = useState("const value = 2;\nconsole.log({ value });");
  const [language, setLanguage] = useState("JavaScript");
  const [changes, setChanges] = useState<Change[]>(() => diffLines("const value = 1;\nconsole.log(value);", "const value = 2;\nconsole.log({ value });"));
  const [loading, setLoading] = useState(false);

  function compare() {
    deferCompute(setLoading, () => {
      setChanges(diffLines(left, right));
    });
  }

  return (
    <ToolFrame slug="code-diff">
      <ToolSelect label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
        {["JavaScript", "TypeScript", "Python", "Java", "C", "C++", "CSS", "HTML", "JSON", "YAML", "SQL"].map((item) => <option key={item}>{item}</option>)}
      </ToolSelect>
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Original code" value={left} onChange={(event) => setLeft(event.target.value)} rows={12} />
        <ToolTextarea label="Modified code" value={right} onChange={(event) => setRight(event.target.value)} rows={12} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={compare} disabled={loading}>{loading ? "Comparing..." : "Compare code"}</Button>
        {loading && <LoadingBadge label="Computing code diff..." />}
      </div>
      <DiffStats changes={changes} />
      <DiffView changes={changes} />
    </ToolFrame>
  );
}

function RecentPastes() {
  const [items, setItems] = useState<RecentPaste[]>([]);
  useEffect(() => {
    setItems(loadRecentPastes());
  }, []);
  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    localStorage.setItem("devtools_recent_pastes", JSON.stringify(next));
    setItems(next);
  }
  function clear() {
    localStorage.removeItem("devtools_recent_pastes");
    setItems([]);
  }
  return (
    <ToolFrame slug="recent-pastes">
      <div className="flex justify-end"><Button variant="danger" onClick={clear} disabled={!items.length}>Clear all</Button></div>
      <Panel noPadding>
        {items.length ? items.slice(0, 20).map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div>
              <a href={item.url} className="font-medium text-emerald-700 dark:text-emerald-400">{item.title || "Untitled paste"}</a>
              <p className="mt-1 text-xs text-zinc-500">{item.language || "text"} - {new Date(item.createdAt).toLocaleString()} - expires {item.expiresAt ? new Date(item.expiresAt).toLocaleString() : "never"}</p>
              <p className="mt-1 max-w-2xl truncate text-sm text-zinc-600 dark:text-zinc-300">{item.preview}</p>
            </div>
            <Button variant="danger" onClick={() => remove(item.id)}>Delete</Button>
          </div>
        )) : <div className="p-8 text-center text-sm text-zinc-500">No recent pastes found in this browser.</div>}
      </Panel>
    </ToolFrame>
  );
}

function UrlQueryBuilder() {
  const [mode, setMode] = useState("builder");
  const [base, setBase] = useState("https://example.com/search");
  const [fullUrl, setFullUrl] = useState("https://example.com/search?q=devtools&page=1");
  const [params, setParams] = useState<Array<[string, string]>>([["q", "devtools"], ["page", "1"]]);
  const finalUrl = buildUrl(base, params);

  function parse() {
    try {
      const url = new URL(fullUrl);
      setBase(`${url.origin}${url.pathname}`);
      setParams(Array.from(url.searchParams.entries()));
    } catch {
      setParams([]);
    }
  }

  return (
    <ToolFrame slug="url-query-builder">
      <TabBar active={mode} onChange={setMode} tabs={[{ value: "builder", label: "Builder" }, { value: "parser", label: "Parser" }]} />
      {mode === "parser" && <div className="flex flex-wrap items-end gap-3"><ToolInput label="Full URL" value={fullUrl} onChange={(event) => setFullUrl(event.target.value)} /><Button onClick={parse}>Parse URL</Button></div>}
      <ToolInput label="Base URL" value={base} onChange={(event) => setBase(event.target.value)} />
      <ParamEditor params={params} setParams={setParams} />
      <ResultCard label="Final URL" value={finalUrl} copyable mono />
    </ToolFrame>
  );
}

function DockerComposeValidator() {
  const [input, setInput] = useState("services:\n  web:\n    image: nginx:latest\n    ports:\n      - \"8080:80\"\n    restart: unless-stopped");
  const report = useMemo(() => validateCompose(input), [input]);
  return (
    <ToolFrame slug="docker-compose-validator">
      <ToolTextarea label="Docker Compose YAML" value={input} onChange={(event) => setInput(event.target.value)} rows={14} />
      <ValidationReport report={report} />
    </ToolFrame>
  );
}

function NginxConfigChecker() {
  const [input, setInput] = useState("server {\n  listen 443 ssl;\n  server_name example.com;\n  ssl_certificate /etc/ssl/cert.pem;\n  ssl_certificate_key /etc/ssl/key.pem;\n  location / {\n    proxy_pass http://app;\n  }\n}");
  const report = useMemo(() => validateNginx(input), [input]);
  return (
    <ToolFrame slug="nginx-config-checker">
      <ToolTextarea label="Nginx config" value={input} onChange={(event) => setInput(event.target.value)} rows={16} className="font-mono" />
      <ValidationReport report={report} />
    </ToolFrame>
  );
}

function SystemdUnitGenerator() {
  const [description, setDescription] = useState("DevTools worker");
  const [execStart, setExecStart] = useState("/usr/bin/node /srv/app/worker.js");
  const [user, setUser] = useState("www-data");
  const [workingDirectory, setWorkingDirectory] = useState("/srv/app");
  const [restart, setRestart] = useState("on-failure");
  const [restartSec, setRestartSec] = useState("5");
  const [environment, setEnvironment] = useState("NODE_ENV=production\nPORT=3000");
  const [after, setAfter] = useState("network.target");
  const [wantedBy, setWantedBy] = useState("multi-user.target");
  const unit = buildSystemdUnit({ description, execStart, user, workingDirectory, restart, restartSec, environment, after, wantedBy });
  return (
    <ToolFrame slug="systemd-unit-generator">
      <Panel noPadding className="grid gap-4 p-4 md:grid-cols-2">
        <ToolInput label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <ToolInput label="ExecStart" value={execStart} onChange={(event) => setExecStart(event.target.value)} />
        <ToolInput label="User" value={user} onChange={(event) => setUser(event.target.value)} />
        <ToolInput label="WorkingDirectory" value={workingDirectory} onChange={(event) => setWorkingDirectory(event.target.value)} />
        <ToolSelect label="Restart policy" value={restart} onChange={(event) => setRestart(event.target.value)}><option>no</option><option>on-failure</option><option>always</option></ToolSelect>
        <ToolInput label="RestartSec" value={restartSec} onChange={(event) => setRestartSec(event.target.value)} />
        <ToolInput label="After" value={after} onChange={(event) => setAfter(event.target.value)} />
        <ToolInput label="WantedBy" value={wantedBy} onChange={(event) => setWantedBy(event.target.value)} />
        <div className="md:col-span-2"><ToolTextarea label="Environment variables" value={environment} onChange={(event) => setEnvironment(event.target.value)} rows={4} /></div>
      </Panel>
      <SimpleOutput label=".service file" value={unit} rows={16} />
    </ToolFrame>
  );
}

function TomlFormatter() {
  const [input, setInput] = useState('title = "DevTools"\n\n[server]\nport = 3000\nenabled = true');
  const parsed = parseToml(input);
  const output = parsed.error ? "" : formatToml(parsed.data);
  return (
    <ToolFrame slug="toml-formatter">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="TOML input" value={input} onChange={(event) => setInput(event.target.value)} rows={14} />
        <SimpleOutput label="Formatted TOML" value={parsed.error || output} rows={14} />
      </div>
      <TomlStats parsed={parsed} />
    </ToolFrame>
  );
}

function TomlValidator() {
  const [input, setInput] = useState('title = "DevTools"\n\n[server]\nport = 3000\nenabled = true');
  const parsed = parseToml(input);
  return (
    <ToolFrame slug="toml-validator">
      <ToolTextarea label="TOML input" value={input} onChange={(event) => setInput(event.target.value)} rows={14} />
      <TomlStats parsed={parsed} />
      {!parsed.error && <CodeBlock value={JSON.stringify(tomlOverview(parsed.data), null, 2)} />}
    </ToolFrame>
  );
}

function TomlToJson() {
  const [mode, setMode] = useState("toml-json");
  const [input, setInput] = useState('title = "DevTools"\n\n[server]\nport = 3000\nenabled = true');
  const converted = useMemo(() => {
    try {
      if (mode === "toml-json") {
        const parsed = parseToml(input);
        if (parsed.error) return parsed.error;
        return JSON.stringify(parsed.data, null, 2);
      }
      return objectToToml(JSON.parse(input) as Record<string, unknown>);
    } catch (error) {
      return error instanceof Error ? error.message : "Conversion failed.";
    }
  }, [input, mode]);
  const keyCount = countKeys(mode === "toml-json" ? parseToml(input).data : safeJson(input));
  return (
    <ToolFrame slug="toml-to-json">
      <TabBar active={mode} onChange={setMode} tabs={[{ value: "toml-json", label: "TOML to JSON" }, { value: "json-toml", label: "JSON to TOML" }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolTextarea label="Input" value={input} onChange={(event) => setInput(event.target.value)} rows={14} />
        <SimpleOutput label="Output" value={converted} rows={14} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Key count", String(keyCount))}
        {metric("Nesting depth", String(depthOf(mode === "toml-json" ? parseToml(input).data : safeJson(input))))}
        {metric("Type warning", "Dates are emitted as strings")}
      </div>
    </ToolFrame>
  );
}

function SimpleList({ items }: { items: string[] }) {
  return (
    <Panel noPadding>
      {items.length ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <code className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{item}</code>
              <CopyButton value={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-sm text-zinc-500">Generate values to see results.</div>
      )}
    </Panel>
  );
}

function clampNumber(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "astronomical";
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 31557600) return `${(seconds / 86400).toFixed(1)} days`;
  return `${(seconds / 31557600).toExponential(2)} years`;
}

function tokenizeWords(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : value;
}

function sentenceCase(value: string) {
  const lower = value.toLowerCase();
  return lower ? lower[0].toUpperCase() + lower.slice(1) : lower;
}

function escapeRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function getOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  return asUtc - date.getTime();
}

function zonedTimeToDate(dateTime: string, timeZone: string) {
  const [datePart, timePart = "00:00"] = dateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function formatInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function zoneOffsetLabel(date: Date, timeZone: string) {
  const hours = getOffsetMs(date, timeZone) / 3600000;
  return `UTC${hours >= 0 ? "+" : ""}${hours.toFixed(1)}`;
}

function applyDuration(start: Date, duration: Record<string, number>, sign: number) {
  const next = new Date(start);
  next.setFullYear(next.getFullYear() + sign * duration.years);
  next.setMonth(next.getMonth() + sign * duration.months);
  next.setDate(next.getDate() + sign * duration.days);
  next.setHours(next.getHours() + sign * duration.hours);
  next.setMinutes(next.getMinutes() + sign * duration.minutes);
  next.setSeconds(next.getSeconds() + sign * duration.seconds);
  return next;
}

function breakdownDuration(start: Date, end: Date) {
  const ms = Math.abs(end.getTime() - start.getTime());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor(ms / 60000),
    seconds: Math.floor(ms / 1000),
    milliseconds: ms,
  };
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  const named = COLOR_NAMES[value];
  if (named) return parseColor(named);
  const hex = value.match(/^#?([0-9a-f]{3,8})$/i);
  if (hex) {
    const raw = hex[1];
    const expanded = raw.length === 3 || raw.length === 4 ? raw.split("").map((char) => char + char).join("") : raw.padEnd(8, "f");
    return { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16), a: parseInt(expanded.slice(6, 8), 16) / 255 };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[, ]+/).filter(Boolean).map(Number);
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
  }
  const hsl = value.match(/^hsla?\(([^)]+)\)$/);
  if (hsl) {
    const parts = hsl[1].split(/[, ]+/).filter(Boolean);
    return hslToRgb(Number(parts[0]), Number(parts[1].replace("%", "")), Number(parts[2].replace("%", "")), parts[3] ? Number(parts[3]) : 1);
  }
  return null;
}

function rgbToHex(color: Rgba) {
  return `#${[color.r, color.g, color.b].map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
}

function colorFormats(color: Rgba) {
  const hsl = rgbToHsl(color);
  const hsv = rgbToHsv(color);
  const hex = rgbToHex(color);
  const alpha = Math.round(color.a * 255).toString(16).padStart(2, "0");
  return {
    hex,
    hex8: `${hex}${alpha}`,
    rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
    rgba: `rgba(${color.r}, ${color.g}, ${color.b}, ${round(color.a)})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${round(color.a)})`,
    hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    cssVariable: `--color: ${hex};`,
    tailwindClosest: closestTailwind(color),
  };
}

function hslToRgb(h: number, s: number, l: number, a = 1): Rgba {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255), a };
}

function rgbToHsl({ r, g, b }: Rgba) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === rn ? 60 * (((gn - bn) / d) % 6) : max === gn ? 60 * ((bn - rn) / d + 2) : 60 * ((rn - gn) / d + 4);
  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv({ r, g, b }: Rgba) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const h = d === 0 ? 0 : max === rn ? 60 * (((gn - bn) / d) % 6) : max === gn ? 60 * ((bn - rn) / d + 2) : 60 * ((rn - gn) / d + 4);
  return { h: Math.round((h + 360) % 360), s: Math.round(max === 0 ? 0 : (d / max) * 100), v: Math.round(max * 100) };
}

function closestTailwind(color: Rgba) {
  let best = "";
  let bestDistance = Infinity;
  Object.entries(TAILWIND_COLORS).forEach(([name, hex]) => {
    const candidate = parseColor(hex);
    if (!candidate) return;
    const distance = (color.r - candidate.r) ** 2 + (color.g - candidate.g) ** 2 + (color.b - candidate.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  });
  return best;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function luminance(color: Rgba) {
  const values = [color.r, color.g, color.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(fg: Rgba, bg: Rgba) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function suggestContrast(fg: Rgba, bg: Rgba) {
  const targets = { aa: 4.5, aaa: 7 };
  const make = (target: number) => {
    for (let i = 0; i <= 100; i++) {
      const dark = mix(fg, { r: 0, g: 0, b: 0, a: 1 }, i / 100);
      if (contrastRatio(dark, bg) >= target) return rgbToHex(dark);
      const light = mix(fg, { r: 255, g: 255, b: 255, a: 1 }, i / 100);
      if (contrastRatio(light, bg) >= target) return rgbToHex(light);
    }
    return "No simple foreground adjustment found";
  };
  return { aa: make(targets.aa), aaa: make(targets.aaa) };
}

function mix(a: Rgba, b: Rgba, amount: number): Rgba {
  return { r: Math.round(a.r + (b.r - a.r) * amount), g: Math.round(a.g + (b.g - a.g) * amount), b: Math.round(a.b + (b.b - a.b) * amount), a: 1 };
}

function escapeUnicode(value: string, mode: string) {
  if (mode === "byte") return Array.from(encoder.encode(value), (byte) => `\\x${byte.toString(16).padStart(2, "0")}`).join("");
  return Array.from(value).map((char) => {
    const cp = char.codePointAt(0) ?? 0;
    if (mode === "html") return `&#x${cp.toString(16).toUpperCase()};`;
    if (mode === "url") return `%u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    if (mode === "python") return `\\U${cp.toString(16).toUpperCase().padStart(8, "0")}`;
    return cp <= 0xffff ? `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}` : `\\u{${cp.toString(16).toUpperCase()}}`;
  }).join("");
}

function unescapeUnicode(value: string) {
  return value
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\U([0-9a-f]{8})/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/%u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

const BLAKE2B_IV = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
];
const BLAKE2S_IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
];
const MASK64 = 0xffffffffffffffffn;

function rotr64(value: bigint, bits: bigint) {
  return ((value >> bits) | (value << (64n - bits))) & MASK64;
}

function blake2b(input: Uint8Array, outlen: 32 | 64) {
  const h = [...BLAKE2B_IV];
  h[0] ^= 0x01010000n ^ BigInt(outlen);
  let offset = 0;
  while (offset < input.length || input.length === 0) {
    const block = input.slice(offset, offset + 128);
    offset += block.length || 128;
    compressB2b(h, block, Math.min(offset, input.length), offset >= input.length);
    if (input.length === 0) break;
  }
  const out = new Uint8Array(64);
  h.forEach((word, i) => {
    for (let j = 0; j < 8; j++) out[i * 8 + j] = Number((word >> BigInt(8 * j)) & 0xffn);
  });
  return bytesToHex(out.slice(0, outlen));
}

function compressB2b(h: bigint[], block: Uint8Array, counter: number, last: boolean) {
  const m = Array.from({ length: 16 }, (_, i) => {
    let word = 0n;
    for (let j = 0; j < 8; j++) word |= BigInt(block[i * 8 + j] ?? 0) << BigInt(8 * j);
    return word;
  });
  const v = [...h, ...BLAKE2B_IV];
  v[12] ^= BigInt(counter);
  if (last) v[14] = (~v[14]) & MASK64;
  const g = (a: number, b: number, c: number, d: number, x: bigint, y: bigint) => {
    v[a] = (v[a] + v[b] + x) & MASK64; v[d] = rotr64(v[d] ^ v[a], 32n);
    v[c] = (v[c] + v[d]) & MASK64; v[b] = rotr64(v[b] ^ v[c], 24n);
    v[a] = (v[a] + v[b] + y) & MASK64; v[d] = rotr64(v[d] ^ v[a], 16n);
    v[c] = (v[c] + v[d]) & MASK64; v[b] = rotr64(v[b] ^ v[c], 63n);
  };
  for (let r = 0; r < 12; r++) {
    const s = SIGMA[r];
    g(0, 4, 8, 12, m[s[0]], m[s[1]]); g(1, 5, 9, 13, m[s[2]], m[s[3]]); g(2, 6, 10, 14, m[s[4]], m[s[5]]); g(3, 7, 11, 15, m[s[6]], m[s[7]]);
    g(0, 5, 10, 15, m[s[8]], m[s[9]]); g(1, 6, 11, 12, m[s[10]], m[s[11]]); g(2, 7, 8, 13, m[s[12]], m[s[13]]); g(3, 4, 9, 14, m[s[14]], m[s[15]]);
  }
  for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) & MASK64;
}

function rotr32(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

function blake2s(input: Uint8Array, outlen: 32) {
  const h = [...BLAKE2S_IV];
  h[0] ^= 0x01010000 ^ outlen;
  let offset = 0;
  while (offset < input.length || input.length === 0) {
    const block = input.slice(offset, offset + 64);
    offset += block.length || 64;
    compressB2s(h, block, Math.min(offset, input.length), offset >= input.length);
    if (input.length === 0) break;
  }
  const out = new Uint8Array(32);
  h.forEach((word, i) => {
    for (let j = 0; j < 4; j++) out[i * 4 + j] = (word >>> (8 * j)) & 0xff;
  });
  return bytesToHex(out.slice(0, outlen));
}

function compressB2s(h: number[], block: Uint8Array, counter: number, last: boolean) {
  const m = Array.from({ length: 16 }, (_, i) => ((block[i * 4] ?? 0) | ((block[i * 4 + 1] ?? 0) << 8) | ((block[i * 4 + 2] ?? 0) << 16) | ((block[i * 4 + 3] ?? 0) << 24)) >>> 0);
  const v = [...h, ...BLAKE2S_IV];
  v[12] ^= counter;
  if (last) v[14] = ~v[14];
  const g = (a: number, b: number, c: number, d: number, x: number, y: number) => {
    v[a] = (v[a] + v[b] + x) >>> 0; v[d] = rotr32(v[d] ^ v[a], 16);
    v[c] = (v[c] + v[d]) >>> 0; v[b] = rotr32(v[b] ^ v[c], 12);
    v[a] = (v[a] + v[b] + y) >>> 0; v[d] = rotr32(v[d] ^ v[a], 8);
    v[c] = (v[c] + v[d]) >>> 0; v[b] = rotr32(v[b] ^ v[c], 7);
  };
  for (let r = 0; r < 10; r++) {
    const s = SIGMA[r];
    g(0, 4, 8, 12, m[s[0]], m[s[1]]); g(1, 5, 9, 13, m[s[2]], m[s[3]]); g(2, 6, 10, 14, m[s[4]], m[s[5]]); g(3, 7, 11, 15, m[s[6]], m[s[7]]);
    g(0, 5, 10, 15, m[s[8]], m[s[9]]); g(1, 6, 11, 12, m[s[10]], m[s[11]]); g(2, 7, 8, 13, m[s[12]], m[s[13]]); g(3, 4, 9, 14, m[s[14]], m[s[15]]);
  }
  for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0;
}

function detectHash(hash: string) {
  const clean = hash.trim();
  if (/^[0-9a-f]+$/i.test(clean)) {
    if (clean.length === 32) return "MD5";
    if (clean.length === 40) return "SHA-1";
    if (clean.length === 64) return "SHA-256";
    if (clean.length === 96) return "SHA-384";
    if (clean.length === 128) return "SHA-512";
  }
  return "Unknown";
}

async function digestForAlgorithm(algorithm: string, bytes: Uint8Array) {
  if (algorithm === "MD5") return md5(decoder.decode(bytes));
  if (["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(algorithm)) {
    const digest = await crypto.subtle.digest(algorithm, new Uint8Array(bytes));
    return bytesToHex(new Uint8Array(digest));
  }
  return "";
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function jwtWarnings(header: JsonObject, payload: JsonObject) {
  const warnings: string[] = [];
  if (header.alg === "none") warnings.push("Algorithm is none.");
  ["password", "secret", "token", "ssn", "credit_card"].forEach((key) => {
    if (Object.keys(payload).some((field) => field.toLowerCase().includes(key))) warnings.push(`Payload may contain sensitive field: ${key}.`);
  });
  return warnings;
}

function jwtTimeStatus(payload: JsonObject) {
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.nbf === "number" && payload.nbf > now) return "Not yet valid";
  if (typeof payload.exp === "number" && payload.exp < now) return "Expired";
  return "Valid now";
}

type JsonPathMatch = { path: string; value: JsonValue };

function jsonPath(root: JsonValue, path: string) {
  if (!path.startsWith("$")) throw new Error("JSONPath must start with $.");
  let matches: JsonPathMatch[] = [{ path: "$", value: root }];
  const tokens = path.slice(1).match(/(\.\.?\w+|\.\*|\[[^\]]+\])/g) ?? [];
  for (const token of tokens) {
    const next: JsonPathMatch[] = [];
    for (const match of matches) {
      if (token.startsWith("..")) recursiveFind(match.value, token.slice(2), match.path, next);
      else if (token === ".*" || token === "[*]") childrenOf(match).forEach((child) => next.push(child));
      else if (token.startsWith(".")) propertyOf(match, token.slice(1)).forEach((child) => next.push(child));
      else bracketOf(match, token.slice(1, -1)).forEach((child) => next.push(child));
    }
    matches = next;
  }
  return matches;
}

function isRecord(value: JsonValue | unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function childrenOf(match: JsonPathMatch) {
  if (Array.isArray(match.value)) return match.value.map((value, index) => ({ path: `${match.path}[${index}]`, value }));
  if (isRecord(match.value)) return Object.entries(match.value).map(([key, value]) => ({ path: `${match.path}.${key}`, value }));
  return [];
}

function propertyOf(match: JsonPathMatch, key: string) {
  return isRecord(match.value) && key in match.value ? [{ path: `${match.path}.${key}`, value: match.value[key] }] : [];
}

function bracketOf(match: JsonPathMatch, expr: string) {
  if (Array.isArray(match.value)) {
    if (/^-?\d+$/.test(expr)) {
      const index = Number(expr) < 0 ? match.value.length + Number(expr) : Number(expr);
      return index in match.value ? [{ path: `${match.path}[${index}]`, value: match.value[index] }] : [];
    }
    const slice = expr.match(/^(-?\d*)?:(-?\d*)?$/);
    if (slice) {
      const start = slice[1] ? Number(slice[1]) : 0;
      const end = slice[2] ? Number(slice[2]) : match.value.length;
      return match.value.slice(start, end).map((value, index) => ({ path: `${match.path}[${start + index}]`, value }));
    }
    const filter = expr.match(/^\?\(@\.(\w+)\s*([=!<>]+)\s*["']?([^"']+)["']?\)$/);
    if (filter) {
      return match.value.flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const actual = value[filter[1]];
        const pass = compareFilter(actual, filter[2], filter[3]);
        return pass ? [{ path: `${match.path}[${index}]`, value }] : [];
      });
    }
  }
  if (isRecord(match.value)) {
    const key = expr.replace(/^['"]|['"]$/g, "");
    return propertyOf(match, key);
  }
  return [];
}

function recursiveFind(value: JsonValue, key: string, path: string, out: JsonPathMatch[]) {
  if (isRecord(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => {
      const childPath = `${path}.${childKey}`;
      if (childKey === key) out.push({ path: childPath, value: childValue });
      recursiveFind(childValue, key, childPath, out);
    });
  } else if (Array.isArray(value)) {
    value.forEach((child, index) => recursiveFind(child, key, `${path}[${index}]`, out));
  }
}

function compareFilter(actual: JsonValue | undefined, op: string, expected: string) {
  const actualNumber = typeof actual === "number" ? actual : Number(actual);
  const expectedNumber = Number(expected);
  if (op === "==" || op === "=") return String(actual) === expected;
  if (op === "!=") return String(actual) !== expected;
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    if (op === ">") return actualNumber > expectedNumber;
    if (op === "<") return actualNumber < expectedNumber;
    if (op === ">=") return actualNumber >= expectedNumber;
    if (op === "<=") return actualNumber <= expectedNumber;
  }
  return false;
}

function collectJsonPaths(value: JsonValue | null, path: string, out: Record<string, boolean>, collapsed: boolean) {
  if (Array.isArray(value) || isRecord(value)) out[path] = collapsed;
  childrenOf({ path, value }).forEach((child) => collectJsonPaths(child.value, child.path, out, collapsed));
}

function JsonNodeView({ name, value, path, collapsed, setCollapsed, query }: { name: string; value: JsonValue | null; path: string; collapsed: Record<string, boolean>; setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; query: string }) {
  const expandable = Array.isArray(value) || isRecord(value);
  const isCollapsed = collapsed[path] ?? false;
  const matches = !query || name.toLowerCase().includes(query.toLowerCase());
  if (!matches && !expandable) return null;
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  return (
    <div className="font-mono text-sm" title={`${path} - ${type}`}>
      <div className={matches ? "" : "opacity-60"}>
        {expandable && <button type="button" className="mr-1 text-zinc-500" onClick={() => setCollapsed((prev) => ({ ...prev, [path]: !isCollapsed }))}>{isCollapsed ? "+" : "-"}</button>}
        <span className="text-zinc-900 dark:text-zinc-100">{name}: </span>
        {!expandable && <JsonScalar value={value} />}
        {expandable && <span className="text-zinc-500">{Array.isArray(value) ? `Array(${value.length})` : "Object"}</span>}
      </div>
      {expandable && !isCollapsed && <div className="ml-5 border-l border-zinc-200 pl-3 dark:border-zinc-800">{childrenOf({ path, value }).map((child) => <JsonNodeView key={child.path} name={child.path.split(/[.[\]]/).filter(Boolean).at(-1) ?? child.path} value={child.value} path={child.path} collapsed={collapsed} setCollapsed={setCollapsed} query={query} />)}</div>}
    </div>
  );
}

function JsonScalar({ value }: { value: JsonValue | null }) {
  if (typeof value === "string") return <span className="text-emerald-600 dark:text-emerald-400">&quot;{value}&quot;</span>;
  if (typeof value === "number") return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  if (typeof value === "boolean") return <span className="text-orange-600 dark:text-orange-400">{String(value)}</span>;
  return <span className="text-zinc-500">null</span>;
}

function parseYamlObject(value: string) {
  try {
    return yaml.load(value) as unknown;
  } catch {
    return {};
  }
}

function diffKeys(left: unknown, right: unknown, prefix = ""): string[] {
  if (!isPlainRecord(left) || !isPlainRecord(right)) return [];
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Array.from(keys).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in left)) return [`+ ${path}`];
    if (!(key in right)) return [`- ${path}`];
    if (isPlainRecord(left[key]) && isPlainRecord(right[key])) return diffKeys(left[key], right[key], path);
    return JSON.stringify(left[key]) === JSON.stringify(right[key]) ? [] : [`~ ${path}`];
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function DiffStats({ changes }: { changes: Change[] }) {
  const stats = changes.reduce(
    (acc, change) => {
      const lines = change.value.split("\n").filter((line, index, arr) => line || index < arr.length - 1).length;
      if (change.added) acc.added += lines;
      else if (change.removed) acc.removed += lines;
      else acc.unchanged += lines;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
  const total = stats.added + stats.removed + stats.unchanged;
  const similarity = total ? (stats.unchanged / total) * 100 : 100;
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {metric("Lines added", String(stats.added))}
      {metric("Lines removed", String(stats.removed))}
      {metric("Unchanged", String(stats.unchanged))}
      {metric("Similarity", `${similarity.toFixed(1)}%`)}
    </div>
  );
}

function DiffView({ changes }: { changes: Change[] }) {
  return (
    <Panel noPadding className="overflow-x-auto">
      <pre className="font-mono text-xs">
        {changes.flatMap((change, changeIndex) => {
          const lines = change.value.split("\n");
          if (lines.at(-1) === "") lines.pop();
          return lines.map((line, lineIndex) => {
            const cls = change.added ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : change.removed ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "text-zinc-700 dark:text-zinc-300";
            const sign = change.added ? "+" : change.removed ? "-" : " ";
            return <div key={`${changeIndex}-${lineIndex}`} className={`flex ${cls}`}><span className="w-6 select-none px-2">{sign}</span><span className="whitespace-pre-wrap break-words pr-3">{line}</span></div>;
          });
        })}
      </pre>
    </Panel>
  );
}

type RecentPaste = { id: string; title?: string; preview: string; language?: string; createdAt: string; expiresAt?: string; url: string };

function loadRecentPastes(): RecentPaste[] {
  try {
    const raw = localStorage.getItem("devtools_recent_pastes") ?? localStorage.getItem("recentPastes") ?? "[]";
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => {
      const record = isPlainRecord(item) ? item : {};
      return {
        id: String(record.id ?? index),
        title: String(record.title ?? record.name ?? ""),
        preview: String(record.preview ?? record.content ?? ""),
        language: String(record.language ?? record.syntax ?? "text"),
        createdAt: String(record.createdAt ?? record.created_at ?? new Date().toISOString()),
        expiresAt: record.expiresAt || record.expires_at ? String(record.expiresAt ?? record.expires_at) : undefined,
        url: String(record.url ?? record.href ?? "/paste/view"),
      };
    });
  } catch {
    return [];
  }
}

function buildUrl(base: string, params: Array<[string, string]>) {
  try {
    const url = new URL(base);
    url.search = "";
    params.filter(([key]) => key).forEach(([key, value]) => url.searchParams.append(key, value));
    return url.toString();
  } catch {
    const query = new URLSearchParams(params.filter(([key]) => key)).toString();
    return `${base}${query ? `?${query}` : ""}`;
  }
}

function ParamEditor({ params, setParams }: { params: Array<[string, string]>; setParams: (value: Array<[string, string]>) => void }) {
  return (
    <Panel noPadding className="p-4">
      <div className="mb-3 flex justify-between"><Label>Query parameters</Label><Button onClick={() => setParams([...params, ["", ""]])}>Add param</Button></div>
      <div className="space-y-2">
        {params.map(([key, value], index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <ToolInput value={key} onChange={(event) => setParams(params.map((item, i) => i === index ? [event.target.value, item[1]] : item))} placeholder="key" />
            <ToolInput value={value} onChange={(event) => setParams(params.map((item, i) => i === index ? [item[0], event.target.value] : item))} placeholder="value" />
            <Button variant="danger" onClick={() => setParams(params.filter((_, i) => i !== index))}>Delete</Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type ValidationReportData = { errors: string[]; warnings: string[]; info: string[] };

function ValidationReport({ report }: { report: ValidationReportData }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {metric("Errors", String(report.errors.length), report.errors.length ? "error" : "success")}
        {metric("Warnings", String(report.warnings.length))}
        {metric("Info items", String(report.info.length))}
      </div>
      <Panel noPadding className="space-y-3 p-4">
        {report.errors.map((item) => <Badge key={item} variant="error">{item}</Badge>)}
        {report.warnings.map((item) => <Badge key={item} variant="warning">{item}</Badge>)}
        {report.info.map((item) => <Badge key={item} variant="info">{item}</Badge>)}
        {!report.errors.length && !report.warnings.length && <Badge variant="success">No issues found</Badge>}
      </Panel>
    </div>
  );
}

function validateCompose(input: string): ValidationReportData {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  try {
    const parsed = yaml.load(input) as unknown;
    if (!isPlainRecord(parsed)) throw new Error("Compose file must be a YAML object.");
    if ("version" in parsed) warnings.push("version field is deprecated in newer Compose specs.");
    const services = parsed.services;
    if (!isPlainRecord(services)) errors.push("services object is required.");
    else {
      Object.entries(services).forEach(([name, service]) => {
        if (!isPlainRecord(service)) {
          errors.push(`${name} must be an object.`);
          return;
        }
        if (!("image" in service) && !("build" in service)) errors.push(`${name} needs image or build.`);
        if (!("restart" in service)) warnings.push(`${name} has no restart policy.`);
        if (service.privileged === true) warnings.push(`${name} enables privileged mode.`);
        if (Array.isArray(service.ports)) info.push(`${name} ports: ${service.ports.join(", ")}`);
        if (Array.isArray(service.volumes)) info.push(`${name} volumes: ${service.volumes.join(", ")}`);
      });
    }
    if (isPlainRecord(parsed.networks)) info.push(`Networks: ${Object.keys(parsed.networks).join(", ")}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid YAML.");
  }
  return { errors, warnings, info };
}

function validateNginx(input: string): ValidationReportData {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  let balance = 0;
  input.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    balance += (trimmed.match(/\{/g) ?? []).length;
    balance -= (trimmed.match(/\}/g) ?? []).length;
    const directive = trimmed.split(/\s+/)[0].replace(/[;{]/g, "");
    if (directive && !COMMON_NGINX_DIRECTIVES.has(directive) && !trimmed.startsWith("}")) warnings.push(`Line ${index + 1}: uncommon directive ${directive}.`);
  });
  if (balance !== 0) errors.push("Braces are not balanced.");
  const serverBlocks = (input.match(/\bserver\s*\{/g) ?? []).length;
  const locations = (input.match(/\blocation\s+/g) ?? []).length;
  const upstreams = (input.match(/\bupstream\s+/g) ?? []).length;
  info.push(`Server blocks: ${serverBlocks}`);
  info.push(`Locations: ${locations}`);
  info.push(`Upstreams: ${upstreams}`);
  if (serverBlocks && !/\blisten\b/.test(input)) errors.push("server block is missing listen directive.");
  if (serverBlocks && !/\bserver_name\b/.test(input)) warnings.push("server block is missing server_name.");
  if (/\bssl\b/.test(input) && (!/ssl_certificate\b/.test(input) || !/ssl_certificate_key\b/.test(input))) errors.push("SSL config needs certificate and key.");
  if (!/\bgzip\b/.test(input)) warnings.push("gzip is not configured.");
  if (!/add_header\s+X-Frame-Options/i.test(input)) warnings.push("security headers are missing or incomplete.");
  if (/proxy_pass\s+\$/.test(input)) warnings.push("dynamic open proxy pattern detected.");
  return { errors, warnings, info };
}

function buildSystemdUnit(config: Record<string, string>) {
  const envLines = config.environment.split(/\r?\n/).filter(Boolean).map((line) => `Environment="${line.replace(/"/g, '\\"')}"`);
  return [
    "[Unit]",
    `Description=${config.description}`,
    `After=${config.after}`,
    "",
    "[Service]",
    "Type=simple",
    `User=${config.user}`,
    `WorkingDirectory=${config.workingDirectory}`,
    ...envLines,
    `ExecStart=${config.execStart}`,
    `Restart=${config.restart}`,
    `RestartSec=${config.restartSec}`,
    "",
    "[Install]",
    `WantedBy=${config.wantedBy}`,
    "",
  ].join("\n");
}

function parseToml(input: string): { data: TomlObject; error: string; stats: { keys: number; tables: number; arrays: number } } {
  const root: TomlObject = {};
  let current = root;
  const stats = { keys: 0, tables: 0, arrays: 0 };
  try {
    input.split(/\r?\n/).forEach((rawLine, index) => {
      const line = stripTomlComment(rawLine).trim();
      if (!line) return;
      const table = line.match(/^\[([A-Za-z0-9_.-]+)\]$/);
      if (table) {
        current = ensureTomlTable(root, table[1]);
        stats.tables += 1;
        return;
      }
      const eq = line.indexOf("=");
      if (eq === -1) throw new Error(`Line ${index + 1}: expected key = value.`);
      const key = line.slice(0, eq).trim();
      const parsed = parseTomlValue(line.slice(eq + 1).trim(), index + 1);
      current[key] = parsed;
      stats.keys += 1;
      if (Array.isArray(parsed)) stats.arrays += 1;
    });
    return { data: root, error: "", stats };
  } catch (error) {
    return { data: root, error: error instanceof Error ? error.message : "Invalid TOML.", stats };
  }
}

function stripTomlComment(line: string) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && line[i - 1] !== "\\") quoted = !quoted;
    if (line[i] === "#" && !quoted) return line.slice(0, i);
  }
  return line;
}

function ensureTomlTable(root: TomlObject, path: string) {
  let current = root;
  path.split(".").forEach((part) => {
    const existing = current[part];
    if (!isPlainRecord(existing)) current[part] = {};
    current = current[part] as TomlObject;
  });
  return current;
}

function parseTomlValue(value: string, line: number): TomlValue {
  if (/^".*"$/.test(value)) return value.slice(1, -1).replace(/\\"/g, '"');
  if (value === "true" || value === "false") return value === "true";
  if (/^\[.*\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitTomlList(inner).map((item) => parseTomlValue(item.trim(), line) as TomlPrimitive);
  }
  if (/^\{.*\}$/.test(value)) {
    const obj: Record<string, TomlPrimitive> = {};
    splitTomlList(value.slice(1, -1)).forEach((entry) => {
      const eq = entry.indexOf("=");
      if (eq === -1) throw new Error(`Line ${line}: invalid inline table.`);
      obj[entry.slice(0, eq).trim()] = parseTomlValue(entry.slice(eq + 1).trim(), line) as TomlPrimitive;
    });
    return obj;
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(value)) return Number(value);
  throw new Error(`Line ${line}: unsupported TOML value ${value}.`);
}

function splitTomlList(value: string) {
  const items: string[] = [];
  let current = "";
  let quoted = false;
  Array.from(value).forEach((char) => {
    if (char === '"' && !current.endsWith("\\")) quoted = !quoted;
    if (char === "," && !quoted) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  });
  if (current.trim()) items.push(current);
  return items;
}

function formatToml(data: TomlObject) {
  return objectToToml(data);
}

function objectToToml(data: Record<string, unknown>, prefix = ""): string {
  const lines: string[] = [];
  const tables: Array<[string, Record<string, unknown>]> = [];
  Object.entries(data).forEach(([key, value]) => {
    if (isPlainRecord(value) && !isInlineTable(value)) tables.push([key, value]);
    else lines.push(`${key} = ${tomlValue(value)}`);
  });
  tables.forEach(([key, value]) => {
    const tableName = prefix ? `${prefix}.${key}` : key;
    lines.push("", `[${tableName}]`, objectToToml(value, tableName));
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function tomlValue(value: unknown): string {
  if (typeof value === "string") return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(", ")}]`;
  if (isPlainRecord(value)) return `{ ${Object.entries(value).map(([key, val]) => `${key} = ${tomlValue(val)}`).join(", ")} }`;
  return `""`;
}

function isInlineTable(value: Record<string, unknown>) {
  return Object.values(value).every((item) => !isPlainRecord(item));
}

function TomlStats({ parsed }: { parsed: ReturnType<typeof parseToml> }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {metric("Status", parsed.error ? "Invalid" : "Valid", parsed.error ? "error" : "success")}
      {metric("Keys", String(parsed.stats.keys))}
      {metric("Tables", String(parsed.stats.tables))}
      {metric("Arrays", String(parsed.stats.arrays))}
      {parsed.error && <div className="md:col-span-4"><Badge variant="error">{parsed.error}</Badge></div>}
    </div>
  );
}

function tomlOverview(data: TomlObject) {
  return Object.entries(data).map(([key, value]) => ({ key, type: Array.isArray(value) ? "array" : value === null ? "null" : typeof value }));
}

function safeJson(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return {};
  }
}

function countKeys(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countKeys(item), 0);
  if (isPlainRecord(value)) return Object.entries(value).reduce((sum, [, item]) => sum + 1 + countKeys(item), 0);
  return 0;
}

function depthOf(value: unknown): number {
  if (Array.isArray(value)) return 1 + Math.max(0, ...value.map(depthOf));
  if (isPlainRecord(value)) return 1 + Math.max(0, ...Object.values(value).map(depthOf));
  return 0;
}
