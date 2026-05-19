"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, ErrorCard, Label, SuccessCard, Textarea } from "@/components/ui";

export default function XmlValidatorPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const validate = () => {
    const doc = new DOMParser().parseFromString(input, "text/xml");
    const error = doc.querySelector("parsererror");
    setResult(error ? { ok: false, message: error.textContent?.trim() || "Invalid XML" } : { ok: true, message: "Valid XML." });
  };
  return (
    <ToolShell slug="xml-validator">
      <div className="space-y-5">
        <div><Label>XML</Label><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={14} /></div>
        <div className="flex gap-2"><Button variant="primary" onClick={validate} disabled={!input}>Validate</Button><Button variant="ghost" onClick={() => { setInput(""); setResult(null); }}>Clear</Button></div>
        {result?.ok && <SuccessCard><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{result.message}</div></SuccessCard>}
        {result && !result.ok && <ErrorCard>{result.message}</ErrorCard>}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Validates well-formedness only, not against a schema.</p>
      </div>
    </ToolShell>
  );
}
