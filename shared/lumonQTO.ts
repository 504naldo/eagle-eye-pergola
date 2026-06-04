/**
 * Eagle Eye — Lumon Glass System QTO
 * Calculates bill of materials and preliminary budget for Lumon LGS/LGF systems.
 */

import type { LumonParams } from "./scopeTypes";

// ─── QTO Item ─────────────────────────────────────────────────────────────────

export interface LumonQTOItem {
  lineKey: string;
  description: string;
  qty: number;
  unit: string;
  unitRate: number;
  lineTotal: number;
  basis: string;
  group: string;
}

// ─── Default Unit Rates (CAD $) ───────────────────────────────────────────────

export function getLumonDefaultRates(): Record<string, number> {
  return {
    "Lumon LGS Sliding Glass System (supply & install)": 1850,  // per m²
    "Lumon LGF Fixed Glass System (supply & install)": 1450,    // per m²
    "LGR 160mm Railing Profile (supply & install)": 380,        // per lm
    "70×70mm Lumon Post (supply & install)": 520,               // per post
    "Mid-Rail Track (supply & install)": 95,                    // per lm
    "Side Return Frame (supply & install)": 2800,               // per return
    "Door Opening (frame by others — allow)": 650,              // per door
    "Concrete Anchor — Multimonti (supply & install)": 45,      // per anchor
    "Tempered Safety Glass 8mm (supply)": 0,                    // included in system rate
    "Anodised Finish (standard)": 0,                            // included
    "Custom Powder Coat Finish": 85,                            // per m² additional
    "Mobilisation & Site Setup": 1,                             // lump sum
    "Preliminary Budget Allowance": 1,                          // lump sum
  };
}

// ─── QTO Calculation ──────────────────────────────────────────────────────────

export function calculateLumonQTO(
  p: LumonParams,
  rateOverrides: Record<string, number> = {}
): LumonQTOItem[] {
  const defaults = getLumonDefaultRates();
  const rate = (desc: string) => rateOverrides[desc] ?? defaults[desc] ?? 0;

  const items: LumonQTOItem[] = [];

  // ── Glass area calculation ──────────────────────────────────────────────────
  let slidingAreaM2 = 0;
  let fixedAreaM2 = 0;
  const glassHeightM = (p.lowerZoneHeightMm + (p.glassZoneConfig === "upper_lower" ? p.upperZoneHeightMm : 0)) / 1000;

  for (const bay of p.bays) {
    const bayAreaM2 = (bay.widthMm / 1000) * glassHeightM;
    if (bay.isFixed) {
      fixedAreaM2 += bayAreaM2;
    } else {
      slidingAreaM2 += bayAreaM2;
    }
  }

  // Side returns
  const returnAreaM2 =
    (p.hasLeftReturn ? (p.leftReturnWidthMm / 1000) * glassHeightM : 0) +
    (p.hasRightReturn ? (p.rightReturnWidthMm / 1000) * glassHeightM : 0);
  slidingAreaM2 += returnAreaM2;

  // ── Sliding glass system ──
  if (slidingAreaM2 > 0) {
    const desc = "Lumon LGS Sliding Glass System (supply & install)";
    const qty = Math.round(slidingAreaM2 * 100) / 100;
    items.push({
      lineKey: "lumon_lgs_sliding",
      description: desc,
      qty,
      unit: "m²",
      unitRate: rate(desc),
      lineTotal: qty * rate(desc),
      basis: `${p.bays.filter(b => !b.isFixed).length} sliding bays + returns = ${qty.toFixed(2)} m²`,
      group: "Lumon Glass System",
    });
  }

  // ── Fixed glass system ──
  if (fixedAreaM2 > 0) {
    const desc = "Lumon LGF Fixed Glass System (supply & install)";
    const qty = Math.round(fixedAreaM2 * 100) / 100;
    items.push({
      lineKey: "lumon_lgf_fixed",
      description: desc,
      qty,
      unit: "m²",
      unitRate: rate(desc),
      lineTotal: qty * rate(desc),
      basis: `${p.bays.filter(b => b.isFixed).length} fixed bays = ${qty.toFixed(2)} m²`,
      group: "Lumon Glass System",
    });
  }

  // ── Railing profile ──
  const railingLm = p.overallSpanMm / 1000;
  {
    const desc = "LGR 160mm Railing Profile (supply & install)";
    items.push({
      lineKey: "lumon_railing",
      description: desc,
      qty: Math.round(railingLm * 100) / 100,
      unit: "lm",
      unitRate: rate(desc),
      lineTotal: Math.round(railingLm * 100) / 100 * rate(desc),
      basis: `Overall span ${p.overallSpanMm}mm = ${railingLm.toFixed(2)} lm`,
      group: "Lumon Glass System",
    });
  }

  // ── Mid-rail track ──
  {
    const desc = "Mid-Rail Track (supply & install)";
    const midRailLm = p.glassZoneConfig === "upper_lower" ? railingLm : 0;
    if (midRailLm > 0) {
      items.push({
        lineKey: "lumon_midrail",
        description: desc,
        qty: Math.round(midRailLm * 100) / 100,
        unit: "lm",
        unitRate: rate(desc),
        lineTotal: Math.round(midRailLm * 100) / 100 * rate(desc),
        basis: `Upper/lower zone config — mid-rail at ${p.lowerZoneHeightMm}mm`,
        group: "Lumon Glass System",
      });
    }
  }

  // ── Lumon posts ──
  const lumonPostCount = p.bays.length + 1; // one post per bay boundary
  {
    const desc = "70×70mm Lumon Post (supply & install)";
    items.push({
      lineKey: "lumon_posts",
      description: desc,
      qty: lumonPostCount,
      unit: "ea",
      unitRate: rate(desc),
      lineTotal: lumonPostCount * rate(desc),
      basis: `${p.bays.length} bays → ${lumonPostCount} posts`,
      group: "Lumon Glass System",
    });
  }

  // ── Side returns ──
  const returnCount = (p.hasLeftReturn ? 1 : 0) + (p.hasRightReturn ? 1 : 0);
  if (returnCount > 0) {
    const desc = "Side Return Frame (supply & install)";
    items.push({
      lineKey: "lumon_returns",
      description: desc,
      qty: returnCount,
      unit: "ea",
      unitRate: rate(desc),
      lineTotal: returnCount * rate(desc),
      basis: `${p.hasLeftReturn ? "Left" : ""}${p.hasLeftReturn && p.hasRightReturn ? " + " : ""}${p.hasRightReturn ? "Right" : ""} return`,
      group: "Lumon Glass System",
    });
  }

  // ── Door openings ──
  const doorCount = p.bays.filter(b => b.hasDoor).length;
  if (doorCount > 0) {
    const desc = "Door Opening (frame by others — allow)";
    items.push({
      lineKey: "lumon_doors",
      description: desc,
      qty: doorCount,
      unit: "ea",
      unitRate: rate(desc),
      lineTotal: doorCount * rate(desc),
      basis: `${doorCount} door opening(s) — door by others`,
      group: "Lumon Glass System",
    });
  }

  // ── Concrete anchors ──
  const anchorsPerPost = 2;
  const totalAnchors = (lumonPostCount + returnCount) * anchorsPerPost;
  {
    const desc = "Concrete Anchor — Multimonti (supply & install)";
    items.push({
      lineKey: "lumon_anchors",
      description: desc,
      qty: totalAnchors,
      unit: "ea",
      unitRate: rate(desc),
      lineTotal: totalAnchors * rate(desc),
      basis: `${lumonPostCount + returnCount} posts × ${anchorsPerPost} anchors = ${totalAnchors} ea`,
      group: "Structural",
    });
  }

  // ── Custom finish ──
  if (p.finishColor !== "Anodised Silver") {
    const totalAreaM2 = slidingAreaM2 + fixedAreaM2;
    const desc = "Custom Powder Coat Finish";
    items.push({
      lineKey: "lumon_finish",
      description: desc,
      qty: Math.round(totalAreaM2 * 100) / 100,
      unit: "m²",
      unitRate: rate(desc),
      lineTotal: Math.round(totalAreaM2 * 100) / 100 * rate(desc),
      basis: `Custom finish: ${p.finishColor}`,
      group: "Finishes",
    });
  }

  // ── Mobilisation ──
  {
    const desc = "Mobilisation & Site Setup";
    const mob = 2500;
    items.push({
      lineKey: "lumon_mob",
      description: desc,
      qty: 1,
      unit: "LS",
      unitRate: mob,
      lineTotal: mob,
      basis: "Lump sum allowance",
      group: "Preliminaries",
    });
  }

  // ── Preliminary budget allowance ──
  {
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const contingency = Math.round(subtotal * 0.10);
    items.push({
      lineKey: "lumon_contingency",
      description: "Preliminary Budget Allowance (10%)",
      qty: 1,
      unit: "LS",
      unitRate: contingency,
      lineTotal: contingency,
      basis: "10% of subtotal — concept stage allowance",
      group: "Preliminaries",
    });
  }

  return items;
}

// ─── Glass Area Summary ───────────────────────────────────────────────────────

export interface LumonGlassSummary {
  totalSlidingM2: number;
  totalFixedM2: number;
  totalGlassM2: number;
  glassHeightMm: number;
  totalSpanMm: number;
  bayCount: number;
  slidingBayCount: number;
  fixedBayCount: number;
  postCount: number;
  returnCount: number;
  doorCount: number;
  anchorCount: number;
}

export function getLumonGlassSummary(p: LumonParams): LumonGlassSummary {
  const glassHeightMm = p.lowerZoneHeightMm + (p.glassZoneConfig === "upper_lower" ? p.upperZoneHeightMm : 0);
  const glassHeightM = glassHeightMm / 1000;

  let totalSlidingM2 = 0;
  let totalFixedM2 = 0;
  let slidingBayCount = 0;
  let fixedBayCount = 0;

  for (const bay of p.bays) {
    const area = (bay.widthMm / 1000) * glassHeightM;
    if (bay.isFixed) { totalFixedM2 += area; fixedBayCount++; }
    else { totalSlidingM2 += area; slidingBayCount++; }
  }

  const returnAreaM2 =
    (p.hasLeftReturn ? (p.leftReturnWidthMm / 1000) * glassHeightM : 0) +
    (p.hasRightReturn ? (p.rightReturnWidthMm / 1000) * glassHeightM : 0);
  totalSlidingM2 += returnAreaM2;

  const returnCount = (p.hasLeftReturn ? 1 : 0) + (p.hasRightReturn ? 1 : 0);
  const postCount = p.bays.length + 1;
  const doorCount = p.bays.filter(b => b.hasDoor).length;
  const anchorCount = (postCount + returnCount) * 2;

  return {
    totalSlidingM2: Math.round(totalSlidingM2 * 100) / 100,
    totalFixedM2: Math.round(totalFixedM2 * 100) / 100,
    totalGlassM2: Math.round((totalSlidingM2 + totalFixedM2) * 100) / 100,
    glassHeightMm,
    totalSpanMm: p.overallSpanMm,
    bayCount: p.bays.length,
    slidingBayCount,
    fixedBayCount,
    postCount,
    returnCount,
    doorCount,
    anchorCount,
  };
}
