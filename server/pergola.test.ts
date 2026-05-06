import { describe, expect, it } from "vitest";
import { calculateQTO, getDrawingDimensions } from "../shared/geometry";
import type { PergolaParams } from "../shared/geometry";

const defaultParams: PergolaParams = {
  widthFt: 58,
  depthFt: 15.67,
  heightFt: 10,
  postCount: 5,
  postSpacingFt: 14.5,
  slatType: "fixed",
  slatSpacingIn: 4,
  glassFront: true,
  glassLeft: true,
  glassRight: true,
  finishColor: "Matte Black",
  ledLighting: true,
};

describe("getDrawingDimensions", () => {
  it("returns correct width and depth from params", () => {
    const dims = getDrawingDimensions(defaultParams);
    expect(dims.widthFt).toBe(58);
    expect(dims.depthFt).toBe(15.67);
    expect(dims.heightFt).toBe(10);
  });

  it("returns correct post count", () => {
    const dims = getDrawingDimensions(defaultParams);
    expect(dims.postCount).toBe(5);
  });

  it("calculates slatCount as a positive integer", () => {
    const dims = getDrawingDimensions(defaultParams);
    expect(dims.slatCount).toBeGreaterThan(0);
    expect(Number.isInteger(dims.slatCount)).toBe(true);
  });

  it("passes glass flags through", () => {
    const dims = getDrawingDimensions(defaultParams);
    expect(dims.glassFront).toBe(true);
    expect(dims.glassLeft).toBe(true);
    expect(dims.glassRight).toBe(true);
  });

  it("handles no glass enclosure", () => {
    const dims = getDrawingDimensions({ ...defaultParams, glassFront: false, glassLeft: false, glassRight: false });
    expect(dims.glassFront).toBe(false);
    expect(dims.glassLeft).toBe(false);
    expect(dims.glassRight).toBe(false);
  });
});

describe("calculateQTO", () => {
  it("returns an array of QTO items", () => {
    const items = calculateQTO(defaultParams);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("all items have required fields", () => {
    const items = calculateQTO(defaultParams);
    for (const item of items) {
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("unit");
      expect(item).toHaveProperty("qty");
      expect(item).toHaveProperty("basis");
      expect(typeof item.qty).toBe("number");
      expect(item.qty).toBeGreaterThan(0);
    }
  });

  it("includes aluminum structure items", () => {
    const items = calculateQTO(defaultParams);
    const structureItems = items.filter(i => i.category === "Aluminum Structure");
    expect(structureItems.length).toBeGreaterThan(0);
  });

  it("includes Lumon glass items when glass is enabled", () => {
    const items = calculateQTO(defaultParams);
    const glassItems = items.filter(i => i.category === "Lumon Enclosure");
    expect(glassItems.length).toBeGreaterThan(0);
  });

  it("excludes Lumon glass items when all glass is disabled", () => {
    const items = calculateQTO({ ...defaultParams, glassFront: false, glassLeft: false, glassRight: false });
    const glassItems = items.filter(i => i.category === "Lumon Enclosure");
    expect(glassItems.length).toBe(0);
  });

  it("includes LED lighting item when ledLighting is true", () => {
    const items = calculateQTO(defaultParams);
    const ledItem = items.find(i => i.description.toLowerCase().includes("led"));
    expect(ledItem).toBeDefined();
  });

  it("excludes LED lighting item when ledLighting is false", () => {
    const items = calculateQTO({ ...defaultParams, ledLighting: false });
    const ledItem = items.find(i => i.description.toLowerCase().includes("led string") || i.description.toLowerCase().includes("led strip") || i.description.toLowerCase().includes("led lighting"));
    expect(ledItem).toBeUndefined();
  });

  it("post count matches params", () => {
    const items = calculateQTO(defaultParams);
    const postItem = items.find(i => i.description.toLowerCase().includes("post"));
    expect(postItem).toBeDefined();
    expect(postItem!.qty).toBe(5);
  });
});

describe("auth.logout", () => {
  it("is tested in auth.logout.test.ts", () => {
    expect(true).toBe(true);
  });
});

// ─── Glass Wall Height Tests ──────────────────────────────────────────────────

describe("glassWallHeightFt parameter", () => {
  it("uses glassWallHeightFt for glass area when set", () => {
    const params: PergolaParams = {
      widthFt: 20, depthFt: 10, heightFt: 10,
      postCount: 3, postSpacingFt: 10,
      slatType: "fixed", slatSpacingIn: 4,
      glassFront: true, glassLeft: false, glassRight: false,
      glassWallHeightFt: 8,
      finishColor: "Matte Black", ledLighting: false,
    };
    const items = calculateQTO(params);
    const lumon = items.find(i => i.description === "Lumon panels (vertical enclosure)");
    // Area = 20 * 8 * 0.0929 = 14.864 m² → rounded to 14.9
    expect(lumon).toBeDefined();
    expect(lumon!.qty).toBeCloseTo(14.9, 0);
    expect(lumon!.basis).toContain("H: 8.0'");
  });

  it("falls back to heightFt when glassWallHeightFt is not set", () => {
    const params: PergolaParams = {
      widthFt: 20, depthFt: 10, heightFt: 10,
      postCount: 3, postSpacingFt: 10,
      slatType: "fixed", slatSpacingIn: 4,
      glassFront: true, glassLeft: false, glassRight: false,
      finishColor: "Matte Black", ledLighting: false,
    };
    const items = calculateQTO(params);
    const lumon = items.find(i => i.description === "Lumon panels (vertical enclosure)");
    // Area = 20 * 10 * 0.0929 = 18.58 m² → rounded to 18.6
    expect(lumon).toBeDefined();
    expect(lumon!.qty).toBeCloseTo(18.6, 0);
    expect(lumon!.basis).toContain("H: 10.0'");
  });

  it("smaller glass height produces less area than full height", () => {
    const base: PergolaParams = {
      widthFt: 30, depthFt: 12, heightFt: 10,
      postCount: 4, postSpacingFt: 10,
      slatType: "fixed", slatSpacingIn: 4,
      glassFront: true, glassLeft: true, glassRight: true,
      finishColor: "Matte Black", ledLighting: false,
    };
    const withShortGlass = calculateQTO({ ...base, glassWallHeightFt: 7 });
    const withFullHeight = calculateQTO(base);
    const shortArea = withShortGlass.find(i => i.description === "Lumon panels (vertical enclosure)")!.qty;
    const fullArea = withFullHeight.find(i => i.description === "Lumon panels (vertical enclosure)")!.qty;
    expect(shortArea).toBeLessThan(fullArea);
  });
});

// ─── Rail Width Tests ─────────────────────────────────────────────────────────

describe("railWidthIn parameter", () => {
  const glassParams: PergolaParams = {
    widthFt: 20, depthFt: 10, heightFt: 10,
    postCount: 3, postSpacingFt: 10,
    slatType: "fixed", slatSpacingIn: 4,
    glassFront: true, glassLeft: false, glassRight: false,
    glassWallHeightFt: 8,
    finishColor: "Matte Black", ledLighting: false,
  };

  it("includes rail width in top rail basis text when set", () => {
    const items = calculateQTO({ ...glassParams, railWidthIn: 3 });
    const topRail = items.find(i => i.description === "Glass top rail (integrated to fascia beam)");
    expect(topRail).toBeDefined();
    expect(topRail!.basis).toContain('3"');
  });

  it("includes rail width in bottom track basis text when set", () => {
    const items = calculateQTO({ ...glassParams, railWidthIn: 3 });
    const bottomTrack = items.find(i => i.description === "Glass bottom track / sill");
    expect(bottomTrack).toBeDefined();
    expect(bottomTrack!.basis).toContain('3"');
  });

  it("defaults to 2 inch rail width when not set", () => {
    const items = calculateQTO(glassParams);
    const topRail = items.find(i => i.description === "Glass top rail (integrated to fascia beam)");
    expect(topRail!.basis).toContain('2"');
  });

  it("rail width does not affect glass panel area quantity", () => {
    const narrow = calculateQTO({ ...glassParams, railWidthIn: 1 });
    const wide   = calculateQTO({ ...glassParams, railWidthIn: 6 });
    const narrowPanel = narrow.find(i => i.description === "Lumon panels (vertical enclosure)")!.qty;
    const widePanel   = wide.find(i => i.description === "Lumon panels (vertical enclosure)")!.qty;
    // Panel area is based on glassWallHeightFt, not rail width
    expect(narrowPanel).toBe(widePanel);
  });
});
