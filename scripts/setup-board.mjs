#!/usr/bin/env node
/**
 * One command to put the board live: npm run board:setup
 *
 * Logs in if needed, builds, deploys, mints the master token, sets it as a
 * secret, derives the ten per-seat write keys, saves them locally, and verifies
 * the live endpoints actually answer.
 *
 * Nothing here needs a value typed in. The token is generated, not chosen.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const SEATS = [
  "chair", "product", "research", "verify", "ops",
  "engineering", "distribution", "community", "volume", "execution",
];

const DRY = process.argv.includes("--dry-run");

const say = (m) => console.log(m);
const rule = () => say("─".repeat(66));

function run(args, opts = {}) {
  if (DRY) {
    say(`  [dry-run] npx wrangler ${args.join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  }
  return spawnSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: opts.interactive ? "inherit" : "pipe",
    input: opts.input,
  });
}

async function seatKey(token, seat) {
  const bytes = new TextEncoder().encode(`gamino-board:${token}:${seat}`);
  const hash = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fail(msg, detail) {
  say("");
  say(`✗ ${msg}`);
  if (detail) say(String(detail).trim().split("\n").slice(-8).join("\n"));
  process.exit(1);
}

rule();
say("GAMINO BOARD — going live");
rule();

/* 1. Authentication. Only step that can need a browser, and only ever once. */
say("\n[1/6] Checking Cloudflare authentication…");
const who = run(["whoami"]);
const authed = !DRY && /Account (ID|Name)|You are logged in/i.test(who.stdout || "");
if (!authed && !DRY) {
  say("      Not authenticated. Opening the Cloudflare login…");
  say("      (a browser window will open — approve it, then this continues on its own)");
  const login = run(["login"], { interactive: true });
  if (login.status !== 0) fail("Login did not complete.", login.stderr);
  say("      Authenticated.");
} else {
  say("      Already authenticated.");
}

/* 2. Build. Also syncs the office floor into public/. */
say("\n[2/6] Building…");
const build = DRY
  ? { status: 0 }
  : spawnSync("npm", ["run", "build"], { encoding: "utf8" });
if (build.status !== 0) fail("Build failed.", build.stderr || build.stdout);
say("      Built.");

/* 3. Deploy. The Worker must exist before a secret can be attached to it. */
say("\n[3/6] Deploying the Worker…");
const deploy = run(["deploy"]);
if (deploy.status !== 0) fail("Deploy failed.", deploy.stderr || deploy.stdout);
const out = `${deploy.stdout || ""}${deploy.stderr || ""}`;
const url = (out.match(/https:\/\/[^\s]+\.workers\.dev/) || [])[0] || null;
say(`      Deployed${url ? ` → ${url}` : ""}.`);

/* 4. Mint and set the master token. Generated, never typed. */
say("\n[4/6] Minting the master token…");
const token = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("base64url");
const secret = run(["secret", "put", "BOARD_TOKEN"], { input: token + "\n" });
if (secret.status !== 0) fail("Could not set BOARD_TOKEN.", secret.stderr || secret.stdout);
say("      BOARD_TOKEN set on the Worker.");

/* 5. Derive the per-seat keys. Nothing to store server-side — rotating the
      master revokes all ten at once. */
say("\n[5/6] Deriving per-seat write keys…");
const keys = [];
for (const seat of SEATS) keys.push([seat, await seatKey(token, seat)]);

const lines = [
  "GAMINO BOARD — KEYS. Keep this file private; it is gitignored.",
  `Generated: ${new Date().toISOString()}`,
  url ? `Board URL: ${url}` : "Board URL: <your workers.dev or custom domain>",
  "",
  `MASTER TOKEN (run header only, never give this to a seat):\n  ${token}`,
  "",
  "PER-SEAT WRITE KEYS — give each seat only its own line:",
  ...keys.map(([s, k]) => `  ${s.padEnd(14)} ${k}`),
  "",
  "Rotate everything by re-running: npm run board:setup",
];
writeFileSync(".board-keys.txt", lines.join("\n") + "\n", { mode: 0o600 });
say("      Written to .board-keys.txt (gitignored, chmod 600).");

/* 6. Prove it actually answers, rather than assuming a clean exit means live. */
say("\n[6/6] Verifying the live endpoints…");
if (DRY || !url) {
  say("      Skipped (no URL captured).");
} else {
  try {
    const r = await fetch(`${url}/board`, { headers: { "cache-control": "no-cache" } });
    const body = await r.text();
    if (!r.ok || !body.includes("GAMINO BOARD")) {
      fail(`GET ${url}/board returned ${r.status} and did not look like the board.`, body);
    }
    say(`      GET ${url}/board → 200, ${body.split("\n").length} lines.`);
    const j = await fetch(`${url}/board/json`);
    say(`      GET ${url}/board/json → ${j.status}.`);
  } catch (e) {
    say(`      Could not reach it yet (${e.message}). DNS may still be propagating; try the URL in a minute.`);
  }
}

rule();
say("BOARD IS LIVE");
rule();
say(`
Floor:   ${url ? url + "/office.html" : "<url>/office.html"}
Board:   ${url ? url + "/board" : "<url>/board"}   ← the URL you give the AIs
Keys:    .board-keys.txt

Next: in each file under ops/prompts/, replace <BOARD_URL> with
  ${url || "<your url>"}
and, for seats with tools, <your write key> with that seat's key.
`);
