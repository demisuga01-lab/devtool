"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, Label, ToolTextarea } from "@/components/tool-ui";
import { InlineError, SuccessBanner, explainXmlError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

export default function XmlValidatorPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [valid, setValid] = useState(false);

  const validate = () => {
    if (!input.trim()) {
      setError(null);
      setValid(false);
      return;
    }
    const doc = new DOMParser().parseFromString(input, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      setValid(false);
      setError(explainXmlError(parseError.textContent || ""));
    } else {
      setError(null);
      setValid(true);
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XML Validator" }]} title="XML Validator" description="Check if XML is well-formed." />
      <div className="space-y-5">
        <div>
          <Label>XML</Label>
          <ToolTextarea value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value.trim()) { setError(null); setValid(false); } }} rows={14} />
          {error && <InlineError error={error} />}
        </div>
        <div className="flex gap-2"><Button variant="primary" onClick={validate} disabled={!input}>Validate</Button><Button variant="ghost" onClick={() => { setInput(""); setError(null); setValid(false); }}>Clear</Button></div>
        {valid && <SuccessBanner><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Valid XML.</div></SuccessBanner>}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Validates well-formedness only, not against a schema.</p>
      </div>
    </ToolShell>
  );
}
