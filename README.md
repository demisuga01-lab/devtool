# WellFriend DevTools

A clean developer toolbox. Format, decode, hash, and inspect.

Live: [devtools.wellfriend.online](https://devtools.wellfriend.online)

## Structure

- `frontend/` — Next.js 15 App Router app (port 3001)
- `backend/` — FastAPI app (port 8001)

## Development

### Frontend

```bash
cd frontend
pnpm install
pnpm dev      # http://localhost:3001
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## PM2 Processes

- `devtools-frontend` — Next.js on port 3001
- `devtools-api` — FastAPI on port 8001
- `devtools-monitor` — APScheduler status checks

## Sections

- **Dev Tools** — 28+ tools for everyday developer tasks
- **Paste** — Temporary notes and code snippets
- **Status** — Monitor your services and APIs

## License

Open source.
