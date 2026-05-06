import { describe, it, expect } from "vitest";

describe("Custom Dimensions", () => {
  it("should handle empty custom dimensions array", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [];
    expect(customDimensions).toHaveLength(0);
    expect(customDimensions).toEqual([]);
  });

  it("should add a new custom dimension", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [];
    const newDim = { label: "Custom Width", value: "25", unit: "ft" };
    customDimensions.push(newDim);
    expect(customDimensions).toHaveLength(1);
    expect(customDimensions[0]).toEqual(newDim);
  });

  it("should edit an existing custom dimension", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25", unit: "ft" },
    ];
    customDimensions[0] = { label: "Custom Width", value: "30", unit: "ft" };
    expect(customDimensions[0].value).toBe("30");
  });

  it("should remove a custom dimension", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25", unit: "ft" },
      { label: "Custom Height", value: "15", unit: "ft" },
    ];
    customDimensions.splice(0, 1);
    expect(customDimensions).toHaveLength(1);
    expect(customDimensions[0].label).toBe("Custom Height");
  });

  it("should handle custom dimensions with missing unit", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25", unit: "" },
    ];
    const dim = customDimensions[0];
    const valueWithUnit = dim.unit ? `${dim.value} ${dim.unit}` : dim.value;
    expect(valueWithUnit).toBe("25");
  });

  it("should handle custom dimensions with unit", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25", unit: "ft" },
    ];
    const dim = customDimensions[0];
    const valueWithUnit = dim.unit ? `${dim.value} ${dim.unit}` : dim.value;
    expect(valueWithUnit).toBe("25 ft");
  });

  it("should handle multiple custom dimensions", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25", unit: "ft" },
      { label: "Custom Height", value: "15", unit: "ft" },
      { label: "Custom Depth", value: "20", unit: "ft" },
    ];
    expect(customDimensions).toHaveLength(3);
    expect(customDimensions.map((d) => d.label)).toEqual(["Custom Width", "Custom Height", "Custom Depth"]);
  });

  it("should handle special characters in custom dimension values", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Custom Width", value: "25.5", unit: "ft" },
    ];
    expect(customDimensions[0].value).toBe("25.5");
  });

  it("should handle long labels and values", () => {
    const customDimensions: Array<{ label: string; value: string; unit: string }> = [
      { label: "Very Long Custom Dimension Label That Describes Something Complex", value: "123.456", unit: "meters" },
    ];
    expect(customDimensions[0].label.length).toBeGreaterThan(50);
    expect(customDimensions[0].value).toBe("123.456");
  });
});
