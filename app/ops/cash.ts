/**
 * Levers 14 and 15 — the two that decide whether the business survives.
 *
 * 14. Deposit on every job, e-signed on the spot
 * 15. Same-day invoice, card on file, auto-charge on completion
 *
 * Profit is an opinion; cash is a fact. A contractor pays for material and
 * payroll weeks before collecting, so the gap between doing the work and being
 * paid for it is the thing that kills otherwise-profitable shops. Both levers
 * attack that gap from opposite ends.
 */

import { applyRate, dollars, type Cents } from "./money";

// --------------------------------------------------------------- lever 14 --

export interface DepositPolicy {
  /** Fraction taken up front on ordinary work. */
  standardRate: number;
  /** Jobs at or above this value take the materials-heavy rate instead. */
  materialsHeavyThreshold: Cents;
  materialsHeavyRate: number;
  /** Never ask for a deposit below this — the friction outweighs the cash. */
  minimumDeposit: Cents;
  requireSignature: boolean;
}

export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
  standardRate: 0.3,
  materialsHeavyThreshold: dollars(5000),
  materialsHeavyRate: 0.5,
  minimumDeposit: dollars(100),
  requireSignature: true,
};

export interface DepositTerms {
  required: boolean;
  amount: Cents;
  rate: number;
  balanceOnCompletion: Cents;
  signatureRequired: boolean;
  script: string;
}

/**
 * On a large job the deposit must at least cover the equipment you are about to
 * buy, or you are financing the customer's condenser out of your own account.
 */
export function depositTerms(
  jobTotal: Cents,
  policy: DepositPolicy = DEFAULT_DEPOSIT_POLICY,
): DepositTerms {
  if (jobTotal <= 0) {
    return {
      required: false,
      amount: 0,
      rate: 0,
      balanceOnCompletion: 0,
      signatureRequired: false,
      script: "",
    };
  }

  const heavy = jobTotal >= policy.materialsHeavyThreshold;
  const rate = heavy ? policy.materialsHeavyRate : policy.standardRate;
  let amount = applyRate(jobTotal, rate);

  if (amount < policy.minimumDeposit) {
    // Small job: take the whole thing on completion rather than a token deposit.
    if (jobTotal < policy.minimumDeposit) {
      return {
        required: false,
        amount: 0,
        rate: 0,
        balanceOnCompletion: jobTotal,
        signatureRequired: policy.requireSignature,
        script: "We'll take payment when the work is done.",
      };
    }
    amount = policy.minimumDeposit;
  }

  return {
    required: true,
    amount,
    rate,
    balanceOnCompletion: jobTotal - amount,
    signatureRequired: policy.requireSignature,
    script: heavy
      ? "We take half up front — that covers the equipment we order for you — and the balance when it's running."
      : "We take 30% to get you on the schedule, and the rest when the work's done.",
  };
}

export interface SignedJob {
  jobId: string;
  total: Cents;
  depositCollected: Cents;
  signedAt?: string;
}

/** A job that starts with no deposit and no signature is a job you are funding. */
export function auditJobStart(
  job: SignedJob,
  policy: DepositPolicy = DEFAULT_DEPOSIT_POLICY,
): string[] {
  const terms = depositTerms(job.total, policy);
  const issues: string[] = [];
  if (terms.required && job.depositCollected < terms.amount) {
    issues.push(
      `job ${job.jobId}: deposit short — collected ${job.depositCollected}, required ${terms.amount} (lever 14)`,
    );
  }
  if (terms.signatureRequired && !job.signedAt) {
    issues.push(`job ${job.jobId}: no signature on file (lever 14)`);
  }
  return issues;
}

// --------------------------------------------------------------- lever 15 --

export interface Invoice {
  invoiceId: string;
  jobId: string;
  amount: Cents;
  completedAt: string;
  issuedAt?: string;
  paidAt?: string;
  cardOnFile: boolean;
}

export const SAME_DAY_MS = 86_400_000;

export interface InvoiceAudit {
  invoiceId: string;
  issuedSameDay: boolean;
  daysToIssue: number | null;
  daysToPay: number | null;
  issues: string[];
}

export function auditInvoice(inv: Invoice, now: Date = new Date()): InvoiceAudit {
  const completed = new Date(inv.completedAt).getTime();
  const issues: string[] = [];

  const daysToIssue = inv.issuedAt
    ? (new Date(inv.issuedAt).getTime() - completed) / SAME_DAY_MS
    : (now.getTime() - completed) / SAME_DAY_MS;

  const issuedSameDay = inv.issuedAt != null && daysToIssue <= 1;

  if (!inv.issuedAt) issues.push(`invoice ${inv.invoiceId}: work complete, nothing issued (lever 15)`);
  else if (!issuedSameDay)
    issues.push(`invoice ${inv.invoiceId}: issued ${daysToIssue.toFixed(1)} days after completion (lever 15)`);

  if (!inv.cardOnFile) issues.push(`invoice ${inv.invoiceId}: no card on file — cannot auto-charge`);

  const daysToPay =
    inv.paidAt && inv.issuedAt
      ? (new Date(inv.paidAt).getTime() - new Date(inv.issuedAt).getTime()) / SAME_DAY_MS
      : null;

  return { invoiceId: inv.invoiceId, issuedSameDay, daysToIssue, daysToPay, issues };
}

export interface DsoReport {
  invoices: number;
  averageDaysSalesOutstanding: number;
  sameDayIssueRate: number;
  cardOnFileRate: number;
  /** Cash locked up in unpaid invoices right now. */
  outstanding: Cents;
}

export function dsoReport(invoices: Invoice[], now: Date = new Date()): DsoReport {
  if (invoices.length === 0) {
    return {
      invoices: 0,
      averageDaysSalesOutstanding: 0,
      sameDayIssueRate: 0,
      cardOnFileRate: 0,
      outstanding: 0,
    };
  }

  let totalDays = 0;
  let sameDay = 0;
  let carded = 0;
  let outstanding = 0;

  for (const inv of invoices) {
    const audit = auditInvoice(inv, now);
    if (audit.issuedSameDay) sameDay++;
    if (inv.cardOnFile) carded++;

    const completed = new Date(inv.completedAt).getTime();
    const end = inv.paidAt ? new Date(inv.paidAt).getTime() : now.getTime();
    totalDays += (end - completed) / SAME_DAY_MS;

    if (!inv.paidAt) outstanding += inv.amount;
  }

  return {
    invoices: invoices.length,
    averageDaysSalesOutstanding: totalDays / invoices.length,
    sameDayIssueRate: sameDay / invoices.length,
    cardOnFileRate: carded / invoices.length,
    outstanding,
  };
}

/**
 * The §16 claim, made computable: going from 30-day to 3-day collection on a
 * $60k/month business frees roughly $54k of working capital.
 */
export function workingCapitalFreed(
  monthlyRevenue: Cents,
  fromDso: number,
  toDso: number,
): Cents {
  const perDay = monthlyRevenue / 30;
  return Math.round(perDay * (fromDso - toDso));
}
