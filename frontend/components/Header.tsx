"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Code2, Github, Menu, Search, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { allTools, intentDefinitions } from "@/lib/tools";
import type { IntentGroupId } from "@/lib/tools";
import { authChangedEvent, clearAuth, isAuthenticated } from "@/lib/auth";

const GITHUB_URL = "https://github.com";

const mainLinks = [
  { name: "Workspace", href: "/workspace" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Docs", href: "/docs" },
  { name: "Contact", href: "/contact" },
];

const pasteLinks = [
  { name: "New Paste", href: "/paste" },
  { name: "View a Paste", href: "/paste/view" },
  { name: "Collections", href: "/paste/collections" },
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

const intentColors: Record<IntentGroupId, string> = {
  inspect: "text-blue-500",
  convert: "text-emerald-500",
  security: "text-amber-500",
  generate: "text-violet-500",
  network: "text-rose-500",
  text: "text-cyan-500",
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function compilerActive(pathname: string) {
  return pathname === "/compilers" || compilerLinks.some((item) => isActive(pathname, item.href));
}

function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { open, setOpen, show, hide };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const tools = useHoverMenu();
  const paste = useHoverMenu();
  const compilers = useHoverMenu();
  const status = useHoverMenu();
  const [statusAuthed, setStatusAuthed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [launcherQuery, setLauncherQuery] = useState("");
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  const intentCards = useMemo(
    () =>
      intentDefinitions.map((intent) => ({
        ...intent,
        count: allTools.filter((tool) => tool.intentGroup === intent.id).length,
      })),
    [],
  );

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

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
    tools.setOpen(false);
    paste.setOpen(false);
    compilers.setOpen(false);
    status.setOpen(false);
    setMobile(false);
    setOpenMobileGroup(null);
    setLauncherQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!tools.open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (toolsMenuRef.current?.contains(target) || toolsTriggerRef.current?.contains(target)) return;
      tools.setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") tools.setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tools]);

  function logoutStatus() {
    clearAuth();
    setStatusAuthed(false);
    status.setOpen(false);
    setMobile(false);
    router.push("/status");
  }

  function runLauncherSearch(value: string) {
    setLauncherQuery(value);
    const query = value.trim();
    router.push(query ? `/tools?q=${encodeURIComponent(query)}` : "/tools");
  }

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-full w-full items-center justify-between px-2 sm:px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo.png" alt="DevTools logo" width={48} height={48} className="h-10 w-10 flex-shrink-0 dark:hidden sm:h-11 sm:w-11" priority />
          <Image src="/logo-dark.png" alt="DevTools logo" width={48} height={48} className="hidden h-10 w-10 flex-shrink-0 dark:block dark:brightness-110 sm:h-11 sm:w-11" priority />
          <span className="flex flex-col justify-center leading-tight">
            <span className="text-lg font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">Dev</span><span className="text-zinc-900 dark:text-white">Tools</span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">by WellFriend</span>
          </span>
        </Link>

        <nav className="hidden h-full flex-1 items-center justify-center gap-5 px-4 md:flex lg:gap-6">
          {statusAuthed ? (
            <DropdownRoot menu={status}>
              <button
                type="button"
                onFocus={status.show}
                onBlur={status.hide}
                className={`${navClass} ${pathname.startsWith("/status") || pathname.startsWith("/dashboard") ? activeNavClass : inactiveNavClass}`}
                aria-expanded={status.open}
              >
                Status
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${status.open ? "rotate-180" : ""}`} />
              </button>
              {status.open && (
                <SmallDropdown menu={status} width="w-[230px]">
                  <Link href="/status" className={menuLinkClass} onClick={() => status.setOpen(false)}>Public Status</Link>
                  <Link href="/status/sla" className={menuLinkClass} onClick={() => status.setOpen(false)}>SLA Reports</Link>
                  <Link href="/dashboard" className={menuLinkClass} onClick={() => status.setOpen(false)}>Dashboard</Link>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <button type="button" onClick={logoutStatus} className={`${menuLinkClass} w-full text-left`}>Logout</button>
                </SmallDropdown>
              )}
            </DropdownRoot>
          ) : (
            <Link href="/status" className={`${navClass} ${isActive(pathname, "/status") ? activeNavClass : inactiveNavClass}`}>Status</Link>
          )}

          <div className="relative" onMouseEnter={tools.show} onMouseLeave={tools.hide}>
            <button
              ref={toolsTriggerRef}
              type="button"
              onClick={() => tools.setOpen(!tools.open)}
              className={`${navClass} ${tools.open || pathname.startsWith("/tools") ? activeNavClass : inactiveNavClass}`}
              aria-expanded={tools.open}
            >
              Tools
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{allTools.length}</span>
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${tools.open ? "rotate-180" : ""}`} />
            </button>

            {tools.open && (
              <div ref={toolsMenuRef} className="absolute left-0 top-full z-[110] w-[480px] max-w-[calc(100vw-24px)] pt-3" onMouseEnter={tools.show} onMouseLeave={tools.hide}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_48px_rgba(0,0,0,0.15)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_20px_48px_rgba(0,0,0,0.4)]" style={{ animation: "navDropdownIn 180ms ease-out both" }}>
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={launcherQuery}
                      onChange={(event) => runLauncherSearch(event.target.value)}
                      placeholder="Search tools..."
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800"
                    />
                  </label>

                  <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-500">Browse by intent</p>
                  <div className="grid grid-cols-3 gap-2">
                    {intentCards.map((intent) => (
                      <Link
                        key={intent.id}
                        href={`/tools?intent=${intent.id}`}
                        onClick={() => tools.setOpen(false)}
                        className="rounded-lg border border-zinc-200 p-2.5 transition hover:border-emerald-500/50 hover:bg-zinc-100/70 dark:border-zinc-800 dark:hover:bg-zinc-800/70"
                      >
                        <IntentIcon name={intent.id} className={`h-6 w-6 ${intentColors[intent.id]}`} />
                        <span className="mt-2 block text-xs font-medium text-zinc-900 dark:text-zinc-100">{intent.label}</span>
                        <span className="mt-0.5 block text-[10px] text-zinc-500 dark:text-zinc-500">{intent.count} tools</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-zinc-200 pt-3 text-center dark:border-zinc-800">
                    <Link href="/tools" onClick={() => tools.setOpen(false)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      Browse all {allTools.length} tools →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DropdownRoot menu={paste}>
            <button
              type="button"
              onFocus={paste.show}
              onBlur={paste.hide}
              className={`${navClass} ${pathname.startsWith("/paste") ? activeNavClass : inactiveNavClass}`}
              aria-expanded={paste.open}
            >
              Paste
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${paste.open ? "rotate-180" : ""}`} />
            </button>
            {paste.open && (
              <SmallDropdown menu={paste} width="w-[260px]">
                {pasteLinks.map((item) => (
                  <Link key={item.href} href={item.href} className={menuLinkClass} onClick={() => paste.setOpen(false)}>{item.name}</Link>
                ))}
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                <div className="flex items-start gap-2 px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                  <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>Add /raw to any paste URL for plain text</span>
                </div>
              </SmallDropdown>
            )}
          </DropdownRoot>

          <Link href="/gist" className={`${navClass} ${isActive(pathname, "/gist") ? activeNavClass : inactiveNavClass}`}>Gist</Link>

          <DropdownRoot menu={compilers}>
            <div className="flex h-full items-center">
              <Link href="/compilers" className={`${navClass} ${compilerActive(pathname) ? activeNavClass : inactiveNavClass}`}>Compilers</Link>
              <button
                type="button"
                onFocus={compilers.show}
                onBlur={compilers.hide}
                onClick={() => compilers.setOpen(!compilers.open)}
                className={`inline-flex h-full items-center px-1 ${compilerActive(pathname) ? activeNavClass : inactiveNavClass}`}
                aria-expanded={compilers.open}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${compilers.open ? "rotate-180" : ""}`} />
              </button>
            </div>
            {compilers.open && (
              <SmallDropdown menu={compilers} width="w-[280px]">
                {compilerLinks.map((item) => (
                  <Link key={item.href} href={item.href} className={menuLinkClass} onClick={() => compilers.setOpen(false)}>
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-xs text-zinc-400 dark:text-zinc-600">{item.description}</span>
                  </Link>
                ))}
              </SmallDropdown>
            )}
          </DropdownRoot>

          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`${navClass} ${isActive(pathname, link.href) ? activeNavClass : inactiveNavClass}`}>{link.name}</Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className={`hidden md:block ${themeToggleClass}`}><ThemeToggle /></div>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 md:inline-flex">
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
          <button type="button" aria-label="Close menu" className="fixed inset-0 top-16 z-[90] bg-neutral-900/20 dark:bg-black/55 md:hidden" onClick={() => setMobile(false)} />
          <div className="fixed inset-x-0 bottom-0 top-16 z-[100] w-full overflow-y-auto border-r border-neutral-200 bg-white px-4 py-4 shadow-[20px_0_60px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-zinc-900 md:hidden" style={{ animation: "navDrawerIn 200ms ease-out both" }}>
            <div className="space-y-2">
              {statusAuthed ? (
                <MobileAccordion title="Status" open={openMobileGroup === "status"} onToggle={() => setOpenMobileGroup(openMobileGroup === "status" ? null : "status")}>
                  <MobilePlainLink href="/status" onClick={() => setMobile(false)}>Public Status</MobilePlainLink>
                  <MobilePlainLink href="/status/sla" onClick={() => setMobile(false)}>SLA Reports</MobilePlainLink>
                  <MobilePlainLink href="/dashboard" onClick={() => setMobile(false)}>Dashboard</MobilePlainLink>
                  <button type="button" onClick={logoutStatus} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-neutral-200 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400">Logout</button>
                </MobileAccordion>
              ) : (
                <MobilePlainLink href="/status" bordered onClick={() => setMobile(false)}>Status</MobilePlainLink>
              )}

              <MobileAccordion title="Tools" open={openMobileGroup === "tools"} onToggle={() => setOpenMobileGroup(openMobileGroup === "tools" ? null : "tools")} badge={`${allTools.length} tools`}>
                <div className="grid grid-cols-2 gap-2">
                  {intentCards.map((intent) => (
                    <MobilePlainLink key={intent.id} href={`/tools?intent=${intent.id}`} onClick={() => setMobile(false)}>
                      <span className="flex items-center gap-2">
                        <IntentIcon name={intent.id} className={`h-5 w-5 ${intentColors[intent.id]}`} />
                        <span>
                          <span className="block">{intent.label}</span>
                          <span className="block text-xs text-neutral-400 dark:text-neutral-500">{intent.count} tools</span>
                        </span>
                      </span>
                    </MobilePlainLink>
                  ))}
                </div>
                <MobilePlainLink href="/tools" onClick={() => setMobile(false)}>Browse all tools</MobilePlainLink>
              </MobileAccordion>

              <MobileAccordion title="Paste" open={openMobileGroup === "paste"} onToggle={() => setOpenMobileGroup(openMobileGroup === "paste" ? null : "paste")}>
                {pasteLinks.map((item) => (
                  <MobilePlainLink key={item.href} href={item.href} onClick={() => setMobile(false)}>{item.name}</MobilePlainLink>
                ))}
                <div className="my-1 border-t border-neutral-200 dark:border-white/[0.08]" />
                <div className="flex items-start gap-2 px-3 py-2 text-xs text-neutral-500 dark:text-zinc-500">
                  <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>Add /raw to any paste URL for plain text</span>
                </div>
              </MobileAccordion>

              <MobilePlainLink href="/gist" bordered onClick={() => setMobile(false)}>Gist</MobilePlainLink>

              <MobileAccordion title="Compilers" open={openMobileGroup === "compilers"} onToggle={() => setOpenMobileGroup(openMobileGroup === "compilers" ? null : "compilers")}>
                {compilerLinks.map((item) => (
                  <MobilePlainLink key={item.href} href={item.href} onClick={() => setMobile(false)}>
                    <span className="block">{item.name}</span>
                    <span className="block text-xs text-neutral-400 dark:text-neutral-500">{item.description}</span>
                  </MobilePlainLink>
                ))}
              </MobileAccordion>

              {mainLinks.map((link) => (
                <MobilePlainLink key={link.href} href={link.href} bordered onClick={() => setMobile(false)}>{link.name}</MobilePlainLink>
              ))}

              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/[0.08] dark:text-neutral-200 dark:hover:bg-emerald-500/[0.08] dark:hover:text-emerald-400">
                <Github className="h-4 w-4" />
                GitHub
              </a>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-white/[0.08]">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-500">Theme</span>
                <div className={themeToggleClass}><ThemeToggle /></div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function DropdownRoot({ menu, children }: { menu: ReturnType<typeof useHoverMenu>; children: ReactNode }) {
  return (
    <div className="relative" onMouseEnter={menu.show} onMouseLeave={menu.hide}>
      {children}
    </div>
  );
}

function SmallDropdown({ menu, width, children }: { menu: ReturnType<typeof useHoverMenu>; width: string; children: ReactNode }) {
  return (
    <div className={`absolute left-0 top-full z-[110] ${width} max-w-[calc(100vw-24px)] pt-4`} onMouseEnter={menu.show} onMouseLeave={menu.hide}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  );
}

function IntentIcon({ name, className = "" }: { name: IntentGroupId; className?: string }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "inspect") {
    return (
      <svg {...props}>
        <circle cx="10" cy="10" r="7" />
        <path d="m21 21-4.35-4.35" />
        <path d="m7 10 2 2 4-4" />
      </svg>
    );
  }

  if (name === "convert") {
    return (
      <svg {...props}>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="m21 3v5h-5" />
        <path d="m3 21v-5h5" />
      </svg>
    );
  }

  if (name === "security") {
    return (
      <svg {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M10 11V9a2 2 0 1 1 4 0v2" />
      </svg>
    );
  }

  if (name === "generate") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="m13 2-3 7h5l-3 13" />
      </svg>
    );
  }

  if (name === "network") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m9 13-2 2 2 2" />
      <path d="m15 13 2 2-2 2" />
    </svg>
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
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-neutral-800 dark:text-zinc-100">
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
