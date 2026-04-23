/**
 * Unit tests for AI rendering prompt builder logic.
 * Validates that prompts correctly reflect project parameters and enforce
 * the wall-mounted lean-to constraint (no rear posts).
 */

import { describe, it, expect } from "vitest";

// ─── Inline prompt builder (mirrors routers.ts logic) ────────────────────────
type RenderingStyle = "photorealistic" | "dusk" | "interior" | "aerial";

interface RenderingInput {
  style: RenderingStyle;
  widthFt?: string;
  depthFt?: string;
  heightFt?: string;
  postCount?: number;
  slatType?: string;
  glassFront?: boolean;
  glassLeft?: boolean;
  glassRight?: boolean;
  finishColor?: string;
  ledLighting?: boolean;
  location?: string;
}

function buildRenderingPrompt(input: RenderingInput): string {
  const width = parseFloat(input.widthFt ?? "58") || 58;
  const depth = parseFloat(input.depthFt ?? "15.67") || 15.67;
  const height = parseFloat(input.heightFt ?? "10") || 10;
  const posts = input.postCount ?? 5;
  const finish = input.finishColor ?? "Matte Black";
  const slatDesc =
    input.slatType === "operable"
      ? "motorized operable aluminum louver slats"
      : "fixed aluminum slats";
  const glassZones = [
    input.glassFront ? "front" : null,
    input.glassLeft ? "left side" : null,
    input.glassRight ? "right side" : null,
  ].filter(Boolean);
  const glassDesc =
    glassZones.length > 0
      ? `Lumon frameless glass vertical enclosure panels on the ${glassZones.join(", ")}`
      : "no Lumon panels";
  const ledDesc = input.ledLighting
    ? "integrated LED strip lighting along the beams"
    : "no LED lighting";
  const locationDesc = input.location ? ` located at ${input.location}` : "";

  const stylePrompts: Record<RenderingStyle, string> = {
    photorealistic: `Bright midday sun, clear blue sky, photorealistic architectural photography, shot from a 3/4 angle at eye level showing the front and one side of the pergola. Commercial restaurant patio setting${locationDesc}. People dining in background, soft bokeh.`,
    dusk: `Golden hour dusk lighting, warm amber sky, long shadows. The ${ledDesc} glowing softly. Atmospheric, moody architectural photography. Commercial patio${locationDesc}. Shot from a low 3/4 angle.`,
    interior: `Interior view looking outward from under the pergola canopy. Showing the ${slatDesc} overhead, ${glassDesc} on the sides. Warm interior lighting, tables and chairs visible. Photorealistic interior architectural photography.`,
    aerial: `Aerial bird's-eye view from above and slightly in front, showing the full ${width} ft wide by ${depth} ft deep pergola footprint. Clearly showing the ${slatDesc} roof pattern, ${posts} front posts (no rear posts — wall-mounted lean-to), ${glassDesc}. Photorealistic aerial architectural rendering.`,
  };

  return `Photorealistic architectural rendering of a premium commercial aluminum pergola / patio enclosure system.

Structure: ${width} ft wide x ${depth} ft deep x ${height} ft clear height. Wall-mounted lean-to configuration — ${posts} front posts only, NO rear posts (attached to building wall at rear via concealed ledger). Roof system: ${slatDesc}. ${glassDesc}. Finish: ${finish} powder coat aluminum. ${ledDesc}. Modern, high-end commercial restaurant patio aesthetic.

IMPORTANT: Do NOT include any rear posts or back beams. The rear of the structure is attached directly to the building wall.

${stylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("renderingPromptBuilder", () => {
  it("includes project dimensions in the prompt", () => {
    const prompt = buildRenderingPrompt({
      style: "photorealistic",
      widthFt: "58",
      depthFt: "15.67",
      heightFt: "10",
    });
    expect(prompt).toContain("58 ft wide");
    expect(prompt).toContain("15.67 ft deep");
    expect(prompt).toContain("10 ft clear height");
  });

  it("enforces no-rear-posts constraint in every style", () => {
    const styles: RenderingStyle[] = ["photorealistic", "dusk", "interior", "aerial"];
    for (const style of styles) {
      const prompt = buildRenderingPrompt({ style });
      expect(prompt).toContain("NO rear posts");
      expect(prompt).toContain("Do NOT include any rear posts");
    }
  });

  it("uses operable slat description when slatType is operable", () => {
    const prompt = buildRenderingPrompt({ style: "interior", slatType: "operable" });
    expect(prompt).toContain("motorized operable aluminum louver slats");
    expect(prompt).not.toContain("fixed aluminum slats");
  });

  it("uses fixed slat description by default", () => {
    const prompt = buildRenderingPrompt({ style: "interior" });
    expect(prompt).toContain("fixed aluminum slats");
  });

  it("includes glass zones when specified", () => {
    const prompt = buildRenderingPrompt({
      style: "photorealistic",
      glassFront: true,
      glassLeft: true,
      glassRight: false,
    });
    expect(prompt).toContain("front");
    expect(prompt).toContain("left side");
    expect(prompt).not.toContain("right side");
  });

  it("uses 'no Lumon panels' when all glass is off", () => {
    const prompt = buildRenderingPrompt({
      style: "aerial",
      glassFront: false,
      glassLeft: false,
      glassRight: false,
    });
    expect(prompt).toContain("no Lumon panels");
  });

  it("includes finish color in the prompt", () => {
    const prompt = buildRenderingPrompt({
      style: "photorealistic",
      finishColor: "Sandstone",
    });
    expect(prompt).toContain("Sandstone powder coat aluminum");
  });

  it("defaults to Matte Black finish when not specified", () => {
    const prompt = buildRenderingPrompt({ style: "photorealistic" });
    expect(prompt).toContain("Matte Black powder coat aluminum");
  });

  it("includes LED description in dusk style prompt", () => {
    const withLED = buildRenderingPrompt({ style: "dusk", ledLighting: true });
    expect(withLED).toContain("integrated LED strip lighting along the beams");

    const withoutLED = buildRenderingPrompt({ style: "dusk", ledLighting: false });
    expect(withoutLED).toContain("no LED lighting");
  });

  it("includes location in photorealistic and dusk styles", () => {
    const prompt = buildRenderingPrompt({
      style: "photorealistic",
      location: "Sydney, NSW",
    });
    expect(prompt).toContain("Sydney, NSW");
  });

  it("aerial style includes post count and footprint dimensions", () => {
    const prompt = buildRenderingPrompt({
      style: "aerial",
      widthFt: "40",
      depthFt: "12",
      postCount: 3,
    });
    expect(prompt).toContain("40 ft wide by 12 ft deep");
    expect(prompt).toContain("3 front posts");
  });

  it("falls back to defaults for missing numeric params", () => {
    const prompt = buildRenderingPrompt({ style: "photorealistic" });
    expect(prompt).toContain("58 ft wide");
    expect(prompt).toContain("5 front posts");
  });
});
