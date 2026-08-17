# Roadmap

This roadmap is intentionally high-level. BrandTrace prioritizes trust, verification, and durable architecture before rapid feature delivery. The core product remains free for users.

## Phase 0: Project Foundation (largely complete)

- Establish mission, philosophy, contribution standards, and verification protocol.
- Define initial repository structure.
- Document early database concepts and information classifications.
- Publish FUNDING_AND_ADVERTISING.md and GOVERNANCE.md.
- Keep the local-first MVP usable offline.

## Phase 1: Research and Data Governance

- Define source reliability tiers.
- Create reviewer workflows for community submissions.
- Draft data retention, correction, and dispute policies.
- Identify initial public data sources for brand ownership research.

## Phase 2: Core Data Model

- Design normalized models for products, barcodes, brands, companies, ownership relationships, acquisitions, and sources.
- Add audit trails for record changes.
- Add status fields for verified, pending review, community submission, disputed, and archived records.
- Publish a concrete schema (see `database/`) that can be implemented in Postgres / Supabase or equivalent.

## Phase 3: Live Scanner Hardening (current priority)

- Make continuous live barcode scanning reliable across more browsers and devices.
- First-class support for ZXing as a robust fallback alongside native BarcodeDetector and the local EAN/UPC decoder.
- Improve torch, camera switching, focus guidance, and timeout / retry behavior.
- Keep all image processing local; only barcode numbers are sent to public product lookup services when the user chooses.

## Phase 4: Optional Backend & Submission Pipeline

- Introduce a modular, optional backend (Supabase or self-hosted Postgres) for:
  - Community submissions
  - Review queue
  - Public verified records
- Local data remains the default. Sync / submit is explicit and opt-in.
- Submissions start as pending and only become public after review.
- Design so other developers can run the backend locally or contribute to either the client or the server side independently.

## Phase 5: Internal Review Tools

- Build reviewer interfaces for evaluating submissions.
- Track evidence, reviewer notes, and publication decisions.
- Require source documentation before verified publication.

## Phase 6: Public Consumer Experience (expanded)

- Product lookup and barcode search against the growing verified set.
- Display ownership relationships and source citations clearly.
- Present information classifications (Verified / Pending / etc.) without implying unsupported facts.
- Document product attributes and certifications (organic, non-GMO, etc.) when sources support them; document formulation or packaging concerns the same way — as sourced facts, not campaigns.
- Personal local watchlists and export tools remain available offline.
- Monthly Local Business Spotlight: community nominations, light review, public feature of concrete transparency practices (farm-to-table, clear labeling, independent ownership). See `docs/MONTHLY_SPOTLIGHT.md`.

## Phase 7: Community Contributions at Scale

- Support user-submitted products, corrections, and source suggestions with clear moderation.
- Light reputation or trust signals for reviewers (never for selling influence).
- Maintain strict separation between community content and verified records.

## Phase 8: Watchlists, Discovery, and Ownership Graphs

- Personal watchlists.
- Discovery of transparent businesses.
- Visual ownership / parent-company graphs backed by sourced relationships.
- Help users understand structures without directing consumer behavior.

## Phase 9: Public Trust Infrastructure

- Publish transparency reports.
- Document correction history.
- Provide exportable source references where appropriate.
- Strengthen long-term governance while remaining open to new developers.

## Guiding Constraints

- Core experience stays free.
- Advertising, if ever introduced, must follow FUNDING_AND_ADVERTISING.md.
- Architecture stays modular so contributors can improve scanner, data model, backend, or UI without rewriting everything.
- Every factual public claim remains traceable to sources.
