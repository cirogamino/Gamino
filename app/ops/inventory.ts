/**
 * Lever 17 — standardised truck stock, restocked weekly.
 *
 * The supply-house run is the biggest invisible utilization killer in the trade:
 * 45-90 minutes, mid-morning, not billable, and it never appears on any report
 * because nobody logs it. Every van carrying the same list, checked weekly,
 * removes most of them.
 */

import { dollars, sum, type Cents } from "./money";

export interface StockItem {
  sku: string;
  name: string;
  /** Every van carries this many. Same list in every truck, no exceptions. */
  parLevel: number;
  unitCost: Cents;
  /** Roughly how often a run happens because this specific item was missing. */
  stockoutRunsPerYear: number;
}

/** The standard list. One list, every van — a "customised" van is an unstocked van. */
export const STANDARD_TRUCK_STOCK: StockItem[] = [
  { sku: "GFCI-15", name: "GFCI outlet, 15A", parLevel: 6, unitCost: dollars(18), stockoutRunsPerYear: 8 },
  { sku: "WAX-RING", name: "Wax ring kit", parLevel: 4, unitCost: dollars(6), stockoutRunsPerYear: 6 },
  { sku: "SUPPLY-12", name: 'Braided supply line, 12"', parLevel: 8, unitCost: dollars(9), stockoutRunsPerYear: 10 },
  { sku: "DW-PATCH", name: "Drywall patch kit", parLevel: 5, unitCost: dollars(12), stockoutRunsPerYear: 7 },
  { sku: "ANGLE-STOP", name: "Quarter-turn angle stop", parLevel: 6, unitCost: dollars(11), stockoutRunsPerYear: 9 },
  { sku: "LINESET-COVER", name: "Lineset cover, 3m section", parLevel: 3, unitCost: dollars(34), stockoutRunsPerYear: 5 },
  { sku: "WHIP-10", name: "Condenser whip, 10ft", parLevel: 3, unitCost: dollars(22), stockoutRunsPerYear: 4 },
  { sku: "COND-PAD", name: "Condenser pad", parLevel: 2, unitCost: dollars(48), stockoutRunsPerYear: 3 },
  { sku: "SCREWS-ASST", name: "Assorted screw kit", parLevel: 4, unitCost: dollars(15), stockoutRunsPerYear: 6 },
  { sku: "CAULK-100", name: "Sealant, all-purpose", parLevel: 10, unitCost: dollars(7), stockoutRunsPerYear: 5 },
];

/** A supply-house run, fully costed: drive, queue, drive back, work not done. */
export const SUPPLY_RUN_MINUTES = 65;
export const SUPPLY_RUN_COST: Cents = dollars(64);

export interface VanCount {
  vanId: string;
  counts: Record<string, number>;
  countedAt: string;
}

export interface RestockLine {
  sku: string;
  name: string;
  onHand: number;
  parLevel: number;
  order: number;
  cost: Cents;
}

export interface RestockOrder {
  vanId: string;
  lines: RestockLine[];
  totalCost: Cents;
  /** Items at zero — each one is a run already waiting to happen. */
  stockouts: string[];
}

export function buildRestock(
  count: VanCount,
  stock: StockItem[] = STANDARD_TRUCK_STOCK,
): RestockOrder {
  const lines: RestockLine[] = [];
  const stockouts: string[] = [];

  for (const item of stock) {
    const onHand = count.counts[item.sku] ?? 0;
    if (onHand === 0) stockouts.push(item.sku);
    const order = Math.max(0, item.parLevel - onHand);
    if (order > 0) {
      lines.push({
        sku: item.sku,
        name: item.name,
        onHand,
        parLevel: item.parLevel,
        order,
        cost: order * item.unitCost,
      });
    }
  }

  return {
    vanId: count.vanId,
    lines,
    totalCost: sum(lines.map((l) => l.cost)),
    stockouts,
  };
}

/** Carrying cost of one fully stocked van. */
export function parValue(stock: StockItem[] = STANDARD_TRUCK_STOCK): Cents {
  return sum(stock.map((i) => i.parLevel * i.unitCost));
}

/**
 * The argument for the lever: annual cost of the runs the standard list
 * prevents, against the working capital it ties up in each van.
 */
export function stockingCase(
  vans: number,
  stock: StockItem[] = STANDARD_TRUCK_STOCK,
): {
  runsAvoidedPerYear: number;
  hoursRecovered: number;
  annualSaving: Cents;
  capitalTiedUp: Cents;
  worthIt: boolean;
} {
  const runs = sum(stock.map((i) => i.stockoutRunsPerYear)) * vans;
  const saving = runs * SUPPLY_RUN_COST;
  const capital = parValue(stock) * vans;

  return {
    runsAvoidedPerYear: runs,
    hoursRecovered: Math.round((runs * SUPPLY_RUN_MINUTES) / 60),
    annualSaving: saving,
    capitalTiedUp: capital,
    worthIt: saving > capital,
  };
}

/** Weekly cadence: a count older than this is not a count. */
export const COUNT_STALE_DAYS = 7;

export function isCountStale(count: VanCount, now: Date = new Date()): boolean {
  const age = (now.getTime() - new Date(count.countedAt).getTime()) / 86_400_000;
  return age > COUNT_STALE_DAYS;
}
