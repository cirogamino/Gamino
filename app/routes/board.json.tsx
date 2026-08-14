import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { BoardManager } from "~/board";

/** GET /board/json — the same table as structured data, for the office floor. */
export async function loader({ context }: LoaderFunctionArgs) {
  const board = new BoardManager(context.cloudflare.env.BOARD);

  return new Response(JSON.stringify(await board.read(), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
