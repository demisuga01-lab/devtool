import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-sm text-zinc-500 dark:text-zinc-500">
          &copy; {year} WellFriend &middot; devtools.wellfriend.online
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a
            href="https://github.com/wellfriend/devtools"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            GitHub
          </a>
          <a
            href="https://pdftools.wellfriend.online"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            PDFTools
          </a>
          <a
            href="mailto:contact@wellfriend.online"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Contact
          </a>
          <Link
            href="/tools"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            All tools
          </Link>
        </div>
      </div>
    </footer>
  );
}
