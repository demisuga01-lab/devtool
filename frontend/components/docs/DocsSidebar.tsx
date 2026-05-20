"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocsSearch } from "./DocsSearch";

const sections = [
  {
    title: "Getting Started",
    links: [
      { label: "Introduction", href: "/docs" },
      { label: "Quick Start", href: "/docs/getting-started" },
      { label: "How Tools Work", href: "/docs/getting-started#how-tools-work" },
      { label: "Privacy & Security", href: "/docs/getting-started#privacy" },
    ],
  },
  {
    title: "Dev Tools",
    links: [
      { label: "All Tools Overview", href: "/docs/tools" },
      { label: "Text & Format", href: "/docs/tools#text-format" },
      { label: "Crypto & Hash", href: "/docs/tools#crypto-hash" },
      { label: "Date & Time", href: "/docs/tools#date-time" },
      { label: "Encode & Convert", href: "/docs/tools#encode-convert" },
      { label: "Web & Network", href: "/docs/tools#web-network" },
      { label: "XML & Data", href: "/docs/tools#xml-data" },
      { label: "Escape Tools", href: "/docs/tools#escape" },
      { label: "Reference & Utils", href: "/docs/tools#reference" },
    ],
  },
  {
    title: "Paste",
    links: [
      { label: "Overview", href: "/docs/paste" },
      { label: "Creating a Paste", href: "/docs/paste#creating" },
      { label: "Privacy Options", href: "/docs/paste#privacy" },
      { label: "Password Protection", href: "/docs/paste#password" },
      { label: "Burn After Read", href: "/docs/paste#burn" },
      { label: "API Usage", href: "/docs/paste#api" },
    ],
  },
  {
    title: "Status & Monitoring",
    links: [
      { label: "Overview", href: "/docs/status" },
      { label: "Public Status Page", href: "/docs/status#public" },
      { label: "Setting Up Monitors", href: "/docs/status#monitors" },
      { label: "Alerts", href: "/docs/status#alerts" },
      { label: "Incidents", href: "/docs/status#incidents" },
      { label: "Maintenance Windows", href: "/docs/status#maintenance" },
    ],
  },
  {
    title: "Self-Hosting",
    links: [
      { label: "Requirements", href: "/docs/self-hosting" },
      { label: "Installation", href: "/docs/self-hosting#install" },
      { label: "Configuration", href: "/docs/self-hosting#config" },
      { label: "PM2 & Nginx", href: "/docs/self-hosting#deployment" },
      { label: "Admin Account", href: "/docs/self-hosting#admin" },
      { label: "Updating", href: "/docs/self-hosting#updating" },
      { label: "Troubleshooting", href: "/docs/self-hosting#troubleshooting" },
    ],
  },
  {
    title: "API Reference",
    links: [
      { label: "Overview", href: "/docs/api" },
      { label: "Paste API", href: "/docs/api#paste" },
      { label: "Network Tools API", href: "/docs/api#tools" },
      { label: "Status API", href: "/docs/api#status" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  const [targetPath, hash] = href.split("#");
  return pathname === targetPath && !hash;
}

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <DocsSearch />
      <nav aria-label="Documentation navigation" className="space-y-1">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 first:mt-0 dark:text-zinc-400">
              {section.title}
            </h2>
            <div className="space-y-0.5">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    "block rounded-lg px-3 py-1.5 text-sm transition-colors " +
                    (isActive(pathname, link.href)
                      ? "bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100")
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}