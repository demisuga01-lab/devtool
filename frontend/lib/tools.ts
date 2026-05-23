import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  ArrowLeftRight,
  Braces,
  Calendar,
  Clock,
  Code2,
  Cpu,
  Database,
  Diff,
  FileCode2,
  FileText,
  FolderOpen,
  Files,
  GitCompare,
  Globe,
  Hash,
  Key,
  Layers,
  LayoutList,
  Link2,
  Lock,
  Network,
  Palette,
  PenLine,
  Play,
  SearchCheck,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Trophy,
  Type,
  Wifi,
  Workflow,
  Zap,
} from "lucide-react";

export type IntentGroupId = "inspect" | "convert" | "security" | "generate" | "network" | "text";
export type ToolInputType = "text" | "file" | "url" | "code" | "json" | "none";
export type ToolOutputType = "formatted" | "generated" | "converted" | "analyzed" | "validated" | "executed";
export type ToolComplexity = "simple" | "advanced";

type ToolSeed = {
  name: string;
  slug: string;
  description: string;
  href: string;
  implemented: boolean;
  workspaceToolCount?: number;
};

export interface Tool extends ToolSeed {
  category: string;
  intentGroup: IntentGroupId;
  icon: LucideIcon;
  tags: string[];
  inputType: ToolInputType[];
  outputType: ToolOutputType[];
  complexity: ToolComplexity;
  isNew: boolean;
  isPopular: boolean;
}

export type ToolGroup = {
  name: string;
  slug: string;
  description: string;
  tools: Tool[];
};

type ToolSeedGroup = {
  name: string;
  slug: string;
  description: string;
  tools: ToolSeed[];
};

export const intentDefinitions: { id: IntentGroupId; label: string; shortLabel: string }[] = [
  { id: "inspect", label: "Inspect & Validate", shortLabel: "Inspect" },
  { id: "convert", label: "Convert & Transform", shortLabel: "Convert" },
  { id: "security", label: "Security & Crypto", shortLabel: "Security" },
  { id: "generate", label: "Generate & Build", shortLabel: "Generate" },
  { id: "network", label: "Network & Web", shortLabel: "Network" },
  { id: "text", label: "Text & Code", shortLabel: "Text" },
];

const seedToolGroups: ToolSeedGroup[] = [
  {
    name: "Text & Format",
    slug: "text",
    description: "Format, validate, and convert structured text.",
    tools: [
      { name: "JSON Tools", slug: "json", description: "Format, validate, convert, diff and query JSON.", href: "/tools/json", implemented: true, workspaceToolCount: 11 },
      { name: "Regex Tools", slug: "regex", description: "Test, escape, replace, and learn regular expressions.", href: "/tools/regex", implemented: true, workspaceToolCount: 5 },
      { name: "CSS & Color Tools", slug: "css-color", description: "Pick colors, generate gradients, check contrast, and format CSS.", href: "/tools/css-color", implemented: true, workspaceToolCount: 7 },
      { name: "Text Tools", slug: "text", description: "Case convert, clean, analyze, diff and preview markdown.", href: "/tools/text", implemented: true, workspaceToolCount: 16 },
      { name: "Code Formatter", slug: "formatter", description: "Format and beautify HTML, JavaScript and SQL.", href: "/tools/formatter", implemented: true, workspaceToolCount: 3 },
    ],
  },
  {
    name: "Crypto & Hash",
    slug: "crypto",
    description: "Hash, generate, and sign data in your browser.",
    tools: [
      { name: "JWT Tools", slug: "jwt", description: "Decode, build and verify JSON Web Tokens.", href: "/tools/jwt", implemented: true, workspaceToolCount: 3 },
      { name: "Generators", slug: "generators", description: "Generate passwords, tokens, IDs, QR codes, and more.", href: "/tools/generators", implemented: true, workspaceToolCount: 9 },
      { name: "Hash & Crypto", slug: "hash", description: "MD5, SHA, HMAC, bcrypt, BLAKE2 and TOTP generation.", href: "/tools/hash", implemented: true, workspaceToolCount: 6 },
      { name: "Secure Sharing", slug: "share", description: "Share secrets and files with end-to-end encryption.", href: "/tools/share", implemented: true, workspaceToolCount: 5 },
    ],
  },
  {
    name: "Date & Time",
    slug: "datetime",
    description: "Work with timestamps, cron, and date math.",
    tools: [
      { name: "Date & Time", slug: "datetime", description: "Timestamps, timezones, date diff, cron, and heartbeat.", href: "/tools/datetime", implemented: true, workspaceToolCount: 9 },
    ],
  },
  {
    name: "Encode & Convert",
    slug: "encode",
    description: "Convert between encodings and data formats.",
    tools: [
      { name: "Encode & Decode", slug: "encode", description: "Base64, URL, HTML, hex, binary, CSV, and file encoding tools.", href: "/tools/encode", implemented: true, workspaceToolCount: 14 },
    ],
  },
  {
    name: "XML & Data",
    slug: "xml-data",
    description: "Format, validate, and convert XML, YAML, and structured data.",
    tools: [
      { name: "XML Tools", slug: "xml", description: "Format, validate, convert and query XML documents.", href: "/tools/xml", implemented: true, workspaceToolCount: 7 },
      { name: "TOML Tools", slug: "toml", description: "Format, validate, and convert TOML configuration files.", href: "/tools/toml", implemented: true, workspaceToolCount: 3 },
      { name: "OpenAPI Tools", slug: "openapi", description: "View, validate, and explore OpenAPI specifications.", href: "/tools/openapi", implemented: true, workspaceToolCount: 4 },
    ],
  },
  {
    name: "Escape",
    slug: "escape",
    description: "Escape and unescape strings for markup, code, and SQL.",
    tools: [],
  },
  {
    name: "Web & Network",
    slug: "web",
    description: "Inspect headers, DNS, SSL, and HTTP responses.",
    tools: [
      { name: "Network Tools", slug: "network", description: "DNS, WHOIS, HTTP headers, redirects and security checks.", href: "/tools/network", implemented: true, workspaceToolCount: 9 },
      { name: "SSL & Certificate Tools", slug: "ssl", description: "Check SSL certificates, chains, and TLS configuration.", href: "/tools/ssl", implemented: true, workspaceToolCount: 2 },
      { name: "API Client", slug: "api", description: "REST, GraphQL, cURL, webhooks and request collections.", href: "/tools/api", implemented: true, workspaceToolCount: 7 },
    ],
  },
  {
    name: "Reference & Utils",
    slug: "reference",
    description: "Look up references and run common utility transformations.",
    tools: [
    ],
  },
  {
    name: "DevOps",
    slug: "devops",
    description: "Validate and generate deployment configuration files.",
    tools: [
      { name: "Config Tools", slug: "config", description: "Validate Docker, Nginx, systemd, env, gitignore, and badges.", href: "/tools/config", implemented: true, workspaceToolCount: 7 },
    ],
  },
  {
    name: "Code Runners",
    slug: "code-runners",
    description: "Run code in 40+ languages across unified coding modes.",
    tools: [
      { name: "Code Runner", slug: "code", description: "Run code in 40+ languages with web, notebook and test modes.", href: "/tools/code", implemented: true, workspaceToolCount: 13 },
    ],
  },
];

const inspectTools = new Set([
  "json",
  "xml",
  "config",
  "jwt",
  "toml",
  "openapi",
  "ssl",
]);

const convertTools = new Set([
  "encode",
]);

const securityTools = new Set([
  "hash",
  "jwt",
  "share",
]);

const generateTools = new Set([
  "generators",
  "css-color",
]);

const networkTools = new Set([
  "network",
  "ssl",
  "api",
]);

const textTools = new Set([
  "text",
  "datetime",
  "regex",
  "formatter",
  "code",
]);

const popularTools = new Set([
  "json",
  "generators",
  "encode",
  "jwt",
  "hash",
  "regex",
  "formatter",
  "datetime",
  "network",
  "text",
  "code",
  "api",
  "ssl",
]);

const newTools = new Set([
  "openapi",
  "toml",
  "css-color",
  "generators",
  "ssl",
  "regex",
  "json",
  "xml",
  "encode",
  "hash",
  "datetime",
  "network",
  "config",
  "text",
  "code",
  "api",
  "share",
  "formatter",
]);

const iconBySlug: Record<string, LucideIcon> = {
  json: Braces,
  xml: FileCode2,
  config: Server,
  text: Type,
  datetime: Clock,
  network: Globe,
  toml: FileText,
  openapi: FileCode2,
  ssl: Lock,
  api: Send,
  hash: Hash,
  jwt: Key,
  generators: Sparkles,
  share: Lock,
  "css-color": Palette,
  regex: SearchCheck,
  formatter: Code2,
  code: Terminal,
  encode: ArrowLeftRight,
};

const explicitTags: Record<string, string[]> = {
  json: ["json", "format", "prettify", "validate", "diff", "convert", "yaml", "csv", "typescript", "jsonpath", "tree"],
  xml: ["xml", "format", "validate", "xpath", "xslt", "xsd", "convert", "escape", "json", "transform"],
  encode: ["encode", "decode", "base64", "url", "html", "hex", "binary", "morse", "unicode", "escape", "unescape", "sql", "js", "csv", "file", "encoding"],
  hash: ["hash", "md5", "sha", "sha256", "hmac", "bcrypt", "blake2", "totp", "crypto", "checksum", "verify", "otp"],
  datetime: ["date", "time", "timestamp", "unix", "timezone", "cron", "schedule", "age", "diff", "duration", "heartbeat", "quartz"],
  network: ["dns", "whois", "ip", "http", "headers", "redirect", "ssl", "spf", "dkim", "security", "network", "domain", "og"],
  config: ["config", "docker", "nginx", "systemd", "env", "gitignore", "yaml", "validate", "generate", "compose", "service", "badge", "status", "shield"],
  text: ["text", "case", "convert", "diff", "markdown", "word count", "sort", "clean", "ascii", "mime", "semver", "units", "roman"],
  formatter: ["format", "beautify", "html", "javascript", "sql", "indent", "prettier", "minify", "tidy", "js", "code"],
  code: ["code", "run", "execute", "python", "javascript", "java", "rust", "go", "c", "c++", "compiler", "interpreter", "sql", "html", "css", "notebook", "multifile", "test", "challenge"],
  api: ["api", "rest", "http", "graphql", "curl", "webhook", "request", "response", "postman", "collections", "headers"],
  share: ["secret", "encrypt", "share", "one-time", "zero-knowledge", "file", "paste", "notes", "aes", "self-destruct", "private"],
  generators: ["password", "secure", "random", "entropy", "uuid", "ulid", "nanoid", "qr", "slug", "lorem"],
  jwt: ["jwt", "token", "json web token", "claims", "bearer", "auth", "decode", "build", "verify", "payload", "header"],
  regex: ["regex", "regexp", "pattern", "match", "test", "regular expression", "search", "replace", "escape"],
  openapi: ["openapi", "swagger", "redoc", "api docs", "schema", "validate", "viewer"],
  toml: ["toml", "format", "validate", "convert", "configuration"],
  ssl: ["ssl", "tls", "certificate", "https", "expiry", "cert", "security", "chain"],
  "css-color": ["css", "color", "gradient", "contrast", "box shadow", "clamp", "formatter"],
};

function intentForSlug(slug: string): IntentGroupId {
  if (inspectTools.has(slug)) return "inspect";
  if (convertTools.has(slug)) return "convert";
  if (securityTools.has(slug)) return "security";
  if (generateTools.has(slug)) return "generate";
  if (networkTools.has(slug)) return "network";
  if (textTools.has(slug)) return "text";
  return "text";
}

function inputTypesForTool(tool: ToolSeed): ToolInputType[] {
  const slug = tool.slug;
  if (slug === "api") return ["url", "code", "json"];
  if (slug === "code") return ["code"];
  if (slug === "share") return ["text", "file"];
  if (slug === "formatter") return ["code", "text"];
  if (["generators"].includes(slug)) return ["none"];
  if (slug === "datetime") return ["text", "none"];
  if (["config"].includes(slug)) return ["text", "code"];
  if (slug.includes("runner")) return ["code"];
  if (slug === "json" || slug.includes("json") || ["jwt", "openapi"].includes(slug)) return ["json", "text"];
  if (slug === "hash") return ["text", "file"];
  if (["network", "ssl"].includes(slug)) return ["url"];
  return ["text"];
}

function outputTypesForTool(tool: ToolSeed, intentGroup: IntentGroupId): ToolOutputType[] {
  const slug = tool.slug;
  if (slug === "code") return ["executed"];
  if (slug === "api") return ["analyzed"];
  if (slug === "share") return ["generated"];
  if (slug === "formatter") return ["formatted"];
  if (slug.includes("runner")) return ["executed"];
  if (slug === "json") return ["formatted", "validated", "converted", "analyzed"];
  if (slug === "xml") return ["formatted", "validated", "converted"];
  if (slug === "encode") return ["converted"];
  if (slug === "hash") return ["generated", "analyzed"];
  if (slug === "datetime") return ["converted", "analyzed", "generated"];
  if (slug === "network") return ["analyzed"];
  if (slug === "config") return ["validated", "generated"];
  if (slug === "text") return ["converted", "analyzed", "formatted"];
  if (slug.includes("validator") || ["jwt"].includes(slug)) return ["validated"];
  if (slug.includes("formatter")) return ["formatted"];
  if (intentGroup === "convert" || slug.includes("-to-") || slug.includes("converter")) return ["converted"];
  if (intentGroup === "generate" || intentGroup === "security" && ["jwt", "share"].includes(slug)) return ["generated"];
  return ["analyzed"];
}

function complexityForTool(tool: ToolSeed): ToolComplexity {
  if (
    tool.slug.includes("runner") ||
    ["json", "xml", "openapi", "config", "api", "code", "share", "jwt"].includes(tool.slug)
  ) {
    return "advanced";
  }
  return "simple";
}

function tagsForTool(tool: ToolSeed, category: string, intentGroup: IntentGroupId): string[] {
  const generated = [
    ...tool.name.toLowerCase().split(/[^a-z0-9+#]+/),
    ...tool.slug.split("-"),
    ...tool.description.toLowerCase().split(/[^a-z0-9+#]+/),
    category.toLowerCase(),
    intentGroup,
    "developer",
    "tool",
  ].filter((tag) => tag.length > 1);
  return Array.from(new Set([...(explicitTags[tool.slug] ?? []), ...generated])).slice(0, 16);
}

function enrichTool(tool: ToolSeed, category: string): Tool {
  const intentGroup = intentForSlug(tool.slug);
  return {
    ...tool,
    category,
    intentGroup,
    icon: iconBySlug[tool.slug] ?? FileText,
    tags: tagsForTool(tool, category, intentGroup),
    inputType: inputTypesForTool(tool),
    outputType: outputTypesForTool(tool, intentGroup),
    complexity: complexityForTool(tool),
    isNew: newTools.has(tool.slug),
    isPopular: popularTools.has(tool.slug),
  };
}

export const toolGroups: ToolGroup[] = seedToolGroups.map((group) => ({
  ...group,
  tools: group.tools.map((tool) => enrichTool(tool, group.name)),
}));

export const allTools: Tool[] = toolGroups.flatMap((g) => g.tools);

export function getTool(slug: string): Tool | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function getGroupOfTool(slug: string): ToolGroup | undefined {
  return toolGroups.find((g) => g.tools.some((t) => t.slug === slug));
}
