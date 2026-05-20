import Link from "next/link";
import { toolGroups, type ToolGroup } from "@/lib/tools";

export const metadata = {
  title: "Tools Reference",
};

const groupAnchors: Record<string, string> = {
  text: "text-format",
  crypto: "crypto-hash",
  datetime: "date-time",
  encode: "encode-convert",
  web: "web-network",
  "xml-data": "xml-data",
  escape: "escape",
  reference: "reference",
};

const groupOrder = ["text", "crypto", "datetime", "encode", "web", "xml-data", "escape", "reference"];
const serverTools = new Set(["http-headers", "redirect-checker", "ssl-checker", "dns-lookup", "whois-lookup", "java-regex"]);

function inputDescription(slug: string) {
  if (["http-headers", "redirect-checker"].includes(slug)) return "A public URL to inspect.";
  if (["ssl-checker", "dns-lookup", "whois-lookup"].includes(slug)) return "A domain name and any options requested by the tool.";
  if (slug === "java-regex" || slug === "regex-tester") return "A regex pattern, sample text, and optional flags.";
  return "The text, data, file, expression, or options requested by the tool page.";
}

function outputDescription(slug: string) {
  if (slug === "http-headers") return "Response headers, status, and related HTTP metadata.";
  if (slug === "redirect-checker") return "The redirect chain and final destination.";
  if (slug === "ssl-checker") return "TLS certificate details and validity information.";
  if (slug === "dns-lookup") return "DNS records for the selected record type.";
  if (slug === "whois-lookup") return "WHOIS registration details returned by the server tool.";
  return "The generated, converted, parsed, validated, or inspected result.";
}

export default function ToolsDocsPage() {
  const groups = groupOrder
    .map((slug) => toolGroups.find((group) => group.slug === slug))
    .filter((group): group is ToolGroup => Boolean(group));

  return (
    <article className="space-y-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Dev Tools</p>
        <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Tools Reference</h1>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          DevTools includes {toolGroups.flatMap((group) => group.tools).length} implemented utilities grouped by workflow. Most run entirely in the browser; a small set of network tools calls the backend because it must inspect public network resources.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.slug} id={groupAnchors[group.slug]} className="scroll-mt-24">
          <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            {group.name === "Escape" ? "Escape Tools" : group.name}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{group.description}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {group.tools.map((tool) => {
              const serverSide = serverTools.has(tool.slug);
              return (
                <article key={tool.slug} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</h3>
                  <dl className="space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    <div>
                      <dt className="font-medium text-zinc-900 dark:text-zinc-100">Route:</dt>
                      <dd><code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{tool.href}</code></dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-900 dark:text-zinc-100">Type:</dt>
                      <dd>{serverSide ? "Server-side" : "Browser-only"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-900 dark:text-zinc-100">Input:</dt>
                      <dd>{inputDescription(tool.slug)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-900 dark:text-zinc-100">Output:</dt>
                      <dd>{outputDescription(tool.slug)}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {tool.description} {serverSide ? "The backend validates the target before making a request and does not store the input." : "Processing happens locally in the browser."}
                  </p>
                  <Link href={tool.href} className="mt-4 inline-flex text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                    Open tool -&gt;
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </article>
  );
}