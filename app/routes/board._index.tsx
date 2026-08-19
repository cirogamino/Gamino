import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { BoardManager, renderDigest } from "~/board";

/**
 * GET /board — the whole table as plain text.
 *
 * This is the URL every seat with browsing fetches before it acts. Plain text
 * rather than JSON on purpose: it is read by a language model, not parsed by
 * one, and a digest it can absorb in one pass beats a payload it has to
 * interpret.
 */
export async function loader({ context }: LoaderFunctionArgs) {
  const board = new BoardManager(context.cloudflare.env.BOARD);
  const digest = renderDigest(await board.read());

  return new Response(digest, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // The floor must never show a cached lie.
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
