"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Binary,
  BookOpen,
  Braces,
  Calendar,
  ChevronDown,
  Clock,
  Code,
  Code2,
  Database,
  Eye,
  FileText,
  Fingerprint,
  GitCompare,
  Github,
  Globe,
  Hash,
  Key,
  Layers,
  Link as LinkIcon,
  Lock,
  Menu,
  Palette,
  QrCode,
  Search,
  Shield,
  ShieldCheck,
  Terminal,
  Timer,
  Type,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { allTools, toolGroups } from "@/lib/tools";
import type { Tool } from "@/lib/tools";
import { authChangedEvent, clearAuth, isAuthenticated } from "@/lib/auth";

const GITHUB_URL = "https://github.com/demisuga01-lab/devtool";

const mainLinks = [
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Docs", href: "/docs" },
  { name: "Contact", href: "/contact" },
];

const pasteLinks = [
  { name: "New Paste", href: "/paste" },
  { name: "View a Paste", href: "/paste/view" },
  { name: "Recent Pastes", href: "/paste#recent" },
];

const compilerLinks = [
  { name: "Web Runner", href: "/tools/web-runner", description: "HTML, CSS, JavaScript & TypeScript" },
  { name: "Systems Runner", href: "/tools/systems-runner", description: "C, C++, Rust, Go" },
  { name: "Scripting Runner", href: "/tools/scripting-runner", description: "Python, Ruby, PHP, Perl, Bash, Lua" },
  { name: "JVM Runner", href: "/tools/jvm-runner", description: "Java, Kotlin, Scala, C#, Basic" },
  { name: "Data Runner", href: "/tools/data-runner", description: "SQLite, Julia" },
  { name: "Other Languages", href: "/tools/other-runner", description: "Swift, Dart, Fortran, D" },
];

const navClass =
  "inline-flex h-full items-center border-b-2 border-transparent px-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35";
const inactiveNavClass =
  "text-zinc-600 hover:border-emerald-300 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-white";
const activeNavClass =
  "border-emerald-600 text-zinc-950 dark:border-emerald-400 dark:text-zinc-50";
const menuLinkClass =
  "block rounded-lg px-2 py-1 text-[15px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const themeToggleClass =
  "[&>div>button]:rounded-lg [&>div>button]:border-0 [&>div>button]:bg-transparent [&>div>button]:p-2 [&>div>button]:text-zinc-500 [&>div>button]:transition-colors [&>div>button:hover]:bg-zinc-100 [&>div>button:hover]:text-zinc-700 dark:[&>div>button]:text-zinc-500 dark:[&>div>button:hover]:bg-zinc-800 dark:[&>div>button:hover]:text-zinc-300";

type NavTool = Tool & {
  icon: LucideIcon;
  navDescription: string;
};

type NavGroup = {
  name: string;
  icon: LucideIcon;
  tools: NavTool[];
};

const categoryIcons: Record<string, LucideIcon> = {
  "Text & Format": FileText,
  "More Formatters": FileText,
  "Crypto & Hash": Lock,
  "Encode & Convert": ArrowLeftRight,
  "Web & Network": Globe,
  "Date & Time": Clock,
  "XML & Data": Database,
  Escape: Braces,
  "Reference & Utils": BookOpen,
  "More Tools": Wrench,
};

const toolIcons: Record<string, LucideIcon> = {
  "json-formatter": Braces,
  "json-validator": Braces,
  "jwt-decoder": Key,
  base64: Binary,
  "url-encoder": LinkIcon,
  "html-formatter": Code,
  "css-formatter": Code2,
  "text-diff": GitCompare,
  "markdown-preview": FileText,
  "word-counter": Type,
  "slug-generator": Hash,
  "lorem-ipsum": FileText,
  "text-case": Type,
  "line-sorter": Layers,
  "json-diff": GitCompare,
  "json-to-typescript": Code2,
  "hash-generator": Hash,
  "uuid-generator": Fingerprint,
  "password-generator": Lock,
  "hmac-generator": Key,
  "bcrypt-generator": Lock,
  "jwt-builder": Key,
  timestamp: Clock,
  "cron-parser": Timer,
  "quartz-cron": Timer,
  "date-diff": Calendar,
  "hex-encoder": Binary,
  "binary-converter": Binary,
  "csv-to-json": Database,
  "json-to-csv": ArrowLeftRight,
  "file-encoding": FileText,
  "xml-formatter": Code2,
  "xml-validator": ShieldCheck,
  "xml-to-json": ArrowLeftRight,
  "json-to-xml": ArrowLeftRight,
  "yaml-to-json": ArrowLeftRight,
  "json-to-yaml": ArrowLeftRight,
  "xpath-tester": Search,
  "xsd-generator": Database,
  "xslt-transformer": ArrowLeftRight,
  "html-escape": Braces,
  "xml-escape": Braces,
  "js-escape": Code,
  "json-escape": Braces,
  "sql-escape": Database,
  "http-headers": Shield,
  "redirect-checker": ArrowRight,
  "ssl-checker": ShieldCheck,
  "dns-lookup": Globe,
  "whois-lookup": Search,
  "regex-tester": Search,
  "java-regex": Search,
  "security-headers": ShieldCheck,
  "ip-lookup": Globe,
  "dns-propagation": Globe,
  "spf-checker": ShieldCheck,
  "ssl-chain": ShieldCheck,
  "og-preview": Eye,
  "curl-builder": Terminal,
  "string-utilities": Layers,
  "qr-generator": QrCode,
  "url-parser": LinkIcon,
  "html-entities": Braces,
  "mime-types": FileText,
  "sql-formatter": Database,
  "js-beautifier": Code2,
  "i18n-standards": Globe,
  "number-base": Binary,
  "morse-code": Terminal,
  "roman-numerals": Hash,
  "ascii-table": Binary,
  "semver-checker": GitCompare,
  "color-picker": Palette,
  "css-gradient": Palette,
  "css-box-shadow": Layers,
  "unit-converter": ArrowLeftRight,
  "age-calculator": Calendar,
  "gitignore-generator": FileText,
  "cron-builder": Timer,
  "totp-generator": Lock,
};

const toolDescriptions: Record<string, string> = {
  "json-formatter": "Prettify, minify and validate JSON",
  "json-validator": "Validate JSON with precise syntax reports",
  "jwt-decoder": "Decode and inspect JWT tokens",
  base64: "Encode and decode Base64 strings",
  "url-encoder": "Encode special characters for URLs",
  "html-formatter": "Format, inspect and minify HTML",
  "css-formatter": "Format CSS and inspect selectors",
  "text-diff": "Compare two texts line by line",
  "markdown-preview": "Render markdown with live preview",
  "word-counter": "Count words, chars and reading time",
  "slug-generator": "Convert text to URL-friendly slugs",
  "lorem-ipsum": "Generate clean placeholder copy quickly",
  "text-case": "Convert text across common cases",
  "line-sorter": "Sort, dedupe and organize lines",
  "json-diff": "Compare JSON structures and values",
  "json-to-typescript": "Generate TypeScript interfaces from JSON",
  "hash-generator": "Generate MD5, SHA256 and more",
  "uuid-generator": "Create version 1, 4 and 5 UUIDs",
  "password-generator": "Secure passwords with entropy scoring",
  "hmac-generator": "Sign messages with keyed hashes",
  "bcrypt-generator": "Hash and verify bcrypt passwords",
  "jwt-builder": "Build and preview signed JWTs",
  timestamp: "Convert timestamps across common formats",
  "cron-parser": "Parse expressions with next run times",
  "quartz-cron": "Explain Quartz cron schedule syntax",
  "date-diff": "Compare dates and add durations",
  "hex-encoder": "Convert text to hexadecimal bytes",
  "binary-converter": "Convert text and binary bytes",
  "csv-to-json": "Convert CSV rows into JSON",
  "json-to-csv": "Flatten JSON arrays into CSV",
  "file-encoding": "Detect encodings and line endings",
  "xml-formatter": "Format and validate XML documents",
  "xml-validator": "Check XML well-formedness quickly",
  "xml-to-json": "Convert XML documents to JSON",
  "json-to-xml": "Convert JSON objects into XML",
  "yaml-to-json": "Convert YAML into structured JSON",
  "json-to-yaml": "Convert JSON into readable YAML",
  "xpath-tester": "Evaluate XPath queries against XML",
  "xsd-generator": "Generate schemas from XML samples",
  "xslt-transformer": "Transform XML with XSLT stylesheets",
  "html-escape": "Escape and unescape HTML entities",
  "xml-escape": "Escape XML special characters safely",
  "js-escape": "Escape JavaScript string content",
  "json-escape": "Escape JSON string values safely",
  "sql-escape": "Escape SQL strings for reference",
  "http-headers": "Check security and response headers",
  "redirect-checker": "Trace redirects to final destination",
  "ssl-checker": "Inspect certificates and TLS config",
  "dns-lookup": "Query A, MX, TXT and more records",
  "whois-lookup": "Domain registration and owner info",
  "regex-tester": "Test patterns with match highlighting",
  "java-regex": "Test patterns with Java semantics",
  "security-headers": "Audit browser security header coverage",
  "ip-lookup": "Inspect IP geolocation and ASN",
  "dns-propagation": "Check DNS records across resolvers",
  "spf-checker": "Validate SPF and DMARC records",
  "ssl-chain": "Inspect certificate chain details",
  "og-preview": "Preview social media link cards",
  "curl-builder": "Build and export cURL commands",
  "string-utilities": "Transform strings across useful formats",
  "qr-generator": "Create downloadable QR codes",
  "url-parser": "Inspect URL parts and parameters",
  "html-entities": "Browse named HTML character entities",
  "mime-types": "Find MIME types by extension",
  "sql-formatter": "Format SQL queries for readability",
  "js-beautifier": "Beautify JavaScript source code",
  "i18n-standards": "Find locales, codes and snippets",
  "number-base": "Convert binary, octal, decimal, hex",
  "morse-code": "Convert text and Morse code",
  "roman-numerals": "Convert Roman and decimal numerals",
  "ascii-table": "Browse ASCII decimal and hex",
  "semver-checker": "Parse and compare semantic versions",
  "color-picker": "Pick and convert color formats",
  "css-gradient": "Build CSS gradients visually",
  "css-box-shadow": "Design layered CSS box shadows",
  "unit-converter": "Convert common engineering units",
  "age-calculator": "Calculate exact age from dates",
  "gitignore-generator": "Generate ignore files by stack",
  "cron-builder": "Build cron expressions visually",
  "totp-generator": "Generate TOTP codes from secrets",
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function toolsFor(slug: string): Tool[] {
  return toolGroups.find((group) => group.slug === slug)?.tools ?? [];
}

function navTool(tool: Tool): NavTool {
  return {
    ...tool,
    icon: toolIcons[tool.slug] ?? Wrench,
    navDescription: toolDescriptions[tool.slug] ?? tool.description,
  };
}

function navGroup(name: string, tools: Tool[]): NavGroup {
  return {
    name,
    icon: categoryIcons[name] ?? Wrench,
    tools: tools.map(navTool),
  };
}

const textTools = toolsFor("text");
const referenceTools = toolsFor("reference");

const navColumns: NavGroup[][] = [
  [
    navGroup("Text & Format", textTools.slice(0, 8)),
    navGroup("More Formatters", textTools.slice(8)),
  ],
  [
    navGroup("Crypto & Hash", toolsFor("crypto")),
    navGroup("Date & Time", toolsFor("datetime")),
  ],
  [
    navGroup("Encode & Convert", toolsFor("encode")),
    navGroup("XML & Data", toolsFor("xml-data")),
    navGroup("Escape", toolsFor("escape")),
  ],
  [
    navGroup("Web & Network", toolsFor("web")),
    navGroup("Reference & Utils", referenceTools.slice(0, 8)),
    navGroup("More Tools", referenceTools.slice(8)),
  ],
].map((column) => column.filter((group) => group.tools.length > 0));

const devToolCount = navColumns.flatMap((column) => column.flatMap((group) => group.tools)).length;

function filterNavColumns(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return navColumns;
  return navColumns
    .map((column) =>
      column
        .map((group) => ({
          ...group,
          tools: group.tools.filter((tool) => {
            const haystack = `${tool.name} ${tool.navDescription}`.toLowerCase();
            return haystack.includes(normalized);
          }),
        }))
        .filter((group) => group.tools.length > 0),
    )
    .filter((column) => column.length > 0);
}

function HeaderSearch({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tools..."
        className="h-10 w-full rounded-lg border border-neutral-300 bg-neutral-100 pl-9 pr-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-emerald-500/70 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
      />
    </label>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-emerald-100 px-0.5 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [compilersOpen, setCompilersOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusAuthed, setStatusAuthed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [openMobileToolCategory, setOpenMobileToolCategory] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState("");
  const toolsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasteCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compilersCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  const filteredColumns = useMemo(() => filterNavColumns(toolSearch), [toolSearch]);
  const filteredMobileGroups = useMemo(() => filteredColumns.flat(), [filteredColumns]);
  const hasToolResults = filteredColumns.some((column) => column.length > 0);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  useEffect(() => {
    return () => {
      if (toolsCloseTimer.current) clearTimeout(toolsCloseTimer.current);
      if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
      if (compilersCloseTimer.current) clearTimeout(compilersCloseTimer.current);
      if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    const syncAuth = () => setStatusAuthed(isAuthenticated());
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener(authChangedEvent, syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener(authChangedEvent, syncAuth);
    };
  }, []);

  useEffect(() => {
    setToolsOpen(false);
    setPasteOpen(false);
    setCompilersOpen(false);
    setStatusOpen(false);
    setMobile(false);
    setOpenMobileGroup(null);
    setOpenMobileToolCategory(null);
    setToolSearch("");
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (toolsMenuRef.current?.contains(target) || toolsTriggerRef.current?.contains(target)) return;
      setToolsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toolsOpen]);

  const openToolsMenu = () => {
    if (toolsCloseTimer.current) clearTimeout(toolsCloseTimer.current);
    setToolsOpen(true);
  };

  const closeToolsMenu = () => {
    if (toolsCloseTimer.current) clearTimeout(toolsCloseTimer.current);
    toolsCloseTimer.current = setTimeout(() => setToolsOpen(false), 180);
  };

  const openPasteMenu = () => {
    if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
    setPasteOpen(true);
  };

  const closePasteMenu = () => {
    if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
    pasteCloseTimer.current = setTimeout(() => setPasteOpen(false), 180);
  };

  const openCompilersMenu = () => {
    if (compilersCloseTimer.current) clearTimeout(compilersCloseTimer.current);
    setCompilersOpen(true);
  };

  const closeCompilersMenu = () => {
    if (compilersCloseTimer.current) clearTimeout(compilersCloseTimer.current);
    compilersCloseTimer.current = setTimeout(() => setCompilersOpen(false), 180);
  };

  const openStatusMenu = () => {
    if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    setStatusOpen(true);
  };

  const closeStatusMenu = () => {
    if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    statusCloseTimer.current = setTimeout(() => setStatusOpen(false), 180);
  };

  const logoutStatus = () => {
    clearAuth();
    setStatusAuthed(false);
    setStatusOpen(false);
    setMobile(false);
    router.push("/status");
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="DevTools logo"
            width={48}
            height={48}
            className="h-10 w-10 flex-shrink-0 dark:hidden sm:h-11 sm:w-11"
            priority
          />
          <Image
            src="/logo-dark.png"
            alt="DevTools logo"
            width={48}
            height={48}
            className="hidden h-10 w-10 flex-shrink-0 dark:block dark:brightness-110 sm:h-11 sm:w-11"
            priority
          />
          <span className="flex flex-col justify-center leading-tight">
            <span className="text-lg font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">Dev</span><span className="text-zinc-900 dark:text-white">Tools</span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              by WellFriend
            </span>
          </span>
        </Link>

        <nav className="hidden h-full items-center gap-6 md:flex">
          {statusAuthed ? (
            <div className="relative" onMouseEnter={openStatusMenu} onMouseLeave={closeStatusMenu}>
              <button
                type="button"
                onFocus={openStatusMenu}
                onBlur={closeStatusMenu}
                className={`${navClass} ${pathname.startsWith("/status") || pathname.startsWith("/dashboard") ? activeNavClass : inactiveNavClass}`}
                aria-expanded={statusOpen}
              >
                Status
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${statusOpen ? "rotate-180" : ""}`} />
              </button>

              {statusOpen && (
                <div
                  className="absolute left-0 top-full z-[110] w-[230px] max-w-[calc(100vw-24px)] pt-4"
                  onMouseEnter={openStatusMenu}
                  onMouseLeave={closeStatusMenu}
                >
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <Link href="/status" className={menuLinkClass} onClick={() => setStatusOpen(false)}>
                      Public Status
                    </Link>
                    <Link href="/dashboard" className={menuLinkClass} onClick={() => setStatusOpen(false)}>
                      Dashboard
                    </Link>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button type="button" onClick={logoutStatus} className={`${menuLinkClass} w-full text-left`}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/status" className={`${navClass} ${isActive(pathname, "/status") ? activeNavClass : inactiveNavClass}`}>
              Status
            </Link>
          )}

          <div className="relative" onMouseEnter={openToolsMenu} onMouseLeave={closeToolsMenu}>
            <button
              ref={toolsTriggerRef}
              type="button"
              onClick={() => setToolsOpen((value) => !value)}
              className={`${navClass} ${toolsOpen || pathname.startsWith("/tools") ? activeNavClass : inactiveNavClass}`}
              aria-expanded={toolsOpen}
            >
              Dev Tools
              <span className="ml-2 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {allTools.length || devToolCount} tools
              </span>
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>

            {toolsOpen && (
              <div
                ref={toolsMenuRef}
                className="fixed left-1/2 top-16 z-[110] w-[960px] max-w-[calc(100vw-32px)] -translate-x-1/2 pt-3"
                onMouseEnter={openToolsMenu}
                onMouseLeave={closeToolsMenu}
              >
                <div
                  className="scrollbar-thin max-h-[80vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] dark:border-white/[0.08] dark:bg-[#1c1c1c]"
                  style={{ animation: "navDropdownIn 200ms ease-out both" }}
                >
                  <HeaderSearch value={toolSearch} onChange={setToolSearch} />

                  {hasToolResults ? (
                    <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {filteredColumns.map((column, index) => (
                        <div key={index} className="space-y-5">
                          {column.map((group) => (
                            <ToolDropdownGroup
                              key={group.name}
                              group={group}
                              pathname={pathname}
                              query={toolSearch}
                              onClick={() => setToolsOpen(false)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400">
                      No tools found for &apos;{toolSearch.trim()}&apos;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={openPasteMenu} onMouseLeave={closePasteMenu}>
            <button
              type="button"
              onFocus={openPasteMenu}
              onBlur={closePasteMenu}
              className={`${navClass} ${pathname.startsWith("/paste") ? activeNavClass : inactiveNavClass}`}
              aria-expanded={pasteOpen}
            >
              Paste
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${pasteOpen ? "rotate-180" : ""}`} />
            </button>

            {pasteOpen && (
              <div
                className="absolute left-0 top-full z-[110] w-[260px] max-w-[calc(100vw-24px)] pt-4"
                onMouseEnter={openPasteMenu}
                onMouseLeave={closePasteMenu}
              >
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="space-y-1">
                    {pasteLinks.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className={menuLinkClass} onClick={() => setPasteOpen(false)}>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <div className="flex items-start gap-2 px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>Add /raw to any paste URL for plain text</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={openCompilersMenu} onMouseLeave={closeCompilersMenu}>
            <div className="flex items-center">
              <Link
                href="/compilers"
                className={`${navClass} ${pathname.startsWith("/tools/web-runner") || pathname.startsWith("/tools/systems-runner") || pathname.startsWith("/tools/scripting-runner") || pathname.startsWith("/tools/jvm-runner") || pathname.startsWith("/tools/data-runner") || pathname.startsWith("/tools/database-runner") || pathname.startsWith("/tools/other-runner") || pathname === "/compilers" ? activeNavClass : inactiveNavClass}`}
              >
                Compilers
              </Link>
              <button
                type="button"
                onFocus={openCompilersMenu}
                onBlur={closeCompilersMenu}
                onClick={() => setCompilersOpen((value) => !value)}
                className={`inline-flex h-full items-center px-1 ${pathname === "/compilers" || pathname.startsWith("/tools/web-runner") || pathname.startsWith("/tools/systems-runner") || pathname.startsWith("/tools/scripting-runner") || pathname.startsWith("/tools/jvm-runner") || pathname.startsWith("/tools/data-runner") || pathname.startsWith("/tools/database-runner") || pathname.startsWith("/tools/other-runner") ? activeNavClass : inactiveNavClass}`}
                aria-expanded={compilersOpen}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${compilersOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {compilersOpen && (
              <div
                className="absolute left-0 top-full z-[110] w-[280px] max-w-[calc(100vw-24px)] pt-4"
                onMouseEnter={openCompilersMenu}
                onMouseLeave={closeCompilersMenu}
              >
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="space-y-1">
                    {compilerLinks.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className={menuLinkClass} onClick={() => setCompilersOpen(false)}>
                          <span className="block font-medium">{item.name}</span>
                          <span className="block text-xs text-zinc-400 dark:text-zinc-600">{item.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`${navClass} ${isActive(pathname, link.href) ? activeNavClass : inactiveNavClass}`}>
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className={`hidden md:block ${themeToggleClass}`}>
            <ThemeToggle />
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 md:inline-flex"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <button
            type="button"
            onClick={() => setMobile((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobile}
          >
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 top-16 z-[90] bg-neutral-900/20 dark:bg-black/55 md:hidden"
            onClick={() => setMobile(false)}
          />
          <div
            className="fixed bottom-0 left-0 top-16 z-[100] w-full max-w-[390px] overflow-y-auto border-r border-neutral-200 bg-white px-4 py-4 shadow-[20px_0_60px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-[#161616] md:hidden"
            style={{ animation: "navDrawerIn 200ms ease-out both" }}
          >
            <div className="space-y-2">
              {statusAuthed ? (
                <MobileAccordion
                  title="Status"
                  open={openMobileGroup === "status"}
                  onToggle={() => setOpenMobileGroup(openMobileGroup === "status" ? null : "status")}
                >
                  <MobilePlainLink href="/status" onClick={() => setMobile(false)}>Public Status</MobilePlainLink>
                  <MobilePlainLink href="/dashboard" onClick={() => setMobile(false)}>Dashboard</MobilePlainLink>
                  <button
                    type="button"
                    onClick={logoutStatus}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-neutral-200 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400"
                  >
                    Logout
                  </button>
                </MobileAccordion>
              ) : (
                <MobilePlainLink href="/status" bordered onClick={() => setMobile(false)}>Status</MobilePlainLink>
              )}

              <MobileAccordion
                title="Dev Tools"
                open={openMobileGroup === "tools"}
                onToggle={() => setOpenMobileGroup(openMobileGroup === "tools" ? null : "tools")}
                badge={`${allTools.length || devToolCount} tools`}
              >
                <div className="sticky top-0 z-10 -mx-2 bg-white px-2 pb-3 pt-1 dark:bg-[#161616]">
                  <HeaderSearch value={toolSearch} onChange={setToolSearch} />
                </div>
                {hasToolResults ? (
                  <div className="space-y-2">
                    {filteredMobileGroups.map((group) => {
                      const Icon = group.icon;
                      const forcedOpen = Boolean(toolSearch.trim());
                      const categoryOpen = forcedOpen || openMobileToolCategory === group.name;
                      return (
                        <div key={group.name} className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-white/[0.025]">
                          <button
                            type="button"
                            onClick={() => setOpenMobileToolCategory(categoryOpen && !forcedOpen ? null : group.name)}
                            className="flex w-full items-center justify-between px-3 py-3 text-left"
                          >
                            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-500">
                              <Icon className="h-4 w-4" />
                              {group.name}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-neutral-500 transition dark:text-zinc-500 ${categoryOpen ? "rotate-180" : ""}`} />
                          </button>
                          {categoryOpen && (
                            <div className="border-t border-neutral-200 px-2 py-2 dark:border-white/[0.08]">
                              {group.tools.map((tool) => (
                                <MobileToolLink
                                  key={tool.slug}
                                  tool={tool}
                                  active={isActive(pathname, tool.href)}
                                  onClick={() => setMobile(false)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-6 text-center text-sm text-neutral-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400">
                    No tools found for &apos;{toolSearch.trim()}&apos;
                  </div>
                )}
              </MobileAccordion>

              <MobileAccordion
                title="Paste"
                open={openMobileGroup === "paste"}
                onToggle={() => setOpenMobileGroup(openMobileGroup === "paste" ? null : "paste")}
              >
                {pasteLinks.map((item) => (
                  <MobilePlainLink key={item.href} href={item.href} onClick={() => setMobile(false)}>
                    {item.name}
                  </MobilePlainLink>
                ))}
                <div className="my-1 border-t border-neutral-200 dark:border-white/[0.08]" />
                <div className="flex items-start gap-2 px-3 py-2 text-xs text-neutral-500 dark:text-zinc-500">
                  <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>Add /raw to any paste URL for plain text</span>
                </div>
              </MobileAccordion>

              <MobileAccordion
                title="Compilers"
                open={openMobileGroup === "compilers"}
                onToggle={() => setOpenMobileGroup(openMobileGroup === "compilers" ? null : "compilers")}
              >
                {compilerLinks.map((item) => (
                  <MobilePlainLink key={item.href} href={item.href} onClick={() => setMobile(false)}>
                    <span className="block">{item.name}</span>
                    <span className="block text-xs text-neutral-400 dark:text-neutral-500">{item.description}</span>
                  </MobilePlainLink>
                ))}
              </MobileAccordion>

              {mainLinks.map((link) => (
                <MobilePlainLink key={link.href} href={link.href} bordered onClick={() => setMobile(false)}>
                  {link.name}
                </MobilePlainLink>
              ))}

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/[0.08] dark:text-neutral-200 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-white/[0.08]">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-500">
                  Theme
                </span>
                <div className={themeToggleClass}>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function ToolDropdownGroup({
  group,
  pathname,
  query,
  onClick,
}: {
  group: NavGroup;
  pathname: string;
  query: string;
  onClick: () => void;
}) {
  const Icon = group.icon;
  return (
    <section className="border-l-2 border-emerald-600 pl-2 dark:border-emerald-500">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-500">
        <Icon className="h-4 w-4" />
        {group.name}
      </div>
      <ul className="space-y-1">
        {group.tools.map((tool) => (
          <li key={tool.slug}>
            <ToolDropdownLink tool={tool} active={isActive(pathname, tool.href)} query={query} onClick={onClick} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToolDropdownLink({
  tool,
  active,
  query,
  onClick,
}: {
  tool: NavTool;
  active: boolean;
  query: string;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      onClick={onClick}
      className={`group relative flex min-h-9 gap-2 rounded-lg border-l-2 px-2 py-1.5 transition duration-150 ease-out ${
        active
          ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/[0.08]"
          : "border-transparent hover:border-emerald-600 hover:bg-emerald-50 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/[0.08]"
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 transition ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500 group-hover:text-emerald-600 dark:text-zinc-500 dark:group-hover:text-emerald-400"}`} />
      <span className="min-w-0">
        <span className={`flex items-center gap-2 text-sm font-medium leading-5 transition ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 group-hover:text-emerald-600 dark:text-neutral-200 dark:group-hover:text-emerald-400"}`}>
          <span className="truncate"><HighlightMatch text={tool.name} query={query} /></span>
          {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
        </span>
        <span className="block truncate text-xs leading-4 text-neutral-400 dark:text-neutral-500">{tool.navDescription}</span>
      </span>
    </Link>
  );
}

function MobileAccordion({
  title,
  open,
  onToggle,
  children,
  badge,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-white/[0.025]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-neutral-800 dark:text-zinc-100"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-white/[0.06] dark:text-zinc-500">{badge}</span>}
        </span>
        <ChevronDown className={"h-4 w-4 text-neutral-500 transition dark:text-zinc-500 " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="border-t border-neutral-200 px-2 py-2 dark:border-white/[0.08]">{children}</div>}
    </div>
  );
}

function MobilePlainLink({
  href,
  onClick,
  children,
  bordered = false,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
  bordered?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${bordered ? "border border-neutral-200 dark:border-white/[0.08]" : ""} block rounded-xl px-3 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-neutral-200 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function MobileToolLink({
  tool,
  active,
  onClick,
}: {
  tool: NavTool;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-xl border-l-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
          : "border-transparent text-neutral-800 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-neutral-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500 dark:text-zinc-500"}`} />
      <span className="truncate">{tool.name}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
    </Link>
  );
}
