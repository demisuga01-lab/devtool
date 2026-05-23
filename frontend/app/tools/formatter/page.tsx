"use client";

import { useMemo, useRef, useState } from "react";
import { Braces, Code2, Database, Download, FileCode } from "lucide-react";
import { html as beautifyHtml, js as beautifyJs } from "js-beautify";
import { format as formatSql, type SqlLanguage } from "sql-formatter";
import { CopyButton } from "@/components/tool-ui";
import { analyzeHtml, formatBytes, utf8ByteLength } from "@/lib/tool-insights";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "html" | "javascript" | "sql";
type BraceStyle = "collapse" | "expand" | "end-expand";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "html", label: "HTML", icon: FileCode },
  { id: "javascript", label: "JavaScript", icon: Braces },
  { id: "sql", label: "SQL", icon: Database },
];

const sqlDialects: Array<{ value: SqlLanguage; label: string }> = [
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "MSSQL" },
];

export default function FormatterWorkspacePage() {
  const [active, setActive] = useState<Tab>("html");

  return (
    <WorkspaceShell
      title="Code Formatter"
      subtitle="Format and beautify HTML, JavaScript, and SQL"
      href="/tools/formatter"
      icon={Code2}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="formatter"
      intentGroup="text"
    >
      {active === "html" && <HtmlFormatterTab />}
      {active === "javascript" && <JavaScriptFormatterTab />}
      {active === "sql" && <SqlFormatterTab />}
    </WorkspaceShell>
  );
}

function HtmlFormatterTab() {
  const [input, setInput] = useState('<!doctype html>\n<html>\n<head><title>DevTools</title></head>\n<body><main><h1>Hello</h1></main></body>\n</html>');
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("2");
  const [sortAttributes, setSortAttributes] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const stats = useMemo(() => analyzeHtml(input), [input]);

  function run() {
    if (!input.trim()) {
      setError("Paste HTML before formatting.");
      inputRef.current?.focus();
      return;
    }
    try {
      setError("");
      const source = sortAttributes ? sortHtmlAttributes(input) : input;
      setOutput(
        beautifyHtml(source, {
          indent_size: Number(indent),
          wrap_line_length: 120,
          preserve_newlines: true,
          max_preserve_newlines: 1,
        }),
      );
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not format HTML.");
    }
  }

  return (
    <FormatterLayout
      inputRef={inputRef}
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      inputLabel="HTML input"
      outputLabel="Formatted HTML"
      controls={
        <>
          <SelectControl label="Indent size" value={indent} onChange={setIndent} options={[["2", "2 spaces"], ["4", "4 spaces"]]} />
          <Toggle checked={sortAttributes} onChange={setSortAttributes} label="Sort attributes" />
          <PrimaryButton onClick={run}>Format</PrimaryButton>
        </>
      }
      footer={
        <StatsGrid
          items={[
            ["Tags", String(stats.tagCount)],
            ["Depth", String(stats.maxDepth)],
            ["Size", output ? `${stats.beforeBytes} to ${formatBytes(utf8ByteLength(output))}` : stats.beforeBytes],
          ]}
        />
      }
    />
  );
}

function JavaScriptFormatterTab() {
  const [input, setInput] = useState('function hello(name){console.log("Hello, "+name);}\nhello("DevTools");');
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("2");
  const [brace, setBrace] = useState<BraceStyle>("collapse");
  const [preserveNewlines, setPreserveNewlines] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function run() {
    if (!input.trim()) {
      setError("Paste JavaScript before formatting.");
      inputRef.current?.focus();
      return;
    }
    try {
      setError("");
      setOutput(
        beautifyJs(input, {
          indent_size: Number(indent),
          brace_style: brace,
          preserve_newlines: preserveNewlines,
          max_preserve_newlines: preserveNewlines ? 2 : 0,
        }),
      );
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not beautify JavaScript.");
    }
  }

  return (
    <FormatterLayout
      inputRef={inputRef}
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      inputLabel="JavaScript input"
      outputLabel="Beautified JavaScript"
      controls={
        <>
          <SelectControl label="Indent size" value={indent} onChange={setIndent} options={[["2", "2 spaces"], ["4", "4 spaces"]]} />
          <SelectControl
            label="Brace style"
            value={brace}
            onChange={(value) => setBrace(value as BraceStyle)}
            options={[["collapse", "Collapse"], ["expand", "Expand"], ["end-expand", "End expand"]]}
          />
          <Toggle checked={preserveNewlines} onChange={setPreserveNewlines} label="Preserve newlines" />
          <PrimaryButton onClick={run}>Format</PrimaryButton>
        </>
      }
      footer={<DownloadRow output={output} filename="formatted.js" />}
    />
  );
}

function SqlFormatterTab() {
  const [input, setInput] = useState("select id, name, created_at from users where active = 1 order by created_at desc;");
  const [output, setOutput] = useState("");
  const [dialect, setDialect] = useState<SqlLanguage>("mysql");
  const [indent, setIndent] = useState("2");
  const [uppercaseKeywords, setUppercaseKeywords] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function run() {
    if (!input.trim()) {
      setError("Paste SQL before formatting.");
      inputRef.current?.focus();
      return;
    }
    try {
      setError("");
      setOutput(
        formatSql(input, {
          language: dialect,
          tabWidth: Number(indent),
          keywordCase: uppercaseKeywords ? "upper" : "preserve",
        }),
      );
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not format SQL.");
    }
  }

  return (
    <FormatterLayout
      inputRef={inputRef}
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      inputLabel="SQL input"
      outputLabel="Formatted SQL"
      controls={
        <>
          <SelectControl label="Dialect" value={dialect} onChange={(value) => setDialect(value as SqlLanguage)} options={sqlDialects.map((item) => [item.value, item.label])} />
          <SelectControl label="Indent size" value={indent} onChange={setIndent} options={[["2", "2 spaces"], ["4", "4 spaces"]]} />
          <Toggle checked={uppercaseKeywords} onChange={setUppercaseKeywords} label="Uppercase keywords" />
          <PrimaryButton onClick={run}>Format</PrimaryButton>
        </>
      }
      footer={<DownloadRow output={output} filename="formatted.sql" />}
    />
  );
}

function FormatterLayout({
  inputRef,
  input,
  setInput,
  output,
  error,
  inputLabel,
  outputLabel,
  controls,
  footer,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (value: string) => void;
  output: string;
  error: string;
  inputLabel: string;
  outputLabel: string;
  controls: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <WorkspaceCard>
        <div className="flex flex-wrap items-end gap-3">{controls}</div>
      </WorkspaceCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>{inputLabel}</FieldLabel>
            <button type="button" onClick={() => setInput("")} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
          <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[450px] ${error ? "border-red-500" : ""}`} />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>{outputLabel}</FieldLabel>
            <CopyButton value={output} label="Copy" />
          </div>
          <textarea value={output} readOnly className={`${textareaClass} min-h-[450px]`} placeholder="Formatted output appears here." />
        </div>
      </div>
      {footer}
    </div>
  );
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
      {label}
    </label>
  );
}

function StatsGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(([label, value]) => (
        <WorkspaceCard key={label} className="py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
        </WorkspaceCard>
      ))}
    </div>
  );
}

function DownloadRow({ output, filename }: { output: string; filename: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={output} label="Copy output" />
      <SecondaryButton onClick={() => downloadText(filename, output)} disabled={!output}>
        <Download className="h-4 w-4" />
        Download
      </SecondaryButton>
    </div>
  );
}

function sortHtmlAttributes(input: string) {
  return input.replace(/<([a-zA-Z][\w:-]*)(\s+[^<>]*?)>/g, (full, tag: string, attrs: string) => {
    if (full.startsWith("</")) return full;
    const parts = attrs.trim().match(/[^\s=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/g);
    if (!parts || parts.length < 2) return full;
    return `<${tag} ${parts.sort((a, b) => a.localeCompare(b)).join(" ")}>`;
  });
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
