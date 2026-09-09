# Runbook — turning a list of business levers into a system

This documents the process used to implement the 25 operating levers in
`docs/masomenos-construction-plan.md` §16 as working software, so the same
process can be run again on a different list, by a different person.

It is written for the next person, not as a record of what happened. If you are
implementing levers 26-50, or a completely different set, start here.

---

## The core idea

A business lever is a decision someone is supposed to make consistently.
Consistency is exactly what humans are worst at under pressure, which is why
these lists get read, agreed with, and then quietly abandoned in week three.

**So the job is not to write down the lever. It is to move the decision into a
place where skipping it takes effort.**

Three forms that takes, in descending order of reliability:

| Form | What it looks like | Example |
|---|---|---|
| **Enforced** | The system will not proceed without it | Deposit terms (14) — `auditJobStart` fails the job |
| **Computed** | The system produces the number so nobody argues | Hiring trigger (22) — `profitAtHeadcount` |
| **Tracked** | The system knows it is overdue and says so | Comp code audit (21) — `compAuditDue` |

Prefer enforced. Fall back to computed. Use tracked only when the action
genuinely happens outside the software.

---

## Step 1 — Split the list honestly

Before writing any code, sort every item into **code** or **SOP**.

- **Code** — the system can perform or enforce it. Pricing, scheduling,
  invoicing, quoting, page generation.
- **SOP** — the action happens in the real world. Calling a broker, opening a
  distributor account, firing a customer.

This split is the single most important step, and the temptation is to fake it.
Software that claims to "audit your workers' comp class codes" would be a lie —
it cannot phone your broker. What it can honestly do is *know the audit is
overdue* and *price the exposure*, which is what makes the call happen.

**Rule: if you cannot name the function that performs the lever, it is an SOP.**
Write the SOP document instead, and build the tracking around it.

In this project: 24 of 25 came out as code, 1 as SOP (lever 21, workers' comp
class codes → `docs/sop/comp-code-audit.md`).

## Step 2 — Build the manifest before the implementation

Create `app/ops/levers.json` **first**, listing every lever with:

```json
{
  "id": 21,
  "slug": "comp-code-audit",
  "group": "cost",
  "title": "Audit workers' comp class codes",
  "impact": "Misclassification quietly costs thousands a year.",
  "kind": "sop",
  "files": ["app/ops/cost.ts", "docs/sop/comp-code-audit.md"],
  "tests": ["test/cost.test.ts"]
}
```

Naming the files up front forces you to decide the architecture before you are
tired, and it makes the progress log possible.

## Step 3 — Generate the log, never hand-write it

`scripts/build-log.mjs` reads the manifest, checks whether each lever's files
exist, and writes `BUILD-LOG.md` from **real filesystem mtimes**.

```bash
npm run build-log         # regenerate
npm run build-log:check   # exit 1 while any lever is PENDING — CI-friendly
```

Hand-typed timestamps are guesses and everyone knows it. Generated ones can be
cross-checked against git:

```bash
git log --format='%h %aI %s' -- app/ops
```

The timestamp model is stated inside the log itself so a reader can audit it:
finish is the newest mtime across the lever's files; start is the previous
lever's finish, floored at build start. Levers sharing a file legitimately show
0s — they were built together, and the log says so rather than inventing
separate windows.

## Step 4 — Work in waves, commit every wave

Group levers that share a file. Build the module, write its tests, run them,
regenerate the log, commit. One commit per wave.

The waves used here:

| Wave | Levers | Modules |
|---|---|---|
| 1 | 1-7, 11 | `money.ts`, `pricing.ts`, `quote.ts`, `plans.ts` |
| 2 | 8-10, 12-13, 18 | `sales.ts`, `intake.ts` |
| 3 | 14-19 | `cash.ts`, `schedule.ts`, `inventory.ts` |
| 4 | 20-23 | `cost.ts` + the SOP doc |
| 5 | 24-25 | `sites.ts`, `media.ts` |

Committing per wave means **the commit history is the progress feed**. Anyone
watching the PR sees the count climb without being sent a status update.

## Step 5 — Test the business rule, not the function

The test names are the specification. Compare:

```ts
// Weak — tests that code runs
it("returns a number", () => { ... });

// Strong — tests that the lever holds
it("takes half on a materials-heavy job so you are not funding the equipment", ...)
it("fails twenty afters with no befores — counting alone proves nothing", ...)
it("catches the across-town booking that looks harmless", ...)
```

Every lever needs at least one test that would **fail if someone quietly removed
the lever**. That is the whole point — it is the regression test on the
discipline, not on the arithmetic.

Also test the edges that appear in real operations: empty collections, zero
revenue, a customer with no history, a van with no count recorded. Division by
zero in a margin calculation is how a dashboard silently starts lying.

## Step 6 — Anchor the numbers to the source document

Where the plan makes a claim, make it computable and test it against the plan:

```ts
it("reproduces the plan's arithmetic: tech #1 nets about $333/mo", () => {
  expect(toDollars(profitAtHeadcount(1))).toBeCloseTo(333, 0);
});

it("computes the working capital the plan claims: 30 to 3 days on $60k/mo", () => {
  expect(toDollars(workingCapitalFreed(dollars(60000), 30, 3))).toBe(54000);
});
```

If the plan and the code disagree, one of them is wrong and you have found it
before it cost anything.

---

## Conventions this codebase holds

**Money is integer cents.** Never floats. A tenth-of-a-cent drift per line item
becomes a real discrepancy across a year of invoices, and an invoice that does
not foot destroys more trust than a high price does. `app/ops/money.ts`.

**Policies are data, and validated.** `DEFAULT_POLICY` ships the levers on;
`validatePolicy` refuses a configuration that gives them away (materials markup
below 30%, a minimum under two hours). A lever you can turn off by accident is
not implemented.

**Audit functions return issues, they do not throw.** Every `audit*` returns
`string[]`. Real operations need to see all the problems at once, on a
dashboard, not the first one as an exception.

**Unknown input is reported, not assumed.** An unrecognised task code produces a
warning rather than a zero. An unreported SKU counts as zero on hand rather than
assumed stocked. Silent defaults are how a system starts lying.

**Every module opens with why the lever exists**, not what the code does. The
code says what it does. The comment carries the reasoning that would otherwise
be lost the first time someone "simplifies" it.

---

## Re-running this process

```bash
git clone <repo> && cd <repo>
npm install

# 1. Edit app/ops/levers.json — add your levers, mark each code or sop
# 2. node scripts/build-log.mjs        → everything reads PENDING
# 3. Build a wave, write its tests
npx vitest run test/<your>.test.ts
# 4. node scripts/build-log.mjs && git commit
# 5. Repeat until:
npm run build-log:check                # exits 0 when all levers are built

npx vitest run && npx tsc --noEmit     # full suite + typecheck before the final push
```

## Where things live

| Path | What |
|---|---|
| `app/ops/levers.json` | Source of truth for the lever list |
| `app/ops/*.ts` | One module per domain, several levers each |
| `test/*.test.ts` | One suite per module; test names are the spec |
| `scripts/build-log.mjs` | Generates `BUILD-LOG.md` from mtimes |
| `BUILD-LOG.md` | Generated. Do not hand-edit |
| `docs/sop/*.md` | Procedures for levers software cannot perform |
| `docs/masomenos-construction-plan.md` | The source document these levers come from |

## What is deliberately not here

- **No database.** These are pure functions over plain data so they can be
  tested, reasoned about, and wired to whatever storage comes later.
- **No UI.** The rules exist and are enforced; screens are a separate concern
  and a separate decision.
- **No integrations.** Payment, calendar and messaging providers are choices the
  owner should make against real pricing, not choices baked in at 4am.

Each of those is a real gap, listed here so nobody mistakes this for a finished
product. What is finished is the layer that encodes the decisions — which is the
part that would otherwise be lost.
