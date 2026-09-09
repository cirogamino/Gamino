import { describe, expect, it } from "vitest";
import {
  auditJobMedia,
  distribute,
  libraryStats,
  REQUIRED_PHOTOS,
  type JobMedia,
  type MediaAsset,
  type Shot,
} from "../app/ops/media";

const asset = (shot: Shot, i = 0): MediaAsset => ({
  shot,
  url: `https://cdn.example.com/${shot}-${i}.jpg`,
  capturedAt: "2026-09-09T15:00:00Z",
});

function fullSet(): MediaAsset[] {
  const shots: Shot[] = ["before-wide", "before-detail", "during-progress", "after-wide", "after-detail", "crew-on-site"];
  const assets: MediaAsset[] = [];
  for (let i = 0; i < REQUIRED_PHOTOS; i++) assets.push(asset(shots[i % shots.length], i));
  return assets;
}

const job = (over: Partial<JobMedia> = {}): JobMedia => ({
  jobId: "J-1",
  trade: "mini-splits",
  assets: fullSet(),
  verticalVideoUrl: "https://cdn.example.com/j1.mp4",
  verticalVideoSeconds: 58,
  customerReleaseSigned: true,
  ...over,
});

describe("lever 25 — media capture as a closeout gate", () => {
  it("passes a complete capture", () => {
    const a = auditJobMedia(job());
    expect(a.complete).toBe(true);
    expect(a.issues).toHaveLength(0);
  });

  it("fails a short photo count", () => {
    const a = auditJobMedia(job({ assets: fullSet().slice(0, 8) }));
    expect(a.complete).toBe(false);
    expect(a.issues.some((i) => i.includes("8 of 20 photos"))).toBe(true);
  });

  it("fails twenty afters with no befores — counting alone proves nothing", () => {
    const afters = Array.from({ length: 24 }, (_, i) => asset("after-wide", i));
    const a = auditJobMedia(job({ assets: afters }));
    expect(a.missingShots).toContain("before-wide");
    expect(a.issues.some((i) => i.includes("proves nothing"))).toBe(true);
  });

  it("fails a missing video", () => {
    const a = auditJobMedia(job({ verticalVideoUrl: undefined, verticalVideoSeconds: undefined }));
    expect(a.hasVideo).toBe(false);
    expect(a.issues.some((i) => i.includes("no vertical video"))).toBe(true);
  });

  it("rejects a video outside the length window", () => {
    expect(auditJobMedia(job({ verticalVideoSeconds: 8 })).complete).toBe(false);
    expect(auditJobMedia(job({ verticalVideoSeconds: 200 })).complete).toBe(false);
  });

  it("blocks on a missing customer release", () => {
    const a = auditJobMedia(job({ customerReleaseSigned: false }));
    expect(a.issues.some((i) => i.includes("no customer release"))).toBe(true);
  });
});

describe("lever 25 — one capture, four destinations", () => {
  it("fans a complete job out to every channel", () => {
    const items = distribute(job());
    const channels = items.map((i) => i.channel);
    expect(channels).toContain("website-gallery");
    expect(channels).toContain("business-profile");
    expect(channels).toContain("ads-creative");
    expect(channels).toContain("social-vertical");
  });

  it("publishes nothing at all without a signed release", () => {
    expect(distribute(job({ customerReleaseSigned: false }))).toHaveLength(0);
  });

  it("skips the photo channels when there is no before-and-after pair", () => {
    const items = distribute(job({ assets: [asset("after-wide")] }));
    expect(items.map((i) => i.channel)).toEqual(["social-vertical"]);
  });

  it("skips the video channel when there is no video", () => {
    const items = distribute(job({ verticalVideoUrl: undefined }));
    expect(items.some((i) => i.channel === "social-vertical")).toBe(false);
  });
});

describe("lever 25 — the library compounds", () => {
  it("projects the twelve-month library at the current capture rate", () => {
    const stats = libraryStats([job(), job({ jobId: "J-2" })], 30);
    expect(stats.compliantJobs).toBe(2);
    expect(stats.complianceRate).toBe(1);
    expect(stats.projectedAssetsIn12Months).toBe(REQUIRED_PHOTOS * 30 * 12);
  });

  it("separates publishable assets from captured ones", () => {
    const stats = libraryStats([job(), job({ jobId: "J-2", customerReleaseSigned: false })], 10);
    expect(stats.totalAssets).toBe(REQUIRED_PHOTOS * 2);
    expect(stats.publishableAssets).toBe(REQUIRED_PHOTOS);
  });

  it("reports an empty library without dividing by zero", () => {
    const stats = libraryStats([], 30);
    expect(stats.jobs).toBe(0);
    expect(stats.complianceRate).toBe(0);
    expect(stats.projectedAssetsIn12Months).toBe(0);
  });
});
