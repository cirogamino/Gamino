/**
 * Money is integer cents. Never floats — a rounding drift of a tenth of a cent
 * per line item becomes a real discrepancy across a year of invoices, and the
 * one thing a contractor cannot afford is an invoice that does not foot.
 */

export type Cents = number;

export const dollars = (d: number): Cents => Math.round(d * 100);
export const toDollars = (c: Cents): number => c / 100;

export function formatMoney(c: Cents): string {
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Apply a rate (0.30 = +30%) to cents, rounding half away from zero. */
export function applyRate(c: Cents, rate: number): Cents {
  const raw = c * rate;
  return raw < 0 ? -Math.round(-raw) : Math.round(raw);
}

export const markup = (cost: Cents, rate: number): Cents => cost + applyRate(cost, rate);

/** Gross margin as a fraction of revenue. Returns 0 when revenue is 0. */
export function grossMargin(revenue: Cents, cost: Cents): number {
  if (revenue === 0) return 0;
  return (revenue - cost) / revenue;
}

export const sum = (xs: Cents[]): Cents => xs.reduce((a, b) => a + b, 0);
