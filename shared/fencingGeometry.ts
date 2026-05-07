/**
 * Eagle Eye — Fencing Module Geometry
 * Construction-grade SVG drawing package for steel SHS-framed
 * welded wire mesh fencing / secured bicycle room enclosure.
 *
 * Sheet set:
 *   S-01  Cover Sheet (generated in pdfExport.ts)
 *   S-02  General Notes
 *   S-03  Existing Conditions Plan
 *   S-04  Proposed Floor Plan
 *   S-05  Front Elevation
 *   S-06  Left Side Elevation
 *   S-07  Right Side Elevation
 *   S-08  Overhead Clearance Diagram
 *   S-09  Construction Details (base plate, end post, panel, door jamb, latch, top rail, column termination)
 *   S-10  Material / Component Schedule
 *   S-11  Door & Hardware Schedule
 *   S-12  Site Measurement / Field Verification Sheet
 */

import type { FencingParams } from "./scopeTypes";

// ─── Unit Conversion ──────────────────────────────────────────────────────────

const ftToM = (ft: number) => ft * 0.3048;

// ─── QTO Item ─────────────────────────────────────────────────────────────────

export interface FencingQTOItem {
  lineKey?: string;
  description: string;
  qty: number;
  unit: string;
  unitRate: number;
  lineTotal: number;
  basis: string;
  group: string;
}

// ─── Default Unit Rates ───────────────────────────────────────────────────────

export function getFencingDefaultRates(): Record<string, number> {
  return {
    "SHS Posts (supply & install)": 420,
    "Top/Bottom/Mid Rails (SHS)": 95,
    "Welded Wire Mesh Infill": 85,
    "Chain Link Mesh Infill": 55,
    "Solid Panel Infill": 145,
    "Base Plate Fabrication & Epoxy Anchors": 185,
    "Core Drill & Set Anchors": 220,
    "Surface Mount Brackets": 160,
    "Gate Frame (supply & install)": 1450,
    "Gate Hardware (hinges, latch, lock prep)": 380,
    "Powder Coat Finish — Black": 55,
    "Galvanised Finish": 35,
    "Custom PC Colour": 70,
    "Mobilisation & Site Setup": 1,
    "Preliminary Budget Allowance": 1,
  };
}

// ─── QTO Calculation ──────────────────────────────────────────────────────────

export function calculateFencingQTO(
  p: FencingParams,
  rateOverrides: Record<string, number> = {}
): FencingQTOItem[] {
  if (!(p.runLengthFt > 0)) throw new Error("runLengthFt must be greater than 0");
  if (!(p.heightFt > 0)) throw new Error("heightFt must be greater than 0");
  if (!(p.postSpacingFt > 0)) throw new Error("postSpacingFt must be greater than 0");

  const defaults = getFencingDefaultRates();
  const rate = (desc: string) => rateOverrides[desc] ?? defaults[desc] ?? 0;

  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const postSpacingM = ftToM(p.postSpacingFt);
  const gateWidthM = ftToM(p.gateWidthFt);

  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const intermediatePostCount = Math.max(0, Math.ceil(fenceRunWithoutGate / postSpacingM) - 1);
  const gatePostCount = p.hasGate ? 2 : 0;
  const totalPosts = intermediatePostCount + gatePostCount + 2;

  const railRunM = fenceRunWithoutGate;
  const railLm = railRunM * 3;
  const meshArea = fenceRunWithoutGate * heightM;
  const anchorCount = totalPosts;

  const postSurfaceArea = totalPosts * (4 * (p.frameSectionMm / 1000) * heightM);
  const railSurfaceArea = railLm * 4 * (p.frameSectionMm / 1000);
  const finishArea = postSurfaceArea + railSurfaceArea + meshArea;

  const items: FencingQTOItem[] = [];

  const add = (description: string, qty: number, unit: string, basis: string, group: string) => {
    const unitRate = rate(description);
    items.push({
      lineKey: `${group}:${description}`,
      description,
      qty: Math.round(qty * 100) / 100,
      unit,
      unitRate,
      lineTotal: Math.round(qty * unitRate * 100) / 100,
      basis,
      group,
    });
  };

  add("SHS Posts (supply & install)", totalPosts, "ea",
    `${totalPosts} posts (${intermediatePostCount} intermediate + ${gatePostCount} gate + 2 end) @ ${p.postSpacingFt}ft c/c`,
    "Structural Frame");
  add("Top/Bottom/Mid Rails (SHS)", Math.round(railLm * 10) / 10, "lm",
    `3 rails × ${Math.round(railRunM * 10) / 10}m run (excl. gate)`, "Structural Frame");

  const meshDesc = p.meshType === "welded_wire_50x50" || p.meshType === "welded_wire_75x75"
    ? "Welded Wire Mesh Infill"
    : p.meshType === "chain_link" ? "Chain Link Mesh Infill" : "Solid Panel Infill";
  add(meshDesc, Math.round(meshArea * 100) / 100, "m²",
    `${Math.round(fenceRunWithoutGate * 100) / 100}m × ${Math.round(heightM * 100) / 100}m (excl. gate)`, "Infill");

  const anchorDesc = p.anchorMethod === "base_plate_epoxy"
    ? "Base Plate Fabrication & Epoxy Anchors"
    : p.anchorMethod === "core_drill_set" ? "Core Drill & Set Anchors" : "Surface Mount Brackets";
  add(anchorDesc, anchorCount, "ea", `1 per post × ${anchorCount} posts`, "Anchoring");

  if (p.hasGate) {
    add("Gate Frame (supply & install)", 1, "ea",
      `Single swing gate ~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H`, "Gate");
    add("Gate Hardware (hinges, latch, lock prep)", 1, "ea",
      "HD hinges × 2, drop latch, padlock hasp", "Gate");
  }

  const finishDesc = p.finish === "black_pc" ? "Powder Coat Finish — Black"
    : p.finish === "galvanised" ? "Galvanised Finish" : "Custom PC Colour";
  add(finishDesc, Math.round(finishArea * 100) / 100, "m²",
    "Posts + rails + mesh surface area", "Finish");

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  add("Mobilisation & Site Setup", 1, "ls", "Allow", "Preliminaries");
  const mobItem = items[items.length - 1];
  const mobRate = Math.round(subtotal * 0.05);
  mobItem.unitRate = mobRate; mobItem.lineTotal = mobRate;

  add("Preliminary Budget Allowance", 1, "ls", "10% contingency on subtotal", "Preliminaries");
  const contItem = items[items.length - 1];
  const contRate = Math.round((subtotal + mobRate) * 0.10);
  contItem.unitRate = contRate; contItem.lineTotal = contRate;

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG DRAWING ENGINE — CONSTRUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════════

const GOLD = "#C9A84C";
const DARK = "#111111";
const MID = "#444444";
const GREY = "#777777";
const LIGHT = "#EEEEEE";
const RED = "#CC2200";
const BLUE = "#1A4A8A";
const WHITE = "#FFFFFF";
const SLAB_FILL = "#D8D8D8";
const MESH_WIRE = "#555555";

// ─── Shared: Title Block ──────────────────────────────────────────────────────

function titleBlock(
  W: number, H: number,
  projectName: string,
  sheetTitle: string,
  sheetNo: string,
  scale: string,
  issueDate: string
): string {
  const tbH = 72;
  const tbY = H - tbH;
  return `
  <!-- Title Block -->
  <rect x="0" y="${tbY}" width="${W}" height="${tbH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Left: company -->
  <rect x="0" y="${tbY}" width="220" height="${tbH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.5"/>
  <text x="12" y="${tbY + 18}" font-size="11" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">EAGLE EYE MANAGEMENT SERVICES</text>
  <text x="12" y="${tbY + 32}" font-size="8" fill="#AAAAAA" font-family="Arial,sans-serif">ESTIMATING &amp; DESIGN-BUILD COORDINATION</text>
  <text x="12" y="${tbY + 46}" font-size="7" fill="#888888" font-family="Arial,sans-serif">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>
  <text x="12" y="${tbY + 58}" font-size="7" fill="#888888" font-family="Arial,sans-serif">ALL DIMENSIONS REQUIRE FIELD VERIFICATION</text>
  <!-- Centre: project + sheet title -->
  <rect x="220" y="${tbY}" width="${W - 440}" height="${tbH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.5"/>
  <text x="${220 + (W - 440) / 2}" y="${tbY + 20}" font-size="10" font-weight="bold" fill="${WHITE}" text-anchor="middle" font-family="Arial,sans-serif">${projectName}</text>
  <text x="${220 + (W - 440) / 2}" y="${tbY + 36}" font-size="9" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">${sheetTitle}</text>
  <line x1="220" y1="${tbY + 42}" x2="${W - 220}" y2="${tbY + 42}" stroke="${GOLD}" stroke-width="0.5"/>
  <text x="${220 + (W - 440) / 2}" y="${tbY + 54}" font-size="7.5" fill="#AAAAAA" text-anchor="middle" font-family="Arial,sans-serif">SCALE: ${scale}    |    ISSUED: ${issueDate}</text>
  <text x="${220 + (W - 440) / 2}" y="${tbY + 66}" font-size="7" fill="#888888" text-anchor="middle" font-family="Arial,sans-serif">DRAWN: RD    CHECKED: —    REV: 0</text>
  <!-- Right: sheet number -->
  <rect x="${W - 220}" y="${tbY}" width="220" height="${tbH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.5"/>
  <text x="${W - 110}" y="${tbY + 28}" font-size="28" font-weight="bold" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">${sheetNo}</text>
  <text x="${W - 110}" y="${tbY + 50}" font-size="8" fill="#AAAAAA" text-anchor="middle" font-family="Arial,sans-serif">SHEET NO.</text>
  <text x="${W - 110}" y="${tbY + 64}" font-size="7" fill="#888888" text-anchor="middle" font-family="Arial,sans-serif">EAGLE EYE © ${new Date().getFullYear()}</text>`;
}

// ─── Shared: Drawing border ───────────────────────────────────────────────────

function drawingBorder(W: number, H: number, tbH = 72): string {
  const margin = 20;
  return `
  <rect width="${W}" height="${H}" fill="${WHITE}"/>
  <!-- Outer border -->
  <rect x="${margin}" y="${margin}" width="${W - 2 * margin}" height="${H - 2 * margin - tbH + 4}" fill="${WHITE}" stroke="${DARK}" stroke-width="2"/>
  <!-- Inner margin line -->
  <rect x="${margin + 6}" y="${margin + 6}" width="${W - 2 * (margin + 6)}" height="${H - 2 * (margin + 6) - tbH + 4}" fill="none" stroke="${GOLD}" stroke-width="0.5"/>`;
}

// ─── Shared: Sheet heading ────────────────────────────────────────────────────

function sheetHeading(W: number, title: string, subtitle: string, sheetNo: string): string {
  return `
  <!-- Sheet heading -->
  <rect x="26" y="26" width="${W - 52}" height="36" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>
  <text x="40" y="49" font-size="14" font-weight="bold" fill="${WHITE}" font-family="Arial,sans-serif">${title}</text>
  <text x="${W - 40}" y="49" font-size="11" fill="${GOLD}" text-anchor="end" font-family="Arial,sans-serif">${sheetNo}</text>
  <text x="${W / 2}" y="76" font-size="9" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">${subtitle}</text>`;
}

// ─── Shared: Dimension line ───────────────────────────────────────────────────

function dimH(x1: number, x2: number, y: number, label: string, tickH = 8): string {
  const mx = (x1 + x2) / 2;
  return `
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${GOLD}" stroke-width="1" marker-start="url(#arrowL)" marker-end="url(#arrowR)"/>
  <line x1="${x1}" y1="${y - tickH}" x2="${x1}" y2="${y + tickH}" stroke="${GOLD}" stroke-width="0.8"/>
  <line x1="${x2}" y1="${y - tickH}" x2="${x2}" y2="${y + tickH}" stroke="${GOLD}" stroke-width="0.8"/>
  <text x="${mx}" y="${y - 5}" font-size="8.5" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">${label}</text>`;
}

function dimV(x: number, y1: number, y2: number, label: string, tickW = 8): string {
  const my = (y1 + y2) / 2;
  return `
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${GOLD}" stroke-width="1"/>
  <line x1="${x - tickW}" y1="${y1}" x2="${x + tickW}" y2="${y1}" stroke="${GOLD}" stroke-width="0.8"/>
  <line x1="${x - tickW}" y1="${y2}" x2="${x + tickW}" y2="${y2}" stroke="${GOLD}" stroke-width="0.8"/>
  <text x="${x + 6}" y="${my + 4}" font-size="8.5" fill="${GOLD}" font-family="Arial,sans-serif">${label}</text>`;
}

// ─── Shared: Leader note ──────────────────────────────────────────────────────

function leader(x1: number, y1: number, x2: number, y2: number, note: string, noteSize = 7.5): string {
  return `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${MID}" stroke-width="0.8"/>
  <circle cx="${x1}" cy="${y1}" r="2" fill="${MID}"/>
  <text x="${x2 + 3}" y="${y2 + 4}" font-size="${noteSize}" fill="${MID}" font-family="Arial,sans-serif">${note}</text>`;
}

// ─── Shared: Keynote bubble ───────────────────────────────────────────────────

function keynote(cx: number, cy: number, num: string | number): string {
  return `
  <circle cx="${cx}" cy="${cy}" r="9" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <text x="${cx}" y="${cy + 4}" font-size="8" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">${num}</text>`;
}

// ─── Shared: Mesh hatch ───────────────────────────────────────────────────────

function meshHatch(id: string, x: number, y: number, w: number, h: number, cell = 10): string {
  return `
  <defs>
    <pattern id="${id}" x="${x}" y="${y}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
      <rect width="${cell}" height="${cell}" fill="#F0F0F0"/>
      <line x1="0" y1="0" x2="0" y2="${cell}" stroke="${MESH_WIRE}" stroke-width="1.2"/>
      <line x1="0" y1="0" x2="${cell}" y2="0" stroke="${MESH_WIRE}" stroke-width="1.2"/>
    </pattern>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" stroke="${DARK}" stroke-width="1.5"/>`;
}

// ─── Shared: Concrete hatch ───────────────────────────────────────────────────

function concreteHatch(id: string, x: number, y: number, w: number, h: number): string {
  return `
  <defs>
    <pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="${SLAB_FILL}"/>
      <line x1="0" y1="12" x2="12" y2="0" stroke="#BBBBBB" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" stroke="${DARK}" stroke-width="2"/>`;
}

// ─── Shared: Arrow markers defs ───────────────────────────────────────────────

const ARROW_DEFS = `
  <defs>
    <marker id="arrowL" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
      <path d="M6,0 L0,3 L6,6" fill="none" stroke="${GOLD}" stroke-width="1"/>
    </marker>
    <marker id="arrowR" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6" fill="none" stroke="${GOLD}" stroke-width="1"/>
    </marker>
  </defs>`;

// ─── Shared: SVG wrapper ──────────────────────────────────────────────────────

function svgWrap(W: number, H: number, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial,sans-serif">
${ARROW_DEFS}
${content}
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-02  GENERAL NOTES SHEET
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingGeneralNotes(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");
  const finishLabel = p.finish === "black_pc" ? "Powder Coat Black (RAL 9005 or equal)"
    : p.finish === "galvanised" ? "Hot-Dip Galvanised to AS/NZS 4680"
    : "Custom Powder Coat Colour (confirm with owner)";

  const col1 = 46, col2 = 570;
  const lineH = 15;

  function section(x: number, y: number, title: string, lines: string[]): string {
    let out = `<rect x="${x}" y="${y}" width="490" height="${18 + lines.length * lineH + 8}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>`;
    out += `<rect x="${x}" y="${y}" width="490" height="20" fill="${DARK}" rx="2"/>`;
    out += `<text x="${x + 8}" y="${y + 14}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">${title}</text>`;
    lines.forEach((line, i) => {
      out += `<text x="${x + 8}" y="${y + 32 + i * lineH}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">${line}</text>`;
    });
    return out;
  }

  const s1 = section(col1, 100, "1.0  SCOPE OF WORK", [
    "1.1  Supply and install a 4-sided secured bicycle room enclosure within an existing underground parkade stall.",
    `1.2  Enclosure framing: ${p.frameSectionMm}×${p.frameSectionMm}×3 SHS steel posts and rails, powder-coated black.`,
    `1.3  Infill: ${p.meshType.replace(/_/g, " ").toUpperCase()} mesh panels, welded to frame.`,
    `1.4  Finish: ${finishLabel}.`,
    `1.5  Anchoring: ${p.anchorMethod.replace(/_/g, " ").toUpperCase()} — confirm slab thickness and rebar layout prior to drilling.`,
    p.hasGate
      ? `1.6  Access: One (1) full-height security door, ~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H, with HD hinges, drop latch, and padlock hasp.`
      : "1.6  No gate included in this scope — access via adjacent opening.",
    "1.7  Remove and dispose of existing visitor parking designation markings at this stall.",
    "1.8  Protect all existing structure, services, and finishes during construction.",
  ]);

  const s2 = section(col1, 100 + 18 + 8 * lineH + 24, "2.0  FIELD VERIFICATION REQUIREMENTS", [
    "2.1  ALL dimensions shown are preliminary and based on site photos. VERIFY ALL DIMENSIONS ON SITE prior to fabrication.",
    "2.2  Contractor to perform a full field measure prior to shop drawing submission.",
    "2.3  Confirm wall-to-wall width, enclosure depth, and clear height to lowest overhead obstruction.",
    "2.4  Confirm slab thickness, condition, and rebar layout at all anchor locations before drilling.",
    "2.5  Confirm location and clearance of yellow cabinet and any adjacent services.",
    "2.6  Confirm overhead duct, pipe, and sprinkler positions. Coordinate with building management.",
    "2.7  Identify and mark all existing underground services before any slab penetration.",
    "2.8  Report any discrepancies between drawings and site conditions to Eagle Eye before proceeding.",
  ]);

  const s3 = section(col2, 100, "3.0  CONTRACTOR COORDINATION", [
    "3.1  Contractor is responsible for obtaining all required permits and strata approvals.",
    "3.2  Coordinate with building management for site access, working hours, and noise restrictions.",
    "3.3  Coordinate with mechanical, electrical, and fire protection trades before installation.",
    "3.4  Do not obstruct fire egress paths, sprinkler coverage, or emergency lighting.",
    "3.5  Confirm fire sprinkler head locations. Enclosure top may require sprinkler relocation — confirm with AHJ.",
    "3.6  All work to comply with applicable local building codes, fire codes, and strata bylaws.",
    "3.7  Provide shop drawings and material submittals for owner/consultant review prior to fabrication.",
    "3.8  Provide as-built drawings upon project completion.",
  ]);

  const s4 = section(col2, 100 + 18 + 8 * lineH + 24, "4.0  FINISH & MATERIAL REQUIREMENTS", [
    `4.1  All steel framing to be ${finishLabel}.`,
    "4.2  Minimum powder coat thickness: 60–80 microns DFT. Confirm with applicator.",
    "4.3  All welds to be ground smooth before finishing. No sharp edges or burrs.",
    "4.4  Mesh panels to be factory-welded and finished before delivery.",
    "4.5  All hardware (hinges, latch, lock, anchors) to be stainless steel or hot-dip galvanised.",
    "4.6  Touch-up all field welds and damaged coating with matching paint pen or cold galv compound.",
    "4.7  Confirm finish colour with owner before ordering. Standard: RAL 9005 Jet Black.",
    "4.8  Underground parkade environment — use corrosion-resistant fasteners throughout.",
  ]);

  const s5 = section(col1, 100 + 2 * (18 + 8 * lineH + 24), "5.0  DIMENSIONAL & FABRICATION NOTES", [
    "5.1  Final fabrication dimensions are subject to field measure. Do not fabricate from these drawings.",
    "5.2  Allow for construction tolerances: ±5mm on post spacing, ±3mm on panel dimensions.",
    "5.3  Post base plates to be set level. Shim as required. Grout base plates after anchor cure.",
    "5.4  All posts to be plumb to within 2mm per metre of height.",
    "5.5  Panel frames to be square and true. Diagonal tolerance: ±3mm.",
    "5.6  All dimensions shown as VERIFY ON SITE must be confirmed before ordering material.",
    "5.7  Contractor to allow for minor slab irregularities in base plate design.",
  ]);

  const s6 = section(col2, 100 + 2 * (18 + 8 * lineH + 24), "6.0  GENERAL NOTES", [
    "6.1  These drawings are issued for pricing, coordination, and permit purposes only.",
    "6.2  Do not scale drawings. Use written dimensions only.",
    "6.3  All existing conditions are to be verified prior to installation.",
    "6.4  Protect existing concrete structure and services during all operations.",
    "6.5  Remove all construction debris and clean site upon completion.",
    "6.6  Provide owner with all warranty documentation for materials and workmanship.",
    "6.7  Minimum 2-year workmanship warranty required.",
    "6.8  Eagle Eye Management Services is not responsible for field conditions not disclosed prior to tender.",
  ]);

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "GENERAL NOTES", "Project: Secured Bicycle Room Enclosure — Parkade Conversion", "S-02")}
  ${s1}${s2}${s3}${s4}${s5}${s6}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "GENERAL NOTES", "S-02", "NTS", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-03  EXISTING CONDITIONS PLAN
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingExistingConditions(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  // Drawing area
  const DX = 80, DY = 100, DW = 700, DH = 560;
  const scale = Math.min(DW / (ftToM(p.runLengthFt) + 4), DH / (ftToM(p.runLengthFt) * 0.8 + 4));
  const stallW = ftToM(p.runLengthFt) * scale;
  const stallD = Math.min(ftToM(p.runLengthFt) * 0.7, 5.5) * scale;
  const ox = DX + (DW - stallW) / 2;
  const oy = DY + (DH - stallD) / 2 - 40;

  const wallT = 20;
  const colW = 40;

  const leftWall = concreteHatch("cwL", ox - wallT - 2, oy - 20, wallT, stallD + 60);
  const rightCol = concreteHatch("cwR", ox + stallW + 2, oy - 20, colW, stallD + 60);
  const rearWall = concreteHatch("cwB", ox - wallT - 2, oy - 20, stallW + wallT + colW + 4, wallT);

  // Stall floor
  const stallFloor = `<rect x="${ox}" y="${oy}" width="${stallW}" height="${stallD}" fill="#F5F5F0" stroke="${DARK}" stroke-width="1.5" stroke-dasharray="8,4"/>`;

  // Stall lines (parking bay markings)
  const stallLines = `
  <line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + stallD}" stroke="${BLUE}" stroke-width="2"/>
  <line x1="${ox + stallW}" y1="${oy}" x2="${ox + stallW}" y2="${oy + stallD}" stroke="${BLUE}" stroke-width="2"/>`;

  // Yellow cabinet
  const cabW = 60, cabH = 40;
  const cabX = ox + stallW - cabW - 10;
  const cabY = oy + stallD - cabH - 10;
  const cabinet = `
  <rect x="${cabX}" y="${cabY}" width="${cabW}" height="${cabH}" fill="#FFD700" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${cabX + cabW / 2}" y="${cabY + cabH / 2 + 4}" font-size="7" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">YELLOW</text>
  <text x="${cabX + cabW / 2}" y="${cabY + cabH / 2 + 14}" font-size="7" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">CABINET</text>`;

  // Overhead services (dashed red)
  const svcY1 = oy + 30;
  const svcY2 = oy + 80;
  const services = `
  <line x1="${ox}" y1="${svcY1}" x2="${ox + stallW}" y2="${svcY1}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="10,5"/>
  <text x="${ox + stallW + 8}" y="${svcY1 + 4}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">OVERHEAD DUCT (EXISTING — VERIFY)</text>
  <line x1="${ox}" y1="${svcY2}" x2="${ox + stallW * 0.6}" y2="${svcY2}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="${ox + stallW * 0.6 + 8}" y="${svcY2 + 4}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">OVERHEAD PIPE (EXISTING — VERIFY)</text>`;

  // Proposed fence line (dashed gold)
  const fenceLineY = oy + stallD;
  const proposedFence = `
  <line x1="${ox}" y1="${fenceLineY}" x2="${ox + stallW}" y2="${fenceLineY}" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="12,4"/>
  <text x="${ox + stallW / 2}" y="${fenceLineY + 16}" font-size="8.5" font-weight="bold" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">PROPOSED FRONT FENCE LINE (SEE S-04)</text>`;

  // Drive aisle
  const driveY = oy + stallD + 40;
  const driveAisle = `
  <rect x="${ox - 60}" y="${driveY}" width="${stallW + 120}" height="60" fill="#E8E8E8" stroke="${GREY}" stroke-width="1" stroke-dasharray="6,3"/>
  <text x="${ox + stallW / 2}" y="${driveY + 35}" font-size="10" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">DRIVE AISLE — EXISTING (REMAIN)</text>`;

  // Visitor parking sign
  const signX = ox + stallW / 2 - 30;
  const signY = oy + stallD / 2;
  const parkingSign = `
  <rect x="${signX}" y="${signY}" width="60" height="24" fill="${RED}" stroke="${DARK}" stroke-width="1" rx="3"/>
  <text x="${signX + 30}" y="${signY + 10}" font-size="6.5" fill="${WHITE}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold">VISITOR</text>
  <text x="${signX + 30}" y="${signY + 20}" font-size="6.5" fill="${WHITE}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold">PARKING</text>
  <text x="${signX + 30}" y="${signY + 40}" font-size="7" fill="${RED}" text-anchor="middle" font-family="Arial,sans-serif">REMOVE — SEE NOTE 1.7</text>`;

  // Dimensions
  const dims = `
  ${dimH(ox, ox + stallW, oy - 50, `STALL WIDTH ~${p.runLengthFt}ft (${(ftToM(p.runLengthFt)).toFixed(2)}m) — VERIFY ON SITE`)}
  ${dimV(ox - 55, oy, oy + stallD, `STALL DEPTH ~${Math.round(ftToM(p.runLengthFt) * 0.7 * 10) / 10}m — VERIFY ON SITE`)}`;

  // Labels
  const labels = `
  <text x="${ox - wallT / 2 - 2}" y="${oy + stallD / 2}" font-size="7.5" fill="${DARK}" text-anchor="middle" transform="rotate(-90,${ox - wallT / 2 - 2},${oy + stallD / 2})" font-family="Arial,sans-serif">LEFT CONCRETE WALL (EXISTING)</text>
  <text x="${ox + stallW + colW / 2 + 2}" y="${oy + stallD / 2}" font-size="7.5" fill="${DARK}" text-anchor="middle" transform="rotate(90,${ox + stallW + colW / 2 + 2},${oy + stallD / 2})" font-family="Arial,sans-serif">RIGHT COLUMN / STRUCTURE (EXISTING)</text>`;

  // Legend
  const legX = DX + DW + 20, legY = DY + 20;
  const legend = `
  <rect x="${legX}" y="${legY}" width="220" height="260" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <rect x="${legX}" y="${legY}" width="220" height="22" fill="${DARK}" rx="2"/>
  <text x="${legX + 8}" y="${legY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">LEGEND</text>
  <line x1="${legX + 10}" y1="${legY + 40}" x2="${legX + 50}" y2="${legY + 40}" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="10,4"/>
  <text x="${legX + 58}" y="${legY + 44}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Proposed Fence Line</text>
  <line x1="${legX + 10}" y1="${legY + 65}" x2="${legX + 50}" y2="${legY + 65}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="8,4"/>
  <text x="${legX + 58}" y="${legY + 69}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Overhead Services</text>
  <line x1="${legX + 10}" y1="${legY + 90}" x2="${legX + 50}" y2="${legY + 90}" stroke="${BLUE}" stroke-width="2"/>
  <text x="${legX + 58}" y="${legY + 94}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Stall Boundary</text>
  <rect x="${legX + 10}" y="${legY + 108}" width="40" height="16" fill="#FFD700" stroke="${DARK}" stroke-width="1"/>
  <text x="${legX + 58}" y="${legY + 120}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Yellow Cabinet</text>
  <rect x="${legX + 10}" y="${legY + 133}" width="40" height="16" fill="${SLAB_FILL}" stroke="${DARK}" stroke-width="1"/>
  <text x="${legX + 58}" y="${legY + 145}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Concrete Wall / Column</text>
  <line x1="${legX + 10}" y1="${legY + 170}" x2="${legX + 50}" y2="${legY + 170}" stroke="${DARK}" stroke-width="1.5" stroke-dasharray="8,4"/>
  <text x="${legX + 58}" y="${legY + 174}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Stall Outline (Existing)</text>
  <rect x="${legX + 8}" y="${legY + 195}" width="204" height="55" fill="#FFF8E8" stroke="${GOLD}" stroke-width="0.8" rx="2"/>
  <text x="${legX + 16}" y="${legY + 210}" font-size="7.5" font-weight="bold" fill="${DARK}" font-family="Arial,sans-serif">NOTE:</text>
  <text x="${legX + 16}" y="${legY + 223}" font-size="7" fill="${MID}" font-family="Arial,sans-serif">Drawing based on site photos.</text>
  <text x="${legX + 16}" y="${legY + 235}" font-size="7" fill="${MID}" font-family="Arial,sans-serif">All conditions VERIFY ON SITE.</text>
  <text x="${legX + 16}" y="${legY + 247}" font-size="7" fill="${RED}" font-family="Arial,sans-serif">NOT FOR CONSTRUCTION.</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "EXISTING CONDITIONS PLAN", "Based on site photos — all conditions to be field verified prior to construction", "S-03")}
  ${concreteHatch("cwL2", ox - wallT - 2, oy - 20, wallT, stallD + 60)}
  ${concreteHatch("cwR2", ox + stallW + 2, oy - 20, colW, stallD + 60)}
  ${concreteHatch("cwB2", ox - wallT - 2, oy - 20, stallW + wallT + colW + 4, wallT)}
  ${stallFloor}${stallLines}${services}${cabinet}${proposedFence}${driveAisle}${parkingSign}${dims}${labels}${legend}
  <!-- North arrow -->
  <text x="${DX + 30}" y="${DY + DH - 10}" font-size="9" fill="${GREY}" font-family="Arial,sans-serif">↑ N (INDICATIVE)</text>
  <!-- Scale bar -->
  <rect x="${DX + 60}" y="${DY + DH - 18}" width="${scale}" height="6" fill="${DARK}"/>
  <rect x="${DX + 60 + scale}" y="${DY + DH - 18}" width="${scale}" height="6" fill="${WHITE}" stroke="${DARK}" stroke-width="1"/>
  <text x="${DX + 60}" y="${DY + DH - 22}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">0</text>
  <text x="${DX + 60 + scale}" y="${DY + DH - 22}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">1m</text>
  <text x="${DX + 60 + 2 * scale}" y="${DY + DH - 22}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">2m</text>
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "EXISTING CONDITIONS PLAN", "S-03", "1:50 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-04  PROPOSED FLOOR PLAN  (replaces old drawFencingPlan)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingPlan(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const runM = ftToM(p.runLengthFt);
  const depthM = ftToM(p.runLengthFt) * 0.65; // enclosure depth ~65% of width
  const gateWidthM = p.hasGate ? ftToM(p.gateWidthFt) : 0;
  const postSpacingM = ftToM(p.postSpacingFt);
  const postSz = p.frameSectionMm / 1000;

  const DX = 80, DY = 100, DW = 700, DH = 580;
  const scale = Math.min(DW / (runM + 3), DH / (depthM + 3));
  const fenceW = runM * scale;
  const fenceD = depthM * scale;
  const ox = DX + (DW - fenceW) / 2;
  const oy = DY + (DH - fenceD) / 2 - 20;
  const postPx = Math.max(8, postSz * scale);
  const wallT = 20;
  const colW = 36;

  // Walls
  const walls = `
  ${concreteHatch("wpL", ox - wallT, oy - wallT, wallT, fenceD + 2 * wallT)}
  ${concreteHatch("wpR", ox + fenceW, oy - wallT, colW, fenceD + 2 * wallT)}
  ${concreteHatch("wpB", ox - wallT, oy - wallT, fenceW + wallT + colW, wallT)}`;

  // Enclosure interior
  const interior = `
  <rect x="${ox}" y="${oy}" width="${fenceW}" height="${fenceD}" fill="#F0F4F0" stroke="${DARK}" stroke-width="2"/>
  <text x="${ox + fenceW / 2}" y="${oy + fenceD / 2 - 8}" font-size="11" font-weight="bold" fill="${MID}" text-anchor="middle" font-family="Arial,sans-serif">SECURED</text>
  <text x="${ox + fenceW / 2}" y="${oy + fenceD / 2 + 8}" font-size="11" font-weight="bold" fill="${MID}" text-anchor="middle" font-family="Arial,sans-serif">BICYCLE ROOM</text>`;

  // Front fence line (bottom of enclosure)
  const frontY = oy + fenceD;
  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const meshFrontW = fenceRunWithoutGate * scale;

  // Posts along front fence
  const postSpacingPx = postSpacingM * scale;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1;
  let postsEl = "";
  const postPositions: number[] = [];
  for (let i = 0; i < postCount; i++) {
    const px = ox + i * postSpacingPx;
    postPositions.push(px);
    postsEl += `<rect x="${px - postPx / 2}" y="${frontY - postPx / 2}" width="${postPx}" height="${postPx}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    // Post tag
    postsEl += keynote(px, frontY - postPx / 2 - 14, `P${i + 1}`);
    // Anchor symbol
    postsEl += `<circle cx="${px}" cy="${frontY}" r="4" fill="none" stroke="${RED}" stroke-width="1.2"/>`;
    postsEl += `<line x1="${px - 4}" y1="${frontY}" x2="${px + 4}" y2="${frontY}" stroke="${RED}" stroke-width="1"/>`;
    postsEl += `<line x1="${px}" y1="${frontY - 4}" x2="${px}" y2="${frontY + 4}" stroke="${RED}" stroke-width="1"/>`;
  }

  // Gate
  let gateEl = "";
  if (p.hasGate) {
    const gateX = ox + fenceRunWithoutGate * scale;
    const gateW = gateWidthM * scale;
    const gpX1 = gateX;
    const gpX2 = gateX + gateW;
    // Gate posts
    gateEl += `<rect x="${gpX1 - postPx / 2}" y="${frontY - postPx / 2}" width="${postPx}" height="${postPx}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    gateEl += `<rect x="${gpX2 - postPx / 2}" y="${frontY - postPx / 2}" width="${postPx}" height="${postPx}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    gateEl += keynote(gpX1, frontY - postPx / 2 - 14, `GP1`);
    gateEl += keynote(gpX2, frontY - postPx / 2 - 14, `GP2`);
    // Gate opening
    gateEl += `<rect x="${gpX1}" y="${frontY - postPx / 2}" width="${gateW}" height="${postPx}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="6,3"/>`;
    // Door swing arc (inward)
    gateEl += `<path d="M ${gpX1} ${frontY} A ${gateW} ${gateW} 0 0 1 ${gpX1} ${frontY - gateW}" fill="none" stroke="${GOLD}" stroke-width="1" stroke-dasharray="4,3"/>`;
    gateEl += `<line x1="${gpX1}" y1="${frontY}" x2="${gpX1}" y2="${frontY - gateW}" stroke="${GOLD}" stroke-width="1" stroke-dasharray="4,3"/>`;
    gateEl += `<text x="${gateX + gateW / 2}" y="${frontY + 20}" font-size="8" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">SECURITY DOOR — SWING INWARD</text>`;
    gateEl += `<text x="${gateX + gateW / 2}" y="${frontY + 32}" font-size="7.5" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">~${p.gateWidthFt}ft CLEAR — VERIFY ON SITE</text>`;
    // Hinge side tag
    gateEl += leader(gpX1, frontY - 10, gpX1 - 40, frontY - 40, "HINGE SIDE");
    // Latch side tag
    gateEl += leader(gpX2, frontY - 10, gpX2 + 10, frontY - 40, "LATCH / LOCK");
  }

  // Mesh hatch on front fence
  const frontMesh = meshHatch("planMesh", ox, frontY - postPx / 2, meshFrontW, postPx, 8);

  // Side fence lines (left and right)
  const sideFences = `
  <line x1="${ox}" y1="${oy}" x2="${ox}" y2="${frontY}" stroke="${DARK}" stroke-width="2"/>
  <line x1="${ox + fenceW}" y1="${oy}" x2="${ox + fenceW}" y2="${frontY}" stroke="${DARK}" stroke-width="2"/>`;

  // Rear fence / wall connection
  const rearFence = `
  <line x1="${ox}" y1="${oy}" x2="${ox + fenceW}" y2="${oy}" stroke="${DARK}" stroke-width="2" stroke-dasharray="8,4"/>
  <text x="${ox + fenceW / 2}" y="${oy - 8}" font-size="7.5" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">REAR WALL — EXISTING CONCRETE (TIE-IN — VERIFY)</text>`;

  // Yellow cabinet
  const cabW = 50, cabH = 35;
  const cabX = ox + fenceW - cabW - 8;
  const cabY = oy + fenceD - cabH - 8;
  const cabinet = `
  <rect x="${cabX}" y="${cabY}" width="${cabW}" height="${cabH}" fill="#FFD700" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${cabX + cabW / 2}" y="${cabY + cabH / 2 + 4}" font-size="6.5" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">YELLOW CAB.</text>`;

  // Drive aisle
  const driveAisle = `
  <rect x="${ox - 60}" y="${frontY + 10}" width="${fenceW + 120}" height="50" fill="#E8E8E8" stroke="${GREY}" stroke-width="1" stroke-dasharray="6,3"/>
  <text x="${ox + fenceW / 2}" y="${frontY + 40}" font-size="9" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">DRIVE AISLE — EXISTING</text>`;

  // Dimensions
  const dims = `
  ${dimH(ox, ox + fenceW, oy - 55, `OVERALL WIDTH ~${p.runLengthFt}ft (${runM.toFixed(2)}m) — VERIFY ON SITE`)}
  ${dimV(ox - 60, oy, frontY, `ENCLOSURE DEPTH ~${depthM.toFixed(2)}m — VERIFY ON SITE`)}
  ${p.hasGate ? dimH(ox + fenceRunWithoutGate * scale, ox + fenceW, frontY + 55, `DOOR WIDTH ~${p.gateWidthFt}ft — VERIFY`) : ""}
  ${dimH(ox, ox + postSpacingPx, frontY + 55, `POST SPACING ~${p.postSpacingFt}ft TYP`)}`;

  // Keynote legend
  const klegX = DX + DW + 20, klegY = DY + 20;
  const keynotes = [
    ["1", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS POST — SEE DET-01`],
    ["2", "WELDED WIRE MESH INFILL PANEL — SEE DET-03"],
    ["3", "BASE PLATE & EPOXY ANCHORS — SEE DET-01"],
    ["4", "SECURITY DOOR — SEE S-11 & DET-04"],
    ["5", "CONCRETE WALL TIE-IN — SEE DET-02"],
    ["6", "COLUMN TERMINATION — SEE DET-07"],
    ["7", "YELLOW CABINET — PROTECT IN PLACE"],
  ];
  let klegEl = `
  <rect x="${klegX}" y="${klegY}" width="230" height="${30 + keynotes.length * 28 + 20}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <rect x="${klegX}" y="${klegY}" width="230" height="22" fill="${DARK}" rx="2"/>
  <text x="${klegX + 8}" y="${klegY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">KEYNOTE LEGEND</text>`;
  keynotes.forEach(([num, desc], i) => {
    const ky = klegY + 30 + i * 28;
    klegEl += keynote(klegX + 18, ky + 9, num);
    klegEl += `<text x="${klegX + 34}" y="${ky + 8}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">${desc.substring(0, 32)}</text>`;
    if (desc.length > 32) klegEl += `<text x="${klegX + 34}" y="${ky + 20}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">${desc.substring(32)}</text>`;
  });

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "PROPOSED FLOOR PLAN", "Secured Bicycle Room Enclosure — All dimensions VERIFY ON SITE prior to fabrication", "S-04")}
  ${walls}${interior}${frontMesh}${sideFences}${rearFence}${postsEl}${gateEl}${cabinet}${driveAisle}${dims}${klegEl}
  <!-- Anchor symbol legend -->
  <circle cx="${klegX + 18}" cy="${klegY + 30 + keynotes.length * 28 + 10}" r="5" fill="none" stroke="${RED}" stroke-width="1.2"/>
  <line x1="${klegX + 13}" y1="${klegY + 30 + keynotes.length * 28 + 10}" x2="${klegX + 23}" y2="${klegY + 30 + keynotes.length * 28 + 10}" stroke="${RED}" stroke-width="1"/>
  <line x1="${klegX + 18}" y1="${klegY + 30 + keynotes.length * 28 + 5}" x2="${klegX + 18}" y2="${klegY + 30 + keynotes.length * 28 + 15}" stroke="${RED}" stroke-width="1"/>
  <text x="${klegX + 30}" y="${klegY + 30 + keynotes.length * 28 + 14}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">ANCHOR POINT (TYP)</text>
  <!-- North arrow -->
  <text x="${DX + 30}" y="${DY + DH - 10}" font-size="9" fill="${GREY}" font-family="Arial,sans-serif">↑ N (INDICATIVE)</text>
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "PROPOSED FLOOR PLAN", "S-04", "1:50 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-05  FRONT ELEVATION  (replaces old drawFencingFrontElevation)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingFrontElevation(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const gateWidthM = p.hasGate ? ftToM(p.gateWidthFt) : 0;
  const postSpacingM = ftToM(p.postSpacingFt);

  const DX = 80, DY = 100, DW = 750, DH = 560;
  const scX = Math.min(DW / (runM + 2), 80);
  const scY = Math.min(DH / (heightM + 2.5), 80);
  const sc = Math.min(scX, scY);

  const fenceW = runM * sc;
  const fenceH = heightM * sc;
  const ox = DX + (DW - fenceW) / 2;
  const oy = DY + DH - fenceH - 80;
  const postW = Math.max(8, (p.frameSectionMm / 1000) * sc);
  const wallT = 22;
  const colW = 38;

  // Left wall and right column
  const leftWall = concreteHatch("feL", ox - wallT, oy - 20, wallT, fenceH + 80);
  const rightCol = concreteHatch("feR", ox + fenceW, oy - 20, colW, fenceH + 80);

  // Slab
  const slabH = 22;
  const slab = `
  ${concreteHatch("feSlab", ox - wallT, oy + fenceH, fenceW + wallT + colW, slabH)}
  <text x="${ox + fenceW / 2}" y="${oy + fenceH + slabH + 12}" font-size="8" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">CONCRETE SLAB — EXISTING (FINISH LEVEL)</text>`;

  // Overhead clearance line
  const clearH = Math.min(fenceH * 0.15, 40);
  const clearLine = `
  <line x1="${ox - 50}" y1="${oy - clearH}" x2="${ox + fenceW + 50}" y2="${oy - clearH}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="10,5"/>
  <text x="${ox + fenceW + 55}" y="${oy - clearH + 4}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">LOWEST OVERHEAD OBSTRUCTION (VERIFY)</text>
  ${dimV(ox + fenceW + 80, oy - clearH, oy, `CLR ~${Math.round(clearH / sc * 10) / 10}m — VOS`)}`;

  // Fence run without gate
  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const meshW = fenceRunWithoutGate * sc;

  // Mesh panels
  const meshEl = meshHatch("feMesh", ox, oy, meshW, fenceH, 12);

  // Posts
  const postSpacingPx = postSpacingM * sc;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1;
  let postsEl = "";
  for (let i = 0; i < postCount; i++) {
    const px = ox + i * postSpacingPx - postW / 2;
    postsEl += `<rect x="${px}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    // Base plate
    postsEl += `<rect x="${px - 5}" y="${oy + fenceH - 3}" width="${postW + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
    // Anchor bolts
    postsEl += `<line x1="${px + 2}" y1="${oy + fenceH + 7}" x2="${px + 2}" y2="${oy + fenceH + 20}" stroke="${DARK}" stroke-width="1.5"/>`;
    postsEl += `<line x1="${px + postW - 2}" y1="${oy + fenceH + 7}" x2="${px + postW - 2}" y2="${oy + fenceH + 20}" stroke="${DARK}" stroke-width="1.5"/>`;
    // Post tag
    postsEl += `<text x="${px + postW / 2}" y="${oy - 6}" font-size="7" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">P${i + 1}</text>`;
    // Post spacing dim (first interval only)
    if (i === 0 && postCount > 1) {
      postsEl += dimH(ox, ox + postSpacingPx, oy + fenceH + 45, `~${p.postSpacingFt}ft TYP POST SPACING`);
    }
  }

  // Rails (3 rails: top, mid, bottom)
  const railH = Math.max(5, (p.frameSectionMm / 1000) * sc * 0.7);
  const railPositions = [0.02, 0.5, 0.98];
  let railsEl = "";
  railPositions.forEach((frac, i) => {
    const ry = oy + fenceH * frac - railH / 2;
    railsEl += `<rect x="${ox}" y="${ry}" width="${meshW}" height="${railH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.8"/>`;
    const railLabel = i === 0 ? "TOP RAIL" : i === 1 ? "MID RAIL" : "BOTTOM RAIL";
    railsEl += leader(ox - 5, ry + railH / 2, ox - 80, ry + railH / 2, railLabel);
  });

  // Gate
  let gateEl = "";
  if (p.hasGate) {
    const gateX = ox + fenceRunWithoutGate * sc;
    const gateW = gateWidthM * sc;
    const gateH = Math.min(fenceH, ftToM(p.gateHeightFt) * sc);
    // Gate posts
    gateEl += `<rect x="${gateX - postW / 2}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    gateEl += `<rect x="${gateX + gateW - postW / 2}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    // Gate base plates
    gateEl += `<rect x="${gateX - postW / 2 - 5}" y="${oy + fenceH - 3}" width="${postW + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
    gateEl += `<rect x="${gateX + gateW - postW / 2 - 5}" y="${oy + fenceH - 3}" width="${postW + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
    // Gate mesh
    gateEl += meshHatch("gateMesh", gateX, oy, gateW, gateH, 12);
    // Gate frame
    gateEl += `<rect x="${gateX}" y="${oy}" width="${gateW}" height="${gateH}" fill="none" stroke="${GOLD}" stroke-width="2"/>`;
    // Hinges (left side)
    const hy1 = oy + gateH * 0.2;
    const hy2 = oy + gateH * 0.8;
    gateEl += `<rect x="${gateX - postW / 2 - 3}" y="${hy1 - 6}" width="${postW + 6}" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`;
    gateEl += `<rect x="${gateX - postW / 2 - 3}" y="${hy2 - 6}" width="${postW + 6}" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`;
    gateEl += leader(gateX - postW / 2 - 3, hy1, gateX - 80, hy1 - 20, "HD HINGE (TYP × 2)");
    // Latch (right side)
    const latchX = gateX + gateW - postW / 2;
    const latchY = oy + gateH / 2;
    gateEl += `<rect x="${latchX - 6}" y="${latchY - 10}" width="12" height="20" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`;
    gateEl += leader(latchX + 6, latchY, latchX + 50, latchY - 20, "DROP LATCH / PADLOCK HASP");
    // Access control prep
    gateEl += `<rect x="${gateX + gateW - 20}" y="${oy + 20}" width="14" height="20" fill="#888" stroke="${DARK}" stroke-width="1"/>`;
    gateEl += leader(gateX + gateW - 20, oy + 30, gateX + gateW + 30, oy + 10, "ACCESS CTRL PREP (FUTURE)");
    // Gate dims
    gateEl += dimH(gateX, gateX + gateW, oy - 30, `DOOR WIDTH ~${p.gateWidthFt}ft (${gateWidthM.toFixed(2)}m) — VERIFY`);
    gateEl += dimV(gateX + gateW + 50, oy, oy + gateH, `DOOR HT ~${p.gateHeightFt}ft (${ftToM(p.gateHeightFt).toFixed(2)}m) — VERIFY`);
    // GP tags
    gateEl += `<text x="${gateX}" y="${oy - 40}" font-size="7" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">GP1</text>`;
    gateEl += `<text x="${gateX + gateW}" y="${oy - 40}" font-size="7" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">GP2</text>`;
  }

  // Top of fence reference line
  const tofEl = `
  <line x1="${ox - 90}" y1="${oy}" x2="${ox}" y2="${oy}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">T.O.F. EL. ~${p.heightFt}ft AFF</text>`;

  // FFL reference line
  const fflEl = `
  <line x1="${ox - 90}" y1="${oy + fenceH}" x2="${ox}" y2="${oy + fenceH}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + fenceH + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">F.F.L. ±0.000</text>`;

  // Overall dims
  const dims = `
  ${dimH(ox, ox + fenceW, oy - 55, `OVERALL WIDTH ~${p.runLengthFt}ft (${runM.toFixed(2)}m) — VERIFY ON SITE`)}
  ${dimV(ox - 80, oy, oy + fenceH, `FENCE HEIGHT ~${p.heightFt}ft (${heightM.toFixed(2)}m) AFF`)}`;

  // Material tags
  const matTags = `
  ${leader(ox + meshW * 0.3, oy + fenceH * 0.4, ox + meshW * 0.3 + 60, oy + fenceH * 0.4 - 30, `${p.meshType.replace(/_/g, " ").toUpperCase()} MESH INFILL`)}
  ${leader(ox + 2, oy + fenceH * 0.6, ox - 60, oy + fenceH * 0.6 + 10, `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS POST`)}
  ${leader(ox + 10, oy + fenceH + 5, ox + 10, oy + fenceH + 35, "150×150×10 BASE PLATE")}
  ${leader(ox + 10, oy + fenceH + 18, ox + 80, oy + fenceH + 50, "4× M12 EPOXY ANCHORS")}`;

  // Detail callouts
  const detCallouts = `
  <circle cx="${ox + 5}" cy="${oy + fenceH + 5}" r="10" fill="none" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${ox + 5}" y="${oy + fenceH + 9}" font-size="8" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">1</text>
  <text x="${ox + 20}" y="${oy + fenceH + 22}" font-size="7" fill="${DARK}" font-family="Arial,sans-serif">SEE DET-01</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "FRONT ELEVATION", "View from Drive Aisle — Wall-to-Wall Front Fence Line at Stall Opening", "S-05")}
  ${leftWall}${rightCol}${slab}${clearLine}${meshEl}${railsEl}${postsEl}${gateEl}${tofEl}${fflEl}${dims}${matTags}${detCallouts}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "FRONT ELEVATION", "S-05", "1:20 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-06  LEFT SIDE ELEVATION  (replaces old drawFencingSideElevation)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingSideElevation(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const depthM = ftToM(p.runLengthFt) * 0.65;
  const heightM = ftToM(p.heightFt);

  const DX = 100, DY = 100, DW = 600, DH = 560;
  const scD = Math.min(DW / (depthM + 3), 100);
  const scH = Math.min(DH / (heightM + 3), 100);
  const sc = Math.min(scD, scH);

  const fenceD = depthM * sc;
  const fenceH = heightM * sc;
  const ox = DX + (DW - fenceD) / 2;
  const oy = DY + DH - fenceH - 80;
  const postW = Math.max(8, (p.frameSectionMm / 1000) * sc);
  const wallT = 22;

  // Left concrete wall (rear)
  const rearWall = concreteHatch("seRear", ox - wallT, oy - 20, wallT, fenceH + 80);
  // Slab
  const slab = concreteHatch("seSlab", ox - wallT, oy + fenceH, fenceD + wallT + 40, 22);
  const slabLabel = `<text x="${ox + fenceD / 2}" y="${oy + fenceH + 34}" font-size="8" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">CONCRETE SLAB — EXISTING</text>`;

  // Post (front post, side view)
  const postEl = `
  <rect x="${ox + fenceD - postW}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <rect x="${ox + fenceD - postW - 5}" y="${oy + fenceH - 3}" width="${postW + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>
  <line x1="${ox + fenceD - postW}" y1="${oy + fenceH + 7}" x2="${ox + fenceD - postW}" y2="${oy + fenceH + 20}" stroke="${DARK}" stroke-width="1.5"/>
  <line x1="${ox + fenceD}" y1="${oy + fenceH + 7}" x2="${ox + fenceD}" y2="${oy + fenceH + 20}" stroke="${DARK}" stroke-width="1.5"/>`;

  // Wall anchor (rear post to wall)
  const wallAnchor = `
  <rect x="${ox - wallT}" y="${oy + fenceH * 0.3 - 5}" width="${wallT + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <rect x="${ox - wallT}" y="${oy + fenceH * 0.7 - 5}" width="${wallT + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  ${leader(ox - wallT + 5, oy + fenceH * 0.3, ox - wallT - 80, oy + fenceH * 0.3 - 20, "HILTI ANCHOR TO WALL (TYP)")}
  ${leader(ox, oy + fenceH * 0.3 + 5, ox + 40, oy + fenceH * 0.3 + 30, "CLIP ANGLE — SEE DET-02")}`;

  // Rails (side view cross-sections)
  const railH = Math.max(5, (p.frameSectionMm / 1000) * sc * 0.7);
  const railPositions = [0.02, 0.5, 0.98];
  let railsEl = "";
  railPositions.forEach((frac, i) => {
    const ry = oy + fenceH * frac - railH / 2;
    railsEl += `<rect x="${ox}" y="${ry}" width="${fenceD - postW}" height="${railH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.8"/>`;
    const railLabel = i === 0 ? "TOP RAIL" : i === 1 ? "MID RAIL" : "BOTTOM RAIL";
    railsEl += leader(ox + fenceD - postW + 5, ry + railH / 2, ox + fenceD + 60, ry + railH / 2, railLabel);
  });

  // Mesh infill (side view)
  const meshEl = meshHatch("seMesh", ox, oy, fenceD - postW, fenceH, 10);

  // Overhead services
  const svcY = oy - 35;
  const svcEl = `
  <line x1="${ox - 60}" y1="${svcY}" x2="${ox + fenceD + 60}" y2="${svcY}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="10,5"/>
  <text x="${ox + fenceD + 65}" y="${svcY + 4}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">OVERHEAD DUCT / PIPE (EXISTING — VERIFY)</text>
  ${dimV(ox + fenceD + 80, svcY, oy, `CLR ~${Math.round((oy - svcY) / sc * 10) / 10}m — VERIFY`)}`;

  // Dims
  const dims = `
  ${dimH(ox, ox + fenceD, oy - 55, `ENCLOSURE DEPTH ~${depthM.toFixed(2)}m — VERIFY ON SITE`)}
  ${dimV(ox - 60, oy, oy + fenceH, `FENCE HEIGHT ~${p.heightFt}ft (${heightM.toFixed(2)}m) AFF`)}`;

  // Labels
  const labels = `
  <text x="${ox + fenceD / 2}" y="${oy + fenceH + 50}" font-size="8.5" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">← DRIVE AISLE SIDE (FRONT)</text>
  <text x="${ox - wallT / 2}" y="${oy - 30}" font-size="7.5" fill="${DARK}" text-anchor="middle" transform="rotate(-90,${ox - wallT / 2},${oy - 30})" font-family="Arial,sans-serif">REAR WALL</text>`;

  // T.O.F. and F.F.L. lines
  const tofFfl = `
  <line x1="${ox - 90}" y1="${oy}" x2="${ox}" y2="${oy}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">T.O.F.</text>
  <line x1="${ox - 90}" y1="${oy + fenceH}" x2="${ox}" y2="${oy + fenceH}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + fenceH + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">F.F.L.</text>`;

  // Detail callouts
  const detCallouts = `
  <circle cx="${ox - wallT + 5}" cy="${oy + fenceH * 0.3}" r="10" fill="none" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${ox - wallT + 5}" y="${oy + fenceH * 0.3 + 4}" font-size="8" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">2</text>
  <text x="${ox - wallT - 30}" y="${oy + fenceH * 0.3 + 18}" font-size="7" fill="${DARK}" font-family="Arial,sans-serif">DET-02</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "LEFT SIDE ELEVATION", "Section Through Enclosure — Left Side Condition at Concrete Wall", "S-06")}
  ${rearWall}${slab}${slabLabel}${meshEl}${railsEl}${postEl}${wallAnchor}${svcEl}${dims}${labels}${tofFfl}${detCallouts}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "LEFT SIDE ELEVATION", "S-06", "1:20 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-07  RIGHT SIDE ELEVATION (new)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingRightSideElevation(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const depthM = ftToM(p.runLengthFt) * 0.65;
  const heightM = ftToM(p.heightFt);

  const DX = 100, DY = 100, DW = 600, DH = 560;
  const sc = Math.min(DW / (depthM + 3), DH / (heightM + 3), 100);

  const fenceD = depthM * sc;
  const fenceH = heightM * sc;
  const ox = DX + (DW - fenceD) / 2;
  const oy = DY + DH - fenceH - 80;
  const postW = Math.max(8, (p.frameSectionMm / 1000) * sc);
  const colW = 38;

  // Right column
  const rightCol = concreteHatch("rseCol", ox + fenceD, oy - 20, colW, fenceH + 80);
  const slab = concreteHatch("rseSlab", ox - 40, oy + fenceH, fenceD + colW + 40, 22);
  const slabLabel = `<text x="${ox + fenceD / 2}" y="${oy + fenceH + 34}" font-size="8" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">CONCRETE SLAB — EXISTING</text>`;

  // Front post (side view)
  const postEl = `
  <rect x="${ox + fenceD - postW}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <rect x="${ox + fenceD - postW - 5}" y="${oy + fenceH - 3}" width="${postW + 10}" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;

  // Column termination clip angle
  const clipAngle = `
  <rect x="${ox + fenceD}" y="${oy + fenceH * 0.3 - 6}" width="${colW * 0.5}" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <rect x="${ox + fenceD}" y="${oy + fenceH * 0.7 - 6}" width="${colW * 0.5}" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  ${leader(ox + fenceD + colW * 0.5, oy + fenceH * 0.3, ox + fenceD + colW + 30, oy + fenceH * 0.3 - 20, "CLIP ANGLE TO COLUMN — SEE DET-07")}
  ${leader(ox + fenceD + colW * 0.5, oy + fenceH * 0.7, ox + fenceD + colW + 30, oy + fenceH * 0.7 + 20, "M12 HILTI ANCHOR (TYP)")}`;

  // Rails
  const railH = Math.max(5, (p.frameSectionMm / 1000) * sc * 0.7);
  let railsEl = "";
  [0.02, 0.5, 0.98].forEach((frac, i) => {
    const ry = oy + fenceH * frac - railH / 2;
    railsEl += `<rect x="${ox}" y="${ry}" width="${fenceD - postW}" height="${railH}" fill="${DARK}" stroke="${GOLD}" stroke-width="0.8"/>`;
    const lbl = i === 0 ? "TOP RAIL" : i === 1 ? "MID RAIL" : "BOTTOM RAIL";
    railsEl += leader(ox - 5, ry + railH / 2, ox - 80, ry + railH / 2, lbl);
  });

  // Mesh
  const meshEl = meshHatch("rseMesh", ox, oy, fenceD - postW, fenceH, 10);

  // Overhead services
  const svcY = oy - 35;
  const svcEl = `
  <line x1="${ox - 60}" y1="${svcY}" x2="${ox + fenceD + 60}" y2="${svcY}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="10,5"/>
  <text x="${ox + fenceD + 65}" y="${svcY + 4}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">OVERHEAD SERVICES (VERIFY)</text>`;

  // Yellow cabinet note
  const cabNote = `
  <rect x="${ox + fenceD - 50}" y="${oy + fenceH - 50}" width="50" height="35" fill="#FFD700" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${ox + fenceD - 25}" y="${oy + fenceH - 28}" font-size="6.5" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">YELLOW</text>
  <text x="${ox + fenceD - 25}" y="${oy + fenceH - 18}" font-size="6.5" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">CABINET</text>
  ${leader(ox + fenceD - 25, oy + fenceH - 50, ox + fenceD + 10, oy + fenceH - 70, "PROTECT IN PLACE — VERIFY CLEARANCE")}`;

  const dims = `
  ${dimH(ox, ox + fenceD, oy - 55, `ENCLOSURE DEPTH ~${depthM.toFixed(2)}m — VERIFY ON SITE`)}
  ${dimV(ox - 60, oy, oy + fenceH, `FENCE HEIGHT ~${p.heightFt}ft (${heightM.toFixed(2)}m) AFF`)}`;

  const tofFfl = `
  <line x1="${ox - 90}" y1="${oy}" x2="${ox}" y2="${oy}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">T.O.F.</text>
  <line x1="${ox - 90}" y1="${oy + fenceH}" x2="${ox}" y2="${oy + fenceH}" stroke="${GREY}" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="${ox - 95}" y="${oy + fenceH + 4}" font-size="7.5" fill="${GREY}" text-anchor="end" font-family="Arial,sans-serif">F.F.L.</text>`;

  const detCallouts = `
  <circle cx="${ox + fenceD + 5}" cy="${oy + fenceH * 0.3}" r="10" fill="none" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${ox + fenceD + 5}" y="${oy + fenceH * 0.3 + 4}" font-size="8" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">7</text>
  <text x="${ox + fenceD + 20}" y="${oy + fenceH * 0.3 + 18}" font-size="7" fill="${DARK}" font-family="Arial,sans-serif">DET-07</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "RIGHT SIDE ELEVATION", "Section Through Enclosure — Right Side Condition at Column / Structure", "S-07")}
  ${rightCol}${slab}${slabLabel}${meshEl}${railsEl}${postEl}${clipAngle}${cabNote}${svcEl}${dims}${tofFfl}${detCallouts}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "RIGHT SIDE ELEVATION", "S-07", "1:20 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-08  OVERHEAD CLEARANCE DIAGRAM (new)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingOverheadClearance(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const runM = ftToM(p.runLengthFt);
  const depthM = runM * 0.65;
  const heightM = ftToM(p.heightFt);

  const DX = 80, DY = 100, DW = 700, DH = 560;
  const scale = Math.min(DW / (runM + 3), DH / (depthM + 3));
  const fenceW = runM * scale;
  const fenceD = depthM * scale;
  const ox = DX + (DW - fenceW) / 2;
  const oy = DY + (DH - fenceD) / 2;

  // Enclosure footprint
  const footprint = `
  <rect x="${ox}" y="${oy}" width="${fenceW}" height="${fenceD}" fill="#F0F4F0" stroke="${DARK}" stroke-width="2"/>
  <text x="${ox + fenceW / 2}" y="${oy + fenceD / 2}" font-size="10" fill="${MID}" text-anchor="middle" font-family="Arial,sans-serif">ENCLOSURE FOOTPRINT</text>`;

  // Overhead services (plan view)
  const svc1Y = oy + fenceD * 0.15;
  const svc2Y = oy + fenceD * 0.45;
  const svc3Y = oy + fenceD * 0.75;
  const services = `
  <line x1="${ox - 30}" y1="${svc1Y}" x2="${ox + fenceW + 30}" y2="${svc1Y}" stroke="${RED}" stroke-width="2.5" stroke-dasharray="12,5"/>
  <text x="${ox + fenceW + 35}" y="${svc1Y + 4}" font-size="8" fill="${RED}" font-family="Arial,sans-serif">DUCT — VERIFY INVERT EL.</text>
  <line x1="${ox - 30}" y1="${svc2Y}" x2="${ox + fenceW * 0.7}" y2="${svc2Y}" stroke="${RED}" stroke-width="2" stroke-dasharray="8,4"/>
  <text x="${ox + fenceW * 0.7 + 5}" y="${svc2Y + 4}" font-size="8" fill="${RED}" font-family="Arial,sans-serif">PIPE — VERIFY INVERT EL.</text>
  <line x1="${ox + fenceW * 0.2}" y1="${svc3Y}" x2="${ox + fenceW + 30}" y2="${svc3Y}" stroke="${RED}" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="${ox + fenceW + 35}" y="${svc3Y + 4}" font-size="8" fill="${RED}" font-family="Arial,sans-serif">CONDUIT — VERIFY</text>`;

  // Sprinkler heads
  const sprinklerPositions = [
    [ox + fenceW * 0.25, oy + fenceD * 0.3],
    [ox + fenceW * 0.75, oy + fenceD * 0.3],
    [ox + fenceW * 0.5, oy + fenceD * 0.7],
  ];
  let sprinklersEl = "";
  sprinklerPositions.forEach(([sx, sy]) => {
    sprinklersEl += `<circle cx="${sx}" cy="${sy}" r="8" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
    sprinklersEl += `<line x1="${sx - 8}" y1="${sy}" x2="${sx + 8}" y2="${sy}" stroke="${BLUE}" stroke-width="1.5"/>`;
    sprinklersEl += `<line x1="${sx}" y1="${sy - 8}" x2="${sx}" y2="${sy + 8}" stroke="${BLUE}" stroke-width="1.5"/>`;
  });
  sprinklersEl += leader(sprinklerPositions[0][0] + 8, sprinklerPositions[0][1], sprinklerPositions[0][0] + 60, sprinklerPositions[0][1] - 20, "SPRINKLER HEAD (VERIFY COVERAGE)");

  // Clearance zone (hatched)
  const clearZoneH = 40;
  const clearZone = `
  <rect x="${ox}" y="${oy}" width="${fenceW}" height="${clearZoneH}" fill="rgba(255,200,0,0.2)" stroke="${GOLD}" stroke-width="1" stroke-dasharray="6,3"/>
  <text x="${ox + fenceW / 2}" y="${oy + clearZoneH / 2 + 4}" font-size="8" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">COORDINATION ZONE — VERIFY ALL OVERHEAD SERVICES</text>`;

  // Clearance table
  const tableX = DX + DW + 20, tableY = DY + 20;
  const rows = [
    ["T.O.F. Elevation", `~${p.heightFt}ft AFF`, "VERIFY"],
    ["Lowest Duct Invert", "VERIFY ON SITE", "REQUIRED"],
    ["Lowest Pipe Invert", "VERIFY ON SITE", "REQUIRED"],
    ["Sprinkler Coverage", "CONFIRM WITH AHJ", "REQUIRED"],
    ["Min. Clearance T.O.F.", "150mm min.", "VERIFY"],
    ["Conduit Clearance", "VERIFY ON SITE", "REQUIRED"],
  ];
  let tableEl = `
  <rect x="${tableX}" y="${tableY}" width="240" height="${30 + rows.length * 26 + 10}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <rect x="${tableX}" y="${tableY}" width="240" height="22" fill="${DARK}" rx="2"/>
  <text x="${tableX + 8}" y="${tableY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">OVERHEAD CLEARANCE SCHEDULE</text>`;
  rows.forEach((row, i) => {
    const ry = tableY + 30 + i * 26;
    const bg = i % 2 === 0 ? "#FFFFFF" : "#F0F0F0";
    tableEl += `<rect x="${tableX}" y="${ry}" width="240" height="26" fill="${bg}"/>`;
    tableEl += `<text x="${tableX + 6}" y="${ry + 10}" font-size="7.5" fill="${DARK}" font-family="Arial,sans-serif">${row[0]}</text>`;
    tableEl += `<text x="${tableX + 6}" y="${ry + 21}" font-size="7" fill="${MID}" font-family="Arial,sans-serif">${row[1]}</text>`;
    tableEl += `<text x="${tableX + 180}" y="${ry + 15}" font-size="7.5" fill="${RED}" text-anchor="middle" font-family="Arial,sans-serif">${row[2]}</text>`;
  });

  // Legend
  const legY = tableY + 30 + rows.length * 26 + 30;
  const legend = `
  <rect x="${tableX}" y="${legY}" width="240" height="110" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <rect x="${tableX}" y="${legY}" width="240" height="22" fill="${DARK}" rx="2"/>
  <text x="${tableX + 8}" y="${legY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">LEGEND</text>
  <line x1="${tableX + 10}" y1="${legY + 38}" x2="${tableX + 50}" y2="${legY + 38}" stroke="${RED}" stroke-width="2" stroke-dasharray="10,4"/>
  <text x="${tableX + 58}" y="${legY + 42}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Overhead Service</text>
  <circle cx="${tableX + 30}" cy="${legY + 62}" r="8" fill="none" stroke="${BLUE}" stroke-width="1.5"/>
  <line x1="${tableX + 22}" y1="${legY + 62}" x2="${tableX + 38}" y2="${legY + 62}" stroke="${BLUE}" stroke-width="1.5"/>
  <text x="${tableX + 58}" y="${legY + 66}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Sprinkler Head</text>
  <rect x="${tableX + 10}" y="${legY + 78}" width="40" height="14" fill="rgba(255,200,0,0.3)" stroke="${GOLD}" stroke-width="1"/>
  <text x="${tableX + 58}" y="${legY + 89}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Coordination Zone</text>`;

  const dims = `
  ${dimH(ox, ox + fenceW, oy - 40, `ENCLOSURE WIDTH ~${p.runLengthFt}ft — VERIFY`)}
  ${dimV(ox - 50, oy, oy + fenceD, `ENCLOSURE DEPTH ~${depthM.toFixed(2)}m — VERIFY`)}`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "OVERHEAD CLEARANCE DIAGRAM", "Plan View — Overhead Service Coordination — All Conditions VERIFY ON SITE", "S-08")}
  ${footprint}${clearZone}${services}${sprinklersEl}${dims}${tableEl}${legend}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "OVERHEAD CLEARANCE DIAGRAM", "S-08", "1:50 (INDICATIVE)", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-09  CONSTRUCTION DETAILS  (replaces old drawFencingDetail)
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingDetail(p: FencingParams): string {
  const W = 1100, H = 1200;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");
  const fs = p.frameSectionMm;
  const finishNote = p.finish === "black_pc" ? "BLACK PC (RAL 9005)"
    : p.finish === "galvanised" ? "HOT-DIP GALV." : "CUSTOM PC";

  // ── Helper: detail box ─────────────────────────────────────────────────────
  function detBox(x: number, y: number, w: number, h: number, num: string, title: string): string {
    return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WHITE}" stroke="${DARK}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${w}" height="22" fill="${DARK}"/>
    <text x="${x + 8}" y="${y + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">DET-${num}  ${title}</text>`;
  }

  const COL1 = 40, COL2 = 400, COL3 = 760;
  const ROW1 = 90, ROW2 = 440, ROW3 = 790;
  const DW2 = 320, DH2 = 300;

  // ── DET-01: Post Base Plate to Slab ───────────────────────────────────────
  const d1x = COL1, d1y = ROW1;
  const det1 = `
  ${detBox(d1x, d1y, DW2, DH2, "01", "POST BASE PLATE TO SLAB")}
  <!-- Post -->
  <rect x="${d1x + 130}" y="${d1y + 30}" width="${fs * 0.8}" height="150" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Base plate -->
  <rect x="${d1x + 100}" y="${d1y + 175}" width="${fs * 0.8 + 60}" height="14" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <!-- Grout bed -->
  <rect x="${d1x + 100}" y="${d1y + 189}" width="${fs * 0.8 + 60}" height="8" fill="#BBBBBB" stroke="${DARK}" stroke-width="0.8"/>
  <!-- Slab hatch -->
  ${concreteHatch("d1slab", d1x + 60, d1y + 197, DW2 - 80, 60)}
  <!-- Anchor bolts -->
  <line x1="${d1x + 110}" y1="${d1y + 189}" x2="${d1x + 110}" y2="${d1y + 245}" stroke="${DARK}" stroke-width="2.5"/>
  <line x1="${d1x + 110}" y1="${d1y + 245}" x2="${d1x + 100}" y2="${d1y + 255}" stroke="${DARK}" stroke-width="2.5"/>
  <line x1="${d1x + 150}" y1="${d1y + 189}" x2="${d1x + 150}" y2="${d1y + 245}" stroke="${DARK}" stroke-width="2.5"/>
  <line x1="${d1x + 150}" y1="${d1y + 245}" x2="${d1x + 160}" y2="${d1y + 255}" stroke="${DARK}" stroke-width="2.5"/>
  <!-- Weld symbol -->
  <text x="${d1x + 128}" y="${d1y + 178}" font-size="10" fill="${GOLD}" font-family="Arial,sans-serif">⌒</text>
  <!-- Leaders -->
  ${leader(d1x + 130 + fs * 0.4, d1y + 80, d1x + 220, d1y + 50, `${fs}×${fs}×3 SHS POST — ${finishNote}`)}
  ${leader(d1x + 100 + (fs * 0.8 + 60) / 2, d1y + 182, d1x + 230, d1y + 170, `150×150×10 BASE PLATE — ${finishNote}`)}
  ${leader(d1x + 100 + (fs * 0.8 + 60) / 2, d1y + 193, d1x + 230, d1y + 200, "NON-SHRINK GROUT BED")}
  ${leader(d1x + 110, d1y + 230, d1x + 50, d1y + 250, "4× M12 EPOXY ANCHOR")}
  ${leader(d1x + 110, d1y + 250, d1x + 50, d1y + 265, "MIN 100mm EMBEDMENT")}
  ${leader(d1x + 60, d1y + 210, d1x + 30, d1y + 280, "CONC. SLAB (EXISTING)")}
  <!-- Dims -->
  ${dimH(d1x + 100, d1x + 100 + fs * 0.8 + 60, d1y + 168, `150mm`)}
  ${dimV(d1x + 60, d1y + 30, d1y + 175, `${fs}mm TYP`)}
  <!-- Scale note -->
  <text x="${d1x + 8}" y="${d1y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — ENLARGED DETAIL</text>`;

  // ── DET-02: End Post to Concrete Wall ─────────────────────────────────────
  const d2x = COL2, d2y = ROW1;
  const det2 = `
  ${detBox(d2x, d2y, DW2, DH2, "02", "END POST TO CONCRETE WALL")}
  <!-- Wall -->
  ${concreteHatch("d2wall", d2x + 20, d2y + 30, 50, DH2 - 50)}
  <!-- Post -->
  <rect x="${d2x + 80}" y="${d2y + 50}" width="${fs * 0.8}" height="180" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Clip angle -->
  <rect x="${d2x + 60}" y="${d2y + 90}" width="${fs * 0.8 + 20}" height="14" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <rect x="${d2x + 60}" y="${d2y + 160}" width="${fs * 0.8 + 20}" height="14" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <!-- Anchor to wall -->
  <line x1="${d2x + 60}" y1="${d2y + 97}" x2="${d2x + 30}" y2="${d2y + 97}" stroke="${DARK}" stroke-width="2.5"/>
  <line x1="${d2x + 60}" y1="${d2y + 167}" x2="${d2x + 30}" y2="${d2y + 167}" stroke="${DARK}" stroke-width="2.5"/>
  <!-- Gap -->
  <line x1="${d2x + 70}" y1="${d2y + 50}" x2="${d2x + 70}" y2="${d2y + 230}" stroke="${GREY}" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Leaders -->
  ${leader(d2x + 80 + fs * 0.4, d2y + 100, d2x + 200, d2y + 60, `${fs}×${fs}×3 SHS END POST`)}
  ${leader(d2x + 60, d2y + 97, d2x + 200, d2y + 100, "75×75×6 CLIP ANGLE")}
  ${leader(d2x + 30, d2y + 97, d2x + 10, d2y + 130, "M12 HILTI ANCHOR × 2")}
  ${leader(d2x + 70, d2y + 140, d2x + 200, d2y + 145, "10mm CLEAR GAP (SEALANT)")}
  ${leader(d2x + 20, d2y + 150, d2x + 10, d2y + 200, "CONC. WALL (EXISTING)")}
  <text x="${d2x + 8}" y="${d2y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — ENLARGED DETAIL</text>`;

  // ── DET-03: Panel Frame & Mesh Infill ─────────────────────────────────────
  const d3x = COL3, d3y = ROW1;
  const cellSz = 14;
  const det3 = `
  ${detBox(d3x, d3y, DW2, DH2, "03", "PANEL FRAME & MESH INFILL")}
  <!-- Frame -->
  <rect x="${d3x + 20}" y="${d3y + 30}" width="280" height="240" fill="none" stroke="${DARK}" stroke-width="3"/>
  <!-- Mid rail -->
  <rect x="${d3x + 20}" y="${d3y + 148}" width="280" height="${fs * 0.5}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Mesh top half -->
  ${meshHatch("d3meshT", d3x + 20, d3y + 30, 280, 118, cellSz)}
  <!-- Mesh bottom half -->
  ${meshHatch("d3meshB", d3x + 20, d3y + 148 + fs * 0.5, 280, 240 - 118 - fs * 0.5, cellSz)}
  <!-- Leaders -->
  ${leader(d3x + 20, d3y + 148, d3x + 310, d3y + 120, `${fs}×${fs}×3 SHS MID RAIL`)}
  ${leader(d3x + 20, d3y + 30, d3x + 310, d3y + 50, `${fs}×${fs}×3 SHS TOP RAIL`)}
  ${leader(d3x + 20, d3y + 268, d3x + 310, d3y + 260, `${fs}×${fs}×3 SHS BOT. RAIL`)}
  ${leader(d3x + 160, d3y + 80, d3x + 310, d3y + 80, `50×50mm MESH, 4mm WIRE`)}
  ${leader(d3x + 160, d3y + 200, d3x + 310, d3y + 200, `TIE WIRE @ 300 CRS`)}
  <!-- Dims -->
  ${dimH(d3x + 20, d3x + 300, d3y + 278, `~${p.postSpacingFt}ft TYP PANEL WIDTH — VERIFY`)}
  ${dimV(d3x + 310, d3y + 30, d3y + 270, `~${p.heightFt}ft PANEL HT — VERIFY`)}
  <text x="${d3x + 8}" y="${d3y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — ENLARGED DETAIL</text>`;

  // ── DET-04: Security Door Jamb ────────────────────────────────────────────
  const d4x = COL1, d4y = ROW2;
  const det4 = `
  ${detBox(d4x, d4y, DW2, DH2, "04", "SECURITY DOOR JAMB (PLAN SECTION)")}
  <!-- Gate post -->
  <rect x="${d4x + 60}" y="${d4y + 60}" width="${fs * 0.8}" height="${fs * 0.8}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Door frame -->
  <rect x="${d4x + 60 + fs * 0.8}" y="${d4y + 60}" width="12" height="${fs * 0.8}" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>
  <!-- Door leaf (plan) -->
  <rect x="${d4x + 60 + fs * 0.8 + 12}" y="${d4y + 60}" width="80" height="10" fill="${MID}" stroke="${DARK}" stroke-width="1"/>
  <!-- Hinge -->
  <rect x="${d4x + 60 + fs * 0.8}" y="${d4y + 60 + fs * 0.4 - 6}" width="20" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Adjacent fence panel -->
  ${meshHatch("d4mesh", d4x + 20, d4y + 60, 40, fs * 0.8, 6)}
  <!-- Leaders -->
  ${leader(d4x + 60 + fs * 0.4, d4y + 60 + fs * 0.4, d4x + 220, d4y + 80, `${fs}×${fs}×3 SHS GATE POST`)}
  ${leader(d4x + 60 + fs * 0.8 + 6, d4y + 60 + fs * 0.4, d4x + 220, d4y + 110, "50×50×3 SHS DOOR FRAME")}
  ${leader(d4x + 60 + fs * 0.8 + 12 + 40, d4y + 65, d4x + 220, d4y + 140, "DOOR LEAF (MESH INFILL)")}
  ${leader(d4x + 60 + fs * 0.8 + 10, d4y + 60 + fs * 0.4, d4x + 220, d4y + 170, "HD HINGE — 3mm KNUCKLE")}
  ${leader(d4x + 30, d4y + 60 + fs * 0.4, d4x + 10, d4y + 200, "FENCE PANEL (ADJACENT)")}
  <text x="${d4x + 8}" y="${d4y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — PLAN SECTION THROUGH JAMB</text>`;

  // ── DET-05: Door Head Detail ───────────────────────────────────────────────
  const d5x = COL2, d5y = ROW2;
  const det5 = `
  ${detBox(d5x, d5y, DW2, DH2, "05", "DOOR HEAD DETAIL (SECTION)")}
  <!-- Top rail -->
  <rect x="${d5x + 40}" y="${d5y + 60}" width="240" height="${fs * 0.6}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Door frame head -->
  <rect x="${d5x + 100}" y="${d5y + 60 + fs * 0.6}" width="120" height="10" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>
  <!-- Door leaf top -->
  <rect x="${d5x + 100}" y="${d5y + 60 + fs * 0.6 + 10}" width="120" height="8" fill="${MID}" stroke="${DARK}" stroke-width="1"/>
  <!-- Clearance gap -->
  <line x1="${d5x + 100}" y1="${d5y + 60 + fs * 0.6}" x2="${d5x + 100}" y2="${d5y + 60 + fs * 0.6 + 20}" stroke="${GOLD}" stroke-width="1" stroke-dasharray="3,2"/>
  <!-- Leaders -->
  ${leader(d5x + 160, d5y + 60 + fs * 0.3, d5x + 290, d5y + 70, `${fs}×${fs}×3 SHS TOP RAIL`)}
  ${leader(d5x + 160, d5y + 60 + fs * 0.6 + 5, d5x + 290, d5y + 110, "DOOR FRAME HEAD")}
  ${leader(d5x + 160, d5y + 60 + fs * 0.6 + 14, d5x + 290, d5y + 140, "DOOR LEAF (MESH INFILL)")}
  ${leader(d5x + 100, d5y + 60 + fs * 0.6 + 10, d5x + 50, d5y + 160, "6mm CLEAR GAP (TYP)")}
  <!-- Dim -->
  ${dimV(d5x + 310, d5y + 60, d5y + 60 + fs * 0.6 + 18, `${Math.round(fs * 0.6 + 18)}mm`)}
  <text x="${d5x + 8}" y="${d5y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — SECTION THROUGH DOOR HEAD</text>`;

  // ── DET-06: Latch / Lock Detail ────────────────────────────────────────────
  const d6x = COL3, d6y = ROW2;
  const det6 = `
  ${detBox(d6x, d6y, DW2, DH2, "06", "LATCH / LOCK DETAIL (ELEVATION)")}
  <!-- Gate post (latch side) -->
  <rect x="${d6x + 60}" y="${d6y + 40}" width="${fs * 0.8}" height="220" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Door frame -->
  <rect x="${d6x + 60 + fs * 0.8}" y="${d6y + 40}" width="12" height="220" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>
  <!-- Door leaf -->
  <rect x="${d6x + 60 + fs * 0.8 + 12}" y="${d6y + 40}" width="100" height="220" fill="none" stroke="${DARK}" stroke-width="1.5"/>
  ${meshHatch("d6mesh", d6x + 60 + fs * 0.8 + 12, d6y + 40, 100, 220, 10)}
  <!-- Drop latch body -->
  <rect x="${d6x + 60 + fs * 0.8 - 8}" y="${d6y + 130}" width="20" height="40" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <!-- Latch bar -->
  <rect x="${d6x + 60 + fs * 0.8 + 12}" y="${d6y + 145}" width="30" height="10" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Padlock hasp -->
  <rect x="${d6x + 60 + fs * 0.8 + 42}" y="${d6y + 140}" width="20" height="20" fill="none" stroke="${GOLD}" stroke-width="2"/>
  <!-- Strike plate -->
  <rect x="${d6x + 60 + fs * 0.8 + 12}" y="${d6y + 142}" width="8" height="16" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Access control prep -->
  <rect x="${d6x + 60 + fs * 0.8 - 5}" y="${d6y + 80}" width="15" height="25" fill="#888" stroke="${DARK}" stroke-width="1"/>
  <!-- Leaders -->
  ${leader(d6x + 60 + fs * 0.4, d6y + 150, d6x + 230, d6y + 100, "DROP LATCH BODY")}
  ${leader(d6x + 60 + fs * 0.8 + 27, d6y + 150, d6x + 230, d6y + 130, "LATCH BAR (ENGAGES STRIKE)")}
  ${leader(d6x + 60 + fs * 0.8 + 52, d6y + 150, d6x + 230, d6y + 160, "PADLOCK HASP")}
  ${leader(d6x + 60 + fs * 0.8 + 16, d6y + 150, d6x + 230, d6y + 190, "STRIKE PLATE (WELD TO FRAME)")}
  ${leader(d6x + 60 + fs * 0.8 - 5, d6y + 92, d6x + 230, d6y + 220, "ACCESS CTRL PREP (FUTURE)")}
  <text x="${d6x + 8}" y="${d6y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — ENLARGED DETAIL</text>`;

  // ── DET-07: Column Termination ─────────────────────────────────────────────
  const d7x = COL1, d7y = ROW3;
  const det7 = `
  ${detBox(d7x, d7y, DW2, DH2, "07", "FENCE TERMINATION AT COLUMN (PLAN)")}
  <!-- Column -->
  ${concreteHatch("d7col", d7x + 220, d7y + 60, 70, 70)}
  <!-- End post -->
  <rect x="${d7x + 180}" y="${d7y + 75}" width="${fs * 0.8}" height="${fs * 0.8}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Clip angle -->
  <rect x="${d7x + 180 + fs * 0.8}" y="${d7y + 75}" width="40" height="${fs * 0.8}" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <!-- Anchor to column -->
  <line x1="${d7x + 220 + 40}" y1="${d7y + 75 + fs * 0.4}" x2="${d7x + 260}" y2="${d7y + 75 + fs * 0.4}" stroke="${DARK}" stroke-width="2.5"/>
  <!-- Fence panel -->
  ${meshHatch("d7mesh", d7x + 20, d7y + 75, 160, fs * 0.8, 6)}
  <!-- Leaders -->
  ${leader(d7x + 180 + fs * 0.4, d7y + 75 + fs * 0.4, d7x + 100, d7y + 55, `${fs}×${fs}×3 SHS END POST`)}
  ${leader(d7x + 180 + fs * 0.8 + 20, d7y + 75 + fs * 0.4, d7x + 230, d7y + 55, "75×75×6 CLIP ANGLE")}
  ${leader(d7x + 260, d7y + 75 + fs * 0.4, d7x + 300, d7y + 55, "M12 HILTI ANCHOR × 2")}
  ${leader(d7x + 245, d7y + 95 + fs * 0.8, d7x + 280, d7y + 140, "CONCRETE COLUMN (EXISTING)")}
  ${leader(d7x + 100, d7y + 75 + fs * 0.4, d7x + 20, d7y + 120, "FENCE PANEL (MESH INFILL)")}
  <text x="${d7x + 8}" y="${d7y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — PLAN SECTION THROUGH COLUMN TIE-IN</text>`;

  // ── DET-08: Top Rail Cap Detail ────────────────────────────────────────────
  const d8x = COL2, d8y = ROW3;
  const det8 = `
  ${detBox(d8x, d8y, DW2, DH2, "08", "TOP RAIL & CAP PLATE (SECTION)")}
  <!-- Post top -->
  <rect x="${d8x + 120}" y="${d8y + 40}" width="${fs * 0.8}" height="80" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Top rail -->
  <rect x="${d8x + 40}" y="${d8y + 110}" width="240" height="${fs * 0.6}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Cap plate -->
  <rect x="${d8x + 110}" y="${d8y + 30}" width="${fs * 0.8 + 20}" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2"/>
  <!-- Weld symbol -->
  <text x="${d8x + 118}" y="${d8y + 115}" font-size="10" fill="${GOLD}" font-family="Arial,sans-serif">⌒</text>
  <!-- Mesh top edge -->
  <line x1="${d8x + 40}" y1="${d8y + 110}" x2="${d8x + 280}" y2="${d8y + 110}" stroke="${MESH_WIRE}" stroke-width="1.5"/>
  <!-- Leaders -->
  ${leader(d8x + 120 + fs * 0.4, d8y + 36, d8x + 290, d8y + 50, `${fs}×${fs}×3 SHS POST`)}
  ${leader(d8x + 110, d8y + 36, d8x + 50, d8y + 50, `${fs + 20}×${fs + 20}×6 CAP PLATE`)}
  ${leader(d8x + 160, d8y + 110 + fs * 0.3, d8x + 290, d8y + 120, `${fs}×${fs}×3 SHS TOP RAIL`)}
  ${leader(d8x + 40, d8y + 113, d8x + 20, d8y + 160, "MESH WIRE TOP EDGE")}
  ${leader(d8x + 118, d8y + 118, d8x + 50, d8y + 180, "FILLET WELD (TYP)")}
  <!-- Dim -->
  ${dimV(d8x + 310, d8y + 30, d8y + 110 + fs * 0.6, `${Math.round(80 + fs * 0.6 + 12)}mm`)}
  <text x="${d8x + 8}" y="${d8y + DH2 - 8}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">SCALE: NTS — SECTION THROUGH TOP RAIL</text>`;

  // ── Detail notes panel ─────────────────────────────────────────────────────
  const notesX = COL3, notesY = ROW3;
  const notesEl = `
  <rect x="${notesX}" y="${notesY}" width="${DW2}" height="${DH2}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1.5" rx="2"/>
  <rect x="${notesX}" y="${notesY}" width="${DW2}" height="22" fill="${DARK}" rx="2"/>
  <text x="${notesX + 8}" y="${notesY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">DETAIL NOTES — ALL DETAILS</text>
  ${[
    "1. All steel framing: ${fs}×${fs}×3 SHS (min.) unless noted. Confirm section with fabricator.",
    "2. All welds: E48XX electrode, min 6mm fillet weld. Grind smooth before finishing.",
    "3. Base plates: 150×150×10PL, 4× M12 epoxy anchors, min 100mm embedment.",
    "4. Confirm slab thickness and rebar layout at ALL anchor locations before drilling.",
    "5. Clip angles to walls/columns: 75×75×6 EA, 2× M12 Hilti HIT-RE500 per angle.",
    "6. All hardware (hinges, latch, anchors): SS316 or hot-dip galvanised.",
    "7. Touch-up all field welds and damaged coating with matching cold galv or paint pen.",
    "8. Non-shrink grout under all base plates. Allow full cure before loading.",
    "9. Mesh tie wire: 3mm galv wire @ 300mm centres to all rails.",
    "10. All gaps at walls/columns: 10mm clear, fill with backer rod and paintable sealant.",
    "11. CONCEPT ONLY — not for construction without field verification and shop drawings.",
    `12. Finish: ${finishNote} — confirm colour with owner before ordering.`,
  ].map((note, i) => `<text x="${notesX + 8}" y="${notesY + 38 + i * 18}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">${note.replace("${fs}", String(fs)).replace("${finishNote}", finishNote)}</text>`).join("")}`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "CONSTRUCTION DETAILS", "Details DET-01 through DET-08 — All Details NTS — Not for Construction Without Field Verification", "S-09")}
  ${det1}${det2}${det3}${det4}${det5}${det6}${det7}${det8}${notesEl}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "CONSTRUCTION DETAILS", "S-09", "NTS", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-10  MATERIAL / COMPONENT SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingMaterialSchedule(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const gateWidthM = p.hasGate ? ftToM(p.gateWidthFt) : 0;
  const postSpacingM = ftToM(p.postSpacingFt);
  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1 + (p.hasGate ? 2 : 0);
  const railLm = fenceRunWithoutGate * 3;
  const meshArea = fenceRunWithoutGate * heightM;
  const finishLabel = p.finish === "black_pc" ? "Powder Coat Black (RAL 9005)"
    : p.finish === "galvanised" ? "Hot-Dip Galvanised (AS/NZS 4680)" : "Custom Powder Coat";

  const headers = ["ITEM", "DESCRIPTION", "SPECIFICATION", "FINISH", "QTY", "UNIT", "REMARKS"];
  const colWidths = [40, 200, 220, 160, 50, 40, 300];
  const rows: string[][] = [
    ["01", "SHS Post", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — G350 steel`, finishLabel, String(postCount), "ea", `Incl. end posts, intermediate posts${p.hasGate ? ", gate posts" : ""}. Height = ~${p.heightFt}ft — VERIFY`],
    ["02", "Top Rail", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — G350`, finishLabel, String(Math.round(fenceRunWithoutGate * 10) / 10), "lm", "Continuous along fence run excl. gate opening"],
    ["03", "Mid Rail", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — G350`, finishLabel, String(Math.round(fenceRunWithoutGate * 10) / 10), "lm", "At mid-height. Confirm exact position with fabricator"],
    ["04", "Bottom Rail", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — G350`, finishLabel, String(Math.round(fenceRunWithoutGate * 10) / 10), "lm", "At floor level. Allow for slab tolerance"],
    ["05", "Mesh Infill", `${p.meshType.replace(/_/g, " ").toUpperCase()} — 4mm wire, factory welded`, finishLabel, String(Math.round(meshArea * 10) / 10), "m²", "Panels pre-fabricated to suit post spacing — VERIFY DIMS"],
    ["06", "Base Plate", "150×150×10PL — G350", finishLabel, String(postCount), "ea", "Welded to post. 4× M12 epoxy anchors per plate"],
    ["07", "Anchor Bolt", "M12 Hilti HIT-RE500 epoxy anchor — SS316", "Natural", String(postCount * 4), "ea", "Min 100mm embedment — confirm slab thickness on site"],
    ["08", "Clip Angle (wall)", "75×75×6 EA — G350", finishLabel, "2", "ea", "End post to concrete wall. 2× M12 Hilti per angle — VERIFY"],
    ["09", "Clip Angle (column)", "75×75×6 EA — G350", finishLabel, "2", "ea", "End post to column. 2× M12 Hilti per angle — VERIFY"],
    ["10", "Cap Plate", `${p.frameSectionMm + 20}×${p.frameSectionMm + 20}×6PL`, finishLabel, String(postCount), "ea", "Welded to top of each post"],
    ...(p.hasGate ? [
      ["11", "Security Door Frame", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — G350`, finishLabel, "1", "ea", `~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H — VERIFY ON SITE`],
      ["12", "Door Mesh Infill", `${p.meshType.replace(/_/g, " ").toUpperCase()} — 4mm wire`, finishLabel, "1", "ea", "Factory-fabricated to door frame size"],
      ["13", "HD Hinge", "150mm HD weld-on hinge — SS316", "Natural SS", "2", "ea", "3mm knuckle, non-removable pin"],
      ["14", "Drop Latch", "Weld-on drop latch with padlock hasp — SS316", "Natural SS", "1", "ea", "Engage strike plate welded to frame"],
      ["15", "Access Ctrl Prep", "Conduit stub-out + backing plate", "—", "1", "ls", "Future access control — confirm with owner"],
    ] : []),
    [p.hasGate ? "16" : "11", "Non-Shrink Grout", "Masterflow 928 or equal", "—", String(postCount), "ea", "Under all base plates. Full cure before loading"],
    [p.hasGate ? "17" : "12", "Backer Rod + Sealant", "10mm backer rod, paintable polyurethane sealant", "—", "1", "ls", "All gaps at walls, columns, and slab perimeter"],
    [p.hasGate ? "18" : "13", "Touch-Up Paint", "Matching cold galv compound or paint pen", "—", "1", "ls", "All field welds and damaged coating areas"],
  ];

  const tableX = 40, tableY = 100;
  const rowH = 32;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  let tableEl = `
  <!-- Table header -->
  <rect x="${tableX}" y="${tableY}" width="${totalW}" height="28" fill="${DARK}"/>`;
  let cx = tableX;
  headers.forEach((h, i) => {
    tableEl += `<text x="${cx + colWidths[i] / 2}" y="${tableY + 18}" font-size="8.5" font-weight="bold" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">${h}</text>`;
    if (i < headers.length - 1) tableEl += `<line x1="${cx + colWidths[i]}" y1="${tableY}" x2="${cx + colWidths[i]}" y2="${tableY + 28 + rows.length * rowH}" stroke="${GOLD}" stroke-width="0.5"/>`;
    cx += colWidths[i];
  });
  tableEl += `<rect x="${tableX}" y="${tableY}" width="${totalW}" height="${28 + rows.length * rowH}" fill="none" stroke="${DARK}" stroke-width="1.5"/>`;

  rows.forEach((row, ri) => {
    const ry = tableY + 28 + ri * rowH;
    const bg = ri % 2 === 0 ? "#FFFFFF" : "#F5F5F5";
    tableEl += `<rect x="${tableX}" y="${ry}" width="${totalW}" height="${rowH}" fill="${bg}"/>`;
    let cx2 = tableX;
    row.forEach((cell, ci) => {
      const maxChars = Math.floor(colWidths[ci] / 5.5);
      const lines = [];
      let remaining = cell;
      while (remaining.length > maxChars && lines.length < 2) {
        const breakAt = remaining.lastIndexOf(" ", maxChars);
        lines.push(remaining.substring(0, breakAt > 0 ? breakAt : maxChars));
        remaining = remaining.substring(breakAt > 0 ? breakAt + 1 : maxChars);
      }
      lines.push(remaining);
      lines.slice(0, 2).forEach((line, li) => {
        tableEl += `<text x="${cx2 + 4}" y="${ry + 12 + li * 13}" font-size="7.5" fill="${DARK}" font-family="Arial,sans-serif">${line}</text>`;
      });
      cx2 += colWidths[ci];
    });
    tableEl += `<line x1="${tableX}" y1="${ry + rowH}" x2="${tableX + totalW}" y2="${ry + rowH}" stroke="${LIGHT}" stroke-width="0.5"/>`;
  });

  // Notes
  const notesY = tableY + 28 + rows.length * rowH + 20;
  const scheduleNotes = `
  <rect x="${tableX}" y="${notesY}" width="${totalW}" height="80" fill="#FFF8E8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <text x="${tableX + 8}" y="${notesY + 16}" font-size="8.5" font-weight="bold" fill="${DARK}" font-family="Arial,sans-serif">SCHEDULE NOTES:</text>
  <text x="${tableX + 8}" y="${notesY + 32}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">1. Quantities are preliminary estimates based on provided parameters. Contractor to verify all quantities from field measurements prior to ordering.</text>
  <text x="${tableX + 8}" y="${notesY + 46}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">2. All steel sections to be G350 grade minimum. Confirm with structural engineer if loading requirements exceed standard.</text>
  <text x="${tableX + 8}" y="${notesY + 60}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">3. Finish: ${finishLabel}. Confirm colour with owner before ordering. Allow 3–4 weeks lead time for powder coat.</text>
  <text x="${tableX + 8}" y="${notesY + 74}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">4. CONCEPT ONLY — not for construction without field verification, shop drawings, and owner approval.</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "MATERIAL / COMPONENT SCHEDULE", `Project: Secured Bicycle Room Enclosure — ${today}`, "S-10")}
  ${tableEl}${scheduleNotes}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "MATERIAL / COMPONENT SCHEDULE", "S-10", "NTS", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-11  DOOR & HARDWARE SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingDoorSchedule(p: FencingParams): string {
  const W = 1100, H = 850;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  if (!p.hasGate) {
    // No gate — show a simple note sheet
    const content = `
    ${drawingBorder(W, H, tbH)}
    ${sheetHeading(W, "DOOR & HARDWARE SCHEDULE", "No door/gate included in this scope", "S-11")}
    <rect x="200" y="200" width="700" height="100" fill="#FFF8E8" stroke="${GOLD}" stroke-width="1.5" rx="4"/>
    <text x="550" y="255" font-size="14" fill="${MID}" text-anchor="middle" font-family="Arial,sans-serif">NO DOOR / GATE IN THIS SCOPE</text>
    <text x="550" y="278" font-size="10" fill="${GREY}" text-anchor="middle" font-family="Arial,sans-serif">If a security door is required, update parameters and regenerate drawings.</text>
    ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "DOOR & HARDWARE SCHEDULE", "S-11", "NTS", today)}`;
    return svgWrap(W, H, content);
  }

  const finishLabel = p.finish === "black_pc" ? "Powder Coat Black (RAL 9005)"
    : p.finish === "galvanised" ? "Hot-Dip Galvanised" : "Custom Powder Coat";

  // Door schedule table
  const headers = ["ITEM", "DESCRIPTION", "SPECIFICATION", "MATERIAL", "QTY", "REMARKS"];
  const colWidths = [40, 180, 260, 160, 40, 330];
  const rows: string[][] = [
    ["D-01", "Door Frame", `${p.frameSectionMm}×${p.frameSectionMm}×3 SHS — welded construction`, `Steel — ${finishLabel}`, "1", `~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H — VERIFY ON SITE`],
    ["D-02", "Door Infill", `${p.meshType.replace(/_/g, " ").toUpperCase()} — 4mm wire, factory welded to frame`, `Steel — ${finishLabel}`, "1", "Infill welded to frame prior to delivery"],
    ["H-01", "Hinges", "150mm HD weld-on hinge — non-removable pin", "SS316 — natural", "2 pr", "One pair at 200mm from top, one pair at 200mm from bottom"],
    ["H-02", "Drop Latch", "Weld-on drop latch body with padlock hasp", "SS316 — natural", "1", "Latch bar engages strike plate welded to frame. Padlock by owner"],
    ["H-03", "Strike Plate", "Strike plate — weld to door frame at latch side", "SS316 — natural", "1", "Weld to door frame. Align with latch bar"],
    ["H-04", "Padlock Hasp", "Weld-on padlock hasp — 12mm shackle clearance", "SS316 — natural", "1", "Owner to supply padlock. Confirm shackle diameter"],
    ["H-05", "Access Ctrl Prep", "Conduit stub-out 25mm EMT + steel backing plate", "Galv steel", "1", "Future card reader / fob access. Confirm location with owner"],
    ["H-06", "Door Closer", "Surface-mounted door closer — heavy duty", "Powder coat black", "1", "OPTIONAL — confirm with owner. Coordinate with latch operation"],
    ["H-07", "Floor Guide", "Floor-mounted door guide / stop", "SS316 — natural", "1", "Prevent door over-swing. Confirm clearance with slab"],
    ["H-08", "Threshold", "Flat threshold bar — 50×6 flat bar", `Steel — ${finishLabel}`, "1", "Weld to door frame bottom. Allow for slab tolerance"],
  ];

  const tableX = 40, tableY = 100;
  const rowH = 34;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  let tableEl = `<rect x="${tableX}" y="${tableY}" width="${totalW}" height="28" fill="${DARK}"/>`;
  let cx = tableX;
  headers.forEach((h, i) => {
    tableEl += `<text x="${cx + colWidths[i] / 2}" y="${tableY + 18}" font-size="8.5" font-weight="bold" fill="${GOLD}" text-anchor="middle" font-family="Arial,sans-serif">${h}</text>`;
    if (i < headers.length - 1) tableEl += `<line x1="${cx + colWidths[i]}" y1="${tableY}" x2="${cx + colWidths[i]}" y2="${tableY + 28 + rows.length * rowH}" stroke="${GOLD}" stroke-width="0.5"/>`;
    cx += colWidths[i];
  });
  tableEl += `<rect x="${tableX}" y="${tableY}" width="${totalW}" height="${28 + rows.length * rowH}" fill="none" stroke="${DARK}" stroke-width="1.5"/>`;

  rows.forEach((row, ri) => {
    const ry = tableY + 28 + ri * rowH;
    const bg = ri % 2 === 0 ? "#FFFFFF" : "#F5F5F5";
    tableEl += `<rect x="${tableX}" y="${ry}" width="${totalW}" height="${rowH}" fill="${bg}"/>`;
    let cx2 = tableX;
    row.forEach((cell, ci) => {
      const maxChars = Math.floor(colWidths[ci] / 5.5);
      const lines: string[] = [];
      let rem = cell;
      while (rem.length > maxChars && lines.length < 2) {
        const bp = rem.lastIndexOf(" ", maxChars);
        lines.push(rem.substring(0, bp > 0 ? bp : maxChars));
        rem = rem.substring(bp > 0 ? bp + 1 : maxChars);
      }
      lines.push(rem);
      lines.slice(0, 2).forEach((line, li) => {
        tableEl += `<text x="${cx2 + 4}" y="${ry + 13 + li * 14}" font-size="7.5" fill="${DARK}" font-family="Arial,sans-serif">${line}</text>`;
      });
      cx2 += colWidths[ci];
    });
    tableEl += `<line x1="${tableX}" y1="${ry + rowH}" x2="${tableX + totalW}" y2="${ry + rowH}" stroke="${LIGHT}" stroke-width="0.5"/>`;
  });

  // Door elevation diagram
  const diagX = 40, diagY = tableY + 28 + rows.length * rowH + 30;
  const dW = 180, dH = 220;
  const doorDiagram = `
  <rect x="${diagX}" y="${diagY}" width="${dW + 60}" height="${dH + 40}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <text x="${diagX + (dW + 60) / 2}" y="${diagY + 16}" font-size="9" font-weight="bold" fill="${DARK}" text-anchor="middle" font-family="Arial,sans-serif">DOOR ELEVATION (SCHEMATIC)</text>
  <!-- Door frame -->
  <rect x="${diagX + 30}" y="${diagY + 24}" width="${dW}" height="${dH}" fill="none" stroke="${DARK}" stroke-width="2.5"/>
  <!-- Mesh hatch -->
  ${meshHatch("diagMesh", diagX + 30, diagY + 24, dW, dH, 10)}
  <!-- Hinges -->
  <rect x="${diagX + 22}" y="${diagY + 44}" width="16" height="20" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <rect x="${diagX + 22}" y="${diagY + 184}" width="16" height="20" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Latch -->
  <rect x="${diagX + 30 + dW - 8}" y="${diagY + 24 + dH / 2 - 15}" width="8" height="30" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Labels -->
  <text x="${diagX + 10}" y="${diagY + 54}" font-size="7" fill="${GOLD}" text-anchor="end" font-family="Arial,sans-serif">H-01</text>
  <text x="${diagX + 10}" y="${diagY + 194}" font-size="7" fill="${GOLD}" text-anchor="end" font-family="Arial,sans-serif">H-01</text>
  <text x="${diagX + 30 + dW + 5}" y="${diagY + 24 + dH / 2}" font-size="7" fill="${GOLD}" font-family="Arial,sans-serif">H-02</text>
  ${dimH(diagX + 30, diagX + 30 + dW, diagY + 24 + dH + 12, `~${p.gateWidthFt}ft — VOS`)}
  ${dimV(diagX + 30 + dW + 30, diagY + 24, diagY + 24 + dH, `~${p.gateHeightFt}ft — VOS`)}`;

  // Notes
  const notesX = diagX + dW + 100, notesY2 = diagY;
  const scheduleNotes = `
  <rect x="${notesX}" y="${notesY2}" width="600" height="120" fill="#FFF8E8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <text x="${notesX + 8}" y="${notesY2 + 16}" font-size="8.5" font-weight="bold" fill="${DARK}" font-family="Arial,sans-serif">DOOR SCHEDULE NOTES:</text>
  <text x="${notesX + 8}" y="${notesY2 + 32}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">1. Door dimensions are preliminary. Contractor to verify opening size on site before fabricating door.</text>
  <text x="${notesX + 8}" y="${notesY2 + 46}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">2. All hardware to be SS316 or hot-dip galvanised. Confirm with owner before ordering.</text>
  <text x="${notesX + 8}" y="${notesY2 + 60}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">3. Door closer (H-06) is optional. If included, coordinate with latch and access control prep.</text>
  <text x="${notesX + 8}" y="${notesY2 + 74}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">4. Access control prep (H-05): confirm card reader / fob type and location with owner before installation.</text>
  <text x="${notesX + 8}" y="${notesY2 + 88}" font-size="7.5" fill="${MID}" font-family="Arial,sans-serif">5. Owner to supply padlock. Confirm shackle diameter with latch supplier before ordering hasp.</text>
  <text x="${notesX + 8}" y="${notesY2 + 102}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">6. CONCEPT ONLY — not for construction without field verification and shop drawings.</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "DOOR & HARDWARE SCHEDULE", `Security Door — ~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H — All Dimensions VERIFY ON SITE`, "S-11")}
  ${tableEl}${doorDiagram}${scheduleNotes}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "DOOR & HARDWARE SCHEDULE", "S-11", "NTS", today)}`;

  return svgWrap(W, H, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-12  SITE MEASUREMENT / FIELD VERIFICATION SHEET
// ═══════════════════════════════════════════════════════════════════════════════

export function drawFencingSiteVerification(p: FencingParams): string {
  const W = 1100, H = 1000;
  const tbH = 72;
  const today = new Date().toLocaleDateString("en-CA");

  const col1 = 40, col2 = 560;
  const rowH = 36;

  function verifySection(x: number, y: number, title: string, items: Array<{label: string, design: string, field: string, note: string}>): string {
    const sH = 24 + items.length * rowH + 4;
    let out = `
    <rect x="${x}" y="${y}" width="480" height="${sH}" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
    <rect x="${x}" y="${y}" width="480" height="24" fill="${DARK}" rx="2"/>
    <text x="${x + 8}" y="${y + 16}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">${title}</text>
    <!-- Sub-headers -->
    <text x="${x + 8}" y="${y + 38}" font-size="7.5" font-weight="bold" fill="${MID}" font-family="Arial,sans-serif">MEASUREMENT</text>
    <text x="${x + 200}" y="${y + 38}" font-size="7.5" font-weight="bold" fill="${MID}" font-family="Arial,sans-serif">DESIGN (PRELIM)</text>
    <text x="${x + 310}" y="${y + 38}" font-size="7.5" font-weight="bold" fill="${MID}" font-family="Arial,sans-serif">FIELD MEASURE</text>
    <text x="${x + 400}" y="${y + 38}" font-size="7.5" font-weight="bold" fill="${MID}" font-family="Arial,sans-serif">✓</text>
    <line x1="${x}" y1="${y + 42}" x2="${x + 480}" y2="${y + 42}" stroke="${GOLD}" stroke-width="0.5"/>`;
    items.forEach((item, i) => {
      const iy = y + 42 + i * rowH;
      const bg = i % 2 === 0 ? "#FFFFFF" : "#F0F0F0";
      out += `<rect x="${x}" y="${iy}" width="480" height="${rowH}" fill="${bg}"/>`;
      out += `<text x="${x + 8}" y="${iy + 14}" font-size="7.5" fill="${DARK}" font-family="Arial,sans-serif">${item.label}</text>`;
      out += `<text x="${x + 8}" y="${iy + 27}" font-size="7" fill="${GREY}" font-family="Arial,sans-serif">${item.note}</text>`;
      out += `<text x="${x + 200}" y="${iy + 20}" font-size="8" fill="${BLUE}" font-family="Arial,sans-serif">${item.design}</text>`;
      // Field measure box
      out += `<rect x="${x + 305}" y="${iy + 6}" width="80" height="22" fill="${WHITE}" stroke="${MID}" stroke-width="1" rx="2"/>`;
      // Checkbox
      out += `<rect x="${x + 400}" y="${iy + 8}" width="18" height="18" fill="${WHITE}" stroke="${MID}" stroke-width="1.5" rx="2"/>`;
      out += `<line x1="${x + 480}" y1="${iy}" x2="${x + 480}" y2="${iy + rowH}" stroke="${LIGHT}" stroke-width="0.5"/>`;
      out += `<line x1="${x}" y1="${iy + rowH}" x2="${x + 480}" y2="${iy + rowH}" stroke="${LIGHT}" stroke-width="0.5"/>`;
    });
    return out;
  }

  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const depthM = runM * 0.65;

  const s1 = verifySection(col1, 100, "1.0  ENCLOSURE DIMENSIONS", [
    { label: "Wall-to-wall width (front fence line)", design: `~${p.runLengthFt}ft (${runM.toFixed(2)}m)`, field: "", note: "Measure at slab level, wall face to column face" },
    { label: "Enclosure depth (front to rear wall)", design: `~${depthM.toFixed(2)}m`, field: "", note: "Measure at slab level, front fence line to rear wall" },
    { label: "Clear height to lowest obstruction", design: `~${p.heightFt}ft + clearance`, field: "", note: "Measure to lowest duct, pipe, or structural element" },
    { label: "Fence / enclosure height", design: `~${p.heightFt}ft (${heightM.toFixed(2)}m)`, field: "", note: "Confirm against overhead clearance measurement" },
    { label: "Left wall setback (end post to wall)", design: "0mm (flush)", field: "", note: "Measure gap between end post CL and wall face" },
    { label: "Right column setback (end post to col.)", design: "0mm (flush)", field: "", note: "Measure gap between end post CL and column face" },
  ]);

  const s2 = verifySection(col1, 100 + 24 + 6 * rowH + 42 + 20, "2.0  DOOR / GATE DIMENSIONS", p.hasGate ? [
    { label: "Door opening width (clear)", design: `~${p.gateWidthFt}ft (${ftToM(p.gateWidthFt).toFixed(2)}m)`, field: "", note: "Measure between gate post faces" },
    { label: "Door height (clear)", design: `~${p.gateHeightFt}ft (${ftToM(p.gateHeightFt).toFixed(2)}m)`, field: "", note: "Measure from slab to underside of top rail" },
    { label: "Door swing clearance (inward)", design: `~${p.gateWidthFt}ft radius`, field: "", note: "Confirm no obstruction in swing arc" },
    { label: "Latch side — column / wall clearance", design: "VERIFY", field: "", note: "Confirm latch hardware clears adjacent structure" },
    { label: "Access control prep location", design: "TBD by owner", field: "", note: "Confirm card reader / fob height and side" },
  ] : [
    { label: "No door in scope", design: "N/A", field: "", note: "If door required, update parameters and regenerate" },
  ]);

  const s3 = verifySection(col2, 100, "3.0  STRUCTURAL / SLAB CONDITIONS", [
    { label: "Slab thickness at anchor locations", design: "Min 150mm req'd", field: "", note: "Core drill test or structural drawings — CRITICAL" },
    { label: "Rebar layout at anchor locations", design: "Avoid rebar", field: "", note: "GPR scan or structural drawings before drilling" },
    { label: "Slab condition (cracks, damage)", design: "Sound", field: "", note: "Note any cracks, spalling, or repairs required" },
    { label: "Wall condition (left — anchor locations)", design: "Sound concrete", field: "", note: "Confirm no voids or hollow block at anchor points" },
    { label: "Column condition (right — anchor locations)", design: "Sound concrete", field: "", note: "Confirm concrete column (not hollow)" },
    { label: "Slab flatness / level tolerance", design: "±5mm", field: "", note: "Check for high/low spots under base plate locations" },
  ]);

  const s4 = verifySection(col2, 100 + 24 + 6 * rowH + 42 + 20, "4.0  OVERHEAD SERVICES & COORDINATION", [
    { label: "Duct invert elevation (lowest)", design: "VERIFY", field: "", note: "Measure from FFL to bottom of duct" },
    { label: "Pipe invert elevation (lowest)", design: "VERIFY", field: "", note: "Measure from FFL to bottom of pipe" },
    { label: "Sprinkler head locations", design: "VERIFY", field: "", note: "Note all heads within and adjacent to enclosure" },
    { label: "Sprinkler coverage — confirm with AHJ", design: "REQUIRED", field: "", note: "Confirm if relocation required with fire authority" },
    { label: "Electrical conduit / lighting", design: "VERIFY", field: "", note: "Note all conduit and fixtures overhead" },
    { label: "Clearance T.O.F. to lowest service", design: "Min 150mm", field: "", note: "Confirm fence height will not conflict with services" },
  ]);

  // Sign-off block
  const signOffY = 100 + 2 * (24 + 6 * rowH + 42 + 20) + 20;
  const signOff = `
  <rect x="${col1}" y="${signOffY}" width="1020" height="100" fill="#F8F8F8" stroke="${GOLD}" stroke-width="1" rx="2"/>
  <rect x="${col1}" y="${signOffY}" width="1020" height="22" fill="${DARK}" rx="2"/>
  <text x="${col1 + 8}" y="${signOffY + 15}" font-size="9" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">SITE VERIFICATION SIGN-OFF</text>
  <text x="${col1 + 8}" y="${signOffY + 38}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Measured by:</text>
  <line x1="${col1 + 100}" y1="${signOffY + 40}" x2="${col1 + 300}" y2="${signOffY + 40}" stroke="${MID}" stroke-width="1"/>
  <text x="${col1 + 310}" y="${signOffY + 38}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Company:</text>
  <line x1="${col1 + 380}" y1="${signOffY + 40}" x2="${col1 + 580}" y2="${signOffY + 40}" stroke="${MID}" stroke-width="1"/>
  <text x="${col1 + 590}" y="${signOffY + 38}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Date:</text>
  <line x1="${col1 + 620}" y1="${signOffY + 40}" x2="${col1 + 780}" y2="${signOffY + 40}" stroke="${MID}" stroke-width="1"/>
  <text x="${col1 + 8}" y="${signOffY + 62}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Signature:</text>
  <line x1="${col1 + 80}" y1="${signOffY + 64}" x2="${col1 + 300}" y2="${signOffY + 64}" stroke="${MID}" stroke-width="1"/>
  <text x="${col1 + 310}" y="${signOffY + 62}" font-size="8" fill="${MID}" font-family="Arial,sans-serif">Reviewed by (Eagle Eye):</text>
  <line x1="${col1 + 480}" y1="${signOffY + 64}" x2="${col1 + 680}" y2="${signOffY + 64}" stroke="${MID}" stroke-width="1"/>
  <text x="${col1 + 8}" y="${signOffY + 88}" font-size="7.5" fill="${RED}" font-family="Arial,sans-serif">IMPORTANT: Do not proceed to fabrication until all items above are verified and this sheet is signed off by both contractor and Eagle Eye Management Services.</text>`;

  const content = `
  ${drawingBorder(W, H, tbH)}
  ${sheetHeading(W, "SITE MEASUREMENT / FIELD VERIFICATION SHEET", "Complete all measurements on site — Return signed copy to Eagle Eye before fabrication", "S-12")}
  ${s1}${s2}${s3}${s4}${signOff}
  ${titleBlock(W, H, "SECURED BICYCLE ROOM ENCLOSURE", "SITE MEASUREMENT / FIELD VERIFICATION SHEET", "S-12", "NTS", today)}`;

  return svgWrap(W, H, content);
}

// ─── Re-export old names for backward compatibility ───────────────────────────
// (pdfExport.ts calls drawFencingDetail and drawFencingSideElevation by name)
// All other new functions are exported above.
