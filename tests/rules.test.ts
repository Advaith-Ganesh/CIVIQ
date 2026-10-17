import { describe, it, expect } from "vitest";
import {
  classify,
  duplicateMatches,
  haversine,
  priority,
  canTransition,
  financialModel,
} from "../src/lib/rules";
import { reportSchema, validateImage } from "../src/lib/validation";
import { DemoAdapter, getAdapter } from "../src/lib/ai";
import { isStaff } from "../src/lib/auth";
const issue = {
  id: "1",
  categoryId: "pothole",
  description: "Deep pothole crossing wheelchair access",
  lat: 50.927,
  lng: -1.395,
  status: "Submitted",
  createdAt: new Date(),
};
describe("classification and matching", () => {
  it("classifies potholes with an honest text explanation", () => {
    const r = classify(issue.description);
    expect(r.categoryId).toBe("pothole");
    expect(r.explanation).toContain("No photograph analysis");
  });
  it("marks ambiguous descriptions for review", () =>
    expect(classify("Something seems wrong here").confidence).toBe(0.35));
  it("flags urgent safety wording", () =>
    expect(
      classify("Danger from exposed cable near a streetlight").urgent,
    ).toBe(true));
  it("matches nearby compatible reports", () =>
    expect(duplicateMatches({ ...issue, lat: 50.92701 }, [issue])).toHaveLength(
      1,
    ));
  it("separates far away issues", () =>
    expect(duplicateMatches({ ...issue, lat: 50.95 }, [issue])).toHaveLength(
      0,
    ));
  it("separates incompatible categories", () =>
    expect(
      duplicateMatches({ ...issue, categoryId: "bin" }, [issue]),
    ).toHaveLength(0));
  it("does not match closed or stale issues", () => {
    expect(
      duplicateMatches(issue, [{ ...issue, status: "Verified closed" }]),
    ).toHaveLength(0);
    expect(
      duplicateMatches(issue, [
        { ...issue, createdAt: new Date("2025-01-01") },
      ]),
    ).toHaveLength(0);
  });
  it("separates distinct nearby streetlight asset numbers", () =>
    expect(
      duplicateMatches(
        {
          ...issue,
          categoryId: "light",
          description: "Broken streetlight lamp A101",
        },
        [
          {
            ...issue,
            categoryId: "light",
            description: "Broken streetlight lamp A102",
          },
        ],
      ),
    ).toHaveLength(0));
  it("requires review for streetlights without identifiers", () =>
    expect(
      duplicateMatches(
        {
          ...issue,
          categoryId: "light",
          description: "Broken streetlight near crossing",
        },
        [
          {
            ...issue,
            categoryId: "light",
            description: "Broken streetlight near crossing",
          },
        ],
      )[0].explanation,
    ).toContain("separate assets"));
  it("calculates distances in metres", () => {
    expect(haversine(issue, issue)).toBe(0);
    expect(haversine(issue, { ...issue, lat: issue.lat + 0.001 })).toBeCloseTo(
      111.195,
      1,
    );
  });
});
describe("priorities and lifecycle", () => {
  const input = {
    severity: 5,
    description: "wheelchair access blocked",
    ageDays: 30,
    reports: 5,
    recurrence: 0,
    context: 1,
    evidenceConfidence: 1,
  };
  it("scores maximum inputs at 100", () =>
    expect(priority(input).score).toBe(100));
  it("keeps evidence uncertainty separate and score bounded", () => {
    const p = priority({ ...input, evidenceConfidence: 0 });
    expect(p.score).toBe(90);
    expect(p.breakdown.at(-1)?.points).toBe(0);
    expect(priority({ ...input, severity: 100 }).score).toBe(100);
  });
  it("recomputes configurable weights", () =>
    expect(
      priority({ ...input, evidenceConfidence: 0 }, [0, 0, 0, 0, 0, 100]).score,
    ).toBe(0));
  it("rejects illegal jumps and closure without repair", () => {
    expect(canTransition("Submitted", "Verified closed", true)).toBe(false);
    expect(
      canTransition("In progress", "Resolved pending verification", false),
    ).toBe(false);
  });
  it("allows manual verification and reopening", () => {
    expect(
      canTransition("Resolved pending verification", "Verified closed", true),
    ).toBe(true);
    expect(canTransition("Verified closed", "Reopened")).toBe(true);
  });
  it("computes financial scenarios without confusing value and profit", () =>
    expect(financialModel(12000, 25, 5, 25, 1500)).toEqual({
      hours: 250,
      value: 6250,
      cost: 18000,
      difference: -11750,
    }));
});
describe("validation and provider boundaries", () => {
  it("rejects invalid locations and short reports", () =>
    expect(
      reportSchema.safeParse({
        description: "bad",
        location: "x",
        lat: 0,
        lng: 0,
        categoryId: "pothole",
        photoId: "1",
      }).success,
    ).toBe(false));
  it("rejects masquerading files", () =>
    expect(() => validateImage(new Uint8Array(20), "image/jpeg")).toThrow(
      "genuine",
    ));
  it("rejects oversized photographs", () =>
    expect(() =>
      validateImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"),
    ).toThrow("5 MB"));
  it("accepts JPEG signatures", () => {
    const b = new Uint8Array(20);
    b.set([255, 216, 255]);
    expect(validateImage(b, "image/jpeg")).toBe("image/jpeg");
  });
  it("never claims arbitrary demo images are analyzed", async () =>
    expect(await new DemoAdapter().analyzeVision()).toMatchObject({
      supported: false,
    }));
  it("fails explicitly for an unimplemented live adapter", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => getAdapter()).toThrow("not implemented");
    process.env.AI_PROVIDER = "demo";
  });
  it("fails closed outside local demo without a strong token", () => {
    process.env.LOCAL_DEMO = "false";
    process.env.STAFF_TOKEN = "";
    expect(isStaff(new Request("http://localhost"))).toBe(false);
    process.env.STAFF_TOKEN = "a".repeat(24);
    expect(
      isStaff(
        new Request("http://localhost", {
          headers: { Authorization: `Bearer ${"a".repeat(24)}` },
        }),
      ),
    ).toBe(true);
  });
});
