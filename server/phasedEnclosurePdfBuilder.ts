/**
 * phasedEnclosurePdfBuilder.ts
 * Generates a supplemental phased patio enclosure PDF package.
 * This package does NOT modify city-approved drawings.
 */
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import {
  calculateDimensions,
  calculatePhase1QTO,
  calculatePhase2QTO,
  ftToFtIn,
  getDefaultMilestonesPhase1,
  getDefaultMilestonesPhase2,
  getDefaultMilestonesPricing,
  getDefaultMilestonesFieldNotes,
  type Phase1Params,
  type Phase2Params,
  type PricingInputs,
  type FieldNotesData,
  type ScopeMode,
} from "../shared/phasedEnclosureGeometry";

// ─── Page constants ───────────────────────────────────────────────────────────
const PW = 612;   // Letter width (pt)
const PH = 792;   // Letter height (pt)
const MARGIN = 36;
const CONTENT_W = PW - MARGIN * 2;
const CONTENT_H = PH - MARGIN * 2;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  black:    "#0a0a0a",
  white:    "#ffffff",
  gold:     "#d4a017",
  goldDark: "#a07810",
  gray:     "#6b7280",
  grayLight:"#e5e7eb",
  grayMid:  "#9ca3af",
  green:    "#059669",
  greenBg:  "#ecfdf5",
  blue:     "#2563eb",
  blueBg:   "#eff6ff",
  red:      "#dc2626",
  redBg:    "#fef2f2",
  amber:    "#d97706",
  amberBg:  "#fffbeb",
  border:   "#d1d5db",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawTitleBlock(
  doc: PDFKit.PDFDocument,
  projectName: string,
  sheetTitle: string,
  sheetNumber: string,
  sheetOf: string,
  date: string,
  supplementalNote = true,
) {
  const bx = MARGIN;
  const bh = 52;
  const by = PH - MARGIN - bh;

  // Background
  doc.rect(bx, by, CONTENT_W, bh).fill(C.black);

  // Gold accent bar
  doc.rect(bx, by, 4, bh).fill(C.gold);

  // Project name
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.gold)
    .text(projectName.toUpperCase(), bx + 12, by + 8, { width: 280, lineBreak: false });

  // Sheet title
  doc.font("Helvetica").fontSize(7).fillColor(C.white)
    .text(sheetTitle, bx + 12, by + 22, { width: 280, lineBreak: false });

  if (supplementalNote) {
    doc.font("Helvetica-Oblique").fontSize(6).fillColor(C.amber)
      .text("SUPPLEMENTAL PACKAGE — CITY-APPROVED DRAWINGS NOT REVISED", bx + 12, by + 34, { width: 280, lineBreak: false });
  }

  // Right side: sheet number + date
  const rx = bx + CONTENT_W - 120;
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.gold)
    .text(sheetNumber, rx, by + 8, { width: 115, align: "right", lineBreak: false });
  doc.font("Helvetica").fontSize(7).fillColor(C.grayMid)
    .text(`${sheetOf}  |  ${date}`, rx, by + 30, { width: 115, align: "right", lineBreak: false });

  // Border
  doc.rect(bx, by, CONTENT_W, bh).stroke(C.gray);
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  title: string,
  color = C.black,
  textColor = C.white,
) {
  doc.rect(x, y, w, 16).fill(color);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(textColor)
    .text(title.toUpperCase(), x + 6, y + 4, { width: w - 12, lineBreak: false });
  return y + 16;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  cols: { text: string; width: number; align?: "left" | "right" | "center" }[],
  isHeader = false,
  altRow = false,
) {
  const rowH = 14;
  if (isHeader) {
    doc.rect(x, y, w, rowH).fill(C.grayLight);
  } else if (altRow) {
    doc.rect(x, y, w, rowH).fill("#f9fafb");
  }
  doc.rect(x, y, w, rowH).stroke(C.border);

  let cx = x;
  for (const col of cols) {
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(7)
      .fillColor(C.black)
      .text(col.text, cx + 3, y + 3.5, {
        width: col.width - 6,
        align: col.align ?? "left",
        lineBreak: false,
      });
    cx += col.width;
  }
  return y + rowH;
}

function drawBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor = C.white,
  strokeColor = C.border,
) {
  doc.rect(x, y, w, h).fill(fillColor).stroke(strokeColor);
}

function drawBadge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  label: string,
  color: string,
  textColor = C.white,
) {
  const w = doc.widthOfString(label) + 10;
  doc.rect(x, y, w, 12).fill(color);
  doc.font("Helvetica-Bold").fontSize(6).fillColor(textColor)
    .text(label, x + 5, y + 3, { width: w - 10, lineBreak: false });
  return x + w + 6;
}

// ─── Sheet 1: Approved Drawing Reference ─────────────────────────────────────

function sheetApprovedDrawingRef(
  doc: PDFKit.PDFDocument,
  projectName: string,
  approvedDrawingName: string,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;
  const titleBlockH = 52;
  const contentH = CONTENT_H - titleBlockH - 8;

  // Page title
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("APPROVED DRAWING REFERENCE", x0, y0, { width: w, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Reference document — not revised by this supplemental package", x0, y0 + 20, { width: w, lineBreak: false });

  // Red locked notice
  let cy = y0 + 40;
  doc.rect(x0, cy, w, 44).fill(C.redBg).stroke(C.red);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.red)
    .text("CITY-APPROVED DRAWING — LOCKED REFERENCE ONLY", x0 + 10, cy + 8, { width: w - 20, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(C.red)
    .text(
      "The approved patio drawing listed below is used as a reference document only. It has not been modified, revised, or superseded by this supplemental package. Any future structural changes (Phase 2 pergola/upper enclosure) will require a separate permit application.",
      x0 + 10, cy + 22, { width: w - 20, lineBreak: false }
    );
  cy += 52;

  // Drawing details table
  cy = drawSectionHeader(doc, x0, cy, w, "Approved Drawing Details", C.black);
  const detailRows: [string, string][] = [
    ["Drawing Title", "Proposed Patio — Milestones Grill + Bar, Abbotsford BC"],
    ["Drawing Reference", approvedDrawingName],
    ["Prepared By", "McMillan Design Ltd."],
    ["Drawing ID", "ID101"],
    ["Date Approved", "April 2025"],
    ["Approved By", "City of Abbotsford"],
    ["Drawing Status", "CITY APPROVED — DO NOT MODIFY"],
    ["Supplemental Package Status", "This package supplements only — approved drawing unchanged"],
  ];
  for (let i = 0; i < detailRows.length; i++) {
    const [label, value] = detailRows[i];
    cy = drawTableRow(doc, x0, cy, w, [
      { text: label, width: 180 },
      { text: value, width: w - 180 },
    ], false, i % 2 === 1);
  }
  cy += 12;

  // What this package covers
  cy = drawSectionHeader(doc, x0, cy, w, "What This Supplemental Package Covers", C.goldDark);
  const coverItems = [
    ["Phase 1 (Current Scope)", "Lumon railing system + lower glass installation only. No pergola this year."],
    ["Phase 2 (Future Scope)", "Louvered pergola roof + upper glass enclosure. Requires separate permit."],
    ["Dimensions Summary", "Preliminary field dimensions for both phases."],
    ["Assumptions / Exclusions", "Scope boundaries, exclusions, and permit requirements."],
    ["Field Verification Checklist", "Site measurement and condition checklist prior to Phase 1 fabrication."],
  ];
  for (let i = 0; i < coverItems.length; i++) {
    const [label, value] = coverItems[i];
    cy = drawTableRow(doc, x0, cy, w, [
      { text: label, width: 160 },
      { text: value, width: w - 160 },
    ], false, i % 2 === 1);
  }
  cy += 12;

  // Disclaimer
  doc.rect(x0, cy, w, 50).fill(C.amberBg).stroke(C.amber);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.amber)
    .text("DISCLAIMER", x0 + 8, cy + 6, { lineBreak: false });
  doc.font("Helvetica").fontSize(7).fillColor(C.black)
    .text(
      "All dimensions in this supplemental package are preliminary and subject to field verification. Phase 2 dimensions are conceptual only and require structural engineering review and a separate building permit application. This package does not constitute a permit application.",
      x0 + 8, cy + 18, { width: w - 16, lineBreak: false }
    );

  drawTitleBlock(doc, projectName, "APPROVED DRAWING REFERENCE", "REF-01", sheetOf, date);
}

// ─── Sheet 2: Phase 1 Lumon Lower Glass ──────────────────────────────────────

function sheetPhase1(
  doc: PDFKit.PDFDocument,
  projectName: string,
  phase1: Phase1Params,
  pricing: PricingInputs,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;

  // Header
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("PHASE 1 — CURRENT SCOPE", x0, y0, { width: w - 100, lineBreak: false });
  drawBadge(doc, x0 + w - 90, y0 + 2, "CURRENT SCOPE", C.green);
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Lumon Railing System + Lower Glass Installation", x0, y0 + 20, { width: w, lineBreak: false });

  let cy = y0 + 40;

  // Green scope notice
  doc.rect(x0, cy, w, 36).fill(C.greenBg).stroke(C.green);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.green)
    .text("PHASE 1 SCOPE SUMMARY", x0 + 8, cy + 6, { lineBreak: false });
  doc.font("Helvetica").fontSize(7).fillColor(C.black)
    .text(
      "Install Lumon railing system with lower glass panels only. No pergola or upper enclosure this year. Lower system designed for future upper enclosure integration. Approved patio layout remains unchanged.",
      x0 + 8, cy + 18, { width: w - 16, lineBreak: false }
    );
  cy += 44;

  // Dimensions
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 1 Dimensions", C.green, C.white);
  const dims = calculateDimensions(phase1, getDefaultMilestonesPhase2());
  const dimRows: [string, string][] = [
    ["Front Width", `${phase1.frontWidthFt} ft`],
    ["Side Depth", `${phase1.sideDepthFt} ft`],
    ["Front Sections", `${phase1.frontSections} sections × ${phase1.frontSectionWidthFt} ft wide`],
    ["Glass Height (Front)", `${phase1.frontGlassHeightFt} ft`],
    ["Left Side Width", `${phase1.leftSideWidthFt} ft`],
    ["Right Side Width", `${phase1.rightSideWidthFt} ft`],
    ["Front Glass Area", `${dims.phase1FrontGlassAreaSqFt} sqft`],
    ["Side Glass Area", `${dims.phase1SideGlassAreaSqFt} sqft`],
    ["Total Glass Area", `${dims.phase1TotalGlassAreaSqFt} sqft`],
    ["Finish Color", phase1.finishColor],
  ];
  for (let i = 0; i < dimRows.length; i++) {
    const [label, value] = dimRows[i];
    cy = drawTableRow(doc, x0, cy, w, [
      { text: label, width: 200 },
      { text: value, width: w - 200 },
    ], false, i % 2 === 1);
  }
  cy += 10;

  // Integration notes
  cy = drawSectionHeader(doc, x0, cy, w, "Railing Integration Notes", C.black);
  doc.font("Helvetica").fontSize(8).fillColor(C.black)
    .text(phase1.railingIntegrationNote, x0 + 6, cy + 4, { width: w - 12, lineBreak: false });
  cy += 26;

  cy = drawSectionHeader(doc, x0, cy, w, "Future Integration Notes", C.black);
  doc.font("Helvetica").fontSize(8).fillColor(C.black)
    .text(phase1.futureIntegrationNote, x0 + 6, cy + 4, { width: w - 12, lineBreak: false });
  cy += 26;

  // QTO
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 1 Quantity Take-Off", C.green, C.white);
  const qto = calculatePhase1QTO(phase1, pricing);
  const colW = [w - 100 - 50 - 60, 100, 50, 60];
  cy = drawTableRow(doc, x0, cy, w, [
    { text: "Description", width: colW[0] },
    { text: "Qty", width: colW[1], align: "right" },
    { text: "Unit", width: colW[2], align: "center" },
    { text: "Total", width: colW[3], align: "right" },
  ], true);
  for (let i = 0; i < qto.items.length; i++) {
    const item = qto.items[i];
    if (cy + 14 > PH - MARGIN - 52 - 20) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: item.description, width: colW[0] },
      { text: String(item.qty), width: colW[1], align: "right" },
      { text: item.unit, width: colW[2], align: "center" },
      { text: `$${item.lineTotal.toLocaleString()}`, width: colW[3], align: "right" },
    ], false, i % 2 === 1);
  }
  // Totals
  const totalsY = cy;
  doc.rect(x0, totalsY, w, 14).fill(C.grayLight).stroke(C.border);
  doc.font("Helvetica").fontSize(7).fillColor(C.black)
    .text(`Subtotal: $${qto.subtotal.toLocaleString()}   Contingency (${pricing.contingencyPct}%): $${qto.contingency.toLocaleString()}   Tax (${pricing.taxPct}%): $${qto.tax.toLocaleString()}`, x0 + 6, totalsY + 3.5, { width: w - 80, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.green)
    .text(`TOTAL: $${qto.total.toLocaleString()}`, x0 + w - 80, totalsY + 3, { width: 74, align: "right", lineBreak: false });

  drawTitleBlock(doc, projectName, "PHASE 1 — LUMON LOWER GLASS SCOPE", "P1-01", sheetOf, date);
}

// ─── Sheet 3: Phase 2 Future Pergola ─────────────────────────────────────────

function sheetPhase2(
  doc: PDFKit.PDFDocument,
  projectName: string,
  phase2: Phase2Params,
  pricing: PricingInputs,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;

  // Header
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("PHASE 2 — FUTURE SCOPE", x0, y0, { width: w - 100, lineBreak: false });
  drawBadge(doc, x0 + w - 90, y0 + 2, "FUTURE SCOPE", C.blue);
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Louvered Pergola Roof + Upper Glass Enclosure", x0, y0 + 20, { width: w, lineBreak: false });

  let cy = y0 + 40;

  // Blue scope notice
  doc.rect(x0, cy, w, 44).fill(C.blueBg).stroke(C.blue);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blue)
    .text("PHASE 2 SCOPE SUMMARY — PRELIMINARY / CONCEPTUAL", x0 + 8, cy + 6, { lineBreak: false });
  doc.font("Helvetica").fontSize(7).fillColor(C.black)
    .text(
      "Future louvered pergola roof with upper glass enclosure. All dimensions are preliminary and subject to field verification and structural engineering. Phase 2 requires a separate building permit application. City-approved patio drawing is not revised.",
      x0 + 8, cy + 18, { width: w - 16, lineBreak: false }
    );
  cy += 52;

  // Structural criteria
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 2 Structural Criteria", C.blue, C.white);
  const dims = calculateDimensions(getDefaultMilestonesPhase1(), phase2);
  const criteriaRows: [string, string][] = [
    ["Total Unit Height (incl. beams)", ftToFtIn(phase2.totalUnitHeightFt)],
    ["Beam Size", `${phase2.beamSizeIn}" beam`],
    ["Post Size", `${phase2.postSizeIn}" × ${phase2.postSizeIn}" posts`],
    ["Front Face Total Width", `${phase2.frontSections * phase2.frontSectionWidthFt} ft`],
    ["Front Sections", `${phase2.frontSections} sections × ${phase2.frontSectionWidthFt} ft wide × ${phase2.frontSectionHeightFt} ft high`],
    ["Side — Wall Mounted (1 post)", `${ftToFtIn(phase2.sideWallMountedWidthFt)} wide`],
    ["Side — Both Posts", `${ftToFtIn(phase2.sideBothPostsWidthFt)} wide × ${phase2.frontSectionHeightFt} ft high`],
    ["Total Side Section incl. Posts", `${ftToFtIn(phase2.sideWallMountedWidthFt + phase2.postSizeIn / 12)}`],
    ["Louver Sections", `${phase2.louverSections} sections × ${phase2.louverSectionWidthFt} ft × ${phase2.louverSectionDepthFt} ft`],
    ["Louver Area", `${dims.phase2LouverAreaSqFt} sqft`],
    ["Escape Door Width", `${phase2.escapeDoorWidthIn}" (assumed)`],
    ["Latch / Strike Post", `${phase2.latchPostSizeIn}" × ${phase2.latchPostSizeIn}"`],
    ["Post Count (est.)", `${dims.phase2PostCount} posts`],
    ["Upper Glass Area (est.)", `${dims.phase2TotalGlassAreaSqFt} sqft`],
  ];
  for (let i = 0; i < criteriaRows.length; i++) {
    const [label, value] = criteriaRows[i];
    if (cy + 14 > PH - MARGIN - 52 - 80) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: label, width: 220 },
      { text: value, width: w - 220 },
    ], false, i % 2 === 1);
  }
  cy += 10;

  // Notes
  if (cy + 60 < PH - MARGIN - 52 - 20) {
    cy = drawSectionHeader(doc, x0, cy, w, "Beam + Lighting Note", C.black);
    doc.font("Helvetica").fontSize(8).fillColor(C.black)
      .text(phase2.beamLightNote, x0 + 6, cy + 4, { width: w - 12, lineBreak: false });
    cy += 26;
  }

  if (cy + 60 < PH - MARGIN - 52 - 20) {
    cy = drawSectionHeader(doc, x0, cy, w, "Sliding Glass Door Note", C.black);
    doc.font("Helvetica").fontSize(8).fillColor(C.black)
      .text(phase2.slidingGlassNote, x0 + 6, cy + 4, { width: w - 12, lineBreak: false });
    cy += 26;
  }

  // QTO
  if (cy + 80 < PH - MARGIN - 52 - 20) {
    cy = drawSectionHeader(doc, x0, cy, w, "Phase 2 Quantity Take-Off (Preliminary)", C.blue, C.white);
    const qto = calculatePhase2QTO(phase2, pricing);
    const colW = [w - 100 - 50 - 60, 100, 50, 60];
    cy = drawTableRow(doc, x0, cy, w, [
      { text: "Description", width: colW[0] },
      { text: "Qty", width: colW[1], align: "right" },
      { text: "Unit", width: colW[2], align: "center" },
      { text: "Total", width: colW[3], align: "right" },
    ], true);
    for (let i = 0; i < qto.items.length; i++) {
      const item = qto.items[i];
      if (cy + 14 > PH - MARGIN - 52 - 20) break;
      cy = drawTableRow(doc, x0, cy, w, [
        { text: item.description, width: colW[0] },
        { text: String(item.qty), width: colW[1], align: "right" },
        { text: item.unit, width: colW[2], align: "center" },
        { text: `$${item.lineTotal.toLocaleString()}`, width: colW[3], align: "right" },
      ], false, i % 2 === 1);
    }
    if (cy + 14 < PH - MARGIN - 52 - 20) {
      doc.rect(x0, cy, w, 14).fill(C.grayLight).stroke(C.border);
      doc.font("Helvetica").fontSize(7).fillColor(C.black)
        .text(`Subtotal: $${qto.subtotal.toLocaleString()}   Contingency (${pricing.contingencyPct}%): $${qto.contingency.toLocaleString()}   Tax (${pricing.taxPct}%): $${qto.tax.toLocaleString()}`, x0 + 6, cy + 3.5, { width: w - 80, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blue)
        .text(`TOTAL: $${qto.total.toLocaleString()}`, x0 + w - 80, cy + 3, { width: 74, align: "right", lineBreak: false });
    }
  }

  drawTitleBlock(doc, projectName, "PHASE 2 — FUTURE PERGOLA CRITERIA", "P2-01", sheetOf, date);
}

// ─── Sheet 4: Dimensions Summary ─────────────────────────────────────────────

function sheetDimensionsSummary(
  doc: PDFKit.PDFDocument,
  projectName: string,
  phase1: Phase1Params,
  phase2: Phase2Params,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;
  const dims = calculateDimensions(phase1, phase2);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("DIMENSIONS SUMMARY", x0, y0, { width: w, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Preliminary field dimensions — subject to field verification", x0, y0 + 20, { width: w, lineBreak: false });

  let cy = y0 + 40;

  // Patio overall
  cy = drawSectionHeader(doc, x0, cy, w, "Patio Overall", C.black);
  const overallRows: [string, string][] = [
    ["Front Width", `${dims.patioFrontWidthFt} ft`],
    ["Side Depth", `${dims.patioDepthFt} ft`],
    ["Patio Area", `${dims.patioAreaSqFt} sqft`],
  ];
  for (let i = 0; i < overallRows.length; i++) {
    cy = drawTableRow(doc, x0, cy, w, [
      { text: overallRows[i][0], width: 220 },
      { text: overallRows[i][1], width: w - 220 },
    ], false, i % 2 === 1);
  }
  cy += 10;

  // Phase 1
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 1 — Lumon Lower Glass", C.green, C.white);
  const p1Rows: [string, string][] = [
    ["Front Width", `${phase1.frontWidthFt} ft`],
    ["Front Sections", `${phase1.frontSections} × ${phase1.frontSectionWidthFt} ft`],
    ["Glass Height (Front)", `${phase1.frontGlassHeightFt} ft`],
    ["Left Side Width", `${phase1.leftSideWidthFt} ft`],
    ["Right Side Width", `${phase1.rightSideWidthFt} ft`],
    ["Front Glass Area", `${dims.phase1FrontGlassAreaSqFt} sqft`],
    ["Side Glass Area", `${dims.phase1SideGlassAreaSqFt} sqft`],
    ["Total Glass Area", `${dims.phase1TotalGlassAreaSqFt} sqft`],
    ["Finish Color", phase1.finishColor],
  ];
  for (let i = 0; i < p1Rows.length; i++) {
    cy = drawTableRow(doc, x0, cy, w, [
      { text: p1Rows[i][0], width: 220 },
      { text: p1Rows[i][1], width: w - 220 },
    ], false, i % 2 === 1);
  }
  cy += 10;

  // Phase 2
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 2 — Future Pergola (Preliminary)", C.blue, C.white);
  const p2Rows: [string, string][] = [
    ["Total Height (incl. beams)", ftToFtIn(phase2.totalUnitHeightFt)],
    ["Beam Size", `${phase2.beamSizeIn}"`],
    ["Post Size", `${phase2.postSizeIn}" × ${phase2.postSizeIn}"`],
    ["Front Face Total", `${phase2.frontSections * phase2.frontSectionWidthFt} ft`],
    ["Front Sections", `${phase2.frontSections} × ${phase2.frontSectionWidthFt} ft wide × ${phase2.frontSectionHeightFt} ft high`],
    ["Side — Wall Mounted", `${ftToFtIn(phase2.sideWallMountedWidthFt)}`],
    ["Side — Both Posts", `${ftToFtIn(phase2.sideBothPostsWidthFt)} × ${phase2.frontSectionHeightFt} ft high`],
    ["Louver Sections", `${phase2.louverSections} × ${phase2.louverSectionWidthFt} ft × ${phase2.louverSectionDepthFt} ft`],
    ["Louver Area", `${dims.phase2LouverAreaSqFt} sqft`],
    ["Escape Door Width", `${phase2.escapeDoorWidthIn}" (assumed)`],
    ["Latch / Strike Post", `${phase2.latchPostSizeIn}" × ${phase2.latchPostSizeIn}"`],
    ["Post Count (est.)", `${dims.phase2PostCount} posts`],
    ["Upper Glass Area (est.)", `${dims.phase2TotalGlassAreaSqFt} sqft`],
  ];
  for (let i = 0; i < p2Rows.length; i++) {
    if (cy + 14 > PH - MARGIN - 52 - 20) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: p2Rows[i][0], width: 220 },
      { text: p2Rows[i][1], width: w - 220 },
    ], false, i % 2 === 1);
  }

  drawTitleBlock(doc, projectName, "DIMENSIONS SUMMARY", "DIM-01", sheetOf, date);
}

// ─── Sheet 5: Assumptions / Exclusions ───────────────────────────────────────

function sheetAssumptions(
  doc: PDFKit.PDFDocument,
  projectName: string,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("ASSUMPTIONS / EXCLUSIONS", x0, y0, { width: w, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Scope boundaries and permit requirements", x0, y0 + 20, { width: w, lineBreak: false });

  let cy = y0 + 40;

  // Phase 1 assumptions
  cy = drawSectionHeader(doc, x0, cy, w, "Phase 1 — Included in Scope", C.green, C.white);
  const p1Included = [
    "Lumon railing system supply and installation",
    "Lower glass panels — bottom glass only",
    "Railing integration with existing patio structure",
    "Lower system designed for future upper enclosure integration",
    "Approved patio layout remains unchanged",
    "All hardware, fasteners, and sealants for Phase 1",
  ];
  for (let i = 0; i < p1Included.length; i++) {
    if (cy + 14 > PH - MARGIN - 52 - 200) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: "✓", width: 20 },
      { text: p1Included[i], width: w - 20 },
    ], false, i % 2 === 1);
  }
  cy += 8;

  cy = drawSectionHeader(doc, x0, cy, w, "Phase 1 — Excluded from Scope", C.red, C.white);
  const p1Excluded = [
    "Pergola or any upper enclosure structure",
    "Electrical or lighting work",
    "Structural engineering or permit applications",
    "Modifications to city-approved patio drawing",
    "Concrete, footings, or foundation work",
  ];
  for (let i = 0; i < p1Excluded.length; i++) {
    if (cy + 14 > PH - MARGIN - 52 - 150) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: "✗", width: 20 },
      { text: p1Excluded[i], width: w - 20 },
    ], false, i % 2 === 1);
  }
  cy += 8;

  cy = drawSectionHeader(doc, x0, cy, w, "Phase 2 — Assumptions (Preliminary)", C.blue, C.white);
  const p2Assumptions = [
    "All Phase 2 dimensions are preliminary and subject to field verification",
    "Phase 2 requires a separate building permit application",
    "Structural engineering review required before Phase 2 fabrication",
    "City-approved patio drawing will not be revised for Phase 2",
    "Beam size: 8\" or 10\" (to be confirmed by structural engineer)",
    "Post size: 6\" × 6\" (to be confirmed by structural engineer)",
    "Total unit height including beams: 8'10\" (target — to be verified)",
    "Escape door width: 32\" assumed — to be field-verified",
    "Sliding glass doors on remaining side sections — size TBD",
    "Lighting between louver sections — electrical by others",
  ];
  for (let i = 0; i < p2Assumptions.length; i++) {
    if (cy + 14 > PH - MARGIN - 52 - 60) break;
    cy = drawTableRow(doc, x0, cy, w, [
      { text: "~", width: 20 },
      { text: p2Assumptions[i], width: w - 20 },
    ], false, i % 2 === 1);
  }
  cy += 8;

  // Permit note
  if (cy + 44 < PH - MARGIN - 52 - 10) {
    doc.rect(x0, cy, w, 44).fill(C.amberBg).stroke(C.amber);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.amber)
      .text("PERMIT REQUIREMENTS", x0 + 8, cy + 6, { lineBreak: false });
    doc.font("Helvetica").fontSize(7).fillColor(C.black)
      .text(
        "Phase 1 (Lumon lower glass): Verify with City of Abbotsford whether a separate permit is required for railing/glass installation within an approved patio. Phase 2 (pergola + upper enclosure): A separate building permit application is required. The approved patio drawing will need to be updated or supplemented.",
        x0 + 8, cy + 18, { width: w - 16, lineBreak: false }
      );
  }

  drawTitleBlock(doc, projectName, "ASSUMPTIONS / EXCLUSIONS", "ASM-01", sheetOf, date);
}

// ─── Sheet 6: Field Verification Checklist ───────────────────────────────────

function sheetFieldVerification(
  doc: PDFKit.PDFDocument,
  projectName: string,
  fieldNotes: FieldNotesData,
  date: string,
  sheetOf: string,
) {
  const x0 = MARGIN;
  const y0 = MARGIN;
  const w = CONTENT_W;

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.black)
    .text("FIELD VERIFICATION CHECKLIST", x0, y0, { width: w, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text("Complete prior to Phase 1 fabrication — site measurement and condition checklist", x0, y0 + 20, { width: w, lineBreak: false });

  let cy = y0 + 40;

  // Site contact info
  cy = drawSectionHeader(doc, x0, cy, w, "Site Information", C.black);
  const siteRows: [string, string][] = [
    ["Site Contact Name", fieldNotes.siteContactName || "___________________________"],
    ["Site Contact Phone", fieldNotes.siteContactPhone || "___________________________"],
    ["Verification Date", fieldNotes.verificationDate || "___________________________"],
  ];
  for (let i = 0; i < siteRows.length; i++) {
    cy = drawTableRow(doc, x0, cy, w, [
      { text: siteRows[i][0], width: 180 },
      { text: siteRows[i][1], width: w - 180 },
    ], false, i % 2 === 1);
  }
  cy += 10;

  // Checklist items by category
  const categories = Array.from(new Set(fieldNotes.items.map((i) => i.category)));
  for (const cat of categories) {
    if (cy + 30 > PH - MARGIN - 52 - 20) break;
    cy = drawSectionHeader(doc, x0, cy, w, cat, C.black);
    const items = fieldNotes.items.filter((i) => i.category === cat);
    for (let i = 0; i < items.length; i++) {
      if (cy + 18 > PH - MARGIN - 52 - 20) break;
      const item = items[i];
      const rowH = 18;
      doc.rect(x0, cy, w, rowH).fill(i % 2 === 1 ? "#f9fafb" : C.white).stroke(C.border);
      // Checkbox
      doc.rect(x0 + 4, cy + 4, 10, 10).stroke(C.gray);
      if (item.checked) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.green)
          .text("✓", x0 + 5, cy + 4, { lineBreak: false });
      }
      // Label
      doc.font("Helvetica").fontSize(7).fillColor(C.black)
        .text(item.label, x0 + 18, cy + 3, { width: 280, lineBreak: false });
      // Note
      const noteText = item.note || "____________________________";
      doc.font("Helvetica").fontSize(7).fillColor(C.gray)
        .text(noteText, x0 + 18 + 285, cy + 3, { width: w - 18 - 285 - 4, lineBreak: false });
      cy += rowH;
    }
    cy += 6;
  }

  // General notes
  if (cy + 60 < PH - MARGIN - 52 - 10) {
    cy = drawSectionHeader(doc, x0, cy, w, "General Notes", C.black);
    const notesH = Math.min(60, PH - MARGIN - 52 - cy - 10);
    doc.rect(x0, cy, w, notesH).fill(C.white).stroke(C.border);
    if (fieldNotes.generalNotes) {
      doc.font("Helvetica").fontSize(7).fillColor(C.black)
        .text(fieldNotes.generalNotes, x0 + 4, cy + 4, { width: w - 8, lineBreak: false });
    }
  }

  drawTitleBlock(doc, projectName, "FIELD VERIFICATION CHECKLIST", "FV-01", sheetOf, date);
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export interface PhasedEnclosurePDFOptions {
  projectName: string;
  approvedDrawingName: string;
  scopeMode: ScopeMode;
  phase1: Phase1Params;
  phase2: Phase2Params;
  pricing: PricingInputs;
  fieldNotes: FieldNotesData;
}

export function buildPhasedEnclosurePDF(opts: PhasedEnclosurePDFOptions): Buffer {
  const {
    projectName,
    approvedDrawingName,
    scopeMode,
    phase1,
    phase2,
    pricing,
    fieldNotes,
  } = opts;

  const date = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  // Determine which sheets to include
  const includePhase1 = scopeMode !== "phase2Only";
  const includePhase2 = scopeMode !== "phase1Only";

  // Count total sheets
  let totalSheets = 3; // REF + DIM + ASM + FV = 4 always
  if (includePhase1) totalSheets++;
  if (includePhase2) totalSheets++;
  totalSheets += 2; // ASM + FV

  let sheetIndex = 0;
  function nextSheet(): string {
    sheetIndex++;
    return `Sheet ${sheetIndex} of ${totalSheets}`;
  }

  const doc = new PDFDocument({ size: [PW, PH], autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Sheet 1: Approved Drawing Reference
  doc.addPage();
  sheetApprovedDrawingRef(doc, projectName, approvedDrawingName, date, nextSheet());

  // Sheet 2: Phase 1 (if included)
  if (includePhase1) {
    doc.addPage();
    sheetPhase1(doc, projectName, phase1, pricing, date, nextSheet());
  }

  // Sheet 3: Phase 2 (if included)
  if (includePhase2) {
    doc.addPage();
    sheetPhase2(doc, projectName, phase2, pricing, date, nextSheet());
  }

  // Sheet 4: Dimensions Summary
  doc.addPage();
  sheetDimensionsSummary(doc, projectName, phase1, phase2, date, nextSheet());

  // Sheet 5: Assumptions / Exclusions
  doc.addPage();
  sheetAssumptions(doc, projectName, date, nextSheet());

  // Sheet 6: Field Verification Checklist
  doc.addPage();
  sheetFieldVerification(doc, projectName, fieldNotes, date, nextSheet());

  doc.end();

  return Buffer.concat(chunks);
}
