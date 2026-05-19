import Link from "next/link";
import { toolGroups } from "@/lib/tools";

export const metadata = {
  title: "Docs",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Docs</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Documentation
        </h1>
      </header>

      <div className="mt-10 space-y-5">
        <DocSection title="Getting Started">
          <p>All tools run in your browser. No setup needed. Open a tool, paste your input, get your output.</p>
        </DocSection>

        <DocSection title="Dev Tools">
          <div className="space-y-3">
            {toolGroups.map((group) => (
              <p key={group.slug}>
                <Link
                  href={group.tools[0]?.href ?? "/tools"}
                  className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  {group.name}
                </Link>
                : {group.description}
              </p>
            ))}
          </div>
        </DocSection>

        <DocSection title="Paste">
          <ul className="list-disc space-y-2 pl-5">
            <li>Create a paste at <Link href="/paste" className="font-medium text-emerald-600 dark:text-emerald-400">/paste</Link>.</li>
            <li>Share the URL.</li>
            <li>Optional: password, expiry, burn after read.</li>
            <li>Raw view: add /raw to any paste URL.</li>
            <li>Delete: use the delete token shown on creation.</li>
          </ul>
        </DocSection>

        <DocSection title="Status">
          <p>Coming soon - monitor your services and APIs.</p>
        </DocSection>

        <DocSection title="API">
          <p>
            A public API is planned. Currently the backend at /api is used internally by the network tools and paste system.{" "}
            <a
              href="https://github.com/demisuga01-lab/devtool"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              View the source on GitHub
            </a>
            .
          </p>
        </DocSection>
      </div>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}
