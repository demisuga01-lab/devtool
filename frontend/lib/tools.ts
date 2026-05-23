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
      { name: "HTML Formatter", slug: "html-formatter", description: "Format and tidy HTML markup.", href: "/tools/html-formatter", implemented: true },
      { name: "Text Diff", slug: "text-diff", description: "Compare two pieces of text line by line.", href: "/tools/text-diff", implemented: true },
      { name: "Markdown Preview", slug: "markdown-preview", description: "Render Markdown to sanitized HTML.", href: "/tools/markdown-preview", implemented: true },
      { name: "Word Counter", slug: "word-counter", description: "Count characters, words, and reading time.", href: "/tools/word-counter", implemented: true },
      { name: "Text Case Converter", slug: "text-case", description: "Convert text between camelCase, snake_case, PascalCase, kebab-case, SCREAMING_SNAKE, and more.", href: "/tools/text-case", implemented: true },
      { name: "Duplicate Line Remover", slug: "duplicate-line-remover", description: "Remove duplicate lines with trim, sort, and case options.", href: "/tools/duplicate-line-remover", implemented: true },
      { name: "Case Converter", slug: "case-converter", description: "Convert text between camelCase, PascalCase, snake_case, kebab-case, and more.", href: "/tools/case-converter", implemented: true },
      { name: "Line Sorter", slug: "line-sorter", description: "Sort lines alphabetically, numerically, or by length. Remove duplicates.", href: "/tools/line-sorter", implemented: true },
      { name: "YAML Diff", slug: "yaml-diff", description: "Compare YAML documents with line and key-level diffs.", href: "/tools/yaml-diff", implemented: true },
      { name: "Code Diff", slug: "code-diff", description: "Compare code snippets with language-aware diff metrics.", href: "/tools/code-diff", implemented: true },
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
      { name: "Timestamp Converter", slug: "timestamp", description: "Convert between Unix timestamps and date strings.", href: "/tools/timestamp", implemented: true },
      { name: "Cron Parser", slug: "cron-parser", description: "Parse cron expressions and preview next runs.", href: "/tools/cron-parser", implemented: true },
      { name: "Quartz Cron", slug: "quartz-cron", description: "Parse and explain Quartz cron expressions.", href: "/tools/quartz-cron", implemented: true },
      { name: "Date Diff", slug: "date-diff", description: "Calculate the difference between two dates.", href: "/tools/date-diff", implemented: true },
      { name: "Timezone Converter", slug: "timezone-converter", description: "Convert one time across major world timezones.", href: "/tools/timezone-converter", implemented: true },
      { name: "Duration Calculator", slug: "duration-calculator", description: "Add, subtract, and compare date durations.", href: "/tools/duration-calculator", implemented: true },
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
      { name: "HTTP Headers", slug: "http-headers", description: "Inspect response headers for any URL.", href: "/tools/http-headers", implemented: true },
      { name: "Redirect Checker", slug: "redirect-checker", description: "Trace the full redirect chain for a URL.", href: "/tools/redirect-checker", implemented: true },
      { name: "SSL & Certificate Tools", slug: "ssl", description: "Check SSL certificates, chains, and TLS configuration.", href: "/tools/ssl", implemented: true, workspaceToolCount: 2 },
      { name: "DNS Lookup", slug: "dns-lookup", description: "Query DNS records for a domain.", href: "/tools/dns-lookup", implemented: true },
      { name: "WHOIS Lookup", slug: "whois-lookup", description: "Look up WHOIS records for a domain.", href: "/tools/whois-lookup", implemented: true },
      { name: "Security Headers", slug: "security-headers", description: "Check HTTP security headers for any URL.", href: "/tools/security-headers", implemented: true },
      { name: "IP Lookup", slug: "ip-lookup", description: "Look up geolocation and ASN info for any IP address.", href: "/tools/ip-lookup", implemented: true },
      { name: "DNS Propagation", slug: "dns-propagation", description: "Check DNS propagation across multiple global nameservers.", href: "/tools/dns-propagation", implemented: true },
      { name: "SPF Checker", slug: "spf-checker", description: "Validate SPF, DKIM, and DMARC DNS records for a domain.", href: "/tools/spf-checker", implemented: true },
      { name: "Open Graph Preview", slug: "og-preview", description: "Preview how a URL looks when shared on social media.", href: "/tools/og-preview", implemented: true },
      { name: "cURL Builder", slug: "curl-builder", description: "Build cURL commands visually or convert cURL to fetch.", href: "/tools/curl-builder", implemented: true },
      { name: "Request History", slug: "request-history", description: "Browse your recent HTTP tool requests.", href: "/tools/request-history", implemented: true },
      { name: "REST Client", slug: "rest-client", description: "Make HTTP requests and inspect responses.", href: "/tools/rest-client", implemented: true },
      { name: "GraphQL Client", slug: "graphql-client", description: "Query GraphQL APIs with schema explorer.", href: "/tools/graphql-client", implemented: true },
      { name: "API Collections", slug: "api-collections", description: "Save and organize API requests.", href: "/tools/api-collections", implemented: true },
      { name: "Webhook Inbox", slug: "webhook-inbox", description: "Capture and inspect incoming webhooks.", href: "/tools/webhook-inbox", implemented: true },
      { name: "Webhook Payload Viewer", slug: "webhook-viewer", description: "Parse and inspect HTTP request payloads.", href: "/tools/webhook-viewer", implemented: true },
      { name: "Heartbeat Monitoring", slug: "heartbeat", description: "Monitor cron jobs and scheduled tasks.", href: "/tools/heartbeat", implemented: true },
    ],
  },
  {
    name: "Reference & Utils",
    slug: "reference",
    description: "Look up references and run common utility transformations.",
    tools: [
      { name: "String Utilities", slug: "string-utilities", description: "Common string transformations.", href: "/tools/string-utilities", implemented: true },
      { name: "Recent Pastes", slug: "recent-pastes", description: "View locally stored recent paste history.", href: "/tools/recent-pastes", implemented: true },
      { name: "MIME Types", slug: "mime-types", description: "Browse and search common MIME types.", href: "/tools/mime-types", implemented: true },
      { name: "SQL Formatter", slug: "sql-formatter", description: "Format SQL queries for readability.", href: "/tools/sql-formatter", implemented: true },
      { name: "JS Beautifier", slug: "js-beautifier", description: "Format and beautify JavaScript code.", href: "/tools/js-beautifier", implemented: true },
      { name: "I18N Standards", slug: "i18n-standards", description: "Internationalization standards, locale codes, and snippets.", href: "/tools/i18n-standards", implemented: true },
      { name: "Number Base Converter", slug: "number-base", description: "Convert numbers between binary, octal, decimal, and hexadecimal.", href: "/tools/number-base", implemented: true },
      { name: "Roman Numerals", slug: "roman-numerals", description: "Convert between Roman numerals and decimal numbers.", href: "/tools/roman-numerals", implemented: true },
      { name: "ASCII Table", slug: "ascii-table", description: "Browse the full ASCII character table with decimal, hex, and binary values.", href: "/tools/ascii-table", implemented: true },
      { name: "Semver Checker", slug: "semver-checker", description: "Parse and compare semantic version strings.", href: "/tools/semver-checker", implemented: true },
      { name: "Unit Converter", slug: "unit-converter", description: "Convert between units of length, weight, temperature, speed, and area.", href: "/tools/unit-converter", implemented: true },
      { name: "Age Calculator", slug: "age-calculator", description: "Calculate exact age and time since or until any date.", href: "/tools/age-calculator", implemented: true },
      { name: "Git Ignore Generator", slug: "gitignore-generator", description: "Generate .gitignore files for any language or framework.", href: "/tools/gitignore-generator", implemented: true },
      { name: "Cron Builder", slug: "cron-builder", description: "Build cron expressions visually with a human-readable description.", href: "/tools/cron-builder", implemented: true },
      { name: "Status Badges/Widgets", slug: "status-badges", description: "Generate embeddable status badges and widgets.", href: "/tools/status-badges", implemented: true },
    ],
  },
  {
    name: "DevOps",
    slug: "devops",
    description: "Validate and generate deployment configuration files.",
    tools: [
      { name: "Docker Compose Validator", slug: "docker-compose-validator", description: "Validate Docker Compose files and inspect services.", href: "/tools/docker-compose-validator", implemented: true },
      { name: "Nginx Config Checker", slug: "nginx-config-checker", description: "Validate and inspect Nginx configuration blocks.", href: "/tools/nginx-config-checker", implemented: true },
      { name: "Systemd Unit Generator", slug: "systemd-unit-generator", description: "Generate systemd service unit files.", href: "/tools/systemd-unit-generator", implemented: true },
      { name: "Environment Variables Manager", slug: "env-manager", description: "Manage and format environment variables.", href: "/tools/env-manager", implemented: true },
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
  "yaml-diff",
  "html-formatter",
  "jwt",
  "toml",
  "openapi",
  "nginx-config-checker",
  "docker-compose-validator",
  "file-encoding",
  "ssl",
  "security-headers",
  "spf-checker",
  "webhook-viewer",
]);

const convertTools = new Set([
  "encode",
  "csv-to-json",
  "number-base",
  "roman-numerals",
  "case-converter",
  "text-case",
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
  "cron-builder",
  "quartz-cron",
  "gitignore-generator",
  "systemd-unit-generator",
  "css-color",
  "status-badges",
  "env-manager",
]);

const networkTools = new Set([
  "http-headers",
  "dns-lookup",
  "dns-propagation",
  "whois-lookup",
  "ssl",
  "redirect-checker",
  "ip-lookup",
  "og-preview",
  "curl-builder",
  "rest-client",
  "graphql-client",
  "api-collections",
  "webhook-inbox",
  "heartbeat",
  "request-history",
]);

const textTools = new Set([
  "text-diff",
  "code-diff",
  "word-counter",
  "line-sorter",
  "markdown-preview",
  "regex",
  "string-utilities",
  "sql-formatter",
  "js-beautifier",
  "duplicate-line-remover",
  "timestamp",
  "date-diff",
  "duration-calculator",
  "age-calculator",
  "timezone-converter",
  "cron-parser",
  "semver-checker",
  "mime-types",
  "i18n-standards",
  "unit-converter",
  "ascii-table",
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
  "timestamp",
  "scripting-runner",
  "web-runner",
  "dns-lookup",
  "ssl",
  "markdown-preview",
  "text-diff",
  "cron-parser",
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
  "duplicate-line-remover",
  "case-converter",
  "timezone-converter",
  "duration-calculator",
  "yaml-diff",
  "code-diff",
  "recent-pastes",
  "docker-compose-validator",
  "nginx-config-checker",
  "systemd-unit-generator",
  "env-manager",
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
  "heartbeat",
  "multifile-runner",
  "notebook",
  "challenges",
]);

const iconBySlug: Record<string, LucideIcon> = {
  json: Braces,
  xml: FileCode2,
  "yaml-diff": Diff,
  toml: FileText,
  openapi: FileCode2,
  "http-headers": Globe,
  "redirect-checker": ArrowLeftRight,
  ssl: Lock,
  "dns-lookup": Wifi,
  "dns-propagation": Network,
  "whois-lookup": Globe,
  "security-headers": ShieldCheck,
  "ip-lookup": Globe,
  "spf-checker": Shield,
  "og-preview": Link2,
  "curl-builder": Terminal,
  "rest-client": Send,
  "graphql-client": Workflow,
  "api-collections": FolderOpen,
  "request-history": Clock,
  "webhook-inbox": Server,
  "webhook-viewer": SearchCheck,
  heartbeat: Zap,
  hash: Hash,
  jwt: Key,
  generators: Sparkles,
  "one-time-secret": Lock,
  "encrypted-file-paste": ShieldCheck,
  "zk-paste": Lock,
  "cron-builder": Clock,
  "quartz-cron": Clock,
  "gitignore-generator": FileCode2,
  "systemd-unit-generator": Server,
  "env-manager": FileCode2,
  "status-badges": Layers,
  "css-color": Palette,
  "text-diff": GitCompare,
  "code-diff": Diff,
  "word-counter": Type,
  "line-sorter": AlignLeft,
  "markdown-preview": FileText,
  regex: SearchCheck,
  "string-utilities": Type,
  "sql-formatter": Database,
  "js-beautifier": Code2,
  "duplicate-line-remover": AlignLeft,
  timestamp: Clock,
  "date-diff": Calendar,
  "duration-calculator": Timer,
  "age-calculator": Calendar,
  "timezone-converter": Clock,
  "cron-parser": Clock,
  "semver-checker": SearchCheck,
  "mime-types": FileText,
  "i18n-standards": Globe,
  "unit-converter": ArrowLeftRight,
  "ascii-table": Type,
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
  "number-base": ArrowLeftRight,
  "roman-numerals": ArrowLeftRight,
  "case-converter": Type,
  "text-case": Type,
  "file-encoding": FileText,
  "recent-pastes": Clock,
};

const explicitTags: Record<string, string[]> = {
  json: ["json", "format", "prettify", "validate", "diff", "convert", "yaml", "csv", "typescript", "jsonpath", "tree"],
  xml: ["xml", "format", "validate", "xpath", "xslt", "xsd", "convert", "escape", "json", "transform"],
  encode: ["encode", "decode", "base64", "url", "html", "hex", "binary", "morse", "unicode", "escape", "unescape", "sql", "js"],
  hash: ["hash", "md5", "sha", "sha256", "hmac", "bcrypt", "blake2", "totp", "crypto", "checksum", "verify", "otp"],
  generators: ["password", "secure", "random", "entropy", "uuid", "ulid", "nanoid", "qr", "slug", "lorem"],
  jwt: ["jwt", "token", "json web token", "claims", "bearer", "auth", "decode", "build", "verify", "payload", "header"],
  "dns-lookup": ["dns", "domain", "nameserver", "mx", "txt", "a record", "cname", "nslookup", "dig"],
  regex: ["regex", "regexp", "pattern", "match", "test", "regular expression", "search", "replace", "escape"],
  openapi: ["openapi", "swagger", "redoc", "api docs", "schema", "validate", "viewer"],
  toml: ["toml", "format", "validate", "convert", "configuration"],
  timestamp: ["timestamp", "unix", "epoch", "date", "time", "convert", "utc"],
  ssl: ["ssl", "tls", "certificate", "https", "expiry", "cert", "security", "chain"],
  "css-color": ["css", "color", "gradient", "contrast", "box shadow", "clamp", "formatter"],
  "webhook-inbox": ["webhook", "http", "request", "capture", "inspect", "endpoint", "listener"],
  "cron-parser": ["cron", "schedule", "interval", "job", "task", "timing", "expression"],
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
  if (slug.includes("runner") || ["code-share", "testcase-runner", "js-beautifier", "html-formatter", "sql-formatter", "nginx-config-checker", "docker-compose-validator", "systemd-unit-generator"].includes(slug)) return ["code"];
  if (slug === "json" || slug.includes("json") || ["jwt", "openapi", "webhook-viewer"].includes(slug)) return ["json", "text"];
  if (slug === "hash") return ["text", "file"];
  if (["http-headers", "redirect-checker", "ssl", "dns-lookup", "dns-propagation", "whois-lookup", "security-headers", "ip-lookup", "spf-checker", "og-preview", "webhook-inbox", "heartbeat"].includes(slug)) return ["url"];
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
  if (slug.includes("validator") || ["jwt", "nginx-config-checker", "docker-compose-validator", "security-headers", "spf-checker"].includes(slug)) return ["validated"];
  if (slug.includes("formatter") || ["js-beautifier", "line-sorter", "duplicate-line-remover"].includes(slug)) return ["formatted"];
  if (intentGroup === "convert" || slug.includes("-to-") || slug.includes("converter") || ["number-base", "roman-numerals", "case-converter", "text-case"].includes(slug)) return ["converted"];
  if (intentGroup === "generate" || intentGroup === "security" && ["jwt", "one-time-secret", "encrypted-file-paste", "zk-paste"].includes(slug)) return ["generated"];
  return ["analyzed"];
}

function complexityForTool(tool: ToolSeed): ToolComplexity {
  if (
    tool.slug.includes("runner") ||
    ["json", "xml", "openapi", "webhook-inbox", "webhook-viewer", "heartbeat", "rest-client", "graphql-client", "api-collections", "multifile-runner", "notebook", "challenges", "jwt", "docker-compose-validator", "nginx-config-checker", "systemd-unit-generator", "testcase-runner", "code-share"].includes(tool.slug)
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
