import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  BoardManager,
  ROSTER,
  parseReportBlock,
  safeEqual,
  seatKey,
} from "~/board";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...CORS },
  });
}

/** GET /board/seat/:seat — one seat, plain text. Public: reading is never gated. */
export async function loader({ params, context }: LoaderFunctionArgs) {
  const id = (params.seat || "").toLowerCase();
  const meta = ROSTER.find((s) => s.id === id);
  if (!meta) return text(`Unknown seat "${id}".`, 404);

  const board = new BoardManager(context.cloudflare.env.BOARD);
  const seat = (await board.read()).seats.find((s) => s.id === id)!;

  return text(
    [
      `${seat.seat} (${seat.ai}) [${seat.wire === "live" ? "LIVE" : "RELAY"}]`,
      `STATUS:   ${seat.status.toUpperCase()}`,
      `PLACE:    ${seat.place === "room" ? "WAR ROOM" : "AT DESK"}`,
      `NOW:      ${seat.task || "—"}`,
      `ARTIFACT: ${seat.artifact ? seat.artifact.name : "none"}`,
      `BLOCKED:  ${seat.blocked || "none"}`,
      `CONF:     ${seat.conf === null ? "—" : seat.conf + "%"}`,
      `UPDATED:  ${seat.updatedAt ? new Date(seat.updatedAt).toISOString() : "never"}`,
    ].join("\n"),
  );
}

/**
 * POST /board/seat/:seat — a seat records its own Report Block.
 *
 * Body is the raw Report Block text. Auth is the seat's derived write key, sent
 * as `Authorization: Bearer <key>`.
 *
 * Writes are gated because an unauthenticated write would let anyone make the
 * floor say whatever they liked, and a floor that can be made to lie is worse
 * than no floor at all.
 */
export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return text("POST a Report Block here.", 405);

  const id = (params.seat || "").toLowerCase();
  const meta = ROSTER.find((s) => s.id === id);
  if (!meta) return text(`Unknown seat "${id}".`, 404);

  const master = context.cloudflare.env.BOARD_TOKEN;
  if (!master) {
    return text(
      "BOARD_TOKEN is not set on this Worker, so writes are refused. Set it with:\n" +
        "  wrangler secret put BOARD_TOKEN\n" +
        "then print the per-seat keys with:\n" +
        "  node scripts/board-keys.mjs <token>",
      503,
    );
  }

  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!presented || !safeEqual(presented, await seatKey(master, id))) {
    return text(`Wrong or missing write key for ${meta.seat}.`, 401);
  }

  const body = await request.text();
  if (!body.trim()) return text("Empty body. POST your Report Block as plain text.", 400);

  let report;
  try {
    report = parseReportBlock(body);
  } catch (err) {
    return text(`Could not read that Report Block. ${(err as Error).message}`, 400);
  }

  const board = new BoardManager(context.cloudflare.env.BOARD);
  const state = await board.post(id, report);

  return text(
    `Recorded. ${meta.seat} is ${state.status.toUpperCase()} ${state.place === "room" ? "in the war room" : "at their desk"}.`,
    200,
  );
}
