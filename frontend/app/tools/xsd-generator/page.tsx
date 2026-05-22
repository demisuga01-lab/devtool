"use client";

import { useState } from "react";
import { XMLParser } from "fast-xml-parser";
import { ToolShell, ToolHeader } from "@/components/tool-ui";
import { Button, CodeBlock, CopyButton, ErrorCard, ToolInput, Label, ToolSelect, ToolTextarea } from "@/components/tool-ui";

const sample = "<person><name>John</name><age>30</age><active>true</active></person>";

function typeOfValue(value: unknown): string {
  if (typeof value === "boolean") return "xs:boolean";
  if (typeof value === "number") return "xs:decimal";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return "xs:date";
  return "xs:string";
}

function elementToXsd(name: string, value: unknown, level: number): string[] {
  const pad = "  ".repeat(level);
  if (Array.isArray(value)) {
    return elementToXsd(name, value[0] ?? "", level).map((line) =>
      line.includes(`<xs:element name="${name}"`) ? line.replace("/>", ' maxOccurs="unbounded"/>') : line,
    );
  }
  if (!value || typeof value !== "object") {
    return [`${pad}<xs:element name="${name}" type="${typeOfValue(value)}"/>`];
  }
  const obj = value as Record<string, unknown>;
  const attrs = Object.entries(obj).filter(([key]) => key.startsWith("@_"));
  const children = Object.entries(obj).filter(([key]) => !key.startsWith("@_") && key !== "#text");
  if (!children.length) {
    return [
      `${pad}<xs:element name="${name}">`,
      `${pad}  <xs:complexType>`,
      `${pad}    <xs:simpleContent>`,
      `${pad}      <xs:extension base="${typeOfValue(obj["#text"])}">`,
      ...attrs.map(([key, attr]) => `${pad}        <xs:attribute name="${key.slice(2)}" type="${typeOfValue(attr)}"/>`),
      `${pad}      </xs:extension>`,
      `${pad}    </xs:simpleContent>`,
      `${pad}  </xs:complexType>`,
      `${pad}</xs:element>`,
    ];
  }
  return [
    `${pad}<xs:element name="${name}">`,
    `${pad}  <xs:complexType>`,
    `${pad}    <xs:sequence>`,
    ...children.flatMap(([childName, childValue]) => elementToXsd(childName, childValue, level + 3)),
    `${pad}    </xs:sequence>`,
    ...attrs.map(([key, attr]) => `${pad}    <xs:attribute name="${key.slice(2)}" type="${typeOfValue(attr)}"/>`),
    `${pad}  </xs:complexType>`,
    `${pad}</xs:element>`,
  ];
}

export default function XsdGeneratorPage() {
  const [xml, setXml] = useState(sample);
  const [namespace, setNamespace] = useState("");
  const [elementForm, setElementForm] = useState("qualified");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const generate = () => {
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
      const parsed = parser.parse(xml) as Record<string, unknown>;
      const entries = Object.entries(parsed);
      if (entries.length !== 1) throw new Error("XML must have exactly one root element.");
      const attrs = [
        'xmlns:xs="http://www.w3.org/2001/XMLSchema"',
        namespace ? `targetNamespace="${namespace}"` : "",
        `elementFormDefault="${elementForm}"`,
      ].filter(Boolean).join(" ");
      setOutput([
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<xs:schema ${attrs}>`,
        ...elementToXsd(entries[0][0], entries[0][1], 1),
        "</xs:schema>",
      ].join("\n"));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not generate XSD.");
    }
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "XML & Data" }, { label: "XSD Generator" }]} title="XSD Generator" description="Generate an XSD schema from a sample XML." />
      <div className="space-y-5">
        <div>
          <Label>XML Input</Label>
          <ToolTextarea value={xml} onChange={(e) => setXml(e.target.value)} rows={12} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Namespace URI</Label>
            <ToolInput value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="https://example.com/schema" />
          </div>
          <div>
            <Label>Element form</Label>
            <ToolSelect value={elementForm} onChange={(e) => setElementForm(e.target.value)}>
              <option value="qualified">qualified</option>
              <option value="unqualified">unqualified</option>
            </ToolSelect>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={generate} disabled={!xml}>Generate XSD</Button>
          <Button variant="ghost" onClick={() => { setXml(""); setOutput(""); setError(""); }}>Clear</Button>
        </div>
        {error && <ErrorCard>{error}</ErrorCard>}
        {output && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div><CodeBlock value={output} /></div>}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Generated schema is a basic approximation. Review and refine for production use.</p>
      </div>
    </ToolShell>
  );
}
