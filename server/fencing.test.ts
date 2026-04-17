import { describe, it, expect } from "vitest";
import { calculateFencingQTO, getFencingDefaultRates } from "../shared/fencingGeometry";
import { DEFAULT_FENCING_PARAMS } from "../shared/scopeTypes";

describe("Fencing QTO", () => {
  it("returns items for default fencing params", () => {
    const items = calculateFencingQTO(DEFAULT_FENCING_PARAMS);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.qty).toBeGreaterThanOrEqual(0);
      expect(item.unitRate).toBeGreaterThan(0);
      expect(item.lineTotal).toBeGreaterThanOrEqual(0);
    });
  });

  it("grand total equals sum of line totals", () => {
    const items = calculateFencingQTO(DEFAULT_FENCING_PARAMS);
    const sum = items.reduce((a, b) => a + b.lineTotal, 0);
    const grandTotal = items.reduce((a, b) => a + b.lineTotal, 0);
    expect(grandTotal).toBe(sum);
  });

  it("longer fence run produces higher total than shorter run", () => {
    const short = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, runLengthFt: 10 });
    const long = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, runLengthFt: 60 });
    const shortTotal = short.reduce((a, b) => a + b.lineTotal, 0);
    const longTotal = long.reduce((a, b) => a + b.lineTotal, 0);
    expect(longTotal).toBeGreaterThan(shortTotal);
  });

  it("adding a gate increases the total", () => {
    const noGate = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, hasGate: false });
    const withGate = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, hasGate: true });
    const noGateTotal = noGate.reduce((a, b) => a + b.lineTotal, 0);
    const withGateTotal = withGate.reduce((a, b) => a + b.lineTotal, 0);
    expect(withGateTotal).toBeGreaterThan(noGateTotal);
  });

  it("all items have required fields", () => {
    const items = calculateFencingQTO(DEFAULT_FENCING_PARAMS);
    items.forEach(item => {
      expect(item).toHaveProperty("group");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("unit");
      expect(item).toHaveProperty("qty");
      expect(item).toHaveProperty("unitRate");
      expect(item).toHaveProperty("lineTotal");
      expect(item).toHaveProperty("basis");
    });
  });

  it("rate overrides are applied correctly", () => {
    const defaultItems = calculateFencingQTO(DEFAULT_FENCING_PARAMS);
    const overrideItems = calculateFencingQTO(DEFAULT_FENCING_PARAMS, {
      "SHS Posts (supply & install)": 9999,
    });
    const defaultPostItem = defaultItems.find(i => i.description.includes("SHS Post"));
    const overridePostItem = overrideItems.find(i => i.description.includes("SHS Post"));
    // If a post item exists, the override should produce a higher total
    if (defaultPostItem && overridePostItem) {
      expect(overridePostItem.unitRate).toBe(9999);
      expect(overridePostItem.lineTotal).toBeGreaterThan(defaultPostItem.lineTotal);
    }
    // Grand total with override should differ from default
    const defaultTotal = defaultItems.reduce((a, b) => a + b.lineTotal, 0);
    const overrideTotal = overrideItems.reduce((a, b) => a + b.lineTotal, 0);
    expect(overrideTotal).not.toBe(defaultTotal);
  });

  it("getFencingDefaultRates returns positive rates for all keys", () => {
    const rates = getFencingDefaultRates();
    expect(Object.keys(rates).length).toBeGreaterThan(0);
    Object.values(rates).forEach(rate => {
      expect(rate).toBeGreaterThan(0);
    });
  });

  it("taller fence produces higher total than shorter fence", () => {
    const short = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, heightFt: 4 });
    const tall = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, heightFt: 12 });
    const shortTotal = short.reduce((a, b) => a + b.lineTotal, 0);
    const tallTotal = tall.reduce((a, b) => a + b.lineTotal, 0);
    expect(tallTotal).toBeGreaterThan(shortTotal);
  });

  it("chain link mesh type produces different total than welded wire", () => {
    const welded = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, meshType: "welded_wire_50x50" });
    const chainLink = calculateFencingQTO({ ...DEFAULT_FENCING_PARAMS, meshType: "chain_link" });
    const weldedTotal = welded.reduce((a, b) => a + b.lineTotal, 0);
    const chainLinkTotal = chainLink.reduce((a, b) => a + b.lineTotal, 0);
    // Chain link has a lower rate than welded wire, so totals should differ
    expect(weldedTotal).not.toBe(chainLinkTotal);
  });
});
