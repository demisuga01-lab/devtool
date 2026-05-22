"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, ToolTextarea, Label } from "@/components/tool-ui";
import { InlineError, SuccessBanner, explainJsonError, jsonTypeInfo } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

type JsonToolError = ToolError & { line?: number; column?: number };

export default function JsonValidatorPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<JsonToolError | null>(null);
  const [validInfo, setValidInfo] = useState("");

  const validate = () => {
    if (!input.trim()) {
      setError(null);
      setValidInfo("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setError(null);
      setValidInfo(jsonTypeInfo(parsed));
    } catch (e) {
      setValidInfo("");
      setError(explainJsonError(input, e));
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Text & Format" }, { label: "JSON Validator" }]} title="JSON Validator" description="Validate JSON and pinpoint syntax errors." />
      <div className="space-y-5">
        <div>
          <Label>JSON to validate</Label>
          <ToolTextarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value.trim()) {
                setError(null);
                setValidInfo("");
              }
            }}
            rows={14}
            placeholder='{"hello": "world"}'
          />
          {error && <InlineError error={error} />}
          {error?.line && <p className="mt-1 text-xs text-red-500">Error near line {error.line}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setError(null); setValidInfo(""); }}>Clear</Button>
        </div>
        {validInfo && (
          <SuccessBanner>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid JSON. {validInfo}.</span>
            </div>
          </SuccessBanner>
        )}
      </div>
    </ToolShell>
  );
}
