/**
 * The money page — every service that can run out and stop the business,
 * on one screen, with the refill link next to each one.
 *
 * Phase 1: manual entry only. No credentials, no vendor APIs, useful today.
 * Later phases swap `collector` on a vendor from manual to email or api and
 * nothing on this page changes.
 */

import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import { MoneyStore, type VendorState } from "~/money/store";
import { VENDORS, VENDORS_BY_ID, formatAmount } from "~/money/vendors";
import { BalanceChart, Sparkline } from "~/money/BalanceChart";

export const meta: MetaFunction = () => [{ title: "Money — Gamino" }];

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const db = context.cloudflare.env.MONEY_DB;
  if (!db) {
    return { configured: false as const };
  }

  const store = new MoneyStore(db);
  try {
    const [states, refills] = await Promise.all([
      store.vendorStates(30),
      store.recentRefills(15),
    ]);
    return { configured: true as const, states, refills };
  } catch (error) {
    // The binding exists but the schema does not — show the setup steps
    // rather than a stack trace.
    if (String(error).includes("no such table")) {
      return { configured: false as const };
    }
    throw error;
  }
};

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.MONEY_DB;
  if (!db) {
    return Response.json({ error: "MONEY_DB is not bound" }, { status: 500 });
  }

  const store = new MoneyStore(db);
  const form = await request.formData();
  const intent = form.get("intent");
  const vendorId = String(form.get("vendorId") ?? "");

  if (!VENDORS_BY_ID[vendorId]) {
    return Response.json({ error: "Unknown vendor" }, { status: 400 });
  }

  const amount = Number(form.get("amount"));
  if (!Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const note = form.get("note");
  const noteText = typeof note === "string" && note ? note : undefined;

  switch (intent) {
    case "reading":
      await store.recordReading(vendorId, amount, "manual", noteText);
      return { ok: true };

    case "refill":
      // A refill is both a payment and a new balance, so log the payment and
      // let the balance come from the reading the user records alongside it.
      await store.recordRefill(vendorId, amount, "manual", noteText);
      return { ok: true };

    default:
      return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
}

const STATUS_LABEL: Record<VendorState["status"], string> = {
  unknown: "No data",
  healthy: "OK",
  low: "Low",
  critical: "Critical",
};

const STATUS_STYLE: Record<VendorState["status"], string> = {
  unknown: "text-[var(--ink-muted)]",
  healthy: "text-[var(--status-good)]",
  low: "text-[var(--status-warning-ink)]",
  critical: "text-[var(--status-critical)]",
};

export default function MoneyPage() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  if (!data.configured) {
    return (
      <Shell>
        <div className="rounded-lg border border-[var(--chart-border)] p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--ink-primary)]">
            Database not bound
          </h2>
          <p className="mb-4 text-sm text-[var(--ink-secondary)]">
            The page is deployed but <code>MONEY_DB</code> is missing. Create the
            D1 database and apply the migration:
          </p>
          <pre className="overflow-x-auto rounded-md bg-[var(--chart-grid)] p-3 text-xs text-[var(--ink-primary)]">
            {`npx wrangler d1 create gamino-money
# put the returned id into wrangler.json
npx wrangler d1 execute gamino-money --remote --file=./migrations/0001_money.sql`}
          </pre>
        </div>
      </Shell>
    );
  }

  const { states, refills } = data;
  const tracked = states.filter((s) => s.balance !== null);

  // The headline number is the worst runway across everything, because that
  // is the one that stops the business first.
  const withRunway = tracked.filter((s) => s.runwayDays !== null);
  const worst = withRunway.length
    ? withRunway.reduce((a, b) => (a.runwayDays! < b.runwayDays! ? a : b))
    : null;

  const chartSeries = states
    .filter((s) => s.history.length >= 2)
    .map((s) => ({
      vendorId: s.vendor.id,
      name: s.vendor.name,
      points: s.history,
    }));

  return (
    <Shell>
      <section className="mb-8 rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-6">
        <div className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
          Shortest runway
        </div>
        {worst ? (
          <>
            <div className="mt-1 text-4xl font-semibold text-[var(--ink-primary)]">
              {worst.runwayDays! < 1
                ? "Under a day"
                : `${worst.runwayDays!.toFixed(1)} days`}
            </div>
            <div className="mt-1 text-sm text-[var(--ink-secondary)]">
              {worst.vendor.name} runs dry first at the current burn.
            </div>
          </>
        ) : (
          <>
            <div className="mt-1 text-4xl font-semibold text-[var(--ink-primary)]">
              —
            </div>
            <div className="mt-1 text-sm text-[var(--ink-secondary)]">
              Record a balance twice for any vendor and runway appears here.
            </div>
          </>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
          Trend
        </h2>
        <div className="rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-4">
          <BalanceChart series={chartSeries} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
          Accounts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((s) => (
            <article
              key={s.vendor.id}
              className="rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate font-medium text-[var(--ink-primary)]">
                  {s.vendor.name}
                </h3>
                <span className={`text-xs ${STATUS_STYLE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>

              <div
                className="mt-2 text-2xl text-[var(--ink-primary)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {s.balance === null
                  ? "—"
                  : formatAmount(s.balance, s.vendor.unit)}
              </div>

              <div className="mt-1 text-xs text-[var(--ink-muted)]">
                {s.burnPerDay === null
                  ? "Burn unknown"
                  : `${formatAmount(s.burnPerDay, s.vendor.unit)} / day`}
              </div>

              <div className="mt-3">
                <Sparkline points={s.history} status={s.status} />
              </div>

              <div className="mt-3 flex items-center gap-2">
                {s.vendor.refillUrl ? (
                  <a
                    href={s.vendor.refillUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[var(--chart-border)] px-3 py-1.5 text-xs text-[var(--ink-primary)] hover:bg-[var(--chart-grid)]"
                  >
                    Refill →
                  </a>
                ) : (
                  <span className="text-xs text-[var(--ink-muted)]">
                    No refill URL yet
                  </span>
                )}
                <span className="ml-auto text-xs text-[var(--ink-muted)]">
                  {s.vendor.collector}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
            Record
          </h2>
          <Form method="post" className="space-y-3">
            <label className="block text-xs text-[var(--ink-secondary)]">
              Vendor
              <select
                name="vendorId"
                required
                className="mt-1 w-full rounded-md border border-[var(--chart-border)] bg-[var(--chart-surface)] px-3 py-2 text-sm text-[var(--ink-primary)]"
              >
                {VENDORS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-[var(--ink-secondary)]">
              Amount
              <input
                type="number"
                name="amount"
                step="any"
                min="0"
                required
                placeholder="50"
                className="mt-1 w-full rounded-md border border-[var(--chart-border)] bg-[var(--chart-surface)] px-3 py-2 text-sm text-[var(--ink-primary)]"
              />
            </label>

            <label className="block text-xs text-[var(--ink-secondary)]">
              Note
              <input
                type="text"
                name="note"
                placeholder="optional"
                className="mt-1 w-full rounded-md border border-[var(--chart-border)] bg-[var(--chart-surface)] px-3 py-2 text-sm text-[var(--ink-primary)]"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                name="intent"
                value="reading"
                disabled={busy}
                className="flex-1 rounded-md bg-[var(--ink-primary)] px-3 py-2 text-sm text-[var(--chart-surface)] disabled:opacity-50"
              >
                Log balance
              </button>
              <button
                type="submit"
                name="intent"
                value="refill"
                disabled={busy}
                className="flex-1 rounded-md border border-[var(--chart-border)] px-3 py-2 text-sm text-[var(--ink-primary)] disabled:opacity-50"
              >
                Log $ refill
              </button>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              &ldquo;Log balance&rdquo; records what the vendor currently shows,
              in that vendor&rsquo;s own unit. &ldquo;Log $ refill&rdquo; records
              what you paid, always in dollars.
            </p>
          </Form>
        </div>

        <div className="rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
            Recent refills
          </h2>
          {refills.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Nothing logged yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-muted)]">
                  <th className="pb-2 font-normal">When</th>
                  <th className="pb-2 font-normal">Vendor</th>
                  <th className="pb-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {refills.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--chart-grid)]">
                    <td className="py-2 text-[var(--ink-secondary)]">
                      {new Date(r.ts).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-[var(--ink-primary)]">
                      {VENDORS_BY_ID[r.vendorId]?.name ?? r.vendorId}
                    </td>
                    <td
                      className="py-2 text-right text-[var(--ink-primary)]"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      ${r.amountUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="viz-root min-h-screen bg-[var(--page)] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--ink-primary)]">
            Money
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            Every account that can run out, and the link to refill it.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
