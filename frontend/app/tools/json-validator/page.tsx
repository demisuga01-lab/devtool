"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Textarea, ErrorCard, SuccessCard, Label } from "@/components/ui";

function findLineColumn(text: string, position: number): { line: number; col: number } {
  const before = text.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

export default function JsonValidatorPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const validate = () => {
    try {
      JSON.parse(input);
      setResult({ ok: true, message: "Valid JSON." });
    } catch (e) {
      let msg = "Invalid JSON.";
      if (e instanceof Error) {
        const m = e.message.match(/position (\d+)/);
        if (m) {
          const { line, col } = findLineColumn(input, parseInt(m[1], 10));
          msg = `${e.message} (line ${line}, column ${col})`;
        } else {
          msg = e.message;
        }
      }
      setResult({ ok: false, message: msg });
    }
  };

  return (
    <ToolShell slug="json-validator">
      <div className="space-y-5">
        <div>
          <Label>JSON to validate</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={14}
            placeholder='{"hello": "world"}'
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={validate} disabled={!input}>Validate</Button>
          <Button variant="ghost" onClick={() => { setInput(""); setResult(null); }}>Clear</Button>
        </div>
        {result?.ok && (
          <SuccessCard>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {result.message}
            </div>
          </SuccessCard>
        )}
        {result && !result.ok && <ErrorCard>{result.message}</ErrorCard>}
      </div>
    </ToolShell>
  );
}
