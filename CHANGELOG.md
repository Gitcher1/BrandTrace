# Changelog

## Unreleased (2026-08-17 work session)

### Policy & governance
- Added `FUNDING_AND_ADVERTISING.md` — free forever for core features; advertising only if mission-aligned with small-business support and accountability.
- Added `GOVERNANCE.md` — current decision rights and path for broader developer participation.
- Expanded `CONTRIBUTING.md` to welcome other developers with clear principles, setup, and PR expectations.
- Updated `ROADMAP.md` with concrete near-term phases for scanner hardening and optional modular backend.
- Updated root `README.md` to surface free/open principles and new policy docs.

### Scanner
- Added `@zxing/browser` and `@zxing/library` as first-class dependencies.
- Reworked `src/utils/barcodeDecoder.js` for clearer native → local EAN/UPC → ZXing fallback order and better video-frame handling.
- Upgraded `BarcodeScanner` to continuous scanning (until detect or cancel) with a safety session limit, improved torch/camera switching, and clearer status messaging.

### Backend foundation (modular, optional)
- Added Postgres/Supabase-compatible `database/schema.sql` covering companies, brands, products, ownership, acquisitions, sources, evidence, submissions, and audit log.
- Updated `database/README.md` and `api/README.md` with integration principles that preserve local-first behavior.
- Added `src/utils/submissionPayload.js` — backend-agnostic builder for “Submit for review” payloads.

### UPC lookup (Open Food Facts connection)
- Extracted `src/utils/upcLookup.js` with clearer fetch, field filtering, app identification query params, and structured error messages (network, rate limit, not found, invalid barcode).
- Wired `App.jsx` `lookupUpc` to use the new helper so live scans reliably request product data from Open Food Facts after barcode detection.
- Lookup still only sends the barcode number; images stay local.
- Added mobile-visible `LookupStatus` component (barcode, status badge, notice, retry / manual actions).
- `BarcodeResult` now shows decoder used.
- Added `COMMIT_MESSAGE.txt` and `PR_DESCRIPTION.md` for GitHub.

### Contributor onboarding
- Added `docs/GOOD_FIRST_ISSUES.md` with scoped starting points.

### Mission tightening & Monthly Spotlight
- Updated `MISSION.md` and `PROJECT_PHILOSOPHY.md`: consumer power through the whole story; organic / non-GMO / farm-to-table as documented attributes; no boycotts.
- Added `docs/MONTHLY_SPOTLIGHT.md` for community-nominated local business features.
- Verification protocol extended for certifications, labels, and cross-market formulation claims (still source-based, still neutral).
- README and roadmap aligned with the same line: full information, consumer choice.

All changes keep the core product free, local-first by default, and open to additional developers.
