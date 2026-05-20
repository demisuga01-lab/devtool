"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const searchIndex = [
  { title: "Introduction", description: "What WellFriend DevTools includes and where to start.", href: "/docs#getting-started", section: "Getting Started" },
  { title: "Quick Start", description: "Open a tool, paste input, and get output instantly.", href: "/docs/getting-started#quick-start", section: "Getting Started" },
  { title: "How Tools Work", description: "Browser-only tools versus server-side network tools.", href: "/docs/getting-started#how-tools-work", section: "Getting Started" },
  { title: "Privacy & Security", description: "No accounts, browser processing, temporary paste storage.", href: "/docs/getting-started#privacy", section: "Getting Started" },
  { title: "All Tools Overview", description: "Browse the complete tools reference by category.", href: "/docs/tools", section: "Dev Tools" },
  { title: "Text & Format", description: "JSON, HTML, CSS, Markdown, slugs, diffing, and text utilities.", href: "/docs/tools#text-format", section: "Dev Tools" },
  { title: "Crypto & Hash", description: "Hashing, UUIDs, password generation, and HMAC signatures.", href: "/docs/tools#crypto-hash", section: "Dev Tools" },
  { title: "Date & Time", description: "Timestamps, cron parsing, Quartz cron, and date differences.", href: "/docs/tools#date-time", section: "Dev Tools" },
  { title: "Encode & Convert", description: "Base encodings, CSV, JSON, and file encoding helpers.", href: "/docs/tools#encode-convert", section: "Dev Tools" },
  { title: "Web & Network", description: "Headers, redirects, SSL, DNS, WHOIS, and regex tools.", href: "/docs/tools#web-network", section: "Dev Tools" },
  { title: "XML & Data", description: "XML, YAML, XPath, XSD, and XSLT tools.", href: "/docs/tools#xml-data", section: "Dev Tools" },
  { title: "Escape Tools", description: "Escape and unescape HTML, XML, JavaScript, JSON, and SQL.", href: "/docs/tools#escape", section: "Dev Tools" },
  { title: "Reference & Utils", description: "QR codes, MIME types, entities, URL parsing, and standards.", href: "/docs/tools#reference", section: "Dev Tools" },
  { title: "Paste Overview", description: "Create temporary notes and code snippets.", href: "/docs/paste", section: "Paste" },
  { title: "Creating a Paste", description: "Content, language, privacy options, and sharing.", href: "/docs/paste#creating", section: "Paste" },
  { title: "Password Protection", description: "How bcrypt-backed paste passwords work.", href: "/docs/paste#password", section: "Paste" },
  { title: "Burn After Read", description: "Delete a paste after the first successful read.", href: "/docs/paste#burn", section: "Paste" },
  { title: "Paste API", description: "Create, fetch, delete, and raw paste endpoints.", href: "/docs/paste#api", section: "Paste" },
  { title: "Status Overview", description: "Public status page and authenticated dashboard.", href: "/docs/status", section: "Status" },
  { title: "Public Status Page", description: "What visitors see and how status is calculated.", href: "/docs/status#public", section: "Status" },
  { title: "Setting Up Monitors", description: "URL, method, interval, timeout, status, and keyword fields.", href: "/docs/status#monitors", section: "Status" },
  { title: "Alerts", description: "Email, webhook, and Discord alert behavior.", href: "/docs/status#alerts", section: "Status" },
  { title: "Incidents", description: "Investigating, identified, monitoring, and resolved workflow.", href: "/docs/status#incidents", section: "Status" },
  { title: "Maintenance Windows", description: "Scheduled maintenance and affected services.", href: "/docs/status#maintenance", section: "Status" },
  { title: "Self-Hosting Requirements", description: "Server software and package prerequisites.", href: "/docs/self-hosting#requirements", section: "Self-Hosting" },
  { title: "Installation", description: "Backend, frontend, and local run commands.", href: "/docs/self-hosting#install", section: "Self-Hosting" },
  { title: "Configuration", description: "Environment variables for backend and frontend.", href: "/docs/self-hosting#config", section: "Self-Hosting" },
  { title: "PM2 & Nginx", description: "Process manager and reverse proxy setup.", href: "/docs/self-hosting#deployment", section: "Self-Hosting" },
  { title: "Admin Account", description: "Create the first dashboard admin with direct bcrypt.", href: "/docs/self-hosting#admin", section: "Self-Hosting" },
  { title: "Troubleshooting", description: "Common deploy, build, port, database, and bcrypt fixes.", href: "/docs/self-hosting#troubleshooting", section: "Self-Hosting" },
  { title: "API Overview", description: "Paste, network tools, and public status API endpoints.", href: "/docs/api", section: "API" },
  { title: "Network Tools API", description: "HTTP headers, DNS, SSL, WHOIS, redirects, and Java regex.", href: "/docs/api#tools", section: "API" },
  { title: "Status API", description: "Public status summary and monitor history endpoints.", href: "/docs/api#status", section: "API" },
];

export function DocsSearch({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return searchIndex
      .filter((item) =>
        `${item.title} ${item.description} ${item.section}`.toLowerCase().includes(value),
      )
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={wrapperRef} className={large ? "relative mx-auto mt-8 w-full max-w-xl" : "relative w-full"}>
      <div className={large ? "relative" : "relative mb-4"}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={large ? "Search documentation..." : "Search docs..."}
          className={
            "w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-zinc-700 placeholder-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder-zinc-600 " +
            (large ? "py-3.5 text-base" : "py-2.5 text-sm")
          }
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Clear docs search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {results.length > 0 ? (
            <div>
              {results.map((item) => (
                <button
                  key={`${item.href}-${item.title}`}
                  type="button"
                  onClick={() => goTo(item.href)}
                  className="block w-full cursor-pointer border-b border-zinc-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {item.section}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">{item.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-500">No docs found.</div>
          )}
        </div>
      )}
    </div>
  );
}
