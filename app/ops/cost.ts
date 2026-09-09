/**
 * Levers 20-23 — the cost side.
 *
 * 20. Distributor account instead of retail
 * 21. Audit workers' comp class codes  [SOP — the system tracks and nags; a
 *     human and a broker do the actual audit. See docs/sop/comp-code-audit.md]
 * 22. Hire tech #2 before you feel ready
 * 23. Fire the worst 10% of customers annually
 *
 * Lever 21 is deliberately not modelled as something the software "performs".
 * Code that claimed to audit your class codes would be a lie. What code can
 * honestly do is know when the audit is overdue and estimate what the exposure
 * is worth, which is what makes the phone call actually happen.
 */

import { applyRate, dollars, grossMargin, sum, type Cents } from "./money";

// --------------------------------------------------------------- lever 20 --

export interface EquipmentItem {
  sku: string;
  name: string;
  retailPrice: Cents;
  /** Trade price once a distributor account is open. */
  distributorPrice: Cents;
}

export const EQUIPMENT: EquipmentItem[] = [
  { sku: "MS-COND-12K", name: "Condenser, single zone 12k", retailPrice: dollars(1500), distributorPrice: dollars(1150) },
  { sku: "MS-COND-18K", name: "Condenser, single zone 18k", retailPrice: dollars(1850), distributorPrice: dollars(1410) },
  { sku: "MS-COND-3Z", name: "Condenser, three zone", retailPrice: dollars(3200), distributorPrice: dollars(2380) },
  { sku: "MS-HEAD", name: "Indoor head unit", retailPrice: dollars(420), distributorPrice: dollars(305) },
  { sku: "MS-LINESET", name: "Lineset, 25ft pre-charged", retailPrice: dollars(310), distributorPrice: dollars(228) },
];

const equipmentBySku = new Map(EQUIPMENT.map((e) => [e.sku, e]));

export interface SourcingComparison {
  retailTotal: Cents;
  distributorTotal: Cents;
  saving: Cents;
  savingRate: number;
  unknownSkus: string[];
}

/**
 * The saving drops straight to gross profit because the customer price does not
 * change — this is the cheapest margin on the whole list.
 */
export function compareSourcing(skus: string[]): SourcingComparison {
  const unknownSkus: string[] = [];
  const retail: Cents[] = [];
  const trade: Cents[] = [];

  for (const sku of skus) {
    const item = equipmentBySku.get(sku);
    if (!item) {
      unknownSkus.push(sku);
      continue;
    }
    retail.push(item.retailPrice);
    trade.push(item.distributorPrice);
  }

  const retailTotal = sum(retail);
  const distributorTotal = sum(trade);
  const saving = retailTotal - distributorTotal;

  return {
    retailTotal,
    distributorTotal,
    saving,
    savingRate: retailTotal === 0 ? 0 : saving / retailTotal,
    unknownSkus,
  };
}

/** Annualised: what staying on retail pricing costs across a year of installs. */
export function annualSourcingLoss(installsPerMonth: number, skusPerInstall: string[]): Cents {
  return compareSourcing(skusPerInstall).saving * installsPerMonth * 12;
}

// --------------------------------------------------------------- lever 21 --
// SOP lever. Tracking only — the audit itself happens on a phone call.

export type CompClassCode = "5645-carpentry" | "9015-building-maintenance" | "5537-hvac" | "6217-excavation";

export interface CompClassAssignment {
  techId: string;
  assignedCode: CompClassCode;
  /** Share of hours actually worked in each code over the review period. */
  actualHoursByCode: Partial<Record<CompClassCode, number>>;
}

/** Indicative rates as a fraction of payroll. Real rates come from your broker. */
export const INDICATIVE_COMP_RATES: Record<CompClassCode, number> = {
  "9015-building-maintenance": 0.062,
  "5645-carpentry": 0.118,
  "5537-hvac": 0.081,
  "6217-excavation": 0.213,
};

export interface CompAuditFinding {
  techId: string;
  assignedCode: CompClassCode;
  dominantActualCode: CompClassCode;
  misassigned: boolean;
  annualPayroll: Cents;
  /** Positive means you are overpaying at the assigned code. */
  annualVariance: Cents;
}

/**
 * Flags techs whose assigned code does not match where their hours actually go.
 * This does not change anything by itself — it produces the list you take to
 * the broker, which is the entire point of the SOP.
 */
export function auditCompCodes(
  assignments: CompClassAssignment[],
  annualPayrollPerTech: Cents,
): CompAuditFinding[] {
  return assignments.map((a) => {
    const entries = Object.entries(a.actualHoursByCode) as [CompClassCode, number][];
    const dominant = entries.sort((x, y) => y[1] - x[1])[0]?.[0] ?? a.assignedCode;

    const assignedCost = applyRate(annualPayrollPerTech, INDICATIVE_COMP_RATES[a.assignedCode]);
    const actualCost = applyRate(annualPayrollPerTech, INDICATIVE_COMP_RATES[dominant]);

    return {
      techId: a.techId,
      assignedCode: a.assignedCode,
      dominantActualCode: dominant,
      misassigned: dominant !== a.assignedCode,
      annualPayroll: annualPayrollPerTech,
      annualVariance: assignedCost - actualCost,
    };
  });
}

export const COMP_AUDIT_INTERVAL_DAYS = 365;

export function compAuditDue(lastAuditedAt: string | null, now: Date = new Date()): boolean {
  if (!lastAuditedAt) return true;
  const days = (now.getTime() - new Date(lastAuditedAt).getTime()) / 86_400_000;
  return days >= COMP_AUDIT_INTERVAL_DAYS;
}

// --------------------------------------------------------------- lever 22 --

/**
 * The plan's §15.1 arithmetic, made executable. Tech #1 nets roughly $333/mo
 * against fixed overhead; profit starts at tech #2. This exists so the decision
 * is made by the numbers rather than by nerve.
 */
export interface HeadcountModel {
  grossProfitPerTechPerMonth: Cents;
  fixedOverheadPerMonth: Cents;
  /** Overhead added by each additional tech — mainly the van. */
  marginalOverheadPerTech: Cents;
}

export const DEFAULT_HEADCOUNT: HeadcountModel = {
  grossProfitPerTechPerMonth: dollars(3983),
  fixedOverheadPerMonth: dollars(3650),
  marginalOverheadPerTech: dollars(900),
};

export function profitAtHeadcount(techs: number, m: HeadcountModel = DEFAULT_HEADCOUNT): Cents {
  if (techs <= 0) return -m.fixedOverheadPerMonth;
  const gp = m.grossProfitPerTechPerMonth * techs;
  const overhead = m.fixedOverheadPerMonth + m.marginalOverheadPerTech * (techs - 1);
  return gp - overhead;
}

export interface HiringSignal {
  currentTechs: number;
  currentProfit: Cents;
  profitWithOneMore: Cents;
  gain: Cents;
  shouldHire: boolean;
  rationale: string;
}

export function hiringSignal(
  currentTechs: number,
  backlogHours: number,
  m: HeadcountModel = DEFAULT_HEADCOUNT,
): HiringSignal {
  const current = profitAtHeadcount(currentTechs, m);
  const next = profitAtHeadcount(currentTechs + 1, m);
  const gain = next - current;

  // One tech is ~173 billable hours a month at 65% utilization of a 160h month.
  const backlogSupportsIt = backlogHours >= 104;
  const shouldHire = gain > 0 && backlogSupportsIt;

  return {
    currentTechs,
    currentProfit: current,
    profitWithOneMore: next,
    gain,
    shouldHire,
    rationale: shouldHire
      ? `Tech ${currentTechs + 1} adds ${gain} cents/mo and there are ${backlogHours} backlog hours to feed them. Hire now — waiting is the expensive option.`
      : gain <= 0
        ? `Tech ${currentTechs + 1} does not pay for itself at current gross profit per tech.`
        : `Gross profit supports the hire but backlog is only ${backlogHours}h. Build demand first.`,
  };
}

// --------------------------------------------------------------- lever 23 --

export interface CustomerRecord {
  customerId: string;
  name: string;
  annualRevenue: Cents;
  annualDirectCost: Cents;
  /** Unbilled admin: chasing payment, re-visits, complaint handling. */
  adminHours: number;
  averageDaysToPay: number;
  complaints: number;
}

export const ADMIN_HOUR_COST: Cents = dollars(45);

export interface CustomerScore {
  customerId: string;
  name: string;
  trueGrossProfit: Cents;
  margin: number;
  /** Lower is worse. Blends margin, payment speed and complaint load. */
  score: number;
  recommendation: "keep" | "raise-price" | "fire";
  reason: string;
}

/**
 * True profit, not revenue. A big customer who pays in 75 days and complains
 * constantly can be your least profitable account while looking like your best.
 */
export function scoreCustomer(c: CustomerRecord): CustomerScore {
  const adminCost = c.adminHours * ADMIN_HOUR_COST;
  const trueGp = c.annualRevenue - c.annualDirectCost - adminCost;
  const margin = grossMargin(c.annualRevenue, c.annualDirectCost + adminCost);

  const paymentPenalty = Math.max(0, (c.averageDaysToPay - 15) / 60);
  const complaintPenalty = Math.min(0.5, c.complaints * 0.08);
  const score = margin - paymentPenalty - complaintPenalty;

  let recommendation: CustomerScore["recommendation"] = "keep";
  let reason = "Profitable and low-friction. Protect this one.";

  if (trueGp <= 0) {
    recommendation = "fire";
    reason = `Loses money once ${c.adminHours}h of unbilled admin is counted.`;
  } else if (score < 0.25) {
    recommendation = "raise-price";
    reason = `Thin after admin, pays in ${c.averageDaysToPay} days, ${c.complaints} complaints. Raise 30% — they leave or become profitable.`;
  }

  return { customerId: c.customerId, name: c.name, trueGrossProfit: trueGp, margin, score, recommendation, reason };
}

export interface CullResult {
  reviewed: number;
  cullList: CustomerScore[];
  /** Admin hours you get back by acting on the list. */
  adminHoursRecovered: number;
  revenueAtRisk: Cents;
}

/** The annual cull: worst 10% by score, floor of one so a small book still gets reviewed. */
export function annualCull(customers: CustomerRecord[], fraction = 0.1): CullResult {
  if (customers.length === 0) {
    return { reviewed: 0, cullList: [], adminHoursRecovered: 0, revenueAtRisk: 0 };
  }

  const scored = customers.map(scoreCustomer).sort((a, b) => a.score - b.score);
  const take = Math.max(1, Math.round(customers.length * fraction));
  const cullList = scored.slice(0, take).filter((s) => s.recommendation !== "keep");

  const byId = new Map(customers.map((c) => [c.customerId, c]));
  return {
    reviewed: customers.length,
    cullList,
    adminHoursRecovered: cullList.reduce((a, s) => a + (byId.get(s.customerId)?.adminHours ?? 0), 0),
    revenueAtRisk: cullList.reduce((a, s) => a + (byId.get(s.customerId)?.annualRevenue ?? 0), 0),
  };
}
