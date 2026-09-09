/**
 * Lever 24 — one config-driven codebase for every trade and every metro.
 *
 * This is the unfair advantage. Competitors pay an agency ~$3k per site and wait
 * three weeks. Adding a suburb here is one entry in METROS; adding a trade is one
 * entry in TRADES. Everything downstream — routes, titles, meta descriptions,
 * structured data — is derived, so a fifty-page local site is a config change.
 *
 * The rule that keeps it honest: nothing in this module hard-codes a city or a
 * trade name. If a page cannot be generated from config, it does not belong here.
 */

export interface TradeConfig {
  slug: string;
  /** Plural, as a customer says it: "epoxy garage floors". */
  name: string;
  /** Singular service noun for headings: "epoxy garage floor". */
  singular: string;
  /** What the customer searches. Drives page titles, not stuffing. */
  headTerm: string;
  services: ServiceConfig[];
  priceFrom: number;
  priceTo: number;
  schemaServiceType: string;
}

export interface ServiceConfig {
  slug: string;
  name: string;
  blurb: string;
}

export interface MetroConfig {
  slug: string;
  name: string;
  stateCode: string;
  /** Suburbs that get their own page. Add a name, get a page. */
  areas: string[];
  /** Trades actually served here. A metro need not carry every trade. */
  trades: string[];
  phone: string;
}

export const TRADES: TradeConfig[] = [
  {
    slug: "mini-splits",
    name: "ductless mini split installation",
    singular: "ductless mini split",
    headTerm: "mini split installation",
    priceFrom: 3500,
    priceTo: 15000,
    schemaServiceType: "HVAC Installation",
    services: [
      { slug: "single-zone", name: "Single-zone installation", blurb: "One room, one head, installed in a day." },
      { slug: "multi-zone", name: "Multi-zone installation", blurb: "Two to four rooms from one outdoor unit." },
      { slug: "garage-and-shop", name: "Garage & shop cooling", blurb: "Uninsulated spaces sized properly the first time." },
      { slug: "service-and-cleaning", name: "Service & cleaning", blurb: "Annual clean and check to keep the warranty intact." },
    ],
  },
  {
    slug: "handyman",
    name: "handyman services",
    singular: "handyman",
    headTerm: "handyman",
    priceFrom: 170,
    priceTo: 2500,
    schemaServiceType: "Home Repair",
    services: [
      { slug: "rental-turnovers", name: "Rental turnovers", blurb: "Whole-unit make-ready on one dispatch." },
      { slug: "punch-lists", name: "Punch lists", blurb: "The entire list, not just the one item." },
      { slug: "doors-and-drywall", name: "Doors & drywall", blurb: "Hung, patched, painted, done." },
      { slug: "fixtures", name: "Fixtures & plumbing repairs", blurb: "Faucets, toilets, angle stops." },
    ],
  },
  {
    slug: "epoxy-floors",
    name: "epoxy garage floors",
    singular: "epoxy garage floor",
    headTerm: "epoxy garage floor",
    priceFrom: 3000,
    priceTo: 6000,
    schemaServiceType: "Flooring Installation",
    services: [
      { slug: "garage-floors", name: "Garage floor coating", blurb: "Ground, sealed, flaked, walkable next day." },
      { slug: "basement-floors", name: "Basement floors", blurb: "Moisture-tolerant systems for below grade." },
    ],
  },
];

export const METROS: MetroConfig[] = [
  {
    slug: "chicago",
    name: "Chicago",
    stateCode: "IL",
    phone: "(312) 555-0142",
    areas: ["Oak Park", "Evanston", "Berwyn", "Cicero", "Skokie", "Elmwood Park"],
    trades: ["mini-splits", "handyman", "epoxy-floors"],
  },
];

// --------------------------------------------------------------- generation --

export type PageKind = "home" | "trade" | "service" | "area" | "service-area";

export interface GeneratedPage {
  kind: PageKind;
  path: string;
  title: string;
  description: string;
  h1: string;
  /** JSON-LD, emitted into the page head. */
  schema: Record<string, unknown>;
}

const tradeBySlug = new Map(TRADES.map((t) => [t.slug, t]));
export const lookupTrade = (slug: string): TradeConfig | undefined => tradeBySlug.get(slug);

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function localBusinessSchema(metro: MetroConfig, trade?: TradeConfig, area?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Masomenos ${trade ? titleCase(trade.headTerm) : "Home Services"}`,
    telephone: metro.phone,
    areaServed: area ? `${area}, ${metro.stateCode}` : `${metro.name}, ${metro.stateCode}`,
    ...(trade
      ? {
          makesOffer: {
            "@type": "Offer",
            itemOffered: { "@type": "Service", serviceType: trade.schemaServiceType, name: trade.name },
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: trade.priceFrom,
              maxPrice: trade.priceTo,
              priceCurrency: "USD",
            },
          },
        }
      : {}),
  };
}

/**
 * Every page for one metro. The count is the point: six suburbs across three
 * trades is already forty-plus pages from one config entry.
 */
export function generateMetroPages(metro: MetroConfig): GeneratedPage[] {
  const pages: GeneratedPage[] = [];
  const trades = metro.trades.map(lookupTrade).filter((t): t is TradeConfig => t != null);

  pages.push({
    kind: "home",
    path: `/${metro.slug}`,
    title: `Home Services in ${metro.name}, ${metro.stateCode} | Masomenos`,
    description: `Mini splits, handyman work and floor coatings across ${metro.name}. Fixed prices in writing, same-day quotes.`,
    h1: `Home services in ${metro.name}`,
    schema: localBusinessSchema(metro),
  });

  for (const trade of trades) {
    pages.push({
      kind: "trade",
      path: `/${metro.slug}/${trade.slug}`,
      title: `${titleCase(trade.headTerm)} in ${metro.name}, ${metro.stateCode} | Masomenos`,
      description: `${titleCase(trade.name)} across ${metro.name}. Fixed price in writing before we start, from $${trade.priceFrom.toLocaleString()}.`,
      h1: `${titleCase(trade.headTerm)} in ${metro.name}`,
      schema: localBusinessSchema(metro, trade),
    });

    for (const service of trade.services) {
      pages.push({
        kind: "service",
        path: `/${metro.slug}/${trade.slug}/${service.slug}`,
        title: `${service.name} in ${metro.name} | Masomenos`,
        description: service.blurb,
        h1: `${service.name} in ${metro.name}`,
        schema: localBusinessSchema(metro, trade),
      });
    }

    for (const area of metro.areas) {
      const areaSlug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      pages.push({
        kind: "service-area",
        path: `/${metro.slug}/${trade.slug}/${areaSlug}`,
        title: `${titleCase(trade.headTerm)} in ${area}, ${metro.stateCode} | Masomenos`,
        description: `${titleCase(trade.name)} in ${area}. Local crews, fixed pricing, quotes the same day.`,
        h1: `${titleCase(trade.headTerm)} in ${area}`,
        schema: localBusinessSchema(metro, trade, area),
      });
    }
  }

  for (const area of metro.areas) {
    const areaSlug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    pages.push({
      kind: "area",
      path: `/${metro.slug}/areas/${areaSlug}`,
      title: `Home Services in ${area}, ${metro.stateCode} | Masomenos`,
      description: `Everything we do in ${area} — mini splits, handyman work and coatings.`,
      h1: `Serving ${area}`,
      schema: localBusinessSchema(metro, undefined, area),
    });
  }

  return pages;
}

export const generateAllPages = (metros: MetroConfig[] = METROS): GeneratedPage[] =>
  metros.flatMap(generateMetroPages);

/**
 * Duplicate paths or duplicate titles are the failure mode of generated local
 * sites and the fastest way to get the whole thing devalued. Fail the build here.
 */
export function validatePages(pages: GeneratedPage[]): string[] {
  const errors: string[] = [];
  const seenPaths = new Set<string>();
  const seenTitles = new Set<string>();

  for (const page of pages) {
    if (seenPaths.has(page.path)) errors.push(`duplicate path: ${page.path}`);
    seenPaths.add(page.path);

    if (seenTitles.has(page.title)) errors.push(`duplicate title: ${page.title}`);
    seenTitles.add(page.title);

    if (page.title.length > 65) errors.push(`title too long (${page.title.length}): ${page.path}`);
    if (page.description.length > 165)
      errors.push(`description too long (${page.description.length}): ${page.path}`);
  }

  return errors;
}

export function sitemapXml(pages: GeneratedPage[], origin: string): string {
  const urls = pages
    .map((p) => `  <url><loc>${origin}${p.path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
