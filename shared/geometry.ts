// ─── Pergola Geometry & QTO Calculations ─────────────────────────────────────
// All calculations are preliminary and for estimating purposes only.

export interface PergolaParams {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  postCount: number;
  postSpacingFt: number;
  slatType: "fixed" | "operable";
  slatSpacingIn: number;
  glassFront: boolean;
  glassLeft: boolean;
  glassRight: boolean;
  finishColor: string;
  ledLighting: boolean;
}

export interface QTOItem {
  category: string;
  description: string;
  unit: string;
  qty: number;
  basis: string;
  unitRate: number;   // Default suggested unit rate (CAD)
  lineTotal: number;  // qty × unitRate
}

// Default unit rates (CAD) — preliminary estimates only
const DEFAULT_RATES: Record<string, number> = {
  "Front posts (100×100 aluminum SHS)": 850,
  "Front fascia beam (150×75 aluminum RHS)": 280,
  "Rear wall ledger beam (150×75 aluminum RHS)": 260,
  "Post base plates (200×200×12 aluminum)": 220,
  "Wall bracket anchors (heavy-duty)": 95,
  "Fixed aluminum slats (150×25)": 180,
  "Operable aluminum louvers (150×25)": 320,
  "Slat clip / bracket sets": 28,
  "Motorized actuator / drive system": 3800,
  "Lumin glass panels (vertical enclosure)": 420,
  "Glass top rail (integrated to fascia beam)": 195,
  "Glass bottom track / sill": 145,
  "Trim / closure pieces": 1200,
  "Fasteners, sealant, and misc. hardware": 950,
};

export function getDefaultRates(): Record<string, number> {
  return { ...DEFAULT_RATES };
}

function withRate(
  item: Omit<QTOItem, "unitRate" | "lineTotal">,
  hardcoded?: number,
  overrides?: Record<string, number>
): QTOItem {
  const unitRate = overrides?.[item.description] ?? hardcoded ?? DEFAULT_RATES[item.description] ?? 0;
  return { ...item, unitRate, lineTotal: Math.round(item.qty * unitRate * 100) / 100 };
}

export function calculateQTO(p: PergolaParams, rateOverrides?: Record<string, number>): QTOItem[] {
  const widthM = p.widthFt * 0.3048;
  const depthM = p.depthFt * 0.3048;
  const heightM = p.heightFt * 0.3048;
  const slatCount = Math.ceil(p.depthFt / (p.slatSpacingIn / 12)) + 1;
  const slatLengthM = widthM;
  const frontBeamLengthM = widthM;
  const rearBeamLengthM = widthM;

  const frontGlassArea = p.glassFront ? p.widthFt * p.heightFt * 0.0929 : 0;
  const sideGlassArea =
    (p.glassLeft ? 1 : 0) * p.depthFt * p.heightFt * 0.0929 +
    (p.glassRight ? 1 : 0) * p.depthFt * p.heightFt * 0.0929;
  const totalGlassM2 = frontGlassArea + sideGlassArea;

  const glassPerimeterM =
    (p.widthFt * (p.glassFront ? 1 : 0) +
      p.depthFt * ((p.glassLeft ? 1 : 0) + (p.glassRight ? 1 : 0))) *
    0.3048;

  const finishRate =
    p.finishColor === "Matte Black (Standard)" || p.finishColor === "Matte Black"
      ? 2200
      : p.finishColor === "Custom RAL"
      ? 2800
      : 2200;

  // LED rate: ~$45/LM per slat run
  const ledRate = 45;

  const ro = rateOverrides ?? {};
  const items: QTOItem[] = [
    // ── Aluminum Structure ─────────────────────────────────────────────────────────────────────────────
    withRate({ category: "Aluminum Structure", description: "Front posts (100×100 aluminum SHS)", unit: "EA", qty: p.postCount, basis: `${p.postCount} posts at ${p.postSpacingFt.toFixed(1)}' c/c` }, undefined, ro),
    withRate({ category: "Aluminum Structure", description: "Front fascia beam (150×75 aluminum RHS)", unit: "LM", qty: Math.round(frontBeamLengthM * 10) / 10, basis: `Full width ${p.widthFt.toFixed(1)}'` }, undefined, ro),
    withRate({ category: "Aluminum Structure", description: "Rear wall ledger beam (150×75 aluminum RHS)", unit: "LM", qty: Math.round(rearBeamLengthM * 10) / 10, basis: `Full width ${p.widthFt.toFixed(1)}' — wall-mounted` }, undefined, ro),
    withRate({ category: "Aluminum Structure", description: "Post base plates (200×200×12 aluminum)", unit: "EA", qty: p.postCount, basis: "One per front post" }, undefined, ro),
    withRate({ category: "Aluminum Structure", description: "Wall bracket anchors (heavy-duty)", unit: "EA", qty: Math.ceil(p.widthFt / 4), basis: "Approx. 1 per 4' of wall ledger" }, undefined, ro),

    // ── Slat System ─────────────────────────────────────────────────────────────────────────────
    withRate({ category: "Slat System", description: p.slatType === "fixed" ? "Fixed aluminum slats (150×25)" : "Operable aluminum louvers (150×25)", unit: "EA", qty: slatCount, basis: `${p.slatSpacingIn}" spacing over ${p.depthFt.toFixed(1)}' depth` }, undefined, ro),
    withRate({ category: "Slat System", description: "Slat clip / bracket sets", unit: "EA", qty: slatCount * p.postCount, basis: "One set per slat per support point" }, undefined, ro),
    ...(p.slatType === "operable" ? [withRate({ category: "Slat System", description: "Motorized actuator / drive system", unit: "EA", qty: 1, basis: "One system per pergola zone" }, undefined, ro)] : []),

    // ── Lumin Glass Enclosure ─────────────────────────────────────────────────────────────────────────────
    ...(totalGlassM2 > 0 ? [
      withRate({ category: "Lumin Glass Enclosure", description: "Lumin glass panels (vertical enclosure)", unit: "M²", qty: Math.round(totalGlassM2 * 10) / 10, basis: `Front: ${p.glassFront ? "yes" : "no"}, Left: ${p.glassLeft ? "yes" : "no"}, Right: ${p.glassRight ? "yes" : "no"}` }, undefined, ro),
      withRate({ category: "Lumin Glass Enclosure", description: "Glass top rail (integrated to fascia beam)", unit: "LM", qty: Math.round(glassPerimeterM * 10) / 10, basis: "Top rail at glass-to-beam connection" }, undefined, ro),
      withRate({ category: "Lumin Glass Enclosure", description: "Glass bottom track / sill", unit: "LM", qty: Math.round(glassPerimeterM * 10) / 10, basis: "Bottom track at slab level" }, undefined, ro),
    ] : []),

    // ── Finishes & Accessories ─────────────────────────────────────────────────────────────────────────────
    withRate({ category: "Finishes & Accessories", description: `Powder coat finish — ${p.finishColor}`, unit: "LS", qty: 1, basis: "All aluminum components" }, finishRate, ro),
    withRate({ category: "Finishes & Accessories", description: "Trim / closure pieces", unit: "LS", qty: 1, basis: "Perimeter trim and end caps" }, undefined, ro),
    ...(p.ledLighting ? [withRate({ category: "Finishes & Accessories", description: "LED strip lighting (between slats)", unit: "LM", qty: Math.round(slatCount * slatLengthM * 10) / 10, basis: `${slatCount} slats × ${p.widthFt.toFixed(1)}' width` }, ledRate, ro)] : []),
    withRate({ category: "Finishes & Accessories", description: "Fasteners, sealant, and misc. hardware", unit: "LS", qty: 1, basis: "Allowance" }, undefined, ro),
  ];

  return items;
}

export function calculateGrandTotal(items: QTOItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
}

// ─── SVG Drawing Dimensions ───────────────────────────────────────────────────

export interface DrawingDimensions {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  postCount: number;
  postSpacingFt: number;
  slatSpacingIn: number;
  slatCount: number;
  glassFront: boolean;
  glassLeft: boolean;
  glassRight: boolean;
}

export function getDrawingDimensions(p: PergolaParams): DrawingDimensions {
  return {
    widthFt: p.widthFt,
    depthFt: p.depthFt,
    heightFt: p.heightFt,
    postCount: p.postCount,
    postSpacingFt: p.postSpacingFt,
    slatSpacingIn: p.slatSpacingIn,
    slatCount: Math.ceil(p.depthFt / (p.slatSpacingIn / 12)) + 1,
    glassFront: p.glassFront,
    glassLeft: p.glassLeft,
    glassRight: p.glassRight,
  };
}
