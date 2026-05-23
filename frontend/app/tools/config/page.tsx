"use client";

import { useMemo, useState } from "react";
import { Award, Box, Cpu, Download, GitBranch, GitCompare, KeyRound, Server, Settings } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { NewToolPage } from "../_components/new-tool-pages";
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

type Tab = "yaml" | "docker" | "nginx" | "systemd" | "env" | "gitignore" | "badges";
type EnvRow = { id: string; key: string; value: string; hidden: boolean };
type ExportMode = "env" | "json" | "shell" | "docker" | "k8s";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "yaml", label: "YAML Diff", icon: GitCompare },
  { id: "docker", label: "Docker Compose", icon: Box },
  { id: "nginx", label: "Nginx", icon: Server },
  { id: "systemd", label: "Systemd", icon: Cpu },
  { id: "env", label: "Env Manager", icon: KeyRound },
  { id: "gitignore", label: "Gitignore", icon: GitBranch },
  { id: "badges", label: "Badges", icon: Award },
];

const gitignoreTemplates: Record<string, string> = {
  Node: "node_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-store/\n.env\n.env.local\ndist/\nbuild/\n.next/\ncoverage/\n",
  Python: "__pycache__/\n*.py[cod]\n.pytest_cache/\n.mypy_cache/\n.venv/\nvenv/\ndist/\nbuild/\n*.egg-info/\n.env\n",
  Java: "*.class\n*.jar\n*.war\n.gradle/\nbuild/\nout/\ntarget/\n",
  Go: "bin/\n*.test\n*.out\nvendor/\n",
  Rust: "target/\nCargo.lock\n",
  Ruby: ".bundle/\nvendor/bundle/\nlog/\ntmp/\n*.gem\n",
  PHP: "vendor/\ncomposer.lock\n.env\n",
  "C": "*.o\n*.obj\n*.exe\n*.out\n",
  "C++": "*.o\n*.obj\n*.exe\n*.out\nCMakeFiles/\nCMakeCache.txt\n",
  Swift: ".build/\nPackages/\nxcuserdata/\nDerivedData/\n",
  React: "build/\ndist/\n.env.local\n",
  Vue: "dist/\n.env.local\n",
  Angular: "dist/\n.angular/\n",
  "Next.js": ".next/\nout/\n.vercel/\n.env*.local\n",
  Django: "*.log\nlocal_settings.py\ndb.sqlite3\nmedia/\nstaticfiles/\n",
  Laravel: "/vendor/\n/node_modules/\n/public/hot\n/storage/*.key\n.env\n",
  Rails: "log/\ntmp/\n/db/*.sqlite3\n/public/assets\n.storage/\n",
  Docker: "*.pid\n.docker/\ndocker-compose.override.yml\n",
  macOS: ".DS_Store\n.AppleDouble\n.LSOverride\n",
  Windows: "Thumbs.db\nDesktop.ini\n$RECYCLE.BIN/\n",
  Linux: "*~\n.fuse_hidden*\n.Trash-*\n",
  JetBrains: ".idea/\n*.iml\n",
  VSCode: ".vscode/*\n!.vscode/extensions.json\n",
  Vim: "*.swp\n*.swo\nSession.vim\n",
};

export default function ConfigWorkspacePage() {
  const [active, setActive] = useState<Tab>("yaml");

  return (
    <WorkspaceShell
      title="Config Tools"
      subtitle="Validate, diff, and generate configuration files"
      href="/tools/config"
      icon={Settings}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="config"
      intentGroup="inspect"
    >
      {active === "yaml" && <NewToolPage slug="yaml-diff" embedded />}
      {active === "docker" && <NewToolPage slug="docker-compose-validator" embedded />}
      {active === "nginx" && <NewToolPage slug="nginx-config-checker" embedded />}
      {active === "systemd" && <NewToolPage slug="systemd-unit-generator" embedded />}
      {active === "env" && <EnvManagerTab />}
      {active === "gitignore" && <GitignoreTab />}
      {active === "badges" && <StatusBadgesTab />}
    </WorkspaceShell>
  );
}

function EnvManagerTab() {
  const [rows, setRows] = useState<EnvRow[]>(() => [{ id: "row-1", key: "API_URL", value: "https://api.example.com", hidden: false }]);
  const [importText, setImportText] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(false);
  const [mode, setMode] = useState<ExportMode>("env");
  const [confirmClear, setConfirmClear] = useState(false);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => row.key.toLowerCase().includes(query.toLowerCase()));
    return sort ? filtered.slice().sort((a, b) => a.key.localeCompare(b.key)) : filtered;
  }, [query, rows, sort]);

  const exported = useMemo(() => exportRows(rows.filter((row) => row.key.trim()), mode), [mode, rows]);

  function update(id: string, patch: Partial<EnvRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow() {
    setRows((current) => [...current, { id: `row-${Date.now()}`, key: "", value: "", hidden: true }]);
  }

  function importEnv() {
    const parsed = importText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
      const index = line.indexOf("=");
      const key = index >= 0 ? line.slice(0, index).trim() : line;
      const value = index >= 0 ? line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "") : "";
      return { id: `row-${key}-${Math.random().toString(36).slice(2)}`, key, value, hidden: true };
    });
    if (parsed.length) setRows(parsed);
  }

  function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setRows([]);
    setConfirmClear(false);
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="border-amber-500/40 bg-amber-50/50 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
        Stored in browser only - never store production secrets.
      </WorkspaceCard>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={addRow}>Add row</SecondaryButton>
        <SecondaryButton onClick={() => setSort((value) => !value)}>{sort ? "Unsort" : "Sort by key"}</SecondaryButton>
        <SecondaryButton onClick={clearAll}>{confirmClear ? "Confirm clear all" : "Clear all"}</SecondaryButton>
      </div>
      <div><FieldLabel>Search</FieldLabel><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Filter by key" /></div>
      <WorkspaceCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Key</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Actions</th></tr></thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3"><input value={row.key} onChange={(event) => update(row.id, { key: event.target.value })} className={inputClass} /></td>
                <td className="px-4 py-3"><input type={row.hidden ? "password" : "text"} value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} className={inputClass} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <SecondaryButton onClick={() => update(row.id, { hidden: !row.hidden })}>{row.hidden ? "Show" : "Hide"}</SecondaryButton>
                    <SecondaryButton onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>Remove</SecondaryButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspaceCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard className="space-y-3">
          <FieldLabel>Import .env block</FieldLabel>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className={`${textareaClass} min-h-[180px]`} placeholder={"API_URL=https://api.example.com\nTOKEN=secret"} />
          <PrimaryButton onClick={importEnv}>Import</PrimaryButton>
        </WorkspaceCard>
        <WorkspaceCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><FieldLabel>Export format</FieldLabel><select value={mode} onChange={(event) => setMode(event.target.value as ExportMode)} className={inputClass}><option value="env">.env</option><option value="json">JSON</option><option value="shell">Shell exports</option><option value="docker">Docker flags</option><option value="k8s">K8s base64</option></select></div>
            <CopyButton value={exported} label="Copy" />
          </div>
          <textarea value={exported} readOnly className={`${textareaClass} min-h-[220px]`} />
        </WorkspaceCard>
      </div>
    </div>
  );
}

function GitignoreTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(["Node", "Next.js", "VSCode", "macOS"]);
  const output = useMemo(() => {
    const chunks = selected.map((name) => `# ${name}\n${gitignoreTemplates[name].trim()}\n`);
    return Array.from(new Set(chunks.join("\n").split(/\r?\n/))).join("\n").trim() + "\n";
  }, [selected]);
  const options = Object.keys(gitignoreTemplates).filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  function toggle(name: string) {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-4">
        <div><FieldLabel>Search technologies</FieldLabel><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Node, Python, Docker..." /></div>
        <WorkspaceCard>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((name) => (
              <label key={name} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} className="h-4 w-4 accent-emerald-600" />
                {name}
              </label>
            ))}
          </div>
        </WorkspaceCard>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <FieldLabel>Generated .gitignore</FieldLabel>
          <div className="flex gap-2">
            <CopyButton value={output} label="Copy" />
            <SecondaryButton onClick={() => downloadText(".gitignore", output)}>Download</SecondaryButton>
          </div>
        </div>
        <textarea value={output} readOnly className={`${textareaClass} min-h-[520px]`} />
        <p className="mt-2 text-xs text-muted-foreground">{selected.length} templates selected.</p>
      </div>
    </div>
  );
}

function StatusBadgesTab() {
  const [label, setLabel] = useState("build");
  const [status, setStatus] = useState("passing");
  const [color, setColor] = useState("green");
  const [customColor, setCustomColor] = useState("#10b981");
  const [style, setStyle] = useState("flat");
  const actualColor = color === "custom" ? customColor : color;
  const svg = badgeSvg(label, status, actualColor, style);
  const svgData = svgDataUri(svg);
  const shields = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(status)}-${encodeURIComponent(actualColor.replace("#", ""))}?style=${style}`;
  const markdown = `[![${label}](${shields})](https://devtools.wellfriend.online/status)`;
  const html = `<img src="${shields}" alt="${label}: ${status}">`;
  const presets = [
    ["build", "passing", "green"],
    ["build", "failing", "red"],
    ["uptime", "99.9%", "green"],
    ["version", "1.0", "blue"],
    ["license", "MIT", "gray"],
  ];

  return (
    <div className="space-y-5">
      <WorkspaceCard>
        <div className="grid gap-4 lg:grid-cols-5">
          <div>
            <FieldLabel>Label</FieldLabel>
            <input value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <input value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Color</FieldLabel>
            <select value={color} onChange={(event) => setColor(event.target.value)} className={inputClass}>
              {["green", "yellow", "red", "blue", "gray", "orange", "custom"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Style</FieldLabel>
            <select value={style} onChange={(event) => setStyle(event.target.value)} className={inputClass}>
              {["flat", "flat-square", "for-the-badge"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Custom hex</FieldLabel>
            <input type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} className={`${inputClass} h-11 p-1`} />
          </div>
        </div>
      </WorkspaceCard>
      <div className="flex flex-wrap gap-2">
        {presets.map(([presetLabel, presetStatus, presetColor]) => (
          <SecondaryButton key={`${presetLabel}-${presetStatus}`} onClick={() => { setLabel(presetLabel); setStatus(presetStatus); setColor(presetColor); }}>
            {presetLabel} {presetStatus}
          </SecondaryButton>
        ))}
      </div>
      <WorkspaceCard className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgData} alt={`${label}: ${status}`} className="mx-auto h-auto max-w-full" />
      </WorkspaceCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <BadgeOutput label="SVG code" value={svg} />
        <BadgeOutput label="Markdown" value={markdown} />
        <BadgeOutput label="HTML img tag" value={html} />
        <BadgeOutput label="Shields URL" value={shields} />
      </div>
      <SecondaryButton onClick={() => downloadText(`${label}-${status}.svg`, svg)}>
        <Download className="h-4 w-4" />
        Download SVG
      </SecondaryButton>
    </div>
  );
}

function BadgeOutput({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <div className="mb-2 flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <CopyButton value={value} label="Copy" />
      </div>
      <textarea value={value} readOnly className={`${textareaClass} min-h-[140px]`} />
    </WorkspaceCard>
  );
}

function badgeSvg(label: string, status: string, color: string, style: string) {
  const colors: Record<string, string> = { green: "#10b981", yellow: "#f59e0b", red: "#ef4444", blue: "#3b82f6", gray: "#71717a", orange: "#f97316" };
  const right = colors[color] ?? color;
  const labelWidth = Math.max(60, label.length * 9 + 20);
  const statusWidth = Math.max(70, status.length * 9 + 20);
  const height = style === "for-the-badge" ? 28 : 22;
  const radius = style === "flat-square" ? 0 : 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth + statusWidth}" height="${height}" role="img" aria-label="${escapeXml(label)}: ${escapeXml(status)}"><rect width="${labelWidth}" height="${height}" fill="#555" rx="${radius}"/><rect x="${labelWidth}" width="${statusWidth}" height="${height}" fill="${right}" rx="${radius}"/><text x="${labelWidth / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="#fff" font-family="Verdana,sans-serif" font-size="11">${escapeXml(label)}</text><text x="${labelWidth + statusWidth / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="#fff" font-family="Verdana,sans-serif" font-size="11">${escapeXml(status)}</text></svg>`;
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function exportRows(rows: EnvRow[], mode: ExportMode) {
  const clean = rows.map((row) => [row.key.trim(), row.value] as const).filter(([key]) => key);
  if (mode === "json") return JSON.stringify(Object.fromEntries(clean), null, 2);
  if (mode === "shell") return clean.map(([key, value]) => `export ${key}=${JSON.stringify(value)}`).join("\n");
  if (mode === "docker") return clean.map(([key, value]) => `-e ${key}=${JSON.stringify(value)}`).join(" ");
  if (mode === "k8s") return clean.map(([key, value]) => `  ${key}: ${toBase64(value)}`).join("\n");
  return clean.map(([key, value]) => `${key}=${quoteEnv(value)}`).join("\n");
}

function quoteEnv(value: string) {
  return /[\s#"'\\]/.test(value) ? JSON.stringify(value) : value;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function toBase64(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "utf8").toString("base64");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
