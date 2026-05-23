"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ToolHeader, ToolShell } from "@/components/tool-ui";

export type WorkspaceTab<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

export function WorkspaceShell<T extends string>({
  title,
  subtitle,
  href,
  icon: Icon,
  activeTab,
  tabs,
  onTabChange,
  children,
  visitIcon,
  intentGroup,
  toolbar,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  activeTab: T;
  tabs: WorkspaceTab<T>[];
  onTabChange: (tab: T) => void;
  children: ReactNode;
  visitIcon: string;
  intentGroup: string;
  toolbar?: ReactNode;
}) {
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <ToolShell toolName={title} toolHref={href} iconName={visitIcon} intentGroup={intentGroup}>
      <ToolHeader
        breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: title, href }, { label: active.label }]}
        title={title}
        description={subtitle}
        icon={<Icon className="h-5 w-5" />}
      />
      {toolbar && <div className="mb-4">{toolbar}</div>}
      <div className="overflow-x-auto border-b border-border [scrollbar-width:none] md:sticky md:top-16 md:z-20 md:bg-background/95 md:backdrop-blur [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-4">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={
                  "inline-flex h-12 items-center gap-2 border-b-2 px-1 text-sm transition-colors " +
                  (selected
                    ? "border-emerald-500 font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <section className="py-5">{children}</section>
    </ToolShell>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</label>;
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export const monoInputClass = `${inputClass} font-mono`;

export const textareaClass =
  "w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 " +
        (props.className ?? "")
      }
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 " +
        (props.className ?? "")
      }
    />
  );
}

export function WorkspaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-white p-4 dark:bg-zinc-900 ${className}`}>{children}</div>;
}
