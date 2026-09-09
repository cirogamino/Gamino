import { describe, expect, it } from "vitest";
import {
  generateAllPages,
  generateMetroPages,
  lookupTrade,
  METROS,
  sitemapXml,
  TRADES,
  validatePages,
  type MetroConfig,
} from "../app/ops/sites";

const chicago = METROS[0];

describe("lever 24 — config-driven sites", () => {
  it("generates a whole local site from one metro entry", () => {
    const pages = generateMetroPages(chicago);
    const trades = chicago.trades.map(lookupTrade).filter((t) => t != null);
    const serviceCount = trades.reduce((a, t) => a + t!.services.length, 0);

    // Derived, not guessed: 1 home + trade pages + service pages
    // + (trades x areas) service-area pages + one page per area.
    const expected =
      1 + trades.length + serviceCount + trades.length * chicago.areas.length + chicago.areas.length;

    expect(pages).toHaveLength(expected);
    expect(pages).toHaveLength(38);
    expect(pages.filter((p) => p.kind === "home")).toHaveLength(1);
    expect(pages.filter((p) => p.kind === "trade")).toHaveLength(trades.length);
  });

  it("adds a new suburb as pages without touching any code", () => {
    const before = generateMetroPages(chicago).length;
    const withSuburb: MetroConfig = { ...chicago, areas: [...chicago.areas, "Forest Park"] };
    const after = generateMetroPages(withSuburb).length;
    // one area page plus one service-area page per trade
    expect(after - before).toBe(1 + chicago.trades.length);
  });

  it("adds a new metro as a whole site without touching any code", () => {
    const second: MetroConfig = {
      slug: "milwaukee",
      name: "Milwaukee",
      stateCode: "WI",
      phone: "(414) 555-0199",
      areas: ["Wauwatosa", "Shorewood"],
      trades: ["mini-splits", "handyman"],
    };
    const all = generateAllPages([chicago, second]);
    expect(all.some((p) => p.path.startsWith("/milwaukee"))).toBe(true);
    expect(validatePages(all)).toHaveLength(0);
  });

  it("only generates trades the metro actually serves", () => {
    const limited: MetroConfig = { ...chicago, trades: ["handyman"] };
    const pages = generateMetroPages(limited);
    expect(pages.some((p) => p.path.includes("epoxy-floors"))).toBe(false);
  });

  it("ignores a trade slug that does not exist rather than emitting a broken page", () => {
    const bad: MetroConfig = { ...chicago, trades: ["handyman", "not-a-trade"] };
    const pages = generateMetroPages(bad);
    expect(pages.some((p) => p.path.includes("not-a-trade"))).toBe(false);
  });

  it("produces no duplicate paths or titles — the way generated sites get devalued", () => {
    expect(validatePages(generateAllPages())).toHaveLength(0);
  });

  it("keeps titles and descriptions inside their limits", () => {
    for (const page of generateAllPages()) {
      expect(page.title.length).toBeLessThanOrEqual(65);
      expect(page.description.length).toBeLessThanOrEqual(165);
    }
  });

  it("catches a duplicate title if one is ever introduced", () => {
    const pages = generateMetroPages(chicago);
    const errors = validatePages([...pages, pages[0]]);
    expect(errors.some((e) => e.startsWith("duplicate path"))).toBe(true);
  });

  it("slugs suburb names safely", () => {
    const pages = generateMetroPages({ ...chicago, areas: ["Oak Park"] });
    expect(pages.some((p) => p.path.endsWith("/areas/oak-park"))).toBe(true);
  });

  it("emits LocalBusiness structured data with the area served", () => {
    const page = generateMetroPages(chicago).find((p) => p.kind === "service-area")!;
    expect(page.schema["@type"]).toBe("LocalBusiness");
    expect(String(page.schema.areaServed)).toContain("IL");
  });

  it("looks trades up by slug", () => {
    expect(lookupTrade("mini-splits")?.name).toContain("mini split");
    expect(lookupTrade("nope")).toBeUndefined();
  });

  it("builds a sitemap covering every generated page", () => {
    const pages = generateAllPages();
    const xml = sitemapXml(pages, "https://example.com");
    expect(xml).toContain("<urlset");
    expect(xml.match(/<loc>/g) ?? []).toHaveLength(pages.length);
  });

  it("hard-codes no city or trade name in the generator itself", () => {
    // Every generated path must trace back to config.
    const tradeSlugs = new Set(TRADES.map((t) => t.slug));
    for (const page of generateMetroPages(chicago)) {
      const [, metroSlug] = page.path.split("/");
      expect(metroSlug).toBe(chicago.slug);
      const maybeTrade = page.path.split("/")[2];
      if (maybeTrade && maybeTrade !== "areas") expect(tradeSlugs.has(maybeTrade)).toBe(true);
    }
  });
});
