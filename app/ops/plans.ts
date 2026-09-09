/**
 * Lever 6 — maintenance plans on every mini split.
 *
 * The plan is not really a service product. It is a recurring-revenue instrument
 * that also happens to keep you in the customer's house once a year, which is
 * where replacement and referral work comes from. 100 units under contract is
 * roughly $20k/yr at ~70% margin, and it is the single line on the P&L that
 * does not care whether the phone rang this month.
 */

import { dollars, grossMargin, type Cents } from "./money";

export type PlanTier = "basic" | "plus";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  annualPrice: Cents;
  /** Direct cost to serve for a year: labour at loaded rate plus consumables. */
  annualCost: Cents;
  visitsPerYear: number;
  benefits: string[];
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  basic: {
    tier: "basic",
    name: "Annual Clean & Check",
    annualPrice: dollars(189),
    annualCost: dollars(58),
    visitsPerYear: 1,
    benefits: [
      "Annual coil clean and filter service",
      "Refrigerant and electrical check",
      "Priority scheduling ahead of non-plan customers",
    ],
  },
  plus: {
    tier: "plus",
    name: "Clean & Check Plus",
    annualPrice: dollars(249),
    annualCost: dollars(76),
    visitsPerYear: 2,
    benefits: [
      "Two visits a year — pre-cooling and pre-heating",
      "Priority scheduling and no after-hours premium",
      "10% off any repair",
    ],
  },
};

export interface PlanEnrollment {
  customerId: string;
  unitCount: number;
  tier: PlanTier;
  startedAt: string;
}

/** Per-unit annual margin for a tier. */
export function planMargin(tier: PlanTier): number {
  const p = PLANS[tier];
  return grossMargin(p.annualPrice, p.annualCost);
}

export interface PlanBook {
  units: number;
  annualRevenue: Cents;
  annualCost: Cents;
  annualGrossProfit: Cents;
  margin: number;
  monthlyGrossProfit: Cents;
}

/** What the whole book of plans is worth — the number that makes the lever real. */
export function valuePlanBook(enrollments: PlanEnrollment[]): PlanBook {
  let revenue = 0;
  let cost = 0;
  let units = 0;

  for (const e of enrollments) {
    const plan = PLANS[e.tier];
    revenue += plan.annualPrice * e.unitCount;
    cost += plan.annualCost * e.unitCount;
    units += e.unitCount;
  }

  const gp = revenue - cost;
  return {
    units,
    annualRevenue: revenue,
    annualCost: cost,
    annualGrossProfit: gp,
    margin: grossMargin(revenue, cost),
    monthlyGrossProfit: Math.round(gp / 12),
  };
}

/**
 * Enforcement, not suggestion: every mini split install must leave with a plan
 * offered and the answer recorded. An install that closes with no recorded
 * answer is a process failure, not a customer decision.
 */
export interface InstallCloseout {
  jobId: string;
  installedUnits: number;
  planOffered: boolean;
  planAccepted: boolean;
  declineReason?: string;
}

export function auditCloseout(c: InstallCloseout): string[] {
  const issues: string[] = [];
  if (c.installedUnits > 0 && !c.planOffered)
    issues.push(`job ${c.jobId}: mini split installed with no maintenance plan offered (lever 6)`);
  if (c.planOffered && !c.planAccepted && !c.declineReason)
    issues.push(`job ${c.jobId}: plan declined with no reason recorded — you learn nothing`);
  return issues;
}

/** Attach rate across closeouts. Below 0.4 the offer is being skipped, not refused. */
export function attachRate(closeouts: InstallCloseout[]): number {
  const eligible = closeouts.filter((c) => c.installedUnits > 0);
  if (eligible.length === 0) return 0;
  return eligible.filter((c) => c.planAccepted).length / eligible.length;
}
