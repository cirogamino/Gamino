import { describe, expect, it } from "vitest";
import { dollars, toDollars } from "../app/ops/money";
import {
  auditInvoice,
  auditJobStart,
  depositTerms,
  dsoReport,
  workingCapitalFreed,
  type Invoice,
} from "../app/ops/cash";

describe("lever 14 — deposits", () => {
  it("takes 30% on ordinary work", () => {
    const t = depositTerms(dollars(1000));
    expect(t.required).toBe(true);
    expect(toDollars(t.amount)).toBe(300);
    expect(toDollars(t.balanceOnCompletion)).toBe(700);
  });

  it("takes half on a materials-heavy job so you are not funding the equipment", () => {
    const t = depositTerms(dollars(12000));
    expect(t.rate).toBe(0.5);
    expect(toDollars(t.amount)).toBe(6000);
    expect(t.script).toContain("covers the equipment");
  });

  it("skips the deposit on a job smaller than the minimum", () => {
    const t = depositTerms(dollars(80));
    expect(t.required).toBe(false);
    expect(toDollars(t.balanceOnCompletion)).toBe(80);
  });

  it("floors a small-but-not-tiny deposit at the minimum", () => {
    const t = depositTerms(dollars(200));
    expect(toDollars(t.amount)).toBe(100);
  });

  it("handles a zero-value job without inventing terms", () => {
    expect(depositTerms(0).required).toBe(false);
  });

  it("flags a job started with a short deposit", () => {
    const issues = auditJobStart({
      jobId: "J-1",
      total: dollars(1000),
      depositCollected: dollars(50),
      signedAt: "2026-09-09T10:00:00Z",
    });
    expect(issues.some((i) => i.includes("deposit short"))).toBe(true);
  });

  it("flags a job started with no signature", () => {
    const issues = auditJobStart({
      jobId: "J-1",
      total: dollars(1000),
      depositCollected: dollars(300),
    });
    expect(issues.some((i) => i.includes("no signature"))).toBe(true);
  });

  it("passes a properly started job", () => {
    expect(
      auditJobStart({
        jobId: "J-1",
        total: dollars(1000),
        depositCollected: dollars(300),
        signedAt: "2026-09-09T10:00:00Z",
      }),
    ).toHaveLength(0);
  });
});

describe("lever 15 — same-day invoicing", () => {
  const now = new Date("2026-09-20T00:00:00Z");
  const base: Invoice = {
    invoiceId: "I-1",
    jobId: "J-1",
    amount: dollars(1000),
    completedAt: "2026-09-10T16:00:00Z",
    issuedAt: "2026-09-10T18:00:00Z",
    paidAt: "2026-09-11T09:00:00Z",
    cardOnFile: true,
  };

  it("passes an invoice issued the same day with a card on file", () => {
    const a = auditInvoice(base, now);
    expect(a.issuedSameDay).toBe(true);
    expect(a.issues).toHaveLength(0);
  });

  it("flags work completed with nothing issued", () => {
    const a = auditInvoice({ ...base, issuedAt: undefined }, now);
    expect(a.issues.some((i) => i.includes("nothing issued"))).toBe(true);
  });

  it("flags a late invoice and says how late", () => {
    const a = auditInvoice({ ...base, issuedAt: "2026-09-16T18:00:00Z" }, now);
    expect(a.issuedSameDay).toBe(false);
    expect(a.issues.some((i) => i.includes("days after completion"))).toBe(true);
  });

  it("flags a missing card, which is what makes auto-charge impossible", () => {
    const a = auditInvoice({ ...base, cardOnFile: false }, now);
    expect(a.issues.some((i) => i.includes("no card on file"))).toBe(true);
  });

  it("reports DSO and counts unpaid invoices as outstanding", () => {
    const r = dsoReport(
      [base, { ...base, invoiceId: "I-2", paidAt: undefined, cardOnFile: false }],
      now,
    );
    expect(r.invoices).toBe(2);
    expect(r.sameDayIssueRate).toBe(1);
    expect(r.cardOnFileRate).toBe(0.5);
    expect(toDollars(r.outstanding)).toBe(1000);
    expect(r.averageDaysSalesOutstanding).toBeGreaterThan(0);
  });

  it("reports zeros for an empty book without dividing by zero", () => {
    const r = dsoReport([], now);
    expect(r.invoices).toBe(0);
    expect(r.averageDaysSalesOutstanding).toBe(0);
  });

  it("computes the working capital the plan claims: 30 to 3 days on $60k/mo", () => {
    const freed = workingCapitalFreed(dollars(60000), 30, 3);
    expect(toDollars(freed)).toBe(54000);
  });
});
