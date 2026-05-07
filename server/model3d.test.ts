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

// ─── Marker position math (mirrors ModelViewer3D conflict detection) ──────────

interface EgressMarker {
  xFraction: number;
  widthFt?: number;
  label?: string;
}
interface ServingStationMarker {
  xFraction: number;
  widthFt?: number;
  label?: string;
}

/**
 * Compute the center X position of a marker in feet (relative to pergola center).
 * widthFt is the total pergola width.
 */
function markerCenterX(xFraction: number, widthFt: number): number {
  return -widthFt / 2 + xFraction * widthFt;
}

/**
 * Detect stacking zone conflicts for a set of markers.
 * Stacking zones occupy 3ft at each end of the glass wall.
 * Returns an array of conflicting marker labels.
 */
function detectStackingConflicts(
  widthFt: number,
  egressMarkers: EgressMarker[],
  servingStations: ServingStationMarker[],
  stackZoneW = 3
): string[] {
  const halfW = widthFt / 2;
  const conflicts: string[] = [];
  const checkMarker = (xFraction: number, mWidthFt: number, label: string) => {
    const cx = -halfW + xFraction * widthFt;
    const left = cx - mWidthFt / 2;
    const right = cx + mWidthFt / 2;
    const leftZoneRight = -halfW + stackZoneW;
    const rightZoneLeft = halfW - stackZoneW;
    if (left < leftZoneRight || right > rightZoneLeft) {
      conflicts.push(label);
    }
  };
  egressMarkers.forEach((m, i) =>
    checkMarker(m.xFraction, m.widthFt ?? 3, m.label ?? `Egress ${i + 1}`)
  );
  servingStations.forEach((m, i) =>
    checkMarker(m.xFraction, m.widthFt ?? 4, m.label ?? `Serving ${i + 1}`)
  );
  return conflicts;
}

describe("Marker Position Math", () => {
  const widthFt = 58;

  it("positions marker at left end when xFraction=0", () => {
    const cx = markerCenterX(0, widthFt);
    expect(cx).toBeCloseTo(-29, 3);
  });

  it("positions marker at right end when xFraction=1", () => {
    const cx = markerCenterX(1, widthFt);
    expect(cx).toBeCloseTo(29, 3);
  });

  it("positions marker at center when xFraction=0.5", () => {
    const cx = markerCenterX(0.5, widthFt);
    expect(cx).toBeCloseTo(0, 3);
  });

  it("positions egress 1 at 25% (≈14.5ft from left end)", () => {
    const cx = markerCenterX(0.25, widthFt);
    expect(cx).toBeCloseTo(-14.5, 1); // -29 + 0.25*58 = -29 + 14.5 = -14.5
  });

  it("positions egress 2 at 75% (≈14.5ft from right end)", () => {
    const cx = markerCenterX(0.75, widthFt);
    expect(cx).toBeCloseTo(14.5, 1); // -29 + 0.75*58 = -29 + 43.5 = 14.5
  });

  it("handles fractional widths correctly", () => {
    const cx = markerCenterX(0.5, 20);
    expect(cx).toBeCloseTo(0, 5);
    const cx2 = markerCenterX(0.25, 20);
    expect(cx2).toBeCloseTo(-5, 5);
  });
});

describe("Stacking Zone Conflict Detection", () => {
  const widthFt = 58; // Milestones project

  it("returns no conflicts when markers are in the clear center zone", () => {
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0.25, widthFt: 3, label: "Egress 1" }],
      [{ xFraction: 0.5, widthFt: 4, label: "Serving Station" }]
    );
    expect(conflicts).toHaveLength(0);
  });

  it("detects conflict when egress door overlaps left stacking zone", () => {
    // xFraction=0.05 → cx = -29 + 0.05*58 = -29 + 2.9 = -26.1
    // left edge = -26.1 - 1.5 = -27.6, leftZoneRight = -29 + 3 = -26
    // -27.6 < -26 → conflict
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0.05, widthFt: 3, label: "Egress Near Left" }],
      []
    );
    expect(conflicts).toContain("Egress Near Left");
  });

  it("detects conflict when egress door overlaps right stacking zone", () => {
    // xFraction=0.95 → cx = -29 + 0.95*58 = -29 + 55.1 = 26.1
    // right edge = 26.1 + 1.5 = 27.6, rightZoneLeft = 29 - 3 = 26
    // 27.6 > 26 → conflict
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0.95, widthFt: 3, label: "Egress Near Right" }],
      []
    );
    expect(conflicts).toContain("Egress Near Right");
  });

  it("detects conflict when marker is exactly at the stacking zone boundary", () => {
    // xFraction=0 → cx = -29, left = -29 - 1.5 = -30.5, leftZoneRight = -26
    // -30.5 < -26 → conflict
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0, widthFt: 3, label: "Egress At Left End" }],
      []
    );
    expect(conflicts).toContain("Egress At Left End");
  });

  it("returns no conflicts for center serving station on 58ft span", () => {
    const conflicts = detectStackingConflicts(
      widthFt,
      [],
      [{ xFraction: 0.5, widthFt: 4, label: "Serving Station" }]
    );
    expect(conflicts).toHaveLength(0);
  });

  it("returns no conflicts when there are no markers", () => {
    const conflicts = detectStackingConflicts(widthFt, [], []);
    expect(conflicts).toHaveLength(0);
  });

  it("returns multiple conflicts when multiple markers overlap stacking zones", () => {
    const conflicts = detectStackingConflicts(
      widthFt,
      [
        { xFraction: 0.02, widthFt: 3, label: "Egress 1" },
        { xFraction: 0.98, widthFt: 3, label: "Egress 2" },
      ],
      []
    );
    expect(conflicts).toHaveLength(2);
    expect(conflicts).toContain("Egress 1");
    expect(conflicts).toContain("Egress 2");
  });

  it("uses default label when label is not provided", () => {
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0.02, widthFt: 3 }],
      []
    );
    expect(conflicts).toContain("Egress 1");
  });

  it("uses default widthFt of 3ft for egress markers", () => {
    // xFraction=0.05 → cx=-26.1, left=-26.1-1.5=-27.6 < leftZoneRight=-26 → conflict
    const conflicts = detectStackingConflicts(
      widthFt,
      [{ xFraction: 0.05, label: "Egress No Width" }],
      []
    );
    expect(conflicts).toContain("Egress No Width");
  });

  it("uses default widthFt of 4ft for serving station markers", () => {
    // xFraction=0.5 → cx=0, left=-2, right=2 — well inside the clear zone on 58ft span
    const conflicts = detectStackingConflicts(
      widthFt,
      [],
      [{ xFraction: 0.5, label: "Serving No Width" }]
    );
    expect(conflicts).toHaveLength(0);
  });

  it("detects conflict on a narrow 20ft span where stacking zones cover 30% each end", () => {
    // On 20ft span, stacking zones are 3ft each end (15% each)
    // xFraction=0.1 → cx = -10 + 0.1*20 = -10 + 2 = -8
    // left = -8 - 1.5 = -9.5, leftZoneRight = -10 + 3 = -7
    // -9.5 < -7 → conflict
    const conflicts = detectStackingConflicts(
      20,
      [{ xFraction: 0.1, widthFt: 3, label: "Egress Narrow" }],
      []
    );
    expect(conflicts).toContain("Egress Narrow");
  });
});
