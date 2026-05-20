export const metadata = {
  title: "API Reference",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, children }: { method: string; path: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="mr-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{method}</span>
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{path}</code>
      </h3>
      {children}
    </section>
  );
}

function SimpleTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Name</th>
            <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Type</th>
            <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, type, description]) => (
            <tr key={name}>
              <td className="border border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">{name}</td>
              <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{type}</td>
              <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <article className="space-y-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">API Reference</p>
        <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">DevTools API</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-relaxed text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
          This is an unofficial API. Endpoints may change. For production use, self-host.
        </div>
      </header>

      <section id="paste" className="space-y-4 scroll-mt-24">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Paste API</h2>
        <Endpoint method="POST" path="/api/paste">
          <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Create a paste and receive its ID, URL, raw URL, and one-time delete token.</p>
          <SimpleTable rows={[["content", "string", "Paste body."], ["language", "string", "Display language, default plaintext."], ["title", "string", "Optional title."], ["password", "string | null", "Optional password to bcrypt-hash."], ["burn_after_read", "boolean", "Delete after first non-preview read."], ["view_limit", "number | null", "Delete after this many reads."], ["expires_in", "1h | 6h | 24h | 7d | 30d | never", "Expiry choice."], ["is_private", "boolean", "Privacy flag stored with paste."]]} />
          <div className="mt-4"><CodeBlock>{`curl -X POST https://devtools.wellfriend.online/api/paste \\
  -H "Content-Type: application/json" \\
  -d '{"content":"hello","language":"plaintext","expires_in":"24h"}'`}</CodeBlock></div>
        </Endpoint>
        <Endpoint method="GET" path="/api/paste/{id}">
          <SimpleTable rows={[["password", "string", "Required only for password-protected pastes."], ["preview", "boolean", "Preview reads do not burn burn-after-read pastes."]]} />
          <div className="mt-4"><CodeBlock>{`curl https://devtools.wellfriend.online/api/paste/{id}`}</CodeBlock></div>
        </Endpoint>
        <Endpoint method="DELETE" path="/api/paste/{id}">
          <SimpleTable rows={[["token", "string", "Delete token returned when the paste was created."]]} />
        </Endpoint>
        <Endpoint method="GET" path="/api/paste/raw/{id}">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Returns plain text paste content. Password-protected raw view requires the password query parameter.</p>
        </Endpoint>
      </section>

      <section id="tools" className="space-y-4 scroll-mt-24">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Network Tools API</h2>
        {[
          ["/api/tools/http-headers", [["url", "string", "URL to inspect."]], `curl "https://devtools.wellfriend.online/api/tools/http-headers?url=https://example.com"`],
          ["/api/tools/dns-lookup", [["domain", "string", "Domain name."], ["type", "string", "Record type such as A, AAAA, MX, TXT, NS, CNAME, SOA."]], `curl "https://devtools.wellfriend.online/api/tools/dns-lookup?domain=example.com&type=A"`],
          ["/api/tools/ssl-checker", [["domain", "string", "Domain name to check."]], `curl "https://devtools.wellfriend.online/api/tools/ssl-checker?domain=example.com"`],
          ["/api/tools/whois-lookup", [["domain", "string", "Domain name to query."]], `curl "https://devtools.wellfriend.online/api/tools/whois-lookup?domain=example.com"`],
          ["/api/tools/redirect-checker", [["url", "string", "URL whose redirect chain should be followed."]], `curl "https://devtools.wellfriend.online/api/tools/redirect-checker?url=https://example.com"`],
          ["/api/tools/java-regex", [["pattern", "string", "Java regex pattern."], ["input", "string", "Input text."], ["flags", "string", "Optional flags." ]], `curl "https://devtools.wellfriend.online/api/tools/java-regex?pattern=a&input=cat"`],
        ].map(([path, rows, example]) => (
          <Endpoint key={path as string} method="GET" path={path as string}>
            <SimpleTable rows={rows as string[][]} />
            <div className="mt-4"><CodeBlock>{example as string}</CodeBlock></div>
          </Endpoint>
        ))}
      </section>

      <section id="status" className="space-y-4 scroll-mt-24">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Status API</h2>
        <Endpoint method="GET" path="/api/status/public">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Returns overall status, last update time, public monitor groups, active public incidents, and active/upcoming maintenance windows.</p>
          <div className="mt-4"><CodeBlock>{`curl https://devtools.wellfriend.online/api/status/public`}</CodeBlock></div>
        </Endpoint>
        <Endpoint method="GET" path="/api/status/public/monitor/{id}/history">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Returns the last 90 public checks for a monitor, including checked_at, status, response_ms, and status_code.</p>
        </Endpoint>
      </section>
    </article>
  );
}