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

  it("includes Lumin glass items when glass is enabled", () => {
    const items = calculateQTO(defaultParams);
    const glassItems = items.filter(i => i.category === "Lumin Glass Enclosure");
    expect(glassItems.length).toBeGreaterThan(0);
  });

  it("excludes Lumin glass items when all glass is disabled", () => {
    const items = calculateQTO({ ...defaultParams, glassFront: false, glassLeft: false, glassRight: false });
    const glassItems = items.filter(i => i.category === "Lumin Glass Enclosure");
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
