"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Code2, Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Tool, toolGroups } from "@/lib/tools";
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

const navClass =
  "inline-flex h-full items-center border-b-2 border-transparent px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35";
const inactiveNavClass =
  "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100";
const activeNavClass =
  "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400";
const menuLinkClass =
  "block rounded-lg px-2 py-1 text-[15px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const themeToggleClass =
  "[&>div>button]:rounded-lg [&>div>button]:border-0 [&>div>button]:bg-transparent [&>div>button]:p-2 [&>div>button]:text-zinc-500 [&>div>button]:transition-colors [&>div>button:hover]:bg-zinc-100 [&>div>button:hover]:text-zinc-700 dark:[&>div>button]:text-zinc-500 dark:[&>div>button:hover]:bg-zinc-800 dark:[&>div>button:hover]:text-zinc-300";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusAuthed, setStatusAuthed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const toolsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasteCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const textGroup = toolGroups.find((group) => group.slug === "text");
  const cryptoGroup = toolGroups.find((group) => group.slug === "crypto");
  const dateGroup = toolGroups.find((group) => group.slug === "datetime");
  const encodeGroup = toolGroups.find((group) => group.slug === "encode");
  const webGroup = toolGroups.find((group) => group.slug === "web");
  const xmlDataGroup = toolGroups.find((group) => group.slug === "xml-data");
  const escapeGroup = toolGroups.find((group) => group.slug === "escape");
  const referenceGroup = toolGroups.find((group) => group.slug === "reference");
  const textTools = textGroup?.tools ?? [];
  const xmlDataTools = xmlDataGroup?.tools ?? [];
  const referenceTools = referenceGroup?.tools ?? [];
  const remainingTools = [...xmlDataTools.slice(7), ...referenceTools.slice(6)];
  const topToolGroups = [
    { name: "Text & Format", tools: textTools.slice(0, 6) },
    { name: "More Formatters", tools: textTools.slice(6, 12) },
    cryptoGroup ? { name: cryptoGroup.name, tools: cryptoGroup.tools } : null,
    dateGroup ? { name: dateGroup.name, tools: dateGroup.tools } : null,
    encodeGroup ? { name: encodeGroup.name, tools: encodeGroup.tools } : null,
    webGroup ? { name: webGroup.name, tools: webGroup.tools } : null,
  ].filter((group): group is { name: string; tools: Tool[] } => Boolean(group && group.tools.length));
  const bottomToolGroups = [
    { name: "XML & Data", tools: xmlDataTools.slice(0, 7) },
    escapeGroup ? { name: escapeGroup.name, tools: escapeGroup.tools } : null,
    { name: "Reference & Utils", tools: referenceTools.slice(0, 6) },
    remainingTools.length > 0 ? { name: "More Tools", tools: remainingTools } : null,
  ].filter((group): group is { name: string; tools: Tool[] } => Boolean(group && group.tools.length));

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 p-2">
            <Code2 className="h-9 w-9 text-white" aria-hidden="true" />
          </span>
          <span className="flex flex-col justify-center leading-tight">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              DevTools
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              by WellFriend
            </span>
          </span>
        </Link>

        <nav className="hidden h-full items-center gap-2 md:flex">
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
                      <Link
                        href="/status"
                        className={menuLinkClass}
                        onClick={() => setStatusOpen(false)}
                      >
                        Public Status
                      </Link>
                      <Link
                        href="/dashboard"
                        className={menuLinkClass}
                        onClick={() => setStatusOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                      <button
                        type="button"
                        onClick={logoutStatus}
                        className={`${menuLinkClass} w-full text-left`}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/status"
                className={`${navClass} ${isActive(pathname, "/status") ? activeNavClass : inactiveNavClass}`}
              >
                Status
              </Link>
            )}

            <div className="relative" onMouseEnter={openToolsMenu} onMouseLeave={closeToolsMenu}>
              <button
                type="button"
                onFocus={openToolsMenu}
                onBlur={closeToolsMenu}
                className={`${navClass} ${pathname.startsWith("/tools") ? activeNavClass : inactiveNavClass}`}
                aria-expanded={toolsOpen}
              >
                Dev Tools
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsOpen && (
                <div
                  className="fixed left-1/2 top-16 z-[110] w-[900px] max-w-[calc(100vw-32px)] -translate-x-1/2 pt-2"
                  onMouseEnter={openToolsMenu}
                  onMouseLeave={closeToolsMenu}
                >
                  <div className="scrollbar-thin max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <ToolMenuColumns
                      groups={topToolGroups}
                      onClick={() => setToolsOpen(false)}
                    />

                    <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />

                    <ToolMenuColumns
                      groups={bottomToolGroups}
                      onClick={() => setToolsOpen(false)}
                    />
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
                          <Link
                            href={item.href}
                            className={menuLinkClass}
                            onClick={() => setPasteOpen(false)}
                          >
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

            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${navClass} ${isActive(pathname, link.href) ? activeNavClass : inactiveNavClass}`}
              >
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
            onClick={() => setMobile((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobile}
          >
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="fixed inset-x-0 top-16 z-[100] max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <div className="space-y-2">
            {statusAuthed ? (
              <MobileAccordion
                title="Status"
                open={openMobileGroup === "status"}
                onToggle={() => setOpenMobileGroup(openMobileGroup === "status" ? null : "status")}
              >
                <Link
                  href="/status"
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  onClick={() => setMobile(false)}
                >
                  Public Status
                </Link>
                <Link
                  href="/dashboard"
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  onClick={() => setMobile(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={logoutStatus}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Logout
                </button>
              </MobileAccordion>
            ) : (
              <Link
                href="/status"
                className="block rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                onClick={() => setMobile(false)}
              >
                Status
              </Link>
            )}

            <MobileAccordion
              title="Dev Tools"
              open={openMobileGroup === "tools"}
              onToggle={() => setOpenMobileGroup(openMobileGroup === "tools" ? null : "tools")}
            >
              {toolGroups.map((group) => (
                <div key={group.slug} className="py-1">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {group.name}
                  </div>
                  {group.tools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={tool.href}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      onClick={() => setMobile(false)}
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              ))}
            </MobileAccordion>

            <MobileAccordion
              title="Paste"
              open={openMobileGroup === "paste"}
              onToggle={() => setOpenMobileGroup(openMobileGroup === "paste" ? null : "paste")}
            >
              {pasteLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  onClick={() => setMobile(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <div className="flex items-start gap-2 px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>Add /raw to any paste URL for plain text</span>
              </div>
            </MobileAccordion>

            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                onClick={() => setMobile(false)}
              >
                {link.name}
              </Link>
            ))}

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>

            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Theme
              </span>
              <div className={themeToggleClass}>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        {title}
        <ChevronDown className={"h-4 w-4 transition " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">{children}</div>}
    </div>
  );
}

function ToolMenuGroup({
  name,
  tools,
  onClick,
  className = "",
  isLast = false,
}: {
  name: string;
  tools: Tool[];
  onClick: () => void;
  className?: string;
  isLast?: boolean;
}) {
  return (
    <div className={className} style={{ breakInside: "avoid", marginBottom: isLast ? 0 : "1rem" }}>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {name}
      </div>
      <ul className="space-y-1">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link href={tool.href} className={menuLinkClass} onClick={onClick}>
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolMenuColumns({
  groups,
  onClick,
}: {
  groups: { name: string; tools: Tool[] }[];
  onClick: () => void;
}) {
  return (
    <div style={{ columns: 4, columnGap: "1.5rem" }}>
      {groups.map((group, index) => (
        <ToolMenuGroup
          key={group.name}
          name={group.name}
          tools={group.tools}
          onClick={onClick}
          isLast={index === groups.length - 1}
        />
      ))}
    </div>
  );
}
