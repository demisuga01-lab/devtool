import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";
import { getGroupOfTool, getTool } from "@/lib/tools";

type Props = {
  slug: string;
  children: ReactNode;
};

export function ToolShell({ slug, children }: Props) {
  const tool = getTool(slug);
  const group = getGroupOfTool(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-4 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Tools
        </Link>
        {group && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{group.name}</span>
          </>
        )}
      </nav>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {tool?.name ?? slug}
        </h1>
        {tool?.description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
        )}
      </header>
      {children}
      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-500">
        Processed in your browser. Nothing is sent to any server.
      </p>
    </div>
  );
}
