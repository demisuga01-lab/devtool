# WellFriend DevTools

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license) [![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)](https://fastapi.tiangolo.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/) [![Live Site](https://img.shields.io/badge/Live-devtools.wellfriend.online-10b981)](https://devtools.wellfriend.online)

A clean, open-source developer toolbox with 54 browser-based tools, a paste service, and a status monitoring dashboard.

## Table of Contents
- [What is this?](#what-is-this)
- [Live Demo](#live-demo)
- [Tools Overview](#tools-overview)
- [Features](#features)
- [Self-Hosting](#self-hosting)
- [Environment Variables](#environment-variables)
- [Creating Admin User](#creating-admin-user)
- [API Reference](#api-reference)
- [Privacy](#privacy)
- [Contributing](#contributing)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Links](#links)

## What is this?

- **Dev Tools**: 54 utilities for formatting, encoding, hashing, inspection, cron parsing, XML/YAML conversion, network checks, and reference lookups.
- **Paste**: temporary notes and code snippets with expiry, bcrypt password protection, burn-after-read, view limits, raw view, delete tokens, and recent-paste browser history.
- **Status**: public status page plus an authenticated dashboard for monitors, incidents, maintenance windows, and alerts.

## Live Demo

Use the hosted version at <https://devtools.wellfriend.online>.

## Tools Overview

| Category | Tools | Description |
| --- | --- | --- |
| Text & Format | 12 | Format, validate, and convert structured text. |
| Crypto & Hash | 4 | Hash, generate, and sign data in your browser. |
| Date & Time | 4 | Work with timestamps, cron, and date math. |
| Encode & Convert | 5 | Convert between encodings and data formats. |
| XML & Data | 9 | Format, validate, and convert XML, YAML, and structured data. |
| Escape | 5 | Escape and unescape strings for markup, code, and SQL. |
| Web & Network | 7 | Inspect headers, DNS, SSL, and HTTP responses. |
| Reference & Utils | 8 | Look up references and run common utility transformations. |

## Features

| Dev Tools | Paste | Status |
|---|---|---|
| 54 implemented tool routes | Temporary server-side paste storage | Public status page |
| Browser-first processing | Optional bcrypt password protection | JWT admin dashboard |
| Network tools protected by SSRF checks | Expiry and view-limit deletion | Monitor checks scheduled every 60 seconds when due |
| Dark and light theme support | Burn after read | Email and webhook alerts |
| No signup for public tools | Recent pastes in localStorage | Incidents and maintenance windows |

## Self-Hosting

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16+
- pnpm
- Java 21 for the Java Regex tool
- `dig` and `whois` command-line utilities for DNS and WHOIS tools

### Quick Start Local

```bash
git clone https://github.com/demisuga01-lab/devtool.git
cd devtool/backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

```bash
cd ../frontend
pnpm install
pnpm dev
```

Open <http://localhost:3001>. The backend runs on <http://localhost:8001>.

### VPS Deployment

See [SELF-HOSTING.md](SELF-HOSTING.md). The local-only internal package also contains `devtools-documentation/deployment.md`.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Required outside local dev | `postgresql://devtools:password@localhost/devtools` | SQLAlchemy PostgreSQL connection URL. |
| `SECRET_KEY` | Required | `changeme` | JWT signing secret; change in production. |
| `ADMIN_TOKEN` | Optional | `changeme` | Present in config but not used by current routers. |
| `ALLOWED_ORIGINS` | Required | `http://localhost:3001` | Comma-separated CORS origins. |
| `JWT_ALGORITHM` | Optional | `HS256` | JWT algorithm used by python-jose. |
| `JWT_EXPIRE_DAYS` | Optional | `7` | JWT lifetime in days. |
| `SMTP_HOST` | Optional | `` | SMTP host; empty disables email alerts. |
| `SMTP_PORT` | Optional | `587` | SMTP port. |
| `SMTP_USER` | Optional | `` | SMTP username. |
| `SMTP_PASSWORD` | Optional | `` | SMTP password. |
| `SMTP_FROM` | Optional | `alerts@wellfriend.online` | From address for alerts. |
| `SMTP_TLS` | Optional | `True` | Whether SMTP STARTTLS is used. |
| `NEXT_PUBLIC_API_BASE` | Optional | `/api` | Frontend API base from frontend/lib/api.ts. |

## Creating Admin User

The codebase does not include `backend/scripts/create_user.py`. Use direct `bcrypt`:

```bash
python3 << 'EOF'
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
EOF
```

## API Reference

Public API groups include `GET /api/health`, network tools under `/api/tools`, Paste endpoints under `/api/paste`, and public status endpoints under `/api/status/public`. Authenticated dashboard endpoints require `Authorization: Bearer <token>`.

## Privacy

- Most dev tools run entirely in the browser.
- Network tools make server-side requests because they inspect public URLs, DNS, TLS, WHOIS, or Java regex behavior.
- Paste content is stored temporarily in PostgreSQL.
- Passwords and paste passwords are hashed with bcrypt.
- The current source does not implement ads or user-data analytics.

## Contributing

Fork the repository, create a branch, make focused changes, and open a pull request. Keep TypeScript strict, use Tailwind for UI, and discuss new external services before adding them.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, React 19 RC |
| Backend | FastAPI, Python, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| Auth | JWT via python-jose, bcrypt |
| Scheduling | APScheduler |
| Process | PM2 recommended |
| Proxy | Nginx recommended |
| SSL | Let's Encrypt with Certbot recommended |

## License

MIT License.

## Links

- Live site: <https://devtools.wellfriend.online>
- PDFTools: <https://tools.wellfriend.online>
- Discord: <https://discord.gg/ZQFmYaQbVu>
- Contact: <contact@wellfriend.online>
