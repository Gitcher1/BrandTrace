# Monthly Local Business Spotlight

## Purpose

Once per month, BrandTrace can showcase a local or independent business nominated by users. The goal is to **applaud concrete transparency practices** — especially in food, farm-to-table, organic / non-GMO / heirloom production, and clear ownership or sourcing — so other producers and consumers can learn from them.

The Spotlight is recognition of practices, not a ranking of “good vs bad” companies, and not a substitute for the verified ownership database.

## What we highlight

Examples of practices worth featuring:

- Clear public ownership or founder story
- Documented farm-to-table or regional sourcing
- Organic, non-GMO, heirloom, or equivalent certifications that can be checked
- Honest labeling (ingredients, allergens, processing)
- Willingness to answer product or sourcing questions
- Independent or small-business scale with accountable leadership

## Nomination process (v1)

1. User submits a nomination (business name, location, website if any, short description of what they do transparently, and any sources or links).
2. Submission is marked **community nomination / pending review**.
3. A reviewer checks that the practices described are specific and supportable.
4. One featured business is selected per month (more later if capacity allows).
5. The published Spotlight page includes:
   - Business name and location
   - Short plain-language description
   - Specific transparency practices called out
   - Links or sources where available
   - Clear label: “Monthly Spotlight — community nomination, reviewed for publication”
   - Disclaimer that Spotlight is not a verified ownership record and not an endorsement of every product they sell

## Rules

- No pay-for-placement. Spotlight cannot be bought.
- Nominations that are only vague praise (“they’re the best”) without practices are declined or returned for detail.
- Spotlight does not attack competitors.
- Spotlight does not claim FDA policy positions or political conclusions.
- If a featured business’s ownership or claims later need correction, the Spotlight note is updated or archived with a short explanation.

## Relationship to core data

| Spotlight | Verified ownership / product records |
|-----------|--------------------------------------|
| Story and practices | Structured fields + sources |
| Monthly feature | Ongoing database |
| Community nomination + light review | Full verification protocol |
| Celebrates examples | Documents facts for any brand |

Both serve the same mission: more information in the consumer’s hands. They stay visually and structurally separate so no one confuses a feature story with a verified ownership claim.

## Implementation notes (future UI)

- Simple nomination form (local or eventually submitted to backend `submissions` with type `spotlight_nomination`)
- Public “Spotlight” page or home-section card for the current month
- Archive of past spotlights
- Optional: user votes or “useful practice” tags — only after basic review workflow is solid

Until the form exists, nominations can be collected via GitHub issues or a published email/contact channel listed on the site.
