#!/usr/bin/env node
/**
 * Copies the office floor into public/ so the Worker serves it same-origin with
 * /board/json. ops/ stays the source of truth; the copy is generated and
 * gitignored.
 */
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });
for (const f of ["office.html", "dashboard.html"]) {
  await copyFile(`ops/${f}`, `public/${f}`);
  console.log(`synced ops/${f} -> public/${f}`);
}
