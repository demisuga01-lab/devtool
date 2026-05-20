"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Braces,
  Check,
  Code2,
  Copy,
  Hash,
  Lock,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

type OutputRow = {
  label: string;
  value: string;
};

type DemoTab = {
  name: string;
  href: string;
  icon: LucideIcon;
  input: string;
  outputs: OutputRow[];
};

const tabs: DemoTab[] = [
  {
    name: "Hash",
    href: "/tools/hash-generator",
    icon: Hash,
    input: "hello@wellfriend.online",
    outputs: [
      { label: "MD5", value: "9d4e1c8a0e7b31f4f0acb3f2a1" },
      { label: "SHA1", value: "da39a3ee5e6b4b0d3255bfef95601890afd80709" },
      { label: "SHA256", value: "2cf24dba5fb0a30e26943ed985c5f4f6" },
      { label: "SHA512", value: "cf83e1357eefb8bdf15471cc6eedc2f9" },
    ],
  },
  {
    name: "JWT",
    href: "/tools/jwt-decoder",
    icon: Braces,
    input: "eyJhbGciOiJIUzI1NiJ9...",
    outputs: [
      { label: "ALG", value: "HS256" },
      { label: "TYP", value: "JWT" },
      { label: "SUB", value: "user_123" },
      { label: "NAME", value: "WellFriend" },
      { label: "EXP", value: "1716249600" },
    ],
  },
  {
    name: "UUID",
    href: "/tools/uuid-generator",
    icon: Code2,
    input: "v4 - Bulk: 5",
    outputs: [
      { label: "1", value: "550e8400-e29b-41d4-a716-446655440000" },
      { label: "2", value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" },
      { label: "3", value: "6ba7b811-9dad-11d1-80b4-00c04fd430c8" },
      { label: "4", value: "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
      { label: "5", value: "7c9e6679-7425-40de-944b-e07fc1f90ae7" },
    ],
  },
  {
    name: "Base64",
    href: "/tools/base64",
    icon: Lock,
    input: "hello@wellfriend.online",
    outputs: [
      { label: "ENC", value: "aGVsbG9Ad2VsbGZyaWVuZC5vbmxpbmU=" },
      { label: "DEC", value: "hello@wellfriend.online" },
    ],
  },
  {
    name: "Cron",
    href: "/tools/cron-parser",
    icon: MoreHorizontal,
    input: "*/5 * * * *",
    outputs: [
      { label: "DESC", value: "Every 5 minutes" },
      { label: "NEXT1", value: "2026-05-20 00:05:00" },
      { label: "NEXT2", value: "2026-05-20 00:10:00" },
      { label: "NEXT3", value: "2026-05-20 00:15:00" },
      { label: "NEXT4", value: "2026-05-20 00:20:00" },
    ],
  },
];

export function ToolOutputDemo() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false);
      transitionRef.current = setTimeout(() => {
        setActive((current) => (current + 1) % tabs.length);
        setVisible(true);
      }, 200);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
      if (copyRef.current) clearTimeout(copyRef.current);
    };
  }, []);

  const selectTab = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    setResetKey((value) => value + 1);

    if (index === active) {
      setVisible(true);
      return;
    }

    setVisible(false);
    transitionRef.current = setTimeout(() => {
      setActive(index);
      setVisible(true);
    }, 200);
  };

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      if (copyRef.current) clearTimeout(copyRef.current);
      copyRef.current = setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1000);
    } catch {
      setCopiedKey(null);
    }
  };

  const clearDemo = () => {
    setCopiedKey(null);
    setVisible(true);
    setResetKey((value) => value + 1);
  };

  const current = tabs[active];
  const outputText = current.outputs.map((row) => row.value).join("\n");

  return (
    <div className="min-h-[440px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex min-h-[440px] h-full flex-row">
        <div className="flex w-12 flex-shrink-0 flex-col border-r border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = active === index;

            return (
              <button
                key={tab.name}
                type="button"
                aria-label={`Show ${tab.name} demo`}
                onClick={() => selectTab(index)}
                className={
                  "flex h-12 w-12 cursor-pointer items-center justify-center transition-colors " +
                  (selected
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400")
                }
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {tabs.map((tab, index) => {
              const selected = active === index;

              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => selectTab(index)}
                  className={
                    "cursor-pointer border-b-2 px-4 py-2.5 text-xs font-medium transition-colors " +
                    (selected
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200")
                  }
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div
            className={
              "flex-1 overflow-hidden transition-opacity duration-200 " +
              (visible ? "opacity-100" : "opacity-0")
            }
          >
            <div className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              INPUT
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-4 text-sm font-mono text-zinc-700 dark:text-zinc-300">
              <span className="min-w-0 flex-1 truncate">{current.input}</span>
              <CopyButton
                copied={copiedKey === `${current.name}-input`}
                label={`Copy ${current.name} input`}
                onClick={() => copyValue(`${current.name}-input`, current.input)}
              />
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800" />

            <div className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              OUTPUT
            </div>
            <div className="pb-3">
              {current.outputs.map((row) => {
                const key = `${current.name}-${row.label}`;

                return (
                  <div key={key} className="flex items-center justify-between px-5 py-3">
                    <span className="w-16 flex-shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.label}
                    </span>
                    <span className="mx-3 min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {row.value}
                    </span>
                    <CopyButton
                      copied={copiedKey === key}
                      label={`Copy ${row.label}`}
                      onClick={() => copyValue(key, row.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
              <span className="whitespace-nowrap text-emerald-600 dark:text-emerald-400">Live preview</span>
              <span>&middot;</span>
              <span className="truncate">Processed in your browser</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-4">
              <button
                type="button"
                onClick={clearDemo}
                className="cursor-pointer text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => copyValue(`${current.name}-all`, outputText)}
                className="cursor-pointer text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {copiedKey === `${current.name}-all` ? "Copied" : "Copy all"}
              </button>
              <Link
                href={current.href}
                className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Open tool -&gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({
  copied,
  label,
  onClick,
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
