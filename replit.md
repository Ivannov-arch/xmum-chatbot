# XMUM Campus Assistant

Port of the imported campus chatbot and administration portal. Preserve the imported UI, content, and behavior; this is a migration, not a redesign.

## Run

- Web workflow: `artifacts/campus-assistant: web`.
- API workflow: `artifacts/api-server: API Server`.
- The managed workflows supply `PORT` and route the web app at `/` and FastAPI at `/api`. Do not run a root-level `pnpm dev`.
- Install Node dependencies with `pnpm install`; Python dependencies with `uv sync --frozen`.
- Frontend check: `pnpm --filter @workspace/campus-assistant run typecheck`.
- Migration tests: `pnpm --filter @workspace/api-server test`.

## Structure

- `artifacts/campus-assistant/`: Vite/React frontend, original global CSS, mascot, public chat and `/admin` pages.
- `artifacts/api-server/python/`: original Python chatbot, FastAPI routes and knowledge seeds. The API artifact runs this Python service rather than replacing the original NLP implementation.
- `pyproject.toml` / `uv.lock`: Python runtime dependencies.
- `.migration-backup/`: unchanged imported source/reference material; excluded from deployment.
- Scaffold `lib/*` packages remain available but are not used to replace the existing Supabase database.

## Existing external services

Preserve Supabase authentication and database. Do not migrate the database without explicit authorization.

- Shared configuration: `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the original project (public anon/publishable key only, never service-role key). The Vite config exposes only these two public settings to the browser; Python reads the same settings at runtime.
- Optional browser overrides: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Optional: `GEMINI_API_KEY` enables the original semantic matching and translation.
- Optional: `VITE_API_URL` / `VITE_BACKEND_URL` override same-origin API requests when intentionally using an external backend.
- Without Supabase, the existing Python fallback loads the bundled JSON seeds. Public FAQ browsing uses that same loaded knowledge; admin sign-in and suggestion writes explicitly require configuration. Local knowledge is read-only, not a new database.
- Signed-in admin CRUD and persistent conversation logging cannot be verified without the original service credentials and an authorized account.

## Testing notes

`test_migration.py` verifies the actual imported FastAPI app with its lifespan and bundled knowledge. The imported legacy test suite also contains placeholder tests referring to obsolete classes; those were preserved rather than rewritten as part of the port.
