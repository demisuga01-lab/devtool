import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Getting Started",
};

const steps = [
  "Choose a tool from the navigation or the tools directory.",
  "Paste your input into the tool interface.",
  "Get formatted, decoded, generated, or inspected output instantly.",
];

const privacy = [
  "No account is required for public tools.",
  "Browser tools run locally and do not send input to the server.",
  "Network tools make server-side requests only when the tool requires it, and input is not stored or logged by the current source.",
  "Paste content is stored temporarily and deleted on expiry, burn-after-read, view limit, or manual delete.",
  "The current source does not implement ads or user-data analytics.",
  "The project is open source, so you can audit the implementation yourself.",
];

export default function GettingStartedPage() {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Getting Started
      </p>
      <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Start using DevTools</h1>
      <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        WellFriend DevTools is a clean, open-source developer toolbox with browser-based utilities, a temporary paste service, and a status monitoring dashboard.
      </p>

      <section id="introduction">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
          Introduction
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            The suite has three public-facing products: Dev Tools for formatting, encoding, hashing, and inspection; Paste for temporary notes and code snippets; and Status for service monitoring and incident communication.
          </p>
          <p>
            Use the hosted version at{" "}
            <Link href="https://devtools.wellfriend.online" className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
              devtools.wellfriend.online
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="quick-start">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
          Quick Start
        </h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          No account needed - just open a tool and start using it.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section id="how-tools-work">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
          How Tools Work
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Browser tools</h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Most tools run entirely in JavaScript in your browser. Your input never leaves your device for these tools.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Network tools</h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              HTTP headers, DNS lookup, SSL checker, WHOIS, redirect checker, and Java regex use server-side requests because they inspect public network behavior or the Java runtime. The current source validates input and does not store those requests.
            </p>
          </div>
        </div>
      </section>

      <section id="privacy">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
          Privacy & Security
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {privacy.map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}