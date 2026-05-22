"use client";

import Link from "next/link";
import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useRef,
  useState,
} from "react";
import { AlertCircle, Check, ChevronRight, Copy, Play, RefreshCw } from "lucide-react";
import { getGroupOfTool, getTool } from "@/lib/tools";

type Breadcrumb = { label: string; href?: string };
type BadgeVariant = "default" | "success" | "error" | "warning" | "info";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type OutputTab = "output" | "errors";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function lines(value: string) {
  return value.length ? value.replace(/\r\n/g, "\n").split("\n") : [];
}

export function ToolShell({
  children,
  className = "",
  slug,
  footer = false,
}: {
  children: ReactNode;
  className?: string;
  slug?: string;
  footer?: boolean;
}) {
  const tool = slug ? getTool(slug) : undefined;
  const group = slug ? getGroupOfTool(slug) : undefined;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className={joinClasses("mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8", className)}>
        {slug && (
          <ToolHeader
            breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: group?.name ?? "Tools" }, { label: tool?.name ?? slug }]}
            title={tool?.name ?? slug}
            description={tool?.description ?? ""}
          />
        )}
        {children}
        {footer && (
          <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-600">
            Processed in your browser. Nothing is sent to any server.
          </p>
        )}
      </div>
    </div>
  );
}

export function ToolHeader({
  breadcrumbs,
  title,
  description,
  actions,
}: {
  breadcrumbs: Breadcrumb[];
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <nav className="mb-4 flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700" />}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-200">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({
  children,
  className = "",
  noPadding = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={joinClasses(
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
      {...props}
    >
      {noPadding ? children : <div className="p-4 sm:p-5">{children}</div>}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        {badge && (
          <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:border-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-400">
            {badge}
          </span>
        )}
        {subtitle && <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1.5 [&_button]:min-h-11 [&_button]:min-w-11 md:[&_button]:min-h-0 md:[&_button]:min-w-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { value: string; label: string; icon?: ReactNode; badge?: string }[];
  active: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={joinClasses("flex w-full max-w-full overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide", className)}>
      <div className="flex min-w-max shrink-0 gap-0.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={joinClasses(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
              active === tab.value
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-white/50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200",
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CodeArea({
  value,
  onChange,
  language,
  placeholder,
  className = "",
  onKeyDown,
  readOnly = false,
  rows,
}: {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  rows?: number;
}) {
  return (
    <div className="relative flex h-full min-h-[280px] flex-1 flex-col md:min-h-[320px] lg:min-h-0">
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={joinClasses(
          "h-full min-h-[280px] w-full flex-1 resize-none overflow-auto border-0 bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed tracking-normal text-zinc-100 outline-none selection:bg-emerald-600/30 placeholder:text-zinc-700 md:min-h-[320px] lg:min-h-0",
          className,
        )}
      />
      {language && (
        <span className="pointer-events-none absolute right-3 top-2.5 select-none rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
          {language}
        </span>
      )}
    </div>
  );
}

export function OutputPanel({
  hasRun,
  stdout,
  stderr,
  error,
  exitCode,
  signal,
  cpuTime,
  wallTime,
  memory,
  activeTab,
  onTabChange,
}: {
  hasRun: boolean;
  stdout: string;
  stderr: string;
  error: string;
  exitCode: number | null;
  signal: string | null;
  cpuTime: number | null;
  wallTime: number | null;
  memory: number | null;
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
}) {
  const outputLines = lines(stdout);
  const errorLines = lines(stderr);
  const hasResult =
    hasRun || exitCode !== null || signal !== null || cpuTime !== null || wallTime !== null || memory !== null;
  const copyValue = activeTab === "output" ? stdout : stderr;

  return (
    <section className="flex h-full min-h-[200px] flex-1 flex-col overflow-hidden bg-zinc-900 md:min-h-[280px] lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-100">Output</span>
        <div className="flex items-center gap-1.5">
          {(["output", "errors"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={joinClasses(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                activeTab === tab
                  ? tab === "output"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-red-600 text-white shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
              )}
            >
              {tab === "output" ? "Output" : "Errors"}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-800/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {exitCode !== 0 && exitCode !== null && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3.5 py-2.5 text-sm text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Process exited with code {exitCode}</span>
        </div>
      )}
      {signal && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3.5 py-2.5 text-sm text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Killed by signal {signal}</span>
        </div>
      )}
      <div className="min-h-[200px] flex-1 overflow-auto p-4 lg:min-h-0">
        {!hasRun ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-600">
            <span className="rounded-full bg-zinc-800 p-3">
              <Play className="h-5 w-5" />
            </span>
            <span className="text-sm">Run code to see output</span>
          </div>
        ) : activeTab === "output" ? (
          outputLines.length > 0 ? (
            outputLines.map((line, index) => (
              <div key={index} className="font-mono text-[13px] leading-relaxed text-zinc-200">
                <span className="mr-2 select-none text-emerald-700">▸</span>
                {line}
              </div>
            ))
          ) : exitCode === 0 ? (
            <span className="text-sm text-zinc-600">Process exited with no output.</span>
          ) : null
        ) : errorLines.length > 0 ? (
          errorLines.map((line, index) => (
            <div key={index} className="font-mono text-[13px] leading-relaxed text-red-400">
              {line}
            </div>
          ))
        ) : (
          <span className="text-sm text-zinc-600">No errors.</span>
        )}
      </div>
      {hasResult && (
        <div className="flex items-center gap-4 border-t border-zinc-800 bg-zinc-900/50 px-4 py-2">
          <span className="font-mono text-[11px] text-zinc-600">CPU: {cpuTime ?? "–"}ms</span>
          <span className="font-mono text-[11px] text-zinc-600">Wall: {wallTime ?? "–"}ms</span>
          <span className="font-mono text-[11px] text-zinc-600">Memory: {memory ?? "–"}KB</span>
          <CopyButton value={copyValue} className="ml-auto" />
        </div>
      )}
    </section>
  );
}

export function RunButton({
  running,
  onClick,
  disabled,
  className = "",
  fullWidth = false,
}: {
  running: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || running}
      className={joinClasses(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-500 active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none md:min-h-0",
        fullWidth && "w-full",
        className,
      )}
    >
      {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      <span>{running ? "Running..." : "Run"}</span>
    </button>
  );
}

export function CopyButton({ value, className = "", label }: { value: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function onClick() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!value}
      className={joinClasses(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:min-w-0",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

export function ToolInput({
  error,
  label,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string; label?: string; hint?: string }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
      <input
        className={joinClasses(
          "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600",
          error && "border-red-400 dark:border-red-600",
          className,
        )}
        {...props}
      />
      {hint && <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function ToolTextarea({
  error,
  label,
  hint,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; label?: string; hint?: string }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
      <textarea
        className={joinClasses(
          "min-h-[100px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600",
          error && "border-red-400 dark:border-red-600",
          className,
        )}
        {...props}
      />
      {hint && <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function ToolSelect({
  label,
  hint,
  className = "",
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
      <select
        className={joinClasses(
          "w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white bg-no-repeat px-3.5 py-2.5 pr-8 text-sm text-zinc-900 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 0.75rem center",
          ...style,
        }}
        {...props}
      />
      {hint && <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function Badge({ children, variant = "default", className = "" }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    success:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
    error: "border border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400",
    warning:
      "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
    info: "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400",
  };

  return (
    <span className={joinClasses("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

export function SplitLayout({ left, right, className = "" }: { left: ReactNode; right: ReactNode; className?: string }) {
  return (
    <div className={joinClasses("mt-5 flex flex-col gap-2 md:gap-4 lg:h-[calc(100vh-14rem)] lg:min-h-[560px] lg:flex-row", className)}>
      <div className="flex h-[40vh] min-h-[300px] w-full flex-1 flex-col overflow-hidden overscroll-contain rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:h-auto lg:min-h-0 lg:basis-[55%]">
        {left}
      </div>
      <div className="flex h-[40vh] min-h-[250px] w-full flex-1 flex-col overflow-hidden overscroll-contain rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:h-auto lg:min-h-0 lg:basis-[45%]">
        {right}
      </div>
    </div>
  );
}

export function StdinSection({
  value,
  onChange,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <details className="border-t border-zinc-200 dark:border-zinc-800">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200">
        <ChevronRight className="h-3.5 w-3.5 transition-transform [[open]_&]:rotate-90" />
        Standard Input (stdin)
      </summary>
      <div className="border-t border-zinc-200 bg-zinc-950 dark:border-zinc-800">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Optional stdin for your program..."
          className="min-h-[80px] w-full resize-none border-0 bg-zinc-950 p-4 font-mono text-[13px] text-zinc-100 outline-none placeholder:text-zinc-700"
        />
      </div>
    </details>
  );
}

export function ActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={joinClasses("sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/95 px-3 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:static md:px-4 md:py-3 md:backdrop-blur-none", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon && <div className="mb-1 rounded-2xl bg-zinc-100 p-3 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{icon}</div>}
      <div>
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{title}</p>
        {description && <p className="mt-1 max-w-[200px] text-xs text-zinc-400 dark:text-zinc-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ResultCard({
  label,
  value,
  mono = false,
  copyable = false,
  variant = "default",
}: {
  label: string;
  value: string | ReactNode;
  mono?: boolean;
  copyable?: boolean;
  variant?: "default" | "success" | "error";
}) {
  const copyValue = typeof value === "string" ? value : "";
  return (
    <div
      className={joinClasses(
        "rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900",
        variant === "success" && "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20",
        variant === "error" && "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</span>
        {copyable && typeof value === "string" && <CopyButton value={copyValue} />}
      </div>
      {mono ? (
        <div className="mt-2 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-[13px] text-zinc-200">{value}</div>
      ) : (
        <div className="text-sm text-zinc-900 dark:text-zinc-100">{value}</div>
      )}
    </div>
  );
}

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-500",
    secondary:
      "bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
    danger: "bg-red-600 text-white font-semibold hover:bg-red-500",
  };
  return (
    <button
      className={joinClasses(
        "inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Panel className={className} noPadding>{children}</Panel>;
}

export function ErrorCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
      {children}
    </div>
  );
}

export function SuccessCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
      {children}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <ToolTextarea {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <ToolInput {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <ToolSelect {...props} />;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {children}
    </label>
  );
}

export function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed text-zinc-100">
      <code>{value}</code>
    </pre>
  );
}

export function Toggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <TabBar
      active={value}
      onChange={onChange}
      tabs={options.map((option) => ({ value: option.value, label: option.label }))}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
      />
      {label}
    </label>
  );
}
