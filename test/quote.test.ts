import { describe, expect, it } from "vitest";
import { dollars } from "../app/ops/money";
import {
  buildOptions,
  buildQuote,
  creditEstimateFee,
  estimateFee,
  validateOptions,
  type QuoteOptionSpec,
} from "../app/ops/quote";

const specs: QuoteOptionSpec[] = [
  { tier: "good", name: "Single zone", taskCodes: ["MS-1Z-12K"], inclusions: ["One head, one room"] },
  { tier: "better", name: "Single zone, larger", taskCodes: ["MS-1Z-18K"], inclusions: ["Covers open plan"] },
  { tier: "best", name: "Three zone", taskCodes: ["MS-3Z"], inclusions: ["Whole floor"] },
];

describe("lever 3 — good / better / best", () => {
  it("presents the highest option first so the quote anchors high", () => {
    const options = buildOptions(specs);
    expect(options[0].tier).toBe("best");
    expect(options[0].anchor).toBe(true);
  });

  it("marks the middle option as recommended", () => {
    const options = buildOptions(specs);
    expect(options.find((o) => o.recommended)?.tier).toBe("better");
  });

  it("orders the ladder even when the specs arrive shuffled", () => {
    const shuffled = [specs[1], specs[2], specs[0]];
    expect(buildOptions(shuffled).map((o) => o.tier)).toEqual(["best", "better", "good"]);
  });

  it("rejects a single-option quote — that is a price, not a ladder", () => {
    const errors = validateOptions(buildOptions([specs[0]]));
    expect(errors.some((e) => e.includes("at least two options"))).toBe(true);
  });

  it("rejects a ladder with no middle rung to recommend", () => {
    const errors = validateOptions(buildOptions([specs[0], specs[2]]));
    expect(errors.some((e) => e.includes("no 'better' option"))).toBe(true);
  });
});

describe("lever 5 — paid estimates", () => {
  it("does not charge below the $5k threshold", () => {
    expect(estimateFee(dollars(4999)).chargeable).toBe(false);
  });

  it("charges at and above the threshold", () => {
    const d = estimateFee(dollars(5000));
    expect(d.chargeable).toBe(true);
    expect(d.fee).toBe(dollars(149));
  });

  it("frames the fee as credited, which is the part that does the work", () => {
    expect(estimateFee(dollars(12000)).customerScript).toContain("costs you nothing");
  });

  it("credits the fee back off the invoice at signing", () => {
    expect(creditEstimateFee(dollars(12000), dollars(149))).toBe(dollars(11851));
  });

  it("never credits an invoice below zero", () => {
    expect(creditEstimateFee(dollars(100), dollars(149))).toBe(0);
  });

  it("keeps the fee when the policy says not to credit", () => {
    const p = { threshold: dollars(5000), fee: dollars(149), creditedOnSigning: false };
    expect(creditEstimateFee(dollars(12000), dollars(149), p)).toBe(dollars(12000));
  });
});

describe("quote assembly", () => {
  it("decides the estimate fee off the anchor option, not the cheapest", () => {
    const quote = buildQuote({ id: "Q-1", customer: "Acme PM", specs });
    // Anchor is the three-zone at ~$12k, so the fee applies even though 'good' is under $5k.
    expect(quote.estimate.chargeable).toBe(true);
    expect(quote.errors).toHaveLength(0);
  });

  it("surfaces ladder errors on the quote instead of silently shipping them", () => {
    const quote = buildQuote({ id: "Q-2", customer: "Acme PM", specs: [specs[0]] });
    expect(quote.errors.length).toBeGreaterThan(0);
  });
});
