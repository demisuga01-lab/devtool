"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlignLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clipboard,
  CodeXml,
  Github,
  Hash,
  Network,
  Search,
  Shield,
  type LucideIcon,
  Wrench,
} from "lucide-react";
import { toolGroups } from "@/lib/tools";

const categoryData = [
  {
    name: "Text & Format",
    slug: "text",
    description: "Format, validate, and convert structured text.",
    count: 12,
    icon: AlignLeft,
  },
  {
    name: "Crypto & Hash",
    slug: "crypto",
    description: "Hash, generate, and sign data in your browser.",
    count: 4,
    icon: Hash,
  },
  {
    name: "Date & Time",
    slug: "datetime",
    description: "Work with timestamps, cron, and date math.",
    count: 3,
    icon: Calendar,
  },
  {
    name: "Encode & Convert",
    slug: "encode",
    description: "Convert between encodings and data formats.",
    count: 4,
    icon: CodeXml,
  },
  {
    name: "Web & Network",
    slug: "web",
    description: "Inspect headers, DNS, SSL, and HTTP responses.",
    count: 6,
    icon: Network,
  },
  {
    name: "Regex",
    slug: "web",
    description: "Test JavaScript regular expressions live.",
    count: 1,
    icon: Search,
    href: "/tools/regex-tester",
  },
];

const sampleJson =
  '{"name":"WellFriend DevTools","version":"1.0.0","tools":29,"free":true,"features":["format","decode","hash"]}';

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              29 tools &middot; Open source &middot; Free forever
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl lg:text-6xl">
              A clean developer toolbox.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
              Format, decode, hash, and inspect. Everything runs in your browser. No signup, no tracking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Browse all tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/paste"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Create a paste
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <TrustBadge icon={CheckCircle2} label="No account required" />
              <TrustBadge icon={Shield} label="Runs in your browser" />
              <TrustBadge icon={Github} label="Open source" />
            </div>
          </div>

          <JsonFormatterDemo />
        </div>
      </section>

      <section className="border-b border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Categories</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Tools grouped by what you&apos;re doing
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryData.map((category) => {
              const group = toolGroups.find((item) => item.slug === category.slug);
              const href = category.href ?? group?.tools[0]?.href ?? "/tools";
              const Icon = category.icon;
              return (
                <Link
                  key={`${category.name}-${href}`}
                  href={href}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{category.description}</p>
                  <p className="mt-4 text-xs text-zinc-500">
                    {category.count} {category.count === 1 ? "tool" : "tools"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Products</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            More than just tools
          </h2>
          <div className="mt-8 space-y-4">
            <ProductStrip
              icon={Wrench}
              name="Dev Tools"
              description="29 tools for everyday developer tasks"
              href="/tools"
            />
            <ProductStrip
              icon={Clipboard}
              name="Paste"
              description="Temporary notes and code snippets"
              href="/paste"
            />
            <ProductStrip
              icon={Activity}
              name="Status"
              description="Monitor your services and APIs"
              href="/status"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
      <Icon className="h-3.5 w-3.5 text-emerald-500" />
      {label}
    </span>
  );
}

function JsonFormatterDemo() {
  const [input, setInput] = useState(sampleJson);

  const result = useMemo(() => {
    try {
      return {
        valid: true,
        output: JSON.stringify(JSON.parse(input), null, 2),
      };
    } catch {
      return {
        valid: false,
        output: "Invalid JSON - fix the input",
      };
    }
  }, [input]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">JSON Formatter</div>
        <Link
          href="/tools/json-formatter"
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Try it -&gt;
        </Link>
      </div>

      <div className="grid grid-cols-1 divide-y divide-zinc-200 dark:divide-zinc-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div>
          <div className="px-3 pb-1 pt-3 text-xs font-medium text-zinc-400">Input</div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-[220px] w-full resize-none bg-transparent px-3 pb-3 pt-1 font-mono text-xs text-zinc-700 placeholder:text-zinc-700 focus:outline-none dark:text-zinc-300 dark:placeholder:text-zinc-300"
          />
        </div>
        <div>
          <div className="px-3 pb-1 pt-3 text-xs font-medium text-zinc-400">Formatted</div>
          <pre
            className={
              "h-[220px] w-full overflow-auto whitespace-pre bg-transparent px-3 pb-3 pt-1 font-mono text-xs " +
              (result.valid ? "text-zinc-700 dark:text-zinc-300" : "text-red-500 dark:text-red-400")
            }
          >
            {result.output}
          </pre>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " + (result.valid ? "bg-emerald-500" : "bg-red-500")
            }
          />
          {result.valid ? "Valid JSON" : "Invalid JSON"}
        </div>
        <Link
          href="/tools/json-formatter"
          className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Edit in full tool -&gt;
        </Link>
      </div>
    </div>
  );
}

function ProductStrip({
  icon: Icon,
  name,
  description,
  href,
}: {
  icon: typeof Wrench;
  name: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{name}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-400" />
    </Link>
  );
}
