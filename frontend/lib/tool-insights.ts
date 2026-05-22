export type JsonStats = {
  totalKeys: number;
  maxDepth: number;
  arrays: { path: string; length: number }[];
  nullCount: number;
  emptyStringCount: number;
  emptyArrayCount: number;
  emptyObjectCount: number;
  typeCounts: Record<string, number>;
  deepPaths: string[];
};

export type TextStats = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  uniqueWords: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  averageWordLength: number;
  readingTimeSeconds: number;
  speakingTimeSeconds: number;
  topWords: { word: string; count: number }[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has", "have", "in", "is", "it",
  "of", "on", "or", "that", "the", "this", "to", "was", "were", "with", "you", "your",
]);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d ${hours % 24}h`;
  const years = Math.floor(days / 365);
  return `${years}y ${days % 365}d`;
}

export function analyzeText(value: string): TextStats {
  const words = value.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)?/gi) ?? [];
  const wordLengths = words.reduce((sum, word) => sum + word.length, 0);
  const frequencies = new Map<string, number>();
  for (const word of words.map((item) => item.toLowerCase())) {
    if (STOP_WORDS.has(word)) continue;
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return {
    characters: value.length,
    charactersNoSpaces: value.replace(/\s+/g, "").length,
    words: words.length,
    uniqueWords: new Set(words.map((word) => word.toLowerCase())).size,
    sentences: value.trim() ? (value.match(/[.!?]+(?=\s|$)/g) ?? []).length || 1 : 0,
    paragraphs: value.trim() ? value.split(/\n{2,}/).filter((part) => part.trim()).length : 0,
    lines: value ? value.split(/\r?\n/).length : 0,
    averageWordLength: words.length ? wordLengths / words.length : 0,
    readingTimeSeconds: (words.length / 230) * 60,
    speakingTimeSeconds: (words.length / 150) * 60,
    topWords: Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([word, count]) => ({ word, count })),
  };
}

function jsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function analyzeJson(value: unknown): JsonStats {
  const stats: JsonStats = {
    totalKeys: 0,
    maxDepth: 0,
    arrays: [],
    nullCount: 0,
    emptyStringCount: 0,
    emptyArrayCount: 0,
    emptyObjectCount: 0,
    typeCounts: {},
    deepPaths: [],
  };

  function visit(node: unknown, path: string, depth: number) {
    const type = jsonType(node);
    stats.typeCounts[type] = (stats.typeCounts[type] ?? 0) + 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    if (depth > 5) stats.deepPaths.push(path);
    if (node === null) stats.nullCount += 1;
    if (node === "") stats.emptyStringCount += 1;

    if (Array.isArray(node)) {
      stats.arrays.push({ path, length: node.length });
      if (node.length === 0) stats.emptyArrayCount += 1;
      node.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
      return;
    }

    if (node && typeof node === "object") {
      const entries = Object.entries(node as Record<string, unknown>);
      stats.totalKeys += entries.length;
      if (entries.length === 0) stats.emptyObjectCount += 1;
      for (const [key, child] of entries) {
        const nextPath = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
        visit(child, nextPath, depth + 1);
      }
    }
  }

  visit(value, "$", 0);
  stats.deepPaths = Array.from(new Set(stats.deepPaths)).slice(0, 20);
  return stats;
}

export function findRepeatedJsonKeys(source: string): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  const re = /"((?:\\.|[^"\\])*)"\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const key = match[1].replace(/\\"/g, '"');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([key, count]) => ({ key, count }));
}

export function inferJsonSchema(value: unknown): unknown {
  const type = jsonType(value);
  if (type === "array") {
    const items = value as unknown[];
    return {
      type: "array",
      minItems: items.length,
      items: items.length ? inferJsonSchema(items.find((item) => item !== null) ?? items[0]) : {},
    };
  }
  if (value && typeof value === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = inferJsonSchema(child);
      if (child !== null && child !== "") required.push(key);
    }
    return { type: "object", properties, required, additionalProperties: true };
  }
  if (type === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
  return { type };
}

export function jsonErrorContext(source: string, line?: number, column?: number): string {
  if (!line) return "";
  const lines = source.split(/\r?\n/);
  const start = Math.max(0, line - 3);
  const end = Math.min(lines.length, line + 2);
  return lines
    .slice(start, end)
    .map((text, index) => {
      const lineNo = start + index + 1;
      const marker = lineNo === line && column ? `\n${" ".repeat(String(lineNo).length + 3 + Math.max(0, column - 1))}^` : "";
      return `${lineNo}: ${text}${marker}`;
    })
    .join("\n");
}

export function analyzeBase64(input: string, output: string, mode: "encode" | "decode", urlSafe: boolean) {
  const inputBytes = utf8ByteLength(input);
  const outputBytes = utf8ByteLength(output);
  const compact = (mode === "encode" ? output : input).replace(/\s/g, "");
  const isUrlSafe = /[-_]/.test(compact) && !/[+/]/.test(compact);
  const normalized = compact.replace(/-/g, "+").replace(/_/g, "/");
  const imageSignatures: [string, string][] = [
    ["iVBORw0KGgo", "image/png"],
    ["/9j/", "image/jpeg"],
    ["R0lGOD", "image/gif"],
    ["UklGR", "image/webp"],
    ["PHN2Zy", "image/svg+xml"],
  ];
  const image = imageSignatures.find(([prefix]) => normalized.startsWith(prefix))?.[1] ?? "";

  return {
    inputBytes,
    outputBytes,
    inputSize: formatBytes(inputBytes),
    outputSize: formatBytes(outputBytes),
    ratio: inputBytes ? outputBytes / inputBytes : 0,
    detectedVariant: isUrlSafe ? "URL-safe base64url" : "Standard Base64",
    selectedVariant: urlSafe ? "URL-safe base64url" : "Standard Base64",
    image,
  };
}

export function analyzeUrlEncoding(input: string, output: string, mode: "encode" | "decode") {
  const encodedChars: { char: string; encoded: string; reason: string }[] = [];
  if (mode === "encode") {
    for (const char of Array.from(input)) {
      const encoded = encodeURIComponent(char);
      if (encoded !== char) {
        encodedChars.push({
          char,
          encoded,
          reason: /\s/.test(char) ? "Whitespace must be percent-encoded in URL components." : "Reserved or non-ASCII character per RFC 3986.",
        });
      }
    }
  }
  const decodedPairs = Array.from(input.matchAll(/%([0-9A-Fa-f]{2})/g)).map((match) => {
    const hex = match[1];
    return { encoded: `%${hex.toUpperCase()}`, char: String.fromCharCode(parseInt(hex, 16)) };
  });
  let queryOnly = "";
  try {
    const url = new URL(input);
    queryOnly = url.search ? url.search.slice(1) : "";
  } catch {
    queryOnly = "";
  }
  return {
    inputBytes: formatBytes(utf8ByteLength(input)),
    outputBytes: formatBytes(utf8ByteLength(output)),
    encodedChars: encodedChars.slice(0, 50),
    decodedPairs: decodedPairs.slice(0, 50),
    fullUrlDetected: Boolean(queryOnly),
    queryOnly,
  };
}

export function analyzeHtml(input: string) {
  const tagMatches = Array.from(input.matchAll(/<\s*([a-zA-Z][\w:-]*)(?=\s|>|\/)/g));
  const closingMatches = Array.from(input.matchAll(/<\/\s*([a-zA-Z][\w:-]*)\s*>/g));
  let depth = 0;
  let maxDepth = 0;
  for (const match of Array.from(input.matchAll(/<\/?\s*([a-zA-Z][\w:-]*)([^>]*)>/g))) {
    const raw = match[0];
    if (raw.startsWith("</")) depth = Math.max(0, depth - 1);
    else if (!raw.endsWith("/>") && !/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(match[1])) {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  const deprecated = tagMatches
    .map((match) => match[1].toLowerCase())
    .filter((tag) => ["font", "center", "marquee", "blink", "big", "tt"].includes(tag));
  const imgs = Array.from(input.matchAll(/<img\b[^>]*>/gi));
  const missingAlt = imgs.filter((match) => !/\salt\s*=/i.test(match[0])).length;
  const htmlTag = input.match(/<html\b([^>]*)>/i)?.[1] ?? "";
  return {
    tagCount: tagMatches.length + closingMatches.length,
    elementCount: tagMatches.length,
    maxDepth,
    inlineStyleCount: (input.match(/\sstyle\s*=/gi) ?? []).length,
    scriptTagCount: (input.match(/<script\b/gi) ?? []).length,
    deprecatedTags: Array.from(new Set(deprecated)),
    missingAlt,
    missingLang: Boolean(input.match(/<html\b/i)) && !/\slang\s*=/i.test(htmlTag),
    beforeBytes: formatBytes(utf8ByteLength(input)),
  };
}

export function analyzeCss(input: string) {
  const withoutComments = input.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = Array.from(withoutComments.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g));
  const selectors = rules.flatMap((match) => match[1].split(",").map((selector) => selector.trim()).filter(Boolean));
  const selectorCounts = new Map<string, number>();
  selectors.forEach((selector) => selectorCounts.set(selector, (selectorCounts.get(selector) ?? 0) + 1));
  const propertyCount = rules.reduce((sum, match) => sum + (match[2].match(/:[^;{}]+;?/g) ?? []).length, 0);
  const vendorWarnings: string[] = [];
  for (const prop of Array.from(withoutComments.matchAll(/-(webkit|moz|ms|o)-([\w-]+)\s*:/g))) {
    const standard = new RegExp(`(^|[;{\\s])${prop[2]}\\s*:`);
    if (!standard.test(withoutComments)) vendorWarnings.push(`-${prop[1]}-${prop[2]}`);
  }
  const highSpecificity = selectors.filter((selector) => {
    const ids = (selector.match(/#/g) ?? []).length;
    const classes = (selector.match(/[.:[\]]/g) ?? []).length;
    const parts = selector.split(/\s+|>|\+|~/).filter(Boolean).length;
    return ids * 100 + classes * 10 + parts > 110;
  });
  return {
    ruleCount: rules.length,
    selectorCount: selectors.length,
    propertyCount,
    mediaQueryCount: (withoutComments.match(/@media\b/g) ?? []).length,
    duplicateSelectors: Array.from(selectorCounts.entries()).filter(([, count]) => count > 1).map(([selector, count]) => ({ selector, count })),
    vendorWarnings: Array.from(new Set(vendorWarnings)),
    highSpecificity: highSpecificity.slice(0, 10),
    beforeBytes: formatBytes(utf8ByteLength(input)),
  };
}

export function jwtClaimDetails(payload: Record<string, unknown>) {
  const now = Date.now() / 1000;
  return (["iat", "exp", "nbf"] as const)
    .filter((key) => typeof payload[key] === "number")
    .map((key) => {
      const seconds = payload[key] as number;
      const diff = seconds - now;
      return {
        key,
        date: new Date(seconds * 1000).toLocaleString(),
        relative: diff >= 0 ? `in ${formatDuration(diff)}` : `${formatDuration(Math.abs(diff))} ago`,
        expired: key === "exp" && diff < 0,
      };
    });
}

export function sensitiveJwtKeys(payload: Record<string, unknown>) {
  return Object.keys(payload).filter((key) => /(password|secret|token|private|key|credential)/i.test(key));
}

export function passwordEntropy(password: string) {
  let pool = 0;
  const sets = [
    { label: "lowercase", size: 26, present: /[a-z]/.test(password) },
    { label: "uppercase", size: 26, present: /[A-Z]/.test(password) },
    { label: "numbers", size: 10, present: /\d/.test(password) },
    { label: "symbols", size: 33, present: /[^A-Za-z0-9]/.test(password) },
  ];
  sets.forEach((set) => {
    if (set.present) pool += set.size;
  });
  const entropy = password.length * Math.log2(Math.max(pool, 1));
  const speeds = [
    { label: "1M/s", seconds: Math.pow(2, entropy) / 1_000_000 },
    { label: "1B/s", seconds: Math.pow(2, entropy) / 1_000_000_000 },
    { label: "1T/s", seconds: Math.pow(2, entropy) / 1_000_000_000_000 },
  ];
  const label = entropy < 40 ? "Weak" : entropy < 70 ? "Fair" : entropy < 100 ? "Strong" : "Very Strong";
  return { entropy, label, sets: sets.filter((set) => set.present).map((set) => set.label), speeds };
}
