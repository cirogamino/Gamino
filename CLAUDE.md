# CLAUDE.md — read this before asking Ciro for anything

## The rule

**Never ask Ciro to run a command or hand over credentials until you have
checked, exhaustively, whether you can do it yourself — and if you must ask, it
is one command with nothing to type.**

This has gone wrong more than once. The failure mode is skimming a tool list,
concluding "no access," and asking. Enumerate before you conclude.

---

## Cloudflare access — audited, do not re-ask

Audit performed 2026-08-18. **Re-run the checks before trusting this; do not
re-ask Ciro on the basis of not having checked.**

### What was checked

| Check | Result |
|---|---|
| `env` for `CLOUDFLARE_*` / `CF_*` / any API token | none |
| `~/.wrangler`, `~/.config/.wrangler`, `~/.config/wrangler` | present but **no `config.toml`** — no OAuth token |
| `npx wrangler whoami` | "You are not authenticated" |
| `.dev.vars`, `*.toml` with credentials anywhere on disk | none |
| Agent proxy (`$HTTPS_PROXY/__agentproxy/status`) | no credential relay for Cloudflare |
| GitHub Actions secrets/variables API | **blocked by the proxy** — "Access to this GitHub Actions path is not permitted" |
| `.github/workflows/` | empty — no deploy pipeline to trigger |

### The Cloudflare MCP — all 23 tools, enumerated

`mcp__*__{d1_database_create, d1_database_delete, d1_database_get,
d1_database_query, d1_databases_list, hyperdrive_config_delete,
hyperdrive_config_edit, hyperdrive_config_get, hyperdrive_configs_list,
kv_namespace_create, kv_namespace_delete, kv_namespace_get,
kv_namespace_update, kv_namespaces_list, migrate_pages_to_workers_guide,
r2_bucket_create, r2_bucket_delete, r2_bucket_get, r2_buckets_list,
search_cloudflare_documentation, workers_get_worker, workers_get_worker_code,
workers_list}`

**What this MCP CAN do:** create/delete KV namespaces, D1 databases (including
arbitrary SQL via `d1_database_query`), R2 buckets, Hyperdrive configs. Read
Worker metadata and source.

**What it CANNOT do:** deploy or update a Worker. Set a secret. There is no
`workers_put`, no `secret_put`, no upload tool. The Workers tools are
**read-only**.

**Note the asymmetry:** the MCP is authenticated to the account — `workers_list`
works. Account access is not the missing piece. *Code deployment* is.

### Conclusion

**Deploying a Worker requires Ciro.** Every other Cloudflare operation —
creating namespaces, databases, buckets, running SQL — you do yourself. Never
ask him for those.

Note the MCP server flaps between two naming schemes
(`mcp__Cloudflare_Developer_Platform__*` and a UUID prefix) and disconnects
often. If it appears absent, **ToolSearch again before concluding anything** —
a disconnect is not the same as a missing capability.

---

## Was there another way to host the board? Checked.

- **Artifact runtime capabilities** (`artifact`, `downloads`, `mcp`, `self`)
  persist shared state across viewers, so a published Artifact *can* be a live
  board for humans. But writes originate from a browser viewer, not an HTTP
  POST, and there is no public unauthenticated read URL — so it cannot be the
  machine-readable endpoint the AI seats need. Good for display, not for the API.
- **GitHub Actions as a deploy runner** — proxy blocks the Actions API and no
  workflow exists. Dead end.

If a future session finds a Worker-deploy path that actually works, **update this
file** rather than leaving the next session to rediscover it.

---

## Repo facts worth not rediscovering

- Remix + Cloudflare Workers. Worker name in `wrangler.json` is still the
  template's `rental-1`.
- `BOARD` KV binding points at the **same namespace id** as `TO_DO_LIST`
  (`36361a26…`), separated by a `board:` key prefix. Deliberate — it avoids
  needing a new namespace. Splitting it later is a two-line change.
- `npm run lint` is **broken repo-wide and was already broken**: ESLint 9 wants
  `eslint.config.js`, the repo has `.eslintrc.js`. Not caused by the ops work.
  Don't report it as a regression.
- `npm run build` runs `scripts/sync-office.mjs` first, copying `ops/*.html` into
  `public/`. Those copies are generated and gitignored — edit `ops/`, never
  `public/`.
- Verify Workers changes with `npx wrangler dev --local --var KEY:value` and real
  curls. It runs fine without authentication. **A passing test suite is not
  evidence that an endpoint serves.**
- `.board-keys.txt` holds the master token and the ten per-seat keys. Gitignored,
  mode 600. Never commit it, never print the master token into chat.

## What "one command" actually means

A command is not one command until it runs **from a fresh terminal in the home
directory**. Ciro works on a Mac and opens a shell in `~`. A snippet that
assumes a working directory, a cloned repo, an installed dependency, or a
checked-out branch is a multi-step task wearing a disguise, and it will fail on
the first line.

Before handing over any command: does it work from `~`, on a machine that may
not have the repo at all? If not, it is not finished — wrap the `cd`, the clone,
the branch checkout, and the install into the same paste.

## Working agreements

- Deliver, then report. Don't narrate a plan and stop.
- Evidence over assertion: a URL, a curl output, a screenshot, a commit hash.
  This is the standard the ops system holds the AI seats to; hold yourself to it.
- Say the uncomfortable thing once, plainly, then do the work.
