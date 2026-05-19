"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { toolGroups } from "@/lib/tools";

const GITHUB_URL = "https://github.com/demisuga01-lab/devtool";

type PasteMenuItem =
  | { name: string; href: string; description?: never }
  | { name: string; description: string; href?: never };

type PasteMenuGroup = {
  name: string;
  items: PasteMenuItem[];
};

const pasteGroups: PasteMenuGroup[] = [
  {
    name: "Create",
    items: [
      { name: "New Paste", href: "/paste" },
      { name: "Code Snippet", href: "/paste?lang=javascript" },
      { name: "Markdown Note", href: "/paste?lang=markdown" },
      { name: "Plain Text", href: "/paste?lang=plaintext" },
    ],
  },
  {
    name: "Features",
    items: [
      { name: "Password Protected", href: "/paste?mode=password" },
      { name: "Burn After Read", href: "/paste?mode=burn" },
      { name: "One-Time Secret", href: "/paste?mode=secret" },
      { name: "With Expiry", href: "/paste?mode=expiry" },
    ],
  },
  {
    name: "View & Manage",
    items: [
      { name: "View a Paste", href: "/paste/view" },
      { name: "Recent Pastes", href: "/paste#recent" },
      { name: "Raw View", description: "Open a paste as plain text from its view page." },
    ],
  },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasteCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
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

  const handlePasteEnter = () => {
    if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
    setPasteOpen(true);
  };

  const handlePasteLeave = () => {
    if (pasteCloseTimer.current) clearTimeout(pasteCloseTimer.current);
    pasteCloseTimer.current = setTimeout(() => setPasteOpen(false), 180);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-zinc-800">
              <Image
                src="/logo.png"
                alt="WellFriend DevTools"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl object-contain dark:brightness-90"
                priority
              />
            </div>
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
                <div className="absolute left-0 top-full z-50 w-[920px] max-w-[calc(100vw-48px)] pt-2">
                  <div className="scrollbar-thin max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
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

            <div
              className="relative"
              onMouseEnter={handlePasteEnter}
              onMouseLeave={handlePasteLeave}
            >
              <button
                type="button"
                onFocus={handlePasteEnter}
                onBlur={handlePasteLeave}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                aria-expanded={pasteOpen}
              >
                Paste
                <ChevronDown className="h-4 w-4" />
              </button>

              {pasteOpen && (
                <div className="absolute left-0 top-full z-50 w-[480px] max-w-[calc(100vw-48px)] pt-2">
                  <div className="scrollbar-thin max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {pasteGroups.slice(0, 2).map((group) => (
                        <div key={group.name}>
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {group.name}
                          </div>
                          <ul className="space-y-1">
                            {group.items.map((item) => (
                              <li key={item.name}>
                                {item.href ? (
                                  <Link
                                    href={item.href}
                                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                    onClick={() => setPasteOpen(false)}
                                  >
                                    <span>{item.name}</span>
                                  </Link>
                                ) : (
                                  <div className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                                    <span>{item.name}</span>
                                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                      {item.description}
                                    </p>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <div className="col-span-2">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                          {pasteGroups[2].name}
                        </div>
                        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                          {pasteGroups[2].items.map((item) => (
                            <li key={item.name}>
                              {item.href ? (
                                <Link
                                  href={item.href}
                                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  onClick={() => setPasteOpen(false)}
                                >
                                  <span>{item.name}</span>
                                </Link>
                              ) : (
                                <div className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                                  <span>{item.name}</span>
                                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                    {item.description}
                                  </p>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/status"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Status
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 md:inline-flex"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
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
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setOpenMobileGroup(openMobileGroup === "paste" ? null : "paste")}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                Paste
                <ChevronDown
                  className={"h-4 w-4 transition " + (openMobileGroup === "paste" ? "rotate-180" : "")}
                />
              </button>
              {openMobileGroup === "paste" && (
                <div className="border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
                  {pasteGroups.map((group) => (
                    <div key={group.name} className="py-1">
                      <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {group.name}
                      </div>
                      <ul className="space-y-1">
                        {group.items.map((item) => (
                          <li key={item.name}>
                            {item.href ? (
                              <Link
                                href={item.href}
                                className="block rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                onClick={() => setMobile(false)}
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <div className="rounded-lg px-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {item.name}
                                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                  {item.description}
                                </p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
