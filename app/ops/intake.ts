/**
 * Levers 13 and 18 — deciding whether to send a truck, before sending one.
 *
 * 13. Free mini split suitability assessment as the lead magnet
 * 18. Photo pre-qualification before rolling a truck
 *
 * Both exist to protect the scarcest thing in the business: a tech-hour. A
 * wasted trip costs roughly two billable hours once drive time is counted, and
 * at $18.65 contribution per paid hour that is real money walking out the door
 * one or two times a week per tech.
 */

import { dollars, type Cents } from "./money";

// --------------------------------------------------------------- lever 18 --

export type PhotoAngle = "wide" | "closeup" | "electrical-panel" | "exterior-wall" | "access-path";

export interface IntakePhoto {
  angle: PhotoAngle;
  url: string;
}

export interface IntakeSubmission {
  leadId: string;
  trade: "handyman" | "mini-split";
  description: string;
  photos: IntakePhoto[];
  addressKnown: boolean;
  /** Customer's own words on budget. Absence is itself a signal. */
  statedBudget?: Cents;
}

export type PrequalOutcome = "quote-remotely" | "book-visit" | "need-more-info" | "decline";

export interface PrequalResult {
  outcome: PrequalOutcome;
  missing: PhotoAngle[];
  reasons: string[];
  /** Roughly what a wasted dispatch would have cost — the point of the lever. */
  avoidedCost: Cents;
}

/** A mini split quote is not possible without seeing the wall and the panel. */
const REQUIRED_BY_TRADE: Record<IntakeSubmission["trade"], PhotoAngle[]> = {
  "mini-split": ["wide", "exterior-wall", "electrical-panel"],
  handyman: ["wide", "closeup"],
};

/** One dispatch that should not have happened: ~2 paid hours plus the trip. */
export const WASTED_DISPATCH_COST: Cents = dollars(118);

export function prequalify(s: IntakeSubmission): PrequalResult {
  const required = REQUIRED_BY_TRADE[s.trade];
  const have = new Set(s.photos.map((p) => p.angle));
  const missing = required.filter((a) => !have.has(a));
  const reasons: string[] = [];

  if (!s.addressKnown) {
    reasons.push("no address — cannot route or check service area");
    return { outcome: "need-more-info", missing, reasons, avoidedCost: WASTED_DISPATCH_COST };
  }

  if (missing.length > 0) {
    reasons.push(`missing ${missing.join(", ")} — cannot quote or scope from what was sent`);
    return { outcome: "need-more-info", missing, reasons, avoidedCost: WASTED_DISPATCH_COST };
  }

  // Full photo set on a handyman job is quotable without leaving the office.
  if (s.trade === "handyman") {
    reasons.push("full photo set on a book task — quote remotely, no truck");
    return { outcome: "quote-remotely", missing: [], reasons, avoidedCost: WASTED_DISPATCH_COST };
  }

  reasons.push("photo set complete — worth the site visit");
  return { outcome: "book-visit", missing: [], reasons, avoidedCost: 0 };
}

/** What pre-qualification saved over a period — the number that justifies the friction. */
export function prequalSavings(results: PrequalResult[]): {
  tripsAvoided: number;
  saved: Cents;
} {
  const avoided = results.filter((r) => r.outcome !== "book-visit");
  return {
    tripsAvoided: avoided.length,
    saved: avoided.reduce((a, r) => a + r.avoidedCost, 0),
  };
}

// --------------------------------------------------------------- lever 13 --

export interface AssessmentAnswers {
  roomSquareFeet: number;
  ceilingHeightFeet: number;
  exteriorWallAvailable: boolean;
  panelSpareBreakerSlots: number;
  /** Existing ducted system the customer wants to supplement or replace. */
  existingSystem: "none" | "window-unit" | "ducted" | "baseboard";
  zonesWanted: number;
}

export interface AssessmentResult {
  suitable: boolean;
  recommendedTaskCode?: string;
  btuNeeded: number;
  blockers: string[];
  notes: string[];
  /** The reason this is a lead magnet and not a calculator: it books a visit. */
  callToAction: string;
}

/**
 * Rough sizing: ~20 BTU per square foot at standard ceiling height, scaled for
 * taller rooms. Deliberately conservative — this is a lead magnet that gets you
 * in the house, not a Manual J, and it says so.
 */
export function assessMiniSplit(a: AssessmentAnswers): AssessmentResult {
  const blockers: string[] = [];
  const notes: string[] = [];

  if (!a.exteriorWallAvailable)
    blockers.push("no exterior wall in the room — the lineset has nowhere to run");
  if (a.panelSpareBreakerSlots < 1)
    blockers.push("no spare breaker slot — a panel upgrade would be needed first");

  const heightFactor = a.ceilingHeightFeet / 8;
  const btuNeeded = Math.round((a.roomSquareFeet * 20 * heightFactor) / 500) * 500;

  if (a.existingSystem === "window-unit")
    notes.push("replacing a window unit — expect a large efficiency and noise improvement");
  if (a.zonesWanted > 1) notes.push(`${a.zonesWanted} zones — multi-zone condenser`);

  let recommendedTaskCode: string | undefined;
  if (a.zonesWanted >= 3) recommendedTaskCode = "MS-3Z";
  else if (btuNeeded > 14000) recommendedTaskCode = "MS-1Z-18K";
  else recommendedTaskCode = "MS-1Z-12K";

  const suitable = blockers.length === 0;
  return {
    suitable,
    recommendedTaskCode: suitable ? recommendedTaskCode : undefined,
    btuNeeded,
    blockers,
    notes,
    callToAction: suitable
      ? "Looks like a good fit. Send three photos and we'll put a fixed price in writing — no charge."
      : "There's a wrinkle worth looking at in person before anyone quotes you. Free visit, no obligation.",
  };
}
