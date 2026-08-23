/**
 * Data access for the money page.
 *
 * Everything is append-only. Burn rate and runway are derived at read time
 * from the reading history rather than stored, so a corrected reading fixes
 * every number downstream of it automatically.
 */

import { VENDORS, type Vendor } from "./vendors";

export interface Reading {
  vendorId: string;
  balance: number;
  source: string;
  ts: string;
  note: string | null;
}

export interface Refill {
  vendorId: string;
  amountUsd: number;
  source: string;
  ts: string;
  note: string | null;
}

export interface VendorState {
  vendor: Vendor;
  /** Most recent balance, or null if nothing has ever been recorded. */
  balance: number | null;
  lastReadingTs: string | null;
  /** Units burned per day, averaged over the window. Null until there are
   *  two readings far enough apart to mean anything. */
  burnPerDay: number | null;
  /** Days until empty at the current burn. Null when burn is unknown or
   *  the balance is going up. */
  runwayDays: number | null;
  /** Every reading in the window, oldest first — this is the sparkline. */
  history: { ts: string; balance: number }[];
  status: "unknown" | "healthy" | "low" | "critical";
}

/** Readings older than this are excluded from burn and runway math. */
const BURN_WINDOW_DAYS = 7;

export class MoneyStore {
  constructor(private db: D1Database) {}

  async recordReading(
    vendorId: string,
    balance: number,
    source = "manual",
    note?: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO readings (vendor_id, balance, source, ts, note)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(vendorId, balance, source, new Date().toISOString(), note ?? null)
      .run();
  }

  async recordRefill(
    vendorId: string,
    amountUsd: number,
    source = "manual",
    note?: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO refills (vendor_id, amount_usd, source, ts, note)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(vendorId, amountUsd, source, new Date().toISOString(), note ?? null)
      .run();
  }

  async readingsSince(since: Date): Promise<Reading[]> {
    const { results } = await this.db
      .prepare(
        `SELECT vendor_id, balance, source, ts, note
           FROM readings
          WHERE ts >= ?
          ORDER BY ts ASC`,
      )
      .bind(since.toISOString())
      .all<{
        vendor_id: string;
        balance: number;
        source: string;
        ts: string;
        note: string | null;
      }>();

    return (results ?? []).map((r) => ({
      vendorId: r.vendor_id,
      balance: r.balance,
      source: r.source,
      ts: r.ts,
      note: r.note,
    }));
  }

  async recentRefills(limit = 20): Promise<Refill[]> {
    const { results } = await this.db
      .prepare(
        `SELECT vendor_id, amount_usd, source, ts, note
           FROM refills
          ORDER BY ts DESC
          LIMIT ?`,
      )
      .bind(limit)
      .all<{
        vendor_id: string;
        amount_usd: number;
        source: string;
        ts: string;
        note: string | null;
      }>();

    return (results ?? []).map((r) => ({
      vendorId: r.vendor_id,
      amountUsd: r.amount_usd,
      source: r.source,
      ts: r.ts,
      note: r.note,
    }));
  }

  /** Current state of every vendor, including ones with no data yet — an
   *  unmonitored vendor is exactly the one that surprises you, so it still
   *  gets a card. */
  async vendorStates(windowDays = 30): Promise<VendorState[]> {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const readings = await this.readingsSince(since);

    const byVendor = new Map<string, Reading[]>();
    for (const r of readings) {
      const list = byVendor.get(r.vendorId);
      if (list) list.push(r);
      else byVendor.set(r.vendorId, [r]);
    }

    return VENDORS.map((vendor) => {
      const history = byVendor.get(vendor.id) ?? [];
      const latest = history.at(-1) ?? null;
      const balance = latest?.balance ?? null;
      const burnPerDay = computeBurn(history);

      let runwayDays: number | null = null;
      if (balance !== null && burnPerDay !== null && burnPerDay > 0) {
        runwayDays = balance / burnPerDay;
      }

      return {
        vendor,
        balance,
        lastReadingTs: latest?.ts ?? null,
        burnPerDay,
        runwayDays,
        history: history.map((h) => ({ ts: h.ts, balance: h.balance })),
        status: classify(vendor, balance, runwayDays),
      };
    });
  }
}

/**
 * Average daily burn over the trailing window.
 *
 * Refills make the balance jump upward, which would read as negative burn, so
 * only downward movements between consecutive readings count. That means a
 * refill is invisible to burn rather than cancelling out real spend.
 */
function computeBurn(history: Reading[]): number | null {
  if (history.length < 2) return null;

  const cutoff = Date.now() - BURN_WINDOW_DAYS * 86_400_000;
  const window = history.filter((h) => Date.parse(h.ts) >= cutoff);
  if (window.length < 2) return null;

  let spent = 0;
  for (let i = 1; i < window.length; i++) {
    const delta = window[i - 1].balance - window[i].balance;
    if (delta > 0) spent += delta;
  }

  const elapsedMs = Date.parse(window.at(-1)!.ts) - Date.parse(window[0].ts);
  const elapsedDays = elapsedMs / 86_400_000;

  // Under an hour of history says nothing useful about a daily rate.
  if (elapsedDays < 1 / 24) return null;

  return spent / elapsedDays;
}

function classify(
  vendor: Vendor,
  balance: number | null,
  runwayDays: number | null,
): VendorState["status"] {
  if (balance === null) return "unknown";
  if (runwayDays !== null && runwayDays < 1) return "critical";
  if (vendor.lowThreshold !== undefined) {
    if (balance < vendor.lowThreshold * 0.4) return "critical";
    if (balance < vendor.lowThreshold) return "low";
  }
  if (runwayDays !== null && runwayDays < 3) return "low";
  return "healthy";
}
