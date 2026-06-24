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
server.ts              # Cloudflare Worker entry point
load-context.ts        # Wrangler → Remix load context bridge
wrangler.json          # Cloudflare Workers config (KV bindings, compatibility flags)
vite.config.ts         # Vite + Remix + Cloudflare dev proxy config
vitest.config.ts       # Test config (Cloudflare vitest pool)
app/
  root.tsx             # Root layout (HTML shell, Tailwind CSS, Google Fonts)
  tailwind.css         # Tailwind directives + dark mode base styles
  entry.client.tsx     # Client hydration entry
  entry.server.tsx     # SSR streaming entry (bot detection, abort timeout)
  to-do-manager.ts     # Core business logic — TodoManager class (KV CRUD)
  routes/
    _index.tsx         # Redirects to /<nanoid> (generates unique list URL)
    $id.tsx            # Main UI — loader/action for create/toggle/delete
test/
  env.ts               # Type declarations for cloudflare:test module
  to-do-manager.test.ts # Unit tests for TodoManager
```

## Request Data Flow

```
HTTP Request → server.ts → load-context.ts → routes/$id.tsx → TodoManager → KV
```

All KV access goes through `TodoManager`. Route handlers should never call `kv.get`/`kv.put` directly.

## Commands

```bash
npm run dev        # Start dev server with Cloudflare dev proxy
npm run build      # Build for production
npm run test       # Run vitest (Cloudflare Workers pool)
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking (tsc --noEmit)
npm run deploy     # Build + wrangler deploy
npm run cf-typegen # Regenerate worker-configuration.d.ts from wrangler.json
```

Single test: `npx vitest run test/to-do-manager.test.ts`

Pre-push check: `npm run lint && npm run typecheck && npm run test`

## Code Style

- Use `satisfies` over `as` casts where possible
- Use Remix `<Form>` for mutations — never raw `fetch`
- Route files use default exports; non-route files use named exports
- Path alias `~/` maps to `./app/`
- ESM throughout (`"type": "module"`)
- File names: kebab-case (`to-do-manager.ts`, not `todoManager.ts`)
- All styling inline via `className` — no `@apply`

## The Intent Pattern

`$id.tsx` multiplexes all mutations through a single `action` using an `intent` form field. When adding new mutations, add a new `case` to the existing switch — do not create a separate route or API endpoint.

## Type Generation

`wrangler.json` → `npm run cf-typegen` → `worker-configuration.d.ts` → `Env` interface (global, no import needed). If you change bindings in `wrangler.json` and skip `cf-typegen`, `tsc` will fail.

## Tailwind Conventions

- **Colors**: `gray-100`/`gray-800` light, `gray-900`/`white` dark. `blue-500`/`blue-600` primary, `red-500`/`red-700` destructive
- **Dark mode**: Every color class needs a `dark:` counterpart. Driven by `prefers-color-scheme`
- **Layout**: `min-h-screen`, `max-w-md mx-auto`, `flex`, `gap-2`
- **Components**: `rounded-lg`, `shadow`/`shadow-sm`
- Always provide `hover:` states on buttons

## Testing

- Tests run in Cloudflare's Vitest worker pool (miniflare) with real KV bindings
- Test files: `test/**/*.test.ts`
- Import test env via `import { env } from "cloudflare:test"` (virtual module, not npm)
- Currently only `TodoManager` is tested — loaders/actions in `$id.tsx` are untested

## Gotchas

- **KV TTL resets on writes, not reads.** Only create/toggle/delete extend the 300s lifetime
- **`worker-configuration.d.ts` is generated.** Never edit manually — run `cf-typegen`
- **`Env` interface is global.** Don't redeclare it
- **`build/` must exist for `npm run start`.** Use `npm run preview` which builds automatically
- **KV is eventually consistent.** Writes take up to 60s to propagate globally (miniflare is immediate)
- **Single KV value per list.** Full array read/written on every operation

## Do Not

- Don't edit `worker-configuration.d.ts` directly
- Don't add API routes for mutations — use the intent pattern in `$id.tsx`
- Don't import from `test/` in app code
- Don't use `as` casts for form data — validate with type guards
- Don't add default exports to non-route files
- Don't store values >25MB in KV

## Known Technical Debt

- `as string` casts in toggle/delete actions (`$id.tsx:35,41`) — should validate
- No `ErrorBoundary` in `$id.tsx` or `root.tsx`
- No loading/pending UI — should use `useFetcher()` for optimistic updates
- No empty state when list has no todos
- `toggle()` throws on missing ID (race condition → 500)
- No input length limit on todo text

## Security Notes

- No authentication — lists secured only by nanoid URL unpredictability
- No rate limiting
- React escapes text by default (XSS safe) — don't use `dangerouslySetInnerHTML`
- CSRF: Remix `<Form>` is same-origin by default

## Common Patterns

Adding new Cloudflare bindings:
1. Add binding to `wrangler.json`
2. Run `npm run cf-typegen`
3. Access via `context.cloudflare.env.<BINDING_NAME>`

Adding new mutations:
1. Add `case` to the `switch (intent)` in the route's `action`
2. Add `TodoManager` method if needed
3. Add `<Form>` with `name="intent" value="your_intent"`

Adding new routes:
- Place in `app/routes/` (Remix flat-file routing discovers automatically)
- `loader` for GET, `action` for POST

## Commit Conventions

- Imperative mood: "Add due date field", not "Added due dates"
- Branch naming: `feature/<desc>`, `fix/<desc>`
- Run lint + typecheck + test before pushing

## Remix v3 Migration

All v3 future flags are enabled in `vite.config.ts`: `v3_fetcherPersist`, `v3_relativeSplatPath`, `v3_throwAbortReason`, `v3_singleFetch`, `v3_lazyRouteDiscovery`. When upgrading to v3, remove these flags.

## Further Reference

See `docs/CLAUDE-reference.md` for extended documentation: walkthroughs, code templates, dependency upgrade guide, CI/CD setup, deployment checklist, performance characteristics, debugging tips, and more.
