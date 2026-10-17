import { test, expect } from "@playwright/test";
import sharp from "sharp";
let image: Buffer;
test.beforeAll(async () => {
  image = await sharp({
    create: { width: 320, height: 240, channels: 3, background: "#556677" },
  })
    .jpeg()
    .toBuffer();
});
test("resident upload → map → rules → submission → council repair → tracking → reopening", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/report");
  await page.getByLabel("Problem photograph").setInputFiles({
    name: "problem.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await expect(page.getByAltText("Uploaded problem photograph")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator(".leaflet-container").waitFor();
  await page
    .locator(".leaflet-container")
    .click({ position: { x: 250, y: 120 } });
  await page.getByLabel("Latitude", { exact: true }).fill("50.96");
  await page.getByLabel("Longitude", { exact: true }).fill("-1.47");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Street or landmark").fill("E2E test crossing");
  await page
    .getByLabel("Describe the problem")
    .fill("Deep pothole crater blocking wheelchair access at the E2E crossing");
  await page.getByRole("button", { name: "Review classification" }).click();
  await expect(page.getByText("DEMO MODE · TEXT RULES")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit report" }).click();
  await page.screenshot({
    path: "test-results/v2-resident-submitted.png",
    fullPage: true,
  });
  const reference = await page.getByTestId("tracking-reference").innerText();
  expect(reference).toMatch(/^CIV-[A-F0-9]{10}$/);
  await page.getByRole("link", { name: "Track this report" }).click();
  await expect(
    page.getByText("E2E test crossing", { exact: false }),
  ).toBeVisible();
  await page.goto("/dashboard/issues");
  await page.getByRole("textbox", { name: "Search issues" }).fill(reference);
  await page.locator(".issue-cell").first().click();
  await expect(
    page.getByRole("heading", { name: "Reported evidence" }),
  ).toBeVisible();
  await page
    .getByLabel("Maintenance team", { exact: true })
    .selectOption("highways");
  await page.getByLabel("Scheduled date").fill("2026-11-01");
  await page.getByRole("button", { name: "Assign team" }).click();
  await expect(
    page.getByText(
      "Assigned to Highways & accessibility; scheduled 2026-11-01",
    ),
  ).toBeVisible();
  for (const status of ["Acknowledged", "Scheduled", "In progress"]) {
    await page.getByLabel("Update lifecycle").selectOption(status);
    await expect(page.locator(".page-heading .badge")).toContainText(status);
  }
  await page.getByLabel("Completion photograph").setInputFiles({
    name: "after.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await expect(page.getByAltText("Completion preview")).toBeVisible();
  await page
    .getByLabel("Repair outcome")
    .fill("Pothole filled and crossing access restored.");
  await page.getByRole("button", { name: "Save repair evidence" }).click();
  await expect(page.getByAltText("After repair")).toBeVisible();
  await page.screenshot({ path: "test-results/v2-repair.png", fullPage: true });
  for (const status of ["Resolved pending verification", "Verified closed"]) {
    await page.getByLabel("Update lifecycle").selectOption(status);
    await expect(page.locator(".page-heading .badge")).toContainText(status);
  }
  await page
    .getByLabel("Private staff note")
    .fill("Confidential internal operational note");
  await page.getByRole("button", { name: "Add staff note" }).click();
  await expect(
    page.getByText("Confidential internal operational note"),
  ).toBeVisible();
  await page.goto(`/track?ref=${reference}`);
  await expect(
    page.getByText("Verified closed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Confidential internal operational note"),
  ).toHaveCount(0);
  await page
    .getByLabel("Reason for reopening")
    .fill("The crossing still has a visible remaining trip hazard.");
  await page.getByRole("button", { name: "Request reopening" }).click();
  await expect(page.getByText("Reopened", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("duplicate confirmation preserves reports and incorrect lamp match can be rejected", async ({
  request,
  page,
}) => {
  const uploaded = await request.post("/api/upload", {
    multipart: {
      file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: image },
    },
  });
  expect(uploaded.ok()).toBeTruthy();
  const photo = await uploaded.json();
  const assess = await request.post("/api/assess", {
    data: {
      description: "Deep pothole blocking wheelchair access at the crossing",
      categoryId: "pothole",
      lat: 50.92701,
      lng: -1.395,
    },
  });
  const matches = (await assess.json()).matches;
  expect(matches[0].issueId).toBe("demo-1");
  const result = await request.post("/api/reports", {
    data: {
      description: "Deep pothole blocking wheelchair access at the crossing",
      categoryId: "pothole",
      location: "Portswood Road",
      lat: 50.92701,
      lng: -1.395,
      photoId: photo.id,
      confirmIssueId: "demo-1",
    },
  });
  expect(result.status()).toBe(201);
  const report = await result.json();
  const issue = await (await request.get("/api/issues/demo-1")).json();
  expect(issue.reports).toHaveLength(5);
  await page.goto("/dashboard/issues/demo-3");
  await page.getByRole("button", { name: "Reject match" }).click();
  await expect(page.getByText("Match rejected.")).toBeVisible();
  await expect(
    page.locator(".duplicate-card").getByText("Rejected", { exact: true }),
  ).toBeVisible();
  const reset = await request.post("/api/reset", {
    data: { confirm: "RESET DEMO" },
  });
  expect(reset.ok()).toBeTruthy();
  expect(
    (await request.get(`/api/track/${report.reference}`)).ok(),
  ).toBeTruthy();
});
test("server rejects invalid uploads, unsafe writes and missing repair evidence", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/upload", {
        multipart: {
          file: {
            name: "fake.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from("not a photograph at all"),
          },
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/reports", {
        data: { description: "bad", lat: 0, lng: 0 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/issues/demo-2", {
        data: { action: "status", value: "Verified closed" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/settings", {
        data: { weights: [1, 1, 1, 1, 1, 1], distance: 75 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await request.post("/api/reset", { data: { confirm: "wrong" } })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/reports", {
        headers: { Origin: "https://attacker.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test("all routes render on desktop and resident flow fits mobile", async ({
  page,
}) => {
  const pages: [string, string][] = [
    ["/", "Smarter streets."],
    ["/dashboard", "Southampton command centre"],
    ["/dashboard/teams", "The right work. The right team."],
    ["/dashboard/insights", "Better decisions, grounded in evidence."],
    ["/dashboard/ai-lab", "AI Lab"],
    ["/dashboard/data-sources", "Data sources"],
    ["/dashboard/hotspots", "Hotspots & recurrence"],
    ["/dashboard/search", "Find the work that matters."],
    ["/dashboard/settings", "Transparent by configuration."],
    ["/map", "A city we care for, together."],
    ["/demo", "From a report to a result."],
    ["/about-data", "Trust starts with clarity."],
    ["/privacy", "Only what the workflow needs."],
  ];
  for (const [url, heading] of pages) {
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: heading, exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/route-${url.replaceAll("/", "-") || "landing"}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/report");
  await expect(
    page.getByRole("heading", { name: "Let’s make it better." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Southampton command centre" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("offline local model preserves manual reporting and source-aware database search", async ({
  page,
  request,
}) => {
  await request.post("/api/settings", { data: { provider: "local" } });
  try {
    const uploaded = await request.post("/api/upload", {
      multipart: {
        file: { name: "offline.jpg", mimeType: "image/jpeg", buffer: image },
      },
    });
    const photo = await uploaded.json();
    const assessment = await (
      await request.post("/api/assess", {
        data: {
          photoId: photo.id,
          description: "Blocked pavement restricting access",
          categoryId: "pavement",
          lat: 50.96,
          lng: -1.47,
        },
      })
    ).json();
    expect(assessment.vision.available).toBe(false);
    expect(assessment.vision.candidates).toEqual([]);
    const submitted = await request.post("/api/reports", {
      data: {
        photoId: photo.id,
        description: "Blocked pavement restricting access",
        categoryId: "pavement",
        location: "Offline model test crossing",
        lat: 50.96,
        lng: -1.47,
        accessibility: ["blockedPavement"],
      },
    });
    expect(submitted.status()).toBe(201);
    const result = await submitted.json();
    await page.goto("/dashboard/issues/" + result.issueId);
    await expect(
      page.getByText("AI UNAVAILABLE · MANUAL CLASSIFICATION", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Reported access impact:", { exact: false }),
    ).toBeVisible();
    const search = await (
      await request.get(
        "/api/search?q=Offline%20model%20test&type=USER_SUBMITTED",
      )
    ).json();
    expect(
      search.issues.some((i: { id: string }) => i.id === result.issueId),
    ).toBe(true);
    await page.goto("/dashboard/ai-lab");
    await expect(
      page.getByRole("heading", { name: "Local inference unavailable" }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/v2-offline-lab.png",
      fullPage: true,
    });
  } finally {
    await request.post("/api/settings", { data: { provider: "demo" } });
  }
});
