"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Button, CopyButton, ToolInput, Label, ToolTextarea } from "@/components/tool-ui";
import { API_BASE } from "@/lib/api";

type RunResult = { stdout?: string; output?: string; stderr?: string };

function pyString(value: string) {
  return JSON.stringify(value);
}

export default function BcryptGeneratorPage() {
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [hash, setHash] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [cost, setCost] = useState(10);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<boolean | null>(null);

  async function runPython(code: string) {
    const res = await fetch(`${API_BASE}/tools/run-code`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ language: "python", version: "3.10.0", code, stdin: "" }),
    });
    const data = (await res.json().catch(() => ({}))) as RunResult & { detail?: string };
    if (!res.ok) throw new Error(data.detail || "Unable to run bcrypt.");
    if (data.stderr) throw new Error(data.stderr);
    return (data.stdout || data.output || "").trim();
  }

  async function generate() {
    setLoading("hash");
    setError("");
    try {
      setHash(await runPython(`import bcrypt\npassword = ${pyString(password)}.encode()\nsalt = bcrypt.gensalt(rounds=${cost})\nhashed = bcrypt.hashpw(password, salt)\nprint(hashed.decode())`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate hash.");
    } finally {
      setLoading("");
    }
  }

  async function verify() {
    setLoading("verify");
    setError("");
    setMatch(null);
    try {
      const result = await runPython(`import bcrypt\npassword = ${pyString(verifyPassword)}.encode()\nhashed = ${pyString(verifyHash)}.encode()\nprint("true" if bcrypt.checkpw(password, hashed) else "false")`);
      setMatch(result === "true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify hash.");
    } finally {
      setLoading("");
    }
  }

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Crypto & Hash" }, { label: "Bcrypt Generator" }]} title="Bcrypt Generator" description="Hash passwords using bcrypt and verify hashes." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel noPadding className="space-y-4 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hash</h2>
          <div>
            <Label>Password</Label>
            <div className="flex gap-2">
              <ToolInput type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              <Button type="button" onClick={() => setShow((value) => !value)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            </div>
          </div>
          <div>
            <Label>Cost factor: {cost}</Label>
            <ToolInput className="w-full accent-emerald-600" type="range" min={4} max={14} value={cost} onChange={(event) => setCost(Number(event.target.value))} />
          </div>
          <Button variant="primary" onClick={generate} disabled={!password || loading === "hash"}>{loading === "hash" ? "Generating..." : "Generate hash"}</Button>
          {hash && <div className="space-y-2"><div className="flex justify-end"><CopyButton value={hash} /></div><ToolTextarea value={hash} readOnly rows={3} /></div>}
        </Panel>
        <Panel noPadding className="space-y-4 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Verify</h2>
          <div><Label>Password</Label><ToolInput type="password" value={verifyPassword} onChange={(event) => setVerifyPassword(event.target.value)} /></div>
          <div><Label>Bcrypt hash</Label><ToolTextarea value={verifyHash} onChange={(event) => setVerifyHash(event.target.value)} rows={3} /></div>
          <Button variant="primary" onClick={verify} disabled={!verifyPassword || !verifyHash || loading === "verify"}>{loading === "verify" ? "Verifying..." : "Verify hash"}</Button>
          {match !== null && <div className={`rounded-2xl border p-4 text-sm ${match ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>{match ? "✓ Password matches" : "✗ Password does not match"}</div>}
        </Panel>
        {error && <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      </div>
    </ToolShell>
  );
}
