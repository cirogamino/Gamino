import { describe, expect, it } from "vitest";
import { toDollars } from "../app/ops/money";
import {
  attachRate,
  auditCloseout,
  planMargin,
  valuePlanBook,
  type InstallCloseout,
  type PlanEnrollment,
} from "../app/ops/plans";

describe("lever 6 — maintenance plans", () => {
  it("holds roughly the 70% margin the plan assumes", () => {
    expect(planMargin("basic")).toBeGreaterThan(0.65);
    expect(planMargin("plus")).toBeGreaterThan(0.65);
  });

  it("values a 100-unit book at the $20k/yr the plan claims", () => {
    const book = valuePlanBook([{ customerId: "c1", unitCount: 100, tier: "basic", startedAt: "2026-01-01" }]);
    expect(book.units).toBe(100);
    expect(toDollars(book.annualGrossProfit)).toBeGreaterThan(12000);
    expect(toDollars(book.annualRevenue)).toBeGreaterThan(18000);
  });

  it("sums a mixed book across tiers", () => {
    const enrollments: PlanEnrollment[] = [
      { customerId: "c1", unitCount: 40, tier: "basic", startedAt: "2026-01-01" },
      { customerId: "c2", unitCount: 20, tier: "plus", startedAt: "2026-02-01" },
    ];
    const book = valuePlanBook(enrollments);
    expect(book.units).toBe(60);
    expect(book.monthlyGrossProfit).toBe(Math.round(book.annualGrossProfit / 12));
  });

  it("values an empty book at zero without dividing by zero", () => {
    const book = valuePlanBook([]);
    expect(book.units).toBe(0);
    expect(book.margin).toBe(0);
  });
});

describe("lever 6 — enforcement at closeout", () => {
  const base: InstallCloseout = {
    jobId: "J-1",
    installedUnits: 1,
    planOffered: true,
    planAccepted: true,
  };

  it("flags an install that closed with no plan offered", () => {
    const issues = auditCloseout({ ...base, planOffered: false, planAccepted: false });
    expect(issues.some((i) => i.includes("no maintenance plan offered"))).toBe(true);
  });

  it("flags a decline with no reason — a decline you cannot learn from", () => {
    const issues = auditCloseout({ ...base, planAccepted: false });
    expect(issues.some((i) => i.includes("no reason recorded"))).toBe(true);
  });

  it("passes a clean closeout", () => {
    expect(auditCloseout(base)).toHaveLength(0);
  });

  it("accepts a declined plan when the reason was captured", () => {
    const issues = auditCloseout({ ...base, planAccepted: false, declineReason: "landlord handles service" });
    expect(issues).toHaveLength(0);
  });

  it("ignores jobs with no units installed", () => {
    expect(auditCloseout({ ...base, installedUnits: 0, planOffered: false, planAccepted: false })).toHaveLength(0);
  });

  it("computes attach rate over eligible installs only", () => {
    const closeouts: InstallCloseout[] = [
      base,
      { ...base, jobId: "J-2", planAccepted: false, declineReason: "cost" },
      { ...base, jobId: "J-3", installedUnits: 0 },
    ];
    expect(attachRate(closeouts)).toBe(0.5);
  });
});
