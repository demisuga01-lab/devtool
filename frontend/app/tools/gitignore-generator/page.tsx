"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label, Textarea } from "@/components/ui";

const templates: Record<string, string> = {
  Python: "__pycache__/\n*.py[cod]\n.venv/\n.env\n.pytest_cache/\n",
  Node: "node_modules/\nnpm-debug.log*\nyarn-debug.log*\n.env\n",
  Java: "*.class\n*.jar\ntarget/\nbuild/\n.gradle/\n",
  Go: "bin/\n*.test\ncoverage.out\n",
  Rust: "target/\nCargo.lock\n",
  "C++": "build/\n*.o\n*.obj\n*.exe\n",
  Ruby: ".bundle/\nvendor/bundle/\n*.gem\n",
  PHP: "vendor/\ncomposer.lock\n.env\n",
  Swift: ".build/\nPackages/\n*.xcodeproj/xcuserdata/\n",
  Kotlin: "build/\n.gradle/\nout/\n",
  Dart: ".dart_tool/\nbuild/\n.pub-cache/\n",
  R: ".Rhistory\n.RData\n.Rproj.user/\n",
  React: "build/\ndist/\n.env.local\n",
  Vue: "dist/\n.env.local\n",
  Angular: "dist/\n.angular/\n",
  "Next.js": ".next/\nout/\n.vercel/\n",
  Django: "*.sqlite3\nmedia/\nstaticfiles/\n",
  Flask: "instance/\n.webassets-cache\n",
  Spring: "target/\n.mvn/wrapper/maven-wrapper.jar\n",
  Laravel: "storage/*.key\n/public/hot\n",
  Rails: "log/\ntmp/\nstorage/\n",
  "VS Code": ".vscode/*\n!.vscode/settings.json\n",
  JetBrains: ".idea/\n*.iml\n",
  Vim: "*.swp\n*.swo\n",
  Emacs: "*~\n#*#\n",
  macOS: ".DS_Store\n.AppleDouble\n",
  Windows: "Thumbs.db\nDesktop.ini\n",
  Linux: "*~\n.Trash-*/\n",
  Docker: ".docker/\ndocker-compose.override.yml\n",
};
const groups = {
  Languages: ["Python", "Node", "Java", "Go", "Rust", "C++", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "R"],
  Frameworks: ["React", "Vue", "Angular", "Next.js", "Django", "Flask", "Spring", "Laravel", "Rails"],
  Tools: ["VS Code", "JetBrains", "Vim", "Emacs", "macOS", "Windows", "Linux", "Docker"],
};

export default function GitignoreGeneratorPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(["Node", "Next.js", "VS Code"]);
  const output = useMemo(() => selected.map((name) => `# ${name}\n${templates[name]}`).join("\n"), [selected]);
  const filtered = (items: string[]) => items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  const toggle = (name: string) => setSelected((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ".gitignore";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolShell slug="gitignore-generator">
      <div className="space-y-5">
        <div><Label>Search templates</Label><Input value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        {Object.entries(groups).map(([group, items]) => (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{group}</h2>
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered(items).map((name) => (
                <button key={name} type="button" onClick={() => toggle(name)} className={`rounded-2xl border p-3 text-left text-sm shadow-sm ${selected.includes(name) ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"}`}>
                  <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 font-semibold dark:bg-zinc-800">{name.slice(0, 2)}</span>{name}
                </button>
              ))}
            </div>
          </section>
        ))}
        <div className="flex flex-wrap gap-2">{selected.map((name) => <button key={name} type="button" onClick={() => toggle(name)} className="rounded-xl bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{name} x</button>)}</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Generated .gitignore</Label><div className="flex gap-2"><CopyButton value={output} /><Button onClick={download}>Download</Button></div></div>
          <Textarea value={output} readOnly rows={16} />
        </div>
      </div>
    </ToolShell>
  );
}
