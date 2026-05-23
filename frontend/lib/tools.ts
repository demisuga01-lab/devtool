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
      { name: "HTML Formatter", slug: "html-formatter", description: "Format and tidy HTML markup.", href: "/tools/html-formatter", implemented: true },
      { name: "stdin/Test Cases Runner", slug: "testcase-runner", description: "Run code against multiple test cases.", href: "/tools/testcase-runner", implemented: true },
      { name: "Code Sharing", slug: "code-share", description: "Share runnable code snippets with a link.", href: "/tools/code-share", implemented: true },
      { name: "Zero-Knowledge Paste", slug: "zk-paste", description: "Share text with end-to-end encryption.", href: "/tools/zk-paste", implemented: true },
      { name: "Local Notes", slug: "collab-notes", description: "Write and save markdown notes locally.", href: "/tools/collab-notes", implemented: true },
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
      { name: "One-Time Secret", slug: "one-time-secret", description: "Share secrets that self-destruct after reading.", href: "/tools/one-time-secret", implemented: true },
      { name: "Encrypted File Paste", slug: "encrypted-file-paste", description: "Share encrypted files with self-destruct.", href: "/tools/encrypted-file-paste", implemented: true },
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
      { name: "Encode & Decode", slug: "encode", description: "Base64, URL, HTML, hex, binary encoding and escaping.", href: "/tools/encode", implemented: true, workspaceToolCount: 12 },
      { name: "CSV to JSON", slug: "csv-to-json", description: "Convert CSV data into structured JSON.", href: "/tools/csv-to-json", implemented: true },
      { name: "File Encoding", slug: "file-encoding", description: "Convert text files between encodings.", href: "/tools/file-encoding", implemented: true },
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
      { name: "cURL Builder", slug: "curl-builder", description: "Build cURL commands visually or convert cURL to fetch.", href: "/tools/curl-builder", implemented: true },
      { name: "Request History", slug: "request-history", description: "Browse your recent HTTP tool requests.", href: "/tools/request-history", implemented: true },
      { name: "REST Client", slug: "rest-client", description: "Make HTTP requests and inspect responses.", href: "/tools/rest-client", implemented: true },
      { name: "GraphQL Client", slug: "graphql-client", description: "Query GraphQL APIs with schema explorer.", href: "/tools/graphql-client", implemented: true },
      { name: "API Collections", slug: "api-collections", description: "Save and organize API requests.", href: "/tools/api-collections", implemented: true },
      { name: "Webhook Inbox", slug: "webhook-inbox", description: "Capture and inspect incoming webhooks.", href: "/tools/webhook-inbox", implemented: true },
      { name: "Webhook Payload Viewer", slug: "webhook-viewer", description: "Parse and inspect HTTP request payloads.", href: "/tools/webhook-viewer", implemented: true },
    ],
  },
  {
    name: "Reference & Utils",
    slug: "reference",
    description: "Look up references and run common utility transformations.",
    tools: [
      { name: "Recent Pastes", slug: "recent-pastes", description: "View locally stored recent paste history.", href: "/tools/recent-pastes", implemented: true },
      { name: "SQL Formatter", slug: "sql-formatter", description: "Format SQL queries for readability.", href: "/tools/sql-formatter", implemented: true },
      { name: "JS Beautifier", slug: "js-beautifier", description: "Format and beautify JavaScript code.", href: "/tools/js-beautifier", implemented: true },
      { name: "Status Badges/Widgets", slug: "status-badges", description: "Generate embeddable status badges and widgets.", href: "/tools/status-badges", implemented: true },
    ],
  },
  {
    name: "DevOps",
    slug: "devops",
    description: "Validate and generate deployment configuration files.",
    tools: [
      { name: "Config Tools", slug: "config", description: "Validate Docker, Nginx, systemd, env and gitignore files.", href: "/tools/config", implemented: true, workspaceToolCount: 6 },
    ],
  },
  {
    name: "Code Runners",
    slug: "code-runners",
    description: "Run code in 20+ languages across 6 specialized environments.",
    tools: [
      {
        name: "Web Runner",
        slug: "web-runner",
        description: "Run HTML, CSS, and JavaScript with a live preview. Supports combined and solo modes.",
        href: "/tools/web-runner",
        implemented: true,
      },
      {
        name: "Systems Runner",
        slug: "systems-runner",
        description: "Compile and run C, C++, Rust, and Go code.",
        href: "/tools/systems-runner",
        implemented: true,
      },
      {
        name: "Scripting Runner",
        slug: "scripting-runner",
        description: "Run Python, Ruby, PHP, Perl, Bash, and Lua scripts.",
        href: "/tools/scripting-runner",
        implemented: true,
      },
      {
        name: "JVM Runner",
        slug: "jvm-runner",
        description: "Run Java, Kotlin, Scala, C#, and Basic code.",
        href: "/tools/jvm-runner",
        implemented: true,
      },
      {
        name: "Data Runner",
        slug: "data-runner",
        description: "Run SQLite queries and Julia scripts.",
        href: "/tools/data-runner",
        implemented: true,
      },
      {
        name: "Multi-file Runner",
        slug: "multifile-runner",
        description: "Run multi-file projects in one execution.",
        href: "/tools/multifile-runner",
        implemented: true,
      },
      {
        name: "Notebook Runner",
        slug: "notebook",
        description: "Interactive code cells with inline outputs.",
        href: "/tools/notebook",
        implemented: true,
      },
      {
        name: "Challenges",
        slug: "challenges",
        description: "Solve coding challenges with test cases.",
        href: "/tools/challenges",
        implemented: true,
      },
      {
        name: "Other Languages",
        slug: "other-runner",
        description: "Run Swift, Dart, Fortran, and D code.",
        href: "/tools/other-runner",
        implemented: true,
      },
    ],
  },
];

const inspectTools = new Set([
  "json",
  "xml",
  "config",
  "html-formatter",
  "jwt",
  "toml",
  "openapi",
  "file-encoding",
  "ssl",
  "webhook-viewer",
]);

const convertTools = new Set([
  "encode",
  "csv-to-json",
]);

const securityTools = new Set([
  "hash",
  "jwt",
  "one-time-secret",
  "encrypted-file-paste",
  "zk-paste",
]);

const generateTools = new Set([
  "generators",
  "css-color",
  "status-badges",
]);

const networkTools = new Set([
  "network",
  "ssl",
  "curl-builder",
  "rest-client",
  "graphql-client",
  "api-collections",
  "webhook-inbox",
  "request-history",
]);

const textTools = new Set([
  "text",
  "datetime",
  "regex",
  "sql-formatter",
  "js-beautifier",
  "code-share",
  "collab-notes",
  "testcase-runner",
  "code-runner",
  "web-runner",
  "scripting-runner",
  "jvm-runner",
  "systems-runner",
  "other-runner",
  "data-runner",
  "multifile-runner",
  "notebook",
  "challenges",
  "recent-pastes",
]);

const popularTools = new Set([
  "json",
  "generators",
  "encode",
  "jwt",
  "hash",
  "regex",
  "datetime",
  "network",
  "text",
  "scripting-runner",
  "web-runner",
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
  "recent-pastes",
  "status-badges",
  "testcase-runner",
  "code-share",
  "request-history",
  "zk-paste",
  "collab-notes",
  "one-time-secret",
  "encrypted-file-paste",
  "rest-client",
  "graphql-client",
  "api-collections",
  "webhook-inbox",
  "webhook-viewer",
  "multifile-runner",
  "notebook",
  "challenges",
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
  "curl-builder": Terminal,
  "rest-client": Send,
  "graphql-client": Workflow,
  "api-collections": FolderOpen,
  "request-history": Clock,
  "webhook-inbox": Server,
  "webhook-viewer": SearchCheck,
  hash: Hash,
  jwt: Key,
  generators: Sparkles,
  "one-time-secret": Lock,
  "encrypted-file-paste": ShieldCheck,
  "zk-paste": Lock,
  "status-badges": Layers,
  "css-color": Palette,
  regex: SearchCheck,
  "sql-formatter": Database,
  "js-beautifier": Code2,
  "code-share": Code2,
  "collab-notes": PenLine,
  "testcase-runner": Play,
  "code-runner": Terminal,
  "web-runner": Code2,
  "scripting-runner": Terminal,
  "jvm-runner": Cpu,
  "systems-runner": Cpu,
  "data-runner": Database,
  "multifile-runner": Files,
  notebook: LayoutList,
  challenges: Trophy,
  "other-runner": Terminal,
  encode: ArrowLeftRight,
  "csv-to-json": Database,
  "file-encoding": FileText,
  "recent-pastes": Clock,
};

const explicitTags: Record<string, string[]> = {
  json: ["json", "format", "prettify", "validate", "diff", "convert", "yaml", "csv", "typescript", "jsonpath", "tree"],
  xml: ["xml", "format", "validate", "xpath", "xslt", "xsd", "convert", "escape", "json", "transform"],
  encode: ["encode", "decode", "base64", "url", "html", "hex", "binary", "morse", "unicode", "escape", "unescape", "sql", "js"],
  hash: ["hash", "md5", "sha", "sha256", "hmac", "bcrypt", "blake2", "totp", "crypto", "checksum", "verify", "otp"],
  datetime: ["date", "time", "timestamp", "unix", "timezone", "cron", "schedule", "age", "diff", "duration", "heartbeat", "quartz"],
  network: ["dns", "whois", "ip", "http", "headers", "redirect", "ssl", "spf", "dkim", "security", "network", "domain", "og"],
  config: ["config", "docker", "nginx", "systemd", "env", "gitignore", "yaml", "validate", "generate", "compose", "service"],
  text: ["text", "case", "convert", "diff", "markdown", "word count", "sort", "clean", "ascii", "mime", "semver", "units", "roman"],
  generators: ["password", "secure", "random", "entropy", "uuid", "ulid", "nanoid", "qr", "slug", "lorem"],
  jwt: ["jwt", "token", "json web token", "claims", "bearer", "auth", "decode", "build", "verify", "payload", "header"],
  regex: ["regex", "regexp", "pattern", "match", "test", "regular expression", "search", "replace", "escape"],
  openapi: ["openapi", "swagger", "redoc", "api docs", "schema", "validate", "viewer"],
  toml: ["toml", "format", "validate", "convert", "configuration"],
  ssl: ["ssl", "tls", "certificate", "https", "expiry", "cert", "security", "chain"],
  "css-color": ["css", "color", "gradient", "contrast", "box shadow", "clamp", "formatter"],
  "webhook-inbox": ["webhook", "http", "request", "capture", "inspect", "endpoint", "listener"],
  "rest-client": ["rest", "http", "api", "request", "get", "post", "client", "fetch", "curl", "endpoint", "test"],
  "graphql-client": ["graphql", "gql", "query", "mutation", "schema", "introspection", "api", "graph"],
  "api-collections": ["collection", "postman", "api", "requests", "save", "organize", "environment", "variables"],
  "multifile-runner": ["multi file", "project", "runner", "code", "execute", "compile", "files", "judge0", "sandbox"],
  notebook: ["notebook", "cells", "code", "runner", "interactive", "execute", "inline output", "judge0"],
  challenges: ["challenge", "testcase", "coding", "practice", "judge", "submit", "tests", "score", "hidden cases"],
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
  if (["rest-client", "graphql-client", "api-collections"].includes(slug)) return ["url", "text", "json"];
  if (["multifile-runner", "notebook", "challenges"].includes(slug)) return ["code"];
  if (["generators", "status-badges"].includes(slug)) return ["none"];
  if (slug === "datetime") return ["text", "none"];
  if (["config"].includes(slug)) return ["text", "code"];
  if (slug.includes("runner") || ["code-share", "testcase-runner", "js-beautifier", "html-formatter", "sql-formatter"].includes(slug)) return ["code"];
  if (slug === "json" || slug.includes("json") || ["jwt", "openapi", "webhook-viewer"].includes(slug)) return ["json", "text"];
  if (slug === "hash") return ["text", "file"];
  if (["network", "ssl", "webhook-inbox"].includes(slug)) return ["url"];
  if (["file-encoding", "encrypted-file-paste", "collab-notes"].includes(slug)) return ["file", "text"];
  return ["text"];
}

function outputTypesForTool(tool: ToolSeed, intentGroup: IntentGroupId): ToolOutputType[] {
  const slug = tool.slug;
  if (slug.includes("runner") || ["testcase-runner", "notebook"].includes(slug)) return ["executed"];
  if (slug === "challenges") return ["validated", "executed"];
  if (slug === "json") return ["formatted", "validated", "converted", "analyzed"];
  if (slug === "xml") return ["formatted", "validated", "converted"];
  if (slug === "encode") return ["converted"];
  if (slug === "hash") return ["generated", "analyzed"];
  if (slug === "datetime") return ["converted", "analyzed", "generated"];
  if (slug === "network") return ["analyzed"];
  if (slug === "config") return ["validated", "generated"];
  if (slug === "text") return ["converted", "analyzed", "formatted"];
  if (slug.includes("validator") || ["jwt"].includes(slug)) return ["validated"];
  if (slug.includes("formatter") || ["js-beautifier"].includes(slug)) return ["formatted"];
  if (intentGroup === "convert" || slug.includes("-to-") || slug.includes("converter")) return ["converted"];
  if (intentGroup === "generate" || intentGroup === "security" && ["jwt", "one-time-secret", "encrypted-file-paste", "zk-paste"].includes(slug)) return ["generated"];
  return ["analyzed"];
}

function complexityForTool(tool: ToolSeed): ToolComplexity {
  if (
    tool.slug.includes("runner") ||
    ["json", "xml", "openapi", "config", "webhook-inbox", "webhook-viewer", "rest-client", "graphql-client", "api-collections", "multifile-runner", "notebook", "challenges", "jwt", "testcase-runner", "code-share"].includes(tool.slug)
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
