# CIVIQ AI V2 verification

Executed on 17 October 2026 against the existing repository. Baseline and preservation plan: [V2-AUDIT.md](V2-AUDIT.md).

## Local execution

- ESLint: passed with zero warnings. Strict TypeScript: passed.
- Vitest: 42 tests across four files passed, including the original 26. Disposable database integration tests verify idempotent imports, no issue creation for evaluation images, manual report preservation on inference failure, accessibility persistence and safe demo reset with analysis rows.
- Python pytest: six tests passed, covering authentication, actual unloaded state, unavailable inference, bounded batches, invalid/oversized images and abstention logic. One upstream Starlette/httpx deprecation warning remains.
- Production Next.js webpack build: passed. Production staff guard was tested: workspace required a staff token, then unlocked with an ephemeral local verification token.
- Additive migrations applied to the existing SQLite database. No existing migration was replaced; original record IDs and media retained. Fresh disposable migration/seed databases passed in integration tests.

## Executed genuine models

Both pinned models downloaded from their official Hugging Face repositories and loaded on CPU. A real licensed pothole photograph produced a pothole result, raw logit 6.356 and sigmoid similarity 0.998268 in 596.2 ms in the first direct check. Sanitized-image browser analyses produced slightly different actual scores/timings, correctly recorded in AI Lab.

The four-image evaluation script actually executed: two pothole and two graffiti samples; accuracy 4/4, macro F1 1.0, coverage 1.0. The deterministic majority baseline achieved 2/4 and macro F1 0.333. Full predictions, raw candidates, distribution, model revision and date are in [the measured JSON](evaluation/v2-smoke-evaluation.json). This is a tiny convenience smoke test with no holdout set or independently adjudicated labels, not general civic accuracy.

Actual MiniLM embedding check: related pothole/accessibility descriptions had cosine 0.683; unrelated graffiti description had cosine 0.117. Actual same-image repair comparison returned cosine 1.0 / Possibly unresolved with a supporting-evidence warning. A forced review threshold caused real abstention. Invalid image bytes returned HTTP 400, available=false and fallback=manual.

## Browser workflows and captures

The local standalone Playwright Chromium launcher is blocked by the host's macOS MachPort sandbox. The running application was therefore additionally exercised through Codex's in-app browser using its Playwright locator API and genuine screenshot API. Full headless Chromium workflows run in the repository's GitHub Actions CI; screenshots are uploaded as the playwright-evidence artifact.

Executed locally against the production build: licensed AI Lab classification; five-step report upload/location/details/accessibility; actual model abstention on fictional illustration; manual correction; genuine MiniLM duplicate candidates; separate report submission; council assignment; legal status transitions; repair upload; actual image comparison; manual closure; public tracking and reopening. The added report is explicitly labelled fictional in its description, reference CIV-57C64A2881. It is an actual app submission, not a genuine council incident.

The map/inspector selection and sidebar collapse were exercised. A Leaflet error occurred during development hot reload after rebuilding; the fresh production build rendered the hotspot and dashboard maps correctly. Mobile report and dashboard layouts were checked at 390×844 with document width 390 (no horizontal overflow). Genuine captures are under `docs/screenshots/v2-*.png`. Existing V1 screenshots remain for historical evidence.

## Limits

No live council issue integration, representative model validation, calibrated confidence, production SSO or hosted inference/storage was completed. Four evaluation images cover only two classes. Image repair comparison and hotspot concentrations are experimental support for officers, not safety or citywide risk conclusions. See [provenance](DATA-PROVENANCE.md) and README deployment requirements.
