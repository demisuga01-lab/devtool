"use client";

import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:py-12">
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <DocsSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl lg:hidden">
            <DocsSidebar />
          </div>
          <div className="mx-auto mt-8 max-w-4xl lg:mt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}