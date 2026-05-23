"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from "react";
import {
  ChevronRight,
  Filter,
  LayoutDashboard,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { allTools, intentDefinitions, Tool } from "@/lib/tools";
import type { IntentGroupId, ToolComplexity, ToolInputType, ToolOutputType } from "@/lib/tools";

type ViewMode = "grid" | "list" | "compact";
type SortMode = "popular" | "az" | "new";
type SpecialFilter = "popular" | "new";

type Filters = {
  intent: IntentGroupId | "all";
  inputTypes: ToolInputType[];
  outputTypes: ToolOutputType[];
  complexity: ToolComplexity[];
  special: SpecialFilter[];
};

type RecentTool = {
  name: string;
  href: string;
  iconName: string;
  intentGroup: IntentGroupId;
  visitedAt: number;
};

const inputOptions: { value: ToolInputType; label: string }[] = [
  { value: "text", label: "Text input" },
  { value: "file", label: "File upload" },
  { value: "url", label: "URL or domain" },
  { value: "code", label: "Code" },
  { value: "json", label: "JSON" },
  { value: "none", label: "No input needed" },
];

const outputOptions: { value: ToolOutputType; label: string }[] = [
  { value: "formatted", label: "Formatted output" },
  { value: "generated", label: "Generated content" },
  { value: "converted", label: "Converted format" },
  { value: "analyzed", label: "Analyzed result" },
  { value: "validated", label: "Validated result" },
  { value: "executed", label: "Executed output" },
];

const complexityOptions: { value: ToolComplexity; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "advanced", label: "Advanced" },
];

const specialOptions: { value: SpecialFilter; label: string; icon: typeof Star }[] = [
  { value: "popular", label: "Popular tools", icon: Star },
  { value: "new", label: "Recently added", icon: Sparkles },
];

const intentStyle: Record<IntentGroupId, { icon: string; bg: string; badge: string }> = {
  inspect: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    icon: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  convert: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    icon: "text-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  security: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    icon: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  generate: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    icon: "text-violet-500",
    badge: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
  network: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    icon: "text-rose-500",
    badge: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  },
  text: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    icon: "text-cyan-500",
    badge: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
  },
};

const emptyFilters: Filters = {
  intent: "all",
  inputTypes: [],
  outputTypes: [],
  complexity: [],
  special: [],
};

function parseList<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  const allowedSet = new Set(allowed);
  return value.split(",").filter((item): item is T => allowedSet.has(item as T));
}

function scoreToolMatch(tool: Tool, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  const name = tool.name.toLowerCase();
  const desc = tool.description.toLowerCase();
  const tags = tool.tags.map((tag) => tag.toLowerCase());

  if (name === q) return 100;
  if (name.startsWith(q)) return 85;
  if (name.includes(q)) return 65;
  if (tags.some((tag) => tag === q)) return 55;
  if (tags.some((tag) => tag.includes(q))) return 40;
  if (desc.includes(q)) return 20;
  return 0;
}

function initialState(searchParams: ReturnType<typeof useSearchParams>) {
  const intentParam = searchParams.get("intent");
  const intentIds = intentDefinitions.map((item) => item.id);
  const intent = intentIds.includes(intentParam as IntentGroupId) ? (intentParam as IntentGroupId) : "all";
  return {
    query: searchParams.get("q") || "",
    filters: {
      intent,
      inputTypes: parseList<ToolInputType>(searchParams.get("input"), inputOptions.map((item) => item.value)),
      outputTypes: parseList<ToolOutputType>(searchParams.get("output"), outputOptions.map((item) => item.value)),
      complexity: parseList<ToolComplexity>(searchParams.get("complexity"), complexityOptions.map((item) => item.value)),
      special: parseList<SpecialFilter>(searchParams.get("special"), specialOptions.map((item) => item.value)),
    } satisfies Filters,
    sort: (["popular", "az", "new"].includes(searchParams.get("sort") || "") ? searchParams.get("sort") : "popular") as SortMode,
    view: (["grid", "list", "compact"].includes(searchParams.get("view") || "") ? searchParams.get("view") : "grid") as ViewMode,
  };
}

function hasActiveFilters(filters: Filters) {
  return (
    filters.intent !== "all" ||
    filters.inputTypes.length > 0 ||
    filters.outputTypes.length > 0 ||
    filters.complexity.length > 0 ||
    filters.special.length > 0
  );
}

function passesToolFilters(tool: Tool, filters: Filters) {
  if (filters.intent !== "all" && tool.intentGroup !== filters.intent) return false;
  if (!filters.inputTypes.every((type) => tool.inputType.includes(type))) return false;
  if (!filters.outputTypes.every((type) => tool.outputType.includes(type))) return false;
  if (filters.complexity.length > 0 && !filters.complexity.includes(tool.complexity)) return false;
  if (filters.special.includes("popular") && !tool.isPopular) return false;
  if (filters.special.includes("new") && !tool.isNew) return false;
  return true;
}

function toggleValue<T extends string>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function pillLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ToolsIndex() {
  return (
    <Suspense fallback={<ToolsLoading />}>
      <ToolsDiscoveryPage />
    </Suspense>
  );
}

function ToolsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

function ToolsDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => initialState(searchParams), []);
  const [searchQuery, setSearchQuery] = useState(initial.query);
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sort, setSort] = useState<SortMode>(initial.sort);
  const [view, setView] = useState<ViewMode>(initial.view);
  const [recentTools, setRecentTools] = useState<RecentTool[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (filters.intent !== "all") params.set("intent", filters.intent);
    if (filters.inputTypes.length) params.set("input", filters.inputTypes.join(","));
    if (filters.outputTypes.length) params.set("output", filters.outputTypes.join(","));
    if (filters.complexity.length) params.set("complexity", filters.complexity.join(","));
    if (filters.special.length) params.set("special", filters.special.join(","));
    if (sort !== "popular") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    const query = params.toString();
    router.replace(query ? `/tools?${query}` : "/tools", { scroll: false });
  }, [filters, router, searchQuery, sort, view]);

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem("devtools:recently-used") || "[]") as RecentTool[];
      setRecentTools(existing.slice(0, 6));
    } catch {
      setRecentTools([]);
    }
  }, []);

  useEffect(() => {
    function updateColumns() {
      const width = window.innerWidth;
      if (view === "list") {
        setColumnCount(1);
      } else if (view === "compact") {
        setColumnCount(width >= 1280 ? 8 : width >= 1024 ? 6 : width >= 768 ? 5 : width >= 640 ? 4 : 2);
      } else {
        setColumnCount(width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1);
      }
    }
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [view]);

  const filteredTools = useMemo(() => {
    const filtered = allTools.filter((tool) => passesToolFilters(tool, filters));
    if (debouncedQuery.trim()) {
      return filtered
        .map((tool) => ({ tool, score: scoreToolMatch(tool, debouncedQuery) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || Number(b.tool.isPopular) - Number(a.tool.isPopular) || a.tool.name.localeCompare(b.tool.name))
        .map((item) => item.tool);
    }
    return filtered.slice().sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "new") return Number(b.isNew) - Number(a.isNew) || a.name.localeCompare(b.name);
      return Number(b.isPopular) - Number(a.isPopular) || a.name.localeCompare(b.name);
    });
  }, [debouncedQuery, filters, sort]);

  useEffect(() => {
    setFocusedCardIndex((index) => Math.min(index, Math.max(0, filteredTools.length - 1)));
  }, [filteredTools.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && searchQuery) {
        setSearchQuery("");
        searchInputRef.current?.blur();
        return;
      }
      if (typing || filteredTools.length === 0) return;
      const movement: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columnCount,
        ArrowUp: -columnCount,
      };
      if (event.key in movement) {
        event.preventDefault();
        const next = Math.max(0, Math.min(filteredTools.length - 1, focusedCardIndex + movement[event.key]));
        setFocusedCardIndex(next);
        cardRefs.current[next]?.focus();
      }
      if (event.key === "Enter" && document.activeElement === cardRefs.current[focusedCardIndex]) {
        event.preventDefault();
        router.push(filteredTools[focusedCardIndex].href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [columnCount, filteredTools, focusedCardIndex, router, searchQuery]);

  const activeFilterCount =
    (filters.intent !== "all" ? 1 : 0) +
    filters.inputTypes.length +
    filters.outputTypes.length +
    filters.complexity.length +
    filters.special.length;

  function clearFilters() {
    setFilters(emptyFilters);
    setSearchQuery("");
  }

  function countWith(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    return allTools.filter((tool) => passesToolFilters(tool, merged)).length;
  }

  function removePill(kind: "intent" | "input" | "output" | "complexity" | "special", value?: string) {
    setFilters((current) => {
      if (kind === "intent") return { ...current, intent: "all" };
      if (kind === "input") return { ...current, inputTypes: current.inputTypes.filter((item) => item !== value) };
      if (kind === "output") return { ...current, outputTypes: current.outputTypes.filter((item) => item !== value) };
      if (kind === "complexity") return { ...current, complexity: current.complexity.filter((item) => item !== value) };
      return { ...current, special: current.special.filter((item) => item !== value) };
    });
  }

  function clearRecent() {
    localStorage.removeItem("devtools:recently-used");
    setRecentTools([]);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">Developer Tools</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {allTools.length} tools to format, convert, generate, inspect and run
          </p>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tools..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-28 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-zinc-400 md:inline">
                  Press / to focus
                </span>
              )}
            </div>
            <ViewSortControls view={view} setView={setView} sort={sort} setSort={setSort} />
          </div>
        </header>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Showing {filteredTools.length} tools</p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <ActiveFilterPills filters={filters} removePill={removePill} clearFilters={clearFilters} />
        <RecentlyUsedRow recentTools={recentTools} clearRecent={clearRecent} />

        <div className="flex gap-6">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <FilterContent filters={filters} setFilters={setFilters} countWith={countWith} activeFilterCount={activeFilterCount} clearFilters={clearFilters} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {filteredTools.length === 0 ? (
              <EmptyResults query={debouncedQuery} clearFilters={clearFilters} />
            ) : view === "list" ? (
              <ListView tools={filteredTools} focusedCardIndex={focusedCardIndex} setFocusedCardIndex={setFocusedCardIndex} cardRefs={cardRefs} />
            ) : view === "compact" ? (
              <CompactView tools={filteredTools} focusedCardIndex={focusedCardIndex} setFocusedCardIndex={setFocusedCardIndex} cardRefs={cardRefs} />
            ) : (
              <GridView tools={filteredTools} focusedCardIndex={focusedCardIndex} setFocusedCardIndex={setFocusedCardIndex} cardRefs={cardRefs} />
            )}
          </main>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close filters" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[70vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterContent filters={filters} setFilters={setFilters} countWith={countWith} activeFilterCount={activeFilterCount} clearFilters={clearFilters} />
          </div>
        </div>
      )}
    </div>
  );
}

function ViewSortControls({
  view,
  setView,
  sort,
  setSort,
}: {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  sort: SortMode;
  setSort: (sort: SortMode) => void;
}) {
  const views = [
    { value: "grid" as const, label: "Grid view", icon: LayoutGrid },
    { value: "list" as const, label: "List view", icon: List },
    { value: "compact" as const, label: "Compact view", icon: LayoutDashboard },
  ];
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {views.map((item) => {
          const Icon = item.icon;
          const active = view === item.value;
          return (
            <button
              key={item.value}
              type="button"
              title={item.label}
              onClick={() => setView(item.value)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${active ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <select
        value={sort}
        onChange={(event) => setSort(event.target.value as SortMode)}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="popular">Most Popular</option>
        <option value="az">A to Z</option>
        <option value="new">Recently Added</option>
      </select>
    </div>
  );
}

function ActiveFilterPills({
  filters,
  removePill,
  clearFilters,
}: {
  filters: Filters;
  removePill: (kind: "intent" | "input" | "output" | "complexity" | "special", value?: string) => void;
  clearFilters: () => void;
}) {
  if (!hasActiveFilters(filters)) return null;
  const intent = intentDefinitions.find((item) => item.id === filters.intent);
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {intent && filters.intent !== "all" && <FilterPill label={`Intent: ${intent.label}`} onRemove={() => removePill("intent")} />}
      {filters.inputTypes.map((item) => <FilterPill key={`input-${item}`} label={`Input: ${pillLabel(item)}`} onRemove={() => removePill("input", item)} />)}
      {filters.outputTypes.map((item) => <FilterPill key={`output-${item}`} label={`Output: ${pillLabel(item)}`} onRemove={() => removePill("output", item)} />)}
      {filters.complexity.map((item) => <FilterPill key={`complexity-${item}`} label={`Complexity: ${pillLabel(item)}`} onRemove={() => removePill("complexity", item)} />)}
      {filters.special.map((item) => <FilterPill key={`special-${item}`} label={item === "popular" ? "Popular" : "Recently added"} onRemove={() => removePill("special", item)} />)}
      <button type="button" onClick={clearFilters} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
        Clear all
      </button>
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function RecentlyUsedRow({ recentTools, clearRecent }: { recentTools: RecentTool[]; clearRecent: () => void }) {
  if (!recentTools.length) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-500">Recently used</p>
        <button type="button" onClick={clearRecent} className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Clear
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recentTools.map((recent) => {
          const tool = allTools.find((item) => item.href === recent.href);
          const intent = tool?.intentGroup ?? recent.intentGroup ?? "text";
          const Icon = tool?.icon ?? Search;
          return (
            <Link key={recent.href} href={recent.href} className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-center opacity-90 transition hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${intentStyle[intent].bg}`}>
                <Icon className={`h-4 w-4 ${intentStyle[intent].icon}`} />
              </span>
              <span className="line-clamp-2 text-xs font-medium text-zinc-700 dark:text-zinc-200">{recent.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FilterContent({
  filters,
  setFilters,
  countWith,
  activeFilterCount,
  clearFilters,
}: {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  countWith: (next: Partial<Filters>) => number;
  activeFilterCount: number;
  clearFilters: () => void;
}) {
  return (
    <div className="space-y-4">
      <FilterSection title="INTENT">
        <RadioOption label="All tools" count={countWith({ intent: "all" })} checked={filters.intent === "all"} onChange={() => setFilters((current) => ({ ...current, intent: "all" }))} />
        {intentDefinitions.map((item) => (
          <RadioOption
            key={item.id}
            label={item.label}
            count={countWith({ intent: item.id })}
            checked={filters.intent === item.id}
            onChange={() => setFilters((current) => ({ ...current, intent: item.id }))}
          />
        ))}
      </FilterSection>

      <FilterSection title="INPUT TYPE">
        {inputOptions.map((item) => (
          <CheckboxOption
            key={item.value}
            label={item.label}
            count={countWith({ inputTypes: [...new Set([...filters.inputTypes, item.value])] })}
            checked={filters.inputTypes.includes(item.value)}
            onChange={() => setFilters((current) => ({ ...current, inputTypes: toggleValue(current.inputTypes, item.value) }))}
          />
        ))}
      </FilterSection>

      <FilterSection title="OUTPUT TYPE">
        {outputOptions.map((item) => (
          <CheckboxOption
            key={item.value}
            label={item.label}
            count={countWith({ outputTypes: [...new Set([...filters.outputTypes, item.value])] })}
            checked={filters.outputTypes.includes(item.value)}
            onChange={() => setFilters((current) => ({ ...current, outputTypes: toggleValue(current.outputTypes, item.value) }))}
          />
        ))}
      </FilterSection>

      <FilterSection title="COMPLEXITY">
        {complexityOptions.map((item) => (
          <CheckboxOption
            key={item.value}
            label={item.label}
            count={countWith({ complexity: [...new Set([...filters.complexity, item.value])] })}
            checked={filters.complexity.includes(item.value)}
            onChange={() => setFilters((current) => ({ ...current, complexity: toggleValue(current.complexity, item.value) }))}
          />
        ))}
      </FilterSection>

      <FilterSection title="SPECIAL">
        {specialOptions.map((item) => {
          const Icon = item.icon;
          return (
            <CheckboxOption
              key={item.value}
              label={item.label}
              count={countWith({ special: [...new Set([...filters.special, item.value])] })}
              checked={filters.special.includes(item.value)}
              onChange={() => setFilters((current) => ({ ...current, special: toggleValue(current.special, item.value) }))}
              icon={<Icon className="h-3 w-3" />}
            />
          );
        })}
      </FilterSection>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function RadioOption({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <input type="radio" checked={checked} onChange={onChange} className="h-4 w-4 accent-emerald-500" />
      <span className={`min-w-0 flex-1 truncate ${checked ? "font-semibold text-zinc-950 dark:text-zinc-50" : ""}`}>{label}</span>
      <span className="text-xs text-zinc-400">({count})</span>
    </label>
  );
}

function CheckboxOption({ label, count, checked, onChange, icon }: { label: string; count: number; checked: boolean; onChange: () => void; icon?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded accent-emerald-500" />
      {icon}
      <span className={`min-w-0 flex-1 truncate ${checked ? "font-semibold text-zinc-950 dark:text-zinc-50" : ""}`}>{label}</span>
      <span className="text-xs text-zinc-400">({count})</span>
    </label>
  );
}

function ToolIcon({ tool, size = "md" }: { tool: Tool; size?: "sm" | "md" }) {
  const Icon = tool.icon;
  return (
    <span className={`flex ${size === "sm" ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg"} shrink-0 items-center justify-center ${intentStyle[tool.intentGroup].bg}`}>
      <Icon className={`h-4 w-4 ${intentStyle[tool.intentGroup].icon}`} />
    </span>
  );
}

function GridView({
  tools,
  focusedCardIndex,
  setFocusedCardIndex,
  cardRefs,
}: {
  tools: Tool[];
  focusedCardIndex: number;
  setFocusedCardIndex: (index: number) => void;
  cardRefs: MutableRefObject<Array<HTMLAnchorElement | null>>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((tool, index) => (
        <Link
          key={tool.slug}
          ref={(node) => {
            cardRefs.current[index] = node;
          }}
          href={tool.href}
          tabIndex={0}
          onFocus={() => setFocusedCardIndex(index)}
          className={`group rounded-xl border bg-white p-4 shadow-sm outline-none transition duration-150 hover:border-emerald-500 hover:bg-zinc-50 hover:shadow-[0_4px_12px_rgba(5,150,105,0.1)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-900 dark:hover:bg-zinc-900/80 ${focusedCardIndex === index ? "border-emerald-500" : "border-zinc-200 dark:border-zinc-800"}`}
        >
          <div className="flex items-start gap-3">
            <ToolIcon tool={tool} />
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{tool.name}</h2>
            <div className="flex shrink-0 items-center gap-1">
              {tool.isNew && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">New</span>}
              {tool.isPopular && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            </div>
          </div>
          <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">{tool.description}</p>
          <ToolTypePills tool={tool} />
        </Link>
      ))}
    </div>
  );
}

function ListView({
  tools,
  focusedCardIndex,
  setFocusedCardIndex,
  cardRefs,
}: {
  tools: Tool[];
  focusedCardIndex: number;
  setFocusedCardIndex: (index: number) => void;
  cardRefs: MutableRefObject<Array<HTMLAnchorElement | null>>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {tools.map((tool, index) => {
        const intent = intentDefinitions.find((item) => item.id === tool.intentGroup);
        return (
          <Link
            key={tool.slug}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            href={tool.href}
            onFocus={() => setFocusedCardIndex(index)}
            className={`flex h-12 items-center gap-3 border-l-2 px-3 outline-none transition hover:border-emerald-500 hover:bg-zinc-50 focus:border-emerald-500 focus:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:focus:bg-zinc-800/50 ${focusedCardIndex === index ? "border-emerald-500" : "border-transparent"}`}
          >
            <ToolIcon tool={tool} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{tool.name}</div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{tool.description}</div>
            </div>
            <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium md:inline ${intentStyle[tool.intentGroup].badge}`}>{intent?.shortLabel}</span>
            <div className="hidden max-w-64 shrink-0 overflow-hidden lg:block">
              <ToolTypePills tool={tool} compact />
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
          </Link>
        );
      })}
    </div>
  );
}

function CompactView({
  tools,
  focusedCardIndex,
  setFocusedCardIndex,
  cardRefs,
}: {
  tools: Tool[];
  focusedCardIndex: number;
  setFocusedCardIndex: (index: number) => void;
  cardRefs: MutableRefObject<Array<HTMLAnchorElement | null>>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {tools.map((tool, index) => (
        <Link
          key={tool.slug}
          ref={(node) => {
            cardRefs.current[index] = node;
          }}
          href={tool.href}
          title={`${tool.name}: ${tool.description}`}
          onFocus={() => setFocusedCardIndex(index)}
          className={`flex flex-col items-center gap-2 rounded-lg p-2 text-center outline-none transition hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 ${focusedCardIndex === index ? "ring-2 ring-emerald-500/30" : ""}`}
        >
          <ToolIcon tool={tool} />
          <span className="w-full truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">{tool.name}</span>
        </Link>
      ))}
    </div>
  );
}

function ToolTypePills({ tool, compact = false }: { tool: Tool; compact?: boolean }) {
  const pills = [
    ...tool.inputType.map((item) => ({ label: pillLabel(item), className: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" })),
    ...tool.outputType.map((item) => ({ label: pillLabel(item), className: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" })),
  ];
  const visible = pills.slice(0, compact ? 2 : 3);
  const remaining = pills.length - visible.length;
  return (
    <div className={`mt-2 flex flex-wrap gap-1 ${compact ? "mt-0" : ""}`}>
      {visible.map((pill) => (
        <span key={`${tool.slug}-${pill.label}`} className={`rounded-full px-2 py-0.5 text-xs ${pill.className}`}>
          {pill.label}
        </span>
      ))}
      {remaining > 0 && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">+{remaining} more</span>}
    </div>
  );
}

function EmptyResults({ query, clearFilters }: { query: string; clearFilters: () => void }) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <Search className="h-10 w-10 text-zinc-400" />
      <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No tools found</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {query ? `No results for '${query}'` : "No tools match the selected filters"}
      </p>
      <button type="button" onClick={clearFilters} className="mt-5 rounded-xl border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
        Clear all filters
      </button>
      <p className="mt-4 text-xs text-zinc-400">Try searching for 'json', 'password', or 'dns'</p>
    </div>
  );
}
