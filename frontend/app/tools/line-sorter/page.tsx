"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Checkbox, CopyButton, Label, Textarea, Toggle } from "@/components/ui";

type SortType = "alpha" | "numeric" | "length";
type SortOrder = "asc" | "desc";

export default function LineSorterPage() {
  const [input, setInput] = useState("banana\nApple\n42\n7\napple");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [type, setType] = useState<SortType>("alpha");
  const [dedupe, setDedupe] = useState(false);
  const [trim, setTrim] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);

  const output = useMemo(() => {
    let lines = input.split(/\r?\n/).map((line) => (trim ? line.trim() : line));
    if (dedupe) {
      const seen = new Set<string>();
      lines = lines.filter((line) => {
        const key = ignoreCase ? line.toLowerCase() : line;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    const normalized = (line: string) => (ignoreCase ? line.toLowerCase() : line);
    lines.sort((a, b) => {
      let result = 0;
      if (type === "numeric") result = (Number.parseFloat(a) || 0) - (Number.parseFloat(b) || 0);
      else if (type === "length") result = a.length - b.length || normalized(a).localeCompare(normalized(b));
      else result = normalized(a).localeCompare(normalized(b), undefined, { numeric: true });
      return order === "asc" ? result : -result;
    });
    return lines.join("\n");
  }, [dedupe, ignoreCase, input, order, trim, type]);

  return (
    <ToolShell slug="line-sorter">
      <div className="space-y-5">
        <div>
          <Label>Lines</Label>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} rows={10} />
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Toggle value={order} onChange={(value) => setOrder(value as SortOrder)} options={[{ label: "A-Z", value: "asc" }, { label: "Z-A", value: "desc" }]} />
          <Toggle value={type} onChange={(value) => setType(value as SortType)} options={[{ label: "Alphabetical", value: "alpha" }, { label: "Numerical", value: "numeric" }, { label: "By length", value: "length" }]} />
          <Checkbox checked={dedupe} onChange={setDedupe} label="Remove duplicates" />
          <Checkbox checked={trim} onChange={setTrim} label="Trim whitespace" />
          <Checkbox checked={ignoreCase} onChange={setIgnoreCase} label="Ignore case" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Sorted output ({output ? output.split(/\r?\n/).length : 0} lines)</Label>
            <div className="flex gap-2">
              <CopyButton value={output} />
              <Button variant="ghost" onClick={() => setInput("")}>Clear</Button>
            </div>
          </div>
          <Textarea value={output} readOnly rows={10} />
        </div>
      </div>
    </ToolShell>
  );
}
