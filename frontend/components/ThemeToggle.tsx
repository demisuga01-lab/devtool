"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const options: {
  value: "system" | "light" | "dark";
  label: string;
  description: string;
  icon: typeof Monitor;
}[] = [
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance. Default for new visitors.",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light interface.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark interface.",
    icon: Moon,
  },
];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  if (!mounted) {
    return (
      <button
        type="button"
        className="pointer-events-none inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="Toggle theme"
        aria-hidden
      >
        <Monitor className="h-4 w-4" />
      </button>
    );
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle theme"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[120] mt-2 w-[220px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {options.map((option) => {
            const selected = theme === option.value;
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={
                  "flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 " +
                  (selected ? "bg-emerald-50 dark:bg-emerald-950/30" : "")
                }
              >
                <OptionIcon
                  className={
                    "mt-0.5 h-4 w-4 flex-shrink-0 " +
                    (selected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400")
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={
                        selected
                          ? "font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-medium text-zinc-900 dark:text-zinc-100"
                      }
                    >
                      {option.label}
                    </span>
                    {selected && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
