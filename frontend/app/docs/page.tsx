import Link from "next/link";
import { Activity, BookOpen, Clipboard, Code2, Server, Wrench } from "lucide-react";
import { DocsSearch } from "@/components/docs/DocsSearch";

export const metadata = {
  title: "Docs",
};

const cards = [
  {
    title: "Getting Started",
    text: "Learn how to use DevTools, Paste, and Status.",
    href: "/docs/getting-started",
    icon: BookOpen,
  },
  {
    title: "Dev Tools Reference",
    text: "54 tools for formatting, decoding, and inspecting data.",
    href: "/docs/tools",
    icon: Wrench,
  },
  {
    title: "Paste Guide",
    text: "Create temporary notes and code snippets with privacy options.",
    href: "/docs/paste",
    icon: Clipboard,
  },
  {
    title: "Status Monitoring",
    text: "Monitor your services, manage incidents, and configure alerts.",
    href: "/docs/status",
    icon: Activity,
  },
  {
    title: "Self-Hosting",
    text: "Run your own instance on a VPS or locally.",
    href: "/docs/self-hosting",
    icon: Server,
  },
  {
    title: "API Reference",
    text: "Integrate DevTools features into your own applications.",
    href: "/docs/api",
    icon: Code2,
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          WellFriend DevTools
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Find the right guide
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          User guides, tool references, API docs, and self-hosting instructions for the DevTools suite.
        </p>
        <div className="mx-auto mt-8 max-w-2xl">
          <DocsSearch large />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-emerald-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-zinc-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{card.text}</p>
              <span className="mt-5 inline-flex text-sm font-medium text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300">
                Open guide -&gt;
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}