/**
 * Every service that can run out of money and stop the business.
 *
 * This is a plain config file on purpose — adding a vendor is one entry here
 * and nothing else. `collector` records how a balance gets read today, which
 * is what later phases upgrade:
 *
 *   manual  — you type it in. Works for everything, needs no credentials.
 *   email   — parsed from receipt mail (Phase 2).
 *   api     — read live from the vendor (Phase 3).
 *
 * `refillUrl` should land as deep as the vendor allows — ideally the billing
 * page itself, not a dashboard you then have to navigate from. That link is
 * the entire point of the refill rail.
 */

export type Collector = "manual" | "email" | "api";

/** What the vendor's balance is actually denominated in. */
export type Unit = "usd" | "credits" | "characters";

export interface Vendor {
  id: string;
  name: string;
  /** Categorical chart slot, 1-8, assigned in fixed order and never cycled.
   *  Vendors past slot 8 are chartable only via the vendor picker. */
  slot: number;
  collector: Collector;
  unit: Unit;
  /** Deep link to the page where you top up. */
  refillUrl: string;
  /** Warn below this balance, in the vendor's own unit. */
  lowThreshold?: number;
  /** Set once a vendor's auto-recharge is switched on, so the page can stop
   *  nagging about a balance that refills itself. */
  autoRecharge?: boolean;
  note?: string;
}

export const VENDORS: Vendor[] = [
  {
    id: "anthropic",
    name: "Anthropic API",
    slot: 1,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://console.anthropic.com/settings/billing",
    lowThreshold: 25,
    note: "Admin API exposes usage + cost reports — upgrade to api in Phase 3.",
  },
  {
    id: "openai",
    name: "OpenAI API",
    slot: 2,
    collector: "manual",
    unit: "usd",
    refillUrl:
      "https://platform.openai.com/settings/organization/billing/overview",
    lowThreshold: 25,
    note: "Org costs + usage endpoints exist — upgrade to api in Phase 3.",
  },
  {
    id: "higgsfield",
    name: "Higgsfield",
    slot: 3,
    collector: "manual",
    unit: "credits",
    refillUrl: "https://higgsfield.ai/pricing",
    lowThreshold: 200,
    note: "Image and video generation. Burns fastest of anything here.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    slot: 4,
    collector: "manual",
    unit: "characters",
    refillUrl: "https://elevenlabs.io/app/subscription",
    lowThreshold: 20000,
    note: "/v1/user/subscription returns character_count + character_limit.",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    slot: 5,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://console.x.ai",
    lowThreshold: 25,
  },
  {
    id: "gemini",
    name: "Gemini",
    slot: 6,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://aistudio.google.com/app/billing",
    lowThreshold: 25,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    slot: 7,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://www.perplexity.ai/settings/api",
    lowThreshold: 15,
  },
  {
    id: "manus",
    name: "Manus",
    slot: 8,
    collector: "manual",
    unit: "credits",
    refillUrl: "https://manus.im",
    lowThreshold: 500,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    slot: 1,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://dash.cloudflare.com/?to=/:account/billing",
    note: "Mostly subscription rather than prepaid — watch for overage.",
  },
  {
    id: "supabase",
    name: "Supabase",
    slot: 2,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://supabase.com/dashboard/org/_/billing",
    note: "Mostly subscription rather than prepaid — watch for overage.",
  },
  {
    id: "claude",
    name: "Claude (subscription)",
    slot: 3,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://claude.ai/settings/billing",
    note: "Seat subscription, separate billing surface from the API.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT (subscription)",
    slot: 4,
    collector: "manual",
    unit: "usd",
    refillUrl: "https://chatgpt.com/#settings/Subscription",
    note: "Seat subscription, separate billing surface from the API.",
  },
  {
    id: "hermes",
    name: "Hermes",
    slot: 5,
    collector: "manual",
    unit: "usd",
    refillUrl: "",
    note: "Placeholder — needs the real billing URL and unit confirmed.",
  },
];

export const VENDORS_BY_ID: Record<string, Vendor> = Object.fromEntries(
  VENDORS.map((v) => [v.id, v]),
);

/** A chart may carry at most this many distinct series before colors stop
 *  being tellable apart. Beyond it, deselect vendors rather than add hues. */
export const MAX_SERIES = 8;

export function formatAmount(value: number, unit: Unit): string {
  switch (unit) {
    case "usd":
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "characters":
      return `${Math.round(value).toLocaleString("en-US")} chars`;
    case "credits":
      return `${Math.round(value).toLocaleString("en-US")} cr`;
  }
}
