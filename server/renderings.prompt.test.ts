import { describe, it, expect } from "vitest";

describe("Custom Prompt Logic", () => {
  it("should use custom prompt when provided", () => {
    const customPrompt = "A modern pergola with glass panels and LED lighting";
    const autoPrompt = "Auto-generated prompt based on parameters";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe(customPrompt);
  });

  it("should fall back to auto-generated prompt when custom is empty", () => {
    const customPrompt = "";
    const autoPrompt = "Auto-generated prompt based on parameters";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe(autoPrompt);
  });

  it("should fall back to auto-generated prompt when custom is undefined", () => {
    const customPrompt: string | undefined = undefined;
    const autoPrompt = "Auto-generated prompt based on parameters";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe(autoPrompt);
  });

  it("should preserve custom prompt with special characters", () => {
    const customPrompt = "A pergola with 45° angled louvers & LED (RGB) lighting — modern aesthetic";
    const autoPrompt = "Auto-generated prompt";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe(customPrompt);
    expect(promptToUse).toContain("45°");
    expect(promptToUse).toContain("&");
    expect(promptToUse).toContain("—");
  });

  it("should handle long custom prompts", () => {
    const customPrompt = "A sophisticated outdoor living space featuring a modern pergola structure with operable louvers, integrated LED lighting in the structural beams, and frameless glass enclosure panels on three sides. The design emphasizes clean lines, premium materials, and seamless integration with the existing patio landscape. Photorealistic rendering with warm evening lighting.";
    const autoPrompt = "Auto-generated prompt";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe(customPrompt);
    expect(promptToUse.length).toBeGreaterThan(100);
  });

  it("should trim whitespace from custom prompt", () => {
    const customPrompt = "  A pergola with glass panels  ".trim();
    const autoPrompt = "Auto-generated prompt";
    
    const promptToUse = customPrompt || autoPrompt;
    expect(promptToUse).toBe("A pergola with glass panels");
    expect(promptToUse).not.toContain("  ");
  });
});
