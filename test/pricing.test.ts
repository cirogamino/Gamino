import { describe, expect, it } from "vitest";
import { dollars, toDollars } from "../app/ops/money";
import {
  DEFAULT_POLICY,
  evaluatePriceRise,
  priceJob,
  validatePolicy,
  type PricePolicy,
} from "../app/ops/pricing";

const policy = (over: Partial<PricePolicy> = {}): PricePolicy => ({ ...DEFAULT_POLICY, ...over });

describe("lever 1 — flat-rate pricing", () => {
  it("prices from the book, not from hours worked", () => {
    const fast = priceJob({ taskCodes: ["HM-TOILET"] });
    const slow = priceJob({ taskCodes: ["HM-TOILET"] });
    // Same task, same price, regardless of who swings the wrench or how long it takes.
    expect(fast.subtotal).toBe(slow.subtotal);
  });

  it("carries budget hours for scheduling without letting them touch price", () => {
    const job = priceJob({ taskCodes: ["HM-TOILET", "HM-FAUCET"] });
    expect(job.budgetHours).toBe(3.5);
    const taskLines = job.lines.filter((l) => l.kind === "task");
    expect(taskLines).toHaveLength(2);
  });

  it("warns rather than silently dropping an unknown task code", () => {
    const job = priceJob({ taskCodes: ["NOPE-123"] });
    expect(job.warnings.some((w) => w.includes("NOPE-123"))).toBe(true);
  });
});

describe("lever 2 — the price rise", () => {
  it("applies the multiplier to every book price", () => {
    const base = priceJob({ taskCodes: ["MS-1Z-12K"] });
    const risen = priceJob({ taskCodes: ["MS-1Z-12K"], policy: policy({ multiplier: 1.1 }) });
    const baseTask = base.lines.find((l) => l.kind === "task")!.amount;
    const risenTask = risen.lines.find((l) => l.kind === "task")!.amount;
    expect(risenTask).toBe(Math.round(baseTask * 1.1));
  });

  it("keeps the rise when close rate holds within five points", () => {
    const r = evaluatePriceRise({
      baselineCloseRate: 0.4,
      testCloseRate: 0.38,
      multiplier: 1.1,
      baselineMargin: 0.54,
    });
    expect(r.closeRatePointsLost).toBeCloseTo(2, 5);
    expect(r.keep).toBe(true);
  });

  it("rolls back when close rate collapses", () => {
    const r = evaluatePriceRise({
      baselineCloseRate: 0.4,
      testCloseRate: 0.25,
      multiplier: 1.1,
      baselineMargin: 0.54,
    });
    expect(r.keep).toBe(false);
    expect(r.rationale).toContain("Roll back");
  });
});

describe("lever 4 — minimum and trip charge", () => {
  it("tops a small job up to the two-hour minimum", () => {
    const job = priceJob({ taskCodes: ["HM-GFCI"] }); // $165 book, under the $170 floor
    const min = job.lines.find((l) => l.kind === "minimum");
    expect(min).toBeDefined();
    const taskAndMin =
      job.lines.filter((l) => l.kind === "task" || l.kind === "minimum").reduce((a, l) => a + l.amount, 0);
    expect(taskAndMin).toBe(dollars(170));
  });

  it("does not top up a job already above the minimum", () => {
    const job = priceJob({ taskCodes: ["MS-1Z-12K"] });
    expect(job.lines.find((l) => l.kind === "minimum")).toBeUndefined();
  });

  it("adds the trip charge exactly once", () => {
    const job = priceJob({ taskCodes: ["HM-TOILET", "HM-FAUCET", "HM-GFCI"] });
    expect(job.lines.filter((l) => l.kind === "trip")).toHaveLength(1);
  });

  it("prices nothing at all for an empty dispatch", () => {
    const job = priceJob({ taskCodes: [] });
    expect(job.subtotal).toBe(0);
    expect(job.lines).toHaveLength(0);
  });
});

describe("lever 7 — materials markup", () => {
  it("marks materials up by 30%", () => {
    const job = priceJob({ taskCodes: ["HM-DOOR-INT"], extraMaterialsCost: dollars(200) });
    const mats = job.lines.find((l) => l.kind === "materials")!;
    expect(mats.amount).toBe(dollars(260));
    expect(mats.cost).toBe(dollars(200));
  });

  it("refuses a policy that drops below the 30% floor", () => {
    expect(validatePolicy(policy({ materialsMarkup: 0.1 }))).toContainEqual(
      expect.stringContaining("below the 0.30 floor"),
    );
  });

  it("surfaces the floor breach as a warning on the job itself", () => {
    const job = priceJob({ taskCodes: ["HM-TOILET"], policy: policy({ materialsMarkup: 0 }) });
    expect(job.warnings.some((w) => w.includes("lever 7"))).toBe(true);
  });
});

describe("lever 11 — after-hours premium", () => {
  it("adds 50% on labour value", () => {
    const day = priceJob({ taskCodes: ["HM-TOILET"] });
    const night = priceJob({ taskCodes: ["HM-TOILET"], afterHours: true });
    expect(night.subtotal).toBe(Math.round(day.subtotal * 1.5));
  });

  it("does not apply the premium to marked-up materials pass-through", () => {
    const night = priceJob({
      taskCodes: ["HM-TOILET"],
      extraMaterialsCost: dollars(100),
      afterHours: true,
    });
    const mats = night.lines.find((l) => l.kind === "materials")!;
    const premium = night.lines.find((l) => l.kind === "after-hours")!;
    const nonMaterials = night.lines
      .filter((l) => l.kind !== "materials" && l.kind !== "after-hours")
      .reduce((a, l) => a + l.amount, 0);
    expect(mats.amount).toBe(dollars(130));
    expect(premium.amount).toBe(Math.round(nonMaterials * 0.5));
  });
});

describe("margin reporting", () => {
  it("reports a mini split at roughly the 54% the plan assumes", () => {
    const job = priceJob({ taskCodes: ["MS-1Z-12K"] });
    expect(job.margin).toBeGreaterThan(0.5);
    expect(toDollars(job.subtotal)).toBeGreaterThan(4500);
  });
});
