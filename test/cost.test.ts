import { describe, expect, it } from "vitest";
import { dollars, toDollars } from "../app/ops/money";
import {
  annualCull,
  annualSourcingLoss,
  auditCompCodes,
  compAuditDue,
  compareSourcing,
  hiringSignal,
  profitAtHeadcount,
  scoreCustomer,
  type CustomerRecord,
} from "../app/ops/cost";

describe("lever 20 — distributor pricing", () => {
  it("shows the saving on a three-zone install", () => {
    const c = compareSourcing(["MS-COND-3Z", "MS-HEAD", "MS-HEAD", "MS-HEAD", "MS-LINESET"]);
    expect(toDollars(c.saving)).toBeGreaterThan(1000);
    expect(c.savingRate).toBeGreaterThan(0.2);
    expect(c.savingRate).toBeLessThan(0.32);
  });

  it("reports unknown skus instead of silently pricing them at zero", () => {
    const c = compareSourcing(["MS-HEAD", "NOT-A-SKU"]);
    expect(c.unknownSkus).toEqual(["NOT-A-SKU"]);
    expect(c.retailTotal).toBe(dollars(420));
  });

  it("annualises what staying on retail costs", () => {
    const loss = annualSourcingLoss(8, ["MS-COND-12K", "MS-HEAD", "MS-LINESET"]);
    expect(toDollars(loss)).toBeGreaterThan(40000);
  });

  it("handles an empty basket", () => {
    const c = compareSourcing([]);
    expect(c.saving).toBe(0);
    expect(c.savingRate).toBe(0);
  });
});

describe("lever 21 — comp class codes (SOP tracking)", () => {
  it("flags a tech whose hours do not match their assigned code", () => {
    const findings = auditCompCodes(
      [
        {
          techId: "T-1",
          assignedCode: "5645-carpentry",
          actualHoursByCode: { "9015-building-maintenance": 1400, "5645-carpentry": 200 },
        },
      ],
      dollars(80000),
    );
    expect(findings[0].misassigned).toBe(true);
    expect(findings[0].dominantActualCode).toBe("9015-building-maintenance");
    // Assigned to the pricier code, so the variance is money being overpaid.
    expect(toDollars(findings[0].annualVariance)).toBeGreaterThan(4000);
  });

  it("passes a correctly assigned tech with no variance", () => {
    const findings = auditCompCodes(
      [{ techId: "T-2", assignedCode: "5537-hvac", actualHoursByCode: { "5537-hvac": 1600 } }],
      dollars(80000),
    );
    expect(findings[0].misassigned).toBe(false);
    expect(findings[0].annualVariance).toBe(0);
  });

  it("shows a negative variance when assigned too low — the back-charge case", () => {
    const findings = auditCompCodes(
      [
        {
          techId: "T-3",
          assignedCode: "9015-building-maintenance",
          actualHoursByCode: { "6217-excavation": 1200 },
        },
      ],
      dollars(80000),
    );
    expect(findings[0].annualVariance).toBeLessThan(0);
  });

  it("treats a never-audited shop as due", () => {
    expect(compAuditDue(null)).toBe(true);
  });

  it("comes due after a year", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    expect(compAuditDue("2026-06-01T00:00:00Z", now)).toBe(false);
    expect(compAuditDue("2025-06-01T00:00:00Z", now)).toBe(true);
  });
});

describe("lever 22 — the hiring trigger", () => {
  it("reproduces the plan's arithmetic: tech #1 nets about $333/mo", () => {
    expect(toDollars(profitAtHeadcount(1))).toBeCloseTo(333, 0);
  });

  it("shows profit actually starting at tech #2", () => {
    expect(profitAtHeadcount(2)).toBeGreaterThan(profitAtHeadcount(1) * 5);
  });

  it("charges overhead against a shop with no techs", () => {
    expect(profitAtHeadcount(0)).toBeLessThan(0);
  });

  it("says hire when backlog supports it", () => {
    const s = hiringSignal(1, 160);
    expect(s.shouldHire).toBe(true);
    expect(s.rationale).toContain("waiting is the expensive option");
  });

  it("says build demand first when backlog is thin", () => {
    const s = hiringSignal(1, 40);
    expect(s.shouldHire).toBe(false);
    expect(s.rationale).toContain("Build demand first");
  });

  it("refuses the hire when it does not pay for itself", () => {
    const s = hiringSignal(1, 400, {
      grossProfitPerTechPerMonth: dollars(500),
      fixedOverheadPerMonth: dollars(3650),
      marginalOverheadPerTech: dollars(900),
    });
    expect(s.shouldHire).toBe(false);
    expect(s.rationale).toContain("does not pay for itself");
  });
});

describe("lever 23 — the annual customer cull", () => {
  const good: CustomerRecord = {
    customerId: "C-1",
    name: "Good PM",
    annualRevenue: dollars(60000),
    annualDirectCost: dollars(26000),
    adminHours: 10,
    averageDaysToPay: 12,
    complaints: 0,
  };

  const bad: CustomerRecord = {
    customerId: "C-2",
    name: "Slow & Loud",
    annualRevenue: dollars(40000),
    annualDirectCost: dollars(31000),
    adminHours: 220,
    averageDaysToPay: 78,
    complaints: 9,
  };

  it("keeps a profitable, low-friction account", () => {
    expect(scoreCustomer(good).recommendation).toBe("keep");
  });

  it("fires an account that loses money once unbilled admin is counted", () => {
    const s = scoreCustomer(bad);
    expect(s.trueGrossProfit).toBeLessThan(0);
    expect(s.recommendation).toBe("fire");
    expect(s.reason).toContain("unbilled admin");
  });

  it("recommends a price rise for the thin-but-positive account", () => {
    const s = scoreCustomer({
      ...bad,
      annualDirectCost: dollars(22000),
      adminHours: 120,
    });
    expect(s.trueGrossProfit).toBeGreaterThan(0);
    expect(s.recommendation).toBe("raise-price");
  });

  it("ranks the worst first and reports the admin hours recovered", () => {
    const r = annualCull([good, bad]);
    expect(r.reviewed).toBe(2);
    expect(r.cullList[0].customerId).toBe("C-2");
    expect(r.adminHoursRecovered).toBe(220);
    expect(toDollars(r.revenueAtRisk)).toBe(40000);
  });

  it("does not cull a healthy book just to hit the 10%", () => {
    const r = annualCull([good, { ...good, customerId: "C-3" }, { ...good, customerId: "C-4" }]);
    expect(r.cullList).toHaveLength(0);
  });

  it("handles an empty book", () => {
    expect(annualCull([]).reviewed).toBe(0);
  });
});
