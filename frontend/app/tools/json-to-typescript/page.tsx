"use client";

import { useEffect, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Checkbox, CopyButton, Input, Label, Textarea, Toggle } from "@/components/ui";

function cleanName(value: string) {
  const name = value.replace(/[^A-Za-z0-9_]/g, " ").replace(/(?:^|\s)(\w)/g, (_, c: string) => c.toUpperCase()).replace(/\s/g, "");
  return /^[A-Za-z_]/.test(name) ? name : `Type${name}`;
}

function primitive(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return null;
  if (typeof value === "object") return null;
  return typeof value;
}

function generate(value: unknown, rootName: string, useInterface: boolean, optional: boolean, exported: boolean) {
  const defs: string[] = [];
  const seen = new Set<string>();
  const kw = exported ? "export " : "";
  const opt = optional ? "?" : "";

  const infer = (val: unknown, name: string): string => {
    const base = primitive(val);
    if (base) return base;
    if (Array.isArray(val)) {
      if (val.length === 0) return "unknown[]";
      const types = Array.from(new Set(val.map((item) => infer(item, name)).map((type) => type)));
      return `${types.join(" | ")}[]`;
    }
    if (!val || typeof val !== "object") return "unknown";
    const typeName = cleanName(name);
    build(val as Record<string, unknown>, typeName);
    return typeName;
  };

  const build = (obj: Record<string, unknown>, name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    const lines = Object.entries(obj).map(([key, val]) => {
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      return `  ${safeKey}${opt}: ${infer(val, `${name}_${key}`)};`;
    });
    if (useInterface) defs.push(`${kw}interface ${name} {\n${lines.join("\n")}\n}`);
    else defs.push(`${kw}type ${name} = {\n${lines.join("\n")}\n};`);
  };

  infer(value, rootName);
  return defs.reverse().join("\n\n");
}

export default function JsonToTypescriptPage() {
  const [json, setJson] = useState('{\n  "name": "Ada",\n  "tags": ["math", "code"],\n  "profile": { "active": true }\n}');
  const [name, setName] = useState("Root");
  const [kind, setKind] = useState("interface");
  const [optional, setOptional] = useState(false);
  const [exported, setExported] = useState(true);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setOutput(generate(JSON.parse(json), cleanName(name || "Root"), kind === "interface", optional, exported));
        setError("");
      } catch (err) {
        setOutput("");
        setError(err instanceof Error ? err.message : "Invalid JSON.");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [exported, json, kind, name, optional]);

  return (
    <ToolShell slug="json-to-typescript">
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div><Label>JSON</Label><Textarea value={json} onChange={(event) => setJson(event.target.value)} rows={14} /></div>
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div><Label>Interface name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <Toggle value={kind} onChange={setKind} options={[{ label: "interface", value: "interface" }, { label: "type", value: "type" }]} />
            <Checkbox checked={optional} onChange={setOptional} label="Optional properties" />
            <Checkbox checked={exported} onChange={setExported} label="Export keyword" />
          </div>
        </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>TypeScript</Label><CopyButton value={output} /></div>
          <Textarea value={output} readOnly rows={14} />
        </div>
      </div>
    </ToolShell>
  );
}
