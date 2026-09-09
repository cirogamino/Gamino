import { describe, expect, it } from "vitest";
import { toDollars } from "../app/ops/money";
import {
  buildRestock,
  isCountStale,
  parValue,
  STANDARD_TRUCK_STOCK,
  stockingCase,
  type VanCount,
} from "../app/ops/inventory";

const fullCount = (): VanCount => ({
  vanId: "V-1",
  countedAt: "2026-09-09T08:00:00Z",
  counts: Object.fromEntries(STANDARD_TRUCK_STOCK.map((i) => [i.sku, i.parLevel])),
});

describe("lever 17 — standardised truck stock", () => {
  it("orders nothing when the van is at par", () => {
    const order = buildRestock(fullCount());
    expect(order.lines).toHaveLength(0);
    expect(order.totalCost).toBe(0);
    expect(order.stockouts).toHaveLength(0);
  });

  it("orders the difference back up to par", () => {
    const count = fullCount();
    count.counts["GFCI-15"] = 2; // par is 6
    const order = buildRestock(count);
    const line = order.lines.find((l) => l.sku === "GFCI-15")!;
    expect(line.order).toBe(4);
    expect(toDollars(line.cost)).toBe(72);
  });

  it("names stockouts separately — each is a supply run already waiting", () => {
    const count = fullCount();
    count.counts["WAX-RING"] = 0;
    const order = buildRestock(count);
    expect(order.stockouts).toContain("WAX-RING");
  });

  it("treats an unreported sku as zero rather than assuming it is stocked", () => {
    const order = buildRestock({ vanId: "V-1", countedAt: "2026-09-09T08:00:00Z", counts: {} });
    expect(order.stockouts).toHaveLength(STANDARD_TRUCK_STOCK.length);
    expect(order.lines).toHaveLength(STANDARD_TRUCK_STOCK.length);
  });

  it("never orders a negative quantity when a van is over par", () => {
    const count = fullCount();
    count.counts["CAULK-100"] = 99;
    expect(buildRestock(count).lines.find((l) => l.sku === "CAULK-100")).toBeUndefined();
  });

  it("values a fully stocked van", () => {
    expect(toDollars(parValue())).toBeGreaterThan(0);
  });
});

describe("lever 17 — the case for stocking", () => {
  it("shows the runs avoided pay for the capital tied up", () => {
    const c = stockingCase(2);
    expect(c.runsAvoidedPerYear).toBe(126);
    expect(c.hoursRecovered).toBeGreaterThan(100);
    expect(c.worthIt).toBe(true);
    expect(toDollars(c.annualSaving)).toBeGreaterThan(toDollars(c.capitalTiedUp));
  });

  it("scales with the number of vans", () => {
    expect(stockingCase(4).annualSaving).toBe(stockingCase(2).annualSaving * 2);
  });
});

describe("lever 17 — weekly cadence", () => {
  it("accepts a count from within the week", () => {
    expect(
      isCountStale({ vanId: "V-1", counts: {}, countedAt: "2026-09-07T08:00:00Z" }, new Date("2026-09-09T08:00:00Z")),
    ).toBe(false);
  });

  it("rejects a count older than a week — that is not a count", () => {
    expect(
      isCountStale({ vanId: "V-1", counts: {}, countedAt: "2026-08-20T08:00:00Z" }, new Date("2026-09-09T08:00:00Z")),
    ).toBe(true);
  });
});
