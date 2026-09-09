import { describe, expect, it } from "vitest";
import { dollars, toDollars } from "../app/ops/money";
import {
  auditJobCloseout,
  bidWholePunchList,
  checkCompliance,
  observationPipeline,
  planBlitz,
  type JobCloseout,
  type NextJobObservation,
  type VendorCompliance,
} from "../app/ops/sales";

const obs = (over: Partial<NextJobObservation> = {}): NextJobObservation => ({
  note: "back door won't latch",
  suggestedTaskCode: "HM-DOOR-INT",
  urgency: "soon",
  photoCount: 2,
  ...over,
});

const closeout = (over: Partial<JobCloseout> = {}): JobCloseout => ({
  jobId: "J-1",
  techId: "T-1",
  completedAt: "2026-09-09T18:00:00Z",
  observations: [obs(), obs(), obs()],
  convertedTaskCodes: [],
  ...over,
});

describe("lever 8 — sell the next job on the current job", () => {
  it("blocks a closeout with fewer than three observations", () => {
    const issues = auditJobCloseout(closeout({ observations: [obs()] }));
    expect(issues.some((i) => i.includes("1 of 3 required observations"))).toBe(true);
  });

  it("flags observations with no photo, because a note alone does not sell", () => {
    const issues = auditJobCloseout(closeout({ observations: [obs(), obs(), obs({ photoCount: 0 })] }));
    expect(issues.some((i) => i.includes("no photo"))).toBe(true);
  });

  it("passes a complete closeout", () => {
    expect(auditJobCloseout(closeout())).toHaveLength(0);
  });

  it("values the open pipeline off the task book", () => {
    const p = observationPipeline([closeout()]);
    expect(p.open).toBe(3);
    expect(p.converted).toBe(0);
    expect(toDollars(p.estimatedValue)).toBe(385 * 3);
  });

  it("tracks conversion once observations turn into booked work", () => {
    const p = observationPipeline([closeout({ convertedTaskCodes: ["HM-DOOR-INT"] })]);
    expect(p.converted).toBe(3);
    expect(p.conversionRate).toBe(1);
  });

  it("values an unmatched free-text note at a conservative default", () => {
    const p = observationPipeline([
      closeout({ observations: [obs({ suggestedTaskCode: undefined })] }),
    ]);
    expect(p.estimatedValue).toBe(dollars(250));
  });
});

describe("lever 9 — neighbour blitz", () => {
  const candidates = Array.from({ length: 40 }, (_, i) => ({
    address: `${i} Elm St`,
    distanceMeters: i * 10,
  }));

  it("takes the twenty nearest doors", () => {
    const plan = planBlitz({
      jobId: "J-1",
      originAddress: "10 Elm St",
      completedAt: "2026-09-09T18:00:00Z",
      candidates,
    });
    expect(plan.targets).toHaveLength(16); // only 16 fall inside the 150m radius
    expect(plan.targets[0].distanceMeters).toBe(0);
  });

  it("holds the tight radius — the hanger works because the truck is visible", () => {
    const plan = planBlitz({
      jobId: "J-1",
      originAddress: "10 Elm St",
      completedAt: "2026-09-09T18:00:00Z",
      candidates,
    });
    expect(plan.targets.every((t) => t.distanceMeters <= 150)).toBe(true);
  });

  it("is due the same day", () => {
    const plan = planBlitz({
      jobId: "J-1",
      originAddress: "10 Elm St",
      completedAt: "2026-09-09T18:00:00Z",
      candidates,
    });
    expect(plan.dueBy.startsWith("2026-09-09")).toBe(true);
  });
});

describe("lever 10 — bid the whole punch list", () => {
  it("shows the uplift over bidding only what was asked", () => {
    const bid = bidWholePunchList([
      { description: "leaking faucet", taskCode: "HM-FAUCET", requested: true },
      { description: "cracked drywall", taskCode: "HM-DRYWALL-SM", requested: false },
      { description: "dead outlet", taskCode: "HM-GFCI", requested: false },
    ]);
    expect(toDollars(bid.requestedOnly)).toBe(265);
    expect(toDollars(bid.wholeList)).toBe(265 + 225 + 165);
    expect(toDollars(bid.uplift)).toBe(390);
    expect(bid.dispatchesSaved).toBe(2);
  });

  it("has no uplift when everything was already requested", () => {
    const bid = bidWholePunchList([
      { description: "leaking faucet", taskCode: "HM-FAUCET", requested: true },
    ]);
    expect(bid.uplift).toBe(0);
    expect(bid.dispatchesSaved).toBe(0);
  });
});

describe("lever 12 — vendor compliance", () => {
  const now = new Date("2026-09-09T00:00:00Z");
  const full: VendorCompliance = {
    propertyManager: "Acme PM",
    docs: {
      w9: { onFile: true },
      coi: { onFile: true, expiresAt: "2027-01-01T00:00:00Z" },
      license: { onFile: true },
      "portal-registration": { onFile: true },
    },
  };

  it("is ready when every document is on file and current", () => {
    const s = checkCompliance(full, now);
    expect(s.ready).toBe(true);
    expect(s.missing).toHaveLength(0);
  });

  it("lists what is missing", () => {
    const s = checkCompliance({ propertyManager: "Acme PM", docs: { w9: { onFile: true } } }, now);
    expect(s.ready).toBe(false);
    expect(s.missing).toContain("coi");
    expect(s.missing).toContain("license");
  });

  it("treats a lapsed certificate as missing, not as on file", () => {
    const lapsed: VendorCompliance = {
      ...full,
      docs: { ...full.docs, coi: { onFile: true, expiresAt: "2026-01-01T00:00:00Z" } },
    };
    const s = checkCompliance(lapsed, now);
    expect(s.ready).toBe(false);
    expect(s.missing).toContain("coi");
  });

  it("warns before a certificate lapses, while there is still time", () => {
    const soon: VendorCompliance = {
      ...full,
      docs: { ...full.docs, coi: { onFile: true, expiresAt: "2026-09-20T00:00:00Z" } },
    };
    const s = checkCompliance(soon, now);
    expect(s.ready).toBe(true);
    expect(s.expiringSoon).toContain("coi");
  });
});
