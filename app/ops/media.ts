/**
 * Lever 25 — film every job: 20 photos and one 60-second vertical.
 *
 * The compounding asset. Twelve months of consistent capture is roughly 400
 * pieces of proof that no competitor can retroactively create, because it can
 * only be produced by having actually done the work. It is free, it feeds the
 * website, the business profile and social at once, and it is abandoned within
 * three weeks unless something makes it a condition of closing a job out.
 *
 * So that is what this is: a closeout gate, not a content calendar.
 */

export type Shot =
  | "before-wide"
  | "before-detail"
  | "during-progress"
  | "after-wide"
  | "after-detail"
  | "crew-on-site";

export interface MediaAsset {
  shot: Shot;
  url: string;
  capturedAt: string;
}

export interface JobMedia {
  jobId: string;
  trade: string;
  assets: MediaAsset[];
  verticalVideoUrl?: string;
  verticalVideoSeconds?: number;
  customerReleaseSigned: boolean;
}

export const REQUIRED_PHOTOS = 20;
export const REQUIRED_SHOTS: Shot[] = [
  "before-wide",
  "before-detail",
  "after-wide",
  "after-detail",
];
export const VIDEO_MIN_SECONDS = 30;
export const VIDEO_MAX_SECONDS = 75;

export interface MediaAudit {
  jobId: string;
  photoCount: number;
  missingShots: Shot[];
  hasVideo: boolean;
  complete: boolean;
  issues: string[];
}

/**
 * A job is not closed until this passes. Counting photos is not enough — twenty
 * pictures of a finished floor prove nothing without the "before" beside them.
 */
export function auditJobMedia(m: JobMedia): MediaAudit {
  const issues: string[] = [];
  const have = new Set(m.assets.map((a) => a.shot));
  const missingShots = REQUIRED_SHOTS.filter((s) => !have.has(s));

  if (m.assets.length < REQUIRED_PHOTOS)
    issues.push(`job ${m.jobId}: ${m.assets.length} of ${REQUIRED_PHOTOS} photos (lever 25)`);

  if (missingShots.length > 0)
    issues.push(`job ${m.jobId}: missing ${missingShots.join(", ")} — an after with no before proves nothing`);

  const hasVideo = m.verticalVideoUrl != null;
  if (!hasVideo) issues.push(`job ${m.jobId}: no vertical video`);
  else if (
    m.verticalVideoSeconds != null &&
    (m.verticalVideoSeconds < VIDEO_MIN_SECONDS || m.verticalVideoSeconds > VIDEO_MAX_SECONDS)
  ) {
    issues.push(
      `job ${m.jobId}: video is ${m.verticalVideoSeconds}s, outside the ${VIDEO_MIN_SECONDS}-${VIDEO_MAX_SECONDS}s window`,
    );
  }

  if (!m.customerReleaseSigned)
    issues.push(`job ${m.jobId}: no customer release — cannot publish this one`);

  return {
    jobId: m.jobId,
    photoCount: m.assets.length,
    missingShots,
    hasVideo,
    complete: issues.length === 0,
    issues,
  };
}

// ------------------------------------------------------------ distribution --

export type Channel = "website-gallery" | "business-profile" | "social-vertical" | "ads-creative";

export interface DistributionItem {
  jobId: string;
  channel: Channel;
  assetUrls: string[];
}

/**
 * One capture, four destinations. The leverage is entirely in not re-shooting
 * for each channel.
 */
export function distribute(m: JobMedia): DistributionItem[] {
  if (!m.customerReleaseSigned) return [];

  const items: DistributionItem[] = [];
  const url = (s: Shot) => m.assets.filter((a) => a.shot === s).map((a) => a.url);

  const beforeAfter = [...url("before-wide"), ...url("after-wide")];
  if (beforeAfter.length >= 2) {
    items.push({ jobId: m.jobId, channel: "website-gallery", assetUrls: m.assets.map((a) => a.url) });
    items.push({ jobId: m.jobId, channel: "business-profile", assetUrls: beforeAfter });
    items.push({ jobId: m.jobId, channel: "ads-creative", assetUrls: beforeAfter });
  }

  if (m.verticalVideoUrl) {
    items.push({ jobId: m.jobId, channel: "social-vertical", assetUrls: [m.verticalVideoUrl] });
  }

  return items;
}

export interface LibraryStats {
  jobs: number;
  compliantJobs: number;
  complianceRate: number;
  totalAssets: number;
  publishableAssets: number;
  videos: number;
  /** Straight-line projection at the current rate. */
  projectedAssetsIn12Months: number;
}

/**
 * The number that makes the case for the discipline: what the library is worth
 * a year from now if capture holds at the current rate.
 */
export function libraryStats(jobs: JobMedia[], jobsPerMonth: number): LibraryStats {
  const audits = jobs.map(auditJobMedia);
  const compliant = audits.filter((a) => a.complete).length;
  const totalAssets = jobs.reduce((a, j) => a + j.assets.length, 0);
  const publishable = jobs
    .filter((j) => j.customerReleaseSigned)
    .reduce((a, j) => a + j.assets.length, 0);
  const videos = jobs.filter((j) => j.verticalVideoUrl).length;

  const perJob = jobs.length === 0 ? 0 : totalAssets / jobs.length;

  return {
    jobs: jobs.length,
    compliantJobs: compliant,
    complianceRate: jobs.length === 0 ? 0 : compliant / jobs.length,
    totalAssets,
    publishableAssets: publishable,
    videos,
    projectedAssetsIn12Months: Math.round(perJob * jobsPerMonth * 12),
  };
}
