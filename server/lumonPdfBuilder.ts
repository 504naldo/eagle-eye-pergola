/**
 * lumonPdfBuilder.ts
 * Generates an 8-page Lumon Glass System shop drawing package using PDFKit.
 * White background with gold accents throughout.
 *
 * Sheets:
 *   L0.1  Cover Page — 3D perspective + project info + sheet index
 *   L0.2  Notes — construction notes, Lumon notes, design criteria
 *   L1.1  Plan on Post — dimensioned plan layout
 *   L2.1  Front Elevation — sides 5–8
 *   L2.2  Side Elevations — left + right
 *   L3.1  Typical Section — full height
 *   L3.2  Connection Details — lower, railing, upper
 *   L4.1  Bill of Materials / QTO
 */

import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import type { LumonParams } from "../shared/scopeTypes";
import type { LumonQTOItem } from "../shared/lumonQTO";

// ── Page geometry (A3 landscape, points) ─────────────────────────────────────
const PW = 1190.55;   // 420mm
const PH = 841.89;    // 297mm
const MARGIN = 40;
const HEADER_H = 52;
const FOOTER_H = 28;
const BODY_TOP = HEADER_H + 12;
const BODY_BOT = PH - FOOTER_H - 12;
const BODY_H = BODY_BOT - BODY_TOP;
const BODY_W = PW - MARGIN * 2;

// ── Colours ───────────────────────────────────────────────────────────────────
const GOLD   = "#C9A84C";
const DARK   = "#111111";
const MID    = "#444444";
const LGRAY  = "#F8F8F8";
const MGRAY  = "#CCCCCC";
const DGRAY  = "#777777";
const BLUE   = "#2266AA";
const GREEN  = "#226622";
const AMBER  = "#FEF3C7";
const AMBER_BORDER = "#F59E0B";
const WHITE  = "white";

// ── Utility: fetch image buffer ───────────────────────────────────────────────
function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ── mm → ft-in string ────────────────────────────────────────────────────────
function mmToFtIn(mm: number): string {
  const totalIn = mm / 25.4;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  if (inches === 12) return `${ft + 1}′-0″`;
  return `${ft}′-${inches}″`;
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(doc: PDFKit.PDFDocument, projectName: string, sheetNo: string, sheetTitle: string) {
  // White background
  doc.rect(0, 0, PW, PH).fill(WHITE);
  // Dark header bar
  doc.rect(0, 0, PW, HEADER_H).fill(DARK);
  doc.rect(0, HEADER_H, PW, 3).fill(GOLD);
  // Logo
  doc.circle(30, 26, 16).stroke(GOLD).strokeColor(GOLD).lineWidth(1.5);
  doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("EE", 23, 20);
  // Company
  doc.fontSize(12).fillColor(WHITE).font("Helvetica-Bold").text("Eagle Eye Management Services", 54, 10);
  doc.fontSize(8).fillColor(GOLD).font("Helvetica").text("LUMON GLASS SYSTEM — SHOP DRAWING PACKAGE", 54, 28);
  // Right: project + sheet
  doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold").text(projectName, MARGIN, 10, { align: "right", width: PW - MARGIN * 2 });
  doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text(`${sheetNo}  |  ${sheetTitle}`, MARGIN, 28, { align: "right", width: PW - MARGIN * 2 });
}

// ── Page footer ───────────────────────────────────────────────────────────────
function drawFooter(doc: PDFKit.PDFDocument, p: LumonParams, pageNum: number, totalPages: number) {
  const y = PH - FOOTER_H;
  doc.rect(0, y - 3, PW, 3).fill(GOLD);
  doc.rect(0, y, PW, FOOTER_H).fill(DARK);
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text(`© Eagle Eye Management Services — ${p.buildingCode} — Concept Only, Not For Construction`, MARGIN, y + 8);
  doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold").text(`Prepared by: Ranaldo Daniels`, 0, y + 8, { align: "center", width: PW });
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text(`Page ${pageNum} of ${totalPages}`, 0, y + 8, { align: "right", width: PW - MARGIN });
}

// ── Section title bar ─────────────────────────────────────────────────────────
function sectionTitle(doc: PDFKit.PDFDocument, title: string, x: number, y: number, w = BODY_W) {
  doc.rect(x, y, 4, 18).fill(GOLD);
  doc.fontSize(11).fillColor(DARK).font("Helvetica-Bold").text(title, x + 10, y + 2);
  return y + 26;
}

// ── Disclaimer box ────────────────────────────────────────────────────────────
function disclaimer(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number) {
  doc.rect(x, y, w, 20).fill(AMBER).stroke(AMBER_BORDER).strokeColor(AMBER_BORDER).lineWidth(0.8);
  doc.fontSize(7.5).fillColor("#92400E").font("Helvetica").text("⚠  " + text, x + 6, y + 5, { width: w - 12 });
  return y + 26;
}

// ── Dimension line (horizontal, PDFKit) ───────────────────────────────────────
function dimH(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number, label: string) {
  const mid = (x1 + x2) / 2;
  doc.moveTo(x1, y).lineTo(x2, y).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.6);
  doc.moveTo(x1, y - 4).lineTo(x1, y + 4).stroke(MGRAY).lineWidth(0.6);
  doc.moveTo(x2, y - 4).lineTo(x2, y + 4).stroke(MGRAY).lineWidth(0.6);
  doc.fontSize(7).fillColor(MID).font("Helvetica").text(label, mid - 40, y - 12, { width: 80, align: "center" });
}

// ── Dimension line (vertical, PDFKit) ─────────────────────────────────────────
function dimV(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, label: string) {
  const mid = (y1 + y2) / 2;
  doc.moveTo(x, y1).lineTo(x, y2).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.6);
  doc.moveTo(x - 4, y1).lineTo(x + 4, y1).stroke(MGRAY).lineWidth(0.6);
  doc.moveTo(x - 4, y2).lineTo(x + 4, y2).stroke(MGRAY).lineWidth(0.6);
  doc.save().rotate(-90, { origin: [x - 12, mid] }).fontSize(7).fillColor(MID).font("Helvetica").text(label, x - 12 - 30, mid - 4, { width: 60, align: "center" }).restore();
}

// ── Plan view (L1.1) ──────────────────────────────────────────────────────────
function drawPlanView(doc: PDFKit.PDFDocument, p: LumonParams, x: number, y: number, w: number, h: number) {
  const totalSpan = p.overallSpanMm + (p.hasLeftReturn ? p.leftReturnWidthMm : 0) + (p.hasRightReturn ? p.rightReturnWidthMm : 0);
  const scale = (w - 80) / totalSpan;
  const depthMm = 4775;
  const depthPx = Math.min(h * 0.55, depthMm * scale);
  const ox = x + 40;
  const baseY = y + h * 0.15;

  // Building wall
  doc.rect(ox, baseY, w - 80, 5).fill(MGRAY);
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("BUILDING WALL", ox + (w - 80) / 2 - 30, baseY - 12, { width: 60, align: "center" });

  let curX = ox;

  // Left return
  if (p.hasLeftReturn) {
    const retW = p.leftReturnWidthMm * scale;
    doc.rect(curX, baseY, retW, depthPx).fill("#EEF5FF").stroke(BLUE).strokeColor(BLUE).lineWidth(0.6);
    doc.fontSize(6).fillColor(BLUE).font("Helvetica").text("L.RET", curX + retW / 2 - 10, baseY + depthPx / 2 - 4, { width: 20, align: "center" });
    curX += retW;
  }

  const bayStartX = curX;
  const postXs: number[] = [curX];

  for (let i = 0; i < p.bays.length; i++) {
    const bay = p.bays[i];
    const bw = bay.widthMm * scale;
    const bayX = curX;

    // Stacking zone
    if (i === 0 && p.leftStackingZoneMm > 0) {
      const szW = p.leftStackingZoneMm * scale;
      doc.rect(bayX, baseY, szW, depthPx).fill("#FFF9E6").stroke(GOLD).strokeColor(GOLD).lineWidth(0.5);
    }
    if (i === p.bays.length - 1 && p.rightStackingZoneMm > 0) {
      const szW = p.rightStackingZoneMm * scale;
      doc.rect(bayX + bw - szW, baseY, szW, depthPx).fill("#FFF9E6").stroke(GOLD).strokeColor(GOLD).lineWidth(0.5);
    }

    // Glass panel
    const glassFill = bay.isFixed ? "#E8F5E8" : "#E8F0FF";
    const glassStroke = bay.isFixed ? GREEN : BLUE;
    doc.rect(bayX + 1, baseY + depthPx - 7, bw - 2, 5).fill(glassFill).stroke(glassStroke).strokeColor(glassStroke).lineWidth(0.6);

    // Fixed X mark
    if (bay.isFixed) {
      doc.moveTo(bayX + 2, baseY + depthPx - 7).lineTo(bayX + bw - 2, baseY + depthPx - 2).stroke(glassStroke).strokeColor(glassStroke).lineWidth(0.4);
      doc.moveTo(bayX + bw - 2, baseY + depthPx - 7).lineTo(bayX + 2, baseY + depthPx - 2).stroke(glassStroke).lineWidth(0.4);
    }

    // Bay label
    doc.fontSize(7).fillColor(MID).font("Helvetica").text(`B${i + 1}`, bayX + bw / 2 - 6, baseY + depthPx / 2 - 4, { width: 12, align: "center" });

    // Bay width dim
    dimH(doc, bayX, bayX + bw, baseY + depthPx + 18, `${bay.widthMm}`);

    curX += bw;
    postXs.push(curX);
  }

  // Right return
  if (p.hasRightReturn) {
    const retW = p.rightReturnWidthMm * scale;
    doc.rect(curX, baseY, retW, depthPx).fill("#EEF5FF").stroke(BLUE).strokeColor(BLUE).lineWidth(0.6);
    curX += retW;
  }

  // Posts
  for (let i = 0; i < postXs.length; i++) {
    const px = postXs[i];
    const pw2 = p.frontPostSectionMm * scale;
    const ph2 = p.frontPostSectionMm * scale;
    doc.rect(px - pw2 / 2, baseY + depthPx - ph2 / 2, pw2, ph2).fill("#C8A060").stroke(DARK).strokeColor(DARK).lineWidth(0.8);
    doc.fontSize(6).fillColor(DARK).font("Helvetica-Bold").text(`P${i + 1}`, px - 5, baseY + depthPx + 28, { width: 10, align: "center" });
  }

  // Overall span dim
  const spanPx = p.overallSpanMm * scale;
  dimH(doc, bayStartX, bayStartX + spanPx, baseY - 20, `${p.overallSpanMm} (${mmToFtIn(p.overallSpanMm)})`);

  // Depth dim
  dimV(doc, ox + w - 60, baseY, baseY + depthPx, `${depthMm} (${mmToFtIn(depthMm)})`);

  // North arrow
  const nx = ox + w - 50;
  const ny = y + h - 30;
  doc.circle(nx, ny, 14).stroke(DARK).strokeColor(DARK).lineWidth(0.8);
  doc.polygon([nx, ny - 11], [nx - 4, ny + 4], [nx, ny - 2], [nx + 4, ny + 4]).fill(DARK);
  doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold").text("N", nx - 4, ny + 16, { width: 8 });
}

// ── Front elevation view (L2.1) ───────────────────────────────────────────────
function drawFrontElevation(doc: PDFKit.PDFDocument, p: LumonParams, x: number, y: number, w: number, h: number) {
  const totalSpan = p.overallSpanMm + (p.hasLeftReturn ? p.leftReturnWidthMm : 0) + (p.hasRightReturn ? p.rightReturnWidthMm : 0);
  const totalH = p.finishedHeightMm + 350;
  const scale = Math.min((w - 80) / totalSpan, (h - 60) / totalH);
  const fhPx = p.finishedHeightMm * scale;
  const pergolaH = 280 * scale;
  const railH = p.railingProfileMm * scale;

  const ox = x + 40;
  const baseY = y + h - 30;
  const railingTopY = baseY - fhPx - pergolaH;

  // Ground line
  doc.moveTo(ox - 15, baseY).lineTo(ox + (w - 80), baseY).stroke(DARK).strokeColor(DARK).lineWidth(1.5);
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("F.F.L.", ox - 30, baseY - 4);

  // Pergola (dashed)
  doc.rect(ox, railingTopY, totalSpan * scale, pergolaH).dash(4, { space: 2 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8).undash();
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("LOUVERED PERGOLA (BY OTHERS)", ox + totalSpan * scale / 2 - 60, railingTopY + pergolaH / 2 - 4, { width: 120, align: "center" });

  let curX = ox;
  if (p.hasLeftReturn) curX += p.leftReturnWidthMm * scale;
  const bayStartX = curX;
  const postXs: number[] = [curX];

  for (let i = 0; i < p.bays.length; i++) {
    const bay = p.bays[i];
    const bw = bay.widthMm * scale;
    const bayX = curX;

    if (p.glassZoneConfig === "upper_lower") {
      const lowerH = p.lowerZoneHeightMm * scale;
      const upperH = p.upperZoneHeightMm * scale;
      const midRailY = baseY - lowerH;
      const upperY = midRailY - upperH;

      // Lower glass
      const lFill = bay.isFixed ? "#E8F5E8" : "#E8F0FF";
      const lStroke = bay.isFixed ? GREEN : BLUE;
      doc.rect(bayX + 1, midRailY, bw - 2, lowerH).fill(lFill).fillOpacity(0.6).stroke(lStroke).strokeColor(lStroke).lineWidth(0.7).fillOpacity(1);
      if (bay.isFixed) {
        doc.moveTo(bayX + 2, midRailY).lineTo(bayX + bw - 2, midRailY + lowerH).stroke(lStroke).strokeColor(lStroke).lineWidth(0.5);
        doc.moveTo(bayX + bw - 2, midRailY).lineTo(bayX + 2, midRailY + lowerH).stroke(lStroke).lineWidth(0.5);
      }
      // Mid-rail
      doc.rect(bayX, midRailY - 4, bw, 8).fill(MID);
      // Upper glass
      doc.rect(bayX + 1, upperY, bw - 2, upperH).fill("#E8F0FF").fillOpacity(0.4).stroke(BLUE).strokeColor(BLUE).lineWidth(0.6).fillOpacity(1);
    } else {
      doc.rect(bayX + 1, railingTopY + railH, bw - 2, fhPx - railH).fill("#E8F0FF").fillOpacity(0.4).stroke(BLUE).strokeColor(BLUE).lineWidth(0.7).fillOpacity(1);
    }

    // Door opening
    if (bay.hasDoor && bay.doorWidthMm > 0) {
      const dw = bay.doorWidthMm * scale;
      const dx = bayX + (bw - dw) / 2;
      const doorH = 2100 * scale;
      doc.rect(dx, baseY - doorH, dw, doorH).fill("#FFE8E8").fillOpacity(0.6).stroke("#CC2222").strokeColor("#CC2222").lineWidth(0.8).fillOpacity(1);
      doc.fontSize(6).fillColor("#CC2222").font("Helvetica").text("DOOR\nBY OTHERS", dx + dw / 2 - 15, baseY - doorH / 2 - 6, { width: 30, align: "center" });
    }

    curX += bw;
    postXs.push(curX);
  }

  // Posts
  for (let i = 0; i < postXs.length; i++) {
    const px = postXs[i];
    const pw2 = p.frontPostSectionMm * scale;
    doc.rect(px - pw2 / 2, railingTopY, pw2, fhPx + pergolaH).fill("#C8A060").fillOpacity(0.7).stroke(DARK).strokeColor(DARK).lineWidth(0.8).fillOpacity(1);
    // Post tag
    doc.circle(px, railingTopY - 10, 7).fill(DARK);
    doc.fontSize(6).fillColor(GOLD).font("Helvetica-Bold").text(`P${i + 1}`, px - 5, railingTopY - 14, { width: 10, align: "center" });
  }

  // Railing profile
  doc.rect(bayStartX, railingTopY, p.overallSpanMm * scale, railH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.2);
  doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`LGR ${p.railingProfileMm}mm RAILING PROFILE`, bayStartX + p.overallSpanMm * scale / 2 - 60, railingTopY + railH / 2 - 4, { width: 120, align: "center" });

  // Dimensions
  dimH(doc, bayStartX, bayStartX + p.overallSpanMm * scale, baseY + 18, `${p.overallSpanMm} (${mmToFtIn(p.overallSpanMm)})`);
  dimV(doc, ox - 25, railingTopY + railH, baseY, `FH=${p.finishedHeightMm} (${mmToFtIn(p.finishedHeightMm)})`);

  // FH datum
  doc.moveTo(ox - 5, baseY).lineTo(ox + totalSpan * scale + 5, baseY).dash(6, { space: 3 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.5).undash();
}

// ── Side elevation (L2.2) ─────────────────────────────────────────────────────
function drawSideElevation(doc: PDFKit.PDFDocument, p: LumonParams, x: number, y: number, w: number, h: number, side: "left" | "right") {
  const depthMm = 4775;
  const totalH = p.finishedHeightMm + 350;
  const scaleH = (h - 60) / totalH;
  const scaleW = (w - 80) / (depthMm + 400);
  const fhPx = p.finishedHeightMm * scaleH;
  const pergolaH = 280 * scaleH;
  const depthPx = depthMm * scaleW;

  const ox = x + 40;
  const baseY = y + h - 30;
  const railingTopY = baseY - fhPx - pergolaH;
  const wallX = ox + depthPx;

  // Ground line
  doc.moveTo(ox - 15, baseY).lineTo(ox + depthPx + 30, baseY).stroke(DARK).strokeColor(DARK).lineWidth(1.5);
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("F.F.L.", ox - 30, baseY - 4);

  // Building wall
  doc.rect(wallX, railingTopY, 7, fhPx + pergolaH).fill(MGRAY).stroke(DARK).strokeColor(DARK).lineWidth(0.8);
  doc.save().rotate(-90, { origin: [wallX + 14, baseY - fhPx / 2] }).fontSize(6).fillColor(DGRAY).font("Helvetica").text("BUILDING WALL", wallX + 14 - 30, baseY - fhPx / 2 - 4, { width: 60, align: "center" }).restore();

  // Pergola
  doc.rect(ox, railingTopY, depthPx, pergolaH).dash(4, { space: 2 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8).undash();
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("PERGOLA (BY OTHERS)", ox + depthPx / 2 - 40, railingTopY + pergolaH / 2 - 4, { width: 80, align: "center" });

  // Railing profile
  const railH = p.railingProfileMm * scaleH;
  doc.rect(ox, railingTopY + pergolaH, depthPx, railH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.2);

  // Glass zone
  if (p.glassZoneConfig === "upper_lower") {
    const lowerH = p.lowerZoneHeightMm * scaleH;
    const midRailY = baseY - lowerH;
    doc.rect(ox, midRailY, 8, lowerH).fill("#E8F0FF").stroke(BLUE).strokeColor(BLUE).lineWidth(0.7);
    doc.rect(ox, midRailY - 6, 8, 12).fill(MID);
    doc.rect(ox, railingTopY + pergolaH + railH, 8, p.upperZoneHeightMm * scaleH).fill("#E8F0FF").fillOpacity(0.5).stroke(BLUE).strokeColor(BLUE).lineWidth(0.6).fillOpacity(1);
  }

  // Door opening
  const doorH = 2100 * scaleH;
  const doorW = 900 * scaleW;
  doc.rect(ox, baseY - doorH, doorW, doorH).fill("#FFE8E8").fillOpacity(0.6).stroke("#CC2222").strokeColor("#CC2222").lineWidth(1).fillOpacity(1);
  doc.fontSize(6).fillColor("#CC2222").font("Helvetica").text("DOOR\nBY OTHERS", ox + doorW / 2 - 15, baseY - doorH / 2 - 6, { width: 30, align: "center" });

  // Front post
  const postW2 = p.frontPostSectionMm * scaleW;
  doc.rect(ox - postW2 / 2, railingTopY + pergolaH, postW2, fhPx).fill("#C8A060").fillOpacity(0.7).stroke(DARK).strokeColor(DARK).lineWidth(0.8).fillOpacity(1);

  // Dimensions
  dimH(doc, ox, ox + depthPx, baseY + 18, `${depthMm} (${mmToFtIn(depthMm)})`);
  dimV(doc, ox - 25, railingTopY + pergolaH, baseY, `FH=${p.finishedHeightMm} (${mmToFtIn(p.finishedHeightMm)})`);
  dimV(doc, ox - 45, baseY - doorH, baseY, `2100 (6′-11″)`);

  // Label
  doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold").text(`${side === "left" ? "LEFT" : "RIGHT"} SIDE ELEVATION`, ox + depthPx / 2 - 50, y + 4, { width: 100, align: "center" });
}

// ── Typical section (L3.1) ────────────────────────────────────────────────────
function drawTypicalSection(doc: PDFKit.PDFDocument, p: LumonParams, x: number, y: number, w: number, h: number) {
  const totalH = p.finishedHeightMm + 600;
  const scaleH = (h - 60) / totalH;
  const postW = 45;
  const cx2 = x + w / 2;
  const baseY = y + h - 40;

  // Slab
  const slabH = 120 * scaleH;
  doc.rect(x + 20, baseY, w - 40, slabH).fill("#DDDDDD").stroke(DARK).strokeColor(DARK).lineWidth(0.8);
  doc.fontSize(7).fillColor(MID).font("Helvetica").text("CONCRETE SLAB", cx2 - 35, baseY + slabH / 2 - 4, { width: 70, align: "center" });

  // Anchor
  const anchorH = p.anchorEmbedmentMm * scaleH * 0.5;
  const anchorTopY = baseY + 8;
  doc.rect(cx2 - 3, anchorTopY, 6, anchorH).fill(MID).stroke(DARK).strokeColor(DARK).lineWidth(0.6);
  doc.circle(cx2, anchorTopY + anchorH, 5).stroke(MID).strokeColor(MID).lineWidth(1.5);
  doc.fontSize(6.5).fillColor(MID).font("Helvetica").text(`${p.anchorType}  |  Min. ${p.anchorEmbedmentMm}mm emb.`, cx2 + 12, anchorTopY + anchorH / 2 - 4, { width: 140 });
  dimV(doc, cx2 - 20, anchorTopY, anchorTopY + anchorH, `${p.anchorEmbedmentMm}`);

  // Post
  const postTopY = baseY - (p.finishedHeightMm + 280) * scaleH;
  const postH = (p.finishedHeightMm + 280) * scaleH;
  doc.rect(cx2 - postW / 2, postTopY, postW, postH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.2);
  // Hatch
  for (let i = 0; i < 5; i++) {
    const hy = postTopY + (postH / 5) * i;
    doc.moveTo(cx2 - postW / 2, hy).lineTo(cx2 + postW / 2, hy + postH / 5).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.4);
  }
  doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`${p.lumonPostSectionMm}×${p.lumonPostSectionMm}`, cx2 - 15, postTopY + postH / 2 - 10, { width: 30, align: "center" });
  doc.fontSize(6).fillColor(DGRAY).font("Helvetica").text("LUMON POST", cx2 - 15, postTopY + postH / 2 + 2, { width: 30, align: "center" });

  // Railing profile
  const railH = p.railingProfileMm * scaleH;
  doc.rect(cx2 - postW / 2 - 18, postTopY, postW + 36, railH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.5);
  doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`LGR ${p.railingProfileMm}mm`, cx2 - 20, postTopY + railH / 2 - 4, { width: 40, align: "center" });

  // Glass zones
  if (p.glassZoneConfig === "upper_lower") {
    const lowerH = p.lowerZoneHeightMm * scaleH;
    const upperH = p.upperZoneHeightMm * scaleH;
    const midRailY = baseY - lowerH;
    const upperY = midRailY - upperH;

    // Lower glass
    doc.rect(cx2 - postW / 2 + 4, midRailY, postW - 8, lowerH).fill("#E8F0FF").fillOpacity(0.6).stroke(BLUE).strokeColor(BLUE).lineWidth(0.8).fillOpacity(1);
    doc.fontSize(6.5).fillColor(BLUE).font("Helvetica").text(`${p.glassThicknessMm}mm GLASS`, cx2 - 15, midRailY + lowerH / 2 - 4, { width: 30, align: "center" });
    dimV(doc, cx2 - postW / 2 - 30, midRailY, baseY, `${p.lowerZoneHeightMm}`);

    // Mid-rail
    doc.rect(cx2 - postW / 2 - 14, midRailY - 5, postW + 28, 10).fill(MID);
    doc.fontSize(6).fillColor(WHITE).font("Helvetica").text("MID-RAIL", cx2 - 15, midRailY - 4, { width: 30, align: "center" });

    // Upper glass
    doc.rect(cx2 - postW / 2 + 4, upperY, postW - 8, upperH).fill("#E8F0FF").fillOpacity(0.4).stroke(BLUE).strokeColor(BLUE).lineWidth(0.7).fillOpacity(1);
    doc.fontSize(6.5).fillColor(BLUE).font("Helvetica").text(`${p.glassThicknessMm}mm GLASS`, cx2 - 15, upperY + upperH / 2 - 4, { width: 30, align: "center" });
    dimV(doc, cx2 - postW / 2 - 30, upperY, midRailY - 5, `${p.upperZoneHeightMm}`);
  }

  // FH dimension
  dimV(doc, cx2 + postW / 2 + 20, postTopY + railH, baseY, `FH=${p.finishedHeightMm} (${mmToFtIn(p.finishedHeightMm)})`);

  // FFL datum
  doc.moveTo(x + 20, baseY).lineTo(x + w - 20, baseY).dash(6, { space: 3 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.5).undash();
  doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("F.F.L. ±0.000", x + 22, baseY - 10);

  // Keynotes
  const kx = x + w - 30;
  const keynotes = [
    { y: postTopY + railH / 2, n: "1", text: `LGR ${p.railingProfileMm}mm railing profile` },
    { y: baseY - p.lowerZoneHeightMm * scaleH / 2, n: "2", text: `${p.glassThicknessMm}mm tempered safety glass` },
    { y: anchorTopY + anchorH / 2, n: "3", text: "Concrete anchor — see spec" },
  ];
  for (const kn of keynotes) {
    doc.circle(kx, kn.y, 7).fill(DARK);
    doc.fontSize(6.5).fillColor(GOLD).font("Helvetica-Bold").text(kn.n, kx - 4, kn.y - 4, { width: 8, align: "center" });
    doc.fontSize(6.5).fillColor(MID).font("Helvetica").text(kn.text, kx + 12, kn.y - 4, { width: 120 });
  }
}

// ── QTO table (L4.1) ──────────────────────────────────────────────────────────
function drawQTOTable(doc: PDFKit.PDFDocument, p: LumonParams, qtoItems: LumonQTOItem[], x: number, y: number, w: number) {
  const colW = [w * 0.38, w * 0.1, w * 0.1, w * 0.12, w * 0.15, w * 0.15];
  const headers = ["Description", "Qty", "Unit", "Unit Rate", "Line Total", "Group"];
  const rowH = 16;

  // Header row
  doc.rect(x, y, w, rowH).fill(DARK);
  let cx2 = x;
  for (let i = 0; i < headers.length; i++) {
    doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold").text(headers[i], cx2 + 4, y + 4, { width: colW[i] - 8 });
    cx2 += colW[i];
  }
  y += rowH;

  // Group rows
  const groups = Array.from(new Set(qtoItems.map(i => i.group)));
  for (const group of groups) {
    // Group header
    doc.rect(x, y, w, 14).fill("#F0F0F0");
    doc.rect(x, y, 3, 14).fill(GOLD);
    doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(group, x + 8, y + 3, { width: w - 16 });
    y += 14;

    const groupItems = qtoItems.filter(i => i.group === group);
    for (const item of groupItems) {
      const bg = groupItems.indexOf(item) % 2 === 0 ? WHITE : LGRAY;
      doc.rect(x, y, w, rowH).fill(bg);
      // Subtle left border
      doc.rect(x, y, 1, rowH).fill(MGRAY);

      const cells = [
        item.description,
        item.qty.toFixed(2),
        item.unit,
        `$${item.unitRate.toLocaleString()}`,
        `$${item.lineTotal.toLocaleString()}`,
        item.group,
      ];
      cx2 = x;
      for (let i = 0; i < cells.length; i++) {
        doc.fontSize(7).fillColor(MID).font("Helvetica").text(cells[i], cx2 + 4, y + 4, { width: colW[i] - 8, lineBreak: false });
        cx2 += colW[i];
      }
      y += rowH;
    }
  }

  // Grand total
  const grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
  doc.rect(x, y, w, 20).fill(DARK);
  doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("PRELIMINARY TOTAL (excl. GST/HST)", x + 8, y + 5, { width: w * 0.7 });
  doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text(`$${grandTotal.toLocaleString()} CAD`, x + w * 0.7, y + 5, { width: w * 0.3 - 8, align: "right" });
  y += 20;

  return y;
}

// ── Main export function ──────────────────────────────────────────────────────

export interface LumonPdfOptions {
  p: LumonParams;
  projectName: string;
  clientName?: string;
  location?: string;
  qtoItems: LumonQTOItem[];
  aiRenderingUrl?: string;
  referencePhotoUrl?: string;
}

export async function buildLumonPDF(opts: LumonPdfOptions): Promise<Buffer> {
  const { p, projectName, clientName, location, qtoItems, aiRenderingUrl, referencePhotoUrl } = opts;
  const TOTAL_PAGES = 8;
  let pageNum = 0;

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const addPage = (sheetNo: string, sheetTitle: string) => {
    pageNum++;
    doc.addPage();
    drawHeader(doc, projectName, sheetNo, sheetTitle);
    drawFooter(doc, p, pageNum, TOTAL_PAGES);
  };

  // ── L0.1 Cover ────────────────────────────────────────────────────────────
  addPage("L0.1", "Cover Page");
  {
    const bodyY = BODY_TOP + 10;

    // Try to embed AI rendering
    if (aiRenderingUrl) {
      try {
        const imgBuf = await fetchImageBuffer(aiRenderingUrl);
        doc.image(imgBuf, MARGIN, bodyY, { width: BODY_W * 0.55, height: BODY_H * 0.65, fit: [BODY_W * 0.55, BODY_H * 0.65] });
      } catch {
        doc.rect(MARGIN, bodyY, BODY_W * 0.55, BODY_H * 0.65).fill(LGRAY).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8);
        doc.fontSize(9).fillColor(DGRAY).font("Helvetica").text("AI Rendering\n(not available)", MARGIN + BODY_W * 0.55 / 2 - 30, bodyY + BODY_H * 0.65 / 2 - 10, { width: 60, align: "center" });
      }
    } else {
      doc.rect(MARGIN, bodyY, BODY_W * 0.55, BODY_H * 0.65).fill(LGRAY).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8);
      doc.fontSize(9).fillColor(DGRAY).font("Helvetica").text("Concept Rendering", MARGIN + BODY_W * 0.55 / 2 - 40, bodyY + BODY_H * 0.65 / 2 - 6, { width: 80, align: "center" });
    }

    // Right panel
    const rpX = MARGIN + BODY_W * 0.55 + 20;
    const rpW = BODY_W * 0.45 - 20;
    let ry = bodyY;

    // Project info box
    doc.rect(rpX, ry, rpW, 130).fill(LGRAY).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8);
    doc.rect(rpX, ry, rpW, 22).fill(DARK);
    doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("PROJECT INFORMATION", rpX + 8, ry + 6);
    ry += 22;
    const infoRows = [
      ["Project", projectName],
      ["Client", clientName ?? "—"],
      ["Location", location ?? "—"],
      ["Lumon Project No.", p.lumonProjectNo || "TBD"],
      ["System", `Lumon ${p.systemType}`],
      ["Span", `${p.overallSpanMm}mm (${mmToFtIn(p.overallSpanMm)})`],
      ["Height (FH)", `${p.finishedHeightMm}mm (${mmToFtIn(p.finishedHeightMm)})`],
      ["Finish", p.finishColor],
    ];
    for (const [label, value] of infoRows) {
      doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text(label + ":", rpX + 8, ry + 2, { width: rpW * 0.4 });
      doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(value, rpX + rpW * 0.4 + 8, ry + 2, { width: rpW * 0.6 - 16 });
      ry += 13;
    }
    ry = bodyY + 140;

    // Sheet index
    doc.rect(rpX, ry, rpW, 22).fill(DARK);
    doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold").text("SHEET INDEX", rpX + 8, ry + 6);
    ry += 22;
    const sheets = [
      ["L0.1", "Cover Page"],
      ["L0.2", "Notes & Design Criteria"],
      ["L1.1", "Plan on Post"],
      ["L2.1", "Front Elevation"],
      ["L2.2", "Side Elevations"],
      ["L3.1", "Typical Section"],
      ["L3.2", "Connection Details"],
      ["L4.1", "Bill of Materials / QTO"],
    ];
    for (const [no, title] of sheets) {
      doc.rect(rpX, ry, rpW, 13).fill(sheets.indexOf([no, title]) % 2 === 0 ? WHITE : LGRAY);
      doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold").text(no, rpX + 6, ry + 3, { width: 30 });
      doc.fontSize(7).fillColor(MID).font("Helvetica").text(title, rpX + 40, ry + 3, { width: rpW - 48 });
      ry += 13;
    }

    // Disclaimer
    disclaimer(doc, "This package is prepared by Eagle Eye Management Services for concept and coordination purposes only. Not for construction. All dimensions to be field verified. Lumon Canada shop drawings required for fabrication.", rpX, ry + 10, rpW);
  }

  // ── L0.2 Notes ────────────────────────────────────────────────────────────
  addPage("L0.2", "Notes & Design Criteria");
  {
    let y2 = BODY_TOP + 10;
    y2 = sectionTitle(doc, "Construction Notes", MARGIN, y2);
    const constructionNotes = [
      "1. All work shall conform to the current edition of the British Columbia Building Code (BCBC) and applicable local bylaws.",
      "2. Contractor to verify all dimensions on site prior to fabrication. Do not scale drawings.",
      "3. All Lumon glass system components to be supplied and installed by Lumon Canada or an authorised Lumon installer.",
      "4. Concrete anchors to be installed per manufacturer's specification. Minimum embedment as shown.",
      "5. All glass to be tempered safety glass per CAN/CGSB-12.1 or equivalent.",
      "6. Railing system to meet BCBC Part 9 guard requirements (min. 1070mm height where required).",
      "7. All aluminium extrusions to be Lumon proprietary profiles — no substitutions without written approval.",
      "8. Existing structure (posts, beams, ledger) to be verified by structural engineer prior to Lumon installation.",
      "9. All penetrations through existing structure to be reviewed and approved by structural engineer.",
      "10. Contractor to provide shop drawings for review prior to fabrication.",
    ];
    for (const note of constructionNotes) {
      doc.fontSize(8).fillColor(MID).font("Helvetica").text(note, MARGIN + 10, y2, { width: BODY_W / 2 - 20 });
      y2 += 18;
    }

    y2 = BODY_TOP + 10;
    const col2X = MARGIN + BODY_W / 2 + 20;
    y2 = sectionTitle(doc, "Lumon Coordination Notes", col2X, y2);
    const lumonNotes = [
      "L1. Lumon Canada to provide stamped shop drawings for permit submission.",
      "L2. Stacking zones to remain clear of furniture, fixtures, and service equipment.",
      "L3. Door openings (where shown) are by others — Lumon to frame opening only.",
      "L4. Lumon system to be anchored to existing concrete slab — slab thickness and condition to be confirmed.",
      "L5. Drainage to be coordinated with Lumon installer — no water to pond at base of glass.",
      "L6. Lumon upper connection to existing pergola beam to be confirmed by Lumon engineer.",
      "L7. Finish colour to be confirmed with client prior to order — lead time 8–12 weeks.",
      "L8. All hardware (handles, locks, seals) to be Lumon standard unless noted.",
    ];
    for (const note of lumonNotes) {
      doc.fontSize(8).fillColor(MID).font("Helvetica").text(note, col2X + 10, y2, { width: BODY_W / 2 - 20 });
      y2 += 18;
    }

    // Design criteria table
    y2 += 20;
    y2 = sectionTitle(doc, "Design Criteria", MARGIN, y2);
    const criteria = [
      ["Building Code", p.buildingCode],
      ["Wind Load (Uw)", `${p.windLoadKPa} kPa`],
      ["Snow Load (Ss)", `${p.snowLoadKPa} kPa`],
      ["Glass Type", `${p.glassThicknessMm}mm Tempered Safety Glass`],
      ["Railing Profile", `LGR ${p.railingProfileMm}mm`],
      ["Post Section (Lumon)", `${p.lumonPostSectionMm}×${p.lumonPostSectionMm}mm`],
      ["Anchor", `${p.anchorType}, min. ${p.anchorEmbedmentMm}mm embedment`],
      ["Finish", p.finishColor],
    ];
    const tW = BODY_W * 0.5;
    const tRowH = 18;
    doc.rect(MARGIN, y2, tW, tRowH).fill(DARK);
    doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("Parameter", MARGIN + 8, y2 + 5, { width: tW * 0.45 });
    doc.fontSize(7.5).fillColor(GOLD).font("Helvetica-Bold").text("Value", MARGIN + tW * 0.45 + 8, y2 + 5, { width: tW * 0.55 - 16 });
    y2 += tRowH;
    for (let i = 0; i < criteria.length; i++) {
      doc.rect(MARGIN, y2, tW, tRowH).fill(i % 2 === 0 ? WHITE : LGRAY);
      doc.fontSize(7.5).fillColor(MID).font("Helvetica").text(criteria[i][0], MARGIN + 8, y2 + 5, { width: tW * 0.45 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(criteria[i][1], MARGIN + tW * 0.45 + 8, y2 + 5, { width: tW * 0.55 - 16 });
      y2 += tRowH;
    }
  }

  // ── L1.1 Plan on Post ─────────────────────────────────────────────────────
  addPage("L1.1", "Plan on Post — Lumon System Layout");
  {
    let y2 = BODY_TOP + 8;
    y2 = sectionTitle(doc, "Plan on Post", MARGIN, y2);
    drawPlanView(doc, p, MARGIN, y2, BODY_W, BODY_H - 60);
    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("SCALE: 1:75 (approx) | All dimensions in mm unless noted | Concept Only — Not For Construction", MARGIN, BODY_BOT - 10, { width: BODY_W });
  }

  // ── L2.1 Front Elevation ──────────────────────────────────────────────────
  addPage("L2.1", "Front Elevation — Sides 5–8");
  {
    let y2 = BODY_TOP + 8;
    y2 = sectionTitle(doc, "Front Elevation (Sides 5–8)", MARGIN, y2);
    drawFrontElevation(doc, p, MARGIN, y2, BODY_W, BODY_H - 60);
    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("SCALE: 1:40 (approx) | All dimensions in mm unless noted", MARGIN, BODY_BOT - 10, { width: BODY_W });
  }

  // ── L2.2 Side Elevations ──────────────────────────────────────────────────
  addPage("L2.2", "Side Elevations");
  {
    let y2 = BODY_TOP + 8;
    y2 = sectionTitle(doc, "Left Side Elevation", MARGIN, y2);
    drawSideElevation(doc, p, MARGIN, y2, BODY_W / 2 - 10, BODY_H / 2 - 20, "left");
    y2 = sectionTitle(doc, "Right Side Elevation", MARGIN + BODY_W / 2 + 10, BODY_TOP + 8);
    drawSideElevation(doc, p, MARGIN + BODY_W / 2 + 10, BODY_TOP + 8 + 26, BODY_W / 2 - 10, BODY_H / 2 - 20, "right");
    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("SCALE: 1:40 (approx) | All dimensions in mm unless noted", MARGIN, BODY_BOT - 10, { width: BODY_W });
  }

  // ── L3.1 Typical Section ──────────────────────────────────────────────────
  addPage("L3.1", "Typical Section — LGS Full Height");
  {
    let y2 = BODY_TOP + 8;
    y2 = sectionTitle(doc, "Typical Section — LGS Full Height", MARGIN, y2);
    drawTypicalSection(doc, p, MARGIN + BODY_W * 0.15, y2, BODY_W * 0.7, BODY_H - 70);
    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("SCALE: 1:15 (approx) | All dimensions in mm unless noted", MARGIN, BODY_BOT - 10, { width: BODY_W });
  }

  // ── L3.2 Connection Details ───────────────────────────────────────────────
  addPage("L3.2", "Connection Details");
  {
    const detW = BODY_W / 3 - 15;
    const detH = BODY_H - 80;
    const detY = BODY_TOP + 30;

    // Lower post connection
    sectionTitle(doc, "DET-01: Lower Post Connection", MARGIN, BODY_TOP + 8);
    // Simplified PDFKit detail
    const d1X = MARGIN + detW / 2;
    const d1BaseY = detY + detH - 30;
    // Slab
    doc.rect(MARGIN + 10, d1BaseY, detW - 20, 35).fill("#DDDDDD").stroke(DARK).strokeColor(DARK).lineWidth(0.8);
    doc.fontSize(7).fillColor(MID).font("Helvetica").text("CONC. SLAB", d1X - 20, d1BaseY + 12, { width: 40, align: "center" });
    // Post
    doc.rect(d1X - 20, detY + 30, 40, d1BaseY - detY - 30).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.2);
    doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`${p.lumonPostSectionMm}×${p.lumonPostSectionMm}`, d1X - 15, detY + 30 + (d1BaseY - detY - 30) / 2 - 6, { width: 30, align: "center" });
    // Anchor
    doc.rect(d1X - 3, d1BaseY + 5, 6, p.anchorEmbedmentMm * 0.3).fill(MID);
    doc.circle(d1X, d1BaseY + 5 + p.anchorEmbedmentMm * 0.3, 4).stroke(MID).strokeColor(MID).lineWidth(1.5);
    // FFL
    doc.moveTo(MARGIN + 5, d1BaseY).lineTo(MARGIN + detW - 5, d1BaseY).dash(4, { space: 2 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.5).undash();
    doc.fontSize(6.5).fillColor(DGRAY).font("Helvetica").text("F.F.L.", MARGIN + 6, d1BaseY - 10);
    // Dim
    doc.fontSize(6.5).fillColor(MID).font("Helvetica").text(`${p.anchorType}\nMin. ${p.anchorEmbedmentMm}mm emb.`, d1X + 12, d1BaseY + 10, { width: 90 });

    // Railing connection
    const d2X = MARGIN + detW + 15;
    sectionTitle(doc, "DET-02: Railing-to-Glass", d2X, BODY_TOP + 8);
    const d2CX = d2X + detW / 2;
    const d2Y = detY + 40;
    const d2RailH = p.railingProfileMm * 0.12;
    doc.rect(d2X + 10, d2Y, detW - 20, d2RailH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.5);
    doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`LGR ${p.railingProfileMm}mm`, d2CX - 20, d2Y + d2RailH / 2 - 4, { width: 40, align: "center" });
    // Glass channel
    doc.rect(d2CX - 5, d2Y + d2RailH, 10, 30).fill("#E8F0FF").stroke(BLUE).strokeColor(BLUE).lineWidth(0.8);
    doc.fontSize(6.5).fillColor(BLUE).font("Helvetica").text(`${p.glassThicknessMm}mm glass in channel`, d2CX + 10, d2Y + d2RailH + 10, { width: 80 });
    dimV(doc, d2X + 8, d2Y, d2Y + d2RailH, `${p.railingProfileMm}`);

    // Upper connection
    const d3X = MARGIN + (detW + 15) * 2;
    sectionTitle(doc, "DET-03: Upper Railing-to-Pergola", d3X, BODY_TOP + 8);
    const d3CX = d3X + detW / 2;
    const d3Y = detY + 30;
    // Pergola beam
    doc.rect(d3X + 10, d3Y, detW - 20, 35).dash(4, { space: 2 }).stroke(MGRAY).strokeColor(MGRAY).lineWidth(0.8).undash();
    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("PERGOLA BEAM\n(BY OTHERS)", d3CX - 25, d3Y + 8, { width: 50, align: "center" });
    // Bracket
    doc.rect(d3CX - 25, d3Y + 35, 50, 22).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.2);
    doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text("LGR UPPER\nBRACKET", d3CX - 20, d3Y + 38, { width: 40, align: "center" });
    // Fasteners
    doc.circle(d3CX - 12, d3Y + 46, 4).fill(MID);
    doc.circle(d3CX + 12, d3Y + 46, 4).fill(MID);
    doc.fontSize(6.5).fillColor(MID).font("Helvetica").text("M8 S/S fasteners (TBC)", d3CX + 30, d3Y + 42, { width: 80 });
    // Railing below
    const d3RailH = p.railingProfileMm * 0.12;
    doc.rect(d3X + 5, d3Y + 57, detW - 10, d3RailH).fill(LGRAY).stroke(DARK).strokeColor(DARK).lineWidth(1.5);
    doc.fontSize(7).fillColor(DARK).font("Helvetica-Bold").text(`LGR ${p.railingProfileMm}mm`, d3CX - 20, d3Y + 57 + d3RailH / 2 - 4, { width: 40, align: "center" });

    doc.fontSize(7).fillColor(DGRAY).font("Helvetica").text("SCALE: 1:5 (approx) | All dimensions in mm unless noted", MARGIN, BODY_BOT - 10, { width: BODY_W });
  }

  // ── L4.1 Bill of Materials / QTO ──────────────────────────────────────────
  addPage("L4.1", "Bill of Materials / Quantity Take-Off");
  {
    let y2 = BODY_TOP + 8;
    y2 = sectionTitle(doc, "Bill of Materials — Preliminary Estimate", MARGIN, y2);
    y2 = disclaimer(doc, "All quantities and costs are preliminary estimates only (CAD). Subject to field verification, Lumon Canada quotation, and licensed review prior to fabrication.", MARGIN, y2, BODY_W);
    drawQTOTable(doc, p, qtoItems, MARGIN, y2, BODY_W);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
