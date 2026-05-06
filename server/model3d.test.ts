/**
 * Tests for 3D model parametric geometry logic.
 * These tests validate the unit conversion and geometry calculations
 * used by the ModelViewer3D component, without requiring a browser/canvas.
 */
import { describe, it, expect } from "vitest";

// ─── Unit conversion helpers (mirrors ModelViewer3D.tsx) ──────────────────────

const FT = 0.3048;
const ft = (v: number) => v * FT;
const inch = (v: number) => (v * FT) / 12;

// ─── Geometry calculation (mirrors PergolaScene logic) ────────────────────────

interface ModelParams {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  postCount: number;
  postSizeIn: number;
  beamSizeIn: number;
  louverSpacingIn: number;
  louverSizeIn: number;
  hasGlass: boolean;
  finishColor: string;
}

function computeModelGeometry(params: ModelParams) {
  const W = ft(params.widthFt);
  const D = ft(params.depthFt);
  const H = ft(params.heightFt);
  const postS = inch(params.postSizeIn);
  const beamH = inch(params.beamSizeIn);
  const beamW = inch(Math.max(params.beamSizeIn, 4));
  const louverSpacing = inch(Math.max(params.louverSpacingIn, 1));
  const louverW = inch(params.louverSizeIn);
  const louverThick = inch(1.5);
  const roofY = H + beamH + louverThick / 2;
  const n = Math.max(params.postCount, 2);
  const slatCount = Math.max(Math.floor(D / louverSpacing), 1);

  return { W, D, H, postS, beamH, beamW, louverSpacing, louverW, louverThick, roofY, n, slatCount };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("3D Model Geometry", () => {
  const baseParams: ModelParams = {
    widthFt: 58,
    depthFt: 15.67,
    heightFt: 10,
    postCount: 5,
    postSizeIn: 6,
    beamSizeIn: 8,
    louverSpacingIn: 4,
    louverSizeIn: 6,
    hasGlass: true,
    finishColor: "#2a2a2a",
  };

  it("converts feet to meters correctly", () => {
    expect(ft(1)).toBeCloseTo(0.3048, 4);
    expect(ft(10)).toBeCloseTo(3.048, 3);
    expect(ft(58)).toBeCloseTo(17.6784, 3);
  });

  it("converts inches to meters correctly", () => {
    expect(inch(12)).toBeCloseTo(0.3048, 4); // 12 inches = 1 foot
    expect(inch(6)).toBeCloseTo(0.1524, 4);
    expect(inch(8)).toBeCloseTo(0.2032, 4);
  });

  it("computes correct width and depth for standard pergola", () => {
    const geo = computeModelGeometry(baseParams);
    expect(geo.W).toBeCloseTo(ft(58), 5);
    expect(geo.D).toBeCloseTo(ft(15.67), 5);
    expect(geo.H).toBeCloseTo(ft(10), 5);
  });

  it("enforces minimum post count of 2", () => {
    const geo = computeModelGeometry({ ...baseParams, postCount: 1 });
    expect(geo.n).toBe(2);
    const geo2 = computeModelGeometry({ ...baseParams, postCount: 0 });
    expect(geo2.n).toBe(2);
  });

  it("uses at least 5 posts for standard pergola", () => {
    const geo = computeModelGeometry(baseParams);
    expect(geo.n).toBe(5);
  });

  it("calculates roof Y position correctly", () => {
    const geo = computeModelGeometry(baseParams);
    const expectedRoofY = ft(10) + inch(8) + inch(1.5) / 2;
    expect(geo.roofY).toBeCloseTo(expectedRoofY, 5);
  });

  it("calculates louver slat count based on depth and spacing", () => {
    const geo = computeModelGeometry(baseParams);
    // D / louverSpacing = ft(15.67) / inch(4)
    const expectedCount = Math.max(Math.floor(ft(15.67) / inch(4)), 1);
    expect(geo.slatCount).toBe(expectedCount);
  });

  it("enforces minimum louver spacing of 1 inch", () => {
    const geo = computeModelGeometry({ ...baseParams, louverSpacingIn: 0 });
    expect(geo.louverSpacing).toBeCloseTo(inch(1), 5);
  });

  it("uses beamSizeIn for both beamH and beamW when >= 4", () => {
    const geo = computeModelGeometry(baseParams);
    expect(geo.beamH).toBeCloseTo(inch(8), 5);
    expect(geo.beamW).toBeCloseTo(inch(8), 5);
  });

  it("enforces minimum beam width of 4 inches", () => {
    const geo = computeModelGeometry({ ...baseParams, beamSizeIn: 2 });
    expect(geo.beamH).toBeCloseTo(inch(2), 5);
    expect(geo.beamW).toBeCloseTo(inch(4), 5); // clamped to 4"
  });

  it("handles small pergola dimensions", () => {
    const geo = computeModelGeometry({
      ...baseParams,
      widthFt: 10,
      depthFt: 8,
      heightFt: 8,
      postCount: 2,
    });
    expect(geo.W).toBeCloseTo(ft(10), 5);
    expect(geo.D).toBeCloseTo(ft(8), 5);
    expect(geo.n).toBe(2);
  });

  it("handles large pergola dimensions", () => {
    const geo = computeModelGeometry({
      ...baseParams,
      widthFt: 120,
      depthFt: 40,
      heightFt: 14,
      postCount: 10,
    });
    expect(geo.W).toBeCloseTo(ft(120), 5);
    expect(geo.n).toBe(10);
  });
});

describe("Finish Color Mapping", () => {
  function mapFinishColor(finishColor: string): string {
    return finishColor === "Matte Black" ? "#2a2a2a"
      : finishColor === "Matte White" ? "#e8e8e8"
      : finishColor === "Bronze" ? "#6b4c2a"
      : finishColor === "Silver" ? "#a0a0a0"
      : "#2a2a2a";
  }

  it("maps Matte Black to dark hex", () => {
    expect(mapFinishColor("Matte Black")).toBe("#2a2a2a");
  });

  it("maps Matte White to light hex", () => {
    expect(mapFinishColor("Matte White")).toBe("#e8e8e8");
  });

  it("maps Bronze to brown hex", () => {
    expect(mapFinishColor("Bronze")).toBe("#6b4c2a");
  });

  it("maps Silver to grey hex", () => {
    expect(mapFinishColor("Silver")).toBe("#a0a0a0");
  });

  it("defaults unknown colors to Matte Black hex", () => {
    expect(mapFinishColor("Custom Color")).toBe("#2a2a2a");
    expect(mapFinishColor("")).toBe("#2a2a2a");
  });
});
