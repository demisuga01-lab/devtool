export type Tool = {
  name: string;
  slug: string;
  description: string;
  href: string;
  implemented: boolean;
};

export type ToolGroup = {
  name: string;
  slug: string;
  description: string;
  tools: Tool[];
};

export const toolGroups: ToolGroup[] = [
  {
    name: "Text & Format",
    slug: "text",
    description: "Format, validate, and convert structured text.",
    tools: [
      { name: "JSON Formatter", slug: "json-formatter", description: "Format, minify, and validate JSON.", href: "/tools/json-formatter", implemented: true },
      { name: "JSON Validator", slug: "json-validator", description: "Validate JSON and pinpoint syntax errors.", href: "/tools/json-validator", implemented: true },
      { name: "JWT Decoder", slug: "jwt-decoder", description: "Decode JWT header, payload, and signature locally.", href: "/tools/jwt-decoder", implemented: true },
      { name: "Base64 Tool", slug: "base64", description: "Encode and decode Base64 text.", href: "/tools/base64", implemented: true },
      { name: "URL Encoder", slug: "url-encoder", description: "Encode and decode URL components.", href: "/tools/url-encoder", implemented: true },
      { name: "HTML Formatter", slug: "html-formatter", description: "Format and tidy HTML markup.", href: "/tools/html-formatter", implemented: true },
      { name: "CSS Formatter", slug: "css-formatter", description: "Format and tidy CSS rules.", href: "/tools/css-formatter", implemented: true },
      { name: "Text Diff", slug: "text-diff", description: "Compare two pieces of text line by line.", href: "/tools/text-diff", implemented: true },
      { name: "Markdown Preview", slug: "markdown-preview", description: "Render Markdown to sanitized HTML.", href: "/tools/markdown-preview", implemented: true },
      { name: "Word Counter", slug: "word-counter", description: "Count characters, words, and reading time.", href: "/tools/word-counter", implemented: true },
      { name: "Slug Generator", slug: "slug-generator", description: "Generate URL-safe slugs from text.", href: "/tools/slug-generator", implemented: true },
      { name: "Lorem Ipsum", slug: "lorem-ipsum", description: "Generate placeholder Lorem Ipsum text.", href: "/tools/lorem-ipsum", implemented: true },
    ],
  },
  {
    name: "Crypto & Hash",
    slug: "crypto",
    description: "Hash, generate, and sign data in your browser.",
    tools: [
      { name: "Hash Generator", slug: "hash-generator", description: "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes.", href: "/tools/hash-generator", implemented: true },
      { name: "UUID Generator", slug: "uuid-generator", description: "Generate UUID v4 identifiers in bulk.", href: "/tools/uuid-generator", implemented: true },
      { name: "Password Generator", slug: "password-generator", description: "Generate strong passwords with custom rules.", href: "/tools/password-generator", implemented: true },
      { name: "HMAC Generator", slug: "hmac-generator", description: "Generate HMAC signatures using SHA variants.", href: "/tools/hmac-generator", implemented: true },
    ],
  },
  {
    name: "Date & Time",
    slug: "datetime",
    description: "Work with timestamps, cron, and date math.",
    tools: [
      { name: "Timestamp Converter", slug: "timestamp", description: "Convert between Unix timestamps and date strings.", href: "/tools/timestamp", implemented: true },
      { name: "Cron Parser", slug: "cron-parser", description: "Parse cron expressions and preview next runs.", href: "/tools/cron-parser", implemented: true },
      { name: "Date Diff", slug: "date-diff", description: "Calculate the difference between two dates.", href: "/tools/date-diff", implemented: true },
    ],
  },
  {
    name: "Encode & Convert",
    slug: "encode",
    description: "Convert between encodings and data formats.",
    tools: [
      { name: "Hex Encoder", slug: "hex-encoder", description: "Convert between text and hexadecimal.", href: "/tools/hex-encoder", implemented: true },
      { name: "Binary Converter", slug: "binary-converter", description: "Convert between text and binary.", href: "/tools/binary-converter", implemented: true },
      { name: "CSV to JSON", slug: "csv-to-json", description: "Convert CSV data into structured JSON.", href: "/tools/csv-to-json", implemented: true },
      { name: "JSON to CSV", slug: "json-to-csv", description: "Convert JSON into CSV rows.", href: "/tools/json-to-csv", implemented: true },
    ],
  },
  {
    name: "Web & Network",
    slug: "web",
    description: "Inspect headers, DNS, SSL, and HTTP responses.",
    tools: [
      { name: "HTTP Headers", slug: "http-headers", description: "Inspect response headers for any URL.", href: "/tools/http-headers", implemented: true },
      { name: "Redirect Checker", slug: "redirect-checker", description: "Trace the full redirect chain for a URL.", href: "/tools/redirect-checker", implemented: true },
      { name: "SSL Checker", slug: "ssl-checker", description: "Inspect a TLS certificate and its chain.", href: "/tools/ssl-checker", implemented: true },
      { name: "DNS Lookup", slug: "dns-lookup", description: "Query DNS records for a domain.", href: "/tools/dns-lookup", implemented: true },
      { name: "WHOIS Lookup", slug: "whois-lookup", description: "Look up WHOIS records for a domain.", href: "/tools/whois-lookup", implemented: true },
      { name: "Regex Tester", slug: "regex-tester", description: "Test JavaScript regular expressions live.", href: "/tools/regex-tester", implemented: true },
    ],
  },
];

export const allTools: Tool[] = toolGroups.flatMap((g) => g.tools);

export function getTool(slug: string): Tool | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function getGroupOfTool(slug: string): ToolGroup | undefined {
  return toolGroups.find((g) => g.tools.some((t) => t.slug === slug));
}
