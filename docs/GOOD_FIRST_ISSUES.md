# Good First Issues / Contribution Ideas

These are intentionally scoped so new contributors can make meaningful progress without rewriting the whole app.

## Scanner

- Improve continuous-scan frame rate / CPU use on mid-range phones
- Better visual guidance when the barcode is partially out of frame
- Additional barcode formats beyond retail UPC/EAN where useful
- Automated tests with sample barcode images

## Local data & export

- Stronger validation on JSON import
- Optional compression or chunking for large local image sets
- Clearer storage-quota warnings before the browser fills up

## Submission pipeline

- Wire `src/utils/submissionPayload.js` into a “Submit for review” UI action
- Add optional environment-based Supabase (or other) endpoint that only activates when configured
- Reviewer notes / status history display

## Data model & docs

- Example RLS policies for the schema in `database/schema.sql`
- Seed data that is clearly marked as demo / research only
- Expand Verification Protocol examples

## Accessibility & UX

- Keyboard and screen-reader improvements for the scanner and record forms
- Clearer empty states and offline indicators

When you pick something up, open an issue (or comment on an existing one) so work is not duplicated. Keep changes modular and preserve the local-first, free-for-users guarantees.
