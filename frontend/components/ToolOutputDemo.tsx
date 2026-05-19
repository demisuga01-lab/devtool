"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

type DemoTab = {
  name: string;
  href: string;
  content: React.ReactNode;
};

const tabs: DemoTab[] = [
  {
    name: "Hash",
    href: "/tools/hash-generator",
    content: <HashOutput />,
  },
  {
    name: "JWT",
    href: "/tools/jwt-decoder",
    content: <JwtOutput />,
  },
  {
    name: "UUID",
    href: "/tools/uuid-generator",
    content: <UuidOutput />,
  },
  {
    name: "Base64",
    href: "/tools/base64",
    content: <Base64Output />,
  },
  {
    name: "Cron",
    href: "/tools/cron-parser",
    content: <CronOutput />,
  },
];

export function ToolOutputDemo() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setActive((current) => (current + 1) % tabs.length);
        setVisible(true);
      }, 300);
    }, 3000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetKey]);

  const selectTab = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActive(index);
    setVisible(true);
    setResetKey((value) => value + 1);
  };

  const current = tabs[active];

  return (
    <div className="ml-auto w-full max-w-[540px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800">
        <div className="flex flex-shrink-0 gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="scrollbar-thin flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto">
          {tabs.map((tab, index) => {
            const selected = active === index;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => selectTab(index)}
                className={
                  "cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors " +
                  (selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")
                }
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[260px] px-4 py-4">
        <div className={"transition-opacity duration-300 " + (visible ? "opacity-100" : "opacity-0")}>
          {current.content}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          <Zap className="mr-1.5 inline h-3 w-3" />
          Live preview &middot; processed in your browser
        </div>
        <Link
          href={current.href}
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Open tool -&gt;
        </Link>
      </div>
    </div>
  );
}

function HashOutput() {
  const rows = [
    ["MD5", "9d4e1c8a0e7b31f4f0acb3f2a1"],
    ["SHA1", "da39a3ee5e6b4b0d3255bfef95601890afd80709"],
    ["SHA256", "2cf24dba5fb0a30e26943ed985c5f4f6"],
    ["SHA512", "cf83e1357eefb8bdf15471cc6eedc2f9"],
  ];

  return (
    <div className="font-mono text-xs leading-relaxed">
      <div className="mb-3 border-b border-zinc-100 pb-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        INPUT: &quot;hello@wellfriend.online&quot;
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="inline-block w-16 font-semibold text-emerald-600 dark:text-emerald-400">
              {label}:
            </span>
            <span className="break-all text-zinc-700 dark:text-zinc-300">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function JwtOutput() {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <div className="mb-3 border-b border-zinc-100 pb-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        INPUT: eyJhbGciOiJIUzI1NiJ9...
      </div>
      <SectionLabel>Header</SectionLabel>
      <pre className="text-zinc-700 dark:text-zinc-300">{`{ "alg": "HS256",
  "typ": "JWT" }`}</pre>
      <SectionLabel>Payload</SectionLabel>
      <pre className="text-zinc-700 dark:text-zinc-300">
        {'{ "sub": "'}
        <span className="text-emerald-600 dark:text-emerald-400">user_123</span>
        {'",\n  "name": "'}
        <span className="text-emerald-600 dark:text-emerald-400">WellFriend</span>
        {'",\n  "iat": '}
        <span className="text-blue-600 dark:text-blue-400">1716163200</span>
        {',\n  "exp": '}
        <span className="text-blue-600 dark:text-blue-400">1716249600</span>
        {" }"}
      </pre>
      <SectionLabel>Signature</SectionLabel>
      <div className="text-zinc-700 dark:text-zinc-300">HMAC-SHA256 (not verified)</div>
    </div>
  );
}

function UuidOutput() {
  const ids = [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  ];

  return (
    <div className="font-mono text-xs leading-relaxed">
      <div className="mb-3 text-zinc-500 dark:text-zinc-500">Generated UUIDs (v4):</div>
      <div className="space-y-2">
        {ids.map((id, index) => (
          <div key={id}>
            <span className="inline-block w-6 text-zinc-400">{index + 1}</span>
            <span className="text-zinc-700 dark:text-zinc-300">{id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Base64Output() {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <SectionLabel>Encode</SectionLabel>
      <KeyValue label="Input:" value="hello@wellfriend.online" />
      <KeyValue label="Output:" value="aGVsbG9Ad2VsbGZyaWVuZC5vbmxpbmU=" />
      <SectionLabel>Decode</SectionLabel>
      <KeyValue label="Input:" value="V2VsbEZyaWVuZCBEZXZUb29scw==" />
      <KeyValue label="Output:" value="WellFriend DevTools" />
    </div>
  );
}

function CronOutput() {
  const runs = [
    "2026-05-20 00:05:00",
    "2026-05-20 00:10:00",
    "2026-05-20 00:15:00",
    "2026-05-20 00:20:00",
    "2026-05-20 00:25:00",
  ];

  return (
    <div className="font-mono text-xs leading-relaxed">
      <SectionLabel>Expression</SectionLabel>
      <div className="mb-3 text-2xl text-emerald-600 dark:text-emerald-400">*/5 * * * *</div>
      <SectionLabel>Description</SectionLabel>
      <div className="text-zinc-700 dark:text-zinc-300">Every 5 minutes</div>
      <SectionLabel>Next Runs</SectionLabel>
      <div className="text-xs leading-6 text-zinc-600 dark:text-zinc-400">
        {runs.map((run) => (
          <div key={run}>{run}</div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 first:mt-0 dark:text-zinc-500">
      {children}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="inline-block w-16 text-zinc-500">{label}</span>
      <span className="break-all text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
}
