export const metadata = {
  title: "Self-Hosting",
};

const envRows = [
  ["DATABASE_URL", "Required outside local dev", "postgresql://devtools:password@localhost/devtools", "SQLAlchemy PostgreSQL connection URL."],
  ["SECRET_KEY", "Required", "changeme", "JWT signing secret; change in production."],
  ["ADMIN_TOKEN", "Optional", "changeme", "Present in config but not used by current routers."],
  ["ALLOWED_ORIGINS", "Required", "http://localhost:3001", "Comma-separated CORS origins."],
  ["JWT_ALGORITHM", "Optional", "HS256", "JWT algorithm used by python-jose."],
  ["JWT_EXPIRE_DAYS", "Optional", "7", "JWT lifetime in days."],
  ["SMTP_HOST", "Optional", "", "SMTP host; empty disables email alerts."],
  ["SMTP_PORT", "Optional", "587", "SMTP port."],
  ["SMTP_USER", "Optional", "", "SMTP username."],
  ["SMTP_PASSWORD", "Optional", "", "SMTP password."],
  ["SMTP_FROM", "Optional", "alerts@wellfriend.online", "From address for alerts."],
  ["SMTP_TLS", "Optional", "True", "Whether SMTP STARTTLS is used."],
  ["NEXT_PUBLIC_API_BASE", "Optional", "/api", "Frontend API base."],
];

const requirements = [
  ["Ubuntu", "24.04 LTS", "Recommended VPS operating system."],
  ["Node.js", "20+", "Runs and builds the Next.js frontend."],
  ["Python", "3.12+", "Runs the FastAPI backend."],
  ["PostgreSQL", "16+", "Stores pastes, users, monitors, checks, incidents, alerts, and maintenance windows."],
  ["pnpm", "Current", "Frontend package manager."],
  ["Java", "21", "Required for the Java Regex tool."],
  ["dig and whois", "System packages", "Required for DNS and WHOIS tools."],
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm font-mono text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default function SelfHostingDocsPage() {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Self-Hosting</p>
      <h1 className="mb-4 mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Run your own DevTools instance</h1>
      <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        This guide covers the current source: Next.js frontend, FastAPI backend, PostgreSQL database, APScheduler jobs, PM2 process management, Nginx reverse proxy, and Certbot SSL.
      </p>

      <section id="requirements">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Requirements</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Software</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Version</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map(([software, version, purpose]) => (
                <tr key={software}>
                  <td className="border border-zinc-200 px-4 py-2 font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">{software}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{version}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="install">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Installation</h2>
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <li>Clone the repository.</li>
          <li>Install backend dependencies in a virtual environment.</li>
          <li>Copy and edit the backend environment file.</li>
          <li>Install and build the frontend.</li>
        </ol>
        <CodeBlock>{`git clone https://github.com/your-org/devtool.git
cd devtool/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8001
cd ../frontend
pnpm install
pnpm build
pnpm start`}</CodeBlock>
      </section>

      <section id="config">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Configuration</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Variable</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Required</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Default</th>
                <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Description</th>
              </tr>
            </thead>
            <tbody>
              {envRows.map(([name, required, fallback, description]) => (
                <tr key={name}>
                  <td className="border border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">{name}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{required}</td>
                  <td className="border border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{fallback || "empty"}</td>
                  <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="deployment">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">PM2 & Nginx</h2>
        <div className="space-y-4">
          <CodeBlock>{`pm2 start "venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001" --name devtools-api
pm2 start "pnpm start" --name devtools-frontend
pm2 save`}</CodeBlock>
          <CodeBlock>{`server {
    server_name devtools.wellfriend.online;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}</CodeBlock>
          <CodeBlock>{`certbot --nginx -d devtools.wellfriend.online`}</CodeBlock>
        </div>
      </section>

      <section id="admin">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Creating Admin Account</h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The current docs use direct bcrypt because passlib is not in requirements. Run this from the server with the backend path adjusted.
        </p>
        <CodeBlock>{`python3 << 'EOF'
import bcrypt
import sys
import datetime
sys.path.insert(0, '/path/to/backend')
from app.core.database import SessionLocal, init_db
from app.models.status import User
init_db()
password = "YourPassword"
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
db = SessionLocal()
user = User(username="admin", email="admin@example.com", password_hash=password_hash, is_admin=True, created_at=datetime.datetime.utcnow())
db.add(user)
db.commit()
db.close()
print("Done")
EOF`}</CodeBlock>
      </section>

      <section id="updating">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Updating</h2>
        <CodeBlock>{`git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && pnpm install && pnpm build
pm2 restart devtools-api devtools-frontend`}</CodeBlock>
      </section>

      <section id="troubleshooting">
        <h2 className="mb-3 mt-10 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">Troubleshooting</h2>
        <div className="space-y-4">
          {[
            ["bcrypt error on create_user.py", "Use the direct-bcrypt script above; do not use passlib."],
            ["Cloudflare blocking monitors", "Use localhost or internal URLs for same-host services when Cloudflare blocks public checks."],
            ["Port already in use", "Stop the existing process, change PM2 commands, or update Nginx ports."],
            ["pnpm build fails", "Run commands inside frontend/ and inspect TypeScript output."],
            ["Database connection failed", "Check DATABASE_URL, PostgreSQL service status, user, password, and database ownership."],
          ].map(([title, body]) => (
            <section key={title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
            </section>
          ))}
        </div>
      </section>
    </article>
  );
}
