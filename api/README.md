# API / Backend Integration Notes

BrandTrace is intentionally modular.

- The React client works fully offline using `localStorage`.
- An optional backend (Supabase, self-hosted Postgres + thin API, etc.) can be added later for submissions and public verified data.
- Core free features never require an account or paid service.

## Recommended Direction

1. **Short term**: Keep using local storage. Add a “Submit for review” action that packages local product / company / evidence drafts into a JSON payload.
2. **Next**: Point that payload at a Supabase `submissions` table (or equivalent) using the schema in `database/schema.sql`.
3. **Later**: Add a simple review UI and public read endpoints limited to `status = 'verified'`.

## Client Integration Principles

- Never block scanning, manual entry, or local save on network availability.
- Only send barcode numbers (not images) to public product lookup services when the user initiates lookup.
- Images and camera frames stay in the browser unless the user explicitly exports or attaches them to a submission they control.
- Submission is always an explicit user action.

## Environment

If/when a backend is connected, configuration should live in environment variables (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and remain optional. The app must degrade gracefully when they are absent.

## Contributing

Improvements to the schema, RLS policies, submission payload shape, or a thin API layer are welcome. Keep changes modular so the local-first path is never broken.
