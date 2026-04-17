/**
 * Eagle Eye — Fencing Module Geometry
 * Calculates QTO, default unit rates, and generates SVG drawings
 * for steel SHS-framed welded wire mesh fencing with gate.
 */

import type { FencingParams } from "./scopeTypes";

// ─── Unit Conversion ──────────────────────────────────────────────────────────

const ftToM = (ft: number) => ft * 0.3048;

// ─── QTO Item ─────────────────────────────────────────────────────────────────

export interface FencingQTOItem {
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
  const defaults = getFencingDefaultRates();
  const rate = (desc: string) => rateOverrides[desc] ?? defaults[desc] ?? 0;

  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const postSpacingM = ftToM(p.postSpacingFt);
  const gateWidthM = ftToM(p.gateWidthFt);

  // Number of posts: posts at each end + intermediate posts
  // Fence run minus gate opening, divided by post spacing, plus 2 end posts
  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const intermediatePostCount = Math.max(0, Math.ceil(fenceRunWithoutGate / postSpacingM) - 1);
  const gatePostCount = p.hasGate ? 2 : 0;
  const totalPosts = intermediatePostCount + gatePostCount + 2; // +2 end posts

  // Rail linear metres: top + bottom + mid rail (3 rails) × fence run (excluding gate)
  const railRunM = fenceRunWithoutGate;
  const railLm = railRunM * 3; // top, mid, bottom

  // Mesh area: fence run (excluding gate) × height
  const meshArea = fenceRunWithoutGate * heightM;

  // Anchoring: one base plate per post
  const anchorCount = totalPosts;

  // Finish: total surface area of posts + rails + mesh
  const postSurfaceArea = totalPosts * (4 * (p.frameSectionMm / 1000) * heightM); // 4 faces × width × height
  const railSurfaceArea = railLm * 4 * (p.frameSectionMm / 1000);
  const finishArea = postSurfaceArea + railSurfaceArea + meshArea;

  const items: FencingQTOItem[] = [];

  const add = (
    description: string,
    qty: number,
    unit: string,
    basis: string,
    group: string
  ) => {
    const unitRate = rate(description);
    items.push({
      description,
      qty: Math.round(qty * 100) / 100,
      unit,
      unitRate,
      lineTotal: Math.round(qty * unitRate * 100) / 100,
      basis,
      group,
    });
  };

  // ── Structural Frame ──────────────────────────────────────────────────────
  add(
    "SHS Posts (supply & install)",
    totalPosts,
    "ea",
    `${totalPosts} posts (${intermediatePostCount} intermediate + ${gatePostCount} gate + 2 end) @ ${p.postSpacingFt}ft c/c`,
    "Structural Frame"
  );

  add(
    "Top/Bottom/Mid Rails (SHS)",
    Math.round(railLm * 10) / 10,
    "lm",
    `3 rails × ${Math.round(railRunM * 10) / 10}m run (excl. gate)`,
    "Structural Frame"
  );

  // ── Infill ────────────────────────────────────────────────────────────────
  const meshDesc =
    p.meshType === "welded_wire_50x50"
      ? "Welded Wire Mesh Infill"
      : p.meshType === "welded_wire_75x75"
      ? "Welded Wire Mesh Infill"
      : p.meshType === "chain_link"
      ? "Chain Link Mesh Infill"
      : "Solid Panel Infill";

  add(
    meshDesc,
    Math.round(meshArea * 100) / 100,
    "m²",
    `${Math.round(fenceRunWithoutGate * 100) / 100}m × ${Math.round(heightM * 100) / 100}m (excl. gate)`,
    "Infill"
  );

  // ── Anchoring ─────────────────────────────────────────────────────────────
  const anchorDesc =
    p.anchorMethod === "base_plate_epoxy"
      ? "Base Plate Fabrication & Epoxy Anchors"
      : p.anchorMethod === "core_drill_set"
      ? "Core Drill & Set Anchors"
      : "Surface Mount Brackets";

  add(
    anchorDesc,
    anchorCount,
    "ea",
    `1 per post × ${anchorCount} posts`,
    "Anchoring"
  );

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (p.hasGate) {
    add(
      "Gate Frame (supply & install)",
      1,
      "ea",
      `Single swing gate ~${p.gateWidthFt}ft W × ${p.gateHeightFt}ft H`,
      "Gate"
    );
    add(
      "Gate Hardware (hinges, latch, lock prep)",
      1,
      "ea",
      "HD hinges × 2, drop latch, padlock hasp",
      "Gate"
    );
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  const finishDesc =
    p.finish === "black_pc"
      ? "Powder Coat Finish — Black"
      : p.finish === "galvanised"
      ? "Galvanised Finish"
      : "Custom PC Colour";

  add(
    finishDesc,
    Math.round(finishArea * 100) / 100,
    "m²",
    "Posts + rails + mesh surface area",
    "Finish"
  );

  // ── Preliminaries ─────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  add(
    "Mobilisation & Site Setup",
    1,
    "ls",
    "Allow",
    "Preliminaries"
  );
  // Update mobilisation rate to 5% of subtotal
  const mobItem = items[items.length - 1];
  const mobRate = Math.round(subtotal * 0.05);
  mobItem.unitRate = mobRate;
  mobItem.lineTotal = mobRate;

  add(
    "Preliminary Budget Allowance",
    1,
    "ls",
    "10% contingency on subtotal",
    "Preliminaries"
  );
  const contItem = items[items.length - 1];
  const contRate = Math.round((subtotal + mobRate) * 0.10);
  contItem.unitRate = contRate;
  contItem.lineTotal = contRate;

  return items;
}

// ─── SVG Drawing Helpers ──────────────────────────────────────────────────────

const GOLD = "#C9A84C";
const DARK = "#1a1a1a";
const GREY = "#888";
const LIGHT_GREY = "#ddd";
const MESH_FILL = "#2a2a2a";

function svgHeader(w: number, h: number, title: string, sheetNo: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial,sans-serif">
  <rect width="${w}" height="${h}" fill="#f8f8f8"/>
  <!-- Title bar -->
  <rect x="0" y="0" width="${w}" height="36" fill="${DARK}"/>
  <text x="12" y="24" font-size="13" font-weight="bold" fill="white">${title}</text>
  <text x="${w - 12}" y="24" font-size="10" fill="${GOLD}" text-anchor="end">${sheetNo}</text>
  <!-- Grid background -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect x="0" y="36" width="${w}" height="${h - 36}" fill="url(#grid)"/>`;
}

function svgFooter(w: number, h: number, scale: string): string {
  return `  <!-- Footer -->
  <rect x="0" y="${h - 28}" width="${w}" height="28" fill="${DARK}"/>
  <text x="12" y="${h - 10}" font-size="9" fill="${GOLD}">EAGLE EYE MANAGEMENT SERVICES</text>
  <text x="${w / 2}" y="${h - 10}" font-size="9" fill="white" text-anchor="middle">CONCEPT ONLY — NOT FOR CONSTRUCTION — ALL DIMENSIONS REQUIRE FIELD VERIFICATION</text>
  <text x="${w - 12}" y="${h - 10}" font-size="9" fill="${GREY}" text-anchor="end">SCALE: ${scale}</text>
</svg>`;
}

function dimLine(
  x1: number, y1: number, x2: number, y2: number,
  label: string, offset = 20, horizontal = true
): string {
  if (horizontal) {
    const y = Math.min(y1, y2) - offset;
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${GOLD}" stroke-width="1"/>
    <line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}" stroke="${GOLD}" stroke-width="1"/>
    <line x1="${x2}" y1="${y - 5}" x2="${x2}" y2="${y + 5}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${(x1 + x2) / 2}" y="${y - 6}" font-size="9" fill="${GOLD}" text-anchor="middle">${label}</text>`;
  } else {
    const x = Math.max(x1, x2) + offset;
    return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${GOLD}" stroke-width="1"/>
    <line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}" stroke="${GOLD}" stroke-width="1"/>
    <line x1="${x - 5}" y1="${y2}" x2="${x + 5}" y2="${y2}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x + 8}" y="${(y1 + y2) / 2 + 4}" font-size="9" fill="${GOLD}">${label}</text>`;
  }
}

function meshPattern(
  x: number, y: number, w: number, h: number, cellSize = 12
): string {
  const id = `mesh_${Math.round(x)}_${Math.round(y)}`;
  return `<defs>
    <pattern id="${id}" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
      <rect width="${cellSize}" height="${cellSize}" fill="${MESH_FILL}"/>
      <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="#555" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" stroke="${DARK}" stroke-width="1.5"/>`;
}

// ─── Drawing 1: Plan View ─────────────────────────────────────────────────────

export function drawFencingPlan(p: FencingParams): string {
  const W = 800, H = 500;
  const runM = ftToM(p.runLengthFt);
  const depthM = 0.5; // fence depth (post footprint)
  const gateWidthM = p.hasGate ? ftToM(p.gateWidthFt) : 0;
  const postSpacingM = ftToM(p.postSpacingFt);

  const scale = 200; // px per metre
  const fenceW = runM * scale;
  const fenceD = depthM * scale;
  const ox = (W - fenceW) / 2;
  const oy = H / 2 - fenceD / 2;

  // Post positions
  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1;
  const postSize = (p.frameSectionMm / 1000) * scale;

  let posts = "";
  for (let i = 0; i < postCount; i++) {
    const px = ox + i * postSpacingM * scale - postSize / 2;
    posts += `<rect x="${px}" y="${oy - postSize / 2}" width="${postSize}" height="${fenceD + postSize}" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>`;
  }

  // Gate posts
  let gateEl = "";
  if (p.hasGate) {
    const gateX = ox + fenceRunWithoutGate * scale;
    const gateW = gateWidthM * scale;
    // Gate posts
    gateEl += `<rect x="${gateX - postSize / 2}" y="${oy - postSize / 2}" width="${postSize}" height="${fenceD + postSize}" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>`;
    gateEl += `<rect x="${gateX + gateW - postSize / 2}" y="${oy - postSize / 2}" width="${postSize}" height="${fenceD + postSize}" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>`;
    // Gate opening (dashed)
    gateEl += `<rect x="${gateX}" y="${oy}" width="${gateW}" height="${fenceD}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="6,3"/>`;
    // Gate swing arc
    gateEl += `<path d="M ${gateX} ${oy + fenceD / 2} A ${gateW} ${gateW} 0 0 1 ${gateX + gateW * 0.7} ${oy + fenceD / 2 - gateW * 0.7}" fill="none" stroke="${GOLD}" stroke-width="1" stroke-dasharray="4,4"/>`;
    gateEl += `<text x="${gateX + gateW / 2}" y="${oy - 8}" font-size="8" fill="${GOLD}" text-anchor="middle">GATE — SWING INWARD</text>`;
  }

  // Fence body (mesh panels)
  const meshW = fenceRunWithoutGate * scale;
  const meshEl = meshPattern(ox, oy, meshW, fenceD, 10);

  // Dimension: total run
  const dimRun = dimLine(ox, oy, ox + fenceW, oy, `~${p.runLengthFt}ft (${Math.round(runM * 10) / 10}m) VERIFY ON SITE`, 30);
  // Dimension: gate width
  const dimGate = p.hasGate
    ? dimLine(ox + fenceRunWithoutGate * scale, oy + fenceD + 10, ox + fenceW, oy + fenceD + 10, `~${p.gateWidthFt}ft GATE`, 20)
    : "";

  return `${svgHeader(W, H, "FENCING — PLAN VIEW (LOOKING DOWN)", "S02")}
  <text x="${W / 2}" y="60" font-size="11" fill="${GREY}" text-anchor="middle">PLAN VIEW — LOOKING DOWN</text>
  <!-- Drive aisle label -->
  <text x="${W / 2}" y="${oy + fenceD + 55}" font-size="10" fill="${GREY}" text-anchor="middle">DRIVE AISLE / ACCESS (EXISTING)</text>
  <!-- Rear wall label -->
  <text x="${W / 2}" y="${oy - 45}" font-size="10" fill="${GREY}" text-anchor="middle">REAR WALL / EXISTING STRUCTURE</text>
  <line x1="${ox}" y1="${oy - 30}" x2="${ox + fenceW}" y2="${oy - 30}" stroke="${GREY}" stroke-width="1.5" stroke-dasharray="8,4"/>
  ${meshEl}
  ${posts}
  ${gateEl}
  ${dimRun}
  ${dimGate}
  <!-- North arrow -->
  <text x="60" y="${H - 50}" font-size="9" fill="${GREY}" text-anchor="middle">↑ N (INDICATIVE)</text>
  ${svgFooter(W, H, "NTS — CONCEPT")}`;
}

// ─── Drawing 2: Front Elevation ───────────────────────────────────────────────

export function drawFencingFrontElevation(p: FencingParams): string {
  const W = 800, H = 550;
  const runM = ftToM(p.runLengthFt);
  const heightM = ftToM(p.heightFt);
  const gateWidthM = p.hasGate ? ftToM(p.gateWidthFt) : 0;
  const postSpacingM = ftToM(p.postSpacingFt);

  const scaleX = Math.min(600 / runM, 40);
  const scaleY = Math.min(280 / heightM, 40);
  const sc = Math.min(scaleX, scaleY);

  const fenceW = runM * sc;
  const fenceH = heightM * sc;
  const ox = (W - fenceW) / 2;
  const oy = H - 120 - fenceH;

  const fenceRunWithoutGate = p.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1;
  const postW = Math.max(6, (p.frameSectionMm / 1000) * sc);

  // Slab hatch
  const slabEl = `<rect x="${ox - 20}" y="${oy + fenceH}" width="${fenceW + 40}" height="18" fill="${LIGHT_GREY}" stroke="${DARK}" stroke-width="1"/>
  <text x="${ox + fenceW / 2}" y="${oy + fenceH + 13}" font-size="8" fill="${DARK}" text-anchor="middle">CONCRETE SLAB — EXISTING</text>`;

  // Mesh panels
  const meshW = fenceRunWithoutGate * sc;
  const meshEl = meshPattern(ox, oy, meshW, fenceH, 12);

  // Posts
  let posts = "";
  for (let i = 0; i < postCount; i++) {
    const px = ox + i * postSpacingM * sc - postW / 2;
    posts += `<rect x="${px}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    // Base plate
    posts += `<rect x="${px - 4}" y="${oy + fenceH - 4}" width="${postW + 8}" height="8" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
  }

  // Gate
  let gateEl = "";
  if (p.hasGate) {
    const gateX = ox + fenceRunWithoutGate * sc;
    const gateW = gateWidthM * sc;
    // Gate posts
    gateEl += `<rect x="${gateX - postW / 2}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    gateEl += `<rect x="${gateX + gateW - postW / 2}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    // Gate base plates
    gateEl += `<rect x="${gateX - postW / 2 - 4}" y="${oy + fenceH - 4}" width="${postW + 8}" height="8" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
    gateEl += `<rect x="${gateX + gateW - postW / 2 - 4}" y="${oy + fenceH - 4}" width="${postW + 8}" height="8" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;
    // Gate mesh
    gateEl += meshPattern(gateX, oy, gateW, fenceH, 12);
    // Hinges
    const hy1 = oy + fenceH * 0.25;
    const hy2 = oy + fenceH * 0.75;
    gateEl += `<rect x="${gateX - postW / 2 - 2}" y="${hy1 - 5}" width="${postW + 4}" height="10" fill="${GOLD}"/>`;
    gateEl += `<rect x="${gateX - postW / 2 - 2}" y="${hy2 - 5}" width="${postW + 4}" height="10" fill="${GOLD}"/>`;
    // Latch
    const latchX = gateX + gateW - postW / 2;
    const latchY = oy + fenceH / 2;
    gateEl += `<circle cx="${latchX}" cy="${latchY}" r="8" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`;
    gateEl += `<text x="${latchX + 14}" y="${latchY + 4}" font-size="8" fill="${GOLD}">← LATCH/LOCK</text>`;
    // Gate label
    gateEl += `<text x="${gateX + gateW / 2}" y="${oy - 10}" font-size="8" fill="${GOLD}" text-anchor="middle">~${p.gateWidthFt}ft GATE</text>`;
  }

  // Dimensions
  const dimWidth = dimLine(ox, oy, ox + fenceW, oy, `~${p.runLengthFt}ft (${Math.round(runM * 10) / 10}m) VERIFY ON SITE`, 35);
  const dimHeight = dimLine(ox - 30, oy, ox - 30, oy + fenceH, `~${p.heightFt}ft (${Math.round(heightM * 10) / 10}m) AFF`, 20, false);

  // Top of fence label
  const tofEl = `<line x1="${ox - 60}" y1="${oy}" x2="${ox}" y2="${oy}" stroke="${GREY}" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${ox - 65}" y="${oy + 4}" font-size="8" fill="${GREY}" text-anchor="end">TOP OF FENCE</text>`;

  return `${svgHeader(W, H, "FENCING — FRONT ELEVATION (VIEW FROM DRIVE AISLE)", "S03")}
  <text x="${W / 2}" y="60" font-size="11" fill="${GREY}" text-anchor="middle">FRONT ELEVATION — VIEW FROM DRIVE AISLE</text>
  ${meshEl}
  ${posts}
  ${gateEl}
  ${slabEl}
  ${dimWidth}
  ${dimHeight}
  ${tofEl}
  ${svgFooter(W, H, "NTS — CONCEPT")}`;
}

// ─── Drawing 3: Side Elevation ────────────────────────────────────────────────

export function drawFencingSideElevation(p: FencingParams): string {
  const W = 800, H = 500;
  const depthM = 0.5;
  const heightM = ftToM(p.heightFt);

  const sc = Math.min(300 / heightM, 80);
  const fenceD = depthM * sc;
  const fenceH = heightM * sc;
  const ox = W / 2 - fenceD / 2;
  const oy = H - 120 - fenceH;
  const postW = Math.max(6, (p.frameSectionMm / 1000) * sc);

  const slabEl = `<rect x="${ox - 40}" y="${oy + fenceH}" width="${fenceD + 80}" height="18" fill="${LIGHT_GREY}" stroke="${DARK}" stroke-width="1"/>
  <text x="${ox + fenceD / 2}" y="${oy + fenceH + 13}" font-size="8" fill="${DARK}" text-anchor="middle">SLAB</text>`;

  const postEl = `<rect x="${ox}" y="${oy}" width="${postW}" height="${fenceH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <rect x="${ox - 6}" y="${oy + fenceH - 4}" width="${postW + 12}" height="8" fill="${GOLD}" stroke="${DARK}" stroke-width="0.8"/>`;

  // Rail cross-sections (3 rails)
  const railW = fenceD;
  const railH = Math.max(4, (p.frameSectionMm / 1000) * sc * 0.6);
  const rails = [0.05, 0.5, 0.95].map(frac => {
    const ry = oy + fenceH * frac - railH / 2;
    return `<rect x="${ox}" y="${ry}" width="${railW}" height="${railH}" fill="${DARK}" stroke="${GOLD}" stroke-width="1"/>`;
  }).join("\n");

  // Mesh fill
  const meshEl = meshPattern(ox + postW, oy, fenceD - postW, fenceH, 10);

  // Overhead services
  const svcY = oy - 30;
  const svcEl = `<line x1="${ox - 60}" y1="${svcY}" x2="${ox + fenceD + 60}" y2="${svcY}" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="8,4"/>
  <text x="${ox + fenceD + 65}" y="${svcY + 4}" font-size="8" fill="#e74c3c">OVERHEAD SERVICES — REMAIN IN PLACE</text>`;

  const dimH = dimLine(ox + fenceD + 20, oy, ox + fenceD + 20, oy + fenceH, `~${p.heightFt}ft AFF`, 20, false);
  const dimD = dimLine(ox, oy - 20, ox + fenceD, oy - 20, `POST DEPTH`, 15);

  return `${svgHeader(W, H, "FENCING — SIDE ELEVATION (SECTION THROUGH POST)", "S04")}
  <text x="${W / 2}" y="60" font-size="11" fill="${GREY}" text-anchor="middle">SIDE ELEVATION — SECTION THROUGH POST</text>
  <text x="${ox + fenceD / 2}" y="${oy - 55}" font-size="9" fill="${GREY}" text-anchor="middle">← DRIVE AISLE SIDE</text>
  ${svcEl}
  ${meshEl}
  ${rails}
  ${postEl}
  ${slabEl}
  ${dimH}
  ${dimD}
  ${svgFooter(W, H, "NTS — CONCEPT")}`;
}

// ─── Drawing 4: Construction Detail ──────────────────────────────────────────

export function drawFencingDetail(p: FencingParams): string {
  const W = 800, H = 550;

  // DET-01: Post base plate to slab
  const d1x = 80, d1y = 80, d1w = 200, d1h = 220;
  const det1 = `
  <rect x="${d1x}" y="${d1y}" width="${d1w}" height="${d1h}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${d1x + 5}" y="${d1y - 6}" font-size="9" font-weight="bold" fill="${DARK}">DET-01  POST BASE PLATE TO SLAB</text>
  <!-- Post -->
  <rect x="${d1x + 85}" y="${d1y + 20}" width="30" height="120" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Base plate -->
  <rect x="${d1x + 65}" y="${d1y + 135}" width="70" height="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Slab hatch -->
  <rect x="${d1x + 10}" y="${d1y + 147}" width="${d1w - 20}" height="40" fill="${LIGHT_GREY}" stroke="${DARK}" stroke-width="1"/>
  <!-- Anchors -->
  <line x1="${d1x + 75}" y1="${d1y + 147}" x2="${d1x + 75}" y2="${d1y + 175}" stroke="${DARK}" stroke-width="2"/>
  <line x1="${d1x + 125}" y1="${d1y + 147}" x2="${d1x + 125}" y2="${d1y + 175}" stroke="${DARK}" stroke-width="2"/>
  <!-- Labels -->
  <text x="${d1x + 125}" y="${d1y + 60}" font-size="7" fill="${GREY}">${p.frameSectionMm}×${p.frameSectionMm}×3 SHS POST</text>
  <text x="${d1x + 125}" y="${d1y + 140}" font-size="7" fill="${GREY}">150×150×10 BASE PLATE</text>
  <text x="${d1x + 125}" y="${d1y + 165}" font-size="7" fill="${GREY}">4× M12 EPOXY ANCHORS</text>
  <text x="${d1x + 125}" y="${d1y + 178}" font-size="7" fill="${GREY}">MIN 100mm EMBEDMENT</text>
  <circle cx="${d1x + 60}" cy="${d1y + 200}" r="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <text x="${d1x + 60}" y="${d1y + 205}" font-size="10" font-weight="bold" fill="${DARK}" text-anchor="middle">01</text>`;

  // DET-02: Fence panel frame
  const d2x = 320, d2y = 80, d2w = 200, d2h = 220;
  const cellSz = 14;
  const det2 = `
  <rect x="${d2x}" y="${d2y}" width="${d2w}" height="${d2h}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${d2x + 5}" y="${d2y - 6}" font-size="9" font-weight="bold" fill="${DARK}">DET-02  FENCE PANEL FRAME</text>
  <!-- Frame -->
  <rect x="${d2x + 20}" y="${d2y + 20}" width="160" height="180" fill="none" stroke="${DARK}" stroke-width="3"/>
  <!-- Mid rail -->
  <line x1="${d2x + 20}" y1="${d2y + 110}" x2="${d2x + 180}" y2="${d2y + 110}" stroke="${DARK}" stroke-width="2.5"/>
  <!-- Mesh fill -->
  ${meshPattern(d2x + 20, d2y + 20, 160, 90, cellSz)}
  ${meshPattern(d2x + 20, d2y + 110, 160, 90, cellSz)}
  <!-- Labels -->
  <text x="${d2x + 185}" y="${d2y + 25}" font-size="7" fill="${GREY}">50×50 SHS TOP RAIL</text>
  <text x="${d2x + 185}" y="${d2y + 113}" font-size="7" fill="${GREY}">40×40 SHS MID RAIL</text>
  <text x="${d2x + 185}" y="${d2y + 195}" font-size="7" fill="${GREY}">50×50 SHS BOT RAIL</text>
  <text x="${d2x + 100}" y="${d2y + 240}" font-size="7" fill="${GREY}" text-anchor="middle">~${p.postSpacingFt}ft TYP PANEL WIDTH</text>
  <circle cx="${d2x + 40}" cy="${d2y + 200}" r="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <text x="${d2x + 40}" y="${d2y + 205}" font-size="10" font-weight="bold" fill="${DARK}" text-anchor="middle">02</text>`;

  // DET-03: Gate frame & hinges
  const d3x = 560, d3y = 80, d3w = 200, d3h = 220;
  const det3 = `
  <rect x="${d3x}" y="${d3y}" width="${d3w}" height="${d3h}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${d3x + 5}" y="${d3y - 6}" font-size="9" font-weight="bold" fill="${DARK}">DET-03  GATE FRAME &amp; HINGES</text>
  <!-- Gate post -->
  <rect x="${d3x + 20}" y="${d3y + 20}" width="20" height="180" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Gate leaf -->
  <rect x="${d3x + 40}" y="${d3y + 20}" width="120" height="180" fill="none" stroke="${DARK}" stroke-width="2.5"/>
  ${meshPattern(d3x + 40, d3y + 20, 120, 180, cellSz)}
  <!-- Hinges -->
  <rect x="${d3x + 15}" y="${d3y + 55}" width="35" height="14" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <rect x="${d3x + 15}" y="${d3y + 145}" width="35" height="14" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Latch -->
  <circle cx="${d3x + 160}" cy="${d3y + 110}" r="10" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <!-- Labels -->
  <text x="${d3x + 165}" y="${d3y + 62}" font-size="7" fill="${GREY}">HD HINGE</text>
  <text x="${d3x + 165}" y="${d3y + 152}" font-size="7" fill="${GREY}">HD HINGE</text>
  <text x="${d3x + 165}" y="${d3y + 113}" font-size="7" fill="${GREY}">DROP LATCH / PADLOCK PREP</text>
  <circle cx="${d3x + 40}" cy="${d3y + 200}" r="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <text x="${d3x + 40}" y="${d3y + 205}" font-size="10" font-weight="bold" fill="${DARK}" text-anchor="middle">03</text>`;

  // DET-04: Mesh attachment detail
  const d4x = 80, d4y = 340, d4w = 200, d4h = 150;
  const det4 = `
  <rect x="${d4x}" y="${d4y}" width="${d4w}" height="${d4h}" fill="white" stroke="${DARK}" stroke-width="1.5"/>
  <text x="${d4x + 5}" y="${d4y - 6}" font-size="9" font-weight="bold" fill="${DARK}">DET-04  MESH INFILL ATTACHMENT</text>
  <!-- Rail cross section -->
  <rect x="${d4x + 20}" y="${d4y + 40}" width="160" height="16" fill="${DARK}" stroke="${GOLD}" stroke-width="1.5"/>
  <!-- Mesh wires -->
  ${[30, 50, 70, 90, 110, 130, 150, 170].map(mx =>
    `<line x1="${d4x + mx}" y1="${d4y + 20}" x2="${d4x + mx}" y2="${d4y + 120}" stroke="#888" stroke-width="1.5"/>`
  ).join("")}
  <!-- Tie wire -->
  <line x1="${d4x + 20}" y1="${d4y + 48}" x2="${d4x + 180}" y2="${d4y + 48}" stroke="${GOLD}" stroke-width="2"/>
  <!-- Labels -->
  <text x="${d4x + 185}" y="${d4y + 44}" font-size="7" fill="${GREY}">50×50×3 SHS RAIL</text>
  <text x="${d4x + 185}" y="${d4y + 60}" font-size="7" fill="${GREY}">TIE WIRE @ 300 CRS</text>
  <text x="${d4x + 100}" y="${d4y + 140}" font-size="7" fill="${GREY}" text-anchor="middle">50×50mm MESH, 4mm WIRE — ${p.finish === "black_pc" ? "BLACK PC" : p.finish === "galvanised" ? "GALV" : "CUSTOM PC"}</text>
  <circle cx="${d4x + 40}" cy="${d4y + 130}" r="12" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>
  <text x="${d4x + 40}" y="${d4y + 135}" font-size="10" font-weight="bold" fill="${DARK}" text-anchor="middle">04</text>`;

  // Detail notes
  const notesEl = `
  <rect x="80" y="${H - 80}" width="640" height="50" fill="${DARK}" rx="3"/>
  <text x="92" y="${H - 62}" font-size="9" font-weight="bold" fill="${GOLD}">DETAIL NOTES</text>
  <text x="92" y="${H - 48}" font-size="8" fill="white">• All details are CONCEPT ONLY — not for construction without field verification.</text>
  <text x="400" y="${H - 48}" font-size="8" fill="white">• Post base: 4× M12 epoxy anchors, min 100mm embedment — confirm slab thickness.</text>`;

  return `${svgHeader(W, H, "FENCING — CONSTRUCTION DETAILS", "S05")}
  ${det1}
  ${det2}
  ${det3}
  ${det4}
  ${notesEl}
  ${svgFooter(W, H, "NTS — CONCEPT DETAILS")}`;
}
