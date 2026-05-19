import Link from "next/link";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">About</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Built for developers, by WellFriend
        </h1>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          WellFriend DevTools is a clean, open-source toolbox for everyday developer tasks.
        </p>
      </header>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">What is DevTools?</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            A focused set of browser-based utilities for formatting, decoding, hashing, and inspecting data. Everything runs in your browser - nothing is sent to any server except the network tools, such as HTTP headers and DNS lookup, which require server-side requests.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Why we built it</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Most developer tools are cluttered with ads, require accounts, or run your data through third-party servers. DevTools keeps it simple: open source, no signup, no tracking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Part of WellFriend</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            DevTools is part of the broader WellFriend suite, alongside{" "}
            <a
              href="https://tools.wellfriend.online"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              PDFTools
            </a>
            , a toolkit for PDF and file workflows.
          </p>
        </section>
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">View source on GitHub</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Star the repo, report issues, or contribute.
        </p>
        <Link
          href="https://github.com/demisuga01-lab/devtool"
          target="_blank"
          className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Open GitHub
        </Link>
      </div>
    </div>
  );
}
