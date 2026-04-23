/**
 * Simple Enclosure module — parametric geometry and QTO logic.
 * Rule-based only. No AI-generated geometry.
 * All drawings labeled "Concept Only – Not For Construction".
 */

import type { EnclosureParams } from "./scopeTypes";

// ─── QTO ─────────────────────────────────────────────────────────────────────

export interface EnclosureQTOItem {
  category: string;
  description: string;
  unit: string;
  qty: number;
  unitRate: number;
  lineTotal: number;
  basis: string;
}

export function getEnclosureDefaultRates(): Record<string, number> {
  return {
    "Aluminium frame posts (100×100 SHS)": 520,
    "Top + bottom frame rails (100×50 RHS)": 88,
    "Intermediate vertical mullions": 320,
    "Post base plates + anchor bolts": 195,
    "Panel gaskets, sealant, and fixing hardware": 35,
    "Door hardware (handle, lock, closer, hinges)": 480,
    "Site establishment, access, protection": 1400,
    "Engineering certification (concept-level)": 2200,
  };
}

export function calculateEnclosureQTO(p: EnclosureParams, rateOverrides?: Record<string, number>): EnclosureQTOItem[] {
  const ro = rateOverrides ?? {};
  const w = p.widthFt;
  const d = p.depthFt;
  const h = p.heightFt;

  // Panel areas per face
  const frontArea = p.encloseFront ? w * h : 0;
  const rearArea = p.encloseRear ? w * h : 0;
  const leftArea = p.encloseLeft ? d * h : 0;
  const rightArea = p.encloseRight ? d * h : 0;
  const totalPanelAreaSqFt = frontArea + rearArea + leftArea + rightArea;

  // Door deduction
  const doorAreaSqFt = p.hasDoor ? p.doorWidthFt * h * 0.9 : 0;
  const netPanelAreaSqFt = Math.max(0, totalPanelAreaSqFt - doorAreaSqFt);

  // Frame perimeter (all enclosed faces)
  const enclosedFaces = [
    p.encloseFront ? w : 0,
    p.encloseRear ? w : 0,
    p.encloseLeft ? d : 0,
    p.encloseRight ? d : 0,
  ].reduce((a, b) => a + b, 0);
  const frameLinearFt = enclosedFaces * 2 + (enclosedFaces > 0 ? 4 * h : 0); // top + bottom + verticals

  // Posts at corners of enclosed faces
  const cornerCount = [p.encloseFront, p.encloseLeft, p.encloseRight, p.encloseRear].filter(Boolean).length * 2;

  const panelLabel = p.panelOption === "glass"
    ? "Frameless glass panels (12mm toughened)"
    : p.panelOption === "polycarbonate"
    ? "Polycarbonate panels (16mm twin-wall)"
    : "Solid aluminium panels";

  const panelRate = p.panelOption === "glass" ? 285 : p.panelOption === "polycarbonate" ? 145 : 185;

  const items: EnclosureQTOItem[] = [
    // ── Structure ──
    {
      category: "Structure",
      description: "Aluminium frame posts (100×100 SHS)",
      unit: "ea",
      qty: cornerCount,
      unitRate: 520,
      lineTotal: 0,
      basis: `Corner posts for enclosed faces`,
    },
    {
      category: "Structure",
      description: "Top + bottom frame rails (100×50 RHS)",
      unit: "lm",
      qty: Math.round(frameLinearFt * 0.3048 * 10) / 10,
      unitRate: 88,
      lineTotal: 0,
      basis: `All enclosed face perimeters`,
    },
    {
      category: "Structure",
      description: "Intermediate vertical mullions",
      unit: "ea",
      qty: Math.ceil(enclosedFaces / 4),
      unitRate: 320,
      lineTotal: 0,
      basis: `1 per 4ft of enclosed width`,
    },
    {
      category: "Structure",
      description: "Post base plates + anchor bolts",
      unit: "ea",
      qty: cornerCount,
      unitRate: 195,
      lineTotal: 0,
      basis: `1 per post`,
    },
  ];

  // ── Panels ──
  if (netPanelAreaSqFt > 0) {
    items.push({
      category: "Glazing / Panels",
      description: panelLabel,
      unit: "m²",
      qty: Math.round(netPanelAreaSqFt * 0.0929 * 1.05 * 10) / 10,
      unitRate: panelRate,
      lineTotal: 0,
      basis: `Net panel area + 5% waste`,
    });
    items.push({
      category: "Glazing / Panels",
      description: "Panel gaskets, sealant, and fixing hardware",
      unit: "m²",
      qty: Math.round(netPanelAreaSqFt * 0.0929 * 10) / 10,
      unitRate: 35,
      lineTotal: 0,
      basis: `Per panel area`,
    });
  }

  // ── Door ──
  if (p.hasDoor) {
    items.push({
      category: "Doors",
      description: `Aluminium framed ${p.panelOption === "glass" ? "glass" : "panel"} door (${p.doorWidthFt}ft wide)`,
      unit: "ea",
      qty: 1,
      unitRate: 2200,
      lineTotal: 0,
      basis: `Single door opening`,
    });
    items.push({
      category: "Doors",
      description: "Door hardware (handle, lock, closer, hinges)",
      unit: "set",
      qty: 1,
      unitRate: 480,
      lineTotal: 0,
      basis: `Per door`,
    });
  }

  // ── Finishes ──
  items.push({
    category: "Finishes",
    description: `Powder coat finish — ${p.finishColor}`,
    unit: "m²",
    qty: Math.round(frameLinearFt * 0.3048 * 0.3 * 10) / 10, // frame surface area estimate
    unitRate: 65,
    lineTotal: 0,
    basis: `Frame surface area`,
  });

  // ── Preliminaries ──
  items.push({
    category: "Preliminaries",
    description: "Site establishment, access, protection",
    unit: "item",
    qty: 1,
    unitRate: 1400,
    lineTotal: 0,
    basis: `Lump sum`,
  });
  items.push({
    category: "Preliminaries",
    description: "Engineering certification (concept-level)",
    unit: "item",
    qty: 1,
    unitRate: 2200,
    lineTotal: 0,
    basis: `Allowance`,
  });

  // Apply rateOverrides if present
  return items.map(item => ({
    ...item,
    unitRate: ro[item.description] ?? item.unitRate,
    lineTotal: Math.round(item.qty * (ro[item.description] ?? item.unitRate) * 100) / 100,
  }));
}

export function calculateEnclosureGrandTotal(items: EnclosureQTOItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
}

// ─── SVG Drawings ─────────────────────────────────────────────────────────────

const GOLD = "#C9A84C";
const DARK = "#111111";
const GREY = "#6B7280";
const LIGHT = "#EFF6FF";
const DISCLAIMER = "Concept Only – Not For Construction";

/** Plan view — Lumon enclosure with operable sliding panels and door zone */
export function enclosurePlanSVG(p: EnclosureParams): string {
  const W = 560, H = 360;
  const scale = Math.min((W - 100) / p.widthFt, (H - 100) / p.depthFt);
  const rw = p.widthFt * scale;
  const rd = p.depthFt * scale;
  const ox = (W - rw) / 2;
  const oy = (H - rd) / 2;

  // Lumon panel zones: left (35%), center (35%), right (30%)
  const leftZoneW = rw * 0.35;
  const centerZoneW = rw * 0.35;
  const rightZoneW = rw - leftZoneW - centerZoneW;
  
  const leftZone = `<rect x="${ox}" y="${oy}" width="${leftZoneW}" height="${rd}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="${ox + leftZoneW / 2}" y="${oy + rd / 2 - 8}" text-anchor="middle" font-size="7" font-weight="600" fill="${GOLD}">OPERABLE</text>
    <text x="${ox + leftZoneW / 2}" y="${oy + rd / 2}" text-anchor="middle" font-size="7" font-weight="600" fill="${GOLD}">LUMON</text>
    <text x="${ox + leftZoneW / 2}" y="${oy + rd / 2 + 10}" text-anchor="middle" font-size="6" fill="${GREY}">2.44×3.35m</text>`;
  
  const centerZone = `<rect x="${ox + leftZoneW}" y="${oy}" width="${centerZoneW}" height="${rd}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="${ox + leftZoneW + centerZoneW / 2}" y="${oy + rd / 2 - 8}" text-anchor="middle" font-size="7" font-weight="600" fill="${GOLD}">OPERABLE</text>
    <text x="${ox + leftZoneW + centerZoneW / 2}" y="${oy + rd / 2}" text-anchor="middle" font-size="7" font-weight="600" fill="${GOLD}">LUMON</text>
    <text x="${ox + leftZoneW + centerZoneW / 2}" y="${oy + rd / 2 + 10}" text-anchor="middle" font-size="6" fill="${GREY}">2.44×4.57m</text>`;
  
  const doorW = 2.67 * scale; // 32" ≈ 2.67 ft
  const rightZoneX = ox + leftZoneW + centerZoneW;
  const doorX = rightZoneX + rightZoneW / 2 - doorW / 2;
  const rightZone = `<rect x="${rightZoneX}" y="${oy}" width="${rightZoneW}" height="${rd}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3,2"/>
    <rect x="${doorX}" y="${oy}" width="${doorW}" height="${rd}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
    <line x1="${doorX + doorW / 2}" y1="${oy}" x2="${doorX + doorW / 2}" y2="${oy + rd}" stroke="${GREY}" stroke-width="0.5"/>
    <circle cx="${doorX + doorW * 0.7}" cy="${oy + rd / 2}" r="2" fill="${GOLD}"/>
    <text x="${doorX + doorW / 2}" y="${oy + rd / 2 - 4}" text-anchor="middle" font-size="6" fill="${GOLD}" font-weight="600">32" DOOR</text>
    <text x="${rightZoneX + rightZoneW / 2}" y="${oy + rd - 6}" text-anchor="middle" font-size="6" fill="${GOLD}">SLIDING</text>`;
  
  const railingNote = `<text x="${ox}" y="${oy - 12}" font-size="6" fill="${GOLD}" font-weight="600">NOTE: Coordinate with existing railing</text>`;
  const door = `${leftZone}${centerZone}${rightZone}${railingNote}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <!-- Floor area -->
  <rect x="${ox}" y="${oy}" width="${rw}" height="${rd}" fill="${LIGHT}" stroke="${GREY}" stroke-width="0.5" stroke-dasharray="4,3"/>
  <!-- Lumon panel zones and door -->
  ${door}
  <!-- Dimensions -->
  <line x1="${ox}" y1="${oy - 18}" x2="${ox + rw}" y2="${oy - 18}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw / 2}" y="${oy - 22}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.widthFt.toFixed(2)}ft</text>
  <line x1="${ox + rw + 18}" y1="${oy}" x2="${ox + rw + 18}" y2="${oy + rd}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw + 32}" y="${oy + rd / 2}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rw + 32},${oy + rd / 2})">${p.depthFt.toFixed(2)}ft</text>
  <!-- Labels -->
  <text x="${ox + rw / 2}" y="${oy + rd / 2}" text-anchor="middle" font-size="9" fill="${GREY}">FLOOR PLAN</text>
  <text x="${ox + rw / 2}" y="${oy + rd / 2 + 14}" text-anchor="middle" font-size="8" fill="${GOLD}">${p.panelOption.toUpperCase().replace("_", " ")} PANELS</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">PLAN VIEW — ENCLOSURE</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Front elevation */
export function enclosureFrontElevSVG(p: EnclosureParams): string {
  const W = 560, H = 360;
  const scale = Math.min((W - 100) / p.widthFt, (H - 100) / p.heightFt);
  const rw = p.widthFt * scale;
  const rh = p.heightFt * scale;
  const ox = (W - rw) / 2;
  const oy = H - 50;

  // Frame outline
  const frame = `<rect x="${ox}" y="${oy - rh}" width="${rw}" height="${rh}" fill="${LIGHT}" stroke="${DARK}" stroke-width="2"/>`;

  // Panel divisions (mullions every ~4ft)
  const mullionSpacing = 4 * scale;
  let mullions = "";
  for (let x = ox + mullionSpacing; x < ox + rw - 5; x += mullionSpacing) {
    mullions += `<line x1="${x}" y1="${oy - rh}" x2="${x}" y2="${oy}" stroke="${GREY}" stroke-width="0.8" stroke-dasharray="3,2"/>`;
  }

  // Door
  const doorW = p.hasDoor ? p.doorWidthFt * scale : 0;
  const doorX = ox + rw / 2 - doorW / 2;
  const door = p.hasDoor
    ? `<rect x="${doorX}" y="${oy - rh * 0.9}" width="${doorW}" height="${rh * 0.9}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
       <line x1="${doorX + doorW / 2}" y1="${oy - rh * 0.9}" x2="${doorX + doorW / 2}" y2="${oy}" stroke="${GREY}" stroke-width="0.5"/>
       <circle cx="${doorX + doorW * 0.75}" cy="${oy - rh * 0.45}" r="3" fill="${GOLD}"/>
       <text x="${doorX + doorW / 2}" y="${oy - rh * 0.9 - 6}" text-anchor="middle" font-size="8" fill="${GOLD}">DOOR</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <!-- Ground -->
  <line x1="${ox - 20}" y1="${oy}" x2="${ox + rw + 20}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>
  ${frame}${mullions}${door}
  <!-- Dimensions -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rw}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.widthFt.toFixed(2)}ft</text>
  <line x1="${ox - 30}" y1="${oy}" x2="${ox - 30}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox - 44}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(-90,${ox - 44},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">FRONT ELEVATION — ENCLOSURE</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Side elevation */
export function enclosureSideElevSVG(p: EnclosureParams): string {
  const W = 560, H = 360;
  const scale = Math.min((W - 100) / p.depthFt, (H - 100) / p.heightFt);
  const rd = p.depthFt * scale;
  const rh = p.heightFt * scale;
  const ox = (W - rd) / 2;
  const oy = H - 50;

  const frame = `<rect x="${ox}" y="${oy - rh}" width="${rd}" height="${rh}" fill="${LIGHT}" stroke="${DARK}" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <line x1="${ox - 20}" y1="${oy}" x2="${ox + rd + 20}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>
  ${frame}
  <!-- Depth dimension -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rd}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.depthFt.toFixed(2)}ft</text>
  <!-- Height dimension -->
  <line x1="${ox + rd + 22}" y1="${oy}" x2="${ox + rd + 22}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd + 38}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rd + 38},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">SIDE ELEVATION — ENCLOSURE</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Section A-A */
export function enclosureSectionSVG(p: EnclosureParams): string {
  const W = 560, H = 360;
  const scale = Math.min((W - 100) / p.depthFt, (H - 100) / p.heightFt);
  const rd = p.depthFt * scale;
  const rh = p.heightFt * scale;
  const ox = (W - rd) / 2;
  const oy = H - 50;

  const frameThick = 6;
  const leftWall = p.encloseLeft ? `<rect x="${ox}" y="${oy - rh}" width="${frameThick}" height="${rh}" fill="${DARK}"/>` : "";
  const rightWall = p.encloseRight ? `<rect x="${ox + rd - frameThick}" y="${oy - rh}" width="${frameThick}" height="${rh}" fill="${DARK}"/>` : "";
  const topRail = `<rect x="${ox}" y="${oy - rh}" width="${rd}" height="${frameThick}" fill="${DARK}"/>`;
  const bottomRail = `<rect x="${ox}" y="${oy - frameThick}" width="${rd}" height="${frameThick}" fill="${DARK}"/>`;

  // Panel fill
  const panelFill = p.panelOption === "glass" ? "rgba(147,197,253,0.25)" : p.panelOption === "polycarbonate" ? "rgba(167,243,208,0.25)" : "#E5E7EB";
  const panelLeft = p.encloseLeft ? ox + frameThick : ox;
  const panelRight = p.encloseRight ? ox + rd - frameThick : ox + rd;
  const panel = `<rect x="${panelLeft}" y="${oy - rh + frameThick}" width="${panelRight - panelLeft}" height="${rh - frameThick * 2}" fill="${panelFill}" stroke="${GREY}" stroke-width="0.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <line x1="${ox - 20}" y1="${oy}" x2="${ox + rd + 20}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>
  ${panel}${leftWall}${rightWall}${topRail}${bottomRail}
  <!-- Section label -->
  <text x="${ox + rd / 2}" y="${oy - rh / 2}" text-anchor="middle" font-size="8" fill="${GOLD}">SECTION A–A</text>
  <text x="${ox + rd / 2}" y="${oy - rh / 2 + 13}" text-anchor="middle" font-size="8" fill="${GREY}">${p.panelOption.replace("_", " ").toUpperCase()}</text>
  <!-- Depth dimension -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rd}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.depthFt.toFixed(2)}ft</text>
  <!-- Height dimension -->
  <line x1="${ox + rd + 22}" y1="${oy}" x2="${ox + rd + 22}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd + 38}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rd + 38},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">SECTION A–A — ENCLOSURE</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}
