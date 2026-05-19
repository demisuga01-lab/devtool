import Link from "next/link";
import { toolGroups } from "@/lib/tools";

export const metadata = {
  title: "All tools",
};

export default function ToolsIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">All tools</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Developer toolbox
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Everything runs in your browser unless a tool says otherwise. Nothing is stored.
        </p>
      </header>

      <div className="space-y-10">
        {toolGroups.map((group) => (
          <section key={group.slug}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {group.name}
              </h2>
              <span className="text-xs text-zinc-500">
                {group.tools.length} tools
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={tool.href}
                  className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                      {tool.name}
                    </h3>
                    {!tool.implemented && (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
