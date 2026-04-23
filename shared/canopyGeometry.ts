/**
 * Canopy module — parametric geometry and QTO logic.
 * Rule-based only. No AI-generated geometry.
 * All drawings labeled "Concept Only – Not For Construction".
 */

import type { CanopyParams } from "./scopeTypes";

// ─── QTO ─────────────────────────────────────────────────────────────────────

export interface CanopyQTOItem {
  lineKey?: string;   // Injected by calculateCanopyQTO
  category: string;
  description: string;
  unit: string;
  qty: number;
  unitRate: number;
  lineTotal: number;
  basis: string;
}

export function getCanopyDefaultRates(): Record<string, number> {
  return {
    "Aluminium canopy frame (primary rafters + purlins)": 420,
    "Freestanding support posts (150×150 AL SHS)": 680,
    "Post base plates + anchor bolts": 220,
    "Wall-mount brackets + fixings": 145,
    "Wall ledger channel (150×75 AL RHS)": 95,
    "Aluminium roofing panel / sheet": 185,
    "LED strip lighting (integrated into fascia/rafters)": 95,
    "Recessed downlights (IP65)": 285,
    "Site establishment, access, protection": 1200,
    "Engineering certification (concept-level)": 1800,
  };
}

export function calculateCanopyQTO(p: CanopyParams, rateOverrides?: Record<string, number>): CanopyQTOItem[] {
  const ro = rateOverrides ?? {};
  const w = p.widthFt;
  const proj = p.projectionFt;
  const h = p.heightFt;

  // Derived areas / lengths
  const roofAreaSqFt = w * proj;
  const fasciaPerimeterFt = w * 2 + proj * 2; // all 4 sides
  const frontFasciaFt = w; // primary visible fascia
  const supportCount = p.supportType === "freestanding" ? Math.ceil(w / 6) : 0; // wall-mounted = 0 posts
  const wallBracketCount = p.supportType !== "freestanding" ? Math.ceil(w / 2) + 2 : 0;

  const items: Omit<CanopyQTOItem, 'lineKey'>[] = [
    // ── Structure ──
    {
      category: "Structure",
      description: "Aluminium canopy frame (primary rafters + purlins)",
      unit: "m²",
      qty: Math.round(roofAreaSqFt * 0.0929 * 10) / 10,
      unitRate: 420,
      lineTotal: 0,
      basis: `${w}ft × ${proj}ft roof area`,
    },
    {
      category: "Structure",
      description: `Fascia panel — ${p.fasciaStyle} profile`,
      unit: "lm",
      qty: Math.round(frontFasciaFt * 0.3048 * 10) / 10,
      unitRate: 185,
      lineTotal: 0,
      basis: `${w}ft front fascia`,
    },
    {
      category: "Structure",
      description: "Return fascia (sides)",
      unit: "lm",
      qty: Math.round(proj * 2 * 0.3048 * 10) / 10,
      unitRate: 185,
      lineTotal: 0,
      basis: `2 × ${proj}ft side returns`,
    },
  ];

  if (supportCount > 0) {
    items.push({
      category: "Structure",
      description: "Freestanding support posts (150×150 AL SHS)",
      unit: "ea",
      qty: supportCount,
      unitRate: 680,
      lineTotal: 0,
      basis: `1 post per 6ft span`,
    });
    items.push({
      category: "Structure",
      description: "Post base plates + anchor bolts",
      unit: "ea",
      qty: supportCount,
      unitRate: 220,
      lineTotal: 0,
      basis: `1 per post`,
    });
  }

  if (wallBracketCount > 0) {
    items.push({
      category: "Structure",
      description: "Wall-mount brackets + fixings",
      unit: "ea",
      qty: wallBracketCount,
      unitRate: 145,
      lineTotal: 0,
      basis: `1 per 2ft of wall span`,
    });
    items.push({
      category: "Structure",
      description: "Wall ledger channel (150×75 AL RHS)",
      unit: "lm",
      qty: Math.round(w * 0.3048 * 10) / 10,
      unitRate: 95,
      lineTotal: 0,
      basis: `Full width`,
    });
  }

  // ── Roofing ──
  items.push({
    category: "Roofing",
    description: "Aluminium roofing panel / sheet",
    unit: "m²",
    qty: Math.round(roofAreaSqFt * 0.0929 * 1.05 * 10) / 10, // 5% waste
    unitRate: 185,
    lineTotal: 0,
    basis: `Roof area + 5% waste`,
  });

  // ── Lighting ──
  if (p.lightingOption === "led_strip") {
    items.push({
      category: "Electrical",
      description: "LED strip lighting (integrated into fascia/rafters)",
      unit: "lm",
      qty: Math.round(fasciaPerimeterFt * 0.3048 * 10) / 10,
      unitRate: 95,
      lineTotal: 0,
      basis: `Fascia perimeter`,
    });
  } else if (p.lightingOption === "downlights") {
    const dlCount = Math.ceil(roofAreaSqFt / 12);
    items.push({
      category: "Electrical",
      description: "Recessed downlights (IP65)",
      unit: "ea",
      qty: dlCount,
      unitRate: 285,
      lineTotal: 0,
      basis: `1 per 12 sq ft`,
    });
  }

  // ── Finishes ──
  items.push({
    category: "Finishes",
    description: `Powder coat finish — ${p.finishColor}`,
    unit: "m²",
    qty: Math.round(roofAreaSqFt * 0.0929 * 2.2 * 10) / 10, // surface area factor
    unitRate: 65,
    lineTotal: 0,
    basis: `Roof + fascia surface area`,
  });

  // ── Preliminaries ──
  items.push({
    category: "Preliminaries",
    description: "Site establishment, access, protection",
    unit: "item",
    qty: 1,
    unitRate: 1200,
    lineTotal: 0,
    basis: `Lump sum`,
  });
  items.push({
    category: "Preliminaries",
    description: "Engineering certification (concept-level)",
    unit: "item",
    qty: 1,
    unitRate: 1800,
    lineTotal: 0,
    basis: `Allowance`,
  });

  // Calculate line totals — apply rateOverrides if present
  return items.map(item => ({
    ...item,
    lineKey: `${item.category}:${item.description}`,
    unitRate: ro[item.description] ?? item.unitRate,
    lineTotal: Math.round(item.qty * (ro[item.description] ?? item.unitRate) * 100) / 100,
  }));
}

export function calculateCanopyGrandTotal(items: CanopyQTOItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
}

// ─── SVG Drawings ─────────────────────────────────────────────────────────────

const GOLD = "#C9A84C";
const DARK = "#111111";
const GREY = "#6B7280";
const LIGHT = "#F3F4F6";
const DISCLAIMER = "Concept Only – Not For Construction";

/** Plan view (top-down) */
export function canopyPlanSVG(p: CanopyParams): string {
  const W = 560, H = 320;
  const scale = Math.min((W - 80) / p.widthFt, (H - 80) / p.projectionFt);
  const rw = p.widthFt * scale;
  const rd = p.projectionFt * scale;
  const ox = (W - rw) / 2;
  const oy = (H - rd) / 2;

  // Support posts or wall line
  const wallLine = p.supportType !== "freestanding"
    ? `<line x1="${ox}" y1="${oy}" x2="${ox + rw}" y2="${oy}" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`
    : "";

  // Posts if freestanding
  const postCount = p.supportType === "freestanding" ? Math.max(2, Math.ceil(p.widthFt / 6)) : 0;
  let posts = "";
  if (postCount > 0) {
    for (let i = 0; i < postCount; i++) {
      const px = ox + (i / (postCount - 1)) * rw;
      posts += `<rect x="${px - 5}" y="${oy + rd - 10}" width="10" height="10" fill="${DARK}" rx="1"/>`;
    }
  }

  // Slope indicator arrow
  const slopeArrow = `<line x1="${ox + rw / 2}" y1="${oy + rd - 10}" x2="${ox + rw / 2}" y2="${oy + 10}" stroke="${GOLD}" stroke-width="1.5" marker-end="url(#arrow)" stroke-dasharray="4,3"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="${GOLD}"/>
    </marker>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${GREY}" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <!-- Canopy roof area -->
  <rect x="${ox}" y="${oy}" width="${rw}" height="${rd}" fill="${LIGHT}" stroke="${DARK}" stroke-width="1.5"/>
  <!-- Hatch pattern on roof -->
  <rect x="${ox}" y="${oy}" width="${rw}" height="${rd}" fill="url(#hatch)"/>
  <!-- Wall line / posts -->
  ${wallLine}${posts}
  <!-- Slope arrow -->
  ${slopeArrow}
  <!-- Dimensions -->
  <line x1="${ox}" y1="${oy - 18}" x2="${ox + rw}" y2="${oy - 18}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw / 2}" y="${oy - 22}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.widthFt.toFixed(2)}ft</text>
  <line x1="${ox + rw + 18}" y1="${oy}" x2="${ox + rw + 18}" y2="${oy + rd}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw + 28}" y="${oy + rd / 2}" text-anchor="start" font-size="10" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rw + 28},${oy + rd / 2})">${p.projectionFt.toFixed(2)}ft</text>
  <!-- Labels -->
  <text x="${ox + rw / 2}" y="${oy + rd / 2}" text-anchor="middle" font-size="9" fill="${GREY}">CANOPY ROOF</text>
  <text x="${ox + rw / 2}" y="${oy + rd / 2 + 13}" text-anchor="middle" font-size="8" fill="${GOLD}">${p.fasciaStyle.toUpperCase()} FASCIA</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">PLAN VIEW — CANOPY</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Front elevation */
export function canopyFrontElevSVG(p: CanopyParams): string {
  const W = 560, H = 320;
  const scale = Math.min((W - 100) / p.widthFt, (H - 100) / (p.heightFt + 0.5));
  const rw = p.widthFt * scale;
  const rh = p.heightFt * scale;
  const slopeH = Math.tan((p.slopeDeg * Math.PI) / 180) * p.projectionFt * scale;
  const ox = (W - rw) / 2;
  const oy = H - 50;

  // Ground line
  const ground = `<line x1="${ox - 20}" y1="${oy}" x2="${ox + rw + 20}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>`;

  // Wall line (left side)
  const wall = p.supportType !== "freestanding"
    ? `<rect x="${ox - 20}" y="${oy - rh - slopeH - 10}" width="20" height="${rh + slopeH + 10}" fill="#374151" opacity="0.8"/>
       <text x="${ox - 10}" y="${oy - rh - slopeH - 14}" text-anchor="middle" font-size="7" fill="${GREY}">WALL</text>`
    : "";

  // Posts if freestanding
  const postCount = p.supportType === "freestanding" ? Math.max(2, Math.ceil(p.widthFt / 6)) : 0;
  let posts = "";
  if (postCount > 0) {
    for (let i = 0; i < postCount; i++) {
      const px = ox + (i / (postCount - 1)) * rw;
      posts += `<rect x="${px - 4}" y="${oy - rh}" width="8" height="${rh}" fill="${DARK}" rx="1"/>`;
    }
  }

  // Roof profile (sloped)
  const roofTop = oy - rh - slopeH;
  const roofBottom = oy - rh;
  const roofPath = `M${ox},${roofBottom} L${ox},${roofTop} L${ox + rw},${roofBottom} Z`;
  const fasciaH = 12;
  const fasciaPath = p.fasciaStyle === "tapered"
    ? `M${ox},${roofBottom} L${ox + rw},${roofBottom} L${ox + rw},${roofBottom + fasciaH * 0.6} L${ox},${roofBottom + fasciaH} Z`
    : `M${ox},${roofBottom} L${ox + rw},${roofBottom} L${ox + rw},${roofBottom + fasciaH} L${ox},${roofBottom + fasciaH} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  ${ground}${wall}${posts}
  <!-- Roof -->
  <path d="${roofPath}" fill="${LIGHT}" stroke="${DARK}" stroke-width="1.5"/>
  <!-- Fascia -->
  <path d="${fasciaPath}" fill="${DARK}" stroke="${DARK}" stroke-width="1"/>
  <!-- Height dimension -->
  <line x1="${ox - 35}" y1="${oy}" x2="${ox - 35}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox - 45}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(-90,${ox - 45},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Width dimension -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rw}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rw / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.widthFt.toFixed(2)}ft</text>
  <!-- Slope label -->
  <text x="${ox + rw / 2}" y="${oy - rh - slopeH / 2 - 6}" text-anchor="middle" font-size="8" fill="${GOLD}">${p.slopeDeg}° SLOPE</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">FRONT ELEVATION — CANOPY</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Side elevation */
export function canopySideElevSVG(p: CanopyParams): string {
  const W = 560, H = 320;
  const scale = Math.min((W - 100) / p.projectionFt, (H - 100) / (p.heightFt + 0.5));
  const rd = p.projectionFt * scale;
  const rh = p.heightFt * scale;
  const slopeH = Math.tan((p.slopeDeg * Math.PI) / 180) * p.projectionFt * scale;
  const ox = (W - rd) / 2;
  const oy = H - 50;

  const wallX = ox;
  const wall = p.supportType !== "freestanding"
    ? `<rect x="${wallX - 20}" y="${oy - rh - slopeH - 10}" width="20" height="${rh + slopeH + 10}" fill="#374151" opacity="0.8"/>
       <text x="${wallX - 10}" y="${oy - rh - slopeH - 14}" text-anchor="middle" font-size="7" fill="${GREY}">WALL</text>`
    : "";

  const roofPath = `M${ox},${oy - rh - slopeH} L${ox + rd},${oy - rh} L${ox + rd},${oy - rh + 12} L${ox},${oy - rh - slopeH + 12} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <!-- Ground -->
  <line x1="${ox - 20}" y1="${oy}" x2="${ox + rd + 20}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>
  ${wall}
  <!-- Roof profile -->
  <path d="${roofPath}" fill="${LIGHT}" stroke="${DARK}" stroke-width="1.5"/>
  <!-- Projection dimension -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rd}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.projectionFt.toFixed(2)}ft</text>
  <!-- Height dimension -->
  <line x1="${ox + rd + 22}" y1="${oy}" x2="${ox + rd + 22}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd + 38}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rd + 38},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">SIDE ELEVATION — CANOPY</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}

/** Section A-A */
export function canopySectionSVG(p: CanopyParams): string {
  const W = 560, H = 320;
  const scale = Math.min((W - 100) / p.projectionFt, (H - 100) / (p.heightFt + 0.5));
  const rd = p.projectionFt * scale;
  const rh = p.heightFt * scale;
  const slopeH = Math.tan((p.slopeDeg * Math.PI) / 180) * p.projectionFt * scale;
  const ox = (W - rd) / 2;
  const oy = H - 50;

  // Rafter profile
  const rafterPath = `M${ox},${oy - rh - slopeH} L${ox + rd},${oy - rh} L${ox + rd},${oy - rh + 8} L${ox},${oy - rh - slopeH + 8} Z`;

  // Fascia at front
  const fasciaX = ox + rd;
  const fasciaH = 20;
  const fasciaPath = `M${fasciaX},${oy - rh} L${fasciaX + 10},${oy - rh} L${fasciaX + 10},${oy - rh + fasciaH} L${fasciaX},${oy - rh + fasciaH} Z`;

  // Wall bracket
  const bracketPath = p.supportType !== "freestanding"
    ? `<rect x="${ox - 16}" y="${oy - rh - slopeH - 4}" width="16" height="8" fill="${GOLD}" rx="1"/>
       <text x="${ox - 8}" y="${oy - rh - slopeH - 8}" text-anchor="middle" font-size="7" fill="${GOLD}">BRACKET</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:Inter,sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <!-- Ground -->
  <line x1="${ox - 20}" y1="${oy}" x2="${ox + rd + 30}" y2="${oy}" stroke="${DARK}" stroke-width="1.5"/>
  <!-- Wall -->
  <rect x="${ox - 20}" y="${oy - rh - slopeH - 20}" width="20" height="${rh + slopeH + 20}" fill="#374151" opacity="0.8"/>
  <!-- Rafter -->
  <path d="${rafterPath}" fill="${DARK}" stroke="${DARK}" stroke-width="1"/>
  <!-- Fascia -->
  <path d="${fasciaPath}" fill="${DARK}" stroke="${DARK}" stroke-width="1"/>
  ${bracketPath}
  <!-- Section cut markers -->
  <text x="${ox + rd / 2}" y="${oy - rh - slopeH / 2}" text-anchor="middle" font-size="8" fill="${GOLD}">SECTION A–A</text>
  <!-- Projection dimension -->
  <line x1="${ox}" y1="${oy + 22}" x2="${ox + rd}" y2="${oy + 22}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd / 2}" y="${oy + 34}" text-anchor="middle" font-size="10" fill="${DARK}" font-weight="600">${p.projectionFt.toFixed(2)}ft PROJECTION</text>
  <!-- Height -->
  <line x1="${ox + rd + 22}" y1="${oy}" x2="${ox + rd + 22}" y2="${oy - rh}" stroke="${GREY}" stroke-width="0.8"/>
  <text x="${ox + rd + 38}" y="${oy - rh / 2}" text-anchor="middle" font-size="9" fill="${DARK}" font-weight="600" transform="rotate(90,${ox + rd + 38},${oy - rh / 2})">${p.heightFt.toFixed(2)}ft</text>
  <!-- Title -->
  <text x="10" y="16" font-size="9" font-weight="700" fill="${DARK}">SECTION A–A — CANOPY</text>
  <text x="10" y="28" font-size="7" fill="${GREY}">${DISCLAIMER}</text>
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="7" fill="${GREY}">Eagle Eye Management Services</text>
</svg>`;
}
