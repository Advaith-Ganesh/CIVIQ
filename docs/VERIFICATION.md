# Verification record

Verified on 17 October 2026 using Node 22.14.0 on macOS arm64.

- `npm run typecheck`: passed with strict TypeScript.
- `npm test`: 26 passed, including isolated SQLite migration, seed idempotence, persisted reports, unique references, assignment, legal/illegal transitions, repair evidence, manual closure, reopening and safe reset preserving resident records.
- `npm run build`: passed using Next.js Webpack. Turbopack failed to start an FSEvent stream on this restricted host.
- `npm audit`: zero known vulnerabilities after upgrading Sharp and Vitest and overriding Prisma's development-only deepmerge-ts dependency to 8.0.0. This describes the audit at build time, not a security guarantee.
- `npm run test:e2e`: executed locally. One API-only test passed; three browser-dependent tests were blocked at Chromium launch by macOS sandbox MachPort permission denial. These are not represented as passed.

## Alternative browser verification

Codex's supported in-app browser was used to execute the complete resident and officer journey against the running application:

1. Uploaded an actual JPEG file containing a clearly fictional evidence illustration; upload was decoded, re-encoded and persisted.
2. Selected Southampton coordinates and entered a street and description.
3. Reviewed honest text classification and a nearby duplicate candidate.
4. Explicitly chose a separate issue and submitted it; received `CIV-CE94B235F8`.
5. Located that reference in the council issue table.
6. Assigned Highways & accessibility and changed status to Acknowledged, then In progress.
7. Uploaded completion evidence and recorded an outcome.
8. Changed to Resolved pending verification, then Verified closed.
9. Added a private staff note and confirmed it was absent from the loaded public tracking view.
10. Requested reopening as the resident and observed Reopened status and timeline event.
11. Rejected the intentionally incorrect match between fictional streetlights A101 and A102.

An origin-check bug found during browser verification was fixed by comparing the Origin host to the incoming Host header. Next.js normalizes its internal request URL to localhost even when the browser uses 127.0.0.1.

The screenshots in this directory's `screenshots/` folder are genuine captures of the running local application. Seed evidence inside them is explicitly labelled synthetic SVG illustration. `image-analysis.png` shows text-only classification, not vision analysis.

## Limits

The standalone Playwright browser suite still needs execution on an unrestricted machine or GitHub Actions. CI configuration is included. No live AI, production council identity integration, formal accessibility audit, load test, legal review or real council-data evaluation has been performed. No human product-owner review is claimed.
