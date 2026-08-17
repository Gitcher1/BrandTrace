## Summary

This PR hardens the live scanner and Open Food Facts UPC connection, adds clear mobile lookup status, and establishes open-contribution + free-forever policy docs so other developers can join without ambiguity.

## What changed

### Scanner
- Continuous scanning (until detect or cancel) with a safety session limit
- First-class `@zxing/browser` / `@zxing/library` fallbacks alongside native `BarcodeDetector` and the local EAN/UPC decoder
- Clearer camera / torch / permission messaging

### UPC lookup (Open Food Facts)
- New `src/utils/upcLookup.js` — structured fetch, field filtering, app identification query params
- Better errors for offline, rate limit (429), not found, invalid barcode, and network failure
- Auto-lookup still runs after a successful retail barcode scan
- **Only the barcode number is sent**; images never leave the browser

### Mobile troubleshooting UI
- New `LookupStatus` component shows barcode + status badge + notice + retry/manual actions
- `BarcodeResult` now shows which decoder succeeded

### Backend foundation (optional, modular)
- `database/schema.sql` for companies, brands, products, ownership, evidence, submissions, audit log
- `src/utils/submissionPayload.js` for a future “Submit for review” flow
- Local-first behavior is preserved; backend is not required

### Policy & contribution
- `FUNDING_AND_ADVERTISING.md` — free forever for core features; advertising only if mission-aligned
- `GOVERNANCE.md` — current decision rights and path for broader participation
- Expanded `CONTRIBUTING.md`, updated `ROADMAP.md` / `README.md`
- `docs/GOOD_FIRST_ISSUES.md`

## How to test

1. `npm install`
2. `npm run dev`
3. Open on phone (HTTPS or localhost)
4. Scan a known food UPC → should see **Lookup status** move to “Looking up…” then “Found” or a clear error
5. Confirm Settings → **Enable public UPC lookup** is on
6. Confirm offline: scan still saves locally; lookup shows offline-friendly message

## Notes

- MIT license retained
- No paid APIs or required accounts for core free use
- Deploy after merge so the live site picks up the lookup + status UI
