import { createElement } from "react";
import type { ReactNode } from "react";

export interface ToolError {
  title: string;
  detail: string;
  suggestion?: string | null;
  fixApplied?: string;
}

export function normalizeUrl(input: string): {
  url: string;
  wasFixed: boolean;
  fixDescription: string | null;
} {
  const original = input;
  let url = input.trim();
  let wasFixed = false;
  const fixes: string[] = [];

  if (!url) return { url: "", wasFixed: false, fixDescription: null };

  if (url !== original) {
    wasFixed = true;
    fixes.push("removed extra whitespace");
  }

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
    wasFixed = true;
    fixes.push("added https://");
  }

  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    const normalized = parsed.toString();
    if (normalized !== url) {
      url = normalized;
    }
  } catch {
    // Invalid URL is handled by validation at the call site.
  }

  return {
    url,
    wasFixed,
    fixDescription: fixes.length > 0 ? fixes.join(", ") : null,
  };
}

export function normalizeDomain(input: string): {
  domain: string;
  wasFixed: boolean;
  fixDescription: string | null;
} {
  let domain = input.trim().toLowerCase();
  let wasFixed = false;
  const fixes: string[] = [];

  if (!domain) return { domain: "", wasFixed: false, fixDescription: null };

  if (domain !== input) {
    wasFixed = true;
    fixes.push("removed extra whitespace");
  }

  if (/^https?:\/\//i.test(domain)) {
    domain = domain.replace(/^https?:\/\//i, "");
    wasFixed = true;
    fixes.push("removed protocol prefix");
  }

  if (domain.endsWith("/")) {
    domain = domain.slice(0, -1);
    wasFixed = true;
    fixes.push("removed trailing slash");
  }

  if (domain.includes("/")) {
    domain = domain.split("/")[0];
    wasFixed = true;
    fixes.push("extracted hostname only");
  }

  if (/:\d+$/.test(domain)) {
    domain = domain.replace(/:\d+$/, "");
    wasFixed = true;
    fixes.push("removed port number");
  }

  if (domain.startsWith("www.")) {
    domain = domain.slice(4);
    wasFixed = true;
    fixes.push("removed www prefix");
  }

  return {
    domain,
    wasFixed,
    fixDescription: fixes.length > 0 ? fixes.join(", ") : null,
  };
}

export const ERROR_MESSAGES: Record<string, ToolError> = {
  network_error: {
    title: "Network request failed",
    detail: "Could not reach the server. Check your internet connection and try again.",
    suggestion: "If this keeps happening, the target server may be blocking requests.",
  },
  timeout: {
    title: "Request timed out",
    detail: "The server took too long to respond (>10 seconds).",
    suggestion: "The server may be slow or unreachable. Try again in a moment.",
  },
  invalid_url: {
    title: "Invalid URL",
    detail: "The URL you entered is not valid.",
    suggestion: "Make sure it starts with https:// or http:// and is a real domain.",
  },
  invalid_domain: {
    title: "Invalid domain name",
    detail: "The domain you entered does not appear to be valid.",
    suggestion: "Enter just the domain name, e.g. google.com, with no https:// prefix.",
  },
  ssl_error: {
    title: "SSL connection failed",
    detail: "Could not establish a secure connection to this domain.",
    suggestion: "The domain may not have SSL configured, or may be unreachable.",
  },
  dns_error: {
    title: "DNS lookup failed",
    detail: "No DNS records found for this domain.",
    suggestion: "Check the domain spelling. The domain may not exist or have no public records.",
  },
  whois_no_match: {
    title: "No WHOIS data found",
    detail: "The WHOIS server returned no data for this domain.",
    suggestion: "This domain may not be registered, or the TLD may not support WHOIS lookups.",
  },
  ssrf_blocked: {
    title: "Request blocked",
    detail: "Requests to private or local IP addresses are not allowed.",
    suggestion: "Only public internet domains and URLs are supported.",
  },
  rate_limited: {
    title: "Too many requests",
    detail: "You have made too many requests in a short period.",
    suggestion: "Wait a moment before trying again.",
  },
  invalid_json: {
    title: "Invalid JSON",
    detail: "The input is not valid JSON.",
    suggestion: "Check for missing commas, unclosed brackets, or unquoted keys.",
  },
  empty_input: {
    title: "No input provided",
    detail: "Please enter something to process.",
    suggestion: null,
  },
  invalid_jwt: {
    title: "Invalid JWT token",
    detail: "The token does not appear to be a valid JWT.",
    suggestion: "A JWT has three parts separated by dots: header.payload.signature",
  },
  jwt_expired: {
    title: "Token is expired",
    detail: "The JWT exp claim is in the past.",
    suggestion: "This token is no longer valid. A new token needs to be issued.",
  },
  invalid_xml: {
    title: "Invalid XML",
    detail: "The input is not valid XML.",
    suggestion: "Check for unclosed tags, missing attributes, or invalid characters.",
  },
  invalid_yaml: {
    title: "Invalid YAML",
    detail: "The input is not valid YAML.",
    suggestion: "Check for incorrect indentation or invalid syntax.",
  },
  invalid_csv: {
    title: "Invalid CSV",
    detail: "Could not parse the CSV input.",
    suggestion: "Make sure each row has the same number of columns as the header.",
  },
  invalid_cron: {
    title: "Invalid cron expression",
    detail: "The cron expression you entered is not valid.",
    suggestion: "A standard cron expression has 5 fields: minute hour day month weekday.",
  },
  invalid_regex: {
    title: "Invalid regular expression",
    detail: "The pattern you entered is not a valid regex.",
    suggestion: "Check for unescaped special characters or unclosed groups.",
  },
  invalid_date: {
    title: "Invalid date or timestamp",
    detail: "Could not parse the date or timestamp you entered.",
    suggestion: "Try a Unix timestamp like 1716249600 or an ISO date like 2024-01-15T12:00:00Z.",
  },
  qr_too_long: {
    title: "Input too long for QR code",
    detail: "The text is too long to encode as a QR code.",
    suggestion: "Keep input under 2,953 characters for maximum compatibility.",
  },
  java_regex_error: {
    title: "Java regex error",
    detail: "The Java regex engine returned an error.",
    suggestion: "Java regex syntax differs slightly from JavaScript. Check for unsupported syntax.",
  },
  server_error: {
    title: "Server error",
    detail: "The server returned an unexpected error.",
    suggestion: "This is likely a temporary issue. Try again in a moment.",
  },
  unknown_error: {
    title: "Something went wrong",
    detail: "An unexpected error occurred.",
    suggestion: "Try refreshing the page and trying again.",
  },
};

export function getErrorMessage(errorKeyOrMessage: string): ToolError {
  if (ERROR_MESSAGES[errorKeyOrMessage]) return ERROR_MESSAGES[errorKeyOrMessage];

  const msg = errorKeyOrMessage.toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("504")) return ERROR_MESSAGES.timeout;
  if (msg.includes("network") || msg.includes("fetch")) return ERROR_MESSAGES.network_error;
  if (msg.includes("ssl") || msg.includes("certificate")) return ERROR_MESSAGES.ssl_error;
  if (msg.includes("rate limit") || msg.includes("429")) return ERROR_MESSAGES.rate_limited;
  if (msg.includes("private") || msg.includes("ssrf") || msg.includes("blocked") || msg.includes("403")) return ERROR_MESSAGES.ssrf_blocked;
  if (msg.includes("no match") || msg.includes("not found")) return ERROR_MESSAGES.whois_no_match;
  if (msg.includes("dns") || msg.includes("resolve") || msg.includes("name or service")) return ERROR_MESSAGES.dns_error;
  if (msg.includes("invalid url") || msg.includes("400")) return ERROR_MESSAGES.invalid_url;
  if (msg.includes("json")) return ERROR_MESSAGES.invalid_json;
  if (msg.includes("xml")) return ERROR_MESSAGES.invalid_xml;
  if (msg.includes("yaml")) return ERROR_MESSAGES.invalid_yaml;
  if (msg.includes("500") || msg.includes("server error")) return ERROR_MESSAGES.server_error;

  return {
    title: "Error",
    detail: errorKeyOrMessage,
    suggestion: "Try checking your input and trying again.",
  };
}

export function errorFromUnknown(error: unknown, fallback = "unknown_error"): ToolError {
  if (error instanceof DOMException && error.name === "AbortError") return getErrorMessage("timeout");
  if (error instanceof Error) return getErrorMessage(error.message);
  return getErrorMessage(fallback);
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isIpAddress(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(":");
}

export function isValidDomain(value: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-.]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(value) && !isIpAddress(value);
}

export function explainJsonError(input: string, error: unknown): ToolError & { line?: number; column?: number } {
  const msg = error instanceof Error ? error.message : String(error);
  const positionMatch = msg.match(/position (\d+)/i);
  let line: number | undefined;
  let column: number | undefined;

  if (positionMatch) {
    const before = input.slice(0, Number(positionMatch[1]));
    const lines = before.split("\n");
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  } else {
    const lineMatch = msg.match(/line (\d+)/i);
    const colMatch = msg.match(/column (\d+)/i);
    if (lineMatch) line = Number(lineMatch[1]);
    if (colMatch) column = Number(colMatch[1]);
  }

  let suggestion = ERROR_MESSAGES.invalid_json.suggestion ?? undefined;
  if (msg.includes("Unexpected token")) {
    const token = msg.match(/Unexpected token '?(.+?)'?[\s,]/)?.[1];
    if (token === ",") suggestion = "You may have a trailing comma. JSON does not allow trailing commas.";
    else if (token === "'") suggestion = "Strings in JSON must use double quotes, not single quotes.";
    else if (token === "undefined" || token === "NaN" || token === "Infinity") suggestion = `${token} is not valid JSON. Use null for missing values.`;
    else if (token) suggestion = `Unexpected character: ${token}. Check for typos near this location.`;
  } else if (msg.includes("Unexpected end")) {
    suggestion = "The JSON appears incomplete. Check for unclosed brackets or braces.";
  } else if (msg.includes("Unexpected string")) {
    suggestion = "You may be missing a comma between two items.";
  }

  return {
    title: "Invalid JSON",
    detail: line || column ? `Syntax error at ${line ? `line ${line}` : ""}${line && column ? ", " : ""}${column ? `column ${column}` : ""}.` : "The JSON syntax is invalid.",
    suggestion,
    line,
    column,
  };
}

export function jsonTypeInfo(value: unknown): string {
  if (Array.isArray(value)) return `Array with ${value.length} items`;
  if (value && typeof value === "object") return `Object with ${Object.keys(value as Record<string, unknown>).length} keys`;
  if (value === null) return "Null value";
  return `${typeof value} value`;
}

export function explainXmlError(errorText: string): ToolError {
  const lineMatch = errorText.match(/line[:\s]+(\d+)/i);
  const colMatch = errorText.match(/col(?:umn)?[:\s]+(\d+)/i);
  const lower = errorText.toLowerCase();
  let suggestion = "Use an XML linter for detailed error location.";
  if (lower.includes("not well-formed")) suggestion = "Check for unclosed tags, missing quotes around attributes, or invalid characters.";
  else if (lower.includes("mismatched")) suggestion = "An opening tag does not have a matching closing tag.";
  else if (lower.includes("namespace")) suggestion = "Check namespace declarations, including xmlns attributes.";

  return {
    title: "Invalid XML",
    detail: lineMatch ? `Syntax error at line ${lineMatch[1]}${colMatch ? `, column ${colMatch[1]}` : ""}.` : "The XML is not well-formed.",
    suggestion,
  };
}

export function explainYamlError(error: unknown): ToolError {
  const yamlErr = error as { message?: string; mark?: { line: number; column: number } };
  const message = yamlErr.message || "Invalid YAML syntax.";
  const lower = message.toLowerCase();
  let suggestion = "YAML is whitespace-sensitive. Check your indentation carefully.";
  if (lower.includes("bad indentation") || lower.includes("indent")) suggestion = "YAML is indentation-sensitive. Use consistent spaces, not tabs.";
  else if (lower.includes("duplicate key")) suggestion = "You have two keys with the same name in the same object.";
  else if (lower.includes("unexpected")) suggestion = "Check for special characters that need quoting, like colons in values.";

  return {
    title: "Invalid YAML",
    detail: yamlErr.mark ? `Syntax error at line ${yamlErr.mark.line + 1}, column ${yamlErr.mark.column + 1}.` : message,
    suggestion,
  };
}

export function regexSuggestion(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid escape")) return "In regex, backslashes need to be escaped. Use \\\\ for a literal backslash.";
  if (lower.includes("unterminated")) return "Check for unclosed character classes, groups, or delimiters.";
  if (lower.includes("nothing to repeat")) return "Quantifiers like *, +, and ? must follow a character or group.";
  return "Check regex syntax. A tool like regex101 can help explain the pattern.";
}

function bannerClass(kind: "error" | "warning" | "info" | "success") {
  const shared = "mt-2 rounded-xl border px-4 py-3 text-sm";
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/20 dark:text-yellow-400",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400",
  };
  return `${shared} ${classes[kind]}`;
}

export function InlineError({ error }: { error: ToolError }): ReactNode {
  return createElement(
    "div",
    { className: bannerClass("error") },
    createElement("p", { className: "font-medium" }, error.title),
    createElement("p", { className: "mt-0.5 text-xs text-red-600 dark:text-red-500" }, error.detail),
    error.suggestion
      ? createElement("p", { className: "mt-1 text-xs text-red-500/80 dark:text-red-500/60" }, `Tip: ${error.suggestion}`)
      : null
  );
}

export function AutoFixBanner({ fix, original, corrected }: { fix: string; original: string; corrected: string }): ReactNode {
  return createElement(
    "div",
    { className: `${bannerClass("success")} flex items-start gap-2 py-2.5` },
    createElement("span", { className: "mt-0.5 flex-shrink-0 text-sm" }, "Auto"),
    createElement(
      "div",
      null,
      createElement("p", { className: "text-xs font-medium" }, `Auto-corrected: ${fix}`),
      createElement("p", { className: "mt-0.5 font-mono text-xs text-emerald-600/80 dark:text-emerald-500/70" }, `"${original}" -> "${corrected}"`)
    )
  );
}

export function WarningBanner({ title, children }: { title?: string; children: ReactNode }): ReactNode {
  return createElement("div", { className: bannerClass("warning") }, title ? createElement("p", { className: "font-medium" }, title) : null, createElement("div", { className: title ? "mt-0.5 text-xs" : "text-sm" }, children));
}

export function InfoBanner({ title, children }: { title?: string; children: ReactNode }): ReactNode {
  return createElement("div", { className: bannerClass("info") }, title ? createElement("p", { className: "font-medium" }, title) : null, createElement("div", { className: title ? "mt-0.5 text-xs" : "text-sm" }, children));
}

export function SuccessBanner({ title, children }: { title?: string; children: ReactNode }): ReactNode {
  return createElement("div", { className: bannerClass("success") }, title ? createElement("p", { className: "font-medium" }, title) : null, createElement("div", { className: title ? "mt-0.5 text-xs" : "text-sm" }, children));
}

export function LoadingSkeleton(): ReactNode {
  return createElement(
    "div",
    { className: "space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" },
    createElement("div", { className: "h-4 w-3/4 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" }),
    createElement("div", { className: "h-4 w-1/2 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" }),
    createElement("div", { className: "h-4 w-5/6 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" })
  );
}
