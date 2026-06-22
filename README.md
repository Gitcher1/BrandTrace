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

This repository now includes a deployable BrandTrace public website built with React and Vite. The website is intentionally focused on the early public foundation for the project and does not include the future mobile app, database, or backend services.

### Pages and Sections

The public website includes:

- Home
- About
- Join the Project
- Contact
- Verification Standards
- Roadmap
- Hero section
- Mission section
- How BrandTrace Works section
- Verification principles
- Community invitation
- Positive transparency spotlight
- Footer with Ember Fire Media attribution

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
