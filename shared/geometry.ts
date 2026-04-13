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
}

export function calculateQTO(p: PergolaParams): QTOItem[] {
  const widthM = p.widthFt * 0.3048;
  const depthM = p.depthFt * 0.3048;
  const heightM = p.heightFt * 0.3048;
  const slatSpacingM = (p.slatSpacingIn / 12) * 0.3048;
  const slatCount = Math.ceil(p.depthFt / (p.slatSpacingIn / 12)) + 1;
  const slatLengthM = widthM;
  const frontBeamLengthM = widthM;
  const rearBeamLengthM = widthM;
  const postHeightM = heightM;

  // Glass panel widths
  const frontGlassArea = p.glassFront ? p.widthFt * p.heightFt * 0.0929 : 0;
  const sideGlassArea = p.glassLeft || p.glassRight
    ? (p.glassLeft ? 1 : 0) * p.depthFt * p.heightFt * 0.0929
    + (p.glassRight ? 1 : 0) * p.depthFt * p.heightFt * 0.0929
    : 0;
  const totalGlassM2 = frontGlassArea + sideGlassArea;

  const items: QTOItem[] = [
    // Aluminum Structure
    {
      category: "Aluminum Structure",
      description: "Front posts (100×100 aluminum SHS)",
      unit: "EA",
      qty: p.postCount,
      basis: `${p.postCount} posts at ${p.postSpacingFt.toFixed(1)}' c/c`,
    },
    {
      category: "Aluminum Structure",
      description: "Front fascia beam (150×75 aluminum RHS)",
      unit: "LM",
      qty: Math.round(frontBeamLengthM * 10) / 10,
      basis: `Full width ${p.widthFt.toFixed(1)}'`,
    },
    {
      category: "Aluminum Structure",
      description: "Rear wall ledger beam (150×75 aluminum RHS)",
      unit: "LM",
      qty: Math.round(rearBeamLengthM * 10) / 10,
      basis: `Full width ${p.widthFt.toFixed(1)}' — wall-mounted`,
    },
    {
      category: "Aluminum Structure",
      description: "Post base plates (200×200×12 aluminum)",
      unit: "EA",
      qty: p.postCount,
      basis: "One per front post",
    },
    {
      category: "Aluminum Structure",
      description: "Wall bracket anchors (heavy-duty)",
      unit: "EA",
      qty: Math.ceil(p.widthFt / 4),
      basis: "Approx. 1 per 4' of wall ledger",
    },
    // Slat System
    {
      category: "Slat System",
      description: `${p.slatType === "fixed" ? "Fixed aluminum slats (150×25)" : "Operable aluminum louvers (150×25)"}`,
      unit: "EA",
      qty: slatCount,
      basis: `${p.slatSpacingIn}" spacing over ${p.depthFt.toFixed(1)}' depth`,
    },
    {
      category: "Slat System",
      description: "Slat clip / bracket sets",
      unit: "EA",
      qty: slatCount * p.postCount,
      basis: "One set per slat per support point",
    },
    ...(p.slatType === "operable" ? [{
      category: "Slat System",
      description: "Motorized actuator / drive system",
      unit: "EA",
      qty: 1,
      basis: "One system per pergola zone",
    }] : []),
    // Lumin Glass Enclosure
    ...(totalGlassM2 > 0 ? [
      {
        category: "Lumin Glass Enclosure",
        description: "Lumin glass panels (vertical enclosure)",
        unit: "M²",
        qty: Math.round(totalGlassM2 * 10) / 10,
        basis: `Front: ${p.glassFront ? "yes" : "no"}, Left: ${p.glassLeft ? "yes" : "no"}, Right: ${p.glassRight ? "yes" : "no"}`,
      },
      {
        category: "Lumin Glass Enclosure",
        description: "Glass top rail (integrated to fascia beam)",
        unit: "LM",
        qty: Math.round((p.widthFt * (p.glassFront ? 1 : 0) + p.depthFt * ((p.glassLeft ? 1 : 0) + (p.glassRight ? 1 : 0))) * 0.3048 * 10) / 10,
        basis: "Top rail at glass-to-beam connection",
      },
      {
        category: "Lumin Glass Enclosure",
        description: "Glass bottom track / sill",
        unit: "LM",
        qty: Math.round((p.widthFt * (p.glassFront ? 1 : 0) + p.depthFt * ((p.glassLeft ? 1 : 0) + (p.glassRight ? 1 : 0))) * 0.3048 * 10) / 10,
        basis: "Bottom track at slab level",
      },
    ] : []),
    // Finishes & Accessories
    {
      category: "Finishes & Accessories",
      description: `Powder coat finish — ${p.finishColor}`,
      unit: "LS",
      qty: 1,
      basis: "All aluminum components",
    },
    {
      category: "Finishes & Accessories",
      description: "Trim / closure pieces",
      unit: "LS",
      qty: 1,
      basis: "Perimeter trim and end caps",
    },
    ...(p.ledLighting ? [{
      category: "Finishes & Accessories",
      description: "LED strip lighting (between slats)",
      unit: "LM",
      qty: Math.round(slatCount * slatLengthM * 10) / 10,
      basis: `${slatCount} slats × ${p.widthFt.toFixed(1)}' width`,
    }] : []),
    {
      category: "Finishes & Accessories",
      description: "Fasteners, sealant, and misc. hardware",
      unit: "LS",
      qty: 1,
      basis: "Allowance",
    },
  ];

  return items;
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
