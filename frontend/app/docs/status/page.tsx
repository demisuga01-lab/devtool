export const metadata = {
  title: "Status Monitoring",
};

const statusLegend = [
  ["Operational", "Expected status returned", "bg-emerald-500"],
  ["Degraded", "Unexpected non-5xx status or missing keyword", "bg-yellow-500"],
  ["Outage", "Timeout, connection error, or 5xx", "bg-red-500"],
  ["Unknown", "No check data", "bg-zinc-400"],
  ["Maintenance", "Scheduled maintenance", "bg-blue-500"],
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default function StatusDocsPage() {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Status & Monitoring</p>
      <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Status Monitoring Guide</h1>
      <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Status includes a public page at <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/status</code> and an authenticated dashboard at <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/dashboard</code>.
      </p>

      <section id="overview">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Overview</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The scheduler checks active monitors when they are due, records results, updates uptime, and can send email or webhook alerts on down and recovery transitions.
        </p>
      </section>

      <section id="public">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Public Status Page</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The public status page fetches <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/api/status/public</code> every 60 seconds and monitor history from <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/api/status/public/monitor/{"{id}"}/history</code>.
        </p>
      </section>

      <section id="colors">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Status Colors</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {statusLegend.map(([label, text, dot]) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="monitors">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Setting Up Monitors</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Field</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Name", "Friendly label shown in the dashboard and public status page."],
                ["URL", "Target URL that must pass SSRF validation."],
                ["Method", "GET, HEAD, or POST."],
                ["Interval", "Seconds between checks, minimum 30 seconds."],
                ["Timeout", "Request timeout in seconds."],
                ["Expected status", "HTTP status code considered operational."],
                ["Keyword", "Optional text that must appear in the response body."],
              ].map(([field, purpose]) => (
                <tr key={field}>
                  <td className="border border-zinc-200 px-4 py-2 font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">{field}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="uptime">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Uptime Calculation</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">uptime_30d</code> is operational checks divided by total checks in the last 30 days. When there are no checks, the current backend returns 100.0.
        </p>
      </section>

      <section id="alerts">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Alerts</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Email and webhook alerts trigger when a monitor moves from operational to degraded/outage and when it recovers. Targets containing <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">discord.com</code> receive a Discord embed payload.
        </p>
        <div className="mt-4">
          <CodeBlock>{`{
  "embeds": [{
    "title": "Monitor recovered",
    "color": 3066993,
    "fields": [
      { "name": "URL", "value": "https://example.com" },
      { "name": "Status", "value": "operational" }
    ]
  }]
}`}</CodeBlock>
        </div>
      </section>

      <section id="incidents">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Incidents</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Incident severity can be minor, major, or critical. The workflow is investigating to identified to monitoring to resolved, with timestamped updates along the way.
        </p>
      </section>

      <section id="maintenance">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Maintenance Windows</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Maintenance windows include a title, optional message, start and end times, affected monitor IDs, and an active flag. Active upcoming windows appear on the public status page.
        </p>
      </section>
    </article>
  );
}