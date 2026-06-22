# Database Model

This document outlines the initial conceptual database model for BrandTrace. It is not an implementation schema yet.

## Design Principles

- Every factual ownership record should be traceable to sources whenever possible.
- Community submissions must remain separate from verified information until reviewed.
- Records should preserve history rather than silently overwrite important changes.
- The model should support products, brands, companies, ownership structures, acquisitions, and evidence.

## Core Entities

### Product

Represents a consumer product.

Potential fields:

- Product name
- Barcode or GTIN
- Brand reference
- Category
- Region or market
- Status
- Created and updated timestamps

### Brand

Represents the consumer-facing brand associated with products.

Potential fields:

- Brand name
- Description
- Website
- Current owner reference
- Status
- Source references

### Company

Represents a legal or operating company.

Potential fields:

- Company name
- Legal name
- Parent company reference
- Headquarters location
- Website
- Public/private status
- Source references

### Ownership Relationship

Represents an ownership connection between entities.

Potential fields:

- Owner entity
- Owned entity
- Ownership type
- Ownership percentage, when available
- Effective date
- End date, when applicable
- Verification status
- Source references

### Acquisition Event

Represents a documented acquisition, merger, divestiture, or similar event.

Potential fields:

- Acquirer
- Acquired entity
- Announcement date
- Completion date
- Transaction description
- Source references
- Verification status

### Source

Represents evidence used to support a claim.

Potential fields:

- Title
- Publisher or authority
- URL or citation
- Publication date
- Access date
- Source type
- Reliability tier
- Archived copy reference, when appropriate

### Submission

Represents a community or internal submission awaiting review.

Potential fields:

- Submitter reference, if available
- Submitted claim
- Related product, brand, or company
- Submitted sources
- Review status
- Reviewer notes
- Decision history

### Audit Log

Represents changes to records over time.

Potential fields:

- Entity type
- Entity identifier
- Change type
- Previous value
- New value
- Actor
- Timestamp
- Reason

## Status Values

Initial status values should include:

- Verified
- Pending Review
- Community Submission
- Disputed
- Archived
- Rejected

## Future Implementation Notes

The final implementation should include database migrations, indexing strategy, source integrity checks, record history, and clear APIs for distinguishing verified information from unverified submissions.
