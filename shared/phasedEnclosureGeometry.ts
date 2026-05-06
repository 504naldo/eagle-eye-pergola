// ─── Phased Patio Enclosure — Geometry & QTO ─────────────────────────────────
// This module handles the Milestones-style phased patio enclosure project:
//   Phase 1: Lumon lower glass / railing system (current scope)
//   Phase 2: Louvered pergola roof + upper enclosure (future scope)
//
// IMPORTANT: The city-approved patio drawing is LOCKED and used as reference
// only. This supplemental package does NOT modify the approved drawings.

export type ScopeMode = "phase1Only" | "phase2Only" | "fullBuildout" | "compare";

// ─── Phase 1: Lumon Lower Glass System ───────────────────────────────────────

export interface Phase1Params {
  // Overall patio dimensions
  frontWidthFt: number;       // Total front face width (ft) — 58
  sideDepthFt: number;        // Side depth (ft) — 15.67
  railingHeightFt: number;    // Existing railing height (ft) — 3.5

  // Lumon lower glass panel system
  frontSections: number;      // Number of front sections — 5
  frontSectionWidthFt: number; // Each front section width (ft) — 11.0
  frontGlassHeightFt: number; // Glass panel height (ft) — 3.5 (floor to top of railing)

  // Side panels
  leftSideWidthFt: number;    // Left side width (ft) — 15.17 (wall-mounted, one post)
  rightSideWidthFt: number;   // Right side width (ft) — 15.17
  sideGlassHeightFt: number;  // Side glass panel height (ft) — 3.5

  // Railing integration
  existingRailingRetained: boolean; // Existing railing retained as base
  railingIntegrationNote: string;

  // Design intent
  designedForFutureIntegration: boolean; // Lower system designed for future upper integration
  futureIntegrationNote: string;

  // Finish
  finishColor: string;        // e.g. "Matte Black"

  // Notes
  notes: string;
}

// ─── Phase 2: Louvered Pergola + Upper Enclosure ──────────────────────────────

export interface Phase2Params {
  // Overall structure
  frontWidthFt: number;       // Total front face including posts (ft) — 58
  sideDepthFt: number;        // Total side including posts (ft) — 15.67
  totalUnitHeightFt: number;  // Total unit height including beams (ft) — 8.833 (8'10")

  // Beam & post sizing
  beamSizeIn: number;         // Beam size (in) — 8 or 10
  postSizeIn: number;         // Post size (in) — 6 (6×6)

  // Front face configuration
  frontSections: number;      // Number of front sections — 5
  frontSectionWidthFt: number; // Each front section width (ft) — 11.0
  frontSectionHeightFt: number; // Each front section height (ft) — 8.0

  // Side face configuration
  sideWallMountedWidthFt: number;  // Side width if wall-mounted with one post (ft) — 15.17
  sideBothPostsWidthFt: number;    // Side width if posts on both sides (ft) — 14.67
  totalSideWidthFt: number;        // Total side including posts (ft) — 15.67
  sideHeightFt: number;            // Side section height (ft) — 8.0

  // Louver roof system
  louverSections: number;          // Number of louver sections — 5
  louverSectionWidthFt: number;    // Each louver section width (ft) — 15.0
  louverSectionDepthFt: number;    // Each louver section depth (ft) — 10.0
  beamWithLightsBetweenSections: boolean; // 8" beam with lights between each louver section
  beamLightNote: string;

  // Glass doors — side faces
  escapeDoorsPerSide: number;      // Glass escape doors per side face — 1
  escapeDoorWidthIn: number;       // Escape door width (in) — 32
  latchPostSizeIn: number;         // Latch/strike post size (in) — 3 (3×3)
  remainingSideSlidingGlass: boolean; // Remaining side section uses sliding glass doors
  slidingGlassNote: string;

  // Finish
  finishColor: string;

  // Notes
  notes: string;
}

// ─── Dimensions Summary ───────────────────────────────────────────────────────

export interface DimensionsSummary {
  // Patio overall
  patioFrontWidthFt: number;
  patioDepthFt: number;
  patioAreaSqFt: number;

  // Phase 1 glass areas
  phase1FrontGlassAreaSqFt: number;
  phase1SideGlassAreaSqFt: number;
  phase1TotalGlassAreaSqFt: number;

  // Phase 2 structure
  phase2TotalHeightFt: number;
  phase2LouverAreaSqFt: number;
  phase2FrontGlassAreaSqFt: number;
  phase2SideGlassAreaSqFt: number;
  phase2TotalGlassAreaSqFt: number;
  phase2PostCount: number;
}

// ─── Pricing Inputs ───────────────────────────────────────────────────────────

export interface PricingInputs {
  // Phase 1 unit rates
  phase1GlassRatePerSqFt: number;    // $/sqft for Lumon glass panels
  phase1InstallRatePerSqFt: number;  // $/sqft for installation
  phase1RailingIntegrationFlat: number; // Flat fee for railing integration

  // Phase 2 unit rates
  phase2StructureRatePerSqFt: number; // $/sqft for pergola structure
  phase2LouverRatePerSqFt: number;    // $/sqft for louver system
  phase2GlassRatePerSqFt: number;     // $/sqft for upper glass panels
  phase2InstallRatePerSqFt: number;   // $/sqft for installation

  // Contingency
  contingencyPct: number;             // Contingency % (e.g. 10)
  taxPct: number;                     // Tax % (e.g. 5 for GST)
}

// ─── Field Verification Notes ─────────────────────────────────────────────────

export interface FieldVerificationItem {
  id: string;
  category: string;
  label: string;
  checked: boolean;
  note: string;
}

export interface FieldNotesData {
  items: FieldVerificationItem[];
  generalNotes: string;
  siteContactName: string;
  siteContactPhone: string;
  verificationDate: string;
}

// ─── Full Phased Enclosure Params ─────────────────────────────────────────────

export interface CustomDimension {
  label: string;
  value: string;
  unit: string;
}

export interface PhasedEnclosureData {
  approvedDrawingUrl?: string;
  approvedDrawingFileKey?: string;
  approvedDrawingName?: string;
  approvedDrawingLocked: boolean;
  scopeMode: ScopeMode;
  phase1: Phase1Params;
  phase2: Phase2Params;
  dimensions: DimensionsSummary;
  pricing: PricingInputs;
  fieldNotes: FieldNotesData;
  customDimensions?: CustomDimension[];
}

// ─── Default Milestones Parameters ───────────────────────────────────────────

export function getDefaultMilestonesPhase1(): Phase1Params {
  return {
    frontWidthFt: 58,
    sideDepthFt: 15.67,
    railingHeightFt: 3.5,
    frontSections: 5,
    frontSectionWidthFt: 11.0,
    frontGlassHeightFt: 3.5,
    leftSideWidthFt: 15.17,
    rightSideWidthFt: 15.17,
    sideGlassHeightFt: 3.5,
    existingRailingRetained: true,
    railingIntegrationNote:
      "Existing approved railing to remain in place. Lumon lower glass system to be integrated with existing railing as base track. No modifications to approved railing layout.",
    designedForFutureIntegration: true,
    futureIntegrationNote:
      "Lower Lumon glass system to be designed and installed with future Phase 2 upper pergola integration in mind. Track and post connections to accommodate future upper structure attachment.",
    finishColor: "Matte Black",
    notes:
      "Phase 1 scope is limited to Lumon lower glass / railing system only. No pergola or upper enclosure this year. City-approved patio drawing remains unchanged.",
  };
}

export function getDefaultMilestonesPhase2(): Phase2Params {
  return {
    frontWidthFt: 58,
    sideDepthFt: 15.67,
    totalUnitHeightFt: 8 + 10 / 12, // 8'10" = 8.833 ft
    beamSizeIn: 8,
    postSizeIn: 6,
    frontSections: 5,
    frontSectionWidthFt: 11.0,
    frontSectionHeightFt: 8.0,
    sideWallMountedWidthFt: 15.17,
    sideBothPostsWidthFt: 14.67,
    totalSideWidthFt: 15.67,
    sideHeightFt: 8.0,
    louverSections: 5,
    louverSectionWidthFt: 15.0,
    louverSectionDepthFt: 10.0,
    beamWithLightsBetweenSections: true,
    beamLightNote:
      "8\" beam with integrated LED lighting strip between each louver section (5 beams total across 58 ft front face).",
    escapeDoorsPerSide: 1,
    escapeDoorWidthIn: 32,
    latchPostSizeIn: 3,
    remainingSideSlidingGlass: true,
    slidingGlassNote:
      "Remaining side section (after escape door) to use Lumon sliding glass door system. Coordinate with Phase 1 lower glass track.",
    finishColor: "Matte Black",
    notes:
      "Phase 2 is future scope only — no permit or construction drawings issued at this time. All dimensions are preliminary and subject to field verification and structural engineering review.",
  };
}

export function getDefaultMilestonesFieldNotes(): FieldNotesData {
  return {
    generalNotes:
      "Site visit required prior to Phase 1 fabrication. Verify all existing railing dimensions, anchor points, and slab conditions. Coordinate with Milestones management for access.",
    siteContactName: "Milestones Grill + Bar Management",
    siteContactPhone: "",
    verificationDate: "",
    items: [
      // Existing Conditions
      { id: "ec-01", category: "Existing Conditions", label: "Confirm existing railing dimensions (height, post spacing, post size)", checked: false, note: "" },
      { id: "ec-02", category: "Existing Conditions", label: "Verify concrete slab condition — no cracks, level, no heaving", checked: false, note: "" },
      { id: "ec-03", category: "Existing Conditions", label: "Confirm slab slope direction and drainage path", checked: false, note: "" },
      { id: "ec-04", category: "Existing Conditions", label: "Identify all underground utilities near post locations", checked: false, note: "" },
      { id: "ec-05", category: "Existing Conditions", label: "Confirm building wall attachment points for lean-to connection", checked: false, note: "" },
      // Phase 1 — Lumon System
      { id: "p1-01", category: "Phase 1 — Lumon Glass", label: "Confirm front face total width (target: 58 ft)", checked: false, note: "" },
      { id: "p1-02", category: "Phase 1 — Lumon Glass", label: "Confirm 5 front sections × 11 ft width each", checked: false, note: "" },
      { id: "p1-03", category: "Phase 1 — Lumon Glass", label: "Confirm glass panel height (floor to top of railing: ~3.5 ft)", checked: false, note: "" },
      { id: "p1-04", category: "Phase 1 — Lumon Glass", label: "Confirm side depth: left side ~15 ft 2 in, right side ~15 ft 2 in", checked: false, note: "" },
      { id: "p1-05", category: "Phase 1 — Lumon Glass", label: "Verify railing post spacing matches Lumon track module width", checked: false, note: "" },
      { id: "p1-06", category: "Phase 1 — Lumon Glass", label: "Confirm finish color with client (Matte Black)", checked: false, note: "" },
      // Phase 2 — Future Pergola
      { id: "p2-01", category: "Phase 2 — Future Pergola", label: "Confirm total unit height 8 ft 10 in (including beams)", checked: false, note: "" },
      { id: "p2-02", category: "Phase 2 — Future Pergola", label: "Confirm 6×6 post locations — no conflict with building windows", checked: false, note: "" },
      { id: "p2-03", category: "Phase 2 — Future Pergola", label: "Confirm beam size: 8 in or 10 in (pending structural)", checked: false, note: "" },
      { id: "p2-04", category: "Phase 2 — Future Pergola", label: "Confirm escape door location on each side face (closest to wall)", checked: false, note: "" },
      { id: "p2-05", category: "Phase 2 — Future Pergola", label: "Confirm escape door width: 32 in with handle", checked: false, note: "" },
      { id: "p2-06", category: "Phase 2 — Future Pergola", label: "Confirm 3×3 latch/strike post location", checked: false, note: "" },
      { id: "p2-07", category: "Phase 2 — Future Pergola", label: "Confirm sliding glass door configuration for remaining side section", checked: false, note: "" },
      // Approvals & Permits
      { id: "ap-01", category: "Approvals & Permits", label: "Confirm Phase 1 does NOT require new permit (supplemental to approved drawing)", checked: false, note: "" },
      { id: "ap-02", category: "Approvals & Permits", label: "Confirm Phase 2 will require new permit application (separate process)", checked: false, note: "" },
      { id: "ap-03", category: "Approvals & Permits", label: "Confirm city-approved drawing (McMillan Design, ID101) remains unchanged", checked: false, note: "" },
    ],
  };
}

export function getDefaultMilestonesPricing(): PricingInputs {
  return {
    phase1GlassRatePerSqFt: 85,
    phase1InstallRatePerSqFt: 35,
    phase1RailingIntegrationFlat: 2500,
    phase2StructureRatePerSqFt: 95,
    phase2LouverRatePerSqFt: 110,
    phase2GlassRatePerSqFt: 90,
    phase2InstallRatePerSqFt: 45,
    contingencyPct: 10,
    taxPct: 5,
  };
}

// ─── QTO Calculations ─────────────────────────────────────────────────────────

export interface QTOLineItem {
  description: string;
  qty: number;
  unit: string;
  unitRate: number;
  lineTotal: number;
  phase: "phase1" | "phase2" | "both";
}

export interface PhaseQTO {
  items: QTOLineItem[];
  subtotal: number;
  contingency: number;
  tax: number;
  total: number;
}

export function calculatePhase1QTO(p1: Phase1Params, pricing: PricingInputs): PhaseQTO {
  const frontGlassArea = p1.frontSections * p1.frontSectionWidthFt * p1.frontGlassHeightFt;
  const leftSideArea = p1.leftSideWidthFt * p1.sideGlassHeightFt;
  const rightSideArea = p1.rightSideWidthFt * p1.sideGlassHeightFt;
  const totalGlassArea = frontGlassArea + leftSideArea + rightSideArea;

  const items: QTOLineItem[] = [
    {
      description: "Lumon Lower Glass Panels — Front Face (5 sections × 11 ft × 3.5 ft)",
      qty: Math.round(frontGlassArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase1GlassRatePerSqFt,
      lineTotal: Math.round(frontGlassArea * pricing.phase1GlassRatePerSqFt),
      phase: "phase1",
    },
    {
      description: "Lumon Lower Glass Panels — Left Side Face",
      qty: Math.round(leftSideArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase1GlassRatePerSqFt,
      lineTotal: Math.round(leftSideArea * pricing.phase1GlassRatePerSqFt),
      phase: "phase1",
    },
    {
      description: "Lumon Lower Glass Panels — Right Side Face",
      qty: Math.round(rightSideArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase1GlassRatePerSqFt,
      lineTotal: Math.round(rightSideArea * pricing.phase1GlassRatePerSqFt),
      phase: "phase1",
    },
    {
      description: "Lumon System Installation (labour + track + hardware)",
      qty: Math.round(totalGlassArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase1InstallRatePerSqFt,
      lineTotal: Math.round(totalGlassArea * pricing.phase1InstallRatePerSqFt),
      phase: "phase1",
    },
    {
      description: "Railing Integration — Track Attachment & Coordination (flat)",
      qty: 1,
      unit: "lot",
      unitRate: pricing.phase1RailingIntegrationFlat,
      lineTotal: pricing.phase1RailingIntegrationFlat,
      phase: "phase1",
    },
  ];

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const contingency = Math.round(subtotal * pricing.contingencyPct / 100);
  const tax = Math.round((subtotal + contingency) * pricing.taxPct / 100);
  return { items, subtotal, contingency, tax, total: subtotal + contingency + tax };
}

export function calculatePhase2QTO(p2: Phase2Params, pricing: PricingInputs): PhaseQTO {
  const frontGlassArea = p2.frontSections * p2.frontSectionWidthFt * p2.frontSectionHeightFt;
  const sideGlassArea = 2 * p2.totalSideWidthFt * p2.sideHeightFt;
  const louverArea = p2.louverSections * p2.louverSectionWidthFt * p2.louverSectionDepthFt;
  const structureArea = p2.frontWidthFt * p2.sideDepthFt;

  const items: QTOLineItem[] = [
    {
      description: `Pergola Structure — 6×6 Posts, ${p2.beamSizeIn}" Beams, Ledger Attachment`,
      qty: Math.round(structureArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase2StructureRatePerSqFt,
      lineTotal: Math.round(structureArea * pricing.phase2StructureRatePerSqFt),
      phase: "phase2",
    },
    {
      description: `Louvered Roof System — ${p2.louverSections} sections × ${p2.louverSectionWidthFt} ft × ${p2.louverSectionDepthFt} ft`,
      qty: Math.round(louverArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase2LouverRatePerSqFt,
      lineTotal: Math.round(louverArea * pricing.phase2LouverRatePerSqFt),
      phase: "phase2",
    },
    {
      description: `Upper Glass Panels — Front Face (${p2.frontSections} sections × ${p2.frontSectionWidthFt} ft × ${p2.frontSectionHeightFt} ft)`,
      qty: Math.round(frontGlassArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase2GlassRatePerSqFt,
      lineTotal: Math.round(frontGlassArea * pricing.phase2GlassRatePerSqFt),
      phase: "phase2",
    },
    {
      description: "Upper Glass Panels — Side Faces (both sides, sliding glass + escape doors)",
      qty: Math.round(sideGlassArea * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase2GlassRatePerSqFt,
      lineTotal: Math.round(sideGlassArea * pricing.phase2GlassRatePerSqFt),
      phase: "phase2",
    },
    {
      description: `Escape Doors — ${p2.escapeDoorWidthIn}" glass swing door with 3×3 latch post (2 total, one per side)`,
      qty: 2,
      unit: "ea",
      unitRate: 2800,
      lineTotal: 5600,
      phase: "phase2",
    },
    {
      description: "LED Lighting — Integrated beam strip lights (5 beams × 58 ft)",
      qty: p2.beamWithLightsBetweenSections ? p2.louverSections : 0,
      unit: "lot",
      unitRate: 1800,
      lineTotal: p2.beamWithLightsBetweenSections ? p2.louverSections * 1800 : 0,
      phase: "phase2",
    },
    {
      description: "Phase 2 Installation (labour, crane, site protection)",
      qty: Math.round((structureArea + louverArea) * 10) / 10,
      unit: "sqft",
      unitRate: pricing.phase2InstallRatePerSqFt,
      lineTotal: Math.round((structureArea + louverArea) * pricing.phase2InstallRatePerSqFt),
      phase: "phase2",
    },
  ];

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const contingency = Math.round(subtotal * pricing.contingencyPct / 100);
  const tax = Math.round((subtotal + contingency) * pricing.taxPct / 100);
  return { items, subtotal, contingency, tax, total: subtotal + contingency + tax };
}

export function calculateDimensions(p1: Phase1Params, p2: Phase2Params): DimensionsSummary {
  const patioArea = p1.frontWidthFt * p1.sideDepthFt;
  const phase1FrontGlass = p1.frontSections * p1.frontSectionWidthFt * p1.frontGlassHeightFt;
  const phase1SideGlass = (p1.leftSideWidthFt + p1.rightSideWidthFt) * p1.sideGlassHeightFt;
  const phase2FrontGlass = p2.frontSections * p2.frontSectionWidthFt * p2.frontSectionHeightFt;
  const phase2SideGlass = 2 * p2.totalSideWidthFt * p2.sideHeightFt;
  const louverArea = p2.louverSections * p2.louverSectionWidthFt * p2.louverSectionDepthFt;

  return {
    patioFrontWidthFt: p1.frontWidthFt,
    patioDepthFt: p1.sideDepthFt,
    patioAreaSqFt: Math.round(patioArea * 10) / 10,
    phase1FrontGlassAreaSqFt: Math.round(phase1FrontGlass * 10) / 10,
    phase1SideGlassAreaSqFt: Math.round(phase1SideGlass * 10) / 10,
    phase1TotalGlassAreaSqFt: Math.round((phase1FrontGlass + phase1SideGlass) * 10) / 10,
    phase2TotalHeightFt: p2.totalUnitHeightFt,
    phase2LouverAreaSqFt: Math.round(louverArea * 10) / 10,
    phase2FrontGlassAreaSqFt: Math.round(phase2FrontGlass * 10) / 10,
    phase2SideGlassAreaSqFt: Math.round(phase2SideGlass * 10) / 10,
    phase2TotalGlassAreaSqFt: Math.round((phase2FrontGlass + phase2SideGlass) * 10) / 10,
    phase2PostCount: p2.frontSections + 1 + 2, // front posts + 2 corner posts
  };
}

export function getDefaultMilestonesData(): PhasedEnclosureData {
  const phase1 = getDefaultMilestonesPhase1();
  const phase2 = getDefaultMilestonesPhase2();
  const pricing = getDefaultMilestonesPricing();
  const fieldNotes = getDefaultMilestonesFieldNotes();
  const dimensions = calculateDimensions(phase1, phase2);

  return {
    approvedDrawingLocked: true,
    approvedDrawingName: "McMillan Design — Milestones Proposed Patio (ID101, April 2025)",
    scopeMode: "fullBuildout",
    phase1,
    phase2,
    dimensions,
    pricing,
    fieldNotes,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function ftToFtIn(ft: number): string {
  const feet = Math.floor(ft);
  const inches = Math.round((ft - feet) * 12);
  if (inches === 0) return `${feet} ft`;
  if (inches === 12) return `${feet + 1} ft`;
  return `${feet} ft ${inches} in`;
}

export function sqftToSqm(sqft: number): number {
  return Math.round(sqft * 0.0929 * 100) / 100;
}
