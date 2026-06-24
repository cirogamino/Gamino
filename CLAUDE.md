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

## Architecture Notes

- **Routing**: The index route (`_index.tsx`) immediately redirects to `/<nanoid>`, giving each visitor a unique todo list. The `$id.tsx` dynamic route is the actual app.
- **Data layer**: `TodoManager` class encapsulates all KV interactions. It stores the full todo array as a single JSON value under the route's `id` param as the KV key. All writes set a 300-second TTL.
- **Bindings**: The `Env` interface (in `worker-configuration.d.ts`) declares KV bindings. Regenerate with `npm run cf-typegen` after changing `wrangler.json`.
- **Load context**: `load-context.ts` bridges Wrangler's `PlatformProxy` to Remix's `AppLoadContext`, making `context.cloudflare.env.TO_DO_LIST` available in loaders/actions.
- **SSR**: `entry.server.tsx` uses streaming `renderToReadableStream` with a 5-second abort timeout and bot-aware rendering (waits for full body for bots).

## Key Conventions

- **Path alias**: `~/` maps to `./app/` (configured in tsconfig paths and vite-tsconfig-paths plugin).
- **Form actions**: The `$id.tsx` route uses Remix `<Form>` with an `intent` field to multiplex create/toggle/delete actions in a single action handler.
- **Dark mode**: Supported via Tailwind's `dark:` variant (system preference via `prefers-color-scheme`).
- **ESLint**: Uses `@typescript-eslint`, React, JSX-a11y, and import plugins. The `cloudflare:test` import is excluded from unresolved-import checks.
- **Testing**: Tests run in Cloudflare's Vitest worker pool (miniflare), which provides real KV bindings. Test files go in `test/` and must match `test/**/*.test.ts`.
- **Module format**: ESM (`"type": "module"` in package.json).

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
