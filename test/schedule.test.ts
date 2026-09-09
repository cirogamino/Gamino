import { describe, expect, it } from "vitest";
import { dollars, toDollars } from "../app/ops/money";
import {
  auditRoute,
  batchInstalls,
  canBook,
  haversineKm,
  utilizationUpside,
  type ScheduledJob,
} from "../app/ops/schedule";

const job = (over: Partial<ScheduledJob> = {}): ScheduledJob => ({
  jobId: "J-1",
  start: "2026-09-09T09:00:00Z",
  durationHours: 2,
  lat: 41.8781,
  lon: -87.6298,
  trade: "handyman",
  ...over,
});

describe("distance", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 41.8, lon: -87.6 }, { lat: 41.8, lon: -87.6 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { lat: 41.8, lon: -87.6 };
    const b = { lat: 41.9, lon: -87.7 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe("lever 16 — route density", () => {
  it("passes a tight day", () => {
    const day = [
      job({ jobId: "A", start: "2026-09-09T09:00:00Z" }),
      job({ jobId: "B", start: "2026-09-09T12:00:00Z", lat: 41.8825, lon: -87.6298 }),
    ];
    const audit = auditRoute(day);
    expect(audit.passes).toBe(true);
    expect(audit.violations).toHaveLength(0);
  });

  it("catches the across-town booking that looks harmless", () => {
    const day = [
      job({ jobId: "A", start: "2026-09-09T09:00:00Z" }),
      job({ jobId: "B", start: "2026-09-09T14:00:00Z", lat: 42.05, lon: -87.9 }),
    ];
    const audit = auditRoute(day);
    expect(audit.passes).toBe(false);
    expect(audit.violations[0].from).toBe("A");
    expect(audit.violations[0].overBy).toBeGreaterThan(0);
  });

  it("audits in time order even when jobs arrive shuffled", () => {
    const day = [
      job({ jobId: "B", start: "2026-09-09T14:00:00Z" }),
      job({ jobId: "A", start: "2026-09-09T09:00:00Z" }),
    ];
    expect(auditRoute(day).jobs).toBe(2);
  });

  it("reports utilization as billable over paid hours", () => {
    const day = [job({ jobId: "A", durationHours: 3 }), job({ jobId: "B", durationHours: 3 })];
    expect(auditRoute(day, 8).utilization).toBeCloseTo(0.75, 5);
  });

  it("handles an empty and a single-job day", () => {
    expect(auditRoute([]).passes).toBe(true);
    expect(auditRoute([job()]).totalDriveMinutes).toBe(0);
  });

  it("refuses the booking before it is confirmed, which is when it is cheap", () => {
    const day = [job({ jobId: "A" })];
    const far = job({ jobId: "B", lat: 42.05, lon: -87.9 });
    const result = canBook(day, far);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("lever 16");
  });

  it("allows the first job of the day unconditionally", () => {
    expect(canBook([], job()).ok).toBe(true);
  });

  it("prices the utilization move the plan describes", () => {
    const up = utilizationUpside({
      currentUtilization: 0.65,
      targetUtilization: 0.75,
      monthlyRevenue: dollars(60000),
    });
    expect(up.percentGain).toBeCloseTo(0.1538, 3);
    expect(toDollars(up.revenueGain)).toBeCloseTo(9230.77, 0);
  });

  it("does not divide by zero on a shop with no utilization yet", () => {
    expect(
      utilizationUpside({ currentUtilization: 0, targetUtilization: 0.75, monthlyRevenue: dollars(1000) })
        .revenueGain,
    ).toBe(0);
  });
});

describe("lever 19 — geographic batching", () => {
  it("groups nearby installs into one batch that shares the equipment run", () => {
    const pending = [
      job({ jobId: "M1", trade: "mini-split" }),
      job({ jobId: "M2", trade: "mini-split", lat: 41.8825, lon: -87.6298 }),
      job({ jobId: "M3", trade: "mini-split", lat: 42.4, lon: -88.5 }),
    ];
    const batches = batchInstalls(pending);
    expect(batches[0].jobs.map((j) => j.jobId).sort()).toEqual(["M1", "M2"]);
    expect(batches[0].sharedEquipmentRun).toBe(true);
  });

  it("leaves an outlier in its own batch with no shared run", () => {
    const pending = [
      job({ jobId: "M1", trade: "mini-split" }),
      job({ jobId: "M3", trade: "mini-split", lat: 42.4, lon: -88.5 }),
    ];
    const batches = batchInstalls(pending);
    expect(batches.every((b) => b.jobs.length === 1)).toBe(true);
    expect(batches.every((b) => !b.sharedEquipmentRun)).toBe(true);
  });

  it("ignores non-mini-split work", () => {
    expect(batchInstalls([job({ trade: "handyman" })])).toHaveLength(0);
  });

  it("never places a job in two batches", () => {
    const pending = [
      job({ jobId: "M1", trade: "mini-split" }),
      job({ jobId: "M2", trade: "mini-split", lat: 41.883, lon: -87.63 }),
      job({ jobId: "M3", trade: "mini-split", lat: 41.884, lon: -87.631 }),
    ];
    const ids = batchInstalls(pending).flatMap((b) => b.jobs.map((j) => j.jobId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
  });
});
