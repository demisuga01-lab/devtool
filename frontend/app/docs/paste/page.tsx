export const metadata = {
  title: "Paste Guide",
};

const expiryRows = [
  ["1h", "Deleted after one hour or on next cleanup/access after expiry.", "Short-lived secrets or quick handoffs."],
  ["6h", "Deleted after six hours.", "Same-day collaboration."],
  ["24h", "Deleted after one day.", "Temporary notes that should not linger."],
  ["7d", "Deleted after seven days.", "A work week of access."],
  ["30d", "Deleted after thirty days.", "Longer temporary references."],
  ["never", "No expiry timestamp is set.", "Only use for content you are comfortable keeping until manually deleted."],
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default function PasteDocsPage() {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paste</p>
      <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Paste Guide</h1>
      <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Paste stores temporary notes and code snippets in PostgreSQL with optional privacy controls for expiry, passwords, burn-after-read, view limits, raw text, and delete tokens.
      </p>

      <section id="overview">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Overview</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Open <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/paste</code>, enter content, choose settings, and submit. The frontend calls <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">POST /api/paste</code>.
        </p>
      </section>

      <section id="creating">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Creating a Paste</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <li>Enter the paste content and optional title.</li>
          <li>Choose a language for display highlighting.</li>
          <li>Select expiry, password, burn-after-read, view limit, and privacy settings.</li>
          <li>Save the returned URL and delete token.</li>
        </ol>
      </section>

      <section id="expiry">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Expiry Options</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Option</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">What happens</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">When to use</th>
              </tr>
            </thead>
            <tbody>
              {expiryRows.map(([option, happens, use]) => (
                <tr key={option}>
                  <td className="border border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">{option}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{happens}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="privacy">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Privacy Options</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Private paste options include password protection, burn-after-read, view limits, expiry timers, and manual deletion through the delete token returned during creation.
        </p>
      </section>

      <section id="password">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Password Protection</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Paste passwords are hashed with bcrypt before storage. When someone opens a protected paste, the server compares the provided password with the stored hash and only returns content if it matches. The plaintext password is not stored.
        </p>
      </section>

      <section id="burn">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Burn After Read</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <li>The paste is created with burn-after-read enabled.</li>
          <li>A preview read does not burn it.</li>
          <li>The first successful non-preview read returns the content.</li>
          <li>The paste is deleted immediately after that read.</li>
        </ol>
      </section>

      <section id="view-limit">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">View Limit</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          A paste can include an optional view limit from 1 to 1000. The server increments the view count and deletes the paste when the limit is reached.
        </p>
      </section>

      <section id="delete-token">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Delete Token</h2>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-relaxed text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
          Save this token - it cannot be recovered after the page closes.
        </div>
      </section>

      <section id="raw">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Raw View</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Use <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/paste/{"{id}"}/raw</code> or <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">/api/paste/raw/{"{id}"}</code>. Password-protected raw view requires a password query parameter.
        </p>
      </section>

      <section id="recent">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Recent Pastes</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Recent paste history is stored only in browser localStorage under <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">devtools-recent-pastes</code>.
        </p>
      </section>

      <section id="rate-limits">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Rate Limits</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Paste creation is limited to 10 pastes per IP per hour in memory.
        </p>
      </section>

      <section id="api">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">API Usage</h2>
        <div className="space-y-4">
          <CodeBlock>{`curl -X POST https://devtools.wellfriend.online/api/paste \\
  -H "Content-Type: application/json" \\
  -d '{"content":"hello","language":"plaintext","expires_in":"24h"}'`}</CodeBlock>
          <CodeBlock>{`curl https://devtools.wellfriend.online/api/paste/{id}`}</CodeBlock>
          <CodeBlock>{`curl -X DELETE "https://devtools.wellfriend.online/api/paste/{id}?token={delete_token}"`}</CodeBlock>
        </div>
      </section>
    </article>
  );
}