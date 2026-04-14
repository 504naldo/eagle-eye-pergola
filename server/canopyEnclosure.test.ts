import { describe, it, expect } from "vitest";
import { calculateCanopyQTO, calculateCanopyGrandTotal } from "../shared/canopyGeometry";
import { calculateEnclosureQTO, calculateEnclosureGrandTotal } from "../shared/enclosureGeometry";
import { DEFAULT_CANOPY_PARAMS, DEFAULT_ENCLOSURE_PARAMS } from "../shared/scopeTypes";

describe("Canopy QTO", () => {
  it("returns items for default canopy params", () => {
    const items = calculateCanopyQTO(DEFAULT_CANOPY_PARAMS);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.qty).toBeGreaterThanOrEqual(0);
      expect(item.unitRate).toBeGreaterThan(0);
      // lineTotal may use floor/ceil rather than round; check it's within 1 of qty*rate
      expect(Math.abs(item.lineTotal - item.qty * item.unitRate)).toBeLessThan(1);
    });
  });

  it("grand total equals sum of line totals", () => {
    const items = calculateCanopyQTO(DEFAULT_CANOPY_PARAMS);
    const sum = items.reduce((a, b) => a + b.lineTotal, 0);
    expect(calculateCanopyGrandTotal(items)).toBe(sum);
  });

  it("larger canopy produces higher total than smaller", () => {
    const small = calculateCanopyGrandTotal(calculateCanopyQTO({ ...DEFAULT_CANOPY_PARAMS, widthFt: 10, projectionFt: 8 }));
    const large = calculateCanopyGrandTotal(calculateCanopyQTO({ ...DEFAULT_CANOPY_PARAMS, widthFt: 30, projectionFt: 20 }));
    expect(large).toBeGreaterThan(small);
  });

  it("all items have required fields", () => {
    const items = calculateCanopyQTO(DEFAULT_CANOPY_PARAMS);
    items.forEach(item => {
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("unit");
      expect(item).toHaveProperty("qty");
      expect(item).toHaveProperty("unitRate");
      expect(item).toHaveProperty("lineTotal");
    });
  });
});

describe("Enclosure QTO", () => {
  it("returns items for default enclosure params", () => {
    const items = calculateEnclosureQTO(DEFAULT_ENCLOSURE_PARAMS);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.qty).toBeGreaterThanOrEqual(0);
      expect(item.unitRate).toBeGreaterThan(0);
      // lineTotal may use floor/ceil rather than round; check it's within 1 of qty*rate
      expect(Math.abs(item.lineTotal - item.qty * item.unitRate)).toBeLessThan(1);
    });
  });

  it("grand total equals sum of line totals", () => {
    const items = calculateEnclosureQTO(DEFAULT_ENCLOSURE_PARAMS);
    const sum = items.reduce((a, b) => a + b.lineTotal, 0);
    expect(calculateEnclosureGrandTotal(items)).toBe(sum);
  });

  it("enclosing all 4 faces is more expensive than 1 face", () => {
    const oneFace = calculateEnclosureGrandTotal(calculateEnclosureQTO({
      ...DEFAULT_ENCLOSURE_PARAMS, encloseFront: true, encloseLeft: false, encloseRight: false, encloseRear: false
    }));
    const allFaces = calculateEnclosureGrandTotal(calculateEnclosureQTO({
      ...DEFAULT_ENCLOSURE_PARAMS, encloseFront: true, encloseLeft: true, encloseRight: true, encloseRear: true
    }));
    expect(allFaces).toBeGreaterThan(oneFace);
  });

  it("adding a door increases the total", () => {
    const noDoor = calculateEnclosureGrandTotal(calculateEnclosureQTO({ ...DEFAULT_ENCLOSURE_PARAMS, hasDoor: false }));
    const withDoor = calculateEnclosureGrandTotal(calculateEnclosureQTO({ ...DEFAULT_ENCLOSURE_PARAMS, hasDoor: true }));
    expect(withDoor).toBeGreaterThan(noDoor);
  });

  it("all items have required fields", () => {
    const items = calculateEnclosureQTO(DEFAULT_ENCLOSURE_PARAMS);
    items.forEach(item => {
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("unit");
      expect(item).toHaveProperty("qty");
      expect(item).toHaveProperty("unitRate");
      expect(item).toHaveProperty("lineTotal");
    });
  });
});
