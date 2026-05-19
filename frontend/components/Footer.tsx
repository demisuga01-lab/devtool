import Image from "next/image";
import Link from "next/link";

const GITHUB_URL = "https://github.com/demisuga01-lab/devtool";

const productLinks = [
  { label: "Dev Tools", href: "/tools" },
  { label: "Paste", href: "/paste" },
  { label: "Status", href: "/status" },
  { label: "All Tools", href: "/tools" },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

const supportLinks = [
  { label: "PDFTools", href: "https://tools.wellfriend.online", external: true },
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "Discord", href: "https://discord.gg/ZQFmYaQbVu", external: true },
  { label: "contact@wellfriend.online", href: "mailto:contact@wellfriend.online" },
  { label: "support@wellfriend.online", href: "mailto:support@wellfriend.online" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-zinc-800">
                <Image
                  src="/logo.png"
                  alt="WellFriend DevTools"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl object-contain dark:brightness-90"
                />
              </div>
              <span className="leading-tight">
                <span className="block">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Dev</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Tools</span>
                </span>
                <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  by WellFriend
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              A clean developer toolbox for formatting, decoding, hashing, and inspecting.
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
              Open source. No signup. No tracking.
            </p>
          </div>

          <FooterLinkColumn title="Product" links={productLinks} />
          <FooterLinkColumn title="Support & Legal" links={supportLinks} />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div>&copy; 2026 WellFriend &middot; devtools.wellfriend.online</div>
          <div>Open source software. Free to use and self-host.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
