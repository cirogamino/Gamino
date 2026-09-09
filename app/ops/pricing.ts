/**
 * Levers 1, 2, 4, 7, 11 — the pricing engine.
 *
 *  1. Flat-rate task pricing (not hourly)
 *  2. Global price-rise lever with close-rate tracking
 *  4. Two-hour minimum plus trip charge, enforced
 *  7. 30% materials markup, held
 * 11. After-hours premium
 *
 * The central idea: a price is never computed from hours worked. It is looked
 * up from the task book. That single inversion is what makes a fast tech more
 * profitable instead of less, which is the opposite of how time-and-materials
 * behaves.
 */

import { applyRate, dollars, grossMargin, markup, sum, type Cents } from "./money";

// ---------------------------------------------------------------- lever 1 --

export interface Task {
  code: string;
  name: string;
  /** What the customer pays. Fixed, regardless of how long it actually takes. */
  price: Cents;
  /** Budgeted labour hours. Used for scheduling and margin checks, never for price. */
  budgetHours: number;
  /** Typical materials cost at trade price, before markup. */
  materialsCost: Cents;
  trade: Trade;
}

export type Trade = "handyman" | "mini-split" | "epoxy" | "concrete" | "waterproofing";

/**
 * The flat-rate book. Start with the forty most common tasks; this is a
 * representative slice. Prices are the pre-adjustment book rate — the global
 * price-rise lever (2) is applied on top at quote time.
 */
export const TASK_BOOK: Task[] = [
  // handyman — the schedule filler
  { code: "HM-DOOR-INT", name: "Interior door replacement", price: dollars(385), budgetHours: 2, materialsCost: dollars(140), trade: "handyman" },
  { code: "HM-DRYWALL-SM", name: "Drywall patch, up to 2 sq ft", price: dollars(225), budgetHours: 1.5, materialsCost: dollars(25), trade: "handyman" },
  { code: "HM-FAUCET", name: "Faucet replacement", price: dollars(265), budgetHours: 1.5, materialsCost: dollars(0), trade: "handyman" },
  { code: "HM-TOILET", name: "Toilet replacement", price: dollars(395), budgetHours: 2, materialsCost: dollars(0), trade: "handyman" },
  { code: "HM-GFCI", name: "GFCI outlet replacement", price: dollars(165), budgetHours: 0.75, materialsCost: dollars(28), trade: "handyman" },
  { code: "HM-FAN", name: "Ceiling fan install, existing box", price: dollars(295), budgetHours: 1.5, materialsCost: dollars(0), trade: "handyman" },
  { code: "HM-TURNOVER", name: "Rental turnover punch, per unit day", price: dollars(720), budgetHours: 8, materialsCost: dollars(90), trade: "handyman" },
  { code: "HM-LOCKSET", name: "Lockset / rekey, per door", price: dollars(145), budgetHours: 0.5, materialsCost: dollars(45), trade: "handyman" },

  // mini split — the margin
  { code: "MS-1Z-12K", name: "Mini split, single zone 12k BTU", price: dollars(4500), budgetHours: 16, materialsCost: dollars(1500), trade: "mini-split" },
  { code: "MS-1Z-18K", name: "Mini split, single zone 18k BTU", price: dollars(5400), budgetHours: 16, materialsCost: dollars(1850), trade: "mini-split" },
  { code: "MS-3Z", name: "Mini split, three zone", price: dollars(12000), budgetHours: 32, materialsCost: dollars(4300), trade: "mini-split" },
  { code: "MS-SERVICE", name: "Mini split clean and service", price: dollars(240), budgetHours: 1.5, materialsCost: dollars(20), trade: "mini-split" },
];

const byCode = new Map(TASK_BOOK.map((t) => [t.code, t]));
export const lookupTask = (code: string): Task | undefined => byCode.get(code);

// ---------------------------------------------------------------- lever 2 --

/**
 * The price-rise lever. Ships at 1.0. Move it to 1.10 for thirty days and watch
 * `closeRateDelta`; §16 says keep the rise unless close rate falls more than
 * five points.
 */
export interface PricePolicy {
  /** Multiplier on every book price. 1.10 = the 10% rise. */
  multiplier: number;
  /** Lever 7 — materials markup. Never ship below 0.30. */
  materialsMarkup: number;
  /** Lever 4 — minimum billable hours on any dispatch. */
  minimumHours: number;
  /** Lever 4 — flat trip charge added to every dispatch. */
  tripCharge: Cents;
  /** Lever 11 — multiplier applied outside business hours. */
  afterHoursMultiplier: number;
  /** Effective hourly rate used only to price the minimum, never a task. */
  minimumHourlyRate: Cents;
}

export const DEFAULT_POLICY: PricePolicy = {
  multiplier: 1.0,
  materialsMarkup: 0.3,
  minimumHours: 2,
  tripCharge: dollars(45),
  afterHoursMultiplier: 1.5,
  minimumHourlyRate: dollars(85),
};

export const MIN_MATERIALS_MARKUP = 0.3;

/** Guardrail: refuse to ship a policy that gives away the levers. */
export function validatePolicy(p: PricePolicy): string[] {
  const errors: string[] = [];
  if (p.materialsMarkup < MIN_MATERIALS_MARKUP)
    errors.push(`materials markup ${p.materialsMarkup} is below the 0.30 floor (lever 7)`);
  if (p.minimumHours < 2) errors.push(`minimum ${p.minimumHours}h is below the 2h floor (lever 4)`);
  if (p.tripCharge <= 0) errors.push("trip charge must be positive (lever 4)");
  if (p.multiplier <= 0) errors.push("price multiplier must be positive");
  if (p.afterHoursMultiplier < 1) errors.push("after-hours multiplier must be at least 1 (lever 11)");
  return errors;
}

/** Lever 2 — the 30-day experiment readout. Positive `keep` means hold the rise. */
export interface PriceRiseResult {
  grossProfitChange: number;
  closeRatePointsLost: number;
  keep: boolean;
  rationale: string;
}

export function evaluatePriceRise(args: {
  baselineCloseRate: number;
  testCloseRate: number;
  multiplier: number;
  baselineMargin: number;
}): PriceRiseResult {
  const { baselineCloseRate, testCloseRate, multiplier, baselineMargin } = args;
  const pointsLost = (baselineCloseRate - testCloseRate) * 100;

  // Revenue per lead moves with both price and close rate; margin dollars move faster
  // than price because cost is unchanged.
  const baseGp = baselineCloseRate * baselineMargin;
  const testGp = testCloseRate * (1 - (1 - baselineMargin) / multiplier) * multiplier;
  const change = baseGp === 0 ? 0 : (testGp - baseGp) / baseGp;

  const keep = pointsLost <= 5 && change > 0;
  return {
    grossProfitChange: change,
    closeRatePointsLost: pointsLost,
    keep,
    rationale: keep
      ? `Close rate fell ${pointsLost.toFixed(1)} points (under the 5-point threshold) and gross profit rose ${(change * 100).toFixed(1)}%. Keep the rise.`
      : `Close rate fell ${pointsLost.toFixed(1)} points and gross profit moved ${(change * 100).toFixed(1)}%. Roll back.`,
  };
}

// ------------------------------------------------------------- line items --

export interface LineItem {
  label: string;
  amount: Cents;
  cost: Cents;
  kind: "task" | "materials" | "trip" | "minimum" | "after-hours";
}

export interface PricedJob {
  lines: LineItem[];
  subtotal: Cents;
  cost: Cents;
  margin: number;
  budgetHours: number;
  warnings: string[];
}

export interface PriceJobInput {
  taskCodes: string[];
  /** Extra materials at trade cost, marked up by lever 7. */
  extraMaterialsCost?: Cents;
  afterHours?: boolean;
  policy?: PricePolicy;
}

/**
 * The whole pricing pipeline in one place: flat-rate lookup (1), global rise (2),
 * materials markup (7), minimum and trip charge (4), after-hours premium (11).
 */
export function priceJob(input: PriceJobInput): PricedJob {
  const policy = input.policy ?? DEFAULT_POLICY;
  const warnings = validatePolicy(policy);
  const lines: LineItem[] = [];
  let budgetHours = 0;

  for (const code of input.taskCodes) {
    const task = lookupTask(code);
    if (!task) {
      warnings.push(`unknown task code ${code} — not priced`);
      continue;
    }
    budgetHours += task.budgetHours;
    lines.push({
      label: task.name,
      amount: applyRate(task.price, policy.multiplier),
      cost: task.materialsCost,
      kind: "task",
    });
  }

  if (input.extraMaterialsCost && input.extraMaterialsCost > 0) {
    lines.push({
      label: "Materials & handling",
      amount: markup(input.extraMaterialsCost, policy.materialsMarkup),
      cost: input.extraMaterialsCost,
      kind: "materials",
    });
  }

  // Lever 4 — a dispatch never bills under the minimum.
  const taskTotal = sum(lines.filter((l) => l.kind === "task").map((l) => l.amount));
  const floor = applyRate(policy.minimumHourlyRate * policy.minimumHours, policy.multiplier);
  if (lines.length > 0 && taskTotal < floor) {
    lines.push({
      label: `Minimum charge (${policy.minimumHours}h)`,
      amount: floor - taskTotal,
      cost: 0,
      kind: "minimum",
    });
  }

  if (lines.length > 0) {
    lines.push({ label: "Trip charge", amount: policy.tripCharge, cost: 0, kind: "trip" });
  }

  // Lever 11 — the premium applies to labour value, not to materials pass-through.
  if (input.afterHours && lines.length > 0) {
    const premiumBase = sum(
      lines.filter((l) => l.kind !== "materials").map((l) => l.amount),
    );
    lines.push({
      label: "After-hours premium",
      amount: applyRate(premiumBase, policy.afterHoursMultiplier - 1),
      cost: 0,
      kind: "after-hours",
    });
  }

  const subtotal = sum(lines.map((l) => l.amount));
  const cost = sum(lines.map((l) => l.cost));

  return { lines, subtotal, cost, margin: grossMargin(subtotal, cost), budgetHours, warnings };
}
