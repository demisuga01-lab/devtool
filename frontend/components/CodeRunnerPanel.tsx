"use client";

export type CodeRunnerLanguage = {
  label: string;
  language: string;
  version: string;
  defaultCode: string;
};

type CodeRunnerPanelProps = {
  title: string;
  description: string;
  languages: CodeRunnerLanguage[];
};

export function CodeRunnerPanel({ title, description, languages }: CodeRunnerPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {title}: {description} ({languages.length} languages)
    </div>
  );
}
