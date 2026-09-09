/**
 * Levers 8, 9, 10, 12 — getting more work out of work you are already doing.
 *
 *  8. Sell the next job on the current job
 *  9. Neighbour blitz after every job
 * 10. Bid the whole punch list, not the one item
 * 12. Get formally onto property-manager vendor lists
 *
 * Every one of these is free. They fail in practice not because they are hard
 * but because nothing forces them to happen, so each is modelled here as a gate
 * with a recorded answer rather than a suggestion someone can quietly skip.
 */

import { dollars, sum, type Cents } from "./money";
import { lookupTask } from "./pricing";

// ---------------------------------------------------------------- lever 8 --

export interface NextJobObservation {
  /** Free text as the tech saw it — "back door won't latch, frame is racked". */
  note: string;
  /** Task code if the tech could match it to the book. */
  suggestedTaskCode?: string;
  urgency: "now" | "soon" | "someday";
  photoCount: number;
}

export interface JobCloseout {
  jobId: string;
  techId: string;
  completedAt: string;
  observations: NextJobObservation[];
  /** Which observations turned into booked work. Filled in later. */
  convertedTaskCodes: string[];
}

/** The gate: three observations minimum, or the job is not closed out. */
export const REQUIRED_OBSERVATIONS = 3;

export function auditJobCloseout(c: JobCloseout): string[] {
  const issues: string[] = [];
  if (c.observations.length < REQUIRED_OBSERVATIONS) {
    issues.push(
      `job ${c.jobId}: ${c.observations.length} of ${REQUIRED_OBSERVATIONS} required observations (lever 8)`,
    );
  }
  const unphotographed = c.observations.filter((o) => o.photoCount === 0);
  if (unphotographed.length > 0) {
    issues.push(
      `job ${c.jobId}: ${unphotographed.length} observation(s) with no photo — a note without a photo does not sell`,
    );
  }
  return issues;
}

/** Value of everything the techs spotted but nobody has quoted yet. */
export function observationPipeline(closeouts: JobCloseout[]): {
  open: number;
  converted: number;
  conversionRate: number;
  estimatedValue: Cents;
} {
  let open = 0;
  let converted = 0;
  const values: Cents[] = [];

  for (const c of closeouts) {
    for (const o of c.observations) {
      const wasConverted = o.suggestedTaskCode
        ? c.convertedTaskCodes.includes(o.suggestedTaskCode)
        : false;
      if (wasConverted) converted++;
      else {
        open++;
        const task = o.suggestedTaskCode ? lookupTask(o.suggestedTaskCode) : undefined;
        values.push(task?.price ?? dollars(250)); // unmatched notes valued at a conservative default
      }
    }
  }

  const total = open + converted;
  return {
    open,
    converted,
    conversionRate: total === 0 ? 0 : converted / total,
    estimatedValue: sum(values),
  };
}

// ---------------------------------------------------------------- lever 9 --

export interface BlitzTarget {
  address: string;
  distanceMeters: number;
}

export interface BlitzPlan {
  jobId: string;
  originAddress: string;
  targets: BlitzTarget[];
  /** Same day, while the truck and the finished work are both still visible. */
  dueBy: string;
}

export const BLITZ_TARGET_COUNT = 20;
export const BLITZ_RADIUS_METERS = 150;

/**
 * Picks the nearest N neighbours. Tight radius on purpose: the hanger works
 * because the recipient can see the truck, not because it reached many doors.
 */
export function planBlitz(args: {
  jobId: string;
  originAddress: string;
  completedAt: string;
  candidates: BlitzTarget[];
  count?: number;
  radiusMeters?: number;
}): BlitzPlan {
  const count = args.count ?? BLITZ_TARGET_COUNT;
  const radius = args.radiusMeters ?? BLITZ_RADIUS_METERS;
  const targets = args.candidates
    .filter((c) => c.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, count);

  const due = new Date(args.completedAt);
  due.setUTCHours(23, 59, 59, 0);

  return { jobId: args.jobId, originAddress: args.originAddress, targets, dueBy: due.toISOString() };
}

// --------------------------------------------------------------- lever 10 --

export interface PunchListItem {
  description: string;
  taskCode?: string;
  requested: boolean;
}

export interface PunchListBid {
  requestedOnly: Cents;
  wholeList: Cents;
  uplift: Cents;
  /** Drive time you do NOT spend by doing it all in one dispatch. */
  dispatchesSaved: number;
  items: number;
}

/**
 * The comparison that makes the case to the property manager and to yourself:
 * bidding only what was asked leaves the rest for someone else's truck.
 */
export function bidWholePunchList(items: PunchListItem[]): PunchListBid {
  const price = (i: PunchListItem): Cents =>
    (i.taskCode ? lookupTask(i.taskCode)?.price : undefined) ?? dollars(250);

  const requested = items.filter((i) => i.requested);
  const requestedOnly = sum(requested.map(price));
  const wholeList = sum(items.map(price));

  return {
    requestedOnly,
    wholeList,
    uplift: wholeList - requestedOnly,
    dispatchesSaved: Math.max(0, items.length - requested.length),
    items: items.length,
  };
}

// --------------------------------------------------------------- lever 12 --

export type ComplianceDoc = "w9" | "coi" | "license" | "portal-registration";

export interface VendorCompliance {
  propertyManager: string;
  docs: Partial<Record<ComplianceDoc, { onFile: boolean; expiresAt?: string }>>;
}

export const REQUIRED_DOCS: ComplianceDoc[] = ["w9", "coi", "license", "portal-registration"];

export interface ComplianceStatus {
  propertyManager: string;
  ready: boolean;
  missing: ComplianceDoc[];
  expiringSoon: ComplianceDoc[];
}

/**
 * A certificate of insurance that lapsed is the same as never being on the list:
 * you stop receiving dispatches and nobody calls to tell you why.
 */
export function checkCompliance(
  v: VendorCompliance,
  now: Date = new Date(),
  warnDays = 30,
): ComplianceStatus {
  const missing: ComplianceDoc[] = [];
  const expiringSoon: ComplianceDoc[] = [];
  const horizon = now.getTime() + warnDays * 86_400_000;

  for (const doc of REQUIRED_DOCS) {
    const entry = v.docs[doc];
    if (!entry?.onFile) {
      missing.push(doc);
      continue;
    }
    if (entry.expiresAt) {
      const exp = new Date(entry.expiresAt).getTime();
      if (exp <= now.getTime()) missing.push(doc);
      else if (exp <= horizon) expiringSoon.push(doc);
    }
  }

  return {
    propertyManager: v.propertyManager,
    ready: missing.length === 0,
    missing,
    expiringSoon,
  };
}
