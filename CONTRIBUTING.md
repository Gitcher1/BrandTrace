# Contributing to BrandTrace

Thank you for your interest in contributing.

BrandTrace is a free, open project focused on consumer transparency. We document brand and corporate ownership relationships with sources so people can decide for themselves. We are not a political platform, boycott tool, or place for unsupported accusations.

Other developers are welcome and encouraged to join.

## Core Principles (non-negotiable)

- Prioritize trust over speed.
- Prioritize facts over opinions.
- Prioritize documentation over assumptions.
- Favor clean, modular architecture over shortcuts.
- Keep verified information clearly separated from unverified or community submissions.
- Use neutral language.
- The core product remains free for users forever (see FUNDING_AND_ADVERTISING.md).

Before implementing any feature, ask:

1. Does this increase transparency?
2. Does this improve trust?
3. Does this empower consumers?
4. Can this information be verified?
5. Will this still make sense five years from now?

If the answer to any of these is no, redesign it.

## Ways to Contribute

You can help with:

- **Scanner & camera experience** — continuous scanning, more formats, better mobile support, accessibility
- **Local-first data layer** — storage, import/export, offline resilience
- **Backend & submission pipeline** — schema, review workflow, optional sync (modular so the app still works fully offline)
- **Data model & verification tools** — ownership relationships, evidence trails, audit history
- **Documentation** — clearer guides, examples, architecture notes
- **Testing** — unit tests, static checks, real-device barcode tests
- **UI/UX & accessibility**
- **Research workflows** — better ways to capture and cite sources

High-value starting points are often labeled in issues. If none exist yet, open an issue describing what you want to work on before large changes.

## Development Setup

```bash
git clone <repository-url>
cd BrandTrace
npm install
npm run dev
```

Requirements: Node.js 18+.

Useful scripts:

- `npm run dev` — local development server
- `npm run build` — production build
- `npm test` — static tests for barcode decoder and OCR helpers

## Code Style and Architecture Expectations

- Keep the **local-first** path working even when the optional backend is unavailable.
- Prefer small, focused modules (scanner utilities, storage helpers, submission payload builders, etc.).
- Do not introduce paid APIs, hidden credentials, or required accounts for core free functionality.
- New dependencies should be justified and preferably well-maintained.
- Avoid coupling UI components tightly to any specific backend provider.

## Evidence and Data Contributions

When contributing factual ownership information:

- Include reliable sources whenever possible.
- Never present unsupported claims as verified fact.
- Community submissions start in a pending / needs-review state.
- Follow the Verification Protocol.

A useful submission includes:

- The claim
- The product, brand, or company involved
- Supporting sources (URLs, documents, quotes with context)
- Any known uncertainty or conflicting information

## Pull Request Process

1. Open an issue first for non-trivial changes (architecture, new backend tables, scanner behavior changes, policy).
2. Keep PRs focused. Prefer several small PRs over one large one.
3. Describe what changed and why.
4. Note any impact on local-first behavior, privacy, or verification status handling.
5. Maintainers will review for mission alignment, code quality, and test coverage.

## Conduct

Be respectful, precise, and collaborative. See CODE_OF_CONDUCT.md.

Disagreements about facts should be resolved by improving sources and documentation, not by pressure or volume.

## Governance and Funding

- Decision-making and review authority: see GOVERNANCE.md
- Free-forever commitment and advertising boundaries: see FUNDING_AND_ADVERTISING.md
- Mission and philosophy: see MISSION.md and PROJECT_PHILOSOPHY.md

## Questions

Open a GitHub issue. For sensitive verification or security topics, follow any contact method listed in the repository or by Ember Fire Media.

We are glad you are here. The more careful, modular, and well-sourced contributions we receive, the stronger BrandTrace becomes.
