# CLAUDE Reference Documentation

Extended documentation for AI assistants. This file is NOT loaded automatically — read it on demand when you need walkthroughs, templates, or detailed reference material.

## KV Data Schema

Each todo list is stored as a single KV entry. Key = nanoid from URL. Value = JSON array:

```json
[
  {
    "id": "crypto.randomUUID() output",
    "text": "Buy groceries",
    "completed": false,
    "createdAt": 1719200000000
  }
]
```

- `id`: UUID v4 via `crypto.randomUUID()`
- `text`: User-provided string
- `completed`: Boolean, toggled by the toggle action
- `createdAt`: Unix timestamp ms (`Date.now()`)
- 300-second TTL set on every write. Full array replaced on every operation.

## KV Key Naming Conventions

Currently keys are raw nanoids with no prefix. If adding new data types to the same namespace, use prefixes (`todo:`, `user:`, `meta:`) or separate KV namespaces.

## Walkthrough: Adding a New Route

Example: `/about` page.

**1. Create `app/routes/about.tsx`:**
```tsx
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [{ title: "About — Todo List" }];
};

export default function About() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">About</h1>
        <p className="text-gray-600 dark:text-gray-300">
          A simple todo list that expires after 5 minutes.
        </p>
      </div>
    </div>
  );
}
```

**2. Verify:** `npm run lint && npm run typecheck`

Remix discovers routes from the filesystem — no registration needed.

## Walkthrough: Adding a New TodoManager Feature

Example: "edit todo text" end-to-end.

**1. Method in `app/to-do-manager.ts`:**
```ts
async edit(id: string, newText: string): Promise<Todo> {
  const todos = await this.list();
  const todoIndex = todos.findIndex((todo) => todo.id === id);
  if (todoIndex === -1) throw new Error(`Todo with id ${id} not found`);
  todos[todoIndex].text = newText;
  await this.kv.put(this.todosKey, JSON.stringify(todos), { expirationTtl: 300 });
  return todos[todoIndex];
}
```

**2. Test in `test/to-do-manager.test.ts`:**
```ts
describe("edit()", () => {
  it("updates todo text", async () => {
    const todo = await manager.create("Original");
    const edited = await manager.edit(todo.id, "Updated");
    expect(edited.text).toBe("Updated");
  });
});
```

**3. Action case in `app/routes/$id.tsx`:**
```ts
case "edit": {
  const id = formData.get("id");
  const text = formData.get("text");
  if (typeof id !== "string" || typeof text !== "string" || !text)
    return Response.json({ error: "Invalid input" }, { status: 400 });
  await todoManager.edit(id, text);
  return { success: true };
}
```

**4. UI form:**
```tsx
<Form method="post">
  <input type="hidden" name="id" value={todo.id} />
  <input type="text" name="text" defaultValue={todo.text} />
  <button type="submit" name="intent" value="edit">Save</button>
</Form>
```

**5. Verify:** `npm run lint && npm run typecheck && npx vitest run test/to-do-manager.test.ts`

## Code Templates

### Form Data Validation Helper

```ts
function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw Response.json({ error: `Missing ${key}` }, { status: 400 });
  }
  return value.trim();
}
```

### ErrorBoundary

```tsx
import { useRouteError, isRouteErrorResponse } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{error.status}</h1>
          <p className="text-gray-600 dark:text-gray-400">{error.statusText}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Something went wrong</h1>
        <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page.</p>
      </div>
    </div>
  );
}
```

### Optimistic UI with useFetcher

```tsx
import { useFetcher } from "@remix-run/react";

function TodoItem({ todo }: { todo: Todo }) {
  const fetcher = useFetcher();
  const isToggling = fetcher.state !== "idle";
  const optimisticCompleted = isToggling ? !todo.completed : todo.completed;

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="id" value={todo.id} />
      <button
        type="submit"
        name="intent"
        value="toggle"
        disabled={isToggling}
        className={optimisticCompleted ? "line-through text-gray-400" : ""}
      >
        {todo.text}
      </button>
    </fetcher.Form>
  );
}
```

## Route Testing Patterns

**Loader test:**
```ts
import { loader } from "../app/routes/$id";

it("returns todos for a given list ID", async () => {
  await env.TO_DO_LIST.put("test-list", JSON.stringify([
    { id: "1", text: "Test", completed: false, createdAt: Date.now() }
  ]), { expirationTtl: 300 });

  const response = await loader({
    params: { id: "test-list" },
    context: { cloudflare: { env } },
    request: new Request("http://localhost/test-list"),
  } as any);

  expect(response.todos).toHaveLength(1);
});
```

**Action test:**
```ts
import { action } from "../app/routes/$id";

it("creates a todo via action", async () => {
  const formData = new FormData();
  formData.set("intent", "create");
  formData.set("text", "New todo");

  await action({
    params: { id: "test-list" },
    context: { cloudflare: { env } },
    request: new Request("http://localhost/test-list", { method: "POST", body: formData }),
  } as any);

  const stored = await env.TO_DO_LIST.get("test-list", "json");
  expect(stored).toHaveLength(1);
});
```

## Accessibility Notes

Current gaps: no `aria-label` on toggle buttons, no delete confirmation, no visible focus indicators, no `aria-live` region, no `<label>` on input.

Guidelines: add `aria-label` to ambiguous buttons, use semantic HTML, add `focus:ring-2 focus:ring-blue-500`, pair inputs with labels (use `sr-only` if visually hidden).

## Dark Mode Testing Checklist

1. Chrome DevTools → Rendering → Emulate `prefers-color-scheme` → toggle light/dark
2. Verify `bg-*`/`dark:bg-*`, `text-*`/`dark:text-*`, `border-*`/`dark:border-*` pairs
3. Check hover/focus states visible in both themes
4. Check shadow visibility against dark backgrounds
5. Test body styles in `app/tailwind.css`

## Dependency Upgrade Guide

**Remix** — all `@remix-run/*` packages must match versions. After upgrading, check for new future flags.

**Wrangler** — run `cf-typegen` after upgrading. Check compatibility date changes.

**Vitest + Cloudflare pool** — must be compatible versions. Run tests immediately after upgrading.

**Tailwind** — v4 is a major rewrite. Stay on v3 unless ready for CSS-first config migration.

Always run `npm run lint && npm run typecheck && npm run test` after upgrades.

## CI/CD Recommendations

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --run
      - run: npm run build
```

## Deployment Checklist

Before: `lint` → `typecheck` → `test` → `build` → verify KV namespace ID

Deploy: `npm run deploy`

After: visit URL, create/toggle/delete a todo, wait 5min for expiry, check `wrangler tail`

## Performance & Bundle

- Worker CPU: 10ms free, 30ms paid (KV I/O doesn't count)
- KV reads: ~10-50ms. Writes: acknowledged fast, propagate in ~60s
- Bundle limit: 1MB free, 10MB paid. Remix+React is ~200-400KB compressed
- Inspect: `npx wrangler deploy --dry-run --outdir dist`

## Local Dev vs Production

| Aspect | Local | Production |
|---|---|---|
| KV | miniflare (in-memory) | Cloudflare KV (distributed) |
| Consistency | Immediate | Eventually consistent (~60s) |
| `request.cf` | May be undefined | Real geo/connection data |
| HTTPS | HTTP | HTTPS via Cloudflare |

## Cloudflare Runtime APIs

- `request.cf` — geo/connection info (may be undefined in dev)
- `context.cloudflare.ctx.waitUntil()` — background work after response
- `context.cloudflare.caches` — Cache API (`caches.default` is CF-specific)
- `crypto.randomUUID()` / `crypto.subtle` — available globally
- `navigator.userAgent` — NOT available; use `request.headers.get("user-agent")`

## Wrangler Compatibility Date

Currently `"2024-11-01"`. Bump to access newer runtime features. Test locally after bumping. `vitest.config.ts` reads this from `wrangler.json` automatically.

## KV Namespace Management

Current: single namespace for all environments. Add `preview_id` in `wrangler.json` for dev isolation, or use wrangler environments (`--env staging`) for full separation. Run `cf-typegen` after changes.

## Observability

`"observability": { "enabled": true }` in `wrangler.json` enables Workers Analytics, log collection, and per-request tracing in the Cloudflare dashboard. Use `ctx.waitUntil` for custom analytics without blocking the response.

## Environment Variables & Secrets

- `.dev.vars` — local secrets (gitignored)
- `wrangler secret put NAME` — production secrets
- `.env` — Vite client-side vars (prefix `VITE_`)
- KV/D1/R2 are bindings in `wrangler.json`, not env vars

## Key Dependencies

| Package | Purpose |
|---|---|
| `@remix-run/cloudflare` | Remix server runtime for Workers |
| `@remix-run/react` | Client components (`Form`, `useLoaderData`) |
| `nanoid` | URL-safe unique IDs (21 chars) |
| `isbot` | Bot detection for SSR |
| `vite-tsconfig-paths` | `~/` path alias resolution |
| `@cloudflare/vitest-pool-workers` | Miniflare test environment |
| `wrangler` | CF Workers CLI |

## Quick Reference Links

- [Cloudflare KV](https://developers.cloudflare.com/kv/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Remix v2 Docs](https://remix.run/docs/en/main)
- [Remix Flat File Routing](https://remix.run/docs/en/main/file-conventions/routes)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev/)
- [Cloudflare Vitest Pool](https://developers.cloudflare.com/workers/testing/vitest-integration/)
