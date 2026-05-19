"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CodeBlock, CopyButton, ErrorCard, Label, Textarea } from "@/components/ui";

const sampleXml = `<catalog>
  <book><title>Clean Code</title><author>Robert C. Martin</author></book>
  <book><title>Refactoring</title><author>Martin Fowler</author></book>
</catalog>`;

const sampleXslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <table>
      <xsl:for-each select="catalog/book">
        <tr><td><xsl:value-of select="title"/></td><td><xsl:value-of select="author"/></td></tr>
      </xsl:for-each>
    </table>
  </xsl:template>
</xsl:stylesheet>`;

function parseXml(text: string, label: string): XMLDocument {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error(`Invalid ${label}`);
  return doc;
}

export default function XsltTransformerPage() {
  const [xml, setXml] = useState(sampleXml);
  const [xslt, setXslt] = useState(sampleXslt);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const transform = () => {
    try {
      const xmlDoc = parseXml(xml, "XML input");
      const xsltDoc = parseXml(xslt, "XSLT stylesheet");
      const processor = new XSLTProcessor();
      processor.importStylesheet(xsltDoc);
      const result = processor.transformToFragment(xmlDoc, document);
      setOutput(new XMLSerializer().serializeToString(result));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Transform failed.");
    }
  };

  return (
    <ToolShell slug="xslt-transformer">
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>XML</Label>
            <Textarea value={xml} onChange={(e) => setXml(e.target.value)} rows={14} />
          </div>
          <div>
            <Label>XSLT</Label>
            <Textarea value={xslt} onChange={(e) => setXslt(e.target.value)} rows={14} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={transform} disabled={!xml || !xslt}>Transform</Button>
          <Button variant="ghost" onClick={() => { setXml(""); setXslt(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Transformation runs in your browser using the built-in XSLTProcessor API.</p>
      </div>
    </ToolShell>
  );
}
