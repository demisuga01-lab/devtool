"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ToolShell, Panel } from "@/components/tool-ui";
import { Button, Checkbox, CopyButton, ToolInput, Label, ToolSelect, ToolTextarea, TabBar, CodeBlock } from "@/components/tool-ui";

type Header = { id: number; key: string; value: string };
type AuthMode = "none" | "basic" | "bearer";

const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const bodyMethods = new Set(["POST", "PUT", "PATCH"]);

function quote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function tokenizeCurl(input: string) {
  const tokens: string[] = [];
  let current = "";
  let quoteChar = "";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoteChar) {
      if (char === quoteChar) quoteChar = "";
      else current += char;
    } else if (char === "'" || char === '"') {
      quoteChar = char;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function curlToFetch(input: string) {
  const tokens = tokenizeCurl(input.replace(/\\\r?\n/g, " "));
  const headers: Record<string, string> = {};
  let method = "GET";
  let url = "";
  let body = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "curl") continue;
    if (token === "-X" || token === "--request") method = tokens[++i]?.toUpperCase() || method;
    else if (token === "-H" || token === "--header") {
      const raw = tokens[++i] || "";
      const index = raw.indexOf(":");
      if (index > -1) headers[raw.slice(0, index).trim()] = raw.slice(index + 1).trim();
    } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      body = tokens[++i] || "";
      if (method === "GET") method = "POST";
    } else if (!token.startsWith("-") && !url) {
      url = token;
    }
  }
  const options: string[] = [`method: ${JSON.stringify(method)}`];
  if (Object.keys(headers).length) options.push(`headers: ${JSON.stringify(headers, null, 2)}`);
  if (body) options.push(`body: ${JSON.stringify(body)}`);
  return `const response = await fetch(${JSON.stringify(url || "https://example.com")}, {\n  ${options.join(",\n  ")}\n});\n\nconst data = await response.text();\nconsole.log(data);`;
}

export default function CurlBuilderPage() {
  const [mode, setMode] = useState("builder");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.example.com/users");
  const [headers, setHeaders] = useState<Header[]>([{ id: 1, key: "Accept", value: "application/json" }]);
  const [body, setBody] = useState("{\n  \"name\": \"Ada\"\n}");
  const [contentType, setContentType] = useState("application/json");
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [bearer, setBearer] = useState("");
  const [follow, setFollow] = useState(true);
  const [insecure, setInsecure] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [outputFile, setOutputFile] = useState("");
  const [curlInput, setCurlInput] = useState("curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\":\"Ada\"}'");

  const command = useMemo(() => {
    const parts = ["curl"];
    if (follow) parts.push("-L");
    if (insecure) parts.push("-k");
    if (verbose) parts.push("-v");
    parts.push("-X", method, quote(url || "https://example.com"));
    const finalHeaders = [...headers.filter((item) => item.key.trim())];
    if (bodyMethods.has(method) && contentType) finalHeaders.push({ id: -1, key: "Content-Type", value: contentType });
    if (authMode === "bearer" && bearer) finalHeaders.push({ id: -2, key: "Authorization", value: `Bearer ${bearer}` });
    finalHeaders.forEach((header) => parts.push("-H", quote(`${header.key}: ${header.value}`)));
    if (authMode === "basic" && (basicUser || basicPass)) parts.push("-u", quote(`${basicUser}:${basicPass}`));
    if (bodyMethods.has(method) && body) parts.push("--data-raw", quote(body));
    if (outputFile) parts.push("-o", quote(outputFile));
    return parts.join(" ");
  }, [authMode, basicPass, basicUser, bearer, body, contentType, follow, headers, insecure, method, outputFile, url, verbose]);

  const fetchCode = useMemo(() => curlToFetch(curlInput), [curlInput]);

  return (
    <ToolShell slug="curl-builder">
      <div className="space-y-5">
        <TabBar active={mode} onChange={setMode} tabs={[{ label: "Builder to cURL", value: "builder" }, { label: "cURL to Fetch", value: "fetch" }]} />

        {mode === "builder" ? (
          <>
            <Panel noPadding className="p-5">
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <div>
                  <Label>Method</Label>
                  <ToolSelect value={method} onChange={(event) => setMethod(event.target.value)}>
                    {methods.map((item) => <option key={item}>{item}</option>)}
                  </ToolSelect>
                </div>
                <div>
                  <Label>URL</Label>
                  <ToolInput value={url} onChange={(event) => setUrl(event.target.value)} />
                </div>
              </div>
            </Panel>

            <Panel noPadding className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Headers</h2>
                <Button onClick={() => setHeaders((items) => [...items, { id: Date.now(), key: "", value: "" }])}><Plus className="h-4 w-4" /> Add</Button>
              </div>
              <div className="space-y-2">
                {headers.map((header) => (
                  <div key={header.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <ToolInput value={header.key} onChange={(event) => setHeaders((items) => items.map((item) => item.id === header.id ? { ...item, key: event.target.value } : item))} placeholder="Header" />
                    <ToolInput value={header.value} onChange={(event) => setHeaders((items) => items.map((item) => item.id === header.id ? { ...item, value: event.target.value } : item))} placeholder="Value" />
                    <Button variant="ghost" onClick={() => setHeaders((items) => items.filter((item) => item.id !== header.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </Panel>

            {bodyMethods.has(method) && (
              <Panel noPadding className="p-5">
                <Label>Content type</Label>
                <ToolSelect value={contentType} onChange={(event) => setContentType(event.target.value)} className="mb-3">
                  <option>application/json</option>
                  <option>application/x-www-form-urlencoded</option>
                  <option>text/plain</option>
                  <option>multipart/form-data</option>
                </ToolSelect>
                <Label>Body</Label>
                <ToolTextarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} />
              </Panel>
            )}

            <Panel noPadding className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Auth</Label>
                  <ToolSelect value={authMode} onChange={(event) => setAuthMode(event.target.value as AuthMode)}>
                    <option value="none">None</option>
                    <option value="basic">Basic</option>
                    <option value="bearer">Bearer token</option>
                  </ToolSelect>
                </div>
                {authMode === "bearer" && <div><Label>Token</Label><ToolInput value={bearer} onChange={(event) => setBearer(event.target.value)} /></div>}
                {authMode === "basic" && (
                  <>
                    <div><Label>Username</Label><ToolInput value={basicUser} onChange={(event) => setBasicUser(event.target.value)} /></div>
                    <div><Label>Password</Label><ToolInput type="password" value={basicPass} onChange={(event) => setBasicPass(event.target.value)} /></div>
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                <Checkbox checked={follow} onChange={setFollow} label="Follow redirects" />
                <Checkbox checked={insecure} onChange={setInsecure} label="Insecure" />
                <Checkbox checked={verbose} onChange={setVerbose} label="Verbose" />
              </div>
              <div className="mt-4">
                <Label>Output file</Label>
                <ToolInput value={outputFile} onChange={(event) => setOutputFile(event.target.value)} placeholder="response.json" />
              </div>
            </Panel>

            <Panel noPadding className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Generated cURL</h2>
                <CopyButton value={command} />
              </div>
              <CodeBlock value={command} />
            </Panel>
          </>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel noPadding className="p-5">
              <Label>cURL command</Label>
              <ToolTextarea value={curlInput} onChange={(event) => setCurlInput(event.target.value)} rows={14} />
            </Panel>
            <Panel noPadding className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">fetch()</h2>
                <CopyButton value={fetchCode} />
              </div>
              <CodeBlock value={fetchCode} />
            </Panel>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
