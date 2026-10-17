import { describe, it, expect } from "vitest";
import { cosine } from "../src/lib/local-model";
import { findHotspots } from "../src/lib/hotspots";
import { manifestSchema } from "../src/lib/importer";
import { duplicateMatches } from "../src/lib/rules";
const now = new Date("2026-10-17T12:00:00Z");
const issue = {
  id: "one",
  lat: 50.927,
  lng: -1.395,
  categoryId: "pothole",
  location: "Portswood",
  createdAt: new Date("2026-10-15"),
  synthetic: false,
  status: "Submitted",
  description: "Road hole beside the crossing",
};
const source = {
  id: "reviewed-source",
  name: "Reviewed example source",
  url: "https://example.org/data",
  licence: "CC-BY-4.0",
  licenceReviewed: true,
  attribution: "Example publisher",
  coverage: "Southampton, UK",
  referenceDate: "2026-09-01T00:00:00Z",
  dataType: "PUBLIC_HISTORICAL",
  limitations:
    "Historical example used to test validation, never a live council feed.",
};
const record = {
  id: "original-1",
  referenceDate: "2026-09-01T00:00:00Z",
  categoryId: "pothole",
  description: "Recorded hole in road surface",
  lat: 50.927,
  lng: -1.395,
  location: "Portswood Road",
};
describe("semantic matching", () => {
  it("computes normalized cosine rather than a probability", () => {
    expect(cosine([1, 2], [1, 2])).toBeCloseTo(1);
    expect(cosine([1, 0], [-1, 0])).toBe(-1);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it("uses supplied genuine embedding similarities with an explicit explanation", () => {
    const matches = duplicateMatches(
      { ...issue, description: "A cavity prevents safe passage" },
      [issue],
      75,
      now,
      { one: 0.86 },
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].explanation).toContain(
      "MiniLM cosine 0.860 (uncalibrated)",
    );
  });
  it("keeps distinct asset identifiers separate even with high semantic similarity", () =>
    expect(
      duplicateMatches(
        { ...issue, categoryId: "light", description: "Damaged lamp A101" },
        [{ ...issue, categoryId: "light", description: "Damaged lamp A102" }],
        75,
        now,
        { one: 1 },
      ),
    ).toHaveLength(0));
});
describe("provenance and import validation", () => {
  it("accepts a reviewed geolocated historical record", () =>
    expect(
      manifestSchema.safeParse({ source, records: [record] }).success,
    ).toBe(true));
  it("requires affirmative licence review", () =>
    expect(
      manifestSchema.safeParse({
        source: { ...source, licenceReviewed: false },
        records: [record],
      }).success,
    ).toBe(false));
  it("never invents missing issue locations", () =>
    expect(
      manifestSchema.safeParse({
        source,
        records: [{ ...record, lat: undefined, lng: undefined }],
      }).success,
    ).toBe(false));
  it("keeps international evaluation images out of Southampton issue geography", () =>
    expect(
      manifestSchema.safeParse({
        source: { ...source, dataType: "MODEL_EVALUATION", coverage: "Sweden" },
        records: [record],
      }).success,
    ).toBe(false));
  it("accepts evaluation records without coordinates", () =>
    expect(
      manifestSchema.safeParse({
        source: { ...source, dataType: "MODEL_EVALUATION", coverage: "Sweden" },
        records: [
          {
            id: "photo-1",
            file: "sample.jpg",
            referenceDate: "2021-07-18T00:00:00Z",
          },
        ],
      }).success,
    ).toBe(true));
  it("rejects duplicated original IDs", () =>
    expect(
      manifestSchema.safeParse({ source, records: [record, record] }).success,
    ).toBe(false));
  it("rejects user-submission or synthetic imports through the historical path", () =>
    expect(
      manifestSchema.safeParse({
        source: { ...source, dataType: "SYNTHETIC_DEMO" },
        records: [record],
      }).success,
    ).toBe(false));
});
describe("observed hotspot concentrations", () => {
  it("counts distinct issues and separates synthetic from actual records", () => {
    const rows = [
      issue,
      { ...issue, id: "two", lat: 50.9271 },
      { ...issue, id: "synthetic-1", synthetic: true },
      { ...issue, id: "synthetic-2", synthetic: true, lat: 50.9271 },
    ];
    const clusters = findHotspots(rows, 30, 150, now);
    expect(clusters).toHaveLength(2);
    expect(clusters.map((c) => c.count)).toEqual([2, 2]);
    expect(new Set(clusters.map((c) => c.dataType))).toEqual(
      new Set(["USER_SUBMITTED", "SYNTHETIC_DEMO"]),
    );
  });
  it("does not fabricate a hotspot from one issue or stale records", () => {
    expect(findHotspots([issue], 30, 150, now)).toHaveLength(0);
    expect(
      findHotspots(
        [issue, { ...issue, id: "old", createdAt: new Date("2025-01-01") }],
        30,
        150,
        now,
      ),
    ).toHaveLength(0);
  });
  it("separates unrelated categories", () =>
    expect(
      findHotspots(
        [issue, { ...issue, id: "bin", categoryId: "bin" }],
        30,
        150,
        now,
      ),
    ).toHaveLength(0));
});
