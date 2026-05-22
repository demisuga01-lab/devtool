import Link from "next/link";
import { Activity, CheckCircle2, Clipboard, Github, Wrench } from "lucide-react";

export const metadata = {
  title: "About",
};

const productCards = [
  {
    title: "Dev Tools",
    icon: Wrench,
    badge: "54 tools",
    text: "54+ browser-based utilities for formatting, decoding, hashing, and inspecting data. From JSON formatters to Java regex testers, everything is built to stay fast and focused.",
  },
  {
    title: "Paste",
    icon: Clipboard,
    badge: "No account needed",
    text: "A simple, private pastebin for temporary notes and code snippets. Password protection, burn-after-read, expiry timers, view limits, and syntax highlighting are built in.",
  },
  {
    title: "Status",
    icon: Activity,
    badge: "Real-time monitoring",
    text: "Uptime monitoring for your services. Monitor HTTP endpoints, get alerted on downtime, manage incidents, and share a public status page.",
  },
];

const principles = [
  "Zero accounts required",
  "Browser tools never touch a server",
  "No ads, ever",
  "Open source - read the code",
  "Self-hostable on any VPS",
  "Dark mode built in",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">About</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Built for developers, by WellFriend
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          WellFriend DevTools is an open-source suite of developer utilities. Every browser-first tool is designed to feel fast, private, and uncluttered. No accounts, no tracking, no clutter.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {productCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{card.text}</p>
              <span className="mt-5 inline-flex rounded-xl bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {card.badge}
              </span>
            </article>
          );
        })}
      </section>

      <section className="mt-16 grid gap-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Why we built it</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            <p>
              Most developer tools come with ads, require accounts, or send your data to third-party servers. We wanted something different: fast, clean, private, and open source.
            </p>
            <p>
              WellFriend DevTools is the tool we wanted to use ourselves. No friction, no distractions, no compromises.
            </p>
          </div>
        </div>
        <ul className="space-y-3">
          {principles.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Part of WellFriend</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <a
            href="https://tools.wellfriend.online"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">PDFTools</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">PDF and image tools, without the clutter.</p>
          </a>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">DevTools</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Developer utilities, paste sharing, and status monitoring.</p>
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-2xl bg-zinc-900 p-6 text-white shadow-sm dark:bg-zinc-800 md:p-8">
        <Github className="h-8 w-8" />
        <h2 className="mt-4 text-2xl font-semibold">WellFriend DevTools is open source</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Star the repo, report issues, or contribute new tools.
        </p>
        <Link
          href="https://github.com"
          target="_blank"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          View on GitHub -&gt;
        </Link>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Questions? Reach us at{" "}
          <a href="mailto:contact@wellfriend.online" className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
            contact@wellfriend.online
          </a>
        </p>
      </section>
    </div>
  );
}
