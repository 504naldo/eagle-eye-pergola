import PDFDocument from "pdfkit";
import sharp from "sharp";
import type { Request, Response } from "express";
import { getProjectById, getProjectParams, getChecklistItems, getScopeItems, getRateOverrides, getRenderingsByProject, getReferencePhotosByProject, getQTOLineOverrides, getLabourRates, getQuoteSettings, getLumonPricing } from "./db";
import https from "https";
import http from "http";
import { calculateQTO, calculateGrandTotal, calculateLabourTotal, getDrawingDimensions, PergolaParams } from "../shared/geometry";
import { calculateCanopyQTO, calculateCanopyGrandTotal } from "../shared/canopyGeometry";
import { calculateEnclosureQTO, calculateEnclosureGrandTotal } from "../shared/enclosureGeometry";
import { DEFAULT_CANOPY_PARAMS, DEFAULT_ENCLOSURE_PARAMS, DEFAULT_FENCING_PARAMS } from "../shared/scopeTypes";
import { calculateFencingQTO } from "../shared/fencingGeometry";
import { buildFencingPDF } from "./fencingPdfBuilder";

const GOLD = "#C9A84C";
const BLACK = "#111111";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BLUE = "#3B82F6";

// A3 landscape dimensions in points (1 pt = 1/72 inch)
// A3 = 420mm x 297mm = 1190.55 x 841.89 pts
const PW = 1190.55;
const PH = 841.89;
const MARGIN = 36;

// Right-side title block width — reserves space on every drawing sheet
const TB_WIDTH = 165;

// Convert decimal feet to architectural feet-inches string e.g. 15.67 → 15'-8"
function ftToFtIn(ft: number): string {
  const f = Math.floor(ft);
  const totalIn = Math.round((ft - f) * 12);
  const inches = totalIn % 12;
  const extraFt = Math.floor(totalIn / 12);
  return `${f + extraFt}'-${inches}"`;
}

// ─── Right-side title block ──────────────────────────────────────────────────

interface TitleBlockOpts {
  projectName: string;
  location: string;
  clientName: string;
  drawingTitle: string;
  sheetNum: string;   // e.g. "03"
  totalSheets: string;
  scale?: string;
  date: string;
  status?: string;    // "CONCEPT SET" | "PERMIT SET"
}

function drawTitleBlock(doc: PDFKit.PDFDocument, opts: TitleBlockOpts) {
  const tbX = PW - MARGIN - TB_WIDTH;
  const tbTop = 55;
  const tbBot = PH - 28;
  const tbH = tbBot - tbTop;
  const W = TB_WIDTH;

  // Outer border
  doc.rect(tbX, tbTop, W, tbH).stroke("#374151").strokeColor("#374151").lineWidth(0.5).fillOpacity(1);

  let fy = tbTop;

  // Company header
  doc.rect(tbX, fy, W, 26).fill(BLACK);
  doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text("Eagle Eye", tbX + 5, fy + 3, { width: W - 10 });
  doc.fontSize(7).fillColor("white").font("Helvetica").text("Management Services", tbX + 5, fy + 13, { width: W - 10 });
  fy += 26;

  const field = (label: string, value: string, h = 34) => {
    doc.rect(tbX, fy, W, h).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
    doc.fontSize(6).fillColor(GRAY).font("Helvetica").text(label, tbX + 4, fy + 3, { width: W - 8 });
    doc.fontSize(7.5).fillColor(BLACK).font("Helvetica-Bold").text(value, tbX + 4, fy + 13, { width: W - 8 });
    fy += h;
  };

  field("PROJECT", opts.projectName.length > 28 ? opts.projectName.slice(0, 26) + "…" : opts.projectName, 38);
  field("LOCATION / ADDRESS", opts.location || "—", 34);
  field("CLIENT", opts.clientName || "—", 30);
  field("DRAWING TITLE", opts.drawingTitle, 34);

  // Two-col row: Scale / Date
  const half = W / 2;
  doc.rect(tbX, fy, half, 24).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
  doc.rect(tbX + half, fy, half, 24).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
  doc.fontSize(6).fillColor(GRAY).font("Helvetica").text("SCALE", tbX + 4, fy + 3);
  doc.fontSize(7.5).fillColor(BLACK).font("Helvetica-Bold").text(opts.scale ?? "NTS", tbX + 4, fy + 13);
  doc.fontSize(6).fillColor(GRAY).font("Helvetica").text("DATE", tbX + half + 4, fy + 3);
  doc.fontSize(7.5).fillColor(BLACK).font("Helvetica-Bold").text(opts.date, tbX + half + 4, fy + 13);
  fy += 24;

  // Two-col row: Prepared by / Sheet
  doc.rect(tbX, fy, half, 24).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
  doc.rect(tbX + half, fy, half, 24).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
  doc.fontSize(6).fillColor(GRAY).font("Helvetica").text("PREPARED BY", tbX + 4, fy + 3);
  doc.fontSize(7.5).fillColor(BLACK).font("Helvetica-Bold").text("R. Daniels", tbX + 4, fy + 13);
  doc.fontSize(6).fillColor(GRAY).font("Helvetica").text("SHEET", tbX + half + 4, fy + 3);
  doc.fontSize(7.5).fillColor(BLACK).font("Helvetica-Bold").text(`${opts.sheetNum} / ${opts.totalSheets}`, tbX + half + 4, fy + 13);
  fy += 24;

  // Drawing status badge
  const isPermit = opts.status === "PERMIT SET";
  doc.rect(tbX, fy, W, 20).fill(isPermit ? "#DCFCE7" : "#FEF3C7")
    .stroke(isPermit ? "#16A34A" : "#F59E0B").strokeColor(isPermit ? "#16A34A" : "#F59E0B").lineWidth(0.8);
  doc.fontSize(7.5).fillColor(isPermit ? "#15803D" : "#92400E").font("Helvetica-Bold")
    .text(opts.status ?? "CONCEPT SET", tbX + 4, fy + 6, { width: W - 8, align: "center" });
  fy += 20;

  // Revision table header
  doc.rect(tbX, fy, W, 14).fill(BLACK);
  doc.fontSize(6).fillColor("white").font("Helvetica-Bold");
  doc.text("REV", tbX + 3, fy + 4, { width: 22 });
  doc.text("DATE", tbX + 26, fy + 4, { width: 44 });
  doc.text("DESCRIPTION", tbX + 70, fy + 4, { width: W - 70 - 16 });
  doc.text("BY", tbX + W - 15, fy + 4, { width: 14 });
  fy += 14;

  // 3 blank revision rows
  for (let r = 0; r < 3; r++) {
    doc.rect(tbX, fy, W, 14).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.3);
    doc.strokeColor("#E5E7EB").lineWidth(0.3);
    doc.moveTo(tbX + 24, fy).lineTo(tbX + 24, fy + 14).stroke();
    doc.moveTo(tbX + 68, fy).lineTo(tbX + 68, fy + 14).stroke();
    doc.moveTo(tbX + W - 14, fy).lineTo(tbX + W - 14, fy + 14).stroke();
    fy += 14;
  }

  // Engineer's seal — fills remaining space
  const sealH = tbBot - fy;
  doc.rect(tbX, fy, W, sealH).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(0.4);
  doc.fontSize(6.5).fillColor(GRAY).font("Helvetica").text("STRUCTURAL ENGINEER'S SEAL", tbX + 2, fy + 5, { width: W - 4, align: "center" });
  doc.fontSize(6).fillColor(GRAY).font("Helvetica").text("Required for permit submission", tbX + 2, fy + sealH - 14, { width: W - 4, align: "center" });
  // Dashed circle placeholder
  const sealR = Math.min((W - 20) / 2, sealH / 2 - 22);
  const sealCX = tbX + W / 2;
  const sealCY = fy + 16 + sealR;
  doc.circle(sealCX, sealCY, sealR).dash(3, { space: 2 }).stroke("#9CA3AF").strokeColor("#9CA3AF").lineWidth(0.8).undash();
}

// ─── General Notes sheet ─────────────────────────────────────────────────────

function drawGeneralNotes(
  doc: PDFKit.PDFDocument,
  projectName: string,
  params: PergolaParams,
  tbOpts: Omit<TitleBlockOpts, "drawingTitle" | "sheetNum">
) {
  doc.addPage();
  drawPageHeader(doc, projectName, "Sheet G — General Notes");
  drawPageFooter(doc);
  drawTitleBlock(doc, { ...tbOpts, drawingTitle: "General Notes & Specifications", sheetNum: "G" });

  const contentTop = 62;
  const contentW = PW - MARGIN * 2 - TB_WIDTH - 8;
  drawSectionTitle(doc, "General Notes & Specifications", "SHEET G", contentTop + 6);

  const noteX = MARGIN;
  const noteW = (contentW - 12) / 2;
  const colR = MARGIN + noteW + 12;
  let yL = contentTop + 36;
  let yR = contentTop + 36;

  const sectionHeader = (title: string, col: "L" | "R") => {
    const x = col === "L" ? noteX : colR;
    const y = col === "L" ? yL : yR;
    doc.rect(x, y, noteW, 16).fill(BLACK);
    doc.rect(x, y, 3, 16).fill(GOLD);
    doc.fontSize(8).fillColor("white").font("Helvetica-Bold").text(title, x + 8, y + 4, { width: noteW - 12 });
    if (col === "L") yL += 16; else yR += 16;
  };

  const noteItem = (text: string, col: "L" | "R", bold = false) => {
    const x = col === "L" ? noteX : colR;
    const y = col === "L" ? yL : yR;
    const bg = bold ? "#FFFBEB" : "white";
    doc.rect(x, y, noteW, 18).fill(bg).stroke("#F3F4F6").strokeColor("#F3F4F6").lineWidth(0.4);
    doc.rect(x, y, 3, 18).fill(bold ? GOLD : LIGHT_GRAY);
    doc.fontSize(8).fillColor(BLACK).font(bold ? "Helvetica-Bold" : "Helvetica")
      .text(text, x + 8, y + 4, { width: noteW - 12, lineBreak: false });
    if (col === "L") yL += 18; else yR += 18;
  };

  // ── LEFT COLUMN ──
  sectionHeader("DESIGN INTENT — NOT ENGINEERED", "L");
  noteItem("All drawings are concept only — not for construction without licensed structural review.", "L");
  noteItem("Quantities and dimensions are preliminary and subject to field verification.", "L");
  noteItem("Final dimensions to be confirmed from Lumon shop drawings prior to fabrication.", "L");
  noteItem("Connection details are schematic — all connections require engineering sign-off.", "L");
  yL += 6;

  sectionHeader("DESIGN LOADS (PLACEHOLDER — CONFIRM WITH ENGINEER)", "L");
  noteItem(`Ground Snow Load: _____ kPa (verify local NBC 2020 Annex C)`, "L");
  noteItem(`Wind Pressure (1/50): _____ kPa (verify local climate data)`, "L");
  noteItem(`Tributary Area: ${(params.widthFt * params.depthFt * 0.0929).toFixed(1)} m² (${params.widthFt.toFixed(1)}' × ${params.depthFt.toFixed(1)}')`, "L", true);
  noteItem(`Design Code: NBC 2020 (or applicable edition — confirm with AHJ)`, "L");
  yL += 6;

  sectionHeader("ALUMINUM STRUCTURE SPECIFICATIONS", "L");
  noteItem(`Front Posts: 100×100 AL. SHS — Alloy 6061-T6`, "L");
  noteItem(`Fascia / Ledger Beams: 150×75 AL. RHS — Alloy 6061-T6`, "L");
  noteItem(`Slat / Louver Members: 150×25 AL. extrusion — Alloy 6063-T5`, "L");
  noteItem(`Post Base Plates: 200×200×12mm AL. — Alloy 6061-T6`, "L");
  noteItem(`Powder Coat Finish: ${params.finishColor} — AAMA 2604 or AAMA 2605`, "L");
  noteItem(`All aluminum welds: CWB-certified welder, Class W47.2`, "L");
  noteItem(`Anchor bolts: Hilti HIT-HY 270 or equivalent chemical anchor`, "L");
  yL += 6;

  sectionHeader("LUMON ENCLOSURE NOTES", "L");
  noteItem(`System: Lumon vertical glass/railing enclosure system`, "L");
  noteItem(`Glass thickness: Confirm with Lumon shop drawings (12mm or 15mm typ.)`, "L");
  noteItem(`Top rail width: Confirm with Lumon — ref. 146mm (5¾″) per meeting`, "L");
  noteItem(`Railing height: ${ftToFtIn(Math.max(params.railingHeightIn ?? 52, 42) / 12)} above finished floor (min. 42″ commercial code)`, "L", true);
  noteItem(`All glass anchoring and drainage by Lumon supplier`, "L");

  // ── RIGHT COLUMN ──
  sectionHeader("PERMIT & APPROVAL REQUIREMENTS", "R");
  noteItem(`Building Permit: Required — submit to AHJ with stamped drawings`, "R");
  noteItem(`Structural Engineering: Required — licensed P.Eng. review and stamp`, "R");
  noteItem(`Geotechnical Report: May be required — confirm with AHJ`, "R");
  noteItem(`Landlord / Building Owner Approval: Required prior to permit application`, "R");
  noteItem(`Lumon Shop Drawing Review: Required before fabrication`, "R");
  yR += 6;

  sectionHeader("CONSTRUCTION NOTES", "R");
  noteItem(`Connection type: Wall-mounted lean-to — no rear posts`, "R", true);
  noteItem(`Rear ledger anchor type to be confirmed from building wall material/type`, "R");
  noteItem(`Slab assumed to be concrete — confirm capacity for post base loads`, "R");
  noteItem(`All slab penetrations to be core-drilled, not hammered`, "R");
  noteItem(`Sealant at all wall penetrations: neutral-cure silicone, paintable`, "R");
  noteItem(`Post base plates: grout bed levelling required if slab slope > 1%`, "R");
  noteItem(`LED lighting wiring: coordinate with licensed electrician — not in this scope`, "R");
  yR += 6;

  sectionHeader("KEY PROJECT DIMENSIONS (FROM CURRENT PARAMETERS)", "R");
  noteItem(`Overall Width: ${ftToFtIn(params.widthFt)} (${params.widthFt.toFixed(2)} ft)`, "R", true);
  noteItem(`Overall Depth: ${ftToFtIn(params.depthFt)} (${params.depthFt.toFixed(2)} ft)`, "R", true);
  noteItem(`Clear Height: ${ftToFtIn(params.heightFt)} (${params.heightFt.toFixed(2)} ft)`, "R", true);
  noteItem(`Front Posts: ${params.postCount} EA @ ${ftToFtIn(params.postSpacingFt)} c/c (typ.)`, "R");
  noteItem(`Slat Spacing: ${params.slatSpacingIn.toFixed(1)}″ (${params.slatType})`, "R");
  if (params.glassFront || params.glassLeft || params.glassRight) {
    const sides = [params.glassFront ? "Front" : null, params.glassLeft ? "Left" : null, params.glassRight ? "Right" : null].filter(Boolean).join(", ");
    noteItem(`Lumon Enclosure Faces: ${sides}`, "R");
  }
  yR += 6;

  sectionHeader("EXCLUSIONS FROM THIS PACKAGE", "R");
  noteItem(`Structural engineering calculations and stamped drawings`, "R");
  noteItem(`Building permit application, fees, and inspections`, "R");
  noteItem(`Geotechnical investigation / slab capacity assessment`, "R");
  noteItem(`Electrical rough-in, wiring, panel upgrades, and connections`, "R");
  noteItem(`Drainage modification, concrete repair, or slab work`, "R");
  noteItem(`Existing canopy/awning modification or removal`, "R");

  // Disclaimer box below columns
  const discY = Math.max(yL, yR) + 10;
  if (discY + 30 < PH - 30) {
    doc.rect(MARGIN, discY, contentW, 26)
      .fill("#FEF3C7").stroke("#F59E0B").strokeColor("#F59E0B").lineWidth(0.8);
    doc.rect(MARGIN, discY, 3, 26).fill("#F59E0B");
    doc.fontSize(8).fillColor("#92400E").font("Helvetica-Bold")
      .text("⚠  CONCEPT PACKAGE — NOT FOR CONSTRUCTION  |  All notes, specifications, and dimensions are preliminary and for estimating intent only. A licensed structural engineer must review and stamp all drawings prior to permit submission.", MARGIN + 8, discY + 7, { width: contentW - 16 });
  }
}

type QTOItem = {
  lineKey?: string;
  description: string;
  unit: string;
  qty: number;
  unitRate: number;
  lineTotal: number;
  category: string;
  basis: string;
};

// ─── Drawing helpers ────────────────────────────────────────────────────────

function drawPageHeader(doc: PDFKit.PDFDocument, projectName: string, sheetLabel: string) {
  // Black header bar
  doc.rect(0, 0, PW, 52).fill(BLACK);
  doc.rect(0, 52, PW, 3).fill(GOLD);

  // Logo circle placeholder (gold circle with "EE")
  doc.circle(30, 26, 18).stroke(GOLD).strokeColor(GOLD).lineWidth(2);
  doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("EE", 22, 20);

  // Company name
  doc.fontSize(13).fillColor("white").font("Helvetica-Bold").text("Eagle Eye Management Services", 56, 12);
  doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("PERGOLA ESTIMATING PACKAGE", 56, 30);

  // Right side — project name + sheet
  doc.fontSize(11).fillColor("white").font("Helvetica-Bold").text(projectName, MARGIN, 12, { align: "right", width: PW - MARGIN * 2 });
  doc.fontSize(8).fillColor(GRAY).font("Helvetica").text(sheetLabel, MARGIN, 30, { align: "right", width: PW - MARGIN * 2 });
}

function drawPageFooter(doc: PDFKit.PDFDocument) {
  const y = PH - 28;
  doc.rect(0, y - 3, PW, 3).fill(GOLD);
  doc.rect(0, y, PW, 28).fill(BLACK);
  doc.fontSize(7.5).fillColor(GRAY).font("Helvetica").text("© 2025 Eagle Eye Management Services", MARGIN, y + 8);
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("Prepared by: Ranaldo Daniels", 0, y + 8, { align: "center", width: PW });
  doc.fontSize(7.5).fillColor(GRAY).font("Helvetica").text("Concept Only — Not For Construction", 0, y + 8, { align: "right", width: PW - MARGIN });
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, sheetNum: string, y: number) {
  doc.rect(MARGIN, y, 4, 22).fill(GOLD);
  doc.fontSize(14).fillColor(BLACK).font("Helvetica-Bold").text(title, MARGIN + 12, y + 2);
  doc.fontSize(9).fillColor(GRAY).font("Helvetica").text(sheetNum, MARGIN + 12, y + 18);
}

function drawDisclaimer(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number) {
  doc.rect(x, y, w, 22).fill("#FEF3C7").stroke("#F59E0B").strokeColor("#F59E0B").lineWidth(1);
  doc.fontSize(8).fillColor("#92400E").font("Helvetica").text("⚠  " + text, x + 8, y + 6, { width: w - 16 });
}

// ─── SVG-style plan view drawn with PDFKit primitives ───────────────────────

function drawPlanView(doc: PDFKit.PDFDocument, dims: ReturnType<typeof getDrawingDimensions>, x: number, y: number, w: number, h: number) {
  const pad = { l: 60, r: 30, t: 40, b: 50 };
  const availW = w - pad.l - pad.r;
  const availH = h - pad.t - pad.b;
  // Uniform scale: fit drawing to available area while preserving aspect ratio
  const scale = Math.min(availW / dims.widthFt, availH / dims.depthFt);
  const dw = dims.widthFt * scale;
  const dh = dims.depthFt * scale;
  // Center the drawing within the available area
  const ox = x + pad.l + (availW - dw) / 2;
  const oy = y + pad.t + (availH - dh) / 2;
  const px = (ft: number) => ox + ft * scale;
  const py = (ft: number) => oy + ft * scale;

  // Drawing border
  doc.rect(ox, oy, dw, dh).fill(LIGHT_GRAY).stroke("#9CA3AF").strokeColor("#9CA3AF").lineWidth(1);

  // Building wall (top)
  doc.rect(ox, oy - 8, dw, 8).fill(BLACK);
  doc.fontSize(7).fillColor(BLACK).font("Helvetica-Bold")
    .text("BUILDING WALL — WALL-MOUNTED LEAN-TO — NO REAR POSTS", ox, oy - 18, { width: dw, align: "center" });

  // Slat lines
  const slatSpacingFt = dims.slatSpacingIn / 12;
  doc.strokeColor("#9CA3AF").lineWidth(0.8);
  for (let i = 0; i <= dims.slatCount; i++) {
    const d = Math.min(i * slatSpacingFt, dims.depthFt);
    doc.moveTo(px(0), py(d)).lineTo(px(dims.widthFt), py(d)).stroke();
  }

  // Lumon panels
  if (dims.glassFront) {
    doc.rect(px(0), py(dims.depthFt), dw, 5).fill("#BFDBFE").stroke(BLUE).strokeColor(BLUE).lineWidth(1);
    doc.fontSize(7).fillColor(BLUE).font("Helvetica").text("LUMIN GLASS — FRONT", px(0), py(dims.depthFt) + 7, { width: dw, align: "center" });
  }
  if (dims.glassLeft) doc.rect(px(0) - 5, py(0), 5, dh).fill("#BFDBFE").stroke(BLUE).strokeColor(BLUE).lineWidth(1);
  if (dims.glassRight) doc.rect(px(dims.widthFt), py(0), 5, dh).fill("#BFDBFE").stroke(BLUE).strokeColor(BLUE).lineWidth(1);

  // Front fascia beam
  doc.rect(px(0), py(dims.depthFt) + 5, dw, 6).fill(BLACK);

  // Posts
  const postPositions: number[] = [];
  if (dims.postCount <= 1) postPositions.push(dims.widthFt / 2);
  else for (let i = 0; i < dims.postCount; i++) postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));
  postPositions.forEach(ppx => {
    doc.rect(px(ppx) - 5, py(dims.depthFt) + 5, 10, 10).fill(BLACK).stroke(GOLD).strokeColor(GOLD).lineWidth(1);
  });

  // Dimension lines
  doc.strokeColor(GOLD).lineWidth(0.8);
  // Width
  const dimLineY = oy + dh + 18;
  doc.moveTo(px(0), dimLineY).lineTo(px(dims.widthFt), dimLineY).stroke();
  doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
    .text(`${ftToFtIn(dims.widthFt)} TOTAL WIDTH`, px(0), dimLineY + 4, { width: dw, align: "center" });
  // Depth
  doc.moveTo(ox - 20, py(0)).lineTo(ox - 20, py(dims.depthFt)).stroke();
  doc.save().translate(ox - 30, py(dims.depthFt / 2)).rotate(-90).fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
    .text(`${ftToFtIn(dims.depthFt)} DEPTH`, -20, 0).restore();

  // Label
  doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("ALUMINUM SLAT ROOF SYSTEM", px(0), py(dims.depthFt / 2) - 5, { width: dw, align: "center" });

  // North arrow
  doc.fontSize(18).fillColor(BLACK).font("Helvetica-Bold").text("↑", ox + dw - 24, oy + dh - 36);
  doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold").text("N", ox + dw - 20, oy + dh - 16);
}

function drawFrontElevation(doc: PDFKit.PDFDocument, dims: ReturnType<typeof getDrawingDimensions>, x: number, y: number, w: number, h: number) {
  const pad = { l: 55, r: 30, t: 30, b: 50 };
  const availW = w - pad.l - pad.r;
  const availH = h - pad.t - pad.b;
  // Uniform scale: fit drawing to available area while preserving aspect ratio
  const scale = Math.min(availW / dims.widthFt, availH / dims.heightFt);
  const dw = dims.widthFt * scale;
  const dh = dims.heightFt * scale;
  // Center the drawing within the available area
  const ox = x + pad.l + (availW - dw) / 2;
  const oy = y + pad.t + (availH - dh) / 2;
  const px = (ft: number) => ox + ft * scale;
  const py = (ft: number) => oy + dh - ft * scale;

  // Ground line
  doc.strokeColor("#374151").lineWidth(2).moveTo(px(0), py(0)).lineTo(px(dims.widthFt), py(0)).stroke();

  // Lumon glass overlay
  if (dims.glassFront) {
    doc.rect(px(0), py(dims.heightFt), dw, dh).fill("#BFDBFE").opacity(0.35);
    doc.opacity(1);
    doc.strokeColor(BLUE).lineWidth(1).rect(px(0), py(dims.heightFt), dw, dh).stroke();
    doc.fontSize(9).fillColor(BLUE).font("Helvetica").text("LUMIN GLASS VERTICAL ENCLOSURE", px(0), py(dims.heightFt * 0.4), { width: dw, align: "center" });
  }

  // Posts
  const postPositions: number[] = [];
  if (dims.postCount <= 1) postPositions.push(dims.widthFt / 2);
  else for (let i = 0; i < dims.postCount; i++) postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));
  postPositions.forEach(ppx => {
    doc.rect(px(ppx) - 5, py(dims.heightFt), 10, dh).fill(BLACK);
  });

  // Slats
  const slatH = dims.heightFt - 0.5;
  for (let i = 0; i < dims.slatCount; i++) {
    const fy = 0.5 + slatH * (i / (dims.slatCount - 1 || 1));
    doc.rect(px(0), py(fy) - 2, dw, 4).fill("#374151");
  }

  // Top fascia beam
  doc.rect(px(0), py(0.5), dw, scale * 0.5).fill(BLACK);

  // Dimension lines
  doc.strokeColor(GOLD).lineWidth(0.8);
  doc.moveTo(ox - 18, py(0)).lineTo(ox - 18, py(dims.heightFt)).stroke();
  doc.save().translate(ox - 28, py(dims.heightFt / 2)).rotate(-90).fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
    .text(`${ftToFtIn(dims.heightFt)} CLEAR HT.`, -20, 0).restore();
  const dimLineY = oy + dh + 18;
  doc.moveTo(px(0), dimLineY).lineTo(px(dims.widthFt), dimLineY).stroke();
  doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold").text(`${ftToFtIn(dims.widthFt)} TOTAL WIDTH`, px(0), dimLineY + 4, { width: dw, align: "center" });

  doc.fontSize(7.5).fillColor(GRAY).font("Helvetica").text("NO REAR POSTS — WALL-MOUNTED CONNECTION TO BUILDING", px(0), py(0) + 6, { width: dw, align: "center" });
}

function drawSideElevation(doc: PDFKit.PDFDocument, dims: ReturnType<typeof getDrawingDimensions>, x: number, y: number, w: number, h: number) {
  const pad = { l: 55, r: 50, t: 30, b: 50 };
  const availW = w - pad.l - pad.r;
  const availH = h - pad.t - pad.b;
  // Uniform scale: fit drawing to available area while preserving aspect ratio
  const scale = Math.min(availW / dims.depthFt, availH / dims.heightFt);
  const dw = dims.depthFt * scale;
  const dh = dims.heightFt * scale;
  // Center the drawing within the available area
  const ox = x + pad.l + (availW - dw) / 2;
  const oy = y + pad.t + (availH - dh) / 2;
  const px = (ft: number) => ox + ft * scale;
  const py = (ft: number) => oy + dh - ft * scale;

  // Ground line
  doc.strokeColor("#374151").lineWidth(2).moveTo(px(0), py(0)).lineTo(px(dims.depthFt), py(0)).stroke();

  // Building wall (left)
  doc.rect(px(0) - 12, py(dims.heightFt), 12, dh).fill(BLACK);
  doc.save().translate(px(0) - 6, py(dims.heightFt / 2)).rotate(-90).fontSize(7).fillColor("white").font("Helvetica-Bold").text("BUILDING WALL", -20, 0).restore();

  // Glass on far side
  if (dims.glassLeft) doc.rect(px(dims.depthFt), py(dims.heightFt), 5, dh).fill("#BFDBFE").stroke(BLUE).strokeColor(BLUE).lineWidth(1);

  // Slats (vertical lines in side view)
  const slatSpacingFt = dims.slatSpacingIn / 12;
  for (let i = 0; i < dims.slatCount; i++) {
    const d = i * slatSpacingFt;
    if (d <= dims.depthFt) {
      doc.rect(px(d) - 2, py(dims.heightFt), 4, dh - scale * 0.5).fill("#374151");
    }
  }

  // Top ledger/fascia
  doc.rect(px(0), py(dims.heightFt), dw, scale * 0.5).fill(BLACK);
  // Front post
  doc.rect(px(dims.depthFt) - 5, py(dims.heightFt), 10, dh).fill(BLACK);
  // Gold fascia beam cap
  doc.rect(px(dims.depthFt) - 7, py(dims.heightFt), 14, scale * 0.5).fill(GOLD);

  // Labels
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("WALL LEDGER — BOLTED TO BUILDING", px(0) + 2, py(dims.heightFt) - 12);
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("FASCIA BEAM", px(dims.depthFt) - 5, py(dims.heightFt) - 12, { align: "right", width: 80 });

  // Dimension lines
  doc.strokeColor(GOLD).lineWidth(0.8);
  const dimLineY = oy + dh + 18;
  doc.moveTo(px(0), dimLineY).lineTo(px(dims.depthFt), dimLineY).stroke();
  doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold").text(`${ftToFtIn(dims.depthFt)} DEPTH`, px(0), dimLineY + 4, { width: dw, align: "center" });
  doc.moveTo(px(dims.depthFt) + 18, py(0)).lineTo(px(dims.depthFt) + 18, py(dims.heightFt)).stroke();
  doc.save().translate(px(dims.depthFt) + 28, py(dims.heightFt / 2)).rotate(90).fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
    .text(`${ftToFtIn(dims.heightFt)} CLEAR HT.`, -20, 0).restore();
}

function drawSection(doc: PDFKit.PDFDocument, dims: ReturnType<typeof getDrawingDimensions>, x: number, y: number, w: number, h: number) {
  const pad = { l: 60, r: 60, t: 30, b: 50 };
  const availW = w - pad.l - pad.r;
  const availH = h - pad.t - pad.b;
  // Uniform scale: fit drawing to available area while preserving aspect ratio
  const scale = Math.min(availW / dims.depthFt, availH / dims.heightFt);
  const dw = dims.depthFt * scale;
  const dh = dims.heightFt * scale;
  // Center the drawing within the available area
  const ox = x + pad.l + (availW - dw) / 2;
  const oy = y + pad.t + (availH - dh) / 2;
  const px = (ft: number) => ox + ft * scale;
  const py = (ft: number) => oy + dh - ft * scale;

  // Ground line
  doc.strokeColor("#374151").lineWidth(2).moveTo(px(0), py(0)).lineTo(px(dims.depthFt), py(0)).stroke();

  // Building wall
  doc.rect(px(0) - 12, py(dims.heightFt), 12, dh).fill(BLACK);
  doc.save().translate(px(0) - 6, py(dims.heightFt / 2)).rotate(-90).fontSize(7).fillColor("white").font("Helvetica-Bold").text("BUILDING WALL", -20, 0).restore();

  // Glass on far side
  if (dims.glassFront) doc.rect(px(dims.depthFt), py(dims.heightFt), 6, dh).fill("#BFDBFE").stroke(BLUE).strokeColor(BLUE).lineWidth(1);

  // Slats
  const slatSpacingFt = dims.slatSpacingIn / 12;
  for (let i = 0; i < dims.slatCount; i++) {
    const d = i * slatSpacingFt;
    if (d <= dims.depthFt) doc.rect(px(d) - 2, py(dims.heightFt), 4, dh - scale * 0.5).fill("#374151");
  }

  // Top ledger/fascia
  doc.rect(px(0), py(dims.heightFt), dw, scale * 0.5).fill(BLACK);
  // Front post
  doc.rect(px(dims.depthFt) - 5, py(dims.heightFt), 10, dh).fill(BLACK);
  // Gold fascia beam cap
  doc.rect(px(dims.depthFt) - 7, py(dims.heightFt), 14, scale * 0.5).fill(GOLD);

  // Callout labels
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("① WALL LEDGER", px(0) + 2, py(dims.heightFt) - 12);
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("② FASCIA BEAM", px(dims.depthFt) - 5, py(dims.heightFt) - 12, { align: "right", width: 80 });
  doc.fontSize(7.5).fillColor("#374151").font("Helvetica").text("③ FRONT POST", px(dims.depthFt) - 5, py(0) - 12, { align: "right", width: 80 });
  doc.fontSize(8).fillColor(GRAY).font("Helvetica").text("④ SLAT ROOF SYSTEM", px(dims.depthFt / 2) - 50, py(dims.heightFt / 2) - 5);
  if (dims.glassFront) {
    doc.fontSize(7.5).fillColor(BLUE).font("Helvetica").text("⑤ LUMIN GLASS", px(dims.depthFt) + 8, py(dims.heightFt / 2) - 5);
    doc.fontSize(7.5).fillColor(BLUE).font("Helvetica").text("⑥ GLASS TOP RAIL", px(dims.depthFt) + 8, py(dims.heightFt / 2) + 8);
  }

  // Dimension lines
  doc.strokeColor(GOLD).lineWidth(0.8);
  const dimLineY = oy + dh + 18;
  doc.moveTo(px(0), dimLineY).lineTo(px(dims.depthFt), dimLineY).stroke();
  doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold").text(`${ftToFtIn(dims.depthFt)} DEPTH`, px(0), dimLineY + 4, { width: dw, align: "center" });
  doc.moveTo(ox - 30, py(0)).lineTo(ox - 30, py(dims.heightFt)).stroke();
  doc.save().translate(ox - 42, py(dims.heightFt / 2)).rotate(-90).fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
    .text(`${ftToFtIn(dims.heightFt)} CLEAR HT.`, -20, 0).restore();
}

// ─── Table helpers ───────────────────────────────────────────────────────────

function drawTableHeader(doc: PDFKit.PDFDocument, cols: { label: string; x: number; w: number; align?: string }[], y: number, rowH = 18) {
  doc.rect(MARGIN, y, PW - MARGIN * 2, rowH).fill(BLACK);
  cols.forEach(col => {
    doc.fontSize(8).fillColor("white").font("Helvetica-Bold")
      .text(col.label, col.x, y + 5, { width: col.w, align: (col.align as any) || "left", lineBreak: false });
  });
  return y + rowH;
}

function drawTableRow(doc: PDFKit.PDFDocument, cells: { text: string; x: number; w: number; align?: string; color?: string; bold?: boolean }[], y: number, rowH = 16, bg?: string) {
  if (bg) doc.rect(MARGIN, y, PW - MARGIN * 2, rowH).fill(bg);
  doc.rect(MARGIN, y, PW - MARGIN * 2, rowH).stroke("#F3F4F6").strokeColor("#F3F4F6").lineWidth(0.5);
  cells.forEach(cell => {
    doc.fontSize(8.5)
      .fillColor(cell.color || BLACK)
      .font(cell.bold ? "Helvetica-Bold" : "Helvetica")
      .text(cell.text, cell.x, y + 4, { width: cell.w, align: (cell.align as any) || "left", lineBreak: false });
  });
  return y + rowH;
}

// ─── Image download helper ────────────────────────────────────────────────────

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ─── Renderings page helper ─────────────────────────────────────────────────

async function drawRenderingsPage(
  doc: PDFKit.PDFDocument,
  projectName: string,
  renderings: Array<{ imageUrl: string; label?: string | null; style: string }>
) {
  if (!renderings.length) return;

  doc.addPage();
  drawPageHeader(doc, projectName, "Sheet R — AI Renderings");
  drawPageFooter(doc);

  const contentTop = 62;
  drawSectionTitle(doc, "AI Visual Renderings", "SHEET R", contentTop + 6);

  // Disclaimer
  doc.fontSize(7.5).fillColor(GRAY).font("Helvetica").text(
    "AI-generated concept images for visualisation purposes only. Not for construction or regulatory submission.",
    MARGIN, contentTop + 34, { width: PW - MARGIN * 2 }
  );

  // Layout: up to 4 images in a 2×2 grid
  const gridTop = contentTop + 58;
  const gridBottom = PH - 40; // above footer
  const gridH = gridBottom - gridTop;
  const cellW = (PW - MARGIN * 2 - 12) / 2;
  const cellH = (gridH - 12) / 2;
  const imgPad = 6;

  const positions = [
    { x: MARGIN, y: gridTop },
    { x: MARGIN + cellW + 12, y: gridTop },
    { x: MARGIN, y: gridTop + cellH + 12 },
    { x: MARGIN + cellW + 12, y: gridTop + cellH + 12 },
  ];

  const toRender = renderings.slice(0, 4);

  await Promise.all(toRender.map(async (r, i) => {
    const pos = positions[i];
    // Draw cell background
    doc.rect(pos.x, pos.y, cellW, cellH).fill("#111111");

    try {
      const imgBuf = await fetchImageBuffer(r.imageUrl);
      // Fit image within cell with padding
      doc.image(imgBuf, pos.x + imgPad, pos.y + imgPad, {
        width: cellW - imgPad * 2,
        height: cellH - imgPad * 2 - 18,
        fit: [cellW - imgPad * 2, cellH - imgPad * 2 - 18],
        align: "center",
        valign: "center",
      });
    } catch {
      // If image fails to load, show placeholder text
      doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("Image unavailable", pos.x + imgPad, pos.y + cellH / 2 - 6, { width: cellW - imgPad * 2, align: "center" });
    }

    // Label bar at bottom of cell
    const labelY = pos.y + cellH - 18;
    doc.rect(pos.x, labelY, cellW, 18).fill(BLACK);
    doc.rect(pos.x, labelY, 3, 18).fill(GOLD);
    const label = r.label ?? r.style.charAt(0).toUpperCase() + r.style.slice(1);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text(label, pos.x + 8, labelY + 5, { width: cellW - 12 });
  }));
}

// ─── Scoped PDF generator for Canopy and Enclosure ────────────────────────────

async function handleScopedPDFExport(
  _req: Request,
  res: Response,
  project: Awaited<ReturnType<typeof getProjectById>>,
  scope: "canopy" | "enclosure" | "fencing"
) {
  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const savedInputs = (project?.inputsJson as Record<string, unknown>) ?? {};
  const scopeLabel = scope === "canopy" ? "CANOPY" : scope === "fencing" ? "FENCING" : "ENCLOSURE";
  const projectName = project?.projectName ?? "Untitled";
  const rateOverrides = await getRateOverrides(project?.id ?? 0);
  const projectRenderings = await getRenderingsByProject(project?.id ?? 0);
  // Load QTO line overrides (user-edited quantities/units/descriptions)
  const rawLineOverrides = await getQTOLineOverrides(project?.id ?? 0);
  const lineOverrideMap: Record<string, { qty?: number; unit?: string; desc?: string }> = {};
  for (const o of rawLineOverrides) {
    lineOverrideMap[o.lineKey] = {
      qty: o.customQuantity ? parseFloat(o.customQuantity) : undefined,
      unit: o.customUnit ?? undefined,
      desc: o.customDescription ?? undefined,
    };
  }
  function applyLineOverrides(items: QTOItem[]): QTOItem[] {
    return items.map(item => {
      const key = item.lineKey ?? item.description;
      const ov = lineOverrideMap[key];
      if (!ov) return item;
      const qty = ov.qty ?? item.qty;
      const unit = ov.unit ?? item.unit;
      const desc = ov.desc ?? item.description;
      return { ...item, description: desc, qty, unit, lineTotal: qty * item.unitRate };
    });
  }

  // ── COVER PAGE ──
  doc.addPage();
  doc.rect(0, 0, PW, PH).fill(BLACK);
  doc.rect(0, 0, PW, 52).fill(BLACK);
  doc.rect(0, 52, PW, 3).fill(GOLD);
  doc.circle(30, 26, 18).stroke(GOLD).strokeColor(GOLD).lineWidth(2);
  doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("EE", 22, 20);
  doc.fontSize(13).fillColor("white").font("Helvetica-Bold").text("Eagle Eye Management Services", 56, 12);
  doc.fontSize(8).fillColor(GOLD).font("Helvetica").text(`${scopeLabel} ESTIMATING PACKAGE`, 56, 30);
  const cx = PW / 2;
  doc.circle(cx, 160, 44).stroke(GOLD).strokeColor(GOLD).lineWidth(3);
  doc.fontSize(22).fillColor(GOLD).font("Helvetica-Bold").text("EE", cx - 14, 146);
  doc.fontSize(22).fillColor("white").font("Helvetica-Bold").text("Eagle Eye Management Services", 0, 220, { align: "center", width: PW });
  doc.fontSize(10).fillColor(GOLD).font("Helvetica").text(`${scopeLabel} CONCEPT PACKAGE`, 0, 248, { align: "center", width: PW });
  doc.rect(cx - 36, 268, 72, 2).fill(GOLD);
  doc.fontSize(18).fillColor("white").font("Helvetica-Bold").text(projectName, 0, 280, { align: "center", width: PW });
  if (project?.clientName) doc.fontSize(11).fillColor(GRAY).font("Helvetica").text(project.clientName, 0, 304, { align: "center", width: PW });
  if (project?.location) doc.fontSize(11).fillColor(GRAY).font("Helvetica").text(project.location, 0, 320, { align: "center", width: PW });

  // ── QTO PAGE ──
  doc.addPage();
  drawPageHeader(doc, projectName, "Sheet A — QTO");
  drawPageFooter(doc);
  const contentTop = 62;
  drawSectionTitle(doc, "Preliminary Quantity Takeoff", "SHEET A", contentTop + 6);
  drawDisclaimer(doc, "All quantities and costs are preliminary estimates only (CAD). Subject to field verification and licensed structural review.",
    MARGIN, contentTop + 34, PW - MARGIN * 2);

  let qtoItems: QTOItem[];
  let grandTotal: number;
  if (scope === "canopy") {
    const p = { ...DEFAULT_CANOPY_PARAMS, ...savedInputs };
    qtoItems = applyLineOverrides(calculateCanopyQTO(p, rateOverrides) as QTOItem[]);
    grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
  } else if (scope === "fencing") {
    const p = { ...DEFAULT_FENCING_PARAMS, ...savedInputs };
    const fencingItems = calculateFencingQTO(p, rateOverrides);
    // FencingQTOItem uses `group` instead of `category` — remap for PDF rendering
    qtoItems = applyLineOverrides(fencingItems.map(i => ({ ...i, category: i.group })) as QTOItem[]);
    grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
  } else {
    const p = { ...DEFAULT_ENCLOSURE_PARAMS, ...savedInputs };
    qtoItems = applyLineOverrides(calculateEnclosureQTO(p, rateOverrides) as QTOItem[]);
    grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
  }

  const qtoCategories = Array.from(new Set(qtoItems.map((i: QTOItem) => i.category)));
  const colW = { desc: 420, unit: 60, qty: 60, rate: 100, total: 110 };
  const colX = {
    desc: MARGIN + 2,
    unit: MARGIN + colW.desc + 2,
    qty: MARGIN + colW.desc + colW.unit + 2,
    rate: MARGIN + colW.desc + colW.unit + colW.qty + 2,
    total: MARGIN + colW.desc + colW.unit + colW.qty + colW.rate + 2,
  };
  let qtoY = contentTop + 62;
  qtoCategories.forEach(cat => {
    doc.rect(MARGIN, qtoY, PW - MARGIN * 2, 18).fill(LIGHT_GRAY);
    doc.rect(MARGIN, qtoY, 3, 18).fill(GOLD);
    doc.fontSize(9).fillColor("#374151").font("Helvetica-Bold").text(cat, MARGIN + 8, qtoY + 5);
    qtoY += 18;
    qtoY = drawTableHeader(doc, [
      { label: "Description", x: colX.desc, w: colW.desc },
      { label: "Unit", x: colX.unit, w: colW.unit, align: "center" },
      { label: "Qty", x: colX.qty, w: colW.qty, align: "center" },
      { label: "Unit Rate (CAD)", x: colX.rate, w: colW.rate, align: "right" },
      { label: "Line Total", x: colX.total, w: colW.total, align: "right" },
    ], qtoY, 16);
    qtoItems.filter((i: QTOItem) => i.category === cat).forEach((item: QTOItem, idx: number) => {
      qtoY = drawTableRow(doc, [
        { text: item.description, x: colX.desc, w: colW.desc },
        { text: item.unit, x: colX.unit, w: colW.unit, align: "center", color: GRAY },
        { text: String(item.qty), x: colX.qty, w: colW.qty, align: "center", color: GOLD, bold: true },
        { text: `$${item.unitRate.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, x: colX.rate, w: colW.rate, align: "right" },
        { text: `$${item.lineTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, x: colX.total, w: colW.total, align: "right", bold: true },
      ], qtoY, 16, idx % 2 === 1 ? LIGHT_GRAY : undefined);
    });
    qtoY += 4;
  });
  const gtBoxW = 280;
  const gtBoxX = PW - MARGIN - gtBoxW;
  const gtBoxY = qtoY + 8;
  doc.rect(gtBoxX, gtBoxY, gtBoxW, 56).fill(BLACK);
  doc.fontSize(7.5).fillColor(GOLD).font("Helvetica").text("PRELIMINARY BUDGET ESTIMATE (CAD)", gtBoxX + 12, gtBoxY + 10);
  doc.fontSize(22).fillColor("white").font("Helvetica-Bold").text(`$${grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, gtBoxX + 12, gtBoxY + 24);

  // ── FENCING: native PDFKit builder (replaces SVG pipeline) ──────────────
  if (scope === "fencing") {
    // End the current doc — fencing uses its own standalone PDF builder
    doc.end();
    // Drain the current doc so the promise resolves (we won't use this buffer)
    await pdfReady.catch(() => {});

    const fp = { ...DEFAULT_FENCING_PARAMS, ...(savedInputs as Record<string, unknown>) };
    const fencingQtoItems = calculateFencingQTO(fp as Parameters<typeof calculateFencingQTO>[0], rateOverrides);
    const refPhotos = await getReferencePhotosByProject(project?.id ?? 0);
    const referencePhotoUrl = refPhotos.length > 0 ? refPhotos[0].imageUrl : undefined;
    const aiRenderingUrl = projectRenderings.length > 0 ? projectRenderings[0].imageUrl : undefined;

    const fencingPdfBuf = await buildFencingPDF({
      params: fp as Parameters<typeof calculateFencingQTO>[0],
      projectName,
      clientName: project?.clientName ?? "",
      location: project?.location ?? "",
      qtoItems: fencingQtoItems,
      referencePhotoUrl,
      aiRenderingUrl,
    });

    const filename2 = `${projectName.replace(/[^a-z0-9]/gi, "_")}_fencing_package.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename2}"`);
    res.setHeader("Content-Length", fencingPdfBuf.length);
    res.send(fencingPdfBuf);
    return;
  }

  // ── RENDERINGS PAGE (if any exist) ──
  await drawRenderingsPage(doc, projectName, projectRenderings);

  doc.end();
  const pdfBuffer = await pdfReady;
  const filename = `${projectName.replace(/[^a-z0-9]/gi, "_")}_${scope}_package.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);
}

// ─── Main export handler ─────────────────────────────────────────────────────

export async function handlePDFExport(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Dispatch to scope-specific generator for canopy and enclosure
    const scope = project.scopeType ?? "pergola";
    if (scope === "canopy" || scope === "enclosure" || scope === "fencing") {
      return handleScopedPDFExport(req, res, project, scope);
    }

    const params = await getProjectParams(projectId);
    const checklist = await getChecklistItems(projectId);
    const scopeItems = await getScopeItems(projectId);
    const pergolaRenderings = await getRenderingsByProject(projectId);

    const pergolaParams: PergolaParams = {
      widthFt: parseFloat(params?.widthFt ?? "58") || 58,
      depthFt: parseFloat(params?.depthFt ?? "15.67") || 15.67,
      heightFt: parseFloat(params?.heightFt ?? "10") || 10,
      postCount: params?.postCount ?? 5,
      postSpacingFt: parseFloat(params?.postSpacingFt ?? "14.5") || 14.5,
      slatType: (params?.slatType as "fixed" | "operable") ?? "fixed",
      slatSpacingIn: parseFloat(params?.slatSpacingIn ?? "4") || 4,
      glassFront: params?.glassFront ?? true,
      glassLeft: params?.glassLeft ?? true,
      glassRight: params?.glassRight ?? true,
      finishColor: params?.finishColor ?? "Matte Black",
      ledLighting: params?.ledLighting ?? true,
    };

    const dims = getDrawingDimensions(pergolaParams);
    const savedRateOverrides = await getRateOverrides(projectId);
    const savedLabourRates = await getLabourRates(projectId);
    const lumonPricingRow = await getLumonPricing(projectId);
    const quoteSetting = await getQuoteSettings(projectId);
    const pergolaLineOverrides = await getQTOLineOverrides(projectId);

    // Title block shared context
    const today = new Date().toLocaleDateString("en-CA");
    const tbBase: Omit<TitleBlockOpts, "drawingTitle" | "sheetNum"> = {
      projectName: project.projectName,
      location: project.location ?? "",
      clientName: project.clientName ?? "",
      totalSheets: "G",
      scale: "NTS",
      date: today,
      status: "CONCEPT SET",
    };
    const pergolaLineOverrideMap: Record<string, { qty?: number; unit?: string; desc?: string }> = {};
    for (const o of pergolaLineOverrides) {
      pergolaLineOverrideMap[o.lineKey] = {
        qty: o.customQuantity ? parseFloat(o.customQuantity) : undefined,
        unit: o.customUnit ?? undefined,
        desc: o.customDescription ?? undefined,
      };
    }
    const rawQtoItems = calculateQTO(pergolaParams, savedRateOverrides) as QTOItem[];
    const qtoItems = rawQtoItems.map(item => {
      const key = item.lineKey ?? item.description;
      const ov = pergolaLineOverrideMap[key];
      if (!ov) return item;
      const qty = ov.qty ?? item.qty;
      const unit = ov.unit ?? item.unit;
      const desc = ov.desc ?? item.description;
      return { ...item, description: desc, qty, unit, lineTotal: qty * item.unitRate };
    });
    const qtoCategories = Array.from(new Set(qtoItems.map(i => i.category)));
    const grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
    const checklistCategories = Array.from(new Set(checklist.map(c => c.category)));

    // Create PDF document
    const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    // ── PAGE 1: COVER ──────────────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, PW, PH).fill(BLACK);

    // Header
    doc.rect(0, 0, PW, 52).fill(BLACK);
    doc.rect(0, 52, PW, 3).fill(GOLD);
    doc.circle(30, 26, 18).stroke(GOLD).strokeColor(GOLD).lineWidth(2);
    doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("EE", 22, 20);
    doc.fontSize(13).fillColor("white").font("Helvetica-Bold").text("Eagle Eye Management Services", 56, 12);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("PERGOLA ESTIMATING PLATFORM", 56, 30);

    // Center content
    const cx = PW / 2;
    // Logo circle
    doc.circle(cx, 160, 44).stroke(GOLD).strokeColor(GOLD).lineWidth(3);
    doc.fontSize(22).fillColor(GOLD).font("Helvetica-Bold").text("EE", cx - 14, 146);

    doc.fontSize(22).fillColor("white").font("Helvetica-Bold").text("Eagle Eye Management Services", 0, 220, { align: "center", width: PW });
    doc.fontSize(10).fillColor(GOLD).font("Helvetica").text("PRE-FABRICATION CONCEPT PACKAGE", 0, 248, { align: "center", width: PW });

    // Gold divider
    doc.rect(cx - 36, 268, 72, 2).fill(GOLD);

    // Project name
    doc.fontSize(18).fillColor("white").font("Helvetica-Bold").text(project.projectName, 0, 280, { align: "center", width: PW });
    if (project.clientName) doc.fontSize(11).fillColor(GRAY).font("Helvetica").text(project.clientName, 0, 304, { align: "center", width: PW });
    if (project.location) doc.fontSize(11).fillColor(GRAY).font("Helvetica").text(project.location, 0, 320, { align: "center", width: PW });

    // Info grid (2x4)
    const glassSides = [
      pergolaParams.glassFront ? "Front" : null,
      pergolaParams.glassLeft ? "Left" : null,
      pergolaParams.glassRight ? "Right" : null,
    ].filter(Boolean).join(", ") || "None";
    const infoItems = [
      ["WIDTH", ftToFtIn(pergolaParams.widthFt)],
      ["DEPTH", ftToFtIn(pergolaParams.depthFt)],
      ["CLEAR HEIGHT", ftToFtIn(pergolaParams.heightFt)],
      ["FRONT POSTS", `${pergolaParams.postCount} EA @ ${ftToFtIn(pergolaParams.postSpacingFt)} c/c`],
      ["SLAT SYSTEM", pergolaParams.slatType === "fixed" ? `Fixed Slats @ ${pergolaParams.slatSpacingIn}"` : `Operable Louvers @ ${pergolaParams.slatSpacingIn}"`],
      ["LUMON FACES", glassSides],
      ["FINISH", pergolaParams.finishColor],
      ["STATUS", project.status.replace("_", " ").toUpperCase()],
    ];
    const gridX = cx - 220;
    const gridW = 200;
    const gridGap = 10;
    infoItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = gridX + col * (gridW + gridGap);
      const iy = 346 + row * 52;
      doc.rect(ix, iy, gridW, 44).stroke("#2A2A2A").strokeColor("#2A2A2A").lineWidth(1);
      doc.fontSize(7).fillColor(GOLD).font("Helvetica").text(item[0], ix + 10, iy + 8);
      doc.fontSize(10).fillColor(i === 7 ? GOLD : "white").font("Helvetica-Bold").text(item[1], ix + 10, iy + 22);
    });

    // Project summary
    if (project.notes) {
      const summaryY = 570;
      const summaryW = 560;
      const summaryX = cx - summaryW / 2;
      doc.rect(summaryX, summaryY, summaryW, 18).fill("#1A1A1A");
      doc.rect(summaryX, summaryY + 18, summaryW, 1).fill(GOLD);
      doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold").text("PROJECT SUMMARY", summaryX + 10, summaryY + 5);
      const summaryText = project.notes.slice(0, 600);
      doc.rect(summaryX, summaryY + 19, summaryW, 90).fill("#0A0A0A");
      doc.fontSize(8.5).fillColor("#D1D5DB").font("Helvetica").text(summaryText, summaryX + 10, summaryY + 26, { width: summaryW - 20, height: 78 });
    }

    // Disclaimer footer
    const disclaimerY = PH - 60;
    doc.rect(0, disclaimerY - 1, PW, 1).fill("#2A2A2A");
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
      .text("Concept Only — Not For Construction — Not Engineered — Subject to Field Verification", 0, disclaimerY + 6, { align: "center", width: PW });
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
      .text(`Prepared by: Ranaldo Daniels  |  Eagle Eye Management Services  |  ${new Date().toLocaleDateString("en-CA")}`, 0, disclaimerY + 20, { align: "center", width: PW });

    // ── PAGE 2: PLAN VIEW ──────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet 03 of G");
    drawPageFooter(doc);
    const contentTop = 62;
    const contentH = PH - 62 - 28;
    const DRAW_W = PW - MARGIN * 2 - TB_WIDTH - 4;  // drawing area width with title block
    drawSectionTitle(doc, "Plan View — Roof Level", "SHEET 03", contentTop + 6);
    drawTitleBlock(doc, { ...tbBase, drawingTitle: "Plan View — Roof Level", sheetNum: "03" });
    // Drawing box — size to drawing's natural aspect ratio (width:depth)
    const planPad = { l: 60, r: 30, t: 40, b: 50 };
    const planInnerW = DRAW_W - planPad.l - planPad.r;
    const planScale = planInnerW / dims.widthFt;
    const planDrawH = dims.depthFt * planScale;
    const drawBoxH = Math.min(planDrawH + planPad.t + planPad.b + 18 + 8, contentH - 30);
    const planCenterOffset = Math.max(0, Math.floor((contentH - 36 - drawBoxH - 20) / 2));
    const drawBoxY = contentTop + 36 + planCenterOffset;
    doc.rect(MARGIN, drawBoxY, DRAW_W, 18).fill(BLACK);
    doc.fontSize(9).fillColor("white").font("Helvetica-Bold").text("Plan View — Aluminum Slat Roof System", MARGIN + 8, drawBoxY + 5);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("Scale: NTS | All dims in feet-inches", MARGIN + 8, drawBoxY + 5, { align: "right", width: DRAW_W - 16 });
    doc.rect(MARGIN, drawBoxY + 18, DRAW_W, drawBoxH - 18).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(1);
    drawPlanView(doc, dims, MARGIN, drawBoxY + 18, DRAW_W, drawBoxH - 18);
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
      .text(`Wall-mounted lean-to — ${params?.postCount ?? 5} front posts @ ${ftToFtIn(pergolaParams.postSpacingFt)} c/c — Lumon on: ${glassSides} — ${pergolaParams.slatType === "fixed" ? "Fixed slats" : "Operable louvers"} @ ${pergolaParams.slatSpacingIn}"`,
        MARGIN, drawBoxY + drawBoxH + 4, { width: DRAW_W, lineBreak: false });

    // ── PAGE 3: FRONT + SIDE ELEVATION ────────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheets 04–05 of G");
    drawPageFooter(doc);
    drawTitleBlock(doc, { ...tbBase, drawingTitle: "Front & Side Elevations", sheetNum: "04-05" });
    const halfW = (DRAW_W - 12) / 2;
    const elevY = contentTop + 6;
    const elevH = contentH - 10;

    const elevPad = { l: 55, r: 30, t: 30, b: 50 };
    const feInnerW = halfW - elevPad.l - elevPad.r;
    const feScale = Math.min(feInnerW / dims.widthFt, (elevH - 28 - elevPad.t - elevPad.b) / dims.heightFt);
    const feDrawH = dims.heightFt * feScale;
    const feBoxH = Math.min(feDrawH + elevPad.t + elevPad.b + 18 + 8, elevH - 28);

    const sePad = { l: 55, r: 50, t: 30, b: 50 };
    const seInnerW = halfW - sePad.l - sePad.r;
    const seScale = Math.min(seInnerW / dims.depthFt, (elevH - 28 - sePad.t - sePad.b) / dims.heightFt);
    const seDrawH = dims.heightFt * seScale;
    const seBoxH = Math.min(seDrawH + sePad.t + sePad.b + 18 + 8, elevH - 28);
    const combinedBoxH = Math.max(feBoxH, seBoxH);
    const elevCenterOffset = Math.max(0, Math.floor((elevH - 28 - combinedBoxH) / 2));

    // Front elevation
    drawSectionTitle(doc, "Front Elevation", "SHEET 04", elevY);
    const feBoxY = elevY + 28 + elevCenterOffset;
    doc.rect(MARGIN, feBoxY, halfW, 18).fill(BLACK);
    doc.fontSize(9).fillColor("white").font("Helvetica-Bold").text("Front Elevation", MARGIN + 8, feBoxY + 5);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("NTS", MARGIN + 8, feBoxY + 5, { align: "right", width: halfW - 16 });
    doc.rect(MARGIN, feBoxY + 18, halfW, feBoxH - 18).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(1);
    drawFrontElevation(doc, dims, MARGIN, feBoxY + 18, halfW, feBoxH - 18);

    // Side elevation
    const seX = MARGIN + halfW + 12;
    doc.rect(seX, elevY, 4, 22).fill(GOLD);
    doc.fontSize(14).fillColor(BLACK).font("Helvetica-Bold").text("Side Elevation", seX + 12, elevY + 2);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("SHEET 05", seX + 12, elevY + 18);
    doc.rect(seX, feBoxY, halfW, 18).fill(BLACK);
    doc.fontSize(9).fillColor("white").font("Helvetica-Bold").text("Side Elevation", seX + 8, feBoxY + 5);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("NTS", seX + 8, feBoxY + 5, { align: "right", width: halfW - 16 });
    doc.rect(seX, feBoxY + 18, halfW, seBoxH - 18).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(1);
    drawSideElevation(doc, dims, seX, feBoxY + 18, halfW, seBoxH - 18);

    // ── PAGE 4: SECTION A-A ────────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet 06 of G");
    drawPageFooter(doc);
    drawSectionTitle(doc, "Section A–A", "SHEET 06", contentTop + 6);
    drawTitleBlock(doc, { ...tbBase, drawingTitle: "Section A–A Through Structure", sheetNum: "06" });
    const secPad = { l: 60, r: 60, t: 30, b: 50 };
    const secInnerW = DRAW_W - secPad.l - secPad.r;
    const secScale = Math.min(secInnerW / dims.depthFt, (contentH - 80 - secPad.t - secPad.b) / dims.heightFt);
    const secDrawH = dims.heightFt * secScale;
    const secBoxH = Math.min(secDrawH + secPad.t + secPad.b + 18 + 8, contentH - 80);
    // Vertically center the section box (leave room for legend below)
    const legendH = 2 * 26 + 8; // 2 rows of legend items
    const secAvailH = contentH - 36 - legendH - 20;
    const secCenterOffset = Math.max(0, Math.floor((secAvailH - secBoxH) / 2));
    const secBoxY = contentTop + 36 + secCenterOffset;
    doc.rect(MARGIN, secBoxY, DRAW_W, 18).fill(BLACK);
    doc.fontSize(9).fillColor("white").font("Helvetica-Bold").text("Section A–A — Through Pergola Structure", MARGIN + 8, secBoxY + 5);
    doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("Scale: NTS", MARGIN + 8, secBoxY + 5, { align: "right", width: DRAW_W - 16 });
    doc.rect(MARGIN, secBoxY + 18, DRAW_W, secBoxH - 18).fill("white").stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(1);
    drawSection(doc, dims, MARGIN, secBoxY + 18, DRAW_W, secBoxH - 18);

    // Legend boxes
    const legendItems = [
      { text: "① Wall ledger bolted to building — no rear posts", bg: "#FFFBEB", border: "#F59E0B" },
      { text: "② Front fascia beam (150×75 AL. RHS)", bg: "#FFFBEB", border: "#F59E0B" },
      { text: "③ Front post (100×100 AL. SHS)", bg: LIGHT_GRAY, border: "#E5E7EB" },
      { text: "④ Aluminum slat system", bg: LIGHT_GRAY, border: "#E5E7EB" },
      { text: "⑤ Lumon vertical enclosure", bg: "#EFF6FF", border: "#93C5FD" },
      { text: "⑥ Glass top rail → fascia beam (integrated)", bg: "#EFF6FF", border: "#93C5FD" },
    ];
    const legW = (DRAW_W - 20) / 3;
    legendItems.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const lx = MARGIN + col * (legW + 10);
      const ly = secBoxY + secBoxH + 8 + row * 26;
      doc.rect(lx, ly, legW, 22).fill(item.bg).stroke(item.border).strokeColor(item.border).lineWidth(1);
      doc.fontSize(8).fillColor("#374151").font("Helvetica").text(item.text, lx + 6, ly + 6, { width: legW - 12 });
    });

    // ── PAGE 5: QTO ────────────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet A — Quantity Takeoff");
    drawPageFooter(doc);
    drawSectionTitle(doc, "Preliminary Quantity Takeoff", "SHEET A", contentTop + 6);
    drawDisclaimer(doc, "All quantities and costs are preliminary estimates only (CAD). Subject to field verification, supplier quotes, and licensed structural review prior to fabrication.",
      MARGIN, contentTop + 34, PW - MARGIN * 2);

    // QTO table
    const colW = { desc: 420, unit: 60, qty: 60, rate: 100, total: 110 };
    const colX = {
      desc: MARGIN + 2,
      unit: MARGIN + colW.desc + 2,
      qty: MARGIN + colW.desc + colW.unit + 2,
      rate: MARGIN + colW.desc + colW.unit + colW.qty + 2,
      total: MARGIN + colW.desc + colW.unit + colW.qty + colW.rate + 2,
    };

    let qtoY = contentTop + 62;
    qtoCategories.forEach(cat => {
      // Category header
      doc.rect(MARGIN, qtoY, PW - MARGIN * 2, 18).fill(LIGHT_GRAY);
      doc.rect(MARGIN, qtoY, 3, 18).fill(GOLD);
      doc.fontSize(9).fillColor("#374151").font("Helvetica-Bold").text(cat, MARGIN + 8, qtoY + 5);
      qtoY += 18;

      // Column headers
      qtoY = drawTableHeader(doc, [
        { label: "Description", x: colX.desc, w: colW.desc },
        { label: "Unit", x: colX.unit, w: colW.unit, align: "center" },
        { label: "Qty", x: colX.qty, w: colW.qty, align: "center" },
        { label: "Unit Rate (CAD)", x: colX.rate, w: colW.rate, align: "right" },
        { label: "Line Total", x: colX.total, w: colW.total, align: "right" },
      ], qtoY, 16);

      qtoItems.filter(i => i.category === cat).forEach((item, idx) => {
        qtoY = drawTableRow(doc, [
          { text: item.description, x: colX.desc, w: colW.desc },
          { text: item.unit, x: colX.unit, w: colW.unit, align: "center", color: GRAY },
          { text: String(item.qty), x: colX.qty, w: colW.qty, align: "center", color: GOLD, bold: true },
          { text: `$${item.unitRate.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, x: colX.rate, w: colW.rate, align: "right", color: "#374151" },
          { text: `$${item.lineTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, x: colX.total, w: colW.total, align: "right", bold: true },
        ], qtoY, 16, idx % 2 === 1 ? LIGHT_GRAY : undefined);
      });
      qtoY += 4;
    });

    // ── Cost Waterfall ─────────────────────────────────────────────────────
    const labourCost = calculateLabourTotal(rawQtoItems as any, savedLabourRates);
    const lumonSalesPrice = parseFloat(lumonPricingRow?.salesPrice ?? "") || 0;
    const contingencyPct = parseFloat(quoteSetting?.contingencyPct ?? "10") || 10;
    const overheadPct = parseFloat(quoteSetting?.overheadPct ?? "15") || 15;
    const taxPct = parseFloat(quoteSetting?.taxPct ?? "5") || 5;
    const subtotal = grandTotal + labourCost + lumonSalesPrice;
    const contingencyAmt = subtotal * (contingencyPct / 100);
    const overheadAmt = (subtotal + contingencyAmt) * (overheadPct / 100);
    const beforeTax = subtotal + contingencyAmt + overheadAmt;
    const taxAmt = beforeTax * (taxPct / 100);
    const totalToClient = beforeTax + taxAmt;
    const fmtCAD = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const wfW = 320;
    const wfX = PW - MARGIN - wfW;
    let wfY = qtoY + 10;
    doc.rect(wfX, wfY, wfW, 200).fill(BLACK);

    const wfRow = (label: string, value: string, isBold = false, isTotal = false, topBorder = false) => {
      if (topBorder) {
        doc.strokeColor(GOLD).lineWidth(0.5).moveTo(wfX + 10, wfY).lineTo(wfX + wfW - 10, wfY).stroke();
      }
      const rowH = isTotal ? 30 : 20;
      doc.fontSize(isTotal ? 10 : 8).fillColor(isBold || isTotal ? "white" : "#9CA3AF")
        .font(isBold || isTotal ? "Helvetica-Bold" : "Helvetica")
        .text(label, wfX + 12, wfY + (isTotal ? 8 : 5), { width: wfW / 2 - 12 });
      doc.text(value, wfX + wfW / 2, wfY + (isTotal ? 8 : 5), { width: wfW / 2 - 12, align: "right" });
      wfY += rowH;
    };

    wfY += 8;
    doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold").text("COST BREAKDOWN (CAD)", wfX + 12, wfY);
    wfY += 14;
    wfRow("Materials", fmtCAD(grandTotal));
    wfRow("Labour", fmtCAD(labourCost));
    if (lumonSalesPrice > 0) wfRow("Lumon Supply", fmtCAD(lumonSalesPrice));
    wfRow("Subtotal", fmtCAD(subtotal), true, false, true);
    wfRow(`+ Contingency (${contingencyPct}%)`, fmtCAD(contingencyAmt));
    wfRow(`+ Overhead (${overheadPct}%)`, fmtCAD(overheadAmt));
    wfRow("Before Tax", fmtCAD(beforeTax), true, false, true);
    wfRow(`+ Tax (${taxPct}%)`, fmtCAD(taxAmt));
    wfY += 4;
    doc.rect(wfX, wfY, wfW, 34).fill("#1A1A1A");
    doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("TOTAL TO CLIENT", wfX + 12, wfY + 6);
    doc.fontSize(18).fillColor("white").font("Helvetica-Bold").text(fmtCAD(totalToClient), wfX + 12, wfY + 6, { width: wfW - 24, align: "right" });
    wfY += 34;
    doc.fontSize(6.5).fillColor(GRAY).font("Helvetica")
      .text("Concept Only — Not For Construction — Rates subject to supplier confirmation", wfX + 12, wfY + 4, { width: wfW - 24 });

    // ── PAGE 6: FIELD VERIFICATION CHECKLIST ──────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet B — Field Verification");
    drawPageFooter(doc);
    drawSectionTitle(doc, "Field Verification Checklist", "SHEET B", contentTop + 6);

    let clY = contentTop + 36;
    const clColW = (PW - MARGIN * 2 - 16) / 2;

    // Two-column layout for checklist
    let clCol = 0;
    let clColY = [clY, clY];
    checklistCategories.forEach(cat => {
      const cx2 = MARGIN + clCol * (clColW + 16);
      // Category header
      doc.rect(cx2, clColY[clCol], clColW, 16).fill("white");
      doc.rect(cx2, clColY[clCol] + 14, clColW, 1).fill("#E5E7EB");
      doc.fontSize(8.5).fillColor("#374151").font("Helvetica-Bold").text(cat.toUpperCase(), cx2, clColY[clCol] + 3);
      clColY[clCol] += 20;

      checklist.filter(c => c.category === cat).forEach(item => {
        const bg = item.checked ? "#F0FDF4" : LIGHT_GRAY;
        doc.rect(cx2, clColY[clCol], clColW, 20).fill(bg);
        // Checkbox
        if (item.checked) {
          doc.rect(cx2, clColY[clCol] + 4, 12, 12).fill("#22C55E");
          doc.fontSize(8).fillColor("white").font("Helvetica-Bold").text("✓", cx2 + 6, clColY[clCol] + 5);
        } else {
          doc.rect(cx2 + 4, clColY[clCol] + 4, 12, 12).stroke("#9CA3AF").strokeColor("#9CA3AF").lineWidth(1.5);
        }
        if (clColY[clCol] + 20 < PH - 30) {
          doc.fontSize(8.5).fillColor(item.checked ? GRAY : BLACK).font("Helvetica")
            .text(item.label, cx2 + 22, clColY[clCol] + 5, { width: clColW - 26, lineBreak: false });
        }
        clColY[clCol] += 20;
        if (item.fieldNote && clColY[clCol] - 4 + 12 < PH - 30) {
          doc.fontSize(7.5).fillColor(GRAY).font("Helvetica").text(item.fieldNote, cx2 + 22, clColY[clCol] - 4, { width: clColW - 26, lineBreak: false });
          clColY[clCol] += 12;
        }
      });
      clColY[clCol] += 6;
      // Switch columns
      if (clCol === 0 && clColY[0] > clColY[1] + 40) clCol = 1;
      else if (clCol === 1 && clColY[1] > clColY[0] + 40) clCol = 0;
      else clCol = (clCol + 1) % 2;
    });

    // ── PAGE 7: SCOPE ──────────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet C — Scope");
    drawPageFooter(doc);
    drawSectionTitle(doc, "Inclusions / Exclusions / Assumptions", "SHEET C", contentTop + 6);

    const scopeTypes = ["inclusion", "exclusion", "assumption", "by_others"] as const;
    const scopeTypeLabels: Record<string, string> = {
      inclusion: "INCLUSIONS", exclusion: "EXCLUSIONS", assumption: "ASSUMPTIONS", by_others: "BY OTHERS / COORDINATION REQUIRED"
    };
    const scopeTypeColors: Record<string, string> = {
      inclusion: "#dcfce7", exclusion: "#fee2e2", assumption: "#dbeafe", by_others: "#f3f4f6"
    };
    const scopeTypeBorderColors: Record<string, string> = {
      inclusion: "#16a34a", exclusion: "#dc2626", assumption: "#2563eb", by_others: "#6b7280"
    };
    const scopeBadgeText: Record<string, string> = {
      inclusion: "Inclusion", exclusion: "Exclusion", assumption: "Assumption", by_others: "By Others"
    };

    let scY = contentTop + 36;
    scopeTypes.forEach(type => {
      const items = scopeItems.filter(s => s.type === type);
      if (!items.length) return;

      // Section header
      doc.rect(MARGIN, scY, PW - MARGIN * 2, 18).fill(scopeTypeColors[type]);
      doc.rect(MARGIN, scY, 3, 18).fill(scopeTypeBorderColors[type]);
      if (scY + 18 < PH - 30) {
        doc.fontSize(9).fillColor(scopeTypeBorderColors[type]).font("Helvetica-Bold").text(scopeTypeLabels[type], MARGIN + 8, scY + 5, { lineBreak: false });
      }
      scY += 18;

      items.forEach((item, idx) => {
        const rowH = 18;
        if (scY + rowH >= PH - 30) return; // skip rows that would overflow
        doc.rect(MARGIN, scY, PW - MARGIN * 2, rowH).fill(idx % 2 === 0 ? "white" : LIGHT_GRAY);
        doc.rect(MARGIN, scY, 3, rowH).fill(scopeTypeBorderColors[type]);

        // Badge
        const badgeW = 70;
        doc.rect(MARGIN + 6, scY + 4, badgeW, 10).fill(scopeTypeColors[type]);
        doc.fontSize(7).fillColor(scopeTypeBorderColors[type]).font("Helvetica-Bold")
          .text(scopeBadgeText[type], MARGIN + 8, scY + 5, { width: badgeW - 4, lineBreak: false });

        doc.fontSize(8.5).fillColor("#374151").font("Helvetica")
          .text(item.text, MARGIN + badgeW + 12, scY + 4, { width: PW - MARGIN * 2 - badgeW - 18, lineBreak: false });
        scY += rowH;
      });
      scY += 8;
    });

    // ── PAGE 8: CONNECTION DETAILS ─────────────────────────────────────────
    doc.addPage();
    drawPageHeader(doc, project.projectName, "Sheet D — Connection Details");
    drawTitleBlock(doc, { ...tbBase, drawingTitle: "Connection Detail Intent", sheetNum: "D" });
    drawPageFooter(doc);
    drawSectionTitle(doc, "Connection & Detail Intent", "SHEET D", contentTop + 6);
    drawDisclaimer(doc, "Concept details only — not engineered, not for construction. For estimating intent only. All connections subject to licensed structural review.",
      MARGIN, contentTop + 34, PW - MARGIN * 2);

    const details = [
      { title: "① Wall Ledger to Building", desc: "Heavy-duty aluminum ledger bolted to building wall. Anchor type subject to wall material. Sealant at all penetrations.", bg: "#FFFBEB", border: "#F59E0B" },
      { title: "② Post Base Plate to Slab", desc: "200×200×12mm aluminum base plate. Chemical anchor bolts into concrete slab. Grout bed for levelling.", bg: LIGHT_GRAY, border: "#9CA3AF" },
      { title: "③ Front Beam to Post", desc: "150×75 RHS beam welded or bolted to 100×100 SHS post. Cap plate at post top. Powder coated to match.", bg: LIGHT_GRAY, border: "#9CA3AF" },
      { title: "④ Slat to Beam Clip", desc: "Aluminum clip bracket at each slat-to-beam intersection. Concealed fastener. Slat end cap at perimeter.", bg: LIGHT_GRAY, border: "#9CA3AF" },
      { title: "⑤ Glass Top Rail to Fascia Beam", desc: "Lumon top rail bolts directly to underside of front fascia beam. Weathertight sealant joint. Coordinate with Lumon glass supplier.", bg: "#EFF6FF", border: BLUE },
      { title: "⑥ Side Glass Corner Condition", desc: "Glass-to-glass corner at front/side intersection. Aluminum corner post or structural silicone joint. Coordinate with supplier.", bg: "#EFF6FF", border: BLUE },
    ];

    const detColW = (PW - MARGIN * 2 - 20) / 3;
    details.forEach((d, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const dx = MARGIN + col * (detColW + 10);
      const dy = contentTop + 62 + row * 120;
      doc.rect(dx, dy, detColW, 110).stroke("#E5E7EB").strokeColor("#E5E7EB").lineWidth(1);
        doc.rect(dx, dy, detColW, 24).fill(d.bg);
        doc.rect(dx, dy, 3, 24).fill(d.border);
        doc.fontSize(9).fillColor("#374151").font("Helvetica-Bold").text(d.title, dx + 8, dy + 7, { width: detColW - 12 });
        doc.fontSize(8.5).fillColor(GRAY).font("Helvetica").text(d.desc, dx + 8, dy + 30, { width: detColW - 16 });
    });

    // ── GENERAL NOTES PAGE ─────────────────────────────────────────────────
    drawGeneralNotes(doc, project.projectName, pergolaParams, tbBase);

    // ── RENDERINGS PAGE (if any exist) ──
    await drawRenderingsPage(doc, project.projectName, pergolaRenderings);

    // Finalize PDF
    doc.end();
    const pdfBuffer = await pdfReady;

    const filename = `${project.projectName.replace(/[^a-z0-9]/gi, "_")}_estimating_package.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("[PDF Export] Error:", err);
    res.status(500).json({ error: "PDF generation failed", details: String(err) });
  }
}
