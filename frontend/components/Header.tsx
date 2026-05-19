"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { toolGroups } from "@/lib/tools";

const GITHUB_URL = "https://github.com/wellfriend/devtools";

export function Header() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="WellFriend DevTools"
              width={40}
              height={40}
              className="rounded-xl object-contain"
              priority
            />
            <span className="leading-tight">
              <span className="block">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Dev</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Tools</span>
              </span>
              <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                by WellFriend
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <div
              className="relative"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <button
                type="button"
                onFocus={handleEnter}
                onBlur={handleLeave}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                aria-expanded={open}
              >
                Dev Tools
                <ChevronDown className="h-4 w-4" />
              </button>

              {open && (
                <div className="absolute left-0 top-full z-50 w-[760px] max-w-[calc(100vw-48px)] pt-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {toolGroups.map((group) => (
                        <div key={group.slug}>
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {group.name}
                          </div>
                          <ul className="space-y-1">
                            {group.tools.map((tool) => (
                              <li key={tool.slug}>
                                <Link
                                  href={tool.href}
                                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  onClick={() => setOpen(false)}
                                >
                                  <span>{tool.name}</span>
                                  {!tool.implemented && (
                                    <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                      Soon
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/paste"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Paste
            </Link>
            <Link
              href="/status"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Status
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobile((v) => !v)}
            className="rounded-xl border border-zinc-200 p-2 dark:border-zinc-800 md:hidden"
            aria-label="Toggle menu"
          >
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <div className="space-y-2">
            {toolGroups.map((group) => {
              const isOpen = openMobileGroup === group.slug;
              return (
                <div key={group.slug} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setOpenMobileGroup(isOpen ? null : group.slug)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {group.name}
                    <ChevronDown
                      className={"h-4 w-4 transition " + (isOpen ? "rotate-180" : "")}
                    />
                  </button>
                  {isOpen && (
                    <ul className="border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
                      {group.tools.map((tool) => (
                        <li key={tool.slug}>
                          <Link
                            href={tool.href}
                            className="block rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={() => setMobile(false)}
                          >
                            {tool.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <Link
              href="/paste"
              className="block rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              onClick={() => setMobile(false)}
            >
              Paste
            </Link>
            <Link
              href="/status"
              className="block rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              onClick={() => setMobile(false)}
            >
              Status
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
