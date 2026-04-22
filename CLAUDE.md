# CLAUDE.md — project context for Claude Code

## What this is

Full-stack web app: FastAPI (Python 3.10+) + React (Vite/TS/Tailwind). Ingests YouTube videos, generates AI metadata with Gemini, user reviews/approves, then pushes back to YouTube or exports.

## Running services (dev)

- Backend: `uvicorn main:app --port 8001 --reload` from `backend/` — runs on **8001**, not 8000 (8000 is used by another unrelated project at `~/Documents/Claude/Projects/FAQ/`)
- Frontend: `./node_modules/.bin/vite` from `frontend/` — runs on 5173 or the next free port (often 5175); proxies `/api/*` to 8001 via `vite.config.ts`
- Logs: `/tmp/yt-backend.log`, `/tmp/yt-frontend.log` (when run in background)

## Critical architecture points

- **Status state machine on Video**: `draft → keywords_ready → generated → approved → synced|exported`. Don't bypass states; use the appropriate router endpoint (keywords, metadata, review, sync_export).
- **Channel.access_token** is a per-channel OAuth user token (`ya29.*`), not a client secret or service account. Tokens expire in ~1h. Refresh flow not yet implemented — user manually re-pastes via the pencil/edit UI.
- **Sync endpoints are two distinct flows:**
  - `POST /api/channels/{id}/sync` — pulls uploads list from YouTube into `videos` table
  - `POST /api/videos/{id}/sync` — pushes approved title/description/tags back to YouTube via `videos.update`
- **Upsert semantics**: `POST /api/channels` is an upsert keyed on `youtube_id`. Changing `youtube_id` in the edit UI would create a new row, so the UI keeps that field read-only.
- **Error handling pattern**: upstream YouTube API errors in `channels.py` are caught and translated to meaningful HTTPException detail (401 → "token invalid", 403+`quotaExceeded` → "use own Cloud client", etc.). Any new routers calling YouTube should do the same — don't let httpx HTTPStatusError bubble up as a generic 500.

## Conventions

- **Frontend API layer**: all calls go through `frontend/src/lib/api.ts` via the single `request<T>` wrapper. Don't call `fetch` elsewhere. Error messages from backend `detail` fields bubble up as `Error.message`.
- **Python style**: type hints required on all endpoint handlers. Pydantic models for request bodies. Database access only via `Depends(get_db)`.
- **Frontend style**: functional components, hooks, Tailwind. Lucide-react for icons. No external state library — `AppContext` is enough.
- **No tests** — the project has no test suite yet.

## Secrets and env

- `backend/.env` holds OAuth client ID/secret, API keys, DB URL. Gitignored.
- `backend/secrets/service-account.json` holds the service account file. Gitignored.
- **Never commit**: `.env`, `backend/secrets/`, `backend/yt_metadata.db`.

## Things that are easy to get wrong

- **Scopes matter**: `youtube.readonly` works for channel sync (reads) but NOT for `videos.update` (writes). For writes, the token must have `youtube` or `youtube.force-ssl` scope.
- **Auth code vs access token**: OAuth Playground's URL shows `?code=4/0...` after Step 1. This is NOT a token — it's the authorization code. The user must click Step 2 "Exchange authorization code for tokens" to get the real `ya29....` access token. This has tripped up the user before.
- **Shared Playground client**: `407408718192.apps.googleusercontent.com` is Google's demo client and its quota is always exhausted. Always use the project's own client (`441252924625-...`) via Playground's gear icon → "Use your own OAuth credentials".
- **Service accounts can't own YouTube channels**. Don't try to use `GOOGLE_APPLICATION_CREDENTIALS` as a channel token. Service accounts only work for YouTube via Domain-Wide Delegation (requires Workspace admin).
- **Vite proxy is port-sensitive**: `vite.config.ts` hardcodes `target: http://localhost:8001`. If someone changes the backend port, update here too and restart vite (HMR doesn't pick up proxy config changes).

## Workflow hints for future tasks

- Before starting the backend, check `lsof -i :8001` — a stale process will make uvicorn fail silently or cause 404s.
- Before generating a new OAuth token, tell the user to verify `client_id` in the Playground request is `441252924625-...` not `407408718192`.
- Don't re-read files just-written; the Write/Edit tool confirms success.
- The frontend dev server is usually already running — check `lsof -i :5175` before spawning a new one.
