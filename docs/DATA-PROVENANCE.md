# CIVIQ V2 data provenance

Verified 17 October 2026. CIVIQ is an independent prototype with no connected council complaints feed.

## Classifications

| Database value     | Meaning                                                      | May populate issue geography?              |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| OFFICIAL_AGGREGATE | Published council-level context, not individual complaints   | No                                         |
| PUBLIC_HISTORICAL  | Licensed supplied historical geolocated issue records        | Yes, only supplied Southampton coordinates |
| USER_SUBMITTED     | Reports and test uploads actually submitted to CIVIQ         | Yes, through the resident workflow         |
| MODEL_EVALUATION   | International labelled image samples and evaluation metadata | No                                         |
| SYNTHETIC_DEMO     | Repeatable fictional report/photo fixtures                   | Fictional locations, explicitly labelled   |

Existing seed reports and illustration photographs were backfilled as synthetic. Existing real application submissions retain their IDs and user-submitted classification, including explicitly fictional browser verification reports. User identity and report independence are not verified. Canonical issue provenance follows the issue's origin; source metadata remains attached to individual reports and photographs.

## Official Southampton aggregate

Source: [Southampton Data Observatory, Waste](https://data.southampton.gov.uk/place/environment/waste/). Reference period: 2024/25. Published measure: **47.1 fly-tipping incidents per 1,000 residents**. Last-known page update: 29 June 2026. Checked: 17 October 2026.

Stored as source `southampton-waste`, with the value, unit, period, page-update date and verification date in its payload. It provides contextual evidence on the landing/data pages, never issue coordinates. The statistic is attributed factual context. Broader reuse/licensing terms have not been verified; this is not a claim of permission to republish the complete underlying dataset. No unverified 12,208 total is presented. Recording practices affect comparisons.

## Licensed evaluation photographs

Metadata and exact source/download/licence URLs, attribution, source dates, geography and caveats are in [the tracked manifest](../datasets/manifests/commons-smoke.json). Original public Commons API metadata was checked and each downloaded photograph visually inspected. Labels are source-description labels checked by the coding agent; they are not independent human adjudications.

| Original Commons page ID | Subject / coverage                       | Author             | Licence      | Source date  |
| ------------------------ | ---------------------------------------- | ------------------ | ------------ | ------------ |
| 107728665                | Pothole, Stockholm, Sweden               | Frankie Fouganthin | CC BY-SA 4.0 | 18 July 2021 |
| 73172959                 | Marked pothole, Sonning Common, UK       | ProstheticHead     | CC BY-SA 4.0 | 1 June 2018  |
| 88403418                 | Karl Marx graffiti, Berlin Wall, Germany | Kurt Kaiser        | CC0          | 29 June 2019 |
| 62213124                 | Graffiti, Milan, Italy                   | Chris Barbalis     | CC0          | 13 June 2016 |

Reference dates have day precision; midnight UTC is a storage convention, not a known capture time. Manifest import date is 17 October 2026. Download receipts store byte counts and SHA-256 hashes in ignored local cache. Images are downloaded by `npm run data:download` into `datasets/cache/commons-smoke`, not committed to Git. The app sanitizes copies for AI Lab preview. Preserve attribution and CC BY-SA obligations if redistributing or adapting those images. Screenshots containing Commons images inherit applicable image attribution obligations; the manifest identifies them.

Each sample is a separate MODEL_EVALUATION source/ImportedRecord, with original ID, source URL, attribution, licence, collection/reference date, import date, geographic coverage and limitations. AI Lab photos retain source/original ID. None receives Southampton coordinates, a resident reference or a canonical issue. A new checkout may show manifest_only until images are downloaded. A checked-in dated evaluation is a historical measurement, not proof that the current local service has loaded.

No Kaggle samples were imported: access/licensing could not be verified through the available public page. The RoadDamageDetector repository was inspected as a candidate but its dataset reuse rights were not verified. No invented or inaccessible dataset metrics are shown.

## Import contract

`scripts/import-data.ts` supports manifest JSON, CSV/JSON records, labelled image directories and allowlisted HTTPS endpoints. The UI accepts a manifest file or pasted manifest JSON. Every source requires ID/name, HTTPS URL, approved licence, explicit `licenceReviewed: true`, attribution, coverage, reference timestamp, classification and limitations. Every record requires its original ID and reference timestamp. Import timestamps are generated by the application. Source metadata is preserved once per source, linked to every imported record.

The approved licence list and affirmative review flag enforce explicit operator input, not automatic legal review. Operators must inspect the source's actual terms and permissible use. Restricted/protected sites are not scraped. Import batches are bounded to 500 records / 2 MB CLI input. URL imports require an allowlisted host, a timeout and no redirects. Duplicate source/original IDs are idempotent; source classification cannot change. Invalid batches roll back transactionally.

Historical records need supplied category, description, location and coordinates within the demo Southampton bounding box. This box is a coarse validation boundary, not a verified council responsibility polygon. Evaluation and aggregate records reject coordinates and never create issues. Historical records are created with their original reference dates and clearly labelled PUBLIC HISTORICAL DATA, never live. No such genuine council issue dataset has yet been imported.

## Models and derived information

The two official model cards declare Apache-2.0: [SigLIP](https://huggingface.co/google/siglip-base-patch16-224) and [MiniLM](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). Exact revisions are in `inference/models.json`. Weights are local ignored cache; remote code is disabled and safetensors are used. Analysis records include real model/revision, candidate scores, duration, timestamp and any category correction.

The four-image evaluation JSON records measured predictions, distribution, accuracy, per-category precision/recall/F1, majority baseline, date, revision and limitations. It is not a validated Southampton benchmark. Hotspots and budgets derive from stored issue/report counts with explicit source groups and assumptions; they are not official council statistics or verified financial outcomes.
