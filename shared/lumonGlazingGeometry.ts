/**
 * Lumon Glass System — Parametric SVG Drawing Functions
 *
 * All functions return a self-contained SVG string (no external dependencies).
 * Units: all internal calculations in mm; dimensions annotated in mm and ft/in.
 * Coordinate system: origin at bottom-left of drawing area, Y increases upward.
 * SVG uses standard screen coords (Y increases downward), so all Y values are flipped.
 *
 * Drawing functions:
 *   drawLumonPlan()           — L1.1 Plan on post
 *   drawLumonFrontElevation() — L2.1 Front elevation (sides 5–8)
 *   drawLumonSideElevation()  — L2.2 Side elevation (left or right end)
 *   drawLumonTypicalSection() — L3.1 Typical section (full height)
 *   drawLumonConnectionDetail() — L3.2 Connection details
 */

import type { LumonParams, LumonBay } from "./scopeTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert mm to feet-inches string, e.g. 2750 → "9′-0″" */
function mmToFtIn(mm: number): string {
  const totalIn = mm / 25.4;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  if (inches === 12) return `${ft + 1}′-0″`;
  return `${ft}′-${inches}″`;
}

/** Format mm with both mm and ft/in */
function dimLabel(mm: number): string {
  return `${mm} (${mmToFtIn(mm)})`;
}

/** Scale mm to SVG pixels at a given scale (px per mm) */
function s(mm: number, scale: number): number {
  return mm * scale;
}

/** Eagle Eye drawing style constants */
const STYLE = {
  bg: "#FFFFFF",
  gridLine: "#CCCCCC",
  mainLine: "#111111",
  dimLine: "#555555",
  dimText: "#333333",
  glassSliding: "#B8D8F0",
  glassFixed: "#D0E8D0",
  glassStroke: "#2266AA",
  glassFixedStroke: "#226622",
  postExisting: "#8B6914",
  postLumon: "#444444",
  stackingZone: "#FFF3CD",
  stackingZoneStroke: "#C9A84C",
  doorOpening: "#FFE0E0",
  doorStroke: "#CC2222",
  railing: "#555555",
  railingFill: "#E8E8E8",
  anchor: "#333333",
  dimArrow: "#333333",
  titleBg: "#111111",
  titleText: "#C9A84C",
  noteText: "#555555",
  gold: "#C9A84C",
};

/** Build a complete SVG wrapper */
function svgWrap(width: number, height: number, content: string, title: string, sheetNo: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family:Arial,sans-serif;background:${STYLE.bg}">
  <!-- Title block -->
  <rect x="0" y="0" width="${width}" height="28" fill="${STYLE.titleBg}"/>
  <text x="10" y="19" font-size="11" font-weight="bold" fill="${STYLE.titleText}">${sheetNo} — ${title}</text>
  <text x="${width - 10}" y="19" font-size="9" fill="#888888" text-anchor="end">Eagle Eye Management Services — Concept Only, Not For Construction</text>
  <!-- Border -->
  <rect x="1" y="29" width="${width - 2}" height="${height - 30}" fill="none" stroke="${STYLE.mainLine}" stroke-width="1"/>
  ${content}
</svg>`;
}

/** Draw a dimension line with arrows and label */
function dimLine(
  x1: number, y1: number, x2: number, y2: number,
  label: string, offset: number, horizontal: boolean,
  fontSize = 9
): string {
  const arrowSize = 4;
  if (horizontal) {
    const dy = y1 + offset;
    const mid = (x1 + x2) / 2;
    return `
    <line x1="${x1}" y1="${dy}" x2="${x2}" y2="${dy}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${x1}" y1="${dy - arrowSize}" x2="${x1}" y2="${dy + arrowSize}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${x2}" y1="${dy - arrowSize}" x2="${x2}" y2="${dy + arrowSize}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${dy}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="2,2"/>
    <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${dy}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="2,2"/>
    <text x="${mid}" y="${dy - 3}" font-size="${fontSize}" fill="${STYLE.dimText}" text-anchor="middle">${label}</text>`;
  } else {
    const dx = x1 + offset;
    const mid = (y1 + y2) / 2;
    return `
    <line x1="${dx}" y1="${y1}" x2="${dx}" y2="${y2}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${dx - arrowSize}" y1="${y1}" x2="${dx + arrowSize}" y2="${y1}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${dx - arrowSize}" y1="${y2}" x2="${dx + arrowSize}" y2="${y2}" stroke="${STYLE.dimLine}" stroke-width="0.7"/>
    <line x1="${x1}" y1="${y1}" x2="${dx}" y2="${y1}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="2,2"/>
    <line x1="${x2}" y1="${y2}" x2="${dx}" y2="${y2}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="2,2"/>
    <text x="${dx + 3}" y="${mid + 4}" font-size="${fontSize}" fill="${STYLE.dimText}" transform="rotate(-90,${dx + 3},${mid + 4})" text-anchor="middle">${label}</text>`;
  }
}

/** Draw a keynote bubble */
function keynote(x: number, y: number, num: string): string {
  return `<circle cx="${x}" cy="${y}" r="8" fill="${STYLE.titleBg}" stroke="${STYLE.gold}" stroke-width="1"/>
  <text x="${x}" y="${y + 4}" font-size="8" font-weight="bold" fill="${STYLE.gold}" text-anchor="middle">${num}</text>`;
}

/** Draw a north arrow */
function northArrow(cx: number, cy: number, size = 20): string {
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${size}" fill="none" stroke="${STYLE.mainLine}" stroke-width="1"/>
    <polygon points="${cx},${cy - size + 3} ${cx - 5},${cy + 5} ${cx},${cy - 2} ${cx + 5},${cy + 5}" fill="${STYLE.mainLine}"/>
    <text x="${cx}" y="${cy + size + 10}" font-size="9" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">N</text>
  </g>`;
}

// ─── L1.1 Plan on Post ───────────────────────────────────────────────────────

export function drawLumonPlan(p: LumonParams): string {
  const SVG_W = 900;
  const SVG_H = 520;
  const MARGIN_L = 60;
  const MARGIN_R = 60;
  const MARGIN_T = 60;
  const MARGIN_B = 100;
  const DRAW_W = SVG_W - MARGIN_L - MARGIN_R;
  const DRAW_H = SVG_H - MARGIN_T - MARGIN_B;

  // Scale: fit the overall span into DRAW_W
  const totalSpan = p.overallSpanMm + (p.hasLeftReturn ? p.leftReturnWidthMm : 0) + (p.hasRightReturn ? p.rightReturnWidthMm : 0);
  const scale = DRAW_W / totalSpan;

  // Depth in plan (building depth) — use a representative depth
  const depthMm = 4775; // 15′-8″ nominal
  const depthPx = Math.min(DRAW_H * 0.6, s(depthMm, scale));

  const ox = MARGIN_L; // origin x
  const oy = MARGIN_T + DRAW_H * 0.1; // origin y (top of plan = building wall)

  let content = "";

  // ── Building wall (back) ──
  content += `<rect x="${ox}" y="${oy}" width="${DRAW_W}" height="6" fill="#888" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
  content += `<text x="${ox + DRAW_W / 2}" y="${oy - 5}" font-size="8" fill="${STYLE.noteText}" text-anchor="middle">BUILDING WALL</text>`;

  // ── Slab outline ──
  content += `<rect x="${ox}" y="${oy}" width="${DRAW_W}" height="${depthPx}" fill="none" stroke="${STYLE.mainLine}" stroke-width="1.5" stroke-dasharray="4,2"/>`;

  // ── Left return ──
  let curX = ox;
  if (p.hasLeftReturn) {
    const retW = s(p.leftReturnWidthMm, scale);
    content += `<rect x="${curX}" y="${oy}" width="${retW}" height="${depthPx}" fill="${STYLE.glassSliding}" fill-opacity="0.3" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<text x="${curX + retW / 2}" y="${oy + depthPx / 2}" font-size="7" fill="${STYLE.glassStroke}" text-anchor="middle" transform="rotate(-90,${curX + retW / 2},${oy + depthPx / 2})">LEFT RETURN</text>`;
    curX += retW;
  }

  // ── Bays ──
  const bayStartX = curX;
  let postX = curX;
  const postPositions: number[] = [postX];

  for (let i = 0; i < p.bays.length; i++) {
    const bay = p.bays[i];
    const bw = s(bay.widthMm, scale);
    const bayX = curX;

    // Stacking zone shading
    if (i === 0 && p.leftStackingZoneMm > 0) {
      const szW = s(p.leftStackingZoneMm, scale);
      content += `<rect x="${bayX}" y="${oy}" width="${szW}" height="${depthPx}" fill="${STYLE.stackingZone}" fill-opacity="0.5" stroke="${STYLE.stackingZoneStroke}" stroke-width="0.8" stroke-dasharray="3,2"/>`;
      content += `<text x="${bayX + szW / 2}" y="${oy + depthPx + 12}" font-size="7" fill="${STYLE.stackingZoneStroke}" text-anchor="middle">STACK ZONE</text>`;
    }
    if (i === p.bays.length - 1 && p.rightStackingZoneMm > 0) {
      const szW = s(p.rightStackingZoneMm, scale);
      content += `<rect x="${bayX + bw - szW}" y="${oy}" width="${szW}" height="${depthPx}" fill="${STYLE.stackingZone}" fill-opacity="0.5" stroke="${STYLE.stackingZoneStroke}" stroke-width="0.8" stroke-dasharray="3,2"/>`;
      content += `<text x="${bayX + bw - szW / 2}" y="${oy + depthPx + 12}" font-size="7" fill="${STYLE.stackingZoneStroke}" text-anchor="middle">STACK ZONE</text>`;
    }

    // Glass panel fill
    const glassFill = bay.isFixed ? STYLE.glassFixed : STYLE.glassSliding;
    const glassStroke = bay.isFixed ? STYLE.glassFixedStroke : STYLE.glassStroke;
    content += `<rect x="${bayX + 2}" y="${oy + depthPx - 8}" width="${bw - 4}" height="6" fill="${glassFill}" stroke="${glassStroke}" stroke-width="0.8"/>`;

    // Fixed panel X mark
    if (bay.isFixed) {
      content += `<line x1="${bayX + 4}" y1="${oy + depthPx - 8}" x2="${bayX + bw - 4}" y2="${oy + depthPx - 2}" stroke="${glassStroke}" stroke-width="0.6"/>`;
      content += `<line x1="${bayX + bw - 4}" y1="${oy + depthPx - 8}" x2="${bayX + 4}" y2="${oy + depthPx - 2}" stroke="${glassStroke}" stroke-width="0.6"/>`;
    }

    // Stacking direction arrow
    if (!bay.isFixed) {
      const arrowY = oy + depthPx - 5;
      const arrowMid = bayX + bw / 2;
      if (bay.stackingDirection === "left") {
        content += `<polygon points="${arrowMid - 12},${arrowY} ${arrowMid},${arrowY - 4} ${arrowMid},${arrowY + 4}" fill="${STYLE.glassStroke}"/>`;
      } else if (bay.stackingDirection === "right") {
        content += `<polygon points="${arrowMid + 12},${arrowY} ${arrowMid},${arrowY - 4} ${arrowMid},${arrowY + 4}" fill="${STYLE.glassStroke}"/>`;
      } else {
        content += `<polygon points="${arrowMid - 12},${arrowY} ${arrowMid - 4},${arrowY - 3} ${arrowMid - 4},${arrowY + 3}" fill="${STYLE.glassStroke}"/>`;
        content += `<polygon points="${arrowMid + 12},${arrowY} ${arrowMid + 4},${arrowY - 3} ${arrowMid + 4},${arrowY + 3}" fill="${STYLE.glassStroke}"/>`;
      }
    }

    // Door opening
    if (bay.hasDoor && bay.doorWidthMm > 0) {
      const dw = s(bay.doorWidthMm, scale);
      const dx = bayX + (bw - dw) / 2;
      content += `<rect x="${dx}" y="${oy + depthPx - 10}" width="${dw}" height="12" fill="${STYLE.doorOpening}" stroke="${STYLE.doorStroke}" stroke-width="1"/>`;
      content += `<text x="${dx + dw / 2}" y="${oy + depthPx + 22}" font-size="7" fill="${STYLE.doorStroke}" text-anchor="middle">DOOR</text>`;
    }

    // Bay width dimension
    content += dimLine(bayX, oy + depthPx, bayX + bw, oy + depthPx, `${bay.widthMm}`, 30, true, 8);

    // Bay label
    content += `<text x="${bayX + bw / 2}" y="${oy + depthPx / 2}" font-size="8" fill="${STYLE.noteText}" text-anchor="middle">BAY ${i + 1}</text>`;

    curX += bw;
    postPositions.push(curX);
  }

  // ── Right return ──
  if (p.hasRightReturn) {
    const retW = s(p.rightReturnWidthMm, scale);
    content += `<rect x="${curX}" y="${oy}" width="${retW}" height="${depthPx}" fill="${STYLE.glassSliding}" fill-opacity="0.3" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<text x="${curX + retW / 2}" y="${oy + depthPx / 2}" font-size="7" fill="${STYLE.glassStroke}" text-anchor="middle" transform="rotate(-90,${curX + retW / 2},${oy + depthPx / 2})">RIGHT RETURN</text>`;
  }

  // ── Posts ──
  for (let i = 0; i < postPositions.length; i++) {
    const px = postPositions[i];
    const postW = s(p.frontPostSectionMm, scale);
    const postH = s(p.frontPostSectionMm, scale);
    content += `<rect x="${px - postW / 2}" y="${oy + depthPx - postH / 2}" width="${postW}" height="${postH}" fill="${STYLE.postExisting}" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    content += `<text x="${px}" y="${oy + depthPx + 42}" font-size="7" fill="${STYLE.postExisting}" text-anchor="middle" font-weight="bold">P${i + 1}</text>`;
  }

  // ── Overall span dimension ──
  const spanPx = s(p.overallSpanMm, scale);
  content += dimLine(bayStartX, oy - 10, bayStartX + spanPx, oy - 10, dimLabel(p.overallSpanMm), -20, true, 9);

  // ── Depth dimension ──
  content += dimLine(ox + DRAW_W + 10, oy, ox + DRAW_W + 10, oy + depthPx, dimLabel(depthMm), 20, false, 8);

  // ── North arrow ──
  content += northArrow(SVG_W - 45, SVG_H - 45, 18);

  // ── Keynote legend ──
  const legendX = ox;
  const legendY = SVG_H - 70;
  content += `<text x="${legendX}" y="${legendY}" font-size="8" font-weight="bold" fill="${STYLE.mainLine}">MEMBER LEGEND:</text>`;
  content += `<rect x="${legendX}" y="${legendY + 5}" width="14" height="8" fill="${STYLE.postExisting}" stroke="${STYLE.mainLine}" stroke-width="0.5"/>`;
  content += `<text x="${legendX + 18}" y="${legendY + 13}" font-size="8" fill="${STYLE.noteText}">Existing 6″×6″ front post</text>`;
  content += `<rect x="${legendX + 140}" y="${legendY + 5}" width="14" height="8" fill="${STYLE.glassSliding}" stroke="${STYLE.glassStroke}" stroke-width="0.5"/>`;
  content += `<text x="${legendX + 158}" y="${legendY + 13}" font-size="8" fill="${STYLE.noteText}">Sliding glazing</text>`;
  content += `<rect x="${legendX + 260}" y="${legendY + 5}" width="14" height="8" fill="${STYLE.glassFixed}" stroke="${STYLE.glassFixedStroke}" stroke-width="0.5"/>`;
  content += `<text x="${legendX + 278}" y="${legendY + 13}" font-size="8" fill="${STYLE.noteText}">Fixed glazing</text>`;
  content += `<rect x="${legendX + 370}" y="${legendY + 5}" width="14" height="8" fill="${STYLE.stackingZone}" stroke="${STYLE.stackingZoneStroke}" stroke-width="0.5"/>`;
  content += `<text x="${legendX + 388}" y="${legendY + 13}" font-size="8" fill="${STYLE.noteText}">Stacking zone</text>`;

  // ── Scale note ──
  content += `<text x="${SVG_W - MARGIN_R}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:75 (approx) | All dims in mm unless noted</text>`;

  return svgWrap(SVG_W, SVG_H, content, "Plan on Post — Lumon System Layout", "L1.1");
}

// ─── L2.1 Front Elevation ────────────────────────────────────────────────────

export function drawLumonFrontElevation(p: LumonParams): string {
  const SVG_W = 900;
  const SVG_H = 500;
  const MARGIN_L = 80;
  const MARGIN_R = 60;
  const MARGIN_T = 50;
  const MARGIN_B = 100;
  const DRAW_W = SVG_W - MARGIN_L - MARGIN_R;
  const DRAW_H = SVG_H - MARGIN_T - MARGIN_B;

  const totalSpan = p.overallSpanMm;
  const scale = DRAW_W / (totalSpan + (p.hasLeftReturn ? p.leftReturnWidthMm : 0) + (p.hasRightReturn ? p.rightReturnWidthMm : 0));
  const heightScale = DRAW_H / (p.finishedHeightMm + 400); // extra for pergola above

  const ox = MARGIN_L;
  const oy = MARGIN_T;
  const baseY = oy + DRAW_H; // slab level

  let content = "";

  // ── Slab / ground line ──
  content += `<line x1="${ox - 20}" y1="${baseY}" x2="${ox + DRAW_W + 20}" y2="${baseY}" stroke="${STYLE.mainLine}" stroke-width="2"/>`;
  content += `<text x="${ox - 15}" y="${baseY + 12}" font-size="8" fill="${STYLE.noteText}">F.F.L.</text>`;

  // ── Pergola above (schematic) ──
  const pergolaH = s(300, heightScale);
  const pergolaY = oy;
  content += `<rect x="${ox}" y="${pergolaY}" width="${DRAW_W}" height="${pergolaH}" fill="#F5F5F5" stroke="${STYLE.mainLine}" stroke-width="1" stroke-dasharray="4,2"/>`;
  content += `<text x="${ox + DRAW_W / 2}" y="${pergolaY + pergolaH / 2 + 4}" font-size="8" fill="${STYLE.noteText}" text-anchor="middle">LOUVERED PERGOLA (BY OTHERS)</text>`;

  // ── Railing zone ──
  const railingTopY = pergolaY + pergolaH;
  const fhPx = s(p.finishedHeightMm, heightScale);
  const railingBotY = railingTopY + fhPx;

  // ── Left return ──
  let curX = ox;
  if (p.hasLeftReturn) {
    const retW = s(p.leftReturnWidthMm, scale);
    content += `<rect x="${curX}" y="${railingTopY}" width="${retW}" height="${fhPx}" fill="${STYLE.glassSliding}" fill-opacity="0.25" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    curX += retW;
  }

  // ── Bays ──
  const bayStartX = curX;
  const postXs: number[] = [curX];

  for (let i = 0; i < p.bays.length; i++) {
    const bay = p.bays[i];
    const bw = s(bay.widthMm, scale);
    const bayX = curX;

    // Glass zones
    if (p.glassZoneConfig === "upper_lower") {
      const lowerH = s(p.lowerZoneHeightMm, heightScale);
      const upperH = s(p.upperZoneHeightMm, heightScale);
      const midRailY = railingBotY - lowerH;
      const upperY = midRailY - upperH;

      // Lower zone
      const lFill = bay.isFixed ? STYLE.glassFixed : STYLE.glassSliding;
      const lStroke = bay.isFixed ? STYLE.glassFixedStroke : STYLE.glassStroke;
      content += `<rect x="${bayX + 2}" y="${midRailY}" width="${bw - 4}" height="${lowerH}" fill="${lFill}" fill-opacity="0.5" stroke="${lStroke}" stroke-width="0.8"/>`;
      if (bay.isFixed) {
        content += `<line x1="${bayX + 4}" y1="${midRailY}" x2="${bayX + bw - 4}" y2="${midRailY + lowerH}" stroke="${lStroke}" stroke-width="0.6"/>`;
        content += `<line x1="${bayX + bw - 4}" y1="${midRailY}" x2="${bayX + 4}" y2="${midRailY + lowerH}" stroke="${lStroke}" stroke-width="0.6"/>`;
      } else {
        // Sliding arrow
        const arrowY = midRailY + lowerH / 2;
        if (bay.stackingDirection === "left") {
          content += `<polygon points="${bayX + 14},${arrowY} ${bayX + 4},${arrowY - 5} ${bayX + 4},${arrowY + 5}" fill="${lStroke}"/>`;
          content += `<line x1="${bayX + 4}" y1="${arrowY}" x2="${bayX + bw - 4}" y2="${arrowY}" stroke="${lStroke}" stroke-width="0.7" stroke-dasharray="3,2"/>`;
        } else {
          content += `<polygon points="${bayX + bw - 14},${arrowY} ${bayX + bw - 4},${arrowY - 5} ${bayX + bw - 4},${arrowY + 5}" fill="${lStroke}"/>`;
          content += `<line x1="${bayX + 4}" y1="${arrowY}" x2="${bayX + bw - 4}" y2="${arrowY}" stroke="${lStroke}" stroke-width="0.7" stroke-dasharray="3,2"/>`;
        }
      }

      // Upper zone
      content += `<rect x="${bayX + 2}" y="${upperY}" width="${bw - 4}" height="${upperH}" fill="${STYLE.glassSliding}" fill-opacity="0.35" stroke="${STYLE.glassStroke}" stroke-width="0.8"/>`;

      // Mid-rail
      content += `<rect x="${bayX}" y="${midRailY - 4}" width="${bw}" height="8" fill="${STYLE.railing}" stroke="${STYLE.mainLine}" stroke-width="0.8"/>`;

      // Zone labels
      content += `<text x="${bayX + bw / 2}" y="${midRailY + lowerH / 2 + 4}" font-size="7" fill="${STYLE.noteText}" text-anchor="middle">${p.lowerZoneHeightMm}</text>`;
      content += `<text x="${bayX + bw / 2}" y="${upperY + upperH / 2 + 4}" font-size="7" fill="${STYLE.noteText}" text-anchor="middle">${p.upperZoneHeightMm}</text>`;
    } else {
      // Single zone
      content += `<rect x="${bayX + 2}" y="${railingTopY}" width="${bw - 4}" height="${fhPx}" fill="${STYLE.glassSliding}" fill-opacity="0.4" stroke="${STYLE.glassStroke}" stroke-width="0.8"/>`;
    }

    // Door opening
    if (bay.hasDoor && bay.doorWidthMm > 0) {
      const dw = s(bay.doorWidthMm, scale);
      const dx = bayX + (bw - dw) / 2;
      content += `<rect x="${dx}" y="${railingBotY - s(2100, heightScale)}" width="${dw}" height="${s(2100, heightScale)}" fill="${STYLE.doorOpening}" fill-opacity="0.6" stroke="${STYLE.doorStroke}" stroke-width="1"/>`;
      content += `<text x="${dx + dw / 2}" y="${railingBotY - s(1050, heightScale)}" font-size="7" fill="${STYLE.doorStroke}" text-anchor="middle">DOOR\nBY OTHERS</text>`;
    }

    curX += bw;
    postXs.push(curX);
  }

  // ── Right return ──
  if (p.hasRightReturn) {
    const retW = s(p.rightReturnWidthMm, scale);
    content += `<rect x="${curX}" y="${railingTopY}" width="${retW}" height="${fhPx}" fill="${STYLE.glassSliding}" fill-opacity="0.25" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
  }

  // ── Posts ──
  for (let i = 0; i < postXs.length; i++) {
    const px = postXs[i];
    const pw = s(p.frontPostSectionMm, scale);
    content += `<rect x="${px - pw / 2}" y="${railingTopY}" width="${pw}" height="${fhPx + pergolaH}" fill="${STYLE.postExisting}" fill-opacity="0.7" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    // Post tag bubble
    content += keynote(px, railingTopY - 12, `P${i + 1}`);
  }

  // ── Railing profile (top rail) ──
  const railH = s(p.railingProfileMm, heightScale);
  content += `<rect x="${bayStartX}" y="${railingTopY}" width="${s(p.overallSpanMm, scale)}" height="${railH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.2"/>`;
  content += `<text x="${bayStartX + s(p.overallSpanMm, scale) / 2}" y="${railingTopY + railH / 2 + 4}" font-size="8" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">LGR ${p.railingProfileMm}mm RAILING PROFILE</text>`;

  // ── Dimensions ──
  // Overall span
  content += dimLine(bayStartX, baseY + 10, bayStartX + s(p.overallSpanMm, scale), baseY + 10, dimLabel(p.overallSpanMm), 20, true, 9);
  // FH
  content += dimLine(ox - 20, railingTopY + railH, ox - 20, railingBotY, dimLabel(p.finishedHeightMm), -30, false, 8);
  // Lower zone height
  if (p.glassZoneConfig === "upper_lower") {
    const lowerH = s(p.lowerZoneHeightMm, heightScale);
    const midRailY = railingBotY - lowerH;
    content += dimLine(ox - 50, midRailY, ox - 50, railingBotY, `${p.lowerZoneHeightMm}`, -15, false, 8);
    content += dimLine(ox - 50, railingTopY + railH, ox - 50, midRailY - 4, `${p.upperZoneHeightMm}`, -15, false, 8);
  }

  // ── FH datum label ──
  content += `<line x1="${ox - 5}" y1="${railingBotY}" x2="${ox + DRAW_W + 5}" y2="${railingBotY}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="6,3"/>`;
  content += `<text x="${ox - 8}" y="${railingBotY + 4}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">FH=${p.finishedHeightMm}</text>`;

  // ── Scale note ──
  content += `<text x="${SVG_W - MARGIN_R}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:40 (approx) | All dims in mm unless noted</text>`;

  return svgWrap(SVG_W, SVG_H, content, "Front Elevation — Lumon System (Sides 5–8)", "L2.1");
}

// ─── L2.2 Side Elevation ─────────────────────────────────────────────────────

export function drawLumonSideElevation(p: LumonParams, side: "left" | "right" = "left"): string {
  const SVG_W = 600;
  const SVG_H = 480;
  const MARGIN_L = 80;
  const MARGIN_R = 60;
  const MARGIN_T = 50;
  const MARGIN_B = 100;
  const DRAW_W = SVG_W - MARGIN_L - MARGIN_R;
  const DRAW_H = SVG_H - MARGIN_T - MARGIN_B;

  const depthMm = 4775; // 15′-8″ nominal
  const totalH = p.finishedHeightMm + 400;
  const scaleH = DRAW_H / totalH;
  const scaleW = DRAW_W / (depthMm + 400);

  const ox = MARGIN_L;
  const baseY = MARGIN_T + DRAW_H;

  const fhPx = s(p.finishedHeightMm, scaleH);
  const depthPx = s(depthMm, scaleW);
  const pergolaH = s(300, scaleH);

  let content = "";

  // ── Ground line ──
  content += `<line x1="${ox - 20}" y1="${baseY}" x2="${ox + DRAW_W + 20}" y2="${baseY}" stroke="${STYLE.mainLine}" stroke-width="2"/>`;
  content += `<text x="${ox - 15}" y="${baseY + 12}" font-size="8" fill="${STYLE.noteText}">F.F.L.</text>`;

  // ── Building wall (right side of side elevation) ──
  const wallX = ox + depthPx;
  content += `<rect x="${wallX}" y="${baseY - fhPx - pergolaH}" width="8" height="${fhPx + pergolaH}" fill="#888" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
  content += `<text x="${wallX + 12}" y="${baseY - fhPx / 2}" font-size="8" fill="${STYLE.noteText}" transform="rotate(-90,${wallX + 12},${baseY - fhPx / 2})">BUILDING WALL</text>`;

  // ── Pergola (above) ──
  content += `<rect x="${ox}" y="${baseY - fhPx - pergolaH}" width="${depthPx}" height="${pergolaH}" fill="#F5F5F5" stroke="${STYLE.mainLine}" stroke-width="1" stroke-dasharray="4,2"/>`;
  content += `<text x="${ox + depthPx / 2}" y="${baseY - fhPx - pergolaH / 2 + 4}" font-size="8" fill="${STYLE.noteText}" text-anchor="middle">PERGOLA (BY OTHERS)</text>`;

  // ── Railing / glass system ──
  const railingTopY = baseY - fhPx;
  const railH = s(p.railingProfileMm, scaleH);

  // Railing profile
  content += `<rect x="${ox}" y="${railingTopY}" width="${depthPx}" height="${railH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.2"/>`;

  // Glass zone (side view — single panel shown)
  if (p.glassZoneConfig === "upper_lower") {
    const lowerH = s(p.lowerZoneHeightMm, scaleH);
    const upperH = s(p.upperZoneHeightMm, scaleH);
    const midRailY = baseY - lowerH;
    const upperY = midRailY - upperH;
    content += `<rect x="${ox}" y="${midRailY}" width="10" height="${lowerH}" fill="${STYLE.glassSliding}" fill-opacity="0.5" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<rect x="${ox}" y="${upperY}" width="10" height="${upperH}" fill="${STYLE.glassSliding}" fill-opacity="0.35" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<rect x="${ox}" y="${midRailY - 4}" width="10" height="8" fill="${STYLE.railing}" stroke="${STYLE.mainLine}" stroke-width="0.8"/>`;
  }

  // ── Side door opening ──
  const doorH = s(2100, scaleH);
  const doorW = s(900, scaleW);
  content += `<rect x="${ox}" y="${baseY - doorH}" width="${doorW}" height="${doorH}" fill="${STYLE.doorOpening}" fill-opacity="0.6" stroke="${STYLE.doorStroke}" stroke-width="1.2"/>`;
  content += `<text x="${ox + doorW / 2}" y="${baseY - doorH / 2 + 4}" font-size="8" fill="${STYLE.doorStroke}" text-anchor="middle">DOOR\nBY OTHERS</text>`;

  // ── Post (front) ──
  const postH = s(p.frontPostSectionMm, scaleH);
  const postW = s(p.frontPostSectionMm, scaleW);
  content += `<rect x="${ox - postW / 2}" y="${railingTopY}" width="${postW}" height="${fhPx + pergolaH}" fill="${STYLE.postExisting}" fill-opacity="0.7" stroke="${STYLE.mainLine}" stroke-width="1"/>`;

  // ── Dimensions ──
  // Depth
  content += dimLine(ox, baseY + 10, ox + depthPx, baseY + 10, dimLabel(depthMm), 20, true, 9);
  // FH
  content += dimLine(ox - 30, railingTopY, ox - 30, baseY, dimLabel(p.finishedHeightMm), -20, false, 8);
  // Door height
  content += dimLine(ox - 55, baseY - doorH, ox - 55, baseY, "2100 (6′-11″)", -15, false, 8);

  // ── FH datum ──
  content += `<line x1="${ox - 5}" y1="${baseY}" x2="${ox + DRAW_W + 5}" y2="${baseY}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="6,3"/>`;

  // ── Title ──
  const sideLabel = side === "left" ? "Left Side Elevation" : "Right Side Elevation";
  content += `<text x="${SVG_W - MARGIN_R}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:40 (approx) | ${sideLabel} | All dims in mm unless noted</text>`;

  return svgWrap(SVG_W, SVG_H, content, `${sideLabel} — Lumon System`, "L2.2");
}

// ─── L3.1 Typical Section ────────────────────────────────────────────────────

export function drawLumonTypicalSection(p: LumonParams): string {
  const SVG_W = 500;
  const SVG_H = 600;
  const MARGIN_L = 100;
  const MARGIN_R = 80;
  const MARGIN_T = 50;
  const MARGIN_B = 80;
  const DRAW_W = SVG_W - MARGIN_L - MARGIN_R;
  const DRAW_H = SVG_H - MARGIN_T - MARGIN_B;

  const totalH = p.finishedHeightMm + 600; // include anchor below slab
  const scaleH = DRAW_H / totalH;
  const postW = 60; // fixed px width for section view

  const ox = MARGIN_L + DRAW_W / 2 - postW / 2;
  const baseY = MARGIN_T + DRAW_H - s(200, scaleH); // slab level

  let content = "";

  // ── Slab ──
  content += `<rect x="${MARGIN_L}" y="${baseY}" width="${DRAW_W}" height="${s(150, scaleH)}" fill="#DDDDDD" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
  content += `<text x="${MARGIN_L + DRAW_W / 2}" y="${baseY + s(80, scaleH)}" font-size="8" fill="${STYLE.noteText}" text-anchor="middle">CONCRETE SLAB</text>`;

  // ── Anchor ──
  const anchorTopY = baseY + s(10, scaleH);
  const anchorH = s(p.anchorEmbedmentMm + 20, scaleH);
  content += `<rect x="${ox + postW / 2 - 3}" y="${anchorTopY}" width="6" height="${anchorH}" fill="${STYLE.anchor}" stroke="${STYLE.mainLine}" stroke-width="0.8"/>`;
  content += `<text x="${ox + postW + 10}" y="${anchorTopY + anchorH / 2 + 4}" font-size="7" fill="${STYLE.noteText}">${p.anchorType}</text>`;
  content += `<text x="${ox + postW + 10}" y="${anchorTopY + anchorH / 2 + 14}" font-size="7" fill="${STYLE.noteText}">Min. ${p.anchorEmbedmentMm}mm embedment</text>`;
  content += dimLine(ox - 20, anchorTopY, ox - 20, anchorTopY + anchorH, `${p.anchorEmbedmentMm}`, -15, false, 7);

  // ── Post ──
  const postTopY = baseY - s(p.finishedHeightMm + 300, scaleH);
  const postH = s(p.finishedHeightMm + 300, scaleH);
  content += `<rect x="${ox}" y="${postTopY}" width="${postW}" height="${postH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.5"/>`;
  // Post hatch
  for (let i = 0; i < 6; i++) {
    const hy = postTopY + (postH / 6) * i;
    content += `<line x1="${ox}" y1="${hy}" x2="${ox + postW}" y2="${hy + postH / 6}" stroke="#AAAAAA" stroke-width="0.5"/>`;
  }
  content += `<text x="${ox + postW / 2}" y="${postTopY + postH / 2 + 4}" font-size="8" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">${p.lumonPostSectionMm}×${p.lumonPostSectionMm}</text>`;
  content += `<text x="${ox + postW / 2}" y="${postTopY + postH / 2 + 14}" font-size="7" fill="${STYLE.noteText}" text-anchor="middle">LUMON POST</text>`;

  // ── Railing profile ──
  const railTopY = postTopY;
  const railH = s(p.railingProfileMm, scaleH);
  content += `<rect x="${ox - 20}" y="${railTopY}" width="${postW + 40}" height="${railH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.5"/>`;
  content += `<text x="${ox + postW / 2}" y="${railTopY + railH / 2 + 4}" font-size="8" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">LGR ${p.railingProfileMm}mm</text>`;

  // ── Glass zones ──
  if (p.glassZoneConfig === "upper_lower") {
    const lowerH = s(p.lowerZoneHeightMm, scaleH);
    const upperH = s(p.upperZoneHeightMm, scaleH);
    const midRailY = baseY - lowerH;
    const upperY = midRailY - upperH;

    // Lower glass
    content += `<rect x="${ox + 5}" y="${midRailY}" width="${postW - 10}" height="${lowerH}" fill="${STYLE.glassSliding}" fill-opacity="0.5" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<text x="${ox + postW / 2}" y="${midRailY + lowerH / 2 + 4}" font-size="7" fill="${STYLE.glassStroke}" text-anchor="middle">${p.glassThicknessMm}mm GLASS</text>`;
    content += dimLine(ox - 40, midRailY, ox - 40, baseY, `${p.lowerZoneHeightMm}`, -15, false, 8);

    // Mid-rail
    content += `<rect x="${ox - 15}" y="${midRailY - 6}" width="${postW + 30}" height="12" fill="${STYLE.railing}" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    content += `<text x="${ox + postW / 2}" y="${midRailY + 4}" font-size="7" fill="#FFFFFF" text-anchor="middle">MID-RAIL</text>`;

    // Upper glass
    content += `<rect x="${ox + 5}" y="${upperY}" width="${postW - 10}" height="${upperH}" fill="${STYLE.glassSliding}" fill-opacity="0.35" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<text x="${ox + postW / 2}" y="${upperY + upperH / 2 + 4}" font-size="7" fill="${STYLE.glassStroke}" text-anchor="middle">${p.glassThicknessMm}mm GLASS</text>`;
    content += dimLine(ox - 40, upperY, ox - 40, midRailY - 6, `${p.upperZoneHeightMm}`, -15, false, 8);
  }

  // ── FH dimension ──
  content += dimLine(ox + postW + 20, railTopY + railH, ox + postW + 20, baseY, `FH=${p.finishedHeightMm} (${mmToFtIn(p.finishedHeightMm)})`, 20, false, 8);

  // ── FFL datum ──
  content += `<line x1="${MARGIN_L}" y1="${baseY}" x2="${SVG_W - MARGIN_R}" y2="${baseY}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="6,3"/>`;
  content += `<text x="${MARGIN_L}" y="${baseY - 4}" font-size="8" fill="${STYLE.noteText}">F.F.L. ±0.000</text>`;

  // ── Keynotes ──
  const kx = SVG_W - MARGIN_R + 5;
  content += keynote(kx, railTopY + railH / 2, "1");
  content += `<text x="${kx + 14}" y="${railTopY + railH / 2 + 4}" font-size="7" fill="${STYLE.noteText}">LGR ${p.railingProfileMm}mm railing</text>`;
  content += keynote(kx, baseY - s(p.lowerZoneHeightMm / 2, scaleH), "2");
  content += `<text x="${kx + 14}" y="${baseY - s(p.lowerZoneHeightMm / 2, scaleH) + 4}" font-size="7" fill="${STYLE.noteText}">${p.glassThicknessMm}mm tempered glass</text>`;
  content += keynote(kx, anchorTopY + anchorH / 2, "3");
  content += `<text x="${kx + 14}" y="${anchorTopY + anchorH / 2 + 4}" font-size="7" fill="${STYLE.noteText}">Concrete anchor</text>`;

  content += `<text x="${SVG_W - MARGIN_R}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:15 (approx) | Typical Section — LGS System</text>`;

  return svgWrap(SVG_W, SVG_H, content, "Typical Section — LGS Full Height", "L3.1");
}

// ─── L3.2 Connection Details ─────────────────────────────────────────────────

export function drawLumonConnectionDetail(p: LumonParams, detailType: "upper" | "railing" | "lower" = "lower"): string {
  const SVG_W = 500;
  const SVG_H = 400;
  const MARGIN = 60;
  const cx = SVG_W / 2;
  const cy = SVG_H / 2;

  let content = "";

  if (detailType === "lower") {
    // ── Lower connection: post + anchor ──
    const slabY = cy + 60;
    const postW = 50;
    const postH = 120;

    // Slab
    content += `<rect x="${MARGIN}" y="${slabY}" width="${SVG_W - MARGIN * 2}" height="50" fill="#DDDDDD" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    content += `<text x="${cx}" y="${slabY + 30}" font-size="9" fill="${STYLE.noteText}" text-anchor="middle">CONCRETE SLAB — min 100mm thick</text>`;

    // Post
    content += `<rect x="${cx - postW / 2}" y="${slabY - postH}" width="${postW}" height="${postH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.5"/>`;
    // Post hatch
    for (let i = 0; i < 4; i++) {
      content += `<line x1="${cx - postW / 2}" y1="${slabY - postH + (postH / 4) * i}" x2="${cx + postW / 2}" y2="${slabY - postH + (postH / 4) * (i + 1)}" stroke="#AAAAAA" stroke-width="0.5"/>`;
    }
    content += `<text x="${cx}" y="${slabY - postH / 2 + 4}" font-size="9" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">${p.lumonPostSectionMm}×${p.lumonPostSectionMm}</text>`;

    // Anchor bolt
    const boltX = cx;
    const boltTopY = slabY + 5;
    const boltH = p.anchorEmbedmentMm * 0.4; // scaled for detail
    content += `<rect x="${boltX - 3}" y="${boltTopY}" width="6" height="${boltH}" fill="${STYLE.anchor}" stroke="${STYLE.mainLine}" stroke-width="0.8"/>`;
    content += `<circle cx="${boltX}" cy="${boltTopY + boltH}" r="5" fill="none" stroke="${STYLE.anchor}" stroke-width="1.5"/>`;

    // Dimensions
    content += dimLine(cx + postW / 2 + 10, slabY, cx + postW / 2 + 10, slabY + boltH + 5, `${p.anchorEmbedmentMm}mm emb.`, 20, false, 8);
    content += dimLine(cx - postW / 2, slabY - postH - 15, cx + postW / 2, slabY - postH - 15, `${p.lumonPostSectionMm}`, -10, true, 8);

    // Labels
    content += `<text x="${cx + postW / 2 + 55}" y="${boltTopY + boltH / 2 + 4}" font-size="8" fill="${STYLE.noteText}">${p.anchorType}</text>`;
    content += `<text x="${cx + postW / 2 + 55}" y="${boltTopY + boltH / 2 + 16}" font-size="8" fill="${STYLE.noteText}">Min. ${p.anchorEmbedmentMm}mm embedment</text>`;

    // FFL
    content += `<line x1="${MARGIN}" y1="${slabY}" x2="${SVG_W - MARGIN}" y2="${slabY}" stroke="${STYLE.dimLine}" stroke-width="0.5" stroke-dasharray="6,3"/>`;
    content += `<text x="${MARGIN}" y="${slabY - 4}" font-size="8" fill="${STYLE.noteText}">F.F.L.</text>`;

    content += `<text x="${SVG_W - MARGIN}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:5 (approx) | Lower Post Connection</text>`;

  } else if (detailType === "railing") {
    // ── Railing connection ──
    const railY = cy - 20;
    const railH = p.railingProfileMm * 0.15;
    const railW = 200;

    content += `<rect x="${cx - railW / 2}" y="${railY}" width="${railW}" height="${railH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.5"/>`;
    content += `<text x="${cx}" y="${railY + railH / 2 + 4}" font-size="9" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">LGR ${p.railingProfileMm}mm RAILING</text>`;

    // Glass channel
    const glassY = railY + railH;
    const glassH = 30;
    content += `<rect x="${cx - 5}" y="${glassY}" width="10" height="${glassH}" fill="${STYLE.glassSliding}" fill-opacity="0.5" stroke="${STYLE.glassStroke}" stroke-width="1"/>`;
    content += `<text x="${cx + 15}" y="${glassY + glassH / 2 + 4}" font-size="8" fill="${STYLE.glassStroke}">${p.glassThicknessMm}mm glass in channel</text>`;

    // Dimensions
    content += dimLine(cx - railW / 2 - 20, railY, cx - railW / 2 - 20, railY + railH, `${p.railingProfileMm}`, -15, false, 8);

    content += `<text x="${SVG_W - MARGIN}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:5 (approx) | Railing-to-Glass Connection</text>`;

  } else {
    // ── Upper connection: railing to pergola ──
    const beamY = cy - 60;
    const beamH = 40;
    const beamW = 200;

    // Pergola beam
    content += `<rect x="${cx - beamW / 2}" y="${beamY}" width="${beamW}" height="${beamH}" fill="#F5F5F5" stroke="${STYLE.mainLine}" stroke-width="1.5" stroke-dasharray="4,2"/>`;
    content += `<text x="${cx}" y="${beamY + beamH / 2 + 4}" font-size="9" fill="${STYLE.noteText}" text-anchor="middle">PERGOLA BEAM (BY OTHERS)</text>`;

    // LGR upper connection bracket
    const bracketY = beamY + beamH;
    const bracketH = 25;
    content += `<rect x="${cx - 30}" y="${bracketY}" width="60" height="${bracketH}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.2"/>`;
    content += `<text x="${cx}" y="${bracketY + bracketH / 2 + 4}" font-size="8" fill="${STYLE.mainLine}" text-anchor="middle">LGR UPPER BRACKET</text>`;

    // Fastener
    content += `<circle cx="${cx - 15}" cy="${bracketY + bracketH / 2}" r="4" fill="${STYLE.anchor}" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    content += `<circle cx="${cx + 15}" cy="${bracketY + bracketH / 2}" r="4" fill="${STYLE.anchor}" stroke="${STYLE.mainLine}" stroke-width="1"/>`;
    content += `<text x="${cx + 40}" y="${bracketY + bracketH / 2 + 4}" font-size="8" fill="${STYLE.noteText}">M8 S/S fasteners (TBC)</text>`;

    // Railing below
    const railY2 = bracketY + bracketH;
    const railH2 = p.railingProfileMm * 0.12;
    content += `<rect x="${cx - 100}" y="${railY2}" width="200" height="${railH2}" fill="${STYLE.railingFill}" stroke="${STYLE.mainLine}" stroke-width="1.5"/>`;
    content += `<text x="${cx}" y="${railY2 + railH2 / 2 + 4}" font-size="9" font-weight="bold" fill="${STYLE.mainLine}" text-anchor="middle">LGR ${p.railingProfileMm}mm</text>`;

    content += `<text x="${SVG_W - MARGIN}" y="${SVG_H - 8}" font-size="8" fill="${STYLE.noteText}" text-anchor="end">SCALE: 1:5 (approx) | Upper Railing-to-Pergola Connection</text>`;
  }

  const titles: Record<string, string> = {
    lower: "Lower Post Connection Detail",
    railing: "Railing-to-Glass Connection Detail",
    upper: "Upper Railing-to-Pergola Connection Detail",
  };

  return svgWrap(SVG_W, SVG_H, content, titles[detailType], "L3.2");
}
