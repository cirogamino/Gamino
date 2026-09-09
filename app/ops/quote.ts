/**
 * Levers 3 and 5 — how a price becomes a quote.
 *
 * 3. Good / Better / Best on every quote, anchored high
 * 5. Paid estimates above $5k, credited back on signing
 */

import { applyRate, dollars, formatMoney, type Cents } from "./money";
import { priceJob, type PricePolicy, type PricedJob } from "./pricing";

// ---------------------------------------------------------------- lever 3 --

export type Tier = "good" | "better" | "best";

export interface QuoteOption {
  tier: Tier;
  name: string;
  taskCodes: string[];
  priced: PricedJob;
  /** Rendered first and visually largest — anchoring is the entire mechanism. */
  anchor: boolean;
  recommended: boolean;
  inclusions: string[];
}

export interface QuoteOptionSpec {
  tier: Tier;
  name: string;
  taskCodes: string[];
  inclusions: string[];
  extraMaterialsCost?: Cents;
}

/**
 * Builds the three-option ladder. Two rules are enforced rather than left to
 * whoever is writing the quote:
 *   - best is presented first (anchor), because an option list read cheapest-first
 *     anchors low and the mix follows the anchor
 *   - better is marked recommended, because the middle option is what the ladder
 *     exists to sell
 */
export function buildOptions(
  specs: QuoteOptionSpec[],
  policy?: PricePolicy,
  afterHours = false,
): QuoteOption[] {
  const order: Record<Tier, number> = { best: 0, better: 1, good: 2 };

  return specs
    .map((spec) => ({
      tier: spec.tier,
      name: spec.name,
      taskCodes: spec.taskCodes,
      inclusions: spec.inclusions,
      priced: priceJob({
        taskCodes: spec.taskCodes,
        extraMaterialsCost: spec.extraMaterialsCost,
        afterHours,
        policy,
      }),
      anchor: spec.tier === "best",
      recommended: spec.tier === "better",
    }))
    .sort((a, b) => order[a.tier] - order[b.tier]);
}

/** A ladder with only one rung is not a ladder. */
export function validateOptions(options: QuoteOption[]): string[] {
  const errors: string[] = [];
  const tiers = new Set(options.map((o) => o.tier));
  if (options.length < 2) errors.push("lever 3: a quote needs at least two options");
  if (!tiers.has("better")) errors.push("lever 3: no 'better' option to recommend");
  if (options.length > 0 && !options[0].anchor)
    errors.push("lever 3: highest option must be presented first to anchor");
  return errors;
}

// ---------------------------------------------------------------- lever 5 --

export const ESTIMATE_FEE_THRESHOLD: Cents = dollars(5000);
export const ESTIMATE_FEE: Cents = dollars(149);

export interface EstimatePolicy {
  threshold: Cents;
  fee: Cents;
  /** Credited back in full when the customer signs. */
  creditedOnSigning: boolean;
}

export const DEFAULT_ESTIMATE_POLICY: EstimatePolicy = {
  threshold: ESTIMATE_FEE_THRESHOLD,
  fee: ESTIMATE_FEE,
  creditedOnSigning: true,
};

export interface EstimateFeeDecision {
  chargeable: boolean;
  fee: Cents;
  customerScript: string;
}

/**
 * Decides whether this quote carries an estimate fee, and hands the tech the
 * exact sentence to say. The script matters more than the policy: the fee only
 * filters tire-kickers if it is framed as credited, not as a charge.
 */
export function estimateFee(
  quoteValue: Cents,
  policy: EstimatePolicy = DEFAULT_ESTIMATE_POLICY,
): EstimateFeeDecision {
  if (quoteValue < policy.threshold) {
    return { chargeable: false, fee: 0, customerScript: "No charge for this estimate." };
  }
  return {
    chargeable: true,
    fee: policy.fee,
    customerScript:
      `Estimates on work this size are ${formatMoney(policy.fee)}, and it comes straight off ` +
      `your invoice when you go ahead — so if you hire us it costs you nothing.`,
  };
}

/** Applied at signing: the fee comes back off the invoice. */
export function creditEstimateFee(
  invoiceTotal: Cents,
  feePaid: Cents,
  policy: EstimatePolicy = DEFAULT_ESTIMATE_POLICY,
): Cents {
  if (!policy.creditedOnSigning) return invoiceTotal;
  return Math.max(0, invoiceTotal - feePaid);
}

// ------------------------------------------------------------------ quote --

export interface Quote {
  id: string;
  customer: string;
  options: QuoteOption[];
  estimate: EstimateFeeDecision;
  errors: string[];
}

export function buildQuote(args: {
  id: string;
  customer: string;
  specs: QuoteOptionSpec[];
  policy?: PricePolicy;
  estimatePolicy?: EstimatePolicy;
  afterHours?: boolean;
}): Quote {
  const options = buildOptions(args.specs, args.policy, args.afterHours ?? false);
  const anchorValue = options[0]?.priced.subtotal ?? 0;
  return {
    id: args.id,
    customer: args.customer,
    options,
    estimate: estimateFee(anchorValue, args.estimatePolicy),
    errors: validateOptions(options),
  };
}

/** Convenience for the price-rise experiment: what the same quote costs at a new multiplier. */
export function repriceAt(quote: Quote, multiplier: number, base: PricePolicy): Cents {
  const total = quote.options.find((o) => o.recommended)?.priced.subtotal ?? 0;
  return applyRate(total, multiplier / base.multiplier);
}
