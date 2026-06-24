# CLAUDE.md

## Project Overview

A to-do list web application built with **Remix** on **Cloudflare Workers**, using **Cloudflare KV** for persistence. Each visitor gets a unique list URL (via nanoid). Todos expire after 5 minutes (KV TTL).

## Tech Stack

- **Framework**: Remix v2.15 (Vite plugin, v3 future flags enabled)
- **Runtime**: Cloudflare Workers (wrangler v3)
- **Storage**: Cloudflare Workers KV (binding: `TO_DO_LIST`)
- **Language**: TypeScript 5.7 (strict mode)
- **Styling**: Tailwind CSS 3.4 + Inter font (Google Fonts)
- **Testing**: Vitest 2.1 with `@cloudflare/vitest-pool-workers`
- **Node**: >=20.0.0

## Project Structure

```
server.ts              # Cloudflare Worker entry point (creates Remix request handler)
load-context.ts        # Wrangler → Remix load context bridge (exposes cloudflare bindings)
wrangler.json          # Cloudflare Workers config (KV bindings, compatibility flags)
vite.config.ts         # Vite + Remix + Cloudflare dev proxy config
vitest.config.ts       # Test config (Cloudflare vitest pool, KV namespace binding)
app/
  root.tsx             # Root layout (HTML shell, Tailwind CSS, Google Fonts)
  tailwind.css         # Tailwind directives + dark mode base styles
  entry.client.tsx     # Client hydration entry
  entry.server.tsx     # SSR streaming entry (bot detection, abort timeout)
  to-do-manager.ts     # Core business logic — TodoManager class (KV CRUD operations)
  routes/
    _index.tsx         # Redirects to /<nanoid> (generates unique list URL)
    $id.tsx            # Main UI — loader reads todos, action handles create/toggle/delete
test/
  env.ts               # Type declarations for cloudflare:test module
  to-do-manager.test.ts # Unit tests for TodoManager
public/
  .assetsignore        # Cloudflare assets ignore file
```

## Request Data Flow

```
HTTP Request
  → Cloudflare Worker (server.ts)
    → getLoadContext (load-context.ts) — attaches cloudflare bindings
      → Remix loader/action (app/routes/$id.tsx)
        → TodoManager (app/to-do-manager.ts) — CRUD operations
          → Cloudflare KV (TO_DO_LIST binding)
```

All KV access goes through `TodoManager`. Route handlers should never call `kv.get`/`kv.put` directly.

## Commands

```bash
npm run dev        # Start Remix dev server with Cloudflare dev proxy
npm run build      # Build for production (remix vite:build)
npm run preview    # Build + run with wrangler locally
npm run start      # Run with wrangler dev (requires prior build)
npm run test       # Run vitest (Cloudflare Workers pool)
npm run lint       # ESLint (cached, respects .gitignore)
npm run typecheck  # TypeScript type checking (tsc --noEmit)
npm run deploy     # Build + wrangler deploy to Cloudflare
npm run cf-typegen # Generate worker-configuration.d.ts from wrangler.json
```

### Running a Single Test File

```bash
npx vitest run test/to-do-manager.test.ts
```

### Fixing Lint / Typecheck Failures

- **`import/no-unresolved` on `cloudflare:test`**: This is already suppressed in `.eslintrc.js`. If you add other Cloudflare virtual imports (e.g., `cloudflare:sockets`), add them to the ignore list in the same rule.
- **Type errors after changing `wrangler.json` bindings**: Run `npm run cf-typegen` to regenerate `worker-configuration.d.ts`, then re-run `npm run typecheck`.
- **React hook warnings**: Ensure hooks are only called at the top level of components or custom hooks, not inside callbacks or conditions.

## Architecture Notes

- **Routing**: The index route (`_index.tsx`) immediately redirects to `/<nanoid>`, giving each visitor a unique todo list. The `$id.tsx` dynamic route is the actual app.
- **Data layer**: `TodoManager` class encapsulates all KV interactions. It stores the full todo array as a single JSON value under the route's `id` param as the KV key. All writes set a 300-second TTL.
- **Bindings**: The `Env` interface (in `worker-configuration.d.ts`) declares KV bindings. Regenerate with `npm run cf-typegen` after changing `wrangler.json`.
- **Load context**: `load-context.ts` bridges Wrangler's `PlatformProxy` to Remix's `AppLoadContext`, making `context.cloudflare.env.TO_DO_LIST` available in loaders/actions.
- **SSR**: `entry.server.tsx` uses streaming `renderToReadableStream` with a 5-second abort timeout and bot-aware rendering (waits for full body for bots).

## Type Generation Dependency Chain

`wrangler.json` is the source of truth for all Cloudflare bindings. When bindings change:

1. Edit `wrangler.json` (add/remove/rename bindings)
2. Run `npm run cf-typegen` — this regenerates `worker-configuration.d.ts`
3. The `Env` interface in `worker-configuration.d.ts` is consumed globally (no import needed)
4. Loaders/actions access bindings via `context.cloudflare.env.<BINDING_NAME>`

If you skip step 2, TypeScript will not know about new bindings and `tsc` will fail.

## Key Conventions

### Code Style

- Use `satisfies` for type narrowing over `as` casts where possible.
- Use Remix `<Form>` for mutations — never raw `fetch` for form submissions.
- Route files (`app/routes/`) use default exports for components. Non-route files should use named exports.
- Path alias `~/` maps to `./app/` (configured in tsconfig paths and vite-tsconfig-paths plugin).
- ESM throughout (`"type": "module"` in package.json).

### The Intent Pattern

The `$id.tsx` route multiplexes all mutations through a single `action` using an `intent` form field:

```tsx
<button type="submit" name="intent" value="create">
```

The action handler switches on `intent` to dispatch to the correct `TodoManager` method. When adding new mutations, add a new `case` to the existing switch in the action — do not create a separate route or API endpoint.

### Dark Mode

Supported via Tailwind's `dark:` variant (system preference via `prefers-color-scheme`). Always provide both light and dark styles for new UI elements.

### Testing

- Tests run in Cloudflare's Vitest worker pool (miniflare), which provides real KV bindings.
- Test files go in `test/` and must match `test/**/*.test.ts`.
- Business logic tests use `TodoManager` directly against the miniflare KV binding.
- Import test env via `import { env } from "cloudflare:test"` — this is a virtual module, not an npm package.

## Gotchas

- **KV TTL resets on every write, not on reads.** Reading a todo list does not extend its lifetime. Only `create`, `toggle`, and `delete` operations reset the 300s TTL because they call `kv.put`.
- **`worker-configuration.d.ts` is generated.** Never edit it manually — changes will be overwritten by `npm run cf-typegen`.
- **The `Env` interface is global.** It's declared in `worker-configuration.d.ts` and available everywhere without importing. Don't redeclare it.
- **`build/` directory must exist for `npm run start`.** Run `npm run build` first, or use `npm run preview` which builds automatically.
- **KV is eventually consistent.** Writes may take up to 60 seconds to propagate globally. Local dev (miniflare) is immediate.
- **Todo storage is a single KV value per list.** The entire array is read/written on every operation. This is fine for small lists but won't scale past ~1000 items (KV value limit is 25MB).

## Do Not

- **Don't edit `worker-configuration.d.ts` directly** — it's generated by `npm run cf-typegen`.
- **Don't use `node:*` built-in imports** unless the `nodejs_compat` compatibility flag is set in `wrangler.json` (it currently is, but be aware of the dependency).
- **Don't store values >25MB in KV** — that's the Cloudflare KV per-value size limit.
- **Don't add API routes** for mutations — use the Remix `action` + intent pattern in `$id.tsx`.
- **Don't import from `test/` in app code** — the test directory uses `cloudflare:test` bindings that aren't available at runtime.
- **Don't use `as` casts for form data** — validate with type guards instead (the current `as string` casts in the action are a known shortcut).
- **Don't add default exports to non-route files** — only route files (`app/routes/`) should have default exports.

## Environment Setup

1. `npm install`
2. Create a KV namespace: `npx wrangler kv namespace create TO_DO_LIST`
3. Update the `id` field in `wrangler.json` → `kv_namespaces` with the new namespace ID
4. `npm run dev` to start developing

## Common Patterns

When adding new Cloudflare bindings (D1, R2, etc.):
1. Add the binding to `wrangler.json`
2. Run `npm run cf-typegen` to update `worker-configuration.d.ts`
3. Access via `context.cloudflare.env.<BINDING_NAME>` in loaders/actions

When adding new routes:
- Place files in `app/routes/` following Remix v2 flat-file routing conventions
- Use `loader` for data fetching (GET) and `action` for mutations (POST)
- Access KV through `context.cloudflare.env.TO_DO_LIST`

When adding new mutations to an existing route:
1. Add a new `case` to the `switch (intent)` block in the route's `action`
2. Add the corresponding `TodoManager` method if needed
3. Add a `<Form>` or `useFetcher` in the component with `name="intent" value="your_intent"`

## Commit & PR Conventions

- Commit messages: imperative mood, concise first line ("Add due date field to todos", not "Added due dates")
- Branch naming: `feature/<description>`, `fix/<description>`
- Keep PRs focused — one feature or fix per PR
- Run `npm run lint && npm run typecheck && npm run test` before pushing

## Remix v3 Migration Status

The following v3 future flags are already enabled in `vite.config.ts`:

- `v3_fetcherPersist` — Fetchers persist until explicitly cleaned up
- `v3_relativeSplatPath` — Relative paths resolve from splat route
- `v3_throwAbortReason` — Aborted requests throw the abort reason
- `v3_singleFetch` — Single fetch for data loading (declared in module augmentation)
- `v3_lazyRouteDiscovery` — Routes discovered lazily on navigation

This means the codebase is already adapted for Remix v3 behavior. When upgrading to Remix v3, remove these flags and update the `@remix-run/*` packages.
