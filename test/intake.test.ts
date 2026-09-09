import { describe, expect, it } from "vitest";
import { toDollars } from "../app/ops/money";
import {
  assessMiniSplit,
  prequalSavings,
  prequalify,
  WASTED_DISPATCH_COST,
  type AssessmentAnswers,
  type IntakeSubmission,
} from "../app/ops/intake";

const submission = (over: Partial<IntakeSubmission> = {}): IntakeSubmission => ({
  leadId: "L-1",
  trade: "mini-split",
  description: "want AC in the sunroom",
  photos: [
    { angle: "wide", url: "a" },
    { angle: "exterior-wall", url: "b" },
    { angle: "electrical-panel", url: "c" },
  ],
  addressKnown: true,
  ...over,
});

describe("lever 18 — photo pre-qualification", () => {
  it("books the visit when the mini split photo set is complete", () => {
    const r = prequalify(submission());
    expect(r.outcome).toBe("book-visit");
    expect(r.avoidedCost).toBe(0);
  });

  it("names exactly which angles are missing", () => {
    const r = prequalify(submission({ photos: [{ angle: "wide", url: "a" }] }));
    expect(r.outcome).toBe("need-more-info");
    expect(r.missing).toEqual(["exterior-wall", "electrical-panel"]);
  });

  it("stops before routing when there is no address", () => {
    const r = prequalify(submission({ addressKnown: false }));
    expect(r.outcome).toBe("need-more-info");
    expect(r.reasons[0]).toContain("no address");
  });

  it("quotes a fully documented handyman job without sending a truck at all", () => {
    const r = prequalify(
      submission({
        trade: "handyman",
        photos: [
          { angle: "wide", url: "a" },
          { angle: "closeup", url: "b" },
        ],
      }),
    );
    expect(r.outcome).toBe("quote-remotely");
    expect(r.avoidedCost).toBe(WASTED_DISPATCH_COST);
  });

  it("totals the trips it saved, which is the case for the friction", () => {
    const results = [
      prequalify(submission()),
      prequalify(submission({ addressKnown: false })),
      prequalify(submission({ photos: [] })),
    ];
    const s = prequalSavings(results);
    expect(s.tripsAvoided).toBe(2);
    expect(toDollars(s.saved)).toBe(236);
  });
});

describe("lever 13 — mini split suitability assessment", () => {
  const answers = (over: Partial<AssessmentAnswers> = {}): AssessmentAnswers => ({
    roomSquareFeet: 400,
    ceilingHeightFeet: 8,
    exteriorWallAvailable: true,
    panelSpareBreakerSlots: 2,
    existingSystem: "window-unit",
    zonesWanted: 1,
    ...over,
  });

  it("sizes a standard room to a single zone", () => {
    const r = assessMiniSplit(answers());
    expect(r.suitable).toBe(true);
    expect(r.btuNeeded).toBe(8000);
    expect(r.recommendedTaskCode).toBe("MS-1Z-12K");
  });

  it("steps up to the larger head when the room needs it", () => {
    const r = assessMiniSplit(answers({ roomSquareFeet: 800 }));
    expect(r.btuNeeded).toBe(16000);
    expect(r.recommendedTaskCode).toBe("MS-1Z-18K");
  });

  it("scales for tall ceilings", () => {
    const flat = assessMiniSplit(answers()).btuNeeded;
    const tall = assessMiniSplit(answers({ ceilingHeightFeet: 12 })).btuNeeded;
    expect(tall).toBeGreaterThan(flat);
  });

  it("recommends multi-zone when several zones are wanted", () => {
    expect(assessMiniSplit(answers({ zonesWanted: 3 })).recommendedTaskCode).toBe("MS-3Z");
  });

  it("blocks on no exterior wall — the lineset has nowhere to go", () => {
    const r = assessMiniSplit(answers({ exteriorWallAvailable: false }));
    expect(r.suitable).toBe(false);
    expect(r.recommendedTaskCode).toBeUndefined();
    expect(r.blockers[0]).toContain("exterior wall");
  });

  it("blocks on a full electrical panel", () => {
    const r = assessMiniSplit(answers({ panelSpareBreakerSlots: 0 }));
    expect(r.suitable).toBe(false);
    expect(r.blockers.some((b) => b.includes("breaker"))).toBe(true);
  });

  it("still books a visit when it is not a clean fit — that is the point", () => {
    const r = assessMiniSplit(answers({ exteriorWallAvailable: false }));
    expect(r.callToAction).toContain("Free visit");
  });
});
