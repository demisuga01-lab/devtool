import { ToolShell } from "./ToolShell";

export function ToolComingSoon({ slug }: { slug: string }) {
  return (
    <ToolShell slug={slug}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This tool is coming soon. Check back shortly.
        </p>
      </div>
    </ToolShell>
  );
}
