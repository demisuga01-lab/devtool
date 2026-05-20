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
      { name: "Quartz Cron", slug: "quartz-cron", description: "Parse and explain Quartz cron expressions.", href: "/tools/quartz-cron", implemented: true },
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
      { name: "File Encoding", slug: "file-encoding", description: "Convert text files between encodings.", href: "/tools/file-encoding", implemented: true },
    ],
  },
  {
    name: "XML & Data",
    slug: "xml-data",
    description: "Format, validate, and convert XML, YAML, and structured data.",
    tools: [
      { name: "XML Formatter", slug: "xml-formatter", description: "Format and validate XML documents.", href: "/tools/xml-formatter", implemented: true },
      { name: "XML Validator", slug: "xml-validator", description: "Check if XML is well-formed.", href: "/tools/xml-validator", implemented: true },
      { name: "XML to JSON", slug: "xml-to-json", description: "Convert XML documents to JSON.", href: "/tools/xml-to-json", implemented: true },
      { name: "JSON to XML", slug: "json-to-xml", description: "Convert JSON objects to XML.", href: "/tools/json-to-xml", implemented: true },
      { name: "YAML to JSON", slug: "yaml-to-json", description: "Convert YAML to JSON format.", href: "/tools/yaml-to-json", implemented: true },
      { name: "JSON to YAML", slug: "json-to-yaml", description: "Convert JSON to YAML format.", href: "/tools/json-to-yaml", implemented: true },
      { name: "XPath Tester", slug: "xpath-tester", description: "Test XPath expressions against XML.", href: "/tools/xpath-tester", implemented: true },
      { name: "XSD Generator", slug: "xsd-generator", description: "Generate an XSD schema from a sample XML.", href: "/tools/xsd-generator", implemented: true },
      { name: "XSLT Transformer", slug: "xslt-transformer", description: "Transform XML using an XSLT stylesheet.", href: "/tools/xslt-transformer", implemented: true },
    ],
  },
  {
    name: "Escape",
    slug: "escape",
    description: "Escape and unescape strings for markup, code, and SQL.",
    tools: [
      { name: "HTML Escape", slug: "html-escape", description: "Escape or unescape HTML entities.", href: "/tools/html-escape", implemented: true },
      { name: "XML Escape", slug: "xml-escape", description: "Escape or unescape XML special characters.", href: "/tools/xml-escape", implemented: true },
      { name: "JS Escape", slug: "js-escape", description: "Escape or unescape JavaScript strings.", href: "/tools/js-escape", implemented: true },
      { name: "JSON Escape", slug: "json-escape", description: "Escape or unescape JSON string values.", href: "/tools/json-escape", implemented: true },
      { name: "SQL Escape", slug: "sql-escape", description: "Escape strings for safe SQL usage.", href: "/tools/sql-escape", implemented: true },
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
      { name: "Java Regex", slug: "java-regex", description: "Test regular expressions using Java's regex engine.", href: "/tools/java-regex", implemented: true },
    ],
  },
  {
    name: "Reference & Utils",
    slug: "reference",
    description: "Look up references and run common utility transformations.",
    tools: [
      { name: "String Utilities", slug: "string-utilities", description: "Common string transformations.", href: "/tools/string-utilities", implemented: true },
      { name: "QR Code Generator", slug: "qr-generator", description: "Generate QR codes for any text or URL.", href: "/tools/qr-generator", implemented: true },
      { name: "URL Parser", slug: "url-parser", description: "Parse and inspect URL components.", href: "/tools/url-parser", implemented: true },
      { name: "HTML Entities", slug: "html-entities", description: "Browse and search HTML character entities.", href: "/tools/html-entities", implemented: true },
      { name: "MIME Types", slug: "mime-types", description: "Browse and search common MIME types.", href: "/tools/mime-types", implemented: true },
      { name: "SQL Formatter", slug: "sql-formatter", description: "Format SQL queries for readability.", href: "/tools/sql-formatter", implemented: true },
      { name: "JS Beautifier", slug: "js-beautifier", description: "Format and beautify JavaScript code.", href: "/tools/js-beautifier", implemented: true },
      { name: "I18N Standards", slug: "i18n-standards", description: "Internationalization standards, locale codes, and snippets.", href: "/tools/i18n-standards", implemented: true },
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
        name: "Other Languages",
        slug: "other-runner",
        description: "Run Swift, Dart, Fortran, and D code.",
        href: "/tools/other-runner",
        implemented: true,
      },
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
