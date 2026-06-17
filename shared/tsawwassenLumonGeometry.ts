/**
 * Tsawwassen Lumon Drawing Package — Governing Methodology Implementation
 *
 * Governing standards: pasted_content.txt (Eagle Eye Lumon Drawing Skill)
 * Reference set: Lumon B.01 shop drawings (50929123 — 3122 Mount Lehman Rd, Abbotsford)
 * Site photos: 1000018597–1000018600.jpg (Tsawwassen Milestones patio)
 *
 * ALL dimensions are ESTIMATED from site photographs unless explicitly marked otherwise.
 * FIELD VERIFY ALL DIMENSIONS PRIOR TO DESIGN, PRICING, FABRICATION, PERMITTING, OR INSTALLATION.
 */

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface TsawwassenLumonParams {
  // Overall patio shell (all EST.)
  overallLengthFt: number;   // EST. 54'-0"
  overallDepthFt: number;    // EST. 18'-0"
  overallHeightFt: number;   // EST. clear underside of beams ~8'-6" to 9'-0"

  // Timber structure
  postSizeIn: number;        // EST. 8" (nominal square)
  beamDepthIn: number;       // EST. 12"–14"
  joistDepthIn: number;      // EST. 8"–10"

  // Bay layout (front face)
  frontBayCount: number;     // EST. 6 structural bays
  frontBayWidthFt: number;   // EST. 8'-0" to 9'-0" typical

  // Side returns
  leftReturnBayCount: number;  // EST. 2 bays
  rightReturnBayCount: number; // EST. 2 bays

  // Lumon system
  lowerGlassHeightIn: number;  // 160mm handrail system = ~6.3" + glass above = ~42" total railing
  upperGlassHeightIn: number;  // EST. sliding panels above railing to beam
  glassMm: number;             // 8mm clear tempered safety glass
  handrailHeightMm: number;    // 160mm standard

  // Openings
  accessDoorWidthIn: number;   // EST. 36" clear
  accessDoorCount: number;     // EST. 2 (one each end)

  // Stacking zones
  stackingZoneFt: number;      // 3'-0" per end (Lumon standard)

  // Site
  projectName: string;
  projectAddress: string;
  drawnBy: string;
  checkedBy: string;
  revisionDate: string;
  revisionDescription: string;
}

export const DEFAULT_TSAWWASSEN_PARAMS: TsawwassenLumonParams = {
  overallLengthFt: 54,
  overallDepthFt: 18,
  overallHeightFt: 9,
  postSizeIn: 8,
  beamDepthIn: 13,
  joistDepthIn: 9,
  frontBayCount: 6,
  frontBayWidthFt: 9,
  leftReturnBayCount: 2,
  rightReturnBayCount: 2,
  lowerGlassHeightIn: 42,
  upperGlassHeightIn: 66,
  glassMm: 8,
  handrailHeightMm: 160,
  accessDoorWidthIn: 36,
  accessDoorCount: 2,
  stackingZoneFt: 3,
  projectName: "Milestones Tsawwassen",
  projectAddress: "Tsawwassen, BC",
  drawnBy: "Ranaldo Daniels",
  checkedBy: "Eagle Eye Management",
  revisionDate: "2026-06-16",
  revisionDescription: "Concept Issue",
};

// ─── Drawing Utilities ───────────────────────────────────────────────────────

const GOLD = "#C9A84C";
const BLACK = "#1A1A1A";
const GREY_LIGHT = "#E8E8E8";
const GREY_MED = "#999999";
const GREY_DARK = "#555555";
const BLUE_LUMON = "#1E4D8C";
const RED_EST = "#CC3333";
const WHITE = "#FFFFFF";

/** Format a dimension string with EST. prefix */
function estDim(value: string): string {
  return `EST. ${value}`;
}

/** Convert feet to SVG units at a given scale (px per ft) */
function ft(feet: number, scale: number): number {
  return feet * scale;
}

/** Convert inches to SVG units at a given scale (px per ft) */
function inch(inches: number, scale: number): number {
  return (inches / 12) * scale;
}

/** Standard title block SVG fragment */
function titleBlock(
  svgW: number,
  svgH: number,
  sheetNum: string,
  sheetTitle: string,
  scale: string,
  p: TsawwassenLumonParams
): string {
  const tbH = 110;
  const tbW = 220;
  const x = svgW - tbW - 10;
  const y = svgH - tbH - 10;
  return `
  <!-- Title Block -->
  <rect x="${x}" y="${y}" width="${tbW}" height="${tbH}" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>
  <!-- Eagle Eye header bar -->
  <rect x="${x}" y="${y}" width="${tbW}" height="18" fill="${BLACK}"/>
  <text x="${x + tbW / 2}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="${GOLD}">EAGLE EYE MANAGEMENT</text>
  <!-- Project name -->
  <text x="${x + 5}" y="${y + 30}" font-family="Arial" font-size="7.5" font-weight="bold" fill="${BLACK}">${p.projectName}</text>
  <text x="${x + 5}" y="${y + 40}" font-family="Arial" font-size="6.5" fill="${GREY_DARK}">${p.projectAddress}</text>
  <!-- Gold rule -->
  <line x1="${x + 5}" y1="${y + 44}" x2="${x + tbW - 5}" y2="${y + 44}" stroke="${GOLD}" stroke-width="1"/>
  <!-- Sheet title -->
  <text x="${x + 5}" y="${y + 55}" font-family="Arial" font-size="8" font-weight="bold" fill="${BLACK}">${sheetTitle}</text>
  <!-- Fields -->
  <text x="${x + 5}" y="${y + 67}" font-family="Arial" font-size="6" fill="${GREY_DARK}">DRAWN BY: ${p.drawnBy}</text>
  <text x="${x + 5}" y="${y + 76}" font-family="Arial" font-size="6" fill="${GREY_DARK}">CHECKED BY: ${p.checkedBy}</text>
  <text x="${x + 5}" y="${y + 85}" font-family="Arial" font-size="6" fill="${GREY_DARK}">DATE: ${p.revisionDate}</text>
  <text x="${x + 5}" y="${y + 94}" font-family="Arial" font-size="6" fill="${GREY_DARK}">SCALE: ${scale}</text>
  <!-- Sheet number box -->
  <rect x="${x + tbW - 55}" y="${y + 60}" width="50" height="40" fill="${GREY_LIGHT}" stroke="${BLACK}" stroke-width="0.8"/>
  <text x="${x + tbW - 30}" y="${y + 77}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${BLACK}">${sheetNum}</text>
  <!-- Status stamp -->
  <rect x="${x + 5}" y="${y + 98}" width="${tbW - 65}" height="8" fill="none" stroke="${RED_EST}" stroke-width="0.8"/>
  <text x="${x + (tbW - 60) / 2}" y="${y + 105}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${RED_EST}" font-weight="bold">CONCEPT DESIGN — NOT FOR CONSTRUCTION</text>
  `;
}

/** Revision table SVG fragment (right margin, vertical) */
function revisionTable(
  svgW: number,
  svgH: number,
  p: TsawwassenLumonParams
): string {
  const x = svgW - 230;
  const y = 10;
  return `
  <!-- Revision Table -->
  <rect x="${x}" y="${y}" width="220" height="32" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
  <rect x="${x}" y="${y}" width="220" height="10" fill="${BLACK}"/>
  <text x="${x + 110}" y="${y + 8}" text-anchor="middle" font-family="Arial" font-size="6" font-weight="bold" fill="${GOLD}">REVISION TABLE</text>
  <line x1="${x + 20}" y1="${y + 10}" x2="${x + 20}" y2="${y + 32}" stroke="${BLACK}" stroke-width="0.5"/>
  <line x1="${x + 100}" y1="${y + 10}" x2="${x + 100}" y2="${y + 32}" stroke="${BLACK}" stroke-width="0.5"/>
  <line x1="${x + 160}" y1="${y + 10}" x2="${x + 160}" y2="${y + 32}" stroke="${BLACK}" stroke-width="0.5"/>
  <text x="${x + 10}" y="${y + 19}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">NO.</text>
  <text x="${x + 60}" y="${y + 19}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">DESCRIPTION</text>
  <text x="${x + 130}" y="${y + 19}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">DATE</text>
  <text x="${x + 185}" y="${y + 19}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">INITIALS</text>
  <line x1="${x}" y1="${y + 21}" x2="${x + 220}" y2="${y + 21}" stroke="${BLACK}" stroke-width="0.5"/>
  <text x="${x + 10}" y="${y + 29}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">Rev 00</text>
  <text x="${x + 60}" y="${y + 29}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.revisionDescription}</text>
  <text x="${x + 130}" y="${y + 29}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.revisionDate}</text>
  <text x="${x + 185}" y="${y + 29}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">RD</text>
  `;
}

/** Disclaimer strip SVG fragment (bottom of sheet) */
function disclaimerStrip(svgW: number, svgH: number): string {
  const h = 22;
  const y = svgH - h;
  return `
  <!-- Disclaimer Strip -->
  <rect x="0" y="${y}" width="${svgW}" height="${h}" fill="${GREY_LIGHT}" stroke="${BLACK}" stroke-width="0.5"/>
  <text x="${svgW / 2}" y="${y + 8}" text-anchor="middle" font-family="Arial" font-size="5" fill="${RED_EST}" font-weight="bold">DIMENSIONS ESTIMATED FROM SITE PHOTOGRAPHS — FIELD VERIFY PRIOR TO DESIGN, PRICING, FABRICATION, PERMITTING, OR INSTALLATION.</text>
  <text x="${svgW / 2}" y="${y + 16}" text-anchor="middle" font-family="Arial" font-size="4.5" fill="${GREY_DARK}">CONCEPTUAL LUMON SYSTEM — FINAL PROFILE, GLASS, TRACK, HARDWARE, ANCHORAGE, AND ENGINEERING BY LUMON. NOT FOR CONSTRUCTION, PERMIT, FABRICATION, OR INSTALLATION.</text>
  `;
}

/** Member legend SVG fragment */
function memberLegend(x: number, y: number): string {
  const members = [
    ["01", "Existing timber post (est. 8\"×8\")"],
    ["02", "Existing timber perimeter beam (est. 8\"×12\"–14\")"],
    ["03", "Existing timber roof joist/slat (est. 4\"×8\"–10\")"],
    ["04", "Proposed Lumon 160mm lower railing + sliding glazing"],
    ["05", "Proposed Lumon 160mm lower railing + fixed glazing"],
    ["06", "Proposed Lumon retractable/sliding upper glazing"],
    ["07", "Proposed Lumon 70×70mm intermediate aluminum post"],
    ["08", "Proposed access door / clear opening"],
    ["09", "Existing storefront (windows + doors)"],
    ["10", "Existing concrete slab"],
    ["11", "Existing black glazing post (est. 3\"×3\" or 4\"×4\")"],
    ["12", "Existing clear glass windscreen panel"],
  ];
  let out = `
  <!-- Member Legend -->
  <rect x="${x}" y="${y}" width="230" height="${12 + members.length * 13}" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
  <rect x="${x}" y="${y}" width="230" height="12" fill="${BLACK}"/>
  <text x="${x + 115}" y="${y + 9}" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="bold" fill="${GOLD}">MEMBER LEGEND</text>
  `;
  members.forEach(([num, desc], i) => {
    const ry = y + 12 + i * 13;
    out += `
    <rect x="${x}" y="${ry}" width="230" height="13" fill="${i % 2 === 0 ? WHITE : GREY_LIGHT}" stroke="none"/>
    <line x1="${x}" y1="${ry}" x2="${x + 230}" y2="${ry}" stroke="${GREY_MED}" stroke-width="0.3"/>
    <!-- Diamond callout -->
    <polygon points="${x + 10},${ry + 6.5} ${x + 15},${ry + 3} ${x + 20},${ry + 6.5} ${x + 15},${ry + 10}" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
    <text x="${x + 15}" y="${ry + 9}" text-anchor="middle" font-family="Arial" font-size="5" font-weight="bold" fill="${BLACK}">${num}</text>
    <text x="${x + 25}" y="${ry + 9}" font-family="Arial" font-size="5.5" fill="${BLACK}">${desc}</text>
    `;
  });
  out += `<rect x="${x}" y="${y}" width="230" height="${12 + members.length * 13}" fill="none" stroke="${BLACK}" stroke-width="0.8"/>`;
  return out;
}

/** North arrow SVG fragment */
function northArrow(x: number, y: number): string {
  return `
  <!-- North Arrow -->
  <circle cx="${x}" cy="${y}" r="16" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
  <polygon points="${x},${y - 14} ${x - 5},${y + 4} ${x},${y + 2} ${x + 5},${y + 4}" fill="${BLACK}"/>
  <polygon points="${x},${y - 14} ${x - 5},${y + 4} ${x},${y + 2} ${x + 5},${y + 4}" fill="${WHITE}" clip-path="url(#northHalf)"/>
  <text x="${x}" y="${y - 18}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="${BLACK}">N</text>
  `;
}

/** Scale bar SVG fragment */
function scaleBar(x: number, y: number, scalePxPerFt: number, totalFt: number): string {
  const barW = scalePxPerFt * totalFt;
  const mid = barW / 2;
  return `
  <!-- Scale Bar -->
  <rect x="${x}" y="${y}" width="${barW}" height="5" fill="${BLACK}"/>
  <rect x="${x + mid}" y="${y}" width="${mid}" height="5" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.5"/>
  <text x="${x}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">0</text>
  <text x="${x + mid}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">${totalFt / 2}'</text>
  <text x="${x + barW}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">${totalFt}'</text>
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 8}" stroke="${BLACK}" stroke-width="0.8"/>
  <line x1="${x + mid}" y1="${y}" x2="${x + mid}" y2="${y + 8}" stroke="${BLACK}" stroke-width="0.8"/>
  <line x1="${x + barW}" y1="${y}" x2="${x + barW}" y2="${y + 8}" stroke="${BLACK}" stroke-width="0.8"/>
  `;
}

/** Diamond-shaped member callout bubble */
function memberBubble(cx: number, cy: number, num: string): string {
  const s = 10;
  return `
  <polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
  <text x="${cx}" y="${cy + 3.5}" text-anchor="middle" font-family="Arial" font-size="5.5" font-weight="bold" fill="${BLACK}">${num}</text>
  `;
}

/** Circle section callout bubble */
function sectionBubble(cx: number, cy: number, num: string, sheet: string): string {
  return `
  <circle cx="${cx}" cy="${cy}" r="9" fill="${WHITE}" stroke="${BLACK}" stroke-width="0.8"/>
  <line x1="${cx - 9}" y1="${cy}" x2="${cx + 9}" y2="${cy}" stroke="${BLACK}" stroke-width="0.5"/>
  <text x="${cx}" y="${cy - 1}" text-anchor="middle" font-family="Arial" font-size="5.5" font-weight="bold" fill="${BLACK}">${num}</text>
  <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="Arial" font-size="4.5" fill="${BLACK}">${sheet}</text>
  `;
}

/** FH / BH datum line */
function datumLine(x1: number, x2: number, y: number, label: string, value: string): string {
  return `
  <!-- Datum: ${label} -->
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${BLACK}" stroke-width="0.8" stroke-dasharray="4,2"/>
  <!-- Half-circle datum symbol -->
  <path d="M ${x1 - 8} ${y} A 8 8 0 0 1 ${x1 + 8} ${y} Z" fill="${BLACK}"/>
  <text x="${x1 - 12}" y="${y - 3}" text-anchor="end" font-family="Arial" font-size="6.5" font-weight="bold" fill="${BLACK}">${label}</text>
  <text x="${x1 - 12}" y="${y + 7}" text-anchor="end" font-family="Arial" font-size="5.5" fill="${GREY_DARK}">${value}</text>
  `;
}

/** Dimension string with arrows */
function dimString(
  x1: number, y1: number,
  x2: number, y2: number,
  label: string,
  offset: number = 15,
  isEst: boolean = true
): string {
  const isHoriz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const dimLabel = isEst ? estDim(label) : label;
  if (isHoriz) {
    const dy = y1 - offset;
    return `
    <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${dy}" stroke="${GREY_MED}" stroke-width="0.5"/>
    <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${dy}" stroke="${GREY_MED}" stroke-width="0.5"/>
    <line x1="${x1}" y1="${dy}" x2="${x2}" y2="${dy}" stroke="${BLACK}" stroke-width="0.7" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
    <text x="${(x1 + x2) / 2}" y="${dy - 3}" text-anchor="middle" font-family="Arial" font-size="6" fill="${isEst ? RED_EST : BLACK}">${dimLabel}</text>
    `;
  } else {
    const dx = x1 - offset;
    return `
    <line x1="${x1}" y1="${y1}" x2="${dx}" y2="${y1}" stroke="${GREY_MED}" stroke-width="0.5"/>
    <line x1="${x2}" y1="${y2}" x2="${dx}" y2="${y2}" stroke="${GREY_MED}" stroke-width="0.5"/>
    <line x1="${dx}" y1="${y1}" x2="${dx}" y2="${y2}" stroke="${BLACK}" stroke-width="0.7" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
    <text x="${dx - 4}" y="${(y1 + y2) / 2}" text-anchor="end" font-family="Arial" font-size="6" fill="${isEst ? RED_EST : BLACK}" transform="rotate(-90, ${dx - 4}, ${(y1 + y2) / 2})">${dimLabel}</text>
    `;
  }
}

/** Arrow marker defs */
const ARROW_DEFS = `
<defs>
  <marker id="arrowStart" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
    <path d="M 0 3 L 6 0 L 6 6 Z" fill="${BLACK}"/>
  </marker>
  <marker id="arrowEnd" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
    <path d="M 0 0 L 6 3 L 0 6 Z" fill="${BLACK}"/>
  </marker>
  <pattern id="hatchExisting" patternUnits="userSpaceOnUse" width="6" height="6">
    <path d="M 0 6 L 6 0" stroke="${GREY_MED}" stroke-width="0.5"/>
  </pattern>
  <pattern id="hatchConcrete" patternUnits="userSpaceOnUse" width="8" height="8">
    <path d="M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6" stroke="${GREY_MED}" stroke-width="0.4"/>
  </pattern>
  <pattern id="hatchGlass" patternUnits="userSpaceOnUse" width="6" height="6">
    <path d="M 0 0 L 6 6 M 6 0 L 0 6" stroke="#A0C8E8" stroke-width="0.4"/>
  </pattern>
</defs>
`;

// ─── Sheet EE-1.1: Estimated Existing Condition Plan ─────────────────────────

export function drawTsawwassenExistingPlan(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 620;
  const scale = 10; // px per ft
  const marginL = 80;
  const marginT = 80;

  const totalW = ft(p.overallLengthFt, scale);
  const totalD = ft(p.overallDepthFt, scale);
  const postSz = inch(p.postSizeIn, scale);
  const bayW = totalW / p.frontBayCount;
  const endBayW = ft(p.overallDepthFt * 0.4, scale); // approx side return bay width

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  // Sheet title
  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-1.1  ESTIMATED EXISTING-CONDITION PLAN</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">ALL DIMENSIONS ESTIMATED FROM SITE PHOTOGRAPHS — FIELD VERIFY ALL</text>`;

  // Concrete slab
  svg += `<rect x="${marginL}" y="${marginT}" width="${totalW}" height="${totalD}" fill="${GREY_LIGHT}" stroke="${GREY_MED}" stroke-width="0.8" stroke-dasharray="4,2"/>`;
  svg += `<text x="${marginL + totalW / 2}" y="${marginT + totalD / 2}" text-anchor="middle" font-family="Arial" font-size="6.5" fill="${GREY_MED}">EST. EXISTING CONCRETE SLAB</text>`;

  // Building wall (back)
  svg += `<rect x="${marginL - 8}" y="${marginT + totalD}" width="${totalW + 16}" height="12" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${marginL + totalW / 2}" y="${marginT + totalD + 9}" text-anchor="middle" font-family="Arial" font-size="6" fill="${WHITE}">EXISTING BUILDING WALL (BY OTHERS)</text>`;

  // Front face timber posts
  for (let i = 0; i <= p.frontBayCount; i++) {
    const px = marginL + i * bayW - postSz / 2;
    const py = marginT - postSz / 2;
    svg += `<rect x="${px}" y="${py}" width="${postSz}" height="${postSz}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
    svg += memberBubble(marginL + i * bayW, marginT - postSz - 14, "01");
    // Post tag P1, P2...
    svg += `<text x="${marginL + i * bayW}" y="${marginT - postSz - 26}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">P${i + 1}</text>`;
  }

  // Back face posts (at building wall)
  for (let i = 0; i <= p.frontBayCount; i++) {
    const px = marginL + i * bayW - postSz / 2;
    const py = marginT + totalD - postSz / 2;
    svg += `<rect x="${px}" y="${py}" width="${postSz}" height="${postSz}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
  }

  // Side return posts (left)
  for (let i = 0; i <= p.leftReturnBayCount; i++) {
    const px = marginL - postSz / 2;
    const py = marginT + i * endBayW - postSz / 2;
    if (i > 0) {
      svg += `<rect x="${px}" y="${py}" width="${postSz}" height="${postSz}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
    }
  }

  // Side return posts (right)
  for (let i = 0; i <= p.rightReturnBayCount; i++) {
    const px = marginL + totalW - postSz / 2;
    const py = marginT + i * endBayW - postSz / 2;
    if (i > 0) {
      svg += `<rect x="${px}" y="${py}" width="${postSz}" height="${postSz}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
    }
  }

  // Existing glass posts (front face — smaller, black)
  for (let i = 0; i < p.frontBayCount; i++) {
    const gpostX = marginL + i * bayW + bayW / 2;
    const gpostSz = 4;
    svg += `<rect x="${gpostX - gpostSz / 2}" y="${marginT - gpostSz / 2}" width="${gpostSz}" height="${gpostSz}" fill="${BLACK}" stroke="${BLACK}" stroke-width="0.5"/>`;
  }

  // Existing glass panels (front face — light blue)
  for (let i = 0; i < p.frontBayCount; i++) {
    const gx = marginL + i * bayW + postSz / 2;
    const gw = bayW - postSz;
    svg += `<rect x="${gx}" y="${marginT - 6}" width="${gw}" height="6" fill="url(#hatchGlass)" stroke="#A0C8E8" stroke-width="0.6"/>`;
    svg += memberBubble(gx + gw / 2, marginT - 18, "12");
  }

  // Perimeter beams (front)
  svg += `<rect x="${marginL - postSz / 2}" y="${marginT - postSz - inch(p.beamDepthIn, scale) / 2}" width="${totalW + postSz}" height="${inch(p.beamDepthIn, scale) / 2}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += memberBubble(marginL + totalW + 20, marginT - postSz - 5, "02");

  // Dimension strings
  svg += dimString(marginL, marginT - 50, marginL + totalW, marginT - 50, `${p.overallLengthFt}'-0"`, 0, true);
  svg += dimString(marginL - 50, marginT, marginL - 50, marginT + totalD, `${p.overallDepthFt}'-0"`, 0, true);

  // Bay dimensions
  for (let i = 0; i < p.frontBayCount; i++) {
    const bx1 = marginL + i * bayW;
    const bx2 = marginL + (i + 1) * bayW;
    svg += dimString(bx1, marginT - 25, bx2, marginT - 25, `${p.frontBayWidthFt}'-0"`, 0, true);
    // Side label
    svg += `<text x="${(bx1 + bx2) / 2}" y="${marginT + totalD + 25}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}" font-weight="bold">SIDE ${p.frontBayCount - i + 2}</text>`;
  }

  // North arrow
  svg += northArrow(marginL + totalW + 60, marginT + 30);

  // Scale bar
  svg += scaleBar(marginL, marginT + totalD + 40, scale, 20);

  // Member legend
  svg += memberLegend(svgW - 250, 50);

  // Revision table
  svg += revisionTable(svgW, svgH, p);

  // Title block
  svg += titleBlock(svgW, svgH, "EE-1.1", "ESTIMATED EXISTING-CONDITION PLAN", "1:120", p);

  // Disclaimer
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-1.2: Proposed Lumon Layout Plan ────────────────────────────────

export function drawTsawwassenProposedPlan(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 620;
  const scale = 10;
  const marginL = 80;
  const marginT = 80;

  const totalW = ft(p.overallLengthFt, scale);
  const totalD = ft(p.overallDepthFt, scale);
  const postSz = inch(p.postSizeIn, scale);
  const bayW = totalW / p.frontBayCount;
  const stackZoneW = ft(p.stackingZoneFt, scale);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-1.2  PROPOSED LUMON LAYOUT PLAN</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">ALL DIMENSIONS ESTIMATED — FIELD VERIFY ALL PRIOR TO LUMON FABRICATION</text>`;

  // Concrete slab
  svg += `<rect x="${marginL}" y="${marginT}" width="${totalW}" height="${totalD}" fill="${GREY_LIGHT}" stroke="${BLACK}" stroke-width="0.5" stroke-dasharray="3,2"/>`;

  // Building wall
  svg += `<rect x="${marginL - 8}" y="${marginT + totalD}" width="${totalW + 16}" height="12" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${marginL + totalW / 2}" y="${marginT + totalD + 9}" text-anchor="middle" font-family="Arial" font-size="6" fill="${WHITE}">EXISTING BUILDING WALL (BY OTHERS)</text>`;

  // Proposed Lumon glass line (front face — bold)
  svg += `<rect x="${marginL}" y="${marginT - 4}" width="${totalW}" height="4" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += memberBubble(marginL + totalW / 2, marginT - 20, "04");

  // Stacking zones
  svg += `<rect x="${marginL}" y="${marginT - 4}" width="${stackZoneW}" height="4" fill="${GOLD}" stroke="${GOLD}" stroke-width="0.5" opacity="0.7"/>`;
  svg += `<text x="${marginL + stackZoneW / 2}" y="${marginT + 8}" text-anchor="middle" font-family="Arial" font-size="5" fill="${GOLD}" font-weight="bold">STACK ZONE</text>`;
  svg += `<rect x="${marginL + totalW - stackZoneW}" y="${marginT - 4}" width="${stackZoneW}" height="4" fill="${GOLD}" stroke="${GOLD}" stroke-width="0.5" opacity="0.7"/>`;
  svg += `<text x="${marginL + totalW - stackZoneW / 2}" y="${marginT + 8}" text-anchor="middle" font-family="Arial" font-size="5" fill="${GOLD}" font-weight="bold">STACK ZONE</text>`;

  // Timber posts
  for (let i = 0; i <= p.frontBayCount; i++) {
    const px = marginL + i * bayW - postSz / 2;
    const py = marginT - postSz / 2;
    svg += `<rect x="${px}" y="${py}" width="${postSz}" height="${postSz}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
    svg += memberBubble(marginL + i * bayW, marginT - postSz - 14, "01");
    svg += `<text x="${marginL + i * bayW}" y="${marginT - postSz - 26}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">P${i + 1}</text>`;
  }

  // Lumon intermediate posts (70×70mm = ~2.75" = ~0.23ft)
  for (let i = 0; i < p.frontBayCount; i++) {
    const lpostX = marginL + i * bayW + bayW / 2;
    const lpostSz = 3;
    svg += `<rect x="${lpostX - lpostSz / 2}" y="${marginT - lpostSz / 2}" width="${lpostSz}" height="${lpostSz}" fill="${BLUE_LUMON}" stroke="${BLUE_LUMON}" stroke-width="0.5"/>`;
    svg += memberBubble(lpostX, marginT - 18, "07");
  }

  // Access door openings
  const doorW = inch(p.accessDoorWidthIn, scale);
  // Left door
  svg += `<rect x="${marginL + stackZoneW}" y="${marginT - 6}" width="${doorW}" height="6" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>`;
  svg += `<text x="${marginL + stackZoneW + doorW / 2}" y="${marginT + 14}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">DOOR BY OTHERS</text>`;
  svg += memberBubble(marginL + stackZoneW + doorW / 2, marginT - 22, "08");
  // Right door
  svg += `<rect x="${marginL + totalW - stackZoneW - doorW}" y="${marginT - 6}" width="${doorW}" height="6" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>`;
  svg += `<text x="${marginL + totalW - stackZoneW - doorW / 2}" y="${marginT + 14}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">DOOR BY OTHERS</text>`;
  svg += memberBubble(marginL + totalW - stackZoneW - doorW / 2, marginT - 22, "08");

  // Section callout bubbles
  svg += sectionBubble(marginL + totalW / 3, marginT + totalD / 2, "1", "EE-3.1");
  svg += sectionBubble(marginL + totalW * 2 / 3, marginT + totalD / 2, "2", "EE-3.2");

  // Elevation callout
  svg += `<text x="${marginL + totalW / 2}" y="${marginT - 60}" text-anchor="middle" font-family="Arial" font-size="6" fill="${BLACK}">▲ SEE EE-2.2 FRONT ELEVATION</text>`;

  // Dimension strings
  svg += dimString(marginL, marginT - 55, marginL + totalW, marginT - 55, `${p.overallLengthFt}'-0"`, 0, true);
  svg += dimString(marginL - 55, marginT, marginL - 55, marginT + totalD, `${p.overallDepthFt}'-0"`, 0, true);

  // Bay dimensions
  for (let i = 0; i < p.frontBayCount; i++) {
    const bx1 = marginL + i * bayW;
    const bx2 = marginL + (i + 1) * bayW;
    svg += dimString(bx1, marginT - 28, bx2, marginT - 28, `${p.frontBayWidthFt}'-0"`, 0, true);
    svg += `<text x="${(bx1 + bx2) / 2}" y="${marginT + totalD + 25}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}" font-weight="bold">SIDE ${p.frontBayCount - i + 2}</text>`;
  }

  // Stacking zone dims
  svg += dimString(marginL, marginT + totalD + 35, marginL + stackZoneW, marginT + totalD + 35, `${p.stackingZoneFt}'-0" STACK`, 0, false);
  svg += dimString(marginL + totalW - stackZoneW, marginT + totalD + 35, marginL + totalW, marginT + totalD + 35, `${p.stackingZoneFt}'-0" STACK`, 0, false);

  // North arrow
  svg += northArrow(marginL + totalW + 60, marginT + 30);

  // Scale bar
  svg += scaleBar(marginL, marginT + totalD + 50, scale, 20);

  // Responsibility note
  svg += `<text x="${marginL}" y="${marginT + totalD + 70}" font-family="Arial" font-size="5.5" fill="${GREY_DARK}">CONCEPTUAL LUMON SYSTEM — FINAL PROFILE, GLASS, TRACK, HARDWARE, ANCHORAGE, AND ENGINEERING BY LUMON.</text>`;
  svg += `<text x="${marginL}" y="${marginT + totalD + 80}" font-family="Arial" font-size="5.5" fill="${GREY_DARK}">EXISTING TIMBER STRUCTURE AND CONNECTIONS SHALL BE REVIEWED BY A QUALIFIED STRUCTURAL ENGINEER.</text>`;

  svg += memberLegend(svgW - 250, 50);
  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-1.2", "PROPOSED LUMON LAYOUT PLAN", "1:120", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-2.1: Estimated Existing Front Elevation ────────────────────────

export function drawTsawwassenExistingFrontElevation(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 560;
  const scaleH = 28; // px per ft (height)
  const scaleW = 10; // px per ft (width)
  const marginL = 80;
  const marginT = 60;

  const totalW = ft(p.overallLengthFt, scaleW);
  const totalH = ft(p.overallHeightFt, scaleH);
  const postSz = inch(p.postSizeIn, scaleW);
  const beamH = inch(p.beamDepthIn, scaleH);
  const bayW = totalW / p.frontBayCount;

  const baseY = marginT + totalH;
  const fhY = marginT;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-2.1  ESTIMATED EXISTING FRONT ELEVATION</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">ALL DIMENSIONS ESTIMATED FROM SITE PHOTOGRAPHS — FIELD VERIFY ALL</text>`;

  // Ground line
  svg += `<line x1="${marginL - 20}" y1="${baseY}" x2="${marginL + totalW + 20}" y2="${baseY}" stroke="${BLACK}" stroke-width="1.5"/>`;
  svg += `<text x="${marginL - 25}" y="${baseY + 4}" text-anchor="end" font-family="Arial" font-size="6" fill="${BLACK}">GL</text>`;

  // Timber posts
  for (let i = 0; i <= p.frontBayCount; i++) {
    const px = marginL + i * bayW - postSz / 2;
    svg += `<rect x="${px}" y="${fhY}" width="${postSz}" height="${totalH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
    svg += memberBubble(marginL + i * bayW, baseY + 20, "01");
    svg += `<text x="${marginL + i * bayW}" y="${baseY + 32}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">P${i + 1}</text>`;
  }

  // Perimeter beam (top)
  svg += `<rect x="${marginL - postSz / 2}" y="${fhY - beamH}" width="${totalW + postSz}" height="${beamH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += memberBubble(marginL + totalW + 20, fhY - beamH / 2, "02");

  // Existing glass panels (lower zone)
  const lowerGlassH = ft(p.lowerGlassHeightIn / 12, scaleH);
  for (let i = 0; i < p.frontBayCount; i++) {
    const gx = marginL + i * bayW + postSz / 2;
    const gw = bayW - postSz;
    const gy = baseY - lowerGlassH;
    svg += `<rect x="${gx}" y="${gy}" width="${gw}" height="${lowerGlassH}" fill="url(#hatchGlass)" stroke="#A0C8E8" stroke-width="0.6"/>`;
    // X mark for fixed
    svg += `<line x1="${gx + 2}" y1="${gy + 2}" x2="${gx + gw - 2}" y2="${gy + lowerGlassH - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    svg += `<line x1="${gx + gw - 2}" y1="${gy + 2}" x2="${gx + 2}" y2="${gy + lowerGlassH - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    svg += memberBubble(gx + gw / 2, gy + lowerGlassH / 2, "12");
  }

  // Existing black glazing posts
  for (let i = 0; i < p.frontBayCount; i++) {
    const gpx = marginL + i * bayW + bayW / 2 - 2;
    svg += `<rect x="${gpx}" y="${baseY - lowerGlassH}" width="4" height="${lowerGlassH}" fill="${BLACK}" stroke="${BLACK}" stroke-width="0.5"/>`;
    svg += memberBubble(gpx + 2, baseY - lowerGlassH - 14, "11");
  }

  // Heaters (simplified circles on posts)
  for (let i = 0; i <= p.frontBayCount; i++) {
    const hx = marginL + i * bayW;
    svg += `<circle cx="${hx}" cy="${fhY + 12}" r="5" fill="none" stroke="${GREY_DARK}" stroke-width="0.8"/>`;
    svg += `<text x="${hx}" y="${fhY - 4}" text-anchor="middle" font-family="Arial" font-size="4.5" fill="${GREY_DARK}">HEATER</text>`;
  }

  // FH datum
  svg += datumLine(marginL - 30, marginL + totalW + 10, fhY, "FH", `EST. ${p.overallHeightFt}'-0"`);

  // BH datum
  svg += datumLine(marginL - 30, marginL + totalW + 10, baseY, "BH", "0");

  // Dimension strings
  svg += dimString(marginL, marginT - 30, marginL + totalW, marginT - 30, `${p.overallLengthFt}'-0"`, 0, true);
  svg += dimString(marginL - 50, fhY, marginL - 50, baseY, `${p.overallHeightFt}'-0"`, 0, true);

  // Bay dims
  for (let i = 0; i < p.frontBayCount; i++) {
    const bx1 = marginL + i * bayW;
    const bx2 = marginL + (i + 1) * bayW;
    svg += dimString(bx1, baseY + 40, bx2, baseY + 40, `${p.frontBayWidthFt}'-0"`, 0, true);
    svg += `<text x="${(bx1 + bx2) / 2}" y="${baseY + 55}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}" font-weight="bold">SIDE ${p.frontBayCount - i + 2}</text>`;
  }

  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-2.1", "ESTIMATED EXISTING FRONT ELEVATION", "1:40", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-2.2: Proposed Lumon Front Elevation ────────────────────────────

export function drawTsawwassenProposedFrontElevation(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 560;
  const scaleH = 28;
  const scaleW = 10;
  const marginL = 80;
  const marginT = 60;

  const totalW = ft(p.overallLengthFt, scaleW);
  const totalH = ft(p.overallHeightFt, scaleH);
  const postSz = inch(p.postSizeIn, scaleW);
  const beamH = inch(p.beamDepthIn, scaleH);
  const bayW = totalW / p.frontBayCount;
  const lowerGlassH = ft(p.lowerGlassHeightIn / 12, scaleH);
  const upperGlassH = ft(p.upperGlassHeightIn / 12, scaleH);
  const stackZoneW = ft(p.stackingZoneFt, scaleW);
  const doorW = inch(p.accessDoorWidthIn, scaleW);

  const baseY = marginT + totalH;
  const fhY = marginT;
  const lowerGlassTopY = baseY - lowerGlassH;
  const upperGlassTopY = lowerGlassTopY - upperGlassH;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-2.2  PROPOSED LUMON FRONT ELEVATION</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">ALL DIMENSIONS ESTIMATED — FIELD VERIFY PRIOR TO LUMON FABRICATION</text>`;

  // Ground line
  svg += `<line x1="${marginL - 20}" y1="${baseY}" x2="${marginL + totalW + 20}" y2="${baseY}" stroke="${BLACK}" stroke-width="1.5"/>`;

  // Timber posts
  for (let i = 0; i <= p.frontBayCount; i++) {
    const px = marginL + i * bayW - postSz / 2;
    svg += `<rect x="${px}" y="${fhY}" width="${postSz}" height="${totalH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
    svg += memberBubble(marginL + i * bayW, baseY + 20, "01");
    svg += `<text x="${marginL + i * bayW}" y="${baseY + 32}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">P${i + 1}</text>`;
  }

  // Perimeter beam
  svg += `<rect x="${marginL - postSz / 2}" y="${fhY - beamH}" width="${totalW + postSz}" height="${beamH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += memberBubble(marginL + totalW + 20, fhY - beamH / 2, "02");

  // Lower railing glass (fixed — X marks)
  for (let i = 0; i < p.frontBayCount; i++) {
    const gx = marginL + i * bayW + postSz / 2;
    const gw = bayW - postSz;
    svg += `<rect x="${gx}" y="${lowerGlassTopY}" width="${gw}" height="${lowerGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1"/>`;
    svg += `<line x1="${gx + 2}" y1="${lowerGlassTopY + 2}" x2="${gx + gw - 2}" y2="${baseY - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    svg += `<line x1="${gx + gw - 2}" y1="${lowerGlassTopY + 2}" x2="${gx + 2}" y2="${baseY - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    svg += memberBubble(gx + gw / 2, lowerGlassTopY + lowerGlassH / 2, "05");
  }

  // Upper sliding glass (arrows showing direction)
  for (let i = 0; i < p.frontBayCount; i++) {
    const gx = marginL + i * bayW + postSz / 2;
    const gw = bayW - postSz;
    svg += `<rect x="${gx}" y="${upperGlassTopY}" width="${gw}" height="${upperGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1" opacity="0.8"/>`;
    // Sliding direction arrow
    const arrowDir = i < p.frontBayCount / 2 ? "←" : "→";
    svg += `<text x="${gx + gw / 2}" y="${upperGlassTopY + upperGlassH / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="12" fill="${BLUE_LUMON}">${arrowDir}</text>`;
    svg += memberBubble(gx + gw / 2, upperGlassTopY + 14, "04");
  }

  // Lumon intermediate posts
  for (let i = 0; i < p.frontBayCount; i++) {
    const lpx = marginL + i * bayW + bayW / 2 - 2;
    svg += `<rect x="${lpx}" y="${upperGlassTopY}" width="4" height="${lowerGlassH + upperGlassH}" fill="${BLUE_LUMON}" stroke="${BLUE_LUMON}" stroke-width="0.5"/>`;
    svg += memberBubble(lpx + 2, upperGlassTopY - 14, "07");
  }

  // 160mm handrail
  const handrailH = ft(160 / 304.8, scaleH);
  svg += `<rect x="${marginL}" y="${lowerGlassTopY - handrailH}" width="${totalW}" height="${handrailH}" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="0.8" opacity="0.5"/>`;
  svg += `<text x="${marginL + totalW + 5}" y="${lowerGlassTopY - handrailH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}">160mm HANDRAIL</text>`;

  // Stacking zones
  svg += `<rect x="${marginL}" y="${upperGlassTopY}" width="${stackZoneW}" height="${lowerGlassH + upperGlassH}" fill="${GOLD}" stroke="${GOLD}" stroke-width="0.5" opacity="0.25"/>`;
  svg += `<text x="${marginL + stackZoneW / 2}" y="${baseY + 10}" text-anchor="middle" font-family="Arial" font-size="5" fill="${GOLD}" font-weight="bold">STACK</text>`;
  svg += `<rect x="${marginL + totalW - stackZoneW}" y="${upperGlassTopY}" width="${stackZoneW}" height="${lowerGlassH + upperGlassH}" fill="${GOLD}" stroke="${GOLD}" stroke-width="0.5" opacity="0.25"/>`;
  svg += `<text x="${marginL + totalW - stackZoneW / 2}" y="${baseY + 10}" text-anchor="middle" font-family="Arial" font-size="5" fill="${GOLD}" font-weight="bold">STACK</text>`;

  // Access doors
  // Left door
  svg += `<rect x="${marginL + stackZoneW}" y="${upperGlassTopY}" width="${doorW}" height="${lowerGlassH + upperGlassH}" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>`;
  svg += `<text x="${marginL + stackZoneW + doorW / 2}" y="${baseY + 10}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">DOOR BY OTHERS</text>`;
  svg += memberBubble(marginL + stackZoneW + doorW / 2, upperGlassTopY - 14, "08");
  // Right door
  svg += `<rect x="${marginL + totalW - stackZoneW - doorW}" y="${upperGlassTopY}" width="${doorW}" height="${lowerGlassH + upperGlassH}" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>`;
  svg += `<text x="${marginL + totalW - stackZoneW - doorW / 2}" y="${baseY + 10}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">DOOR BY OTHERS</text>`;
  svg += memberBubble(marginL + totalW - stackZoneW - doorW / 2, upperGlassTopY - 14, "08");

  // FH and BH datums
  svg += datumLine(marginL - 30, marginL + totalW + 10, fhY, "FH", `EST. ${p.overallHeightFt}'-0" (2750mm)`);
  svg += datumLine(marginL - 30, marginL + totalW + 10, baseY, "BH", "0");

  // Dimension strings
  svg += dimString(marginL, marginT - 30, marginL + totalW, marginT - 30, `${p.overallLengthFt}'-0"`, 0, true);
  svg += dimString(marginL - 50, fhY, marginL - 50, baseY, `${p.overallHeightFt}'-0"`, 0, true);
  svg += dimString(marginL - 35, lowerGlassTopY, marginL - 35, baseY, `${p.lowerGlassHeightIn}"`, 0, true);
  svg += dimString(marginL - 35, upperGlassTopY, marginL - 35, lowerGlassTopY, `${p.upperGlassHeightIn}"`, 0, true);

  // Bay dims
  for (let i = 0; i < p.frontBayCount; i++) {
    const bx1 = marginL + i * bayW;
    const bx2 = marginL + (i + 1) * bayW;
    svg += dimString(bx1, baseY + 40, bx2, baseY + 40, `${p.frontBayWidthFt}'-0"`, 0, true);
    svg += `<text x="${(bx1 + bx2) / 2}" y="${baseY + 55}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}" font-weight="bold">SIDE ${p.frontBayCount - i + 2}</text>`;
  }

  // Section callout
  svg += sectionBubble(marginL + totalW / 2, baseY - totalH / 2, "1", "EE-3.1");

  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-2.2", "PROPOSED LUMON FRONT ELEVATION", "1:40", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-2.3: Side Elevations ───────────────────────────────────────────

export function drawTsawwassenSideElevations(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 560;
  const scaleH = 28;
  const scaleW = 14;
  const marginL = 60;
  const marginT = 60;

  const totalD = ft(p.overallDepthFt, scaleW);
  const totalH = ft(p.overallHeightFt, scaleH);
  const postSz = inch(p.postSizeIn, scaleW);
  const beamH = inch(p.beamDepthIn, scaleH);
  const lowerGlassH = ft(p.lowerGlassHeightIn / 12, scaleH);
  const upperGlassH = ft(p.upperGlassHeightIn / 12, scaleH);
  const doorW = inch(p.accessDoorWidthIn, scaleW);

  const baseY = marginT + totalH;
  const fhY = marginT;
  const lowerGlassTopY = baseY - lowerGlassH;
  const upperGlassTopY = lowerGlassTopY - upperGlassH;

  // Two elevations side by side
  const leftX = marginL;
  const rightX = marginL + totalD + 80;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-2.3  SIDE ELEVATIONS (LEFT AND RIGHT)</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">ALL DIMENSIONS ESTIMATED — FIELD VERIFY ALL</text>`;

  function drawSideElev(ox: number, label: string, sideNum: string): string {
    let s = "";
    // Ground
    s += `<line x1="${ox - 10}" y1="${baseY}" x2="${ox + totalD + 10}" y2="${baseY}" stroke="${BLACK}" stroke-width="1.5"/>`;
    // Building wall (right side of elevation)
    s += `<rect x="${ox + totalD}" y="${fhY}" width="10" height="${totalH}" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
    s += `<text x="${ox + totalD + 14}" y="${fhY + totalH / 2}" font-family="Arial" font-size="5.5" fill="${GREY_DARK}" transform="rotate(90, ${ox + totalD + 14}, ${fhY + totalH / 2})">BUILDING WALL (BY OTHERS)</text>`;
    // Posts (front and back)
    s += `<rect x="${ox - postSz / 2}" y="${fhY}" width="${postSz}" height="${totalH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
    s += memberBubble(ox, baseY + 18, "01");
    // Beam
    s += `<rect x="${ox - postSz / 2}" y="${fhY - beamH}" width="${totalD + postSz / 2}" height="${beamH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="0.8"/>`;
    s += memberBubble(ox + totalD / 2, fhY - beamH / 2, "02");
    // Lower glass (end face)
    s += `<rect x="${ox}" y="${lowerGlassTopY}" width="${totalD * 0.4}" height="${lowerGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1"/>`;
    s += `<line x1="${ox + 2}" y1="${lowerGlassTopY + 2}" x2="${ox + totalD * 0.4 - 2}" y2="${baseY - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    s += `<line x1="${ox + totalD * 0.4 - 2}" y1="${lowerGlassTopY + 2}" x2="${ox + 2}" y2="${baseY - 2}" stroke="${GREY_MED}" stroke-width="0.8"/>`;
    s += memberBubble(ox + totalD * 0.2, lowerGlassTopY + lowerGlassH / 2, "05");
    // Upper glass (retractable above existing structure)
    s += `<rect x="${ox}" y="${upperGlassTopY}" width="${totalD * 0.4}" height="${upperGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1" opacity="0.8"/>`;
    s += `<text x="${ox + totalD * 0.2}" y="${upperGlassTopY + upperGlassH / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="7" fill="${BLUE_LUMON}">↔</text>`;
    s += memberBubble(ox + totalD * 0.2, upperGlassTopY + 14, "06");
    s += `<text x="${ox + totalD * 0.4 + 5}" y="${upperGlassTopY + upperGlassH / 2}" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}">RETRACTABLE GLAZING</text>`;
    s += `<text x="${ox + totalD * 0.4 + 5}" y="${upperGlassTopY + upperGlassH / 2 + 8}" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}">ABOVE EX. STRUCTURE</text>`;
    // Door opening
    s += `<rect x="${ox + totalD * 0.4 + 5}" y="${upperGlassTopY}" width="${doorW}" height="${lowerGlassH + upperGlassH}" fill="${WHITE}" stroke="${BLACK}" stroke-width="1.2"/>`;
    s += `<text x="${ox + totalD * 0.4 + 5 + doorW / 2}" y="${baseY + 10}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">DOOR BY OTHERS</text>`;
    s += memberBubble(ox + totalD * 0.4 + 5 + doorW / 2, upperGlassTopY - 14, "08");
    // FH/BH datums
    s += datumLine(ox - 30, ox + totalD + 10, fhY, "FH", `EST. ${p.overallHeightFt}'-0"`);
    s += datumLine(ox - 30, ox + totalD + 10, baseY, "BH", "0");
    // Dims
    s += dimString(ox, marginT - 25, ox + totalD, marginT - 25, `${p.overallDepthFt}'-0"`, 0, true);
    s += dimString(ox - 45, fhY, ox - 45, baseY, `${p.overallHeightFt}'-0"`, 0, true);
    // Label
    s += `<text x="${ox + totalD / 2}" y="${baseY + 50}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="${BLACK}">① ${label} — ${sideNum}</text>`;
    s += `<text x="${ox + totalD / 2}" y="${baseY + 62}" text-anchor="middle" font-family="Arial" font-size="6" fill="${BLACK}">1 : 40</text>`;
    return s;
  }

  svg += drawSideElev(leftX, "LEFT SIDE ELEVATION", "SIDE L");
  svg += drawSideElev(rightX, "RIGHT SIDE ELEVATION", "SIDE R");

  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-2.3", "SIDE ELEVATIONS — LEFT AND RIGHT", "1:40", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-3.1: LGS Typical Section ──────────────────────────────────────

export function drawTsawwassenTypicalSection(p: TsawwassenLumonParams): string {
  const svgW = 700;
  const svgH = 560;
  const scaleH = 40; // 1:15 approx
  const marginL = 120;
  const marginT = 60;

  const totalH = ft(p.overallHeightFt, scaleH);
  const lowerGlassH = ft(p.lowerGlassHeightIn / 12, scaleH);
  const upperGlassH = ft(p.upperGlassHeightIn / 12, scaleH);
  const handrailH = ft(160 / 304.8, scaleH);
  const glassW = 30; // visual width of glass panel in section

  const baseY = marginT + totalH;
  const lowerGlassTopY = baseY - lowerGlassH;
  const upperGlassTopY = lowerGlassTopY - upperGlassH;
  const handrailY = lowerGlassTopY - handrailH;
  const fhY = marginT;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-3.1  LGS TYPICAL SECTION</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">CONCEPTUAL — FINAL SECTION BY LUMON. ALL DIMS EST. — FIELD VERIFY.</text>`;

  const cx = marginL + 60;

  // Concrete slab
  svg += `<rect x="${cx - 40}" y="${baseY}" width="80" height="18" fill="url(#hatchConcrete)" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${cx}" y="${baseY + 13}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">EXISTING CONCRETE SLAB</text>`;
  svg += memberBubble(cx + 55, baseY + 9, "10");

  // Lumon base anchor
  svg += `<rect x="${cx - 5}" y="${baseY - 8}" width="10" height="8" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += `<line x1="${cx - 3}" y1="${baseY}" x2="${cx - 3}" y2="${baseY + 14}" stroke="${BLACK}" stroke-width="0.8" stroke-dasharray="2,1"/>`;
  svg += `<line x1="${cx + 3}" y1="${baseY}" x2="${cx + 3}" y2="${baseY + 14}" stroke="${BLACK}" stroke-width="0.8" stroke-dasharray="2,1"/>`;
  svg += `<text x="${cx + 55}" y="${baseY - 2}" font-family="Arial" font-size="5.5" fill="${BLACK}">7.5×75 MULTIMONTI CONCRETE SCREW</text>`;
  svg += `<text x="${cx + 55}" y="${baseY + 7}" font-family="Arial" font-size="5.5" fill="${BLACK}">MIN. 45mm EMBEDMENT (CONCEPTUAL)</text>`;

  // Lower railing glass
  svg += `<rect x="${cx - glassW / 2}" y="${lowerGlassTopY}" width="${glassW}" height="${lowerGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1.2"/>`;
  svg += `<text x="${cx + 55}" y="${lowerGlassTopY + lowerGlassH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.glassMm}MM CLEAR TEMPERED SAFETY GLASS</text>`;
  svg += memberBubble(cx + 50, lowerGlassTopY + lowerGlassH / 2, "05");
  svg += dimString(cx - 55, lowerGlassTopY, cx - 55, baseY, `${p.lowerGlassHeightIn}"`, 0, true);

  // 160mm handrail
  svg += `<rect x="${cx - 20}" y="${handrailY}" width="40" height="${handrailH}" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${cx + 55}" y="${handrailY + handrailH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLACK}">160mm HANDRAIL</text>`;
  // Detail callout
  svg += sectionBubble(cx + 45, handrailY + handrailH / 2, "3", "EE-3.1");

  // Upper sliding glass
  svg += `<rect x="${cx - glassW / 2}" y="${upperGlassTopY}" width="${glassW}" height="${upperGlassH}" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1.2" opacity="0.8"/>`;
  svg += `<text x="${cx + 55}" y="${upperGlassTopY + upperGlassH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.glassMm}MM CLEAR TEMPERED SAFETY GLASS</text>`;
  svg += `<text x="${cx + 55}" y="${upperGlassTopY + upperGlassH / 2 + 12}" font-family="Arial" font-size="5.5" fill="${BLUE_LUMON}">(SLIDING PANEL ABOVE RAILING)</text>`;
  svg += memberBubble(cx + 50, upperGlassTopY + upperGlassH / 2, "04");
  svg += dimString(cx - 55, upperGlassTopY, cx - 55, lowerGlassTopY, `${p.upperGlassHeightIn}"`, 0, true);

  // Upper head track
  const trackH = 12;
  svg += `<rect x="${cx - 20}" y="${upperGlassTopY - trackH}" width="40" height="${trackH}" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${cx + 55}" y="${upperGlassTopY - trackH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLACK}">LUMON HEAD TRACK (CONCEPTUAL)</text>`;
  svg += sectionBubble(cx + 45, upperGlassTopY - trackH / 2, "2", "EE-3.1");

  // Timber beam (top)
  const beamH = ft(p.beamDepthIn / 12, scaleH);
  svg += `<rect x="${cx - 35}" y="${fhY - beamH}" width="70" height="${beamH}" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="1"}/>`;
  svg += `<text x="${cx + 55}" y="${fhY - beamH / 2 + 3}" font-family="Arial" font-size="5.5" fill="${BLACK}">EXISTING TIMBER BEAM (BY OTHERS)</text>`;
  svg += memberBubble(cx + 50, fhY - beamH / 2, "02");

  // FH/BH datums
  svg += datumLine(cx - 80, cx + 50, fhY, "FH", `EST. ${p.overallHeightFt}'-0" (${Math.round(p.overallHeightFt * 304.8)}mm)`);
  svg += datumLine(cx - 80, cx + 50, baseY, "BH", "0");

  // Total height dim
  svg += dimString(cx - 70, fhY, cx - 70, baseY, `${p.overallHeightFt}'-0"`, 0, true);

  // Responsibility note
  svg += `<text x="20" y="${svgH - 80}" font-family="Arial" font-size="5.5" fill="${RED_EST}">CONCEPTUAL LUMON SYSTEM — FINAL PROFILE, GLASS, TRACK, HARDWARE, ANCHORAGE, AND ENGINEERING BY LUMON.</text>`;
  svg += `<text x="20" y="${svgH - 70}" font-family="Arial" font-size="5.5" fill="${GREY_DARK}">EXISTING TIMBER STRUCTURE, CONNECTIONS, AND FOUNDATIONS SHALL BE REVIEWED BY A QUALIFIED STRUCTURAL ENGINEER.</text>`;

  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-3.1", "LGS TYPICAL SECTION", "1:15", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── Sheet EE-3.2: Connection Details ────────────────────────────────────────

export function drawTsawwassenConnectionDetails(p: TsawwassenLumonParams): string {
  const svgW = 900;
  const svgH = 620;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += ARROW_DEFS;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${WHITE}"/>`;

  svg += `<text x="20" y="30" font-family="Arial" font-size="11" font-weight="bold" fill="${BLACK}">EE-3.2  CONCEPTUAL CONNECTION DETAILS</text>`;
  svg += `<text x="20" y="44" font-family="Arial" font-size="7" fill="${RED_EST}">CONCEPTUAL ONLY — FINAL CONNECTION DETAILS, FASTENERS, AND ENGINEERING BY LUMON</text>`;

  // ── Detail 1: LGR Upper Connection (top-left) ──
  const d1x = 60, d1y = 80;
  svg += `<text x="${d1x}" y="${d1y - 10}" font-family="Arial" font-size="7.5" font-weight="bold" fill="${BLACK}">① LGR UPPER CONNECTION  1:7</text>`;
  // Timber beam
  svg += `<rect x="${d1x}" y="${d1y}" width="80" height="25" fill="url(#hatchExisting)" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${d1x + 40}" y="${d1y + 16}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">EXISTING TIMBER BEAM (BY OTHERS)</text>`;
  // Aluminum beam by others
  svg += `<rect x="${d1x + 15}" y="${d1y + 25}" width="50" height="12" fill="${GREY_LIGHT}" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += `<text x="${d1x + 40}" y="${d1y + 34}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">PERGOLA ALUM. BEAM (BY OTHERS)</text>`;
  // Glass panel
  svg += `<rect x="${d1x + 28}" y="${d1y + 37}" width="8" height="40" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1}"/>`;
  svg += `<text x="${d1x + 100}" y="${d1y + 57}" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.glassMm}MM CLEAR TEMPERED SAFETY GLASS</text>`;
  // Fastener note
  svg += `<text x="${d1x + 100}" y="${d1y + 37}" font-family="Arial" font-size="5.5" fill="${BLACK}">M6×40 S.S. DRILL &amp; TAP INTO ALUM. BEAM</text>`;
  svg += `<text x="${d1x + 100}" y="${d1y + 46}" font-family="Arial" font-size="5.5" fill="${BLACK}">(1 SCREW EACH END + 1 PER GLASS PANEL)</text>`;
  svg += `<text x="${d1x + 100}" y="${d1y + 55}" font-family="Arial" font-size="5.5" fill="${RED_EST}">(CONCEPTUAL — FINAL BY LUMON)</text>`;

  // ── Detail 2: LGR &amp; Railing Connection (top-right) ──
  const d2x = 420, d2y = 80;
  svg += `<text x="${d2x}" y="${d2y - 10}" font-family="Arial" font-size="7.5" font-weight="bold" fill="${BLACK}">② LGR &amp; RAILING CONNECTION  1:7</text>`;
  // 160mm handrail
  svg += `<rect x="${d2x}" y="${d2y + 10}" width="60" height="20}" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${d2x + 30}" y="${d2y + 23}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${WHITE}">160mm HANDRAIL</text>`;
  // Handrail bracket
  svg += `<rect x="${d2x + 20}" y="${d2y + 30}" width="20" height="12" fill="${GREY_DARK}" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += `<text x="${d2x + 100}" y="${d2y + 39}" font-family="Arial" font-size="5.5" fill="${BLACK}">HANDRAIL BRACKET</text>`;
  // Glass panels (upper and lower)
  svg += `<rect x="${d2x + 26}" y="${d2y + 42}" width="8" height="35" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1"/>`;
  svg += `<rect x="${d2x + 26}" y="${d2y - 20}" width="8" height="30" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1}"/>`;
  // Fastener notes
  svg += `<text x="${d2x + 100}" y="${d2y + 10}" font-family="Arial" font-size="5.5" fill="${BLACK}">(1) M6×40 S.S. BOLTED THROUGH AT EACH LGS PANEL</text>`;
  svg += `<text x="${d2x + 100}" y="${d2y + 19}" font-family="Arial" font-size="5.5" fill="${BLACK}">(1) M8×20 S.S. BOLT &amp; NUT AT EACH GLASS SUPPORT</text>`;
  svg += `<text x="${d2x + 100}" y="${d2y + 28}" font-family="Arial" font-size="5.5" fill="${BLACK}">(2) M12×40 S.S. DRILLED &amp; TAPPED INTO LUMON POST</text>`;
  svg += `<text x="${d2x + 100}" y="${d2y + 37}" font-family="Arial" font-size="5.5" fill="${RED_EST}">(CONCEPTUAL — FINAL BY LUMON)</text>`;

  // ── Detail 3: 70×70 Post Section (bottom-left) ──
  const d3x = 60, d3y = 280;
  svg += `<text x="${d3x}" y="${d3y - 10}" font-family="Arial" font-size="7.5" font-weight="bold" fill="${BLACK}">③ 70×70mm LUMON POST SECTION  1:5</text>`;
  // Post section
  svg += `<rect x="${d3x + 20}" y="${d3y}" width="28" height="28" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="1.2"/>`;
  svg += `<rect x="${d3x + 23}" y="${d3y + 3}" width="22" height="22" fill="${WHITE}" stroke="none"/>`;
  svg += `<text x="${d3x + 34}" y="${d3y + 17}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">70×70mm</text>`;
  svg += `<text x="${d3x + 34}" y="${d3y + 24}" text-anchor="middle" font-family="Arial" font-size="5" fill="${BLACK}">ALUM. POST</text>`;
  // Glass panels each side
  svg += `<rect x="${d3x}" y="${d3y + 5}" width="20" height="8" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="0.8"/>`;
  svg += `<rect x="${d3x + 48}" y="${d3y + 5}" width="20" height="8" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="0.8"/>`;
  svg += `<text x="${d3x + 110}" y="${d3y + 15}" font-family="Arial" font-size="5.5" fill="${BLACK}">70×70mm ALUMINUM POST (CONCEPTUAL)</text>`;
  svg += `<text x="${d3x + 110}" y="${d3y + 24}" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.glassMm}MM CLEAR TEMPERED SAFETY GLASS EACH SIDE</text>`;
  svg += `<text x="${d3x + 110}" y="${d3y + 33}" font-family="Arial" font-size="5.5" fill="${RED_EST}">(FINAL POST SIZE, PROFILE, AND CONNECTIONS BY LUMON)</text>`;

  // ── Detail 4: Railing Lower / Base Anchor (bottom-right) ──
  const d4x = 420, d4y = 280;
  svg += `<text x="${d4x}" y="${d4y - 10}" font-family="Arial" font-size="7.5" font-weight="bold" fill="${BLACK}">④ RAILING LOWER CONNECTION  1:7</text>`;
  // Concrete slab
  svg += `<rect x="${d4x}" y="${d4y + 60}" width="100" height="25" fill="url(#hatchConcrete)" stroke="${BLACK}" stroke-width="1"/>`;
  svg += `<text x="${d4x + 50}" y="${d4y + 75}" text-anchor="middle" font-family="Arial" font-size="5.5" fill="${BLACK}">EXISTING CONCRETE SLAB</text>`;
  // Base anchor
  svg += `<rect x="${d4x + 40}" y="${d4y + 50}" width="20" height="10" fill="${BLUE_LUMON}" stroke="${BLACK}" stroke-width="0.8"/>`;
  svg += `<line x1="${d4x + 46}" y1="${d4y + 60}" x2="${d4x + 46}" y2="${d4y + 80}" stroke="${BLACK}" stroke-width="0.8" stroke-dasharray="2,1"/>`;
  svg += `<line x1="${d4x + 54}" y1="${d4y + 60}" x2="${d4x + 54}" y2="${d4y + 80}" stroke="${BLACK}" stroke-width="0.8" stroke-dasharray="2,1"/>`;
  // Glass panel
  svg += `<rect x="${d4x + 46}" y="${d4y}" width="8" height="50" fill="url(#hatchGlass)" stroke="${BLUE_LUMON}" stroke-width="1"/>`;
  svg += `<text x="${d4x + 120}" y="${d4y + 20}" font-family="Arial" font-size="5.5" fill="${BLACK}">${p.glassMm}MM CLEAR TEMPERED SAFETY GLASS</text>`;
  svg += `<text x="${d4x + 120}" y="${d4y + 55}" font-family="Arial" font-size="5.5" fill="${BLACK}">7.5×75 MULTIMONTI CONCRETE SCREW</text>`;
  svg += `<text x="${d4x + 120}" y="${d4y + 64}" font-family="Arial" font-size="5.5" fill="${BLACK}">1 SCREW EACH END + 1 PER GLASS PANEL SEAM</text>`;
  svg += `<text x="${d4x + 120}" y="${d4y + 73}" font-family="Arial" font-size="5.5" fill="${BLACK}">MIN. 45mm EMBEDMENT INTO CONCRETE</text>`;
  svg += `<text x="${d4x + 120}" y="${d4y + 82}" font-family="Arial" font-size="5.5" fill="${RED_EST}">(CONCEPTUAL — FINAL BY LUMON)</text>`;

  // Responsibility note
  svg += `<text x="20" y="${svgH - 80}" font-family="Arial" font-size="5.5" fill="${RED_EST}">ALL DETAILS CONCEPTUAL — FINAL CONNECTION DETAILS, FASTENER SIZES, EMBEDMENT DEPTHS, AND ENGINEERING BY LUMON.</text>`;

  svg += revisionTable(svgW, svgH, p);
  svg += titleBlock(svgW, svgH, "EE-3.2", "CONCEPTUAL CONNECTION DETAILS", "AS INDICATED", p);
  svg += disclaimerStrip(svgW, svgH);

  svg += `</svg>`;
  return svg;
}

// ─── QTO Calculation ─────────────────────────────────────────────────────────

export interface TsawwassenQTOLineItem {
  description: string;
  quantity: string;
  unit: string;
  note: string;
}

export function calculateTsawwassenQTO(p: TsawwassenLumonParams): TsawwassenQTOLineItem[] {
  const frontBays = p.frontBayCount;
  const frontBayW = p.frontBayWidthFt;
  const lowerGlassHFt = p.lowerGlassHeightIn / 12;
  const upperGlassHFt = p.upperGlassHeightIn / 12;

  // Front face glass areas
  const lowerGlassAreaFront = frontBays * frontBayW * lowerGlassHFt;
  const upperGlassAreaFront = frontBays * frontBayW * upperGlassHFt;

  // Side returns (approx)
  const sideReturnDepth = p.overallDepthFt * 0.4;
  const sideGlassArea = (p.leftReturnBayCount + p.rightReturnBayCount) * sideReturnDepth * (lowerGlassHFt + upperGlassHFt);

  const totalGlassArea = lowerGlassAreaFront + upperGlassAreaFront + sideGlassArea;

  // Posts
  const lumonPosts = frontBays + (p.leftReturnBayCount + p.rightReturnBayCount) * 2;

  return [
    { description: "Lower railing glass (8mm clear tempered, fixed)", quantity: `EST. ${lowerGlassAreaFront.toFixed(1)}`, unit: "SF", note: "Front face only — field verify" },
    { description: "Upper sliding glass (8mm clear tempered, sliding)", quantity: `EST. ${upperGlassAreaFront.toFixed(1)}`, unit: "SF", note: "Front face only — field verify" },
    { description: "Side return glass (lower + upper combined)", quantity: `EST. ${sideGlassArea.toFixed(1)}`, unit: "SF", note: "Both ends — field verify" },
    { description: "Total glass area (all faces)", quantity: `EST. ${totalGlassArea.toFixed(1)}`, unit: "SF", note: "Field verify all dimensions" },
    { description: "160mm handrail system (linear)", quantity: `EST. ${(p.overallLengthFt + sideReturnDepth * 2).toFixed(1)}`, unit: "LF", note: "Front face + side returns" },
    { description: "Lumon 70×70mm intermediate posts", quantity: `EST. ${lumonPosts}`, unit: "EA", note: "Approx. 1 per bay" },
    { description: "Access door openings (by others)", quantity: `${p.accessDoorCount}`, unit: "EA", note: "Door frames by others" },
    { description: "Base anchor assemblies (concrete screw)", quantity: `EST. ${lumonPosts + frontBays * 2}`, unit: "EA", note: "Field verify slab thickness" },
    { description: "Head track (upper guide)", quantity: `EST. ${(p.overallLengthFt + sideReturnDepth * 2).toFixed(1)}`, unit: "LF", note: "Field verify" },
    { description: "Stacking zones (both ends)", quantity: `${p.stackingZoneFt * 2}`, unit: "LF", note: `${p.stackingZoneFt}'-0" each end` },
  ];
}
