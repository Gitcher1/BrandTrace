# Database

This folder holds the conceptual and concrete data model for BrandTrace.

## Files

- `../DATABASE_MODEL.md` — high-level entity design and principles
- `schema.sql` — Postgres / Supabase compatible schema for the optional backend

## Design Goals

- Local-first client continues to work with zero backend.
- Optional cloud database exists primarily for:
  - Community submissions
  - Human review queue
  - Public verified records
- Verified data is always clearly separated from pending / community content.
- Other developers can run the schema locally or against Supabase / any Postgres host.

## Suggested Implementation Path

1. Apply `schema.sql` to a Postgres database (or Supabase project).
2. Enable Row Level Security.
3. Allow public `SELECT` only on rows with `status = 'verified'` (and related evidence/sources).
4. Allow `INSERT` into `submissions` (anonymous or lightly authenticated).
5. Restrict status changes and publication to reviewers / maintainers.

See `api/README.md` for client integration notes.
