import { Construction } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function ComingSoon({ eyebrow, title, description }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Construction className="h-6 w-6" />
        </div>
        {eyebrow && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}
