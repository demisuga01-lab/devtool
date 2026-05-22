"use client";

import { useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Button, ErrorCard, ToolInput, Label, ToolTextarea } from "@/components/tool-ui";

export default function XpathTesterPage() {
  const [xml, setXml] = useState(""), [xpath, setXpath] = useState("//*"), [matches, setMatches] = useState<string[]>([]), [error, setError] = useState("");
  const evaluate = () => { try { const doc = new DOMParser().parseFromString(xml, "text/xml"); const parseError = doc.querySelector("parsererror"); if (parseError) throw new Error(parseError.textContent || "Invalid XML"); const res = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null); const out: string[] = []; let node = res.iterateNext(); while (node) { out.push(node.textContent?.trim() || new XMLSerializer().serializeToString(node)); node = res.iterateNext(); } setMatches(out); setError(""); } catch (e) { setMatches([]); setError(e instanceof Error ? e.message : "XPath failed."); } };
  return <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XPath Tester" }]} title="XPath Tester" description="Test XPath expressions against XML." /><div className="space-y-5"><div><Label>XML</Label><ToolTextarea value={xml} onChange={(e) => setXml(e.target.value)} rows={10} /></div><div><Label>XPath expression</Label><ToolInput value={xpath} onChange={(e) => setXpath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && evaluate()} /></div><div className="flex gap-2"><Button variant="primary" onClick={evaluate} disabled={!xml || !xpath}>Evaluate</Button><Button variant="ghost" onClick={() => { setXml(""); setMatches([]); setError(""); }}>Clear</Button></div>{error && <ErrorCard>{error}</ErrorCard>}<div><Label>Matches: {matches.length}</Label><div className="space-y-2">{matches.map((m, i) => <Panel noPadding key={i} className="p-3 font-mono text-xs">{m || "(empty)"}</Panel>)}</div></div></div></ToolShell>;
}
