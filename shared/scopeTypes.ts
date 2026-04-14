/**
 * Shared type definitions for the Eagle Eye multi-scope platform.
 * Each module has its own Params interface; all plug into the same package builder.
 */

// ─── Scope Types ─────────────────────────────────────────────────────────────

export type ScopeType = "pergola" | "canopy" | "enclosure";

export const SCOPE_MODULE_META: Record<ScopeType, { label: string; description: string; icon: string }> = {
  pergola: {
    label: "Pergola / Shade Structure",
    description: "Louvred or fixed-slat aluminium pergola with optional glass enclosure",
    icon: "grid-2x2",
  },
  canopy: {
    label: "Canopy",
    description: "Wall-mounted or freestanding aluminium canopy with fascia options",
    icon: "tent",
  },
  enclosure: {
    label: "Simple Enclosure",
    description: "Aluminium-framed glass or panel enclosure system",
    icon: "square",
  },
};

// ─── Canopy Module ────────────────────────────────────────────────────────────

export type CanopySupportType = "wall_mounted" | "freestanding" | "suspended";
export type CanopyFasciaStyle = "flat" | "tapered" | "bullnose";
export type CanopyLightingOption = "none" | "led_strip" | "downlights";

export interface CanopyParams {
  widthFt: number;
  projectionFt: number;
  heightFt: number;
  supportType: CanopySupportType;
  fasciaStyle: CanopyFasciaStyle;
  slopeDeg: number; // 0–15 degrees
  finishColor: string;
  lightingOption: CanopyLightingOption;
}

export const DEFAULT_CANOPY_PARAMS: CanopyParams = {
  widthFt: 12,
  projectionFt: 3.5,
  heightFt: 3.2,
  supportType: "wall_mounted",
  fasciaStyle: "flat",
  slopeDeg: 3,
  finishColor: "Matte Black",
  lightingOption: "led_strip",
};

// ─── Simple Enclosure Module ──────────────────────────────────────────────────

export type EnclosureFrameLayout = "single_span" | "modular_grid";
export type EnclosurePanelOption = "glass" | "polycarbonate" | "solid_panel";

export interface EnclosureParams {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  encloseFront: boolean;
  encloseLeft: boolean;
  encloseRight: boolean;
  encloseRear: boolean;
  frameLayout: EnclosureFrameLayout;
  panelOption: EnclosurePanelOption;
  hasDoor: boolean;
  doorWidthFt: number;
  finishColor: string;
}

export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  widthFt: 20,
  depthFt: 12,
  heightFt: 9,
  encloseFront: true,
  encloseLeft: true,
  encloseRight: true,
  encloseRear: false,
  frameLayout: "single_span",
  panelOption: "glass",
  hasDoor: true,
  doorWidthFt: 3,
  finishColor: "Matte Black",
};
