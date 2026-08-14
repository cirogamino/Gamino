#!/usr/bin/env node
/**
 * One-command setup for the money page.
 *
 *   npm run money:setup              local only — no Cloudflare account needed
 *   npm run money:setup -- --remote  also create the real D1 and apply the schema
 *
 * The local path deliberately requires no login: a local D1 lives in
 * .wrangler/state on your machine and ignores database_id entirely, so you can
 * be looking at the page before deciding whether to put anything in the cloud.
 *
 * Safe to re-run — every step checks for its own result first.
 *
 * Deploying is NOT part of this script. Publishing the page puts your balances
 * on the public internet, so that stays an explicit, separate decision.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DB_NAME = "gamino-money";
const PLACEHOLDER = "REPLACE_WITH_D1_ID";
const CONFIG = "wrangler.json";
const SCHEMA = "./migrations/0001_money.sql";

const applyRemote = process.argv.includes("--remote");

function wrangler(args, { capture = false } = {}) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

const step = (msg) => console.log(`\n\x1b[1m▸ ${msg}\x1b[0m`);

function fail(msg) {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m\n`);
  process.exit(1);
}

/** Wrangler exits 0 from `whoami` even when signed out, so auth problems are
 *  detected from the error text of the command that actually needed it. */
function looksLikeAuthError(error) {
  const text = `${error?.stdout ?? ""}${error?.stderr ?? ""}${error?.message ?? ""}`;
  return /CLOUDFLARE_API_TOKEN|not authenticated|Please run .?wrangler login|authentication error/i.test(
    text,
  );
}

const LOGIN_HINT =
  `You are not signed in to Cloudflare.\n\n` +
  `  Sign in, then run this again:\n\n` +
  `    npx wrangler login\n    npm run money:setup -- --remote\n\n` +
  `  Or skip the cloud entirely for now — "npm run money:setup" works offline.`;

// ── Local schema: no account required ───────────────────────────────────────
step("Applying the schema to your local database");
try {
  wrangler(["d1", "execute", DB_NAME, "--local", "--file", SCHEMA]);
  console.log("  Local database ready.");
} catch (error) {
  fail(
    looksLikeAuthError(error)
      ? LOGIN_HINT
      : "Local schema failed to apply. Check the error above.",
  );
}

// ── Remote: create the database and wire up its id ──────────────────────────
if (applyRemote) {
  function findDatabaseId() {
    try {
      const out = wrangler(["d1", "list", "--json"], { capture: true });
      return JSON.parse(out).find((d) => d.name === DB_NAME)?.uuid ?? null;
    } catch (error) {
      if (looksLikeAuthError(error)) fail(LOGIN_HINT);
      return null;
    }
  }

  step(`Looking for the "${DB_NAME}" database on Cloudflare`);
  let dbId = findDatabaseId();

  if (dbId) {
    console.log(`  Already exists (${dbId}).`);
  } else {
    console.log("  Not found — creating it.");
    try {
      wrangler(["d1", "create", DB_NAME]);
    } catch (error) {
      fail(
        looksLikeAuthError(error)
          ? LOGIN_HINT
          : "Could not create the database. Check the error above.",
      );
    }
    dbId = findDatabaseId();
    if (!dbId) {
      fail(
        `Created the database but could not read its id back.\n\n` +
          `  Run:   npx wrangler d1 list\n` +
          `  Then paste the uuid into ${CONFIG} over ${PLACEHOLDER}.`,
      );
    }
    console.log(`  Created (${dbId}).`);
  }

  step(`Wiring the id into ${CONFIG}`);
  const config = JSON.parse(readFileSync(CONFIG, "utf8"));
  const binding = config.d1_databases?.find((d) => d.binding === "MONEY_DB");
  if (!binding) fail(`No MONEY_DB binding in ${CONFIG}. Was it edited by hand?`);

  if (binding.database_id === dbId) {
    console.log("  Already correct.");
  } else {
    binding.database_id = dbId;
    writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
    console.log("  Written.");
  }

  step("Applying the schema to the real database");
  try {
    wrangler(["d1", "execute", DB_NAME, "--remote", "--file", SCHEMA]);
    console.log("  Remote database ready.");
  } catch (error) {
    fail(
      looksLikeAuthError(error)
        ? LOGIN_HINT
        : "Remote schema failed to apply. Check the error above.",
    );
  }
}

console.log(`
\x1b[32m✓ Setup complete.\x1b[0m

  Start it:   npm run dev
  Open:       http://localhost:5173/money
${
  applyRemote
    ? `
  The cloud database is ready too. Before "npm run deploy", put Cloudflare
  Access in front of this Worker — deploying publishes your balances and
  runway to anyone who has the URL.
`
    : `
  This is local only. Nothing has left your machine. When you want the cloud
  database as well:

    npm run money:setup -- --remote
`
}`);
