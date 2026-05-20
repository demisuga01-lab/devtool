import { Bug, Lightbulb, Mail } from "lucide-react";

export const metadata = {
  title: "Contact",
};

const cards = [
  {
    title: "Bug Reports",
    icon: Bug,
    iconClass: "text-red-500 bg-red-50 dark:bg-red-950/30",
    text: "Found something broken? Open a GitHub issue with steps to reproduce.",
    links: [
      { label: "Open GitHub Issue →", href: "https://github.com/demisuga01-lab/devtool/issues" },
      { label: "Email support →", href: "mailto:support@wellfriend.online" },
    ],
  },
  {
    title: "Feature Requests",
    icon: Lightbulb,
    iconClass: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
    text: "Have an idea for a new tool or improvement? We would love to hear it.",
    links: [
      { label: "GitHub Discussions →", href: "https://github.com/demisuga01-lab/devtool/discussions" },
      { label: "Join Discord →", href: "https://discord.gg/ZQFmYaQbVu" },
    ],
  },
  {
    title: "General & Business",
    icon: Mail,
    iconClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    text: "Partnerships, API access, or anything else.",
    links: [
      { label: "contact@wellfriend.online", href: "mailto:contact@wellfriend.online" },
      { label: "Join Discord →", href: "https://discord.gg/ZQFmYaQbVu" },
    ],
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Contact</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Bug reports, feature ideas, or just saying hello - we read everything.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{card.text}</p>
              <div className="mt-5 space-y-2">
                {card.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                    className="block text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
        We typically respond within 24-48 hours. For urgent issues, GitHub is fastest.
      </p>

      <section className="mt-10 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/30 md:p-8">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Join our Discord community</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Get help, share feedback, and stay updated on new tools and features.
        </p>
        <a
          href="https://discord.gg/ZQFmYaQbVu"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          Join Discord →
        </a>
      </section>

      <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
        For PDFTools support, visit{" "}
        <a
          href="https://tools.wellfriend.online/contact"
          target="_blank"
          rel="noreferrer"
          className="hover:text-zinc-600 dark:hover:text-zinc-400"
        >
          tools.wellfriend.online/contact
        </a>
      </p>
    </div>
  );
}
