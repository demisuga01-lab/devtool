"use client";

import { useMemo, useState } from "react";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { AlignLeft, ArrowLeftRight, Braces, CheckCircle, Code2, FileCode, Search, Wand2 } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  textareaClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "format" | "validate" | "escape" | "convert" | "xpath" | "xsd" | "xslt";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "format", label: "Format", icon: AlignLeft },
  { id: "validate", label: "Validate", icon: CheckCircle },
  { id: "escape", label: "Escape", icon: Braces },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "xpath", label: "XPath", icon: Search },
  { id: "xsd", label: "XSD", icon: FileCode },
  { id: "xslt", label: "XSLT", icon: Wand2 },
];

const sampleXml = '<catalog>\n  <book id="b1">\n    <title>Clean Code</title>\n    <price>31.5</price>\n  </book>\n  <book id="b2">\n    <title>Refactoring</title>\n    <price>42</price>\n  </book>\n</catalog>';

export default function XmlWorkspacePage() {
  const [active, setActive] = useState<Tab>("format");

  return (
    <WorkspaceShell
      title="XML Tools"
      subtitle="Format, validate, escape, convert, and query XML documents"
      href="/tools/xml"
      icon={Code2}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="xml"
      intentGroup="inspect"
    >
      {active === "format" && <FormatTab />}
      {active === "validate" && <ValidateTab />}
      {active === "escape" && <EscapeTab />}
      {active === "convert" && <ConvertTab />}
      {active === "xpath" && <XpathTab />}
      {active === "xsd" && <XsdTab />}
      {active === "xslt" && <XsltTab />}
    </WorkspaceShell>
  );
}

function FormatTab() {
  const [input, setInput] = useState(sampleXml);
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("2");
  const [sortAttrs, setSortAttrs] = useState(false);
  const [error, setError] = useState("");
  const doc = useMemo(() => parseXml(input), [input]);
  const stats = doc.ok ? analyzeXml(doc.doc) : null;

  function format() {
    const parsed = parseXml(input);
    if (!parsed.ok) {
      setError(parsed.error);
      setOutput("");
      return;
    }
    setError("");
    setOutput(formatXml(parsed.doc, indent === "tab" ? "\t" : " ".repeat(Number(indent)), sortAttrs));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[160px_auto_auto]">
        <div><FieldLabel>Indent size</FieldLabel><select value={indent} onChange={(event) => setIndent(event.target.value)} className={inputClass}><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option></select></div>
        <Checkbox checked={sortAttrs} onChange={setSortAttrs} label="Sort attributes" />
        <div className="flex items-end"><PrimaryButton onClick={format}>Format</PrimaryButton></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input XML</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px] ${error ? "border-red-500" : ""}`} />{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>
        <div><div className="flex items-center justify-between"><FieldLabel>Formatted XML</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[400px]`} /></div>
      </div>
      {stats && <Stats stats={stats} />}
    </div>
  );
}

function ValidateTab() {
  const [input, setInput] = useState(sampleXml);
  const [xsd, setXsd] = useState("");
  const [schemaEnabled, setSchemaEnabled] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; stats?: ReturnType<typeof analyzeXml> } | null>(null);

  function validate() {
    const parsed = parseXml(input);
    if (!parsed.ok) {
      setResult({ ok: false, message: parsed.error });
      return;
    }
    if (schemaEnabled && xsd.trim()) {
      const schemaDoc = parseXml(xsd);
      if (!schemaDoc.ok) {
        setResult({ ok: false, message: `XSD is not well formed: ${schemaDoc.error}` });
        return;
      }
    }
    setResult({ ok: true, message: schemaEnabled ? "XML is well formed and the XSD document is parseable." : "XML is well formed.", stats: analyzeXml(parsed.doc) });
  }

  return (
    <div className="space-y-5">
      <div><FieldLabel>XML</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px] ${result && !result.ok ? "border-red-500" : result?.ok ? "border-emerald-500" : ""}`} /></div>
      <div className="flex flex-wrap gap-3"><PrimaryButton onClick={validate}>Validate</PrimaryButton><SecondaryButton onClick={() => setInput("")}>Clear</SecondaryButton><Checkbox checked={schemaEnabled} onChange={setSchemaEnabled} label="Enable optional XSD parse check" /></div>
      {schemaEnabled && <div><FieldLabel>XSD schema</FieldLabel><textarea value={xsd} onChange={(event) => setXsd(event.target.value)} className={`${textareaClass} min-h-[180px]`} /></div>}
      {result && (
        <WorkspaceCard className={result.ok ? "border-emerald-500/40" : "border-red-500/40"}>
          <div className={`flex items-center gap-3 ${result.ok ? "text-emerald-600" : "text-red-600"}`}><CheckCircle className="h-7 w-7" /><h2 className="text-lg font-semibold">{result.ok ? "Valid XML" : "Invalid XML"}</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          {result.stats && <Stats stats={result.stats} className="mt-4" />}
        </WorkspaceCard>
      )}
    </div>
  );
}

function EscapeTab() {
  const [mode, setMode] = useState<"escape" | "unescape">("escape");
  const [input, setInput] = useState("");
  const output = mode === "escape" ? escapeXml(input) : unescapeXml(input);

  return (
    <div className="space-y-5">
      <Segmented value={mode} onChange={setMode} options={[["escape", "Escape"], ["unescape", "Unescape"]]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[240px]`} /></div>
        <div><div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[240px]`} /></div>
      </div>
      <WorkspaceCard>
        <div className="grid gap-2 text-sm md:grid-cols-5">
          {Object.entries(xmlMap).map(([from, to]) => <div key={from} className="font-mono"><span className="text-muted-foreground">{from}</span> -&gt; {to}</div>)}
        </div>
      </WorkspaceCard>
    </div>
  );
}

function ConvertTab() {
  const [direction, setDirection] = useState<"xml-json" | "json-xml">("xml-json");
  const [input, setInput] = useState(sampleXml);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(false);
  const [arrayMode, setArrayMode] = useState(false);
  const [root, setRoot] = useState("root");
  const [attributePrefix, setAttributePrefix] = useState("@_");

  function convert() {
    try {
      if (direction === "xml-json") {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: attributePrefix, isArray: arrayMode ? () => true : undefined });
        setOutput(JSON.stringify(parser.parse(input), null, compact ? 0 : 2));
      } else {
        const builder = new XMLBuilder({ format: !compact, ignoreAttributes: false, attributeNamePrefix: attributePrefix });
        setOutput(builder.build({ [root || "root"]: JSON.parse(input) }));
      }
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Conversion failed.");
    }
  }

  return (
    <div className="space-y-5">
      <Segmented value={direction} onChange={setDirection} options={[["xml-json", "XML to JSON"], ["json-xml", "JSON to XML"]]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>Input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[350px]`} /></div>
        <div><div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[350px]`} /></div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Checkbox checked={compact} onChange={setCompact} label="Compact output" />
        {direction === "xml-json" && <Checkbox checked={arrayMode} onChange={setArrayMode} label="Always arrays" />}
        {direction === "json-xml" && <div><FieldLabel>Root element</FieldLabel><input value={root} onChange={(event) => setRoot(event.target.value)} className={inputClass} /></div>}
        <div><FieldLabel>Attribute prefix</FieldLabel><input value={attributePrefix} onChange={(event) => setAttributePrefix(event.target.value)} className={inputClass} /></div>
      </div>
      <PrimaryButton onClick={convert}>Convert</PrimaryButton>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function XpathTab() {
  const [xml, setXml] = useState(sampleXml);
  const [xpath, setXpath] = useState("//book/title");
  const [matches, setMatches] = useState<{ type: string; value: string }[]>([]);
  const [error, setError] = useState("");

  function evaluate() {
    try {
      const parsed = parseXml(xml);
      if (!parsed.ok) throw new Error(parsed.error);
      const result = parsed.doc.evaluate(xpath, parsed.doc, null, XPathResult.ANY_TYPE, null);
      const found: { type: string; value: string }[] = [];
      let node = result.iterateNext();
      while (node) {
        found.push({ type: node.nodeType === Node.ELEMENT_NODE ? "Element" : node.nodeType === Node.ATTRIBUTE_NODE ? "Attribute" : "Node", value: node.textContent?.trim() || new XMLSerializer().serializeToString(node) });
        node = result.iterateNext();
      }
      setMatches(found);
      setError("");
    } catch (err) {
      setMatches([]);
      setError(err instanceof Error ? err.message : "XPath evaluation failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div><FieldLabel>XML</FieldLabel><textarea value={xml} onChange={(event) => setXml(event.target.value)} className={`${textareaClass} min-h-[220px]`} /></div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]"><div><FieldLabel>XPath expression</FieldLabel><input value={xpath} onChange={(event) => setXpath(event.target.value)} className={inputClass} /></div><div className="flex items-end"><PrimaryButton onClick={evaluate}>Evaluate</PrimaryButton></div></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600">{matches.length} matches</span>
        {matches.map((match, index) => <WorkspaceCard key={`${match.value}-${index}`}><p className="text-xs uppercase tracking-wide text-muted-foreground">{match.type}</p><pre className="mt-2 whitespace-pre-wrap font-mono text-sm">{match.value || "(empty)"}</pre></WorkspaceCard>)}
      </div>
    </div>
  );
}

function XsdTab() {
  const [input, setInput] = useState('{\n  "person": {\n    "name": "Ada",\n    "age": 36,\n    "active": true\n  }\n}');
  const [root, setRoot] = useState("root");
  const [namespace, setNamespace] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function generate() {
    try {
      setOutput(jsonToXsd(JSON.parse(input), root || "root", namespace));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Could not generate XSD.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>JSON input</FieldLabel><textarea value={input} onChange={(event) => setInput(event.target.value)} className={`${textareaClass} min-h-[400px]`} /></div>
        <div><div className="flex items-center justify-between"><FieldLabel>Generated XSD</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[400px]`} /></div>
      </div>
      <div className="grid gap-3 md:grid-cols-3"><div><FieldLabel>Root element</FieldLabel><input value={root} onChange={(event) => setRoot(event.target.value)} className={inputClass} /></div><div><FieldLabel>Namespace</FieldLabel><input value={namespace} onChange={(event) => setNamespace(event.target.value)} className={inputClass} /></div><div className="flex items-end"><PrimaryButton onClick={generate}>Generate</PrimaryButton></div></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function XsltTab() {
  const [xml, setXml] = useState(sampleXml);
  const [xslt, setXslt] = useState('<?xml version="1.0"?>\n<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">\n  <xsl:template match="/">\n    <titles><xsl:for-each select="catalog/book"><title><xsl:value-of select="title"/></title></xsl:for-each></titles>\n  </xsl:template>\n</xsl:stylesheet>');
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function transform() {
    try {
      const xmlDoc = mustParseXml(xml, "XML input");
      const xsltDoc = mustParseXml(xslt, "XSLT stylesheet");
      const processor = new XSLTProcessor();
      processor.importStylesheet(xsltDoc);
      const result = processor.transformToFragment(xmlDoc, document);
      setOutput(new XMLSerializer().serializeToString(result));
      setError("");
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Transform failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><FieldLabel>XML input</FieldLabel><textarea value={xml} onChange={(event) => setXml(event.target.value)} className={`${textareaClass} min-h-[250px]`} /></div>
        <div><FieldLabel>XSLT stylesheet</FieldLabel><textarea value={xslt} onChange={(event) => setXslt(event.target.value)} className={`${textareaClass} min-h-[250px]`} /></div>
      </div>
      <PrimaryButton onClick={transform}>Transform</PrimaryButton>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div><div className="flex items-center justify-between"><FieldLabel>Output</FieldLabel><CopyButton value={output} label="Copy" /></div><textarea value={output} readOnly className={`${textareaClass} min-h-[250px]`} /></div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
      {label}
    </label>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">{options.map(([id, label]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${value === id ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>;
}

function Stats({ stats, className = "" }: { stats: ReturnType<typeof analyzeXml>; className?: string }) {
  return (
    <div className={`grid gap-3 md:grid-cols-3 ${className}`}>
      <Metric label="Elements" value={stats.elements} />
      <Metric label="Attributes" value={stats.attributes} />
      <Metric label="Depth" value={stats.depth} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <WorkspaceCard><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold text-foreground">{value}</p></WorkspaceCard>;
}

function parseXml(input: string): { ok: true; doc: XMLDocument } | { ok: false; error: string } {
  if (typeof DOMParser === "undefined") return { ok: false, error: "XML parsing is available after the page loads." };
  const doc = new DOMParser().parseFromString(input, "text/xml");
  const parseError = doc.querySelector("parsererror");
  return parseError ? { ok: false, error: parseError.textContent?.replace(/\s+/g, " ").trim() || "Invalid XML." } : { ok: true, doc };
}

function mustParseXml(input: string, label: string) {
  const parsed = parseXml(input);
  if (!parsed.ok) throw new Error(`Invalid ${label}: ${parsed.error}`);
  return parsed.doc;
}

function formatXml(doc: XMLDocument, indent: string, sortAttrs: boolean) {
  function serialize(node: Element, level: number): string[] {
    const attrs = Array.from(node.attributes).sort((a, b) => sortAttrs ? a.name.localeCompare(b.name) : 0).map((attr) => ` ${attr.name}="${escapeXml(attr.value)}"`).join("");
    const children = Array.from(node.childNodes).filter((child) => child.nodeType !== Node.TEXT_NODE || child.textContent?.trim());
    if (!children.length) return [`${indent.repeat(level)}<${node.nodeName}${attrs}/>`];
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) return [`${indent.repeat(level)}<${node.nodeName}${attrs}>${escapeXml(children[0].textContent || "")}</${node.nodeName}>`];
    return [`${indent.repeat(level)}<${node.nodeName}${attrs}>`, ...children.flatMap((child) => child.nodeType === Node.ELEMENT_NODE ? serialize(child as Element, level + 1) : [`${indent.repeat(level + 1)}${escapeXml(child.textContent || "")}`]), `${indent.repeat(level)}</${node.nodeName}>`];
  }
  return doc.documentElement ? serialize(doc.documentElement, 0).join("\n") : "";
}

function analyzeXml(doc: XMLDocument) {
  const elements = Array.from(doc.querySelectorAll("*"));
  let attributes = 0;
  let depth = 0;
  elements.forEach((element) => {
    attributes += element.attributes.length;
    let currentDepth = 0;
    let current: Element | null = element;
    while (current?.parentElement) {
      currentDepth++;
      current = current.parentElement;
    }
    depth = Math.max(depth, currentDepth + 1);
  });
  return { elements: elements.length, attributes, depth };
}

const xmlMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => xmlMap[char] ?? char);
}

function unescapeXml(value: string) {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[entity] ?? entity));
}

function jsonToXsd(value: unknown, rootName: string, namespace: string) {
  const attrs = ['xmlns:xs="http://www.w3.org/2001/XMLSchema"', namespace ? `targetNamespace="${namespace}"` : "", 'elementFormDefault="qualified"'].filter(Boolean).join(" ");
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<xs:schema ${attrs}>`, ...xsdElement(rootName, value, 1), "</xs:schema>"].join("\n");
}

function xsdElement(name: string, value: unknown, level: number): string[] {
  const pad = "  ".repeat(level);
  if (Array.isArray(value)) {
    const child = xsdElement(name, value[0] ?? "", level);
    return child.map((line) => line.includes(`<xs:element name="${name}"`) ? line.replace(">", ' maxOccurs="unbounded">').replace("/ maxOccurs", " maxOccurs") : line);
  }
  if (!value || typeof value !== "object") return [`${pad}<xs:element name="${name}" type="${xsdType(value)}"/>`];
  const entries = Object.entries(value as Record<string, unknown>);
  return [`${pad}<xs:element name="${name}">`, `${pad}  <xs:complexType>`, `${pad}    <xs:sequence>`, ...entries.flatMap(([key, child]) => xsdElement(key, child, level + 3)), `${pad}    </xs:sequence>`, `${pad}  </xs:complexType>`, `${pad}</xs:element>`];
}

function xsdType(value: unknown) {
  if (typeof value === "boolean") return "xs:boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "xs:integer" : "xs:decimal";
  return "xs:string";
}
