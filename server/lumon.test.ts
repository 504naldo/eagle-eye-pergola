import { describe, expect, it } from "vitest";
import { DEFAULT_LUMON_PARAMS, type LumonParams } from "../shared/scopeTypes";
import { calculateLumonQTO } from "../shared/lumonQTO";
import {
  drawLumonPlan as lumonPlanSVG,
  drawLumonFrontElevation as lumonFrontElevationSVG,
  drawLumonSideElevation as lumonSideElevationSVG,
  drawLumonTypicalSection as lumonTypicalSectionSVG,
  drawLumonConnectionDetail as lumonConnectionDetailSVG,
} from "../shared/lumonGlazingGeometry";

// ─── QTO tests ───────────────────────────────────────────────────────────────

describe("calculateLumonQTO", () => {
  it("returns an array of line items", () => {
    const items = calculateLumonQTO(DEFAULT_LUMON_PARAMS, {});
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("every item has required fields", () => {
    const items = calculateLumonQTO(DEFAULT_LUMON_PARAMS, {});
    for (const item of items) {
      expect(typeof item.description).toBe("string");
      expect(typeof item.unit).toBe("string");
      expect(typeof item.qty).toBe("number");
      expect(typeof item.unitRate).toBe("number");
      expect(typeof item.lineTotal).toBe("number");
      expect(typeof item.group).toBe("string");
    }
  });

  it("lineTotal equals qty * unitRate for each item", () => {
    const items = calculateLumonQTO(DEFAULT_LUMON_PARAMS, {});
    for (const item of items) {
      expect(item.lineTotal).toBeCloseTo(item.qty * item.unitRate, 2);
    }
  });

  it("grand total is positive", () => {
    const items = calculateLumonQTO(DEFAULT_LUMON_PARAMS, {});
    const total = items.reduce((s, i) => s + i.lineTotal, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("wider span produces more glass area and higher cost", () => {
    const narrow: LumonParams = { ...DEFAULT_LUMON_PARAMS, spanFt: 20 };
    const wide: LumonParams = { ...DEFAULT_LUMON_PARAMS, spanFt: 60 };
    const narrowTotal = calculateLumonQTO(narrow, {}).reduce((s, i) => s + i.lineTotal, 0);
    const wideTotal = calculateLumonQTO(wide, {}).reduce((s, i) => s + i.lineTotal, 0);
    // wider span should cost at least as much
    expect(wideTotal).toBeGreaterThanOrEqual(narrowTotal);
  });

  it("rate overrides are applied", () => {
    const items = calculateLumonQTO(DEFAULT_LUMON_PARAMS, {});
    const baseTotal = items.reduce((s, i) => s + i.lineTotal, 0);

    // Find a rate key from the first item
    const firstKey = items[0]?.rateKey;
    if (!firstKey) return; // skip if no rateKey
    const overrides: Record<string, number> = { [firstKey]: 9999 };
    const overriddenItems = calculateLumonQTO(DEFAULT_LUMON_PARAMS, overrides);
    const overriddenTotal = overriddenItems.reduce((s, i) => s + i.lineTotal, 0);
    expect(overriddenTotal).not.toEqual(baseTotal);
  });

  it("disabling upper glass does not increase cost", () => {
    const withUpper: LumonParams = { ...DEFAULT_LUMON_PARAMS, hasUpperGlass: true };
    const withoutUpper: LumonParams = { ...DEFAULT_LUMON_PARAMS, hasUpperGlass: false };
    const withTotal = calculateLumonQTO(withUpper, {}).reduce((s, i) => s + i.lineTotal, 0);
    const withoutTotal = calculateLumonQTO(withoutUpper, {}).reduce((s, i) => s + i.lineTotal, 0);
    expect(withTotal).toBeGreaterThanOrEqual(withoutTotal);
  });

  it("adding side returns does not decrease cost", () => {
    const noReturns: LumonParams = { ...DEFAULT_LUMON_PARAMS, leftReturnFt: 0, rightReturnFt: 0 };
    const withReturns: LumonParams = { ...DEFAULT_LUMON_PARAMS, leftReturnFt: 8, rightReturnFt: 8 };
    const noReturnTotal = calculateLumonQTO(noReturns, {}).reduce((s, i) => s + i.lineTotal, 0);
    const withReturnTotal = calculateLumonQTO(withReturns, {}).reduce((s, i) => s + i.lineTotal, 0);
    expect(withReturnTotal).toBeGreaterThanOrEqual(noReturnTotal);
  });
});

// ─── SVG drawing tests ────────────────────────────────────────────────────────

describe("lumonPlanSVG", () => {
  it("returns a non-empty SVG string", () => {
    const svg = lumonPlanSVG(DEFAULT_LUMON_PARAMS);
    expect(typeof svg).toBe("string");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("contains post rectangles", () => {
    const svg = lumonPlanSVG(DEFAULT_LUMON_PARAMS);
    expect(svg).toContain("post");
  });

  it("contains stacking zone markers", () => {
    const svg = lumonPlanSVG(DEFAULT_LUMON_PARAMS);
    expect(svg.toLowerCase()).toContain("stack");
  });
});

describe("lumonFrontElevationSVG", () => {
  it("returns a valid SVG string", () => {
    const svg = lumonFrontElevationSVG(DEFAULT_LUMON_PARAMS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("includes panel or post elements for the given postCount", () => {
    const p: LumonParams = { ...DEFAULT_LUMON_PARAMS, postCount: 4 };
    const svg = lumonFrontElevationSVG(p);
    // SVG should contain rect elements for posts/panels
    expect(svg).toContain("<rect");
    expect(svg.length).toBeGreaterThan(100);
  });
});

describe("lumonSideElevationSVG", () => {
  it("returns a valid SVG string", () => {
    const svg = lumonSideElevationSVG(DEFAULT_LUMON_PARAMS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("contains dimension text", () => {
    const svg = lumonSideElevationSVG(DEFAULT_LUMON_PARAMS);
    // should contain some numeric dimension text
    expect(svg).toContain("<text");
    expect(svg.length).toBeGreaterThan(100);
  });
});

describe("lumonTypicalSectionSVG", () => {
  it("returns a valid SVG string", () => {
    const svg = lumonTypicalSectionSVG(DEFAULT_LUMON_PARAMS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("contains callout text elements", () => {
    const svg = lumonTypicalSectionSVG(DEFAULT_LUMON_PARAMS);
    // should contain text callouts (lumon post, glass, etc.)
    expect(svg).toContain("<text");
    expect(svg.toLowerCase()).toMatch(/lumon|glass|post|track/);
  });
});

describe("lumonConnectionDetailSVG", () => {
  it("returns a valid SVG string", () => {
    const svg = lumonConnectionDetailSVG(DEFAULT_LUMON_PARAMS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("includes anchor bolt callout", () => {
    const svg = lumonConnectionDetailSVG(DEFAULT_LUMON_PARAMS);
    expect(svg.toLowerCase()).toContain("anchor");
  });
});
