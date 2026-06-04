/**
 * Shared type definitions for the Eagle Eye multi-scope platform.
 * Each module has its own Params interface; all plug into the same package builder.
 */

// ─── Scope Types ─────────────────────────────────────────────────────────────

export type ScopeType = "pergola" | "canopy" | "enclosure" | "fencing" | "lumon";

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
  fencing: {
    label: "Fencing / Security Enclosure",
    description: "Steel SHS-framed welded wire mesh fencing with gate and base plate anchoring",
    icon: "fence",
  },
  lumon: {
    label: "Lumon Glass System",
    description: "Lumon LGS/LGF sliding or fixed glazing system with 160mm railing profile",
    icon: "panels-top-left",
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

// ─── Fencing Module ──────────────────────────────────────────────────────────

export type FencingMeshType = "welded_wire_50x50" | "welded_wire_75x75" | "chain_link" | "solid_panel";
export type FencingAnchorMethod = "base_plate_epoxy" | "core_drill_set" | "surface_mount";
export type FencingFinish = "black_pc" | "galvanised" | "custom_pc";

export interface FencingParams {
  runLengthFt: number;       // total fence run length
  heightFt: number;          // fence height above slab
  postSpacingFt: number;     // centre-to-centre post spacing
  meshType: FencingMeshType;
  frameSectionMm: number;    // SHS section size e.g. 75 = 75×75×3 SHS
  hasGate: boolean;
  gateWidthFt: number;
  gateHeightFt: number;
  finish: FencingFinish;
  anchorMethod: FencingAnchorMethod;
  location: string;          // e.g. "Parkade Level B1"
  clientName: string;
}

export const DEFAULT_FENCING_PARAMS: FencingParams = {
  runLengthFt: 24,
  heightFt: 8,
  postSpacingFt: 4,
  meshType: "welded_wire_50x50",
  frameSectionMm: 75,
  hasGate: true,
  gateWidthFt: 4,
  gateHeightFt: 8,
  finish: "black_pc",
  anchorMethod: "base_plate_epoxy",
  location: "",
  clientName: "",
};

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

// ─── Lumon Glass System Module ────────────────────────────────────────────────

export type LumonSystemType = "LGS" | "LGF" | "mixed";
export type LumonGlassZoneConfig = "single" | "upper_lower";
export type LumonStackingDirection = "left" | "right" | "centre_split";

export interface LumonBay {
  widthMm: number;                    // bay width in mm
  stackingDirection: LumonStackingDirection;
  isFixed: boolean;                   // true = fixed glazing (X pattern), false = sliding
  hasDoor: boolean;                   // door by others
  doorWidthMm: number;                // rough opening width if hasDoor
}

export interface LumonParams {
  // Project context
  projectName: string;
  clientName: string;
  location: string;
  lumonProjectNo: string;             // e.g. "50929123"

  // System type
  systemType: LumonSystemType;

  // Overall geometry
  overallSpanMm: number;              // total system span (mm)
  finishedHeightMm: number;           // FH — top of railing to slab (mm)
  railingProfileMm: number;           // handrail profile depth (mm), typically 160

  // Glass zones
  glassZoneConfig: LumonGlassZoneConfig;
  lowerZoneHeightMm: number;          // lower glass zone height (mm)
  upperZoneHeightMm: number;          // upper glass zone height (mm), 0 if single zone
  glassThicknessMm: number;           // typically 8

  // Bays
  bays: LumonBay[];                   // one entry per bay, left to right

  // Side returns
  hasLeftReturn: boolean;
  leftReturnWidthMm: number;
  hasRightReturn: boolean;
  rightReturnWidthMm: number;

  // Stacking zones
  leftStackingZoneMm: number;         // clear stacking zone at left end
  rightStackingZoneMm: number;        // clear stacking zone at right end

  // Posts
  frontPostSectionMm: number;         // existing front post section (mm), e.g. 152 for 6"×6"
  lumonPostSectionMm: number;         // Lumon 70×70mm posts

  // Anchor
  anchorType: string;                 // e.g. "7.5×75 Multimonti concrete screw"
  anchorEmbedmentMm: number;          // min embedment depth (mm)

  // Finish
  finishColor: string;                // e.g. "Anodised Silver" | "Matte Black"

  // Design criteria
  buildingCode: string;               // e.g. "BCBC 2018"
  windLoadKPa: number;                // design wind load (kPa)
  snowLoadKPa: number;                // design snow load (kPa)
}

export const DEFAULT_LUMON_PARAMS: LumonParams = {
  projectName: "",
  clientName: "",
  location: "",
  lumonProjectNo: "",
  systemType: "LGS",
  overallSpanMm: 18438,               // Milestones default: 60′-6″
  finishedHeightMm: 2750,             // 9′-0″
  railingProfileMm: 160,
  glassZoneConfig: "upper_lower",
  lowerZoneHeightMm: 1375,
  upperZoneHeightMm: 1375,
  glassThicknessMm: 8,
  bays: [
    { widthMm: 4419, stackingDirection: "right",        isFixed: false, hasDoor: false, doorWidthMm: 0 },
    { widthMm: 4419, stackingDirection: "right",        isFixed: false, hasDoor: false, doorWidthMm: 0 },
    { widthMm: 4419, stackingDirection: "left",         isFixed: false, hasDoor: false, doorWidthMm: 0 },
    { widthMm: 4419, stackingDirection: "left",         isFixed: false, hasDoor: false, doorWidthMm: 0 },
  ],
  hasLeftReturn: true,
  leftReturnWidthMm: 1200,
  hasRightReturn: true,
  rightReturnWidthMm: 1200,
  leftStackingZoneMm: 914,            // 3′-0″
  rightStackingZoneMm: 914,
  frontPostSectionMm: 152,            // 6"×6"
  lumonPostSectionMm: 70,
  anchorType: "7.5×75 Multimonti concrete screw",
  anchorEmbedmentMm: 45,
  finishColor: "Anodised Silver",
  buildingCode: "BCBC 2018",
  windLoadKPa: 0.55,
  snowLoadKPa: 1.8,
};
