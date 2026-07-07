# BrandTrace

BrandTrace is a consumer transparency platform developed by **Ember Fire Media**.

**Tagline:** Scan. Trace. Decide.  
**Domain:** [brandtrace.fyi](https://brandtrace.fyi)

BrandTrace helps consumers understand who owns the products they purchase through factual, source-based ownership information. The long-term mission is to build a trusted consumer ownership database that documents information, verifies sources, and lets consumers decide.

> We document.
>
> We verify.
>
> Consumers decide.

## Public Website

This repository now includes a deployable BrandTrace public website built with React and Vite. The website now includes a soft-launch local-first BrandTrace MVP for product scanning/upload workflows, company records, evidence trails, and local import/export. It does not include backend services, authentication, cloud storage, paid APIs, or external services.

### Pages and Sections

The public website includes:

- Soft-launch dashboard with quick actions and local record counts
- Scanner & Upload Hub for barcode/QR manual entry, product photo uploads, mobile camera capture, evidence document metadata, and manual product entry
- Product Records Database with search, filters, detail cards, editing, and delete confirmations
- Company Database with ownership fields, technology categories, evidence status, confidence, and brand ownership mapping
- Evidence Trail System for company or product claims, excerpts, source URLs, status, confidence, and review notes
- Data Import / Export tools for JSON backups and product, company, and evidence CSV exports
- Clearly marked demo seed data for soft-launch testing
- Footer with Ember Fire Media attribution and proprietary notice

## Scanner, Upload, and Local Database Features

BrandTrace currently runs as a local-first browser app. Users can:

- Start a scan/upload workflow from the dashboard.
- Manually enter UPC/barcode values, QR/manual codes, product names, brands, parent companies, store/location, dates, and notes.
- Upload existing product or label photos with categories such as product photo, front label, ingredient label, nutrition label, barcode photo, company/contact label, receipt photo, and other evidence photo.
- On supported mobile browsers, use **Take Photo** controls to launch the device camera for product labels, ingredients, nutrition panels, barcodes, contact labels, receipts, and evidence photos.
- Store uploaded and camera-captured image previews as local data URLs in `localStorage` only.
- Save report/document metadata without server upload, OCR, or file parsing.
- Create product records from scans, uploads, or manual entry.
- Create company records and map brand ownership as owned, licensed, distributed, acquired, or unclear.
- Add evidence trail records connected to products or companies.
- Search products and filter by company, technology category, and evidence status.
- Search brand ownership entries to find likely parent company relationships.

## Local-First Storage Warning

All saved BrandTrace user data is stored in this browser using `localStorage` keys such as:

- `brandtraceCompanies`
- `brandtraceProducts`
- `brandtraceEvidence`
- `brandtraceScans`
- `brandtraceUploads`
- `brandtraceSettings`

Large image uploads or camera captures can fill local device storage. Browser data can also be cleared by the user, browser settings, operating-system cleanup, private browsing modes, or device migration. Export backups regularly before relying on local records.

## Import and Export

The Data Import / Export section supports:

- Export all BrandTrace data as JSON.
- Export product records as CSV.
- Export company records as CSV.
- Export evidence records as CSV.
- Import a BrandTrace JSON backup by merge or overwrite.
- Gracefully report invalid JSON imports.
- Clear marked demo/sample records.
- Reset all local BrandTrace data with a strong confirmation prompt.

## Soft Launch Limitations

The current MVP is intentionally careful and local-only:

- No backend, authentication, cloud database, paid API, or external service is included.
- Barcode/QR camera scanning is limited to browser support for native `BarcodeDetector`; unsupported devices show a manual-entry fallback.
- Camera capture uses mobile-friendly file input support (`accept="image/*"` with `capture="environment"`). Some desktop browsers and mobile browsers may ignore the capture hint, show a normal file picker, or require camera permission.
- Camera permission denial, cancellation, or unsupported capture should not block upload fallback or manual product entry.
- Uploaded and camera-captured images are not committed to the repository and are not uploaded to a server.
- Evidence documents are represented by metadata and notes only; OCR, parsing, and document storage are not implemented.
- Demo seed records are clearly marked as research/demo records and should not be treated as verified retail availability.
- BrandTrace separates verified facts, watchlist items, disputed items, needs-review records, and unverified viral claims.

## Future Roadmap

Planned future improvements include:

- Real barcode lookup integration.
- Live barcode scanning and barcode-to-product matching.
- OCR ingredient, nutrition label, receipt, and company/contact label extraction.
- Public evidence database.
- User-submitted verification queue.
- Admin review dashboard.
- Retailer listing verification.
- UPC/photo matching.
- Company ownership graph visualization.
- Community fact-check workflow.

## Local Development

### Prerequisites

- Node.js 18 or newer
- npm

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

Vite will print a local development URL, typically `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

The production build will be generated in the `dist/` directory.

### Preview the Production Build

```bash
npm run preview
```

## Deploying to Vercel

This project is ready for Vercel deployment from the repository root.

1. Import the repository into Vercel.
2. Keep the framework preset as **Vite** if Vercel detects it automatically.
3. Use the default build settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.
5. Add `brandtrace.fyi` as the production domain in the Vercel project settings.

## Purpose

BrandTrace is designed to help users eventually:

- Scan retail products using barcodes.
- Identify the parent company that owns a brand.
- View corporate ownership structures.
- View acquisition history.
- View documented sources supporting ownership information.
- Submit new products for review.
- Submit corrections to existing records.
- Create personal watchlists.
- Discover transparent businesses.
- Learn about ownership relationships between brands and corporations.

## What BrandTrace Is

BrandTrace is:

- A consumer information platform.
- A transparency initiative.
- A factual ownership database.
- A community-driven verification project.

## What BrandTrace Is Not

BrandTrace is not:

- A political platform.
- A corporate attack platform.
- A boycott application.
- A place for unsupported accusations.

BrandTrace does not tell consumers what to think. BrandTrace gives consumers the information needed to think for themselves.

## Core Standard

Every factual statement should be verifiable whenever possible. BrandTrace clearly distinguishes between:

- Verified Information
- Pending Review
- Community Submission
- Opinion

No unsupported claim should ever be presented as fact.

## Development Principles

- Prioritize trust over speed.
- Prioritize facts over opinions.
- Prioritize documentation over assumptions.
- Favor clean architecture over shortcuts.
- Ensure every feature improves transparency.
- Ensure every database record is traceable to reliable sources whenever possible.
- Ensure community submissions are reviewed before becoming verified.

Before implementing any feature, ask:

1. Does this increase transparency?
2. Does this improve trust?
3. Does this empower consumers?
4. Can this information be verified?
5. Will this still make sense five years from now?

If not, redesign it.

## Repository Structure

```text
BrandTrace/
├── app/                    # Future consumer-facing application code
├── api/                    # Future backend API services
├── assets/                 # Shared brand, design, and static assets
├── database/               # Database schema, migrations, seed data, and data governance notes
├── docs/                   # Project documentation and operating principles
├── images/                 # Image resources, screenshots, and visual references
├── logos/                  # Logo files and brand identity assets
├── research/               # Source research, verification notes, and evidence records
├── src/                    # Public website React source
└── website/                # Public website notes and future marketing/policy pages
```

## Project Documents

- [Mission](MISSION.md)
- [Project Philosophy](PROJECT_PHILOSOPHY.md)
- [Roadmap](ROADMAP.md)
- [Verification Protocol](VERIFICATION_PROTOCOL.md)
- [Database Model](DATABASE_MODEL.md)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE)

## Developed By

BrandTrace is developed by **Ember Fire Media**.

Company slogan:

> When systems fail, we build our own.

## UPC Lookup and Product Auto-Fill

BrandTrace now includes an optional UPC lookup flow in the Scanner & Upload Hub. A user can enter a barcode manually, reuse a barcode already typed into the scan form, upload barcode/label photos for local recordkeeping, clear the lookup field, retry a lookup, or refresh cached lookup data.

When public lookup is enabled, BrandTrace calls the Open Food Facts public barcode endpoint with no API key:

```text
https://world.openfoodfacts.org/api/v2/product/{barcode}.json
```

If Open Food Facts returns a product, BrandTrace creates a review draft instead of immediately treating the record as final. The draft may include product name, brand, UPC/barcode, category, ingredients text, nutrition notes, image URL, packaging/labels, country/market, source name, source URL, lookup date, and source badges. The review screen reminds users that public product lookup data may be incomplete or outdated and should be corrected before saving.

BrandTrace attempts to match the returned brand against the local company database by company name, known brands, brand ownership entries, case-insensitive comparison, and punctuation-insensitive comparison. A match links the product to the local company record and displays local company-match language. If no match is found, the parent company remains unknown, the company status is marked as needing research, and the user can create a low-confidence company draft from the lookup.

Successful public lookups can also create a local evidence record. These evidence records use the source name Open Food Facts, source URL, date found, related product and matched company when available, the claim “Product identity and label data,” a needs-review evidence status, and notes reminding users that public product data may be user-contributed and should be verified against the physical label.

### Lookup Cache

UPC lookup cache entries are stored locally in `localStorage` under:

- `brandtraceLookupCache`

The cache stores compact lookup metadata such as barcode, source, found/not-found status, fetch time, normalized product data, and a short summary. BrandTrace checks existing saved products and cached lookup results before calling Open Food Facts when local-first behavior is enabled. Cached results display “Using saved lookup data. You can refresh this lookup.”

### Lookup Privacy

UPC lookup requires internet access and sends the barcode number to Open Food Facts. Uploaded photos stay local in browser storage unless the user chooses to export or share their BrandTrace data. No backend, authentication, hidden API key, paid UPC service, or cloud database is used.

### Public Database Limitations

Open Food Facts is a public product database and may contain user-contributed, incomplete, outdated, regional, or label-version-specific data. BrandTrace treats lookup results as helpful starting points, not verified truth. Product identity, ingredients, nutrition details, packaging claims, and parent-company ownership should be checked against the physical label and stronger evidence before marking any record verified.

### Updated Roadmap

Future UPC and verification improvements may include:

- GS1 verification support.
- Paid UPC database support.
- OCR ingredient extraction.
- Parent company ownership graph.
- Admin review queue.
- Public verified BrandTrace database.
