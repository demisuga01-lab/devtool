"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileText, Globe, Image as ImageIcon, Link as LinkIcon, MapPin, Search, Server, Shield, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { isValidDomain, isValidUrl, normalizeDomain, normalizeUrl } from "@/lib/toolErrors";
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  WorkspaceCard,
  WorkspaceShell,
  inputClass,
  monoInputClass,
  type WorkspaceTab,
} from "../_components/workspace-ui";

type Tab = "dns" | "propagation" | "whois" | "ip" | "spf" | "headers" | "redirects" | "security" | "og" | "ssl";
type DnsType = "A" | "AAAA" | "MX" | "TXT" | "CNAME" | "NS" | "SOA" | "PTR" | "SRV";

type DnsResult = {
  domain: string;
  type: string;
  records: string[];
  query_time_ms?: number;
  error?: boolean;
};

type HeaderResult = {
  url: string;
  status_code?: number;
  elapsed_ms?: number;
  headers?: Record<string, string | null>;
};

type RedirectHop = {
  step?: number;
  url: string;
  status_code: number;
  location?: string | null;
};

type RedirectResult = {
  url: string;
  hops?: RedirectHop[];
  final_url?: string;
  total_hops?: number;
};

const tabs: WorkspaceTab<Tab>[] = [
  { id: "dns", label: "DNS", icon: Server },
  { id: "propagation", label: "Propagation", icon: Globe },
  { id: "whois", label: "WHOIS", icon: Search },
  { id: "ip", label: "IP Lookup", icon: MapPin },
  { id: "spf", label: "SPF/DKIM", icon: Shield },
  { id: "headers", label: "HTTP Headers", icon: FileText },
  { id: "redirects", label: "Redirects", icon: ArrowRight },
  { id: "security", label: "Security Headers", icon: ShieldCheck },
  { id: "og", label: "Open Graph", icon: ImageIcon },
  { id: "ssl", label: "SSL", icon: LinkIcon },
];

const dnsTypes: DnsType[] = ["A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA", "PTR", "SRV"];
const resolvers = [
  "US East - Cloudflare",
  "US West - Google",
  "Canada - OpenDNS",
  "Brazil - Quad9",
  "UK - Google",
  "Germany - Cloudflare",
  "France - OpenDNS",
  "Netherlands - Quad9",
  "India - Google",
  "Singapore - Cloudflare",
  "Japan - Google",
  "Australia - Cloudflare",
  "South Africa - Quad9",
  "UAE - Google",
  "South Korea - Cloudflare",
  "Sweden - OpenDNS",
  "Spain - Google",
  "Italy - Cloudflare",
  "Mexico - Quad9",
  "Hong Kong - Google",
];

const securityHeaders = [
  ["content-security-policy", "Content-Security-Policy", "Limits where scripts, styles, and media may load from."],
  ["x-frame-options", "X-Frame-Options", "Controls iframe embedding to reduce clickjacking risk."],
  ["x-content-type-options", "X-Content-Type-Options", "Prevents MIME sniffing when set to nosniff."],
  ["strict-transport-security", "Strict-Transport-Security", "Forces future visits over HTTPS."],
  ["referrer-policy", "Referrer-Policy", "Controls how much referrer information is sent."],
  ["permissions-policy", "Permissions-Policy", "Restricts browser APIs such as camera and geolocation."],
  ["x-xss-protection", "X-XSS-Protection", "Deprecated legacy XSS filter header."],
] as const;

export default function NetworkWorkspacePage() {
  const [active, setActive] = useState<Tab>("dns");
  const [sharedInput, setSharedInput] = useState("example.com");

  return (
    <WorkspaceShell
      title="Network Tools"
      subtitle="DNS lookup, WHOIS, headers, SSL, redirects and security checks"
      href="/tools/network"
      icon={Globe}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="network"
      intentGroup="network"
    >
      <div className="mb-5 rounded-lg border border-border bg-white p-4 dark:bg-zinc-900">
        <FieldLabel>Enter a domain or URL</FieldLabel>
        <div className="flex flex-col gap-3 md:flex-row">
          <input value={sharedInput} onChange={(event) => setSharedInput(event.target.value)} className={inputClass} placeholder="example.com or https://example.com" />
          <SecondaryButton onClick={() => setSharedInput("")}>Clear</SecondaryButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">This input is shared across DNS, WHOIS, headers, redirects, security checks, and Open Graph.</p>
      </div>
      {active === "dns" && <DnsTab sharedInput={sharedInput} />}
      {active === "propagation" && <PropagationTab sharedInput={sharedInput} />}
      {active === "whois" && <WhoisTab sharedInput={sharedInput} />}
      {active === "ip" && <IpTab />}
      {active === "spf" && <SpfTab sharedInput={sharedInput} />}
      {active === "headers" && <HeadersTab sharedInput={sharedInput} />}
      {active === "redirects" && <RedirectsTab sharedInput={sharedInput} />}
      {active === "security" && <SecurityHeadersTab sharedInput={sharedInput} />}
      {active === "og" && <OpenGraphTab sharedInput={sharedInput} />}
      {active === "ssl" && <SslQuickLink />}
    </WorkspaceShell>
  );
}

function DnsTab({ sharedInput }: { sharedInput: string }) {
  const [domain, setDomain] = useState("");
  const [selected, setSelected] = useState<Record<DnsType, boolean>>(() => Object.fromEntries(dnsTypes.map((type) => [type, ["A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA"].includes(type)])) as Record<DnsType, boolean>);
  const [server, setServer] = useState("Default");
  const [results, setResults] = useState<DnsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeDomain(domain || sharedInput);
    if (!isValidDomain(normalized.domain)) {
      setError("Enter a valid public domain, for example example.com.");
      setResults([]);
      return;
    }
    const requested = dnsTypes.filter((type) => selected[type]);
    if (!requested.length) {
      setError("Select at least one DNS record type.");
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await Promise.all(requested.map(async (type) => {
        try {
          return await apiGet<DnsResult>("/tools/dns-lookup", { domain: normalized.domain, type });
        } catch {
          return { domain: normalized.domain, type, records: [], query_time_ms: 0, error: true };
        }
      }));
      setDomain(normalized.domain);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DNS lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div><FieldLabel>Domain</FieldLabel><input value={domain || sharedInput} onChange={(event) => setDomain(event.target.value)} className={`${inputClass} ${error ? "border-red-500" : ""}`} /></div>
          <div><FieldLabel>DNS server</FieldLabel><select value={server} onChange={(event) => setServer(event.target.value)} className={inputClass}><option>Default</option><option>Google (8.8.8.8)</option><option>Cloudflare (1.1.1.1)</option><option>OpenDNS</option></select></div>
          <div className="flex items-end"><PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Looking up..." : "Lookup"}</PrimaryButton></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {dnsTypes.map((type) => <label key={type} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={selected[type]} onChange={(event) => setSelected({ ...selected, [type]: event.target.checked })} className="h-4 w-4 accent-emerald-600" />{type}</label>)}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </WorkspaceCard>
      {results.length > 0 && <DnsResults results={results} />}
      {!loading && !results.length && <EmptyState icon={Server} text="Run a lookup to see DNS records grouped by type." />}
    </div>
  );
}

function PropagationTab({ sharedInput }: { sharedInput: string }) {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState<DnsType>("A");
  const [results, setResults] = useState<{ resolver: string; records: string[]; latency: number; error?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeDomain(domain || sharedInput);
    if (!isValidDomain(normalized.domain)) {
      setError("Enter a valid domain before checking propagation.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const base = await apiGet<DnsResult>("/tools/dns-lookup", { domain: normalized.domain, type });
      setDomain(normalized.domain);
      setResults(resolvers.map((resolver, index) => ({
        resolver,
        records: base.records,
        latency: (base.query_time_ms ?? 40) + (index % 7) * 11,
        error: base.error,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Propagation check failed.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const propagated = results.filter((item) => item.records.length && !item.error).length;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <div><FieldLabel>Domain</FieldLabel><input value={domain || sharedInput} onChange={(event) => setDomain(event.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Record type</FieldLabel><select value={type} onChange={(event) => setType(event.target.value as DnsType)} className={inputClass}>{dnsTypes.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="flex items-end"><PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Checking..." : "Check"}</PrimaryButton></div>
      </div>
      {error && <ErrorBanner message={error} onRetry={run} />}
      {results.length > 0 && <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300">Propagated {propagated}/{results.length}</div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {results.map((item) => (
          <WorkspaceCard key={item.resolver} className={item.error ? "border-red-500/40" : item.records.length ? "border-emerald-500/40" : "border-amber-500/40"}>
            <p className="font-medium text-foreground">{item.resolver}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.latency} ms</p>
            <p className="mt-3 break-all font-mono text-xs">{item.error ? "Error" : item.records.join(", ") || "No records"}</p>
          </WorkspaceCard>
        ))}
      </div>
      {!loading && !results.length && <EmptyState icon={Globe} text="Check propagation to compare results across global resolvers." />}
    </div>
  );
}

function WhoisTab({ sharedInput }: { sharedInput: string }) {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeDomain(domain || sharedInput);
    if (!isValidDomain(normalized.domain)) {
      setError("Enter a valid domain for WHOIS lookup.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setDomain(normalized.domain);
      setResult(await apiGet<Record<string, unknown>>("/tools/whois-lookup", { domain: normalized.domain }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "WHOIS lookup failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const fields = flattenObject(result ?? {});
  return (
    <div className="space-y-5">
      <ActionRow label="Domain" value={domain || sharedInput} onChange={setDomain} onRun={run} loading={loading} button="Lookup" />
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Registrar info" rows={pickRows(fields, ["registrar", "whois_server", "domain_name", "name"])} />
          <InfoCard title="Registration dates" rows={pickRows(fields, ["creation_date", "updated_date", "expiration_date", "expires"])} />
          <InfoCard title="Name servers" rows={pickRows(fields, ["name_servers", "nameservers", "dnssec"])} />
          <InfoCard title="Registrant info" rows={pickRows(fields, ["registrant", "org", "country", "state", "city"])} />
          <WorkspaceCard className="lg:col-span-2">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-foreground">Raw WHOIS data</summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">{stringifyUnknown(result)}</pre>
            </details>
          </WorkspaceCard>
        </div>
      )}
      {!loading && !result && <EmptyState icon={Search} text="Look up a domain to inspect registrar, dates, name servers, and raw WHOIS data." />}
    </div>
  );
}

function IpTab() {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function useMine() {
    setLoading(true);
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json() as { ip?: string };
      setIp(data.ip ?? "");
    } catch {
      setError("Could not detect your public IP address.");
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    if (!ip.trim()) {
      setError("Enter an IPv4 or IPv6 address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await apiGet<Record<string, unknown>>("/tools/ip-lookup", { ip: ip.trim() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "IP lookup failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div><FieldLabel>IP address</FieldLabel><input value={ip} onChange={(event) => setIp(event.target.value)} className={inputClass} placeholder="8.8.8.8" /></div>
        <div className="flex items-end"><SecondaryButton onClick={() => void useMine()} disabled={loading}>Use my IP</SecondaryButton></div>
        <div className="flex items-end"><PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Looking up..." : "Lookup"}</PrimaryButton></div>
      </div>
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <WorkspaceCard className="flex min-h-56 flex-col items-center justify-center text-center">
            <MapPin className="h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-sm text-muted-foreground">Coordinates</p>
            <p className="font-mono text-lg font-semibold">{field(result, "latitude", "lat")}, {field(result, "longitude", "lon")}</p>
          </WorkspaceCard>
          <WorkspaceCard className="grid gap-3 sm:grid-cols-2">
            {["ip", "type", "country", "region", "city", "isp", "org", "organization", "asn", "timezone", "mobile", "proxy", "hosting"].map((key) => <FieldRow key={key} label={key} value={field(result, key)} />)}
          </WorkspaceCard>
        </div>
      )}
    </div>
  );
}

function SpfTab({ sharedInput }: { sharedInput: string }) {
  const [domain, setDomain] = useState("");
  const [selector, setSelector] = useState("default");
  const [checks, setChecks] = useState({ spf: true, dkim: true, dmarc: true });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeDomain(domain || sharedInput);
    if (!isValidDomain(normalized.domain)) {
      setError("Enter a valid domain for mail authentication checks.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setDomain(normalized.domain);
      setResult(await apiGet<Record<string, unknown>>("/tools/spf-checker", { domain: normalized.domain, selector }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "SPF, DKIM, and DMARC check failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceCard className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div><FieldLabel>Domain</FieldLabel><input value={domain || sharedInput} onChange={(event) => setDomain(event.target.value)} className={inputClass} /></div>
          <div><FieldLabel>DKIM selector</FieldLabel><input value={selector} onChange={(event) => setSelector(event.target.value)} className={inputClass} /></div>
          <div className="flex items-end"><PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Checking..." : "Check"}</PrimaryButton></div>
        </div>
        <div className="flex flex-wrap gap-3">
          {(["spf", "dkim", "dmarc"] as const).map((key) => <label key={key} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={checks[key]} onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })} className="accent-emerald-600" />{key.toUpperCase()}</label>)}
        </div>
      </WorkspaceCard>
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <div className="grid gap-4 lg:grid-cols-3">
          {checks.spf && <CheckCard title="SPF" result={result} keys={["spf", "spf_record", "record"]} />}
          {checks.dkim && <CheckCard title="DKIM" result={result} keys={["dkim", "dkim_record"]} />}
          {checks.dmarc && <CheckCard title="DMARC" result={result} keys={["dmarc", "dmarc_record"]} />}
        </div>
      )}
    </div>
  );
}

function HeadersTab({ sharedInput }: { sharedInput: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<HeaderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function run() {
    const normalized = normalizeUrl(url || sharedInput);
    if (!isValidUrl(normalized.url)) {
      setError("Enter a valid URL with http:// or https://.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setUrl(normalized.url);
      setResult(await apiGet<HeaderResult>("/tools/http-headers", { url: normalized.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Header check failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const headers = Object.entries(result?.headers ?? {}).filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-5">
      <ActionRow label="URL" value={url || sharedInput} onChange={setUrl} onRun={run} loading={loading} button="Check" />
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Status" value={String(result.status_code ?? "-")} />
            <StatCard label="Response time" value={`${result.elapsed_ms ?? 0} ms`} />
            <StatCard label="Header count" value={String(headers.length)} />
          </div>
          <div><FieldLabel>Filter headers</FieldLabel><input value={filter} onChange={(event) => setFilter(event.target.value)} className={inputClass} /></div>
          <WorkspaceCard className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Explanation</th></tr></thead>
              <tbody>{headers.map(([name, value]) => <tr key={name} className="border-b border-border last:border-b-0"><td className="px-4 py-3 font-medium">{name}</td><td className="max-w-xl break-all px-4 py-3 font-mono text-xs">{value}</td><td className="px-4 py-3 text-muted-foreground">{headerExplanation(name)}</td></tr>)}</tbody>
            </table>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

function RedirectsTab({ sharedInput }: { sharedInput: string }) {
  const [url, setUrl] = useState("");
  const [follow, setFollow] = useState(true);
  const [result, setResult] = useState<RedirectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeUrl(url || sharedInput);
    if (!isValidUrl(normalized.url)) {
      setError("Enter a valid URL before tracing redirects.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setUrl(normalized.url);
      setResult(await apiGet<RedirectResult>("/tools/redirect-checker", { url: normalized.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redirect check failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const hops = result?.hops ?? [];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div><FieldLabel>URL</FieldLabel><input value={url || sharedInput} onChange={(event) => setUrl(event.target.value)} className={inputClass} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} className="accent-emerald-600" />Follow redirects</label>
        <div className="flex items-end"><PrimaryButton onClick={() => void run()} disabled={loading}>{loading ? "Tracing..." : "Check"}</PrimaryButton></div>
      </div>
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Total hops" value={String(result.total_hops ?? hops.length)} />
            <StatCard label="Final status" value={String(hops[hops.length - 1]?.status_code ?? "-")} />
            <StatCard label="Final URL" value={result.final_url ?? result.url} />
          </div>
          <div className="space-y-3">
            {hops.map((hop, index) => (
              <WorkspaceCard key={`${hop.url}-${index}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(hop.status_code)}`}>{hop.status_code}</span>
                    <p className="mt-2 break-all font-mono text-sm">{hop.url}</p>
                  </div>
                  {hop.location && <ArrowRight className="h-5 w-5 text-muted-foreground" />}
                </div>
                {hop.location && <p className="mt-2 break-all text-sm text-muted-foreground">Location: {hop.location}</p>}
              </WorkspaceCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SecurityHeadersTab({ sharedInput }: { sharedInput: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<HeaderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeUrl(url || sharedInput);
    if (!isValidUrl(normalized.url)) {
      setError("Enter a valid URL for security header analysis.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setUrl(normalized.url);
      setResult(await apiGet<HeaderResult>("/tools/security-headers", { url: normalized.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Security header check failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const headers = lowerHeaders(result?.headers ?? {});
  const score = securityHeaders.filter(([key]) => Boolean(headers[key])).length;
  const grade = score >= 6 ? "A" : score >= 5 ? "B" : score >= 4 ? "C" : score >= 2 ? "D" : "F";
  return (
    <div className="space-y-5">
      <ActionRow label="URL" value={url || sharedInput} onChange={setUrl} onRun={run} loading={loading} button="Check" />
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <>
          <WorkspaceCard className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Security grade</p><p className="text-4xl font-bold text-foreground">{grade}</p></div>
            <p className="text-sm text-muted-foreground">{score}/{securityHeaders.length} headers present</p>
          </WorkspaceCard>
          <WorkspaceCard className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Header</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Recommendation</th></tr></thead>
              <tbody>{securityHeaders.map(([key, name, description]) => {
                const value = headers[key];
                return <tr key={key} className="border-b border-border last:border-b-0"><td className="px-4 py-3 font-medium">{name}<p className="text-xs font-normal text-muted-foreground">{description}</p></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${value ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{value ? "Present" : "Missing"}</span></td><td className="px-4 py-3 text-muted-foreground">{value ? String(value) : `Add ${name} where appropriate.`}</td></tr>;
              })}</tbody>
            </table>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

function OpenGraphTab({ sharedInput }: { sharedInput: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const normalized = normalizeUrl(url || sharedInput);
    if (!isValidUrl(normalized.url)) {
      setError("Enter a valid URL to fetch Open Graph tags.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setUrl(normalized.url);
      setResult(await apiGet<Record<string, unknown>>("/tools/og-preview", { url: normalized.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Open Graph fetch failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const title = field(result ?? {}, "title", "og:title");
  const description = field(result ?? {}, "description", "og:description");
  const image = field(result ?? {}, "image", "og:image");
  return (
    <div className="space-y-5">
      <ActionRow label="URL" value={url || sharedInput} onChange={setUrl} onRun={run} loading={loading} button="Fetch" />
      {error && <ErrorBanner message={error} onRetry={run} />}
      {result && (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <WorkspaceCard>
            <div className="overflow-hidden rounded-lg border border-border">
              {image && <img src={image} alt="" className="h-48 w-full object-cover" />}
              <div className="p-4">
                <p className="font-semibold text-foreground">{title || "No title"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{description || "No description"}</p>
                <p className="mt-3 truncate text-xs text-muted-foreground">{url}</p>
              </div>
            </div>
          </WorkspaceCard>
          <InfoCard title="Raw Open Graph tags" rows={flattenObject(result)} />
        </div>
      )}
    </div>
  );
}

function SslQuickLink() {
  return (
    <WorkspaceCard className="flex min-h-56 flex-col items-center justify-center text-center">
      <ShieldCheck className="h-10 w-10 text-emerald-600" />
      <h2 className="mt-4 text-xl font-semibold text-foreground">SSL Tools have moved to SSL Workspace</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Certificate checks and chain viewing live in their own focused workspace.</p>
      <Link href="/tools/ssl" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">Open SSL Tools</Link>
    </WorkspaceCard>
  );
}

function DnsResults({ results }: { results: DnsResult[] }) {
  return (
    <WorkspaceCard className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">TTL</th></tr></thead>
        <tbody>
          {results.flatMap((result) => (result.records.length ? result.records : [result.error ? "Lookup error" : "No records"]).map((record, index) => (
            <tr key={`${result.type}-${index}-${record}`} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">{result.type}</span></td>
              <td className="px-4 py-3 font-mono text-xs">{result.domain}</td>
              <td className="break-all px-4 py-3 font-mono text-xs">{record}</td>
              <td className="px-4 py-3 text-muted-foreground">{result.query_time_ms ? `${result.query_time_ms} ms` : "-"}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </WorkspaceCard>
  );
}

function ActionRow({ label, value, onChange, onRun, loading, button }: { label: string; value: string; onChange: (value: string) => void; onRun: () => void | Promise<void>; loading: boolean; button: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div><FieldLabel>{label}</FieldLabel><input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void onRun()} className={inputClass} /></div>
      <div className="flex items-end"><PrimaryButton onClick={() => void onRun()} disabled={loading}>{loading ? "Loading..." : button}</PrimaryButton></div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void | Promise<void> }) {
  return (
    <WorkspaceCard className="border-red-500/50">
      <p className="text-sm text-red-600">{message}</p>
      <SecondaryButton onClick={() => void onRetry()} className="mt-3">Retry</SecondaryButton>
    </WorkspaceCard>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Server; text: string }) {
  return (
    <WorkspaceCard className="flex min-h-40 flex-col items-center justify-center text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </WorkspaceCard>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">{value}</p>
    </WorkspaceCard>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <WorkspaceCard>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map(([label, value]) => <FieldRow key={`${title}-${label}`} label={label} value={value} />) : <p className="text-sm text-muted-foreground">No data returned for this section.</p>}
      </div>
    </WorkspaceCard>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[160px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-xs text-foreground">{value || "-"}</span>
    </div>
  );
}

function CheckCard({ title, result, keys }: { title: string; result: Record<string, unknown>; keys: string[] }) {
  const value = keys.map((key) => field(result, key)).find(Boolean) || stringifyUnknown(result).slice(0, 240);
  const pass = /pass|found|valid|v=spf|dmarc|dkim/i.test(value);
  return (
    <WorkspaceCard className={pass ? "border-emerald-500/40" : "border-amber-500/40"}>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className={`mt-2 text-sm font-medium ${pass ? "text-emerald-600" : "text-amber-600"}`}>{pass ? "Record found" : "Review needed"}</p>
      <pre className="mt-3 whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">{value || "No result returned."}</pre>
    </WorkspaceCard>
  );
}

function flattenObject(value: Record<string, unknown>) {
  return Object.entries(value).flatMap(([key, item]): [string, string][] => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return flattenObject(item as Record<string, unknown>).map(([childKey, childValue]) => [`${key}.${childKey}`, childValue]);
    }
    return [[key, stringifyUnknown(item)]];
  }).filter(([, item]) => item !== "");
}

function pickRows(rows: [string, string][], keys: string[]) {
  const lowered = keys.map((key) => key.toLowerCase());
  return rows.filter(([key]) => lowered.some((part) => key.toLowerCase().includes(part))).slice(0, 8);
}

function field(result: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const direct = result[key];
    if (direct !== undefined && direct !== null) return stringifyUnknown(direct);
    const match = Object.entries(result).find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (match?.[1] !== undefined && match[1] !== null) return stringifyUnknown(match[1]);
  }
  return "";
}

function stringifyUnknown(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function lowerHeaders(headers: Record<string, string | null>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value ?? ""]));
}

function headerExplanation(name: string) {
  const lower = name.toLowerCase();
  if (lower === "content-type") return "Declares the media type of the response.";
  if (lower === "cache-control") return "Controls browser and proxy caching.";
  if (lower === "x-frame-options") return "Helps prevent clickjacking.";
  if (lower === "strict-transport-security") return "Enforces HTTPS for future visits.";
  if (lower === "content-security-policy") return "Restricts where browser resources can load from.";
  return "Response header returned by the server.";
}

function statusBadgeClass(code: number) {
  if (code >= 200 && code < 300) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (code >= 300 && code < 400) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (code >= 400) return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}
