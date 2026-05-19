export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Get in touch
        </h1>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ContactCard
          title="Bug reports & issues"
          text="Found a bug or a tool that's not working correctly?"
          email="support@wellfriend.online"
          linkLabel="Open a GitHub issue"
          href="https://github.com/demisuga01-lab/devtool/issues"
        />
        <ContactCard
          title="General & partnerships"
          text="Feature suggestions, business enquiries, or just saying hello."
          email="contact@wellfriend.online"
          linkLabel="Join Discord"
          href="https://discord.gg/ZQFmYaQbVu"
        />
      </div>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
        For PDFTools support, visit{" "}
        <a
          href="https://tools.wellfriend.online/contact"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          tools.wellfriend.online/contact
        </a>
      </p>
    </div>
  );
}

function ContactCard({
  title,
  text,
  email,
  linkLabel,
  href,
}: {
  title: string;
  text: string;
  email: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{text}</p>
      <a
        href={`mailto:${email}`}
        className="mt-4 block text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
      >
        {email}
      </a>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
      >
        {linkLabel}
      </a>
    </div>
  );
}
