import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { BoardManager, safeEqual, type RunState } from "~/board";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...CORS },
  });
}

const NUMERIC = new Set(["hour", "cap", "spend", "gross", "staleAfterMinutes"]);
const BOOLEAN = new Set(["gate", "freeze"]);
const STRING = new Set(["id", "clock"]);

/**
 * POST /board/run — updates the run header: clock, spend, revenue, money gate,
 * idea freeze.
 *
 * Master token only. The run header is the Chair's, not a seat's — a seat that
 * could edit the spend figure or clear the money gate could rewrite the run's
 * scoreboard from inside its own lane.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return text("POST a JSON patch here.", 405);

  const master = context.cloudflare.env.BOARD_TOKEN;
  if (!master) return text("BOARD_TOKEN is not set on this Worker, so writes are refused.", 503);

  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!presented || !safeEqual(presented, master)) return text("Wrong or missing master token.", 401);

  let patch: Record<string, unknown>;
  try {
    patch = JSON.parse(await request.text());
  } catch {
    return text("Body must be JSON, e.g. {\"clock\":\"H07 of 24\",\"spend\":34}", 400);
  }

  const clean: Partial<RunState> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (NUMERIC.has(k) && (typeof v === "number" || v === null)) {
      (clean as Record<string, unknown>)[k] = v;
    } else if (BOOLEAN.has(k) && typeof v === "boolean") {
      (clean as Record<string, unknown>)[k] = v;
    } else if (STRING.has(k) && typeof v === "string") {
      (clean as Record<string, unknown>)[k] = v;
    } else {
      return text(`Cannot set "${k}" to that value.`, 400);
    }
  }

  const run = await new BoardManager(context.cloudflare.env.BOARD).setRun(clean);
  return text(
    `Run updated. ${run.id} | ${run.clock} | spend ${run.cap === null ? run.spend : `${run.spend}/${run.cap}`} | gate ${run.gate ? "CLEARED" : "NOT CLEARED"} | freeze ${run.freeze ? "ON" : "OFF"}`,
  );
}
