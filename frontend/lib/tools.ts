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
      { name: "Text Case Converter", slug: "text-case", description: "Convert text between camelCase, snake_case, PascalCase, kebab-case, SCREAMING_SNAKE, and more.", href: "/tools/text-case", implemented: true },
      { name: "Duplicate Line Remover", slug: "duplicate-line-remover", description: "Remove duplicate lines with trim, sort, and case options.", href: "/tools/duplicate-line-remover", implemented: true },
      { name: "Case Converter", slug: "case-converter", description: "Convert text between camelCase, PascalCase, snake_case, kebab-case, and more.", href: "/tools/case-converter", implemented: true },
      { name: "Regex Replace", slug: "regex-replace", description: "Find and replace text with JavaScript regular expressions.", href: "/tools/regex-replace", implemented: true },
      { name: "Regex Escape", slug: "regex-escape", description: "Escape raw text for regex, Python, JavaScript, and SQL LIKE.", href: "/tools/regex-escape", implemented: true },
      { name: "Line Sorter", slug: "line-sorter", description: "Sort lines alphabetically, numerically, or by length. Remove duplicates.", href: "/tools/line-sorter", implemented: true },
      { name: "JSON Diff", slug: "json-diff", description: "Compare two JSON objects and highlight differences.", href: "/tools/json-diff", implemented: true },
      { name: "JSON to TypeScript", slug: "json-to-typescript", description: "Generate TypeScript interfaces from a JSON object.", href: "/tools/json-to-typescript", implemented: true },
      { name: "JSONPath Tester", slug: "jsonpath-tester", description: "Test JSONPath expressions and inspect matched values.", href: "/tools/jsonpath-tester", implemented: true },
      { name: "JSON Tree Viewer", slug: "json-tree-viewer", description: "Visualize JSON as an interactive collapsible tree.", href: "/tools/json-tree-viewer", implemented: true },
      { name: "HEX RGB HSL Converter", slug: "hex-rgb-hsl-converter", description: "Convert colors between HEX, RGB, HSL, HSV, and Tailwind.", href: "/tools/hex-rgb-hsl-converter", implemented: true },
      { name: "Contrast Checker", slug: "contrast-checker", description: "Check WCAG contrast ratios for foreground and background colors.", href: "/tools/contrast-checker", implemented: true },
      { name: "CSS Clamp Calculator", slug: "css-clamp-calculator", description: "Generate responsive CSS clamp functions from viewport limits.", href: "/tools/css-clamp-calculator", implemented: true },
      { name: "YAML Diff", slug: "yaml-diff", description: "Compare YAML documents with line and key-level diffs.", href: "/tools/yaml-diff", implemented: true },
      { name: "Code Diff", slug: "code-diff", description: "Compare code snippets with language-aware diff metrics.", href: "/tools/code-diff", implemented: true },
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
      { name: "ULID Generator", slug: "ulid-generator", description: "Generate lexicographically sortable unique identifiers.", href: "/tools/ulid-generator", implemented: true },
      { name: "NanoID Generator", slug: "nanoid-generator", description: "Generate compact unique IDs with custom alphabets.", href: "/tools/nanoid-generator", implemented: true },
      { name: "Random Token Generator", slug: "random-token-generator", description: "Generate secure random tokens in multiple formats.", href: "/tools/random-token-generator", implemented: true },
      { name: "Passphrase Generator", slug: "passphrase-generator", description: "Generate memorable random word passphrases.", href: "/tools/passphrase-generator", implemented: true },
      { name: "HMAC Generator", slug: "hmac-generator", description: "Generate HMAC signatures using SHA variants.", href: "/tools/hmac-generator", implemented: true },
      { name: "Bcrypt Generator", slug: "bcrypt-generator", description: "Hash passwords using bcrypt and verify hashes.", href: "/tools/bcrypt-generator", implemented: true },
      { name: "JWT Builder", slug: "jwt-builder", description: "Build and sign JWT tokens with custom headers and payload.", href: "/tools/jwt-builder", implemented: true },
      { name: "BLAKE2 Generator", slug: "blake2-generator", description: "Generate BLAKE2b and BLAKE2s hashes.", href: "/tools/blake2-generator", implemented: true },
      { name: "Hash Verifier", slug: "hash-verifier", description: "Verify file and text hashes against expected values.", href: "/tools/hash-verifier", implemented: true },
      { name: "JWT Verifier", slug: "jwt-verifier", description: "Verify HMAC JWT signatures and claims.", href: "/tools/jwt-verifier", implemented: true },
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
      { name: "Hex Encoder", slug: "hex-encoder", description: "Convert between text and hexadecimal.", href: "/tools/hex-encoder", implemented: true },
      { name: "Binary Converter", slug: "binary-converter", description: "Convert between text and binary.", href: "/tools/binary-converter", implemented: true },
      { name: "CSV to JSON", slug: "csv-to-json", description: "Convert CSV data into structured JSON.", href: "/tools/csv-to-json", implemented: true },
      { name: "JSON to CSV", slug: "json-to-csv", description: "Convert JSON into CSV rows.", href: "/tools/json-to-csv", implemented: true },
      { name: "File Encoding", slug: "file-encoding", description: "Convert text files between encodings.", href: "/tools/file-encoding", implemented: true },
      { name: "Unicode Escape", slug: "unicode-escape", description: "Escape and unescape Unicode characters in multiple formats.", href: "/tools/unicode-escape", implemented: true },
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
      { name: "TOML Formatter", slug: "toml-formatter", description: "Format and prettify TOML files.", href: "/tools/toml-formatter", implemented: true },
      { name: "TOML Validator", slug: "toml-validator", description: "Validate TOML syntax and inspect structure.", href: "/tools/toml-validator", implemented: true },
      { name: "TOML to JSON", slug: "toml-to-json", description: "Convert between TOML and JSON.", href: "/tools/toml-to-json", implemented: true },
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
      { name: "Security Headers", slug: "security-headers", description: "Check HTTP security headers for any URL.", href: "/tools/security-headers", implemented: true },
      { name: "IP Lookup", slug: "ip-lookup", description: "Look up geolocation and ASN info for any IP address.", href: "/tools/ip-lookup", implemented: true },
      { name: "DNS Propagation", slug: "dns-propagation", description: "Check DNS propagation across multiple global nameservers.", href: "/tools/dns-propagation", implemented: true },
      { name: "SPF Checker", slug: "spf-checker", description: "Validate SPF, DKIM, and DMARC DNS records for a domain.", href: "/tools/spf-checker", implemented: true },
      { name: "SSL Chain Viewer", slug: "ssl-chain", description: "View the full SSL certificate chain for any domain.", href: "/tools/ssl-chain", implemented: true },
      { name: "Open Graph Preview", slug: "og-preview", description: "Preview how a URL looks when shared on social media.", href: "/tools/og-preview", implemented: true },
      { name: "cURL Builder", slug: "curl-builder", description: "Build cURL commands visually or convert cURL to fetch.", href: "/tools/curl-builder", implemented: true },
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
      { name: "URL Query Builder", slug: "url-query-builder", description: "Build and parse URL query strings.", href: "/tools/url-query-builder", implemented: true },
      { name: "Recent Pastes", slug: "recent-pastes", description: "View locally stored recent paste history.", href: "/tools/recent-pastes", implemented: true },
      { name: "HTML Entities", slug: "html-entities", description: "Browse and search HTML character entities.", href: "/tools/html-entities", implemented: true },
      { name: "MIME Types", slug: "mime-types", description: "Browse and search common MIME types.", href: "/tools/mime-types", implemented: true },
      { name: "SQL Formatter", slug: "sql-formatter", description: "Format SQL queries for readability.", href: "/tools/sql-formatter", implemented: true },
      { name: "JS Beautifier", slug: "js-beautifier", description: "Format and beautify JavaScript code.", href: "/tools/js-beautifier", implemented: true },
      { name: "I18N Standards", slug: "i18n-standards", description: "Internationalization standards, locale codes, and snippets.", href: "/tools/i18n-standards", implemented: true },
      { name: "Number Base Converter", slug: "number-base", description: "Convert numbers between binary, octal, decimal, and hexadecimal.", href: "/tools/number-base", implemented: true },
      { name: "Morse Code", slug: "morse-code", description: "Convert text to Morse code and back.", href: "/tools/morse-code", implemented: true },
      { name: "Roman Numerals", slug: "roman-numerals", description: "Convert between Roman numerals and decimal numbers.", href: "/tools/roman-numerals", implemented: true },
      { name: "ASCII Table", slug: "ascii-table", description: "Browse the full ASCII character table with decimal, hex, and binary values.", href: "/tools/ascii-table", implemented: true },
      { name: "Semver Checker", slug: "semver-checker", description: "Parse and compare semantic version strings.", href: "/tools/semver-checker", implemented: true },
      { name: "Color Picker", slug: "color-picker", description: "Pick colors and convert between HEX, RGB, HSL, and CMYK.", href: "/tools/color-picker", implemented: true },
      { name: "CSS Gradient", slug: "css-gradient", description: "Generate CSS linear and radial gradients visually.", href: "/tools/css-gradient", implemented: true },
      { name: "CSS Box Shadow", slug: "css-box-shadow", description: "Build CSS box shadows visually with a live preview.", href: "/tools/css-box-shadow", implemented: true },
      { name: "Unit Converter", slug: "unit-converter", description: "Convert between units of length, weight, temperature, speed, and area.", href: "/tools/unit-converter", implemented: true },
      { name: "Age Calculator", slug: "age-calculator", description: "Calculate exact age and time since or until any date.", href: "/tools/age-calculator", implemented: true },
      { name: "Git Ignore Generator", slug: "gitignore-generator", description: "Generate .gitignore files for any language or framework.", href: "/tools/gitignore-generator", implemented: true },
      { name: "Cron Builder", slug: "cron-builder", description: "Build cron expressions visually with a human-readable description.", href: "/tools/cron-builder", implemented: true },
      { name: "TOTP Generator", slug: "totp-generator", description: "Generate TOTP/2FA codes from a secret key.", href: "/tools/totp-generator", implemented: true },
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
