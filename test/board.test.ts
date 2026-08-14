import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import {
  BoardManager,
  parseReportBlock,
  renderDigest,
  safeEqual,
  seatKey,
  ROSTER,
} from "../app/board";

const BLOCK = `
SEAT:        EXECUTION
CYCLE:       RUN-01 / H07
STATUS:      RED
NOW:         Test purchase failed — download link 404s after payment.
PLACE:       ROOM
ARTIFACT:    execution/purchase-test-03.png
DONE:        Confirmed 6 of 9 accounts logged in
NEXT:        Hand the 404 to ENGINEERING
NEED:        ENGINEERING
BLOCKED:     BLK-03 — delivery fails post-payment
CONFIDENCE:  30%
KILL SIGNAL: NONE YET
`;

describe("parseReportBlock", () => {
  it("reads a full block", () => {
    const r = parseReportBlock(BLOCK);
    expect(r.status).toBe("red");
    expect(r.place).toBe("room");
    expect(r.task).toContain("Test purchase failed");
    expect(r.artifact).toEqual({ name: "execution/purchase-test-03.png", url: null });
    expect(r.conf).toBe(30);
    expect(r.blocked).toContain("BLK-03");
    expect(r.done).toBe("Confirmed 6 of 9 accounts logged in");
  });

  it("maps every status a seat is allowed to claim", () => {
    const of = (s: string) => parseReportBlock(`STATUS: ${s}\nPLACE: DESK`).status;
    expect(of("GREEN")).toBe("working");
    expect(of("SHIPPED")).toBe("shipped");
    expect(of("YELLOW")).toBe("yellow");
    expect(of("RED")).toBe("red");
    expect(of("IDLE")).toBe("idle");
  });

  it("rejects an unrecognised status rather than guessing", () => {
    expect(() => parseReportBlock("STATUS: VIBING")).toThrow(/Unrecognised STATUS/);
  });

  it("refuses to let a seat claim NO SIGNAL", () => {
    // nosignal is computed from silence. A seat claiming it would be reporting
    // that it is not reporting.
    expect(() => parseReportBlock("STATUS: NOSIGNAL")).toThrow();
  });

  it("treats NONE and friends as empty, not as content", () => {
    const r = parseReportBlock("STATUS: GREEN\nBLOCKED: NONE\nARTIFACT: none\nNEED: —");
    expect(r.blocked).toBeNull();
    expect(r.artifact).toBeNull();
    expect(r.need).toBeNull();
  });

  it("pulls a URL out of the artifact when there is one", () => {
    const r = parseReportBlock("STATUS: GREEN\nARTIFACT: Landing page https://example.com/buy");
    expect(r.artifact?.url).toBe("https://example.com/buy");
  });

  it("defaults to DESK when PLACE is missing", () => {
    expect(parseReportBlock("STATUS: GREEN").place).toBe("desk");
  });

  it("clamps a confidence outside 0-100", () => {
    expect(parseReportBlock("STATUS: GREEN\nCONFIDENCE: 480%").conf).toBe(100);
  });
});

describe("BoardManager", () => {
  let board: BoardManager;

  beforeEach(() => {
    board = new BoardManager(env.BOARD, "test:board");
  });
  afterEach(async () => {
    await board.reset();
  });

  it("starts with every seat silent, not idle", async () => {
    const { seats } = await board.read();
    expect(seats).toHaveLength(10);
    expect(seats.every((s) => s.status === "nosignal")).toBe(true);
    expect(seats.every((s) => s.updatedAt === null)).toBe(true);
  });

  it("records a post and reads it back", async () => {
    await board.post("execution", parseReportBlock(BLOCK));
    const seat = (await board.read()).seats.find((s) => s.id === "execution")!;
    expect(seat.status).toBe("red");
    expect(seat.place).toBe("room");
    expect(seat.conf).toBe(30);
    expect(seat.history).toHaveLength(1);
  });

  it("decays a seat to NO SIGNAL once it goes quiet", async () => {
    const t0 = 1_000_000_000_000;
    await board.post("product", parseReportBlock("STATUS: GREEN\nNOW: writing copy"), t0);

    const fresh = (await board.read(t0 + 60 * 60_000)).seats.find((s) => s.id === "product")!;
    expect(fresh.status).toBe("working");

    const stale = (await board.read(t0 + 91 * 60_000)).seats.find((s) => s.id === "product")!;
    expect(stale.status).toBe("nosignal");
  });

  it("keeps idle distinct from silence", async () => {
    const t0 = 1_000_000_000_000;
    await board.post("community", parseReportBlock("STATUS: IDLE"), t0);
    const seat = (await board.read(t0 + 60_000)).seats.find((s) => s.id === "community")!;
    // An idle seat is reporting an empty queue, which is a request for work —
    // not the same signal as a seat nobody has heard from.
    expect(seat.status).toBe("idle");
    expect(seat.updatedAt).toBe(t0);
  });

  it("appends shipped work to history without duplicating a repeated post", async () => {
    const r = parseReportBlock("STATUS: SHIPPED\nDONE: Offer spec frozen\nCYCLE: H01");
    await board.post("product", r);
    await board.post("product", r);
    const seat = (await board.read()).seats.find((s) => s.id === "product")!;
    expect(seat.history).toHaveLength(1);
    expect(seat.history[0].i).toBe("Offer spec frozen");
  });

  it("rejects a seat that is not on the roster", async () => {
    await expect(board.post("intern", parseReportBlock("STATUS: GREEN"))).rejects.toThrow(/Unknown seat/);
  });

  it("stores and patches the run header", async () => {
    expect((await board.readRun()).clock).toBe("not started");
    await board.setRun({ clock: "H07 of 24", spend: 34, cap: 100, freeze: true });
    const run = await board.readRun();
    expect(run).toMatchObject({ clock: "H07 of 24", spend: 34, cap: 100, freeze: true });
    expect(run.gate).toBe(false);
  });
});

describe("renderDigest", () => {
  let board: BoardManager;
  beforeEach(() => {
    board = new BoardManager(env.BOARD, "test:digest");
  });
  afterEach(async () => {
    await board.reset();
  });

  it("names silent seats and tells the reader what to assume", async () => {
    const out = renderDigest(await board.read());
    expect(out).toContain("SILENT:");
    expect(out).toContain("Assume their work is NOT happening");
    expect(out).toContain("Law 1 applies");
  });

  it("surfaces blocked seats as the first call to action", async () => {
    const t0 = 1_000_000_000_000;
    await board.post("execution", parseReportBlock(BLOCK), t0);
    const out = renderDigest(await board.read(t0 + 60_000), t0 + 60_000);
    expect(out).toMatch(/RED: EXECUTION/);
    expect(out).toContain("WAR ROOM");
  });

  it("says an idle seat is asking for work, not resting", async () => {
    const t0 = 1_000_000_000_000;
    await board.post("community", parseReportBlock("STATUS: IDLE"), t0);
    const out = renderDigest(await board.read(t0 + 60_000), t0 + 60_000);
    expect(out).toContain("IDLE and asking for work: COMMUNITY");
  });
});

describe("write keys", () => {
  it("gives every seat a different key from one master", async () => {
    const keys = await Promise.all(ROSTER.map((s) => seatKey("master-token", s.id)));
    expect(new Set(keys).size).toBe(ROSTER.length);
    expect(keys.every((k) => /^[0-9a-f]{24}$/.test(k))).toBe(true);
  });

  it("changes every key when the master rotates", async () => {
    expect(await seatKey("old", "chair")).not.toBe(await seatKey("new", "chair"));
  });

  it("is stable for the same master and seat", async () => {
    expect(await seatKey("t", "chair")).toBe(await seatKey("t", "chair"));
  });

  it("compares without leaking length or content", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
