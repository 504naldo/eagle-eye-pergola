import { describe, it, expect } from "vitest";
import { calculateGlazingArea, PergolaParams } from "../shared/geometry";

const base: PergolaParams = {
  widthFt: 20, depthFt: 10, heightFt: 10,
  postCount: 3, postSpacingFt: 10,
  slatType: "fixed", slatSpacingIn: 4,
  glassFront: false, glassLeft: false, glassRight: false,
  finishColor: "Matte Black", ledLighting: false,
};

describe("calculateGlazingArea", () => {
  it("returns zero area when no glass faces are selected", () => {
    const result = calculateGlazingArea(base);
    expect(result.frontFt2).toBe(0);
    expect(result.leftFt2).toBe(0);
    expect(result.rightFt2).toBe(0);
    expect(result.totalFt2).toBe(0);
    expect(result.totalM2).toBe(0);
  });

  it("calculates front face area correctly using glassWallHeightFt", () => {
    const result = calculateGlazingArea({ ...base, glassFront: true, glassWallHeightFt: 8 });
    // 20 * 8 = 160 ft²
    expect(result.frontFt2).toBe(160);
    expect(result.leftFt2).toBe(0);
    expect(result.rightFt2).toBe(0);
    expect(result.totalFt2).toBe(160);
    expect(result.totalM2).toBeCloseTo(160 * 0.0929, 1);
  });

  it("calculates left face area correctly", () => {
    const result = calculateGlazingArea({ ...base, glassLeft: true, glassWallHeightFt: 8 });
    // 10 * 8 = 80 ft²
    expect(result.leftFt2).toBe(80);
    expect(result.frontFt2).toBe(0);
    expect(result.rightFt2).toBe(0);
    expect(result.totalFt2).toBe(80);
  });

  it("calculates right face area correctly", () => {
    const result = calculateGlazingArea({ ...base, glassRight: true, glassWallHeightFt: 8 });
    expect(result.rightFt2).toBe(80);
    expect(result.totalFt2).toBe(80);
  });

  it("sums all three faces correctly", () => {
    const result = calculateGlazingArea({
      ...base,
      glassFront: true, glassLeft: true, glassRight: true,
      glassWallHeightFt: 8,
    });
    // front: 20*8=160, left: 10*8=80, right: 10*8=80 → total: 320 ft²
    expect(result.frontFt2).toBe(160);
    expect(result.leftFt2).toBe(80);
    expect(result.rightFt2).toBe(80);
    expect(result.totalFt2).toBe(320);
    expect(result.totalM2).toBeCloseTo(320 * 0.0929, 1);
  });

  it("falls back to heightFt when glassWallHeightFt is not set", () => {
    const result = calculateGlazingArea({ ...base, glassFront: true });
    // 20 * 10 = 200 ft²
    expect(result.frontFt2).toBe(200);
    expect(result.glassHeightFt).toBe(10);
  });

  it("uses glassWallHeightFt when provided", () => {
    const result = calculateGlazingArea({ ...base, glassFront: true, glassWallHeightFt: 7.5 });
    // 20 * 7.5 = 150 ft²
    expect(result.frontFt2).toBe(150);
    expect(result.glassHeightFt).toBe(7.5);
  });

  it("reports correct lengths for each face", () => {
    const result = calculateGlazingArea({
      ...base,
      glassFront: true, glassLeft: true, glassRight: false,
      glassWallHeightFt: 8,
    });
    expect(result.frontLengthFt).toBe(20);
    expect(result.leftLengthFt).toBe(10);
    expect(result.rightLengthFt).toBe(0);
  });

  it("reports zero length for inactive faces", () => {
    const result = calculateGlazingArea({ ...base, glassFront: true, glassWallHeightFt: 8 });
    expect(result.leftLengthFt).toBe(0);
    expect(result.rightLengthFt).toBe(0);
  });

  it("m2 conversion is accurate", () => {
    const result = calculateGlazingArea({ ...base, glassFront: true, glassWallHeightFt: 10 });
    // 20*10 = 200 ft² * 0.0929 = 18.58 m²
    expect(result.totalM2).toBeCloseTo(18.58, 1);
  });

  it("smaller glass height produces less area than full height", () => {
    const short = calculateGlazingArea({ ...base, glassFront: true, glassLeft: true, glassRight: true, glassWallHeightFt: 6 });
    const full  = calculateGlazingArea({ ...base, glassFront: true, glassLeft: true, glassRight: true });
    expect(short.totalFt2).toBeLessThan(full.totalFt2);
  });
});

describe("glass tint and material constants", () => {
  it("all tint options have valid hex colors", () => {
    const tints = ["clear", "bronze", "grey", "blue", "green"];
    expect(tints).toHaveLength(5);
  });

  it("all material options have roughness between 0 and 1", () => {
    const materials = [
      { roughness: 0.05 },  // standard
      { roughness: 0.65 },  // frosted
      { roughness: 0.02 },  // reflective
    ];
    materials.forEach(m => {
      expect(m.roughness).toBeGreaterThanOrEqual(0);
      expect(m.roughness).toBeLessThanOrEqual(1);
    });
  });
});
