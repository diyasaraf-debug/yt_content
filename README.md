# YT Metadata Platform

Web app that ingests YouTube videos (owned channels or influencer links), generates AI-optimized metadata (titles, descriptions, timestamps, tags) via Gemini, and lets you review + push approved metadata back to YouTube or export as text/CSV.

## Stack

- **Backend:** FastAPI · SQLAlchemy · SQLite · httpx · google-generativeai
- **Frontend:** React 18 · Vite · TypeScript · TailwindCSS
- **External:** YouTube Data API v3 (OAuth user tokens for writes, optional API key for public reads) · Gemini API for metadata generation

## Layout

```
backend/
  main.py                 FastAPI app + CORS + router wiring
  models.py               SQLAlchemy models: Channel, Video, Keyword, AuditLog
  schemas.py              Pydantic response/request schemas
  database.py             SQLite engine + session dep
  routers/
    channels.py           CRUD + /sync (pull uploads from YouTube)
    videos.py             Video CRUD
    keywords.py           Keyword CRUD
    metadata.py           Gemini metadata generation
    review.py             Approve/reject workflow
    sync_export.py        Push to YouTube + text/CSV export
    youtube.py            YouTube URL validation
  services/
    youtube_service.py    YouTube Data API client (httpx)
    gemini_service.py     Gemini metadata generation
  secrets/                Gitignored — service-account JSON goes here
  .env                    Gitignored — secrets + config

frontend/
  src/
    pages/                ChannelsPage, DashboardPage, AddVideoPage,
                          KeywordsPage, MetadataPage, ReviewPage, VideoDetailPage
    components/Layout/    Sidebar, etc.
    context/              AppContext (global state)
    lib/api.ts            Single fetch wrapper, all API calls
    types/                Shared TS types
  vite.config.ts          Dev server + /api proxy to backend

docker-compose.yml        Full-stack dev via docker (alternative to local)
```

## Video lifecycle (status field on `videos` table)

```
draft → keywords_ready → generated → approved → synced | exported
```

Transitions:
- **draft** — just ingested (via channel sync or manual URL add)
- **keywords_ready** — user has set keywords
- **generated** — Gemini produced title/description/timestamps/tags
- **approved** — user reviewed and approved on ReviewPage
- **synced** — pushed back to YouTube via `videos.update`
- **exported** — downloaded as text/CSV

## Setup

### 1. Backend

```bash
cd backend
python3.10 -m venv .venv           # Python 3.10+ required
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # fill in values
```

`.env` keys:

| Var | Purpose | Required for |
|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Cloud Console | Channel OAuth flow |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Channel OAuth flow |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to service-account JSON | BigQuery / DWD (optional) |
| `YOUTUBE_API_KEY` | API key for public reads | Public video metadata fetch |
| `GEMINI_API_KEY` | Gemini API key | Metadata generation |
| `CORS_ORIGINS` | Comma-separated frontend origins | Always |
| `DATABASE_URL` | SQLAlchemy URL | Always (defaults to SQLite) |

Run:
```bash
uvicorn main:app --port 8001 --reload
```

Health: `curl http://localhost:8001/health`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves on `5173` (or next free port, e.g. `5175`) and proxies `/api/*` → `http://localhost:8001`. If you change the backend port, update `vite.config.ts`.

### 3. Google OAuth (per-channel sync token)

Each YouTube channel needs an OAuth access token with `youtube.force-ssl` scope (covers read + write). Tokens last ~1 hour; refresh flow not yet wired.

**One-time Cloud Console setup:**
1. Enable YouTube Data API v3 on your project
2. OAuth consent screen → Testing mode → add your Google account as a Test user → add `youtube.force-ssl` scope
3. Credentials → OAuth 2.0 Client ID → Web app → add redirect URI `https://developers.google.com/oauthplayground`

**Minting a token:**
1. [OAuth Playground](https://developers.google.com/oauthplayground/) → gear → "Use your own OAuth credentials" → paste your Client ID + Secret
2. Step 1 → tick `youtube.force-ssl` → Authorize APIs → sign in with the channel-owner account → click-through the "unverified app" warning (Advanced → Go to app)
3. Step 2 → Exchange authorization code for tokens → copy `access_token` (starts with `ya29.`)
4. In the app → Channel Management → pencil icon on the channel → paste into Access Token → Save

Sanity check the token:
```bash
curl -H "Authorization: Bearer ya29..." \
  "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=CHANNEL_ID"
```

## Quota notes

- YouTube Data API default quota: **10,000 units/day** per Cloud project
- Read ops (channels, playlistItems, videos.list): 1 unit each
- `videos.update`: **50 units** each — plan accordingly
- Shared OAuth Playground demo client has exhausted quota; always use your own client

## Security

- `.env`, `backend/secrets/`, and `backend/yt_metadata.db` are gitignored — don't commit
- Access tokens and API keys leaked in chat/commits: rotate in Cloud Console → Credentials
- Service account private keys: rotate in IAM & Admin → Service Accounts → Keys

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `API 404: Not Found` on all calls | Backend not running or wrong port | Check `lsof -i :8001`; confirm `vite.config.ts` proxy target |
| `API 500` on channel sync | Upstream YouTube error (now surfaces real message) | Read the alert; usually quota or token scope |
| `quotaExceeded` on sync | Using shared OAuth Playground client | Switch to your own client in Playground gear settings |
| `access_denied` during OAuth | User not in Test Users list | Add email in OAuth consent screen → Test users |
| `401 Unauthorized` from YouTube | Token expired, wrong scope, or you pasted an auth code (`4/0...`) not an access token (`ya29...`) | Regenerate token via Playground Step 2 |
