"use client";

import { useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { diffLines } from "diff";
import { AlignLeft, BarChart2, BookOpen, Bold, Code2, Eraser, FileText, GitCompare, Heading, Image as ImageIcon, Italic, Link as LinkIcon, List, Minus, Quote, Table, Type } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { analyzeText, formatDuration } from "@/lib/tool-insights";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "case" | "clean" | "analyze" | "diff" | "markdown" | "reference";
type RefTab = "ascii" | "mime" | "i18n" | "semver" | "units" | "numbers" | "roman";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "case", label: "Case", icon: Type },
  { id: "clean", label: "Clean", icon: Eraser },
  { id: "analyze", label: "Analyze", icon: BarChart2 },
  { id: "diff", label: "Diff", icon: GitCompare },
  { id: "markdown", label: "Markdown", icon: FileText },
  { id: "reference", label: "Reference", icon: BookOpen },
];

const mimeRows = [
  ["html", "text/html", "HTML document"],
  ["css", "text/css", "Cascading Style Sheets"],
  ["js", "text/javascript", "JavaScript source"],
  ["json", "application/json", "JSON data"],
  ["xml", "application/xml", "XML document"],
  ["txt", "text/plain", "Plain text"],
  ["csv", "text/csv", "Comma-separated values"],
  ["png", "image/png", "PNG image"],
  ["jpg", "image/jpeg", "JPEG image"],
  ["svg", "image/svg+xml", "SVG image"],
  ["pdf", "application/pdf", "PDF document"],
  ["zip", "application/zip", "ZIP archive"],
];

const languageRows = [
  ["en", "English", "US, GB, CA, AU"],
  ["es", "Spanish", "ES, MX, AR"],
  ["fr", "French", "FR, CA"],
  ["de", "German", "DE, AT, CH"],
  ["hi", "Hindi", "IN"],
  ["ja", "Japanese", "JP"],
  ["ko", "Korean", "KR"],
  ["zh", "Chinese", "CN, TW, HK"],
];

const currencyRows = [
  ["USD", "US Dollar", "United States"],
  ["EUR", "Euro", "European Union"],
  ["GBP", "Pound Sterling", "United Kingdom"],
  ["INR", "Indian Rupee", "India"],
  ["JPY", "Yen", "Japan"],
  ["AUD", "Australian Dollar", "Australia"],
];

const unitCategories = {
  Length: { meter: 1, kilometer: 1000, centimeter: 0.01, millimeter: 0.001, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344 },
  Weight: { gram: 1, kilogram: 1000, pound: 453.59237, ounce: 28.349523125 },
  Volume: { liter: 1, milliliter: 0.001, gallon: 3.785411784, quart: 0.946352946 },
  Speed: { "m/s": 1, "km/h": 0.2777777778, mph: 0.44704, knot: 0.514444 },
  Area: { "m^2": 1, "km^2": 1000000, "cm^2": 0.0001, "ft^2": 0.09290304, acre: 4046.8564224 },
} as const;

type UnitCategory = keyof typeof unitCategories | "Temperature";

export default function TextWorkspacePage() {
  const [active, setActive] = useState<Tab>("case");

  return (
    <WorkspaceShell
      title="Text Tools"
      subtitle="Transform, analyze, compare, and reference text and code"
      href="/tools/text"
      icon={Type}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="text"
      intentGroup="text"
    >
      {active === "case" && <CaseTab />}
      {active === "clean" && <CleanTab />}
      {active === "analyze" && <AnalyzeTab />}
      {active === "diff" && <DiffTab />}
      {active === "markdown" && <MarkdownTab />}
      {active === "reference" && <ReferenceTab />}
    </WorkspaceShell>
  );
}

function CaseTab() {
  const [input, setInput] = useState("hello world from devtools");
  const conversions = useMemo(() => convertCases(input), [input]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>Input text</FieldLabel>
          <button type="button" onClick={() => setInput("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[200px]`} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {conversions.map(([label, value]) => <OutputCard key={label} label={label} value={value} />)}
      </div>
    </div>
  );
}

function CleanTab() {
  const [input, setInput] = useState("Banana\napple\nbanana\n  cherry  \n\nApple");
  const [output, setOutput] = useState("");
  const stats = { inputLines: lineCount(input), outputLines: lineCount(output), removed: Math.max(0, input.length - output.length) };

  function apply(operation: string) {
    let lines = (output || input).split(/\r?\n/);
    if (operation === "dedupe") {
      const seen = new Set<string>();
      lines = lines.filter((line) => {
        const key = line.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (operation === "sort-az") lines = lines.slice().sort((a, b) => a.localeCompare(b));
    if (operation === "sort-za") lines = lines.slice().sort((a, b) => b.localeCompare(a));
    if (operation === "sort-length") lines = lines.slice().sort((a, b) => a.length - b.length || a.localeCompare(b));
    if (operation === "trim") lines = lines.map((line) => line.trim());
    if (operation === "blank") lines = lines.filter((line) => line.trim());
    if (operation === "html") lines = lines.map((line) => line.replace(/<[^>]*>/g, ""));
    if (operation === "reverse") lines = lines.reverse();
    if (operation === "shuffle") lines = lines.map((line) => [Math.random(), line] as const).sort((a, b) => a[0] - b[0]).map(([, line]) => line);
    setOutput(lines.join("\n"));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[250px]`} /></div>
        <div><FieldLabel>Output</FieldLabel><textarea value={output} readOnly className={`${textareaClass} min-h-[250px]`} /></div>
      </div>
      <WorkspaceCard>
        <FieldLabel>Operations</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => apply("dedupe")}>Remove duplicates</SecondaryButton>
          <SecondaryButton onClick={() => apply("sort-az")}>Sort A-Z</SecondaryButton>
          <SecondaryButton onClick={() => apply("sort-za")}>Sort Z-A</SecondaryButton>
          <SecondaryButton onClick={() => apply("sort-length")}>Sort by length</SecondaryButton>
          <SecondaryButton onClick={() => apply("trim")}>Trim whitespace</SecondaryButton>
          <SecondaryButton onClick={() => apply("blank")}>Remove blank lines</SecondaryButton>
          <SecondaryButton onClick={() => apply("html")}>Remove HTML tags</SecondaryButton>
          <SecondaryButton onClick={() => apply("reverse")}>Reverse lines</SecondaryButton>
          <SecondaryButton onClick={() => apply("shuffle")}>Shuffle lines</SecondaryButton>
        </div>
      </WorkspaceCard>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Original lines" value={String(stats.inputLines)} />
        <StatCard label="Result lines" value={String(stats.outputLines)} />
        <StatCard label="Chars removed" value={String(stats.removed)} />
      </div>
    </div>
  );
}

function AnalyzeTab() {
  const [input, setInput] = useState("Paste text here to count words, estimate reading time, and inspect frequency.");
  const [keyword, setKeyword] = useState("");
  const stats = useMemo(() => analyzeText(input), [input]);
  const density = keyword.trim() ? ((input.toLowerCase().match(new RegExp(escapeRegex(keyword.trim().toLowerCase()), "g")) ?? []).length / Math.max(1, stats.words)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div><FieldLabel>Text to analyze</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[250px]`} /></div>
      <div><FieldLabel>Focus keyword</FieldLabel><input value={keyword} onChange={(event) => setKeyword(event.target.value)} className={inputClass} /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Characters" value={stats.characters.toLocaleString()} />
        <StatCard label="No spaces" value={stats.charactersNoSpaces.toLocaleString()} />
        <StatCard label="Words" value={stats.words.toLocaleString()} />
        <StatCard label="Lines" value={stats.lines.toLocaleString()} />
        <StatCard label="Paragraphs" value={stats.paragraphs.toLocaleString()} />
        <StatCard label="Sentences" value={stats.sentences.toLocaleString()} />
        <StatCard label="Reading time" value={formatDuration(stats.readingTimeSeconds)} />
        <StatCard label="Speaking time" value={formatDuration(stats.speakingTimeSeconds)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard>
          <h3 className="font-semibold text-foreground">Top words</h3>
          <div className="mt-3 space-y-2">{stats.topWords.map((item) => <div key={item.word} className="flex justify-between border-b border-border pb-1 text-sm"><span>{item.word}</span><span className="font-mono">{item.count}</span></div>)}</div>
        </WorkspaceCard>
        <WorkspaceCard className="space-y-2 text-sm">
          <p><span className="font-medium text-foreground">Average word length:</span> {stats.averageWordLength.toFixed(2)}</p>
          <p><span className="font-medium text-foreground">Longest word:</span> {longestWord(input) || "-"}</p>
          <p><span className="font-medium text-foreground">Keyword density:</span> {keyword ? `${density.toFixed(2)}%` : "Enter a keyword"}</p>
        </WorkspaceCard>
      </div>
    </div>
  );
}

function DiffTab() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [view, setView] = useState<"unified" | "side">("unified");
  const [language, setLanguage] = useState("typescript");
  const [left, setLeft] = useState("one\ntwo\nthree\n");
  const [right, setRight] = useState("one\nTWO\nthree\nfour\n");
  const changes = useMemo(() => diffLines(left, right), [left, right]);
  const added = changes.filter((item) => item.added).reduce((sum, item) => sum + lineCount(item.value), 0);
  const removed = changes.filter((item) => item.removed).reduce((sum, item) => sum + lineCount(item.value), 0);
  const similarity = Math.max(0, 100 - Math.round(((added + removed) / Math.max(1, lineCount(left) + lineCount(right))) * 100));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Segmented value={mode} onChange={setMode} options={[["text", "Text"], ["code", "Code"]]} />
        <Segmented value={view} onChange={setView} options={[["unified", "Unified"], ["side", "Side-by-side"]]} />
        {mode === "code" && <div><FieldLabel>Language</FieldLabel><select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}><option>typescript</option><option>javascript</option><option>python</option><option>go</option><option>rust</option><option>sql</option></select></div>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Original</FieldLabel><textarea value={left} onChange={(event) => setLeft(event.target.value)} className={`${mode === "code" ? textareaClass : textareaClass.replace("font-mono", "")} min-h-[300px]`} /></div>
        <div><FieldLabel>Modified</FieldLabel><textarea value={right} onChange={(event) => setRight(event.target.value)} className={`${mode === "code" ? textareaClass : textareaClass.replace("font-mono", "")} min-h-[300px]`} /></div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Lines added" value={String(added)} />
        <StatCard label="Lines removed" value={String(removed)} />
        <StatCard label="Similarity" value={`${similarity}%`} />
      </div>
      <WorkspaceCard>
        <FieldLabel>Diff output</FieldLabel>
        <div className={view === "side" ? "grid gap-3 lg:grid-cols-2" : "space-y-1"}>
          {changes.map((change, index) => (
            <pre key={index} className={`overflow-x-auto whitespace-pre-wrap rounded-lg px-3 py-2 font-mono text-xs ${change.added ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : change.removed ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-zinc-50 text-muted-foreground dark:bg-zinc-800"}`}>{prefixLines(change.value, change.added ? "+ " : change.removed ? "- " : "  ")}</pre>
          ))}
        </div>
      </WorkspaceCard>
    </div>
  );
}

function MarkdownTab() {
  const [markdown, setMarkdown] = useState("# Markdown Preview\n\nWrite **markdown** on the left and preview it on the right.\n\n- Fast\n- Local\n- Sanitized");
  const [view, setView] = useState<"split" | "editor" | "preview">("split");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const html = useMemo(() => {
    const raw = marked.parse(markdown, { async: false }) as string;
    return typeof window === "undefined" ? raw : DOMPurify.sanitize(raw);
  }, [markdown]);

  function insert(before: string, after = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMarkdown((value) => value + before + after);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end);
    const next = markdown.slice(0, start) + before + selected + after + markdown.slice(end);
    setMarkdown(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <IconButton title="Bold" onClick={() => insert("**", "**")} icon={Bold} />
          <IconButton title="Italic" onClick={() => insert("_", "_")} icon={Italic} />
          <IconButton title="Heading" onClick={() => insert("## ")} icon={Heading} />
          <IconButton title="Link" onClick={() => insert("[", "](https://example.com)")} icon={LinkIcon} />
          <IconButton title="Image" onClick={() => insert("![alt](", ")")} icon={ImageIcon} />
          <IconButton title="Code" onClick={() => insert("`", "`")} icon={Code2} />
          <IconButton title="List" onClick={() => insert("- ")} icon={List} />
          <IconButton title="Table" onClick={() => insert("| Column | Value |\n| --- | --- |\n| Key | Value |\n")} icon={Table} />
          <IconButton title="Blockquote" onClick={() => insert("> ")} icon={Quote} />
          <IconButton title="Horizontal rule" onClick={() => insert("\n---\n")} icon={Minus} />
        </div>
        <Segmented value={view} onChange={setView} options={[["split", "Split"], ["editor", "Editor"], ["preview", "Preview"]]} />
      </div>
      <div className={`grid gap-4 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
        {view !== "preview" && <div><FieldLabel>Markdown</FieldLabel><textarea ref={textareaRef} value={markdown} onChange={(event) => setMarkdown(event.target.value)} className={`${textareaClass} min-h-[500px]`} /></div>}
        {view !== "editor" && <div><FieldLabel>Preview</FieldLabel><div className="prose prose-zinc min-h-[500px] max-w-none rounded-lg border border-border bg-white p-4 dark:prose-invert dark:bg-zinc-900" dangerouslySetInnerHTML={{ __html: html }} /></div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={html} label="Copy HTML" />
        <CopyButton value={markdown} label="Copy Markdown" />
        <SecondaryButton onClick={() => downloadText("notes.md", markdown, "text/markdown")}>Download .md</SecondaryButton>
      </div>
    </div>
  );
}

function ReferenceTab() {
  const [active, setActive] = useState<RefTab>("ascii");
  const options: [RefTab, string][] = [["ascii", "ASCII"], ["mime", "MIME"], ["i18n", "i18n"], ["semver", "Semver"], ["units", "Units"], ["numbers", "Numbers"], ["roman", "Roman"]];
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-3">
          {options.map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id)} className={`h-10 border-b-2 px-1 text-sm transition ${active === id ? "border-emerald-500 font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
        </div>
      </div>
      {active === "ascii" && <AsciiRef />}
      {active === "mime" && <SearchableTable rows={mimeRows} headers={["Extension", "MIME Type", "Description"]} />}
      {active === "i18n" && <I18nRef />}
      {active === "semver" && <SemverRef />}
      {active === "units" && <UnitsRef />}
      {active === "numbers" && <NumbersRef />}
      {active === "roman" && <RomanRef />}
    </div>
  );
}

function AsciiRef() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "printable" | "control">("all");
  const rows = useMemo(() => Array.from({ length: 128 }, (_, code) => {
    const char = code >= 32 && code <= 126 ? String.fromCharCode(code) : controlName(code);
    const description = code >= 32 && code <= 126 ? "Printable character" : "Control character";
    return [String(code), code.toString(16).toUpperCase().padStart(2, "0"), code.toString(8), code.toString(2).padStart(8, "0"), char, description];
  }).filter((row) => (filter === "all" || (filter === "printable" ? Number(row[0]) >= 32 : Number(row[0]) < 32)) && row.join(" ").toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search ASCII" />
        <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "printable" | "control")} className={inputClass}><option value="all">All</option><option value="printable">Printable</option><option value="control">Control</option></select>
      </div>
      <TableView headers={["Decimal", "Hex", "Oct", "Binary", "Character", "Description"]} rows={rows} />
    </div>
  );
}

function I18nRef() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WorkspaceCard><h3 className="font-semibold">Language codes</h3><MiniRows rows={languageRows} /></WorkspaceCard>
      <WorkspaceCard><h3 className="font-semibold">Country codes</h3><MiniRows rows={[["US", "United States", "English"], ["GB", "United Kingdom", "English"], ["IN", "India", "Hindi, English"], ["JP", "Japan", "Japanese"], ["DE", "Germany", "German"], ["FR", "France", "French"]]} /></WorkspaceCard>
      <WorkspaceCard><h3 className="font-semibold">Currency codes</h3><MiniRows rows={currencyRows} /></WorkspaceCard>
    </div>
  );
}

function SemverRef() {
  const [version, setVersion] = useState("1.4.2");
  const [range, setRange] = useState("^1.0.0");
  const parsed = parseSemver(version);
  const compatible = parsed && satisfiesRange(version, range);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div><FieldLabel>Version</FieldLabel><input value={version} onChange={(event) => setVersion(event.target.value)} className={monoInputClass} /></div>
        <div><FieldLabel>Range</FieldLabel><input value={range} onChange={(event) => setRange(event.target.value)} className={monoInputClass} /></div>
      </div>
      <WorkspaceCard className={compatible ? "border-emerald-500/40" : "border-red-500/40"}>
        <p className={`text-lg font-semibold ${compatible ? "text-emerald-600" : "text-red-600"}`}>{compatible ? "Compatible" : "Not compatible"}</p>
        <p className="mt-2 text-sm text-muted-foreground">{parsed ? `Major ${parsed.major}, minor ${parsed.minor}, patch ${parsed.patch}` : "Enter a valid semantic version."}</p>
      </WorkspaceCard>
    </div>
  );
}

function UnitsRef() {
  const [category, setCategory] = useState<UnitCategory>("Length");
  const units = unitOptions(category);
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1]);
  const [value, setValue] = useState("1");
  const result = convertUnit(Number(value), category, from, to);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div><FieldLabel>Category</FieldLabel><select value={category} onChange={(event) => { const next = event.target.value as UnitCategory; const nextUnits = unitOptions(next); setCategory(next); setFrom(nextUnits[0]); setTo(nextUnits[1]); }} className={inputClass}>{Object.keys(unitCategories).map((item) => <option key={item}>{item}</option>)}<option>Temperature</option></select></div>
        <div><FieldLabel>Value</FieldLabel><input value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>From</FieldLabel><select value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass}>{unitOptions(category).map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><FieldLabel>To</FieldLabel><select value={to} onChange={(event) => setTo(event.target.value)} className={inputClass}>{unitOptions(category).map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
      <OutputCard label="Converted value" value={Number.isFinite(result) ? String(result) : "Invalid input"} />
    </div>
  );
}

function NumbersRef() {
  const [base, setBase] = useState(10);
  const [value, setValue] = useState("255");
  const parsed = parseBigIntBase(value, base);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div><FieldLabel>Number</FieldLabel><input value={value} onChange={(event) => setValue(event.target.value)} className={monoInputClass} /></div>
        <div><FieldLabel>Input base</FieldLabel><select value={base} onChange={(event) => setBase(Number(event.target.value))} className={inputClass}><option value={2}>Binary</option><option value={8}>Octal</option><option value={10}>Decimal</option><option value={16}>Hex</option></select></div>
      </div>
      {parsed === null ? <WorkspaceCard className="border-red-500/40 text-sm text-red-600">The number is not valid for the selected base.</WorkspaceCard> : (
        <div className="grid gap-3 md:grid-cols-2">
          <OutputCard label="Decimal" value={parsed.toString(10)} />
          <OutputCard label="Binary" value={parsed.toString(2)} />
          <OutputCard label="Octal" value={parsed.toString(8)} />
          <OutputCard label="Hex" value={parsed.toString(16).toUpperCase()} />
        </div>
      )}
    </div>
  );
}

function RomanRef() {
  const [arabic, setArabic] = useState("2026");
  const [roman, setRoman] = useState("MMXXVI");
  const romanOut = numberToRoman(Number(arabic));
  const arabicOut = romanToNumber(roman);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <WorkspaceCard className="space-y-3">
        <FieldLabel>Arabic number</FieldLabel>
        <input value={arabic} onChange={(event) => setArabic(event.target.value)} className={inputClass} />
        <OutputCard label="Roman numeral" value={romanOut || "Enter 1 to 3999"} />
      </WorkspaceCard>
      <WorkspaceCard className="space-y-3">
        <FieldLabel>Roman numeral</FieldLabel>
        <input value={roman} onChange={(event) => setRoman(event.target.value.toUpperCase())} className={monoInputClass} />
        <OutputCard label="Arabic number" value={arabicOut ? String(arabicOut) : "Invalid Roman numeral"} />
      </WorkspaceCard>
    </div>
  );
}

function SearchableTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search" />
      <TableView headers={headers} rows={filtered} />
    </div>
  );
}

function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <WorkspaceCard className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-4 py-2">{header}</th>)}<th /></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.join("-")}-${index}`} className="border-b border-border last:border-b-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="break-all px-4 py-3 font-mono text-xs">{cell}</td>)}<td className="px-4 py-3 text-right"><CopyButton value={row.join("\t")} /></td></tr>)}</tbody>
      </table>
    </WorkspaceCard>
  );
}

function MiniRows({ rows }: { rows: string[][] }) {
  return <div className="mt-3 space-y-2">{rows.map((row) => <div key={row.join("-")} className="border-b border-border pb-2 text-sm last:border-b-0"><p className="font-mono font-medium">{row[0]}</p><p className="text-muted-foreground">{row.slice(1).join(" - ")}</p></div>)}</div>;
}

function OutputCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <CopyButton value={value} />
      </div>
      <p className="mt-3 break-all font-mono text-sm text-foreground">{value}</p>
    </WorkspaceCard>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-xl font-semibold text-foreground">{value}</p>
    </WorkspaceCard>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: readonly (readonly [T, string])[] }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-1">
      {options.map(([id, label]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
    </div>
  );
}

function IconButton({ title, onClick, icon: Icon }: { title: string; onClick: () => void; icon: typeof Bold }) {
  return <button type="button" title={title} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground"><Icon className="h-4 w-4" /></button>;
}

function convertCases(input: string): [string, string][] {
  const parts = words(input);
  const lower = parts.map((part) => part.toLowerCase());
  const pascal = lower.map(capitalize).join("");
  const camel = lower.map((part, index) => index === 0 ? part : capitalize(part)).join("");
  const title = lower.map(capitalize).join(" ");
  return [
    ["camelCase", camel],
    ["PascalCase", pascal],
    ["snake_case", lower.join("_")],
    ["kebab-case", lower.join("-")],
    ["SCREAMING_SNAKE_CASE", lower.join("_").toUpperCase()],
    ["Title Case", title],
    ["dot.case", lower.join(".")],
    ["UPPERCASE", input.toUpperCase()],
    ["lowercase", input.toLowerCase()],
    ["Sentence case", lower.length ? capitalize(lower.join(" ")) : ""],
    ["Train-Case", lower.map(capitalize).join("-")],
  ];
}

function words(input: string) {
  return input.replace(/([a-z])([A-Z])/g, "$1 $2").match(/[A-Za-z0-9]+/g) ?? [];
}

function capitalize(input: string) {
  return input ? input.charAt(0).toUpperCase() + input.slice(1) : "";
}

function lineCount(input: string) {
  return input ? input.split(/\r?\n/).length : 0;
}

function longestWord(input: string) {
  return (input.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g) ?? []).sort((a, b) => b.length - a.length)[0] ?? "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prefixLines(value: string, prefix: string) {
  return value.split(/\r?\n/).filter((line, index, lines) => line || index < lines.length - 1).map((line) => `${prefix}${line}`).join("\n");
}

function controlName(code: number) {
  const names = ["NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "TAB", "LF", "VT", "FF", "CR", "SO", "SI", "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US"];
  return names[code] ?? "DEL";
}

function parseSemver(value: string) {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) } : null;
}

function compareSemver(a: string, b: string) {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) return 0;
  return av.major - bv.major || av.minor - bv.minor || av.patch - bv.patch;
}

function satisfiesRange(version: string, range: string) {
  const parsed = parseSemver(version);
  const raw = range.trim();
  if (!parsed) return false;
  if (raw.startsWith("^")) {
    const base = parseSemver(raw.slice(1));
    return Boolean(base && parsed.major === base.major && compareSemver(version, raw.slice(1)) >= 0);
  }
  if (raw.startsWith("~")) {
    const base = parseSemver(raw.slice(1));
    return Boolean(base && parsed.major === base.major && parsed.minor === base.minor && compareSemver(version, raw.slice(1)) >= 0);
  }
  if (raw.startsWith(">=")) return compareSemver(version, raw.slice(2)) >= 0;
  if (raw.startsWith(">")) return compareSemver(version, raw.slice(1)) > 0;
  if (raw.startsWith("<=")) return compareSemver(version, raw.slice(2)) <= 0;
  if (raw.startsWith("<")) return compareSemver(version, raw.slice(1)) < 0;
  return compareSemver(version, raw) === 0;
}

function unitOptions(category: UnitCategory) {
  return category === "Temperature" ? ["C", "F", "K"] : Object.keys(unitCategories[category]);
}

function convertUnit(value: number, category: UnitCategory, from: string, to: string) {
  if (!Number.isFinite(value)) return NaN;
  if (category === "Temperature") {
    const c = from === "F" ? (value - 32) * 5 / 9 : from === "K" ? value - 273.15 : value;
    return to === "F" ? c * 9 / 5 + 32 : to === "K" ? c + 273.15 : c;
  }
  const map = unitCategories[category] as Record<string, number>;
  return (value * map[from]) / map[to];
}

function parseBigIntBase(value: string, base: number) {
  const clean = value.trim().replace(/^0x/i, "");
  const valid = base === 2 ? /^[01]+$/ : base === 8 ? /^[0-7]+$/ : base === 10 ? /^\d+$/ : /^[0-9a-f]+$/i;
  if (!valid.test(clean)) return null;
  let result = 0n;
  for (const char of clean.toLowerCase()) result = result * BigInt(base) + BigInt(parseInt(char, base));
  return result;
}

function numberToRoman(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return "";
  const pairs: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let rest = value;
  for (const [num, roman] of pairs) {
    while (rest >= num) {
      out += roman;
      rest -= num;
    }
  }
  return out;
}

function romanToNumber(value: string) {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const clean = value.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(clean)) return 0;
  let total = 0;
  for (let index = 0; index < clean.length; index += 1) {
    const current = map[clean[index]];
    const next = map[clean[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return numberToRoman(total) === clean ? total : 0;
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
