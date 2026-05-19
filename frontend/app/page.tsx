import Link from "next/link";
import {
  AlignLeft,
  ArrowRight,
  Calendar,
  Clipboard,
  Activity,
  Hash,
  Code2,
  Network,
  Wrench,
} from "lucide-react";
import { toolGroups, allTools } from "@/lib/tools";

const categoryIcons: Record<string, typeof AlignLeft> = {
  text: AlignLeft,
  crypto: Hash,
  datetime: Calendar,
  encode: Code2,
  web: Network,
};

export default function HomePage() {
  const implementedCount = allTools.filter((t) => t.implemented).length;
  const totalCount = allTools.length;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            WellFriend DevTools
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            A clean developer toolbox.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Format, decode, hash, and inspect. No signup. No tracking. Open source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Browse tools
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/paste"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Create a paste
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Categories
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Tools grouped by what you&apos;re doing
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolGroups.map((group) => {
              const Icon = categoryIcons[group.slug] ?? Wrench;
              const firstTool = group.tools[0];
              return (
                <Link
                  key={group.slug}
                  href={firstTool?.href ?? "/tools"}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {group.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {group.description}
                  </p>
                  <p className="mt-4 text-xs text-zinc-500">
                    {group.tools.length} {group.tools.length === 1 ? "tool" : "tools"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product strips */}
      <section>
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="space-y-4">
            <ProductStrip
              icon={Wrench}
              name="Dev Tools"
              description={`${implementedCount} of ${totalCount} tools for everyday developer tasks.`}
              href="/tools"
            />
            <ProductStrip
              icon={Clipboard}
              name="Paste"
              description="Temporary notes and code snippets."
              href="/paste"
            />
            <ProductStrip
              icon={Activity}
              name="Status"
              description="Monitor your services and APIs."
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
