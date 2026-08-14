/**
 * The Gamino board — the shared table every seat reads and writes.
 *
 * V2a of ops/office-vision.md. This is the piece that takes Ciro out of the
 * routing loop: seats that can reach the network read the whole table before
 * they act, and seats with tools post their own status instead of waiting to be
 * relayed.
 *
 * All storage logic lives here rather than in the routes so it can be tested in
 * isolation under the Workers vitest pool.
 */

export type SeatStatus =
  | "working"
  | "shipped"
  | "yellow"
  | "red"
  | "idle"
  | "nosignal";

export type Place = "room" | "desk";

/** How a seat's status reaches the board. Shown on the floor — trust is never assumed. */
export type Wire = "live" | "reported";

export interface SeatMeta {
  id: string;
  seat: string;
  ai: string;
  wire: Wire;
  lane: string;
  lock: string;
  challenger: string;
}

export interface HistoryEntry {
  t: string;
  i: string;
  e: string;
}

export interface SeatState {
  status: SeatStatus;
  place: Place;
  task: string | null;
  artifact: { name: string; url: string | null } | null;
  conf: number | null;
  blocked: string | null;
  next: string | null;
  need: string | null;
  cycle: string | null;
  /** Epoch ms of the last accepted post. null means this seat has never reported. */
  updatedAt: number | null;
  history: HistoryEntry[];
}

export interface RunState {
  id: string;
  clock: string;
  hour: number;
  cap: number | null;
  spend: number;
  gross: number;
  gate: boolean;
  freeze: boolean;
  /** Minutes of silence after which a seat is drawn as NO SIGNAL rather than idle. */
  staleAfterMinutes: number;
}

export interface Board {
  run: RunState;
  seats: Array<SeatMeta & SeatState>;
}

/** The ten seats. Order is floor order, not importance. */
export const ROSTER: SeatMeta[] = [
  { id: "chair", seat: "CHAIR / BUILD", ai: "Claude Code", wire: "live", lane: "Repo, deploys, the record", lock: "/app, /ops/board", challenger: "PRODUCT" },
  { id: "product", seat: "PRODUCT", ai: "ChatGPT", wire: "reported", lane: "Offer, pricing, copy, checkout", lock: "/product", challenger: "CHAIR" },
  { id: "research", seat: "RESEARCH", ai: "Gemini", wire: "reported", lane: "Demand evidence, competitors", lock: "/research", challenger: "VERIFY" },
  { id: "verify", seat: "VERIFY", ai: "Perplexity", wire: "reported", lane: "Fact desk, claim veto", lock: "/verify", challenger: "RESEARCH" },
  { id: "ops", seat: "OPS", ai: "Copilot", wire: "reported", lane: "Unit economics, SOPs, support", lock: "/ops-docs", challenger: "CHAIR" },
  { id: "engineering", seat: "ENGINEERING", ai: "DeepSeek", wire: "reported", lane: "Code review, QA, automation", lock: "/engineering", challenger: "CHAIR" },
  { id: "distribution", seat: "DISTRIBUTION", ai: "Grok", wire: "reported", lane: "Hooks, launch, reach", lock: "/distribution", challenger: "VERIFY" },
  { id: "community", seat: "COMMUNITY", ai: "Meta AI", wire: "reported", lane: "IG/FB, replies, audience", lock: "/community", challenger: "DISTRIBUTION" },
  { id: "volume", seat: "VOLUME", ai: "Mistral", wire: "reported", lane: "Bulk assets, variants, localization", lock: "/volume", challenger: "PRODUCT" },
  { id: "execution", seat: "EXECUTION", ai: "Manus", wire: "live", lane: "Listings, uploads, the test purchase", lock: "/execution", challenger: "OPS" },
];

export const DEFAULT_RUN: RunState = {
  id: "RUN-01",
  clock: "not started",
  hour: 0,
  cap: null,
  spend: 0,
  gross: 0,
  gate: false,
  freeze: false,
  staleAfterMinutes: 90,
};

function blankSeat(): SeatState {
  return {
    status: "nosignal",
    place: "desk",
    task: null,
    artifact: null,
    conf: null,
    blocked: null,
    next: null,
    need: null,
    cycle: null,
    updatedAt: null,
    history: [],
  };
}

/** STATUS values a seat may report. `nosignal` is computed, never claimed. */
const STATUS_MAP: Record<string, SeatStatus> = {
  GREEN: "working",
  WORKING: "working",
  SHIPPED: "shipped",
  DONE: "shipped",
  YELLOW: "yellow",
  RED: "red",
  BLOCKED: "red",
  IDLE: "idle",
};

export interface ParsedReport {
  status: SeatStatus;
  place: Place;
  task: string | null;
  artifact: { name: string; url: string | null } | null;
  conf: number | null;
  blocked: string | null;
  next: string | null;
  need: string | null;
  cycle: string | null;
  done: string | null;
}

const NONE = /^(none|none yet|n\/a|-|—|unknown)$/i;

function clean(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t || NONE.test(t)) return null;
  return t;
}

/**
 * Parses a Report Block into board state.
 *
 * Deliberately forgiving about everything except STATUS. A seat that produces a
 * slightly malformed block should still land on the floor; a seat that claims a
 * status nobody defined should be rejected loudly, because an unrecognised
 * status silently becoming "working" is exactly the kind of quiet lie the floor
 * exists to prevent.
 */
export function parseReportBlock(text: string): ParsedReport {
  const fields: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z ]{1,14}):\s*(.*)$/);
    if (m) fields[m[1].trim().toUpperCase()] = m[2];
  }

  const raw = (fields["STATUS"] || "").trim().toUpperCase().split(/[\s|]+/)[0];
  const status = STATUS_MAP[raw];
  if (!status) {
    throw new Error(
      `Unrecognised STATUS "${fields["STATUS"] ?? ""}". Use GREEN, SHIPPED, YELLOW, RED or IDLE.`,
    );
  }

  const placeRaw = (fields["PLACE"] || "").trim().toUpperCase();
  const place: Place = placeRaw.startsWith("ROOM") ? "room" : "desk";

  const artifactRaw = clean(fields["ARTIFACT"]);
  let artifact: ParsedReport["artifact"] = null;
  if (artifactRaw) {
    const url = artifactRaw.match(/https?:\/\/\S+/);
    artifact = { name: artifactRaw.replace(/\s+/g, " "), url: url ? url[0] : null };
  }

  const confRaw = clean(fields["CONFIDENCE"]);
  const confNum = confRaw ? parseInt(confRaw.replace(/[^\d]/g, ""), 10) : NaN;

  return {
    status,
    place,
    task: clean(fields["NOW"]),
    artifact,
    conf: Number.isFinite(confNum) ? Math.max(0, Math.min(100, confNum)) : null,
    blocked: clean(fields["BLOCKED"]),
    next: clean(fields["NEXT"]),
    need: clean(fields["NEED"]),
    cycle: clean(fields["CYCLE"]),
    done: clean(fields["DONE"]),
  };
}

/**
 * Per-seat write keys, derived from one master token so there is nothing extra
 * to store and rotating the master revokes all ten at once.
 */
export async function seatKey(token: string, seatId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`gamino-board:${token}:${seatId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent comparison so a wrong key leaks nothing through timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class BoardManager {
  constructor(
    private kv: KVNamespace,
    private prefix: string = "board:v1",
  ) {}

  private get runKey() {
    return `${this.prefix}:run`;
  }
  private seatStateKey(id: string) {
    return `${this.prefix}:seat:${id}`;
  }

  async readRun(): Promise<RunState> {
    const stored = (await this.kv.get(this.runKey, "json")) as Partial<RunState> | null;
    return { ...DEFAULT_RUN, ...(stored || {}) };
  }

  async setRun(patch: Partial<RunState>): Promise<RunState> {
    const next = { ...(await this.readRun()), ...patch };
    await this.kv.put(this.runKey, JSON.stringify(next));
    return next;
  }

  private async readSeatState(id: string): Promise<SeatState> {
    const stored = (await this.kv.get(this.seatStateKey(id), "json")) as SeatState | null;
    return stored ? { ...blankSeat(), ...stored } : blankSeat();
  }

  /**
   * The whole table, with staleness applied at read time.
   *
   * Staleness is computed rather than stored so a seat that goes quiet decays to
   * NO SIGNAL on its own, with no cron and nothing to forget to run.
   */
  async read(now: number = Date.now()): Promise<Board> {
    const run = await this.readRun();
    const staleMs = run.staleAfterMinutes * 60_000;
    const seats = await Promise.all(
      ROSTER.map(async (meta) => {
        const state = await this.readSeatState(meta.id);
        const stale =
          state.updatedAt === null || now - state.updatedAt > staleMs;
        return {
          ...meta,
          ...state,
          // Silence is never rest. A seat past the window reads as NO SIGNAL
          // regardless of what it last claimed.
          status: stale ? ("nosignal" as SeatStatus) : state.status,
        };
      }),
    );
    return { run, seats };
  }

  /** Records a seat's Report Block. Returns the seat's new state. */
  async post(
    seatId: string,
    report: ParsedReport,
    now: number = Date.now(),
  ): Promise<SeatState> {
    const meta = ROSTER.find((s) => s.id === seatId);
    if (!meta) throw new Error(`Unknown seat "${seatId}"`);

    const prev = await this.readSeatState(seatId);
    const history = prev.history.slice();
    if (report.done) {
      const stamp = report.cycle || new Date(now).toISOString().slice(11, 16);
      const last = history[history.length - 1];
      if (!last || last.i !== report.done) {
        history.push({ t: stamp, i: report.done, e: report.artifact?.name || "" });
      }
    }

    const next: SeatState = {
      status: report.status,
      place: report.place,
      task: report.task,
      artifact: report.artifact,
      conf: report.conf,
      blocked: report.blocked,
      next: report.next,
      need: report.need,
      cycle: report.cycle,
      updatedAt: now,
      history: history.slice(-40),
    };

    await this.kv.put(this.seatStateKey(seatId), JSON.stringify(next));
    return next;
  }

  async reset(): Promise<void> {
    await Promise.all([
      this.kv.delete(this.runKey),
      ...ROSTER.map((s) => this.kv.delete(this.seatStateKey(s.id))),
    ]);
  }
}

const AGO = (ms: number): string => {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

/**
 * The board as plain text.
 *
 * This is what a seat with browsing fetches at the start of every response, so
 * it is written to be read by an AI in one pass: no markup, fixed order, every
 * line self-describing, and the states that need action stated as instructions
 * rather than left to inference.
 */
export function renderDigest(board: Board, now: number = Date.now()): string {
  const { run, seats } = board;
  const L: string[] = [];

  L.push("=== GAMINO BOARD ===");
  L.push(
    `RUN: ${run.id} | CLOCK: ${run.clock} | IDEA FREEZE: ${run.freeze ? "ON" : "OFF"}`,
  );
  L.push(
    `SPEND: ${run.cap === null ? "no cap set" : `$${run.spend} of $${run.cap}`} | REVENUE: $${run.gross} | MONEY GATE: ${run.gate ? "CLEARED" : "NOT CLEARED"}`,
  );

  const inRoom = seats.filter((s) => s.place === "room" && s.status !== "nosignal");
  const blocked = seats.filter((s) => s.status === "red");
  const idle = seats.filter((s) => s.status === "idle");
  const quiet = seats.filter((s) => s.status === "nosignal");

  L.push(
    `TABLE: ${seats.length - quiet.length} reporting, ${inRoom.length} in the war room, ${blocked.length} blocked, ${idle.length} idle, ${quiet.length} silent`,
  );
  L.push("");

  for (const s of seats) {
    L.push(`--- ${s.seat} (${s.ai}) [${s.wire === "live" ? "LIVE" : "RELAY"}] ---`);
    L.push(`STATUS:   ${s.status.toUpperCase()}${s.updatedAt ? ` (${AGO(now - s.updatedAt)})` : " (never reported)"}`);
    if (s.status === "nosignal") {
      L.push(
        `NOTE:     No report inside ${run.staleAfterMinutes}m. Nobody knows what this seat is doing. This is a question, not a rest.`,
      );
    } else {
      L.push(`PLACE:    ${s.place === "room" ? "WAR ROOM" : "AT DESK"}`);
      L.push(`NOW:      ${s.task || "nothing assigned — this seat is asking for work"}`);
      L.push(`ARTIFACT: ${s.artifact ? s.artifact.name : "none"}`);
      if (s.blocked) L.push(`BLOCKED:  ${s.blocked}`);
      if (s.need) L.push(`NEEDS:    ${s.need}`);
      if (s.conf !== null) L.push(`CONF:     ${s.conf}%`);
    }
    L.push(`LANE:     ${s.lane} | CHALLENGER: ${s.challenger}`);
    L.push("");
  }

  L.push("=== WHAT THIS MEANS FOR YOU ===");
  if (blocked.length) {
    L.push(
      `RED: ${blocked.map((s) => s.seat).join(", ")}. If you are their Challenger or can unblock them, do it before your own lane.`,
    );
  }
  if (idle.length) {
    L.push(`IDLE and asking for work: ${idle.map((s) => s.seat).join(", ")}.`);
  }
  if (quiet.length) {
    L.push(
      `SILENT: ${quiet.map((s) => s.seat).join(", ")}. Assume their work is NOT happening. Law 1 applies — if it blocks you, do it yourself and log that you did.`,
    );
  }
  if (run.freeze) L.push("IDEA FREEZE IS ON. No new business ideas. Improve the committed offer or stay quiet.");
  L.push("Post your own Report Block when you finish this response.");
  L.push("=== END ===");

  return L.join("\n");
}
