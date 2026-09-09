/**
 * Levers 16 and 19 — utilization is the variable that decides the business.
 *
 * 16. Route density rule: no more than 15 minutes between same-day jobs
 * 19. Batch mini split installs geographically
 *
 * §15.1 of the plan: at $85 billed and $36.60 loaded, contribution is $18.65
 * per PAID hour, not the $48.40 per billable hour a naive subtraction gives.
 * The whole gap is utilization. Moving 65% to 75% is ~15% more revenue on
 * identical payroll — cheaper than hiring, and this module is where it happens.
 */

import { type Cents } from "./money";

export const MAX_HOP_MINUTES = 15;

export interface ScheduledJob {
  jobId: string;
  /** ISO start time. */
  start: string;
  durationHours: number;
  lat: number;
  lon: number;
  trade: "handyman" | "mini-split" | "epoxy" | "concrete" | "waterproofing";
}

/** Straight-line distance in km. Good enough to catch a bad booking. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Urban average including stops and parking. Deliberately pessimistic. */
export const AVERAGE_SPEED_KMH = 32;

export const driveMinutes = (a: ScheduledJob, b: ScheduledJob): number =>
  (haversineKm(a, b) / AVERAGE_SPEED_KMH) * 60;

// --------------------------------------------------------------- lever 16 --

export interface RouteViolation {
  from: string;
  to: string;
  minutes: number;
  overBy: number;
}

export interface RouteAudit {
  jobs: number;
  totalDriveMinutes: number;
  violations: RouteViolation[];
  /** Billable hours as a fraction of the paid day. The number that matters. */
  utilization: number;
  passes: boolean;
}

/**
 * Audits one tech's day. Rejects the booking that looks harmless — a job across
 * town at 2pm — and is actually an hour of unpaid driving.
 */
export function auditRoute(
  jobs: ScheduledJob[],
  paidHoursInDay = 8,
  maxHopMinutes = MAX_HOP_MINUTES,
): RouteAudit {
  const ordered = [...jobs].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  const violations: RouteViolation[] = [];
  let drive = 0;

  for (let i = 1; i < ordered.length; i++) {
    const minutes = driveMinutes(ordered[i - 1], ordered[i]);
    drive += minutes;
    if (minutes > maxHopMinutes) {
      violations.push({
        from: ordered[i - 1].jobId,
        to: ordered[i].jobId,
        minutes: Math.round(minutes),
        overBy: Math.round(minutes - maxHopMinutes),
      });
    }
  }

  const billable = ordered.reduce((a, j) => a + j.durationHours, 0);
  return {
    jobs: ordered.length,
    totalDriveMinutes: Math.round(drive),
    violations,
    utilization: paidHoursInDay === 0 ? 0 : billable / paidHoursInDay,
    passes: violations.length === 0,
  };
}

/**
 * Can this job be added to the day without breaking the rule? Called before the
 * booking is confirmed, which is the only moment the answer is cheap.
 */
export function canBook(
  day: ScheduledJob[],
  candidate: ScheduledJob,
  maxHopMinutes = MAX_HOP_MINUTES,
): { ok: boolean; reason?: string; nearestMinutes?: number } {
  if (day.length === 0) return { ok: true };

  const nearest = Math.min(...day.map((j) => driveMinutes(j, candidate)));
  if (nearest > maxHopMinutes) {
    return {
      ok: false,
      reason: `nearest job on this day is ${Math.round(nearest)} min away, over the ${maxHopMinutes} min rule (lever 16)`,
      nearestMinutes: Math.round(nearest),
    };
  }
  return { ok: true, nearestMinutes: Math.round(nearest) };
}

/** What a utilization move is worth, in revenue, on unchanged payroll. */
export function utilizationUpside(args: {
  currentUtilization: number;
  targetUtilization: number;
  monthlyRevenue: Cents;
}): { revenueGain: Cents; percentGain: number } {
  const { currentUtilization, targetUtilization, monthlyRevenue } = args;
  if (currentUtilization <= 0) return { revenueGain: 0, percentGain: 0 };
  const ratio = targetUtilization / currentUtilization;
  const gain = Math.round(monthlyRevenue * (ratio - 1));
  return { revenueGain: gain, percentGain: ratio - 1 };
}

// --------------------------------------------------------------- lever 19 --

export interface InstallBatch {
  day: string;
  jobs: ScheduledJob[];
  spreadKm: number;
  sharedEquipmentRun: boolean;
}

export const BATCH_RADIUS_KM = 8;

/**
 * Groups pending mini split installs into same-neighbourhood batches. Two
 * installs in one area on one day share the drive and, more importantly, one
 * trip to the distributor instead of two.
 */
export function batchInstalls(
  pending: ScheduledJob[],
  radiusKm = BATCH_RADIUS_KM,
): InstallBatch[] {
  const installs = pending.filter((j) => j.trade === "mini-split");
  const batches: InstallBatch[] = [];
  const claimed = new Set<string>();

  for (const seed of installs) {
    if (claimed.has(seed.jobId)) continue;

    const group = [seed];
    claimed.add(seed.jobId);

    for (const other of installs) {
      if (claimed.has(other.jobId)) continue;
      if (haversineKm(seed, other) <= radiusKm) {
        group.push(other);
        claimed.add(other.jobId);
      }
    }

    let spread = 0;
    for (const a of group) for (const b of group) spread = Math.max(spread, haversineKm(a, b));

    batches.push({
      day: seed.start.slice(0, 10),
      jobs: group,
      spreadKm: Math.round(spread * 10) / 10,
      sharedEquipmentRun: group.length > 1,
    });
  }

  return batches.sort((a, b) => b.jobs.length - a.jobs.length);
}
