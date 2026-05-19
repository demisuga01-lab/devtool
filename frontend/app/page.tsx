import Link from "next/link";
import {
  Activity,
  AlignLeft,
  ArrowRight,
  Calendar,
  Clipboard,
  CodeXml,
  Hash,
  Network,
  Search,
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

const stats = [
  { value: "29", label: "Developer tools" },
  { value: "5", label: "Network tools" },
  { value: "∞", label: "Paste storage" },
  { value: "Free", label: "Always and forever" },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              WellFriend DevTools
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              A clean developer toolbox.
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
              29 tools for formatting, decoding, hashing, inspecting, and more. No signup. No tracking. Open source.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Browse all tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/paste"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Create a paste
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
              <span>No signup required</span>
              <span>Open source</span>
              <span>Runs in your browser</span>
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-3 md:grid">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</div>
              </div>
            ))}
          </div>
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
