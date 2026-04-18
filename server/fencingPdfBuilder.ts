/**
 * fencingPdfBuilder.ts
 * TypeScript/PDFKit port of the Python ReportLab fencing PDF generator.
 * Produces a 16-sheet construction-grade package natively in Node.js.
 * No SVG→PNG conversion required — all drawing uses PDFKit primitives.
 */

import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import type { FencingParams } from "../shared/scopeTypes";

// ── Page geometry (US Letter, points) ────────────────────────────────────────
const PW = 612;
const PH = 792;
const MARGIN = 36;
const HEADER_H = 48;
const FOOTER_H = 28;
const TITLE_BLOCK_H = 64;
const BORDER_OUTER = 18;
const BORDER_INNER = 22;

// ── Colours ───────────────────────────────────────────────────────────────────
const GOLD   = "#C9A84C";
const DARK   = "#111111";
const MID    = "#333333";
const LGRAY  = "#F5F5F5";
const MGRAY  = "#CCCCCC";
const DGRAY  = "#666666";
const RED    = "#CC3333";
const BLUE   = "#1A4A8A";
const CREAM  = "#FFFDE7";
const WHITE  = "white";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FencingPdfOptions {
  params: FencingParams;
  projectName: string;
  clientName?: string;
  location?: string;
  preparedBy?: string;
  revision?: string;
  qtoItems: Array<{
    description: string;
    unit: string;
    qty: number;
    unitRate: number;
    lineTotal: number;
    group: string;
  }>;
  referencePhotoUrl?: string;   // R-01 site photo
  aiRenderingUrl?: string;      // R-02 AI rendering
}

// ── Utility: fetch image buffer ───────────────────────────────────────────────

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ── Helpers: unit conversion ──────────────────────────────────────────────────

function ftToM(ft: number): number { return Math.round(ft * 0.3048 * 100) / 100; }

// ── Page chrome helpers ───────────────────────────────────────────────────────

function drawPageBorder(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.strokeColor(DARK).lineWidth(1.5)
    .rect(BORDER_OUTER, BORDER_OUTER, PW - 2 * BORDER_OUTER, PH - 2 * BORDER_OUTER)
    .stroke();
  doc.strokeColor(DARK).lineWidth(0.4)
    .rect(BORDER_INNER, BORDER_INNER, PW - 2 * BORDER_INNER, PH - 2 * BORDER_INNER)
    .stroke();
  doc.restore();
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  sheetNum: string,
  sheetTitle: string,
  packageTitle: string,
  revision: string,
  date: string
) {
  // Black header band
  doc.rect(0, PH - HEADER_H, PW, HEADER_H).fill(DARK);
  // Gold top accent stripe
  doc.rect(0, PH - 4, PW, 4).fill(GOLD);

  // Logo circle
  const cx = MARGIN * 0.75;
  const cy = PH - HEADER_H / 2;
  doc.save();
  doc.strokeColor(GOLD).lineWidth(2).circle(cx, cy, 16).stroke();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9).text("EE", cx - 7, cy - 5);
  doc.restore();

  // Company name
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(11)
    .text("Eagle Eye Management Services", MARGIN + 10, PH - HEADER_H * 0.36 - 8);
  doc.fillColor(GOLD).font("Helvetica").fontSize(7.5)
    .text(packageTitle, MARGIN + 10, PH - HEADER_H * 0.66 - 5);

  // Sheet title right
  doc.fillColor("#AAAAAA").font("Helvetica").fontSize(8)
    .text(sheetTitle, MARGIN, PH - HEADER_H * 0.36 - 8, { align: "right", width: PW - MARGIN * 2 });
  doc.fillColor("#666666").font("Helvetica").fontSize(7)
    .text(`${revision}  |  ${date}`, MARGIN, PH - HEADER_H * 0.66 - 5, { align: "right", width: PW - MARGIN * 2 });

  // Gold separator line
  doc.strokeColor(GOLD).lineWidth(1).moveTo(0, PH - HEADER_H).lineTo(PW, PH - HEADER_H).stroke();
}

function drawFooter(doc: PDFKit.PDFDocument, preparedBy: string, date: string) {
  doc.rect(0, 0, PW, FOOTER_H).fill(DARK);
  doc.fillColor("#888888").font("Helvetica").fontSize(7)
    .text("© 2026 Eagle Eye Management Services", MARGIN, 10);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
    .text(`Prepared by: ${preparedBy}`, 0, 10, { align: "center", width: PW });
  doc.fillColor("#888888").font("Helvetica").fontSize(7)
    .text(date, 0, 10, { align: "right", width: PW - MARGIN });
}

function drawTitleBlock(
  doc: PDFKit.PDFDocument,
  sheetNum: string,
  sheetTitle: string,
  projectName: string,
  clientName: string,
  location: string,
  preparedBy: string,
  date: string,
  revision: string,
  scale = "NTS"
) {
  const tbY = FOOTER_H;
  const tbH = TITLE_BLOCK_H;

  doc.rect(0, tbY, PW, tbH).fill(DARK);

  // Gold top border
  doc.strokeColor(GOLD).lineWidth(1.5).moveTo(0, tbY + tbH).lineTo(PW, tbY + tbH).stroke();

  // Vertical dividers
  const lw1 = PW * 0.40;
  const lw2 = PW * 0.68;
  doc.strokeColor("#3A3A3A").lineWidth(0.5)
    .moveTo(lw1, tbY + 4).lineTo(lw1, tbY + tbH - 4).stroke()
    .moveTo(lw2, tbY + 4).lineTo(lw2, tbY + tbH - 4).stroke();

  // Left block — project info
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9)
    .text(projectName, MARGIN, tbY + tbH - 18);
  doc.fillColor(DGRAY).font("Helvetica").fontSize(7.5)
    .text(`${clientName}  —  ${location}`, MARGIN, tbY + tbH - 30);
  doc.fillColor("#555555").font("Helvetica").fontSize(6.5)
    .text(`Prepared by: ${preparedBy}`, MARGIN, tbY + tbH - 42)
    .text(`Date: ${date}  |  ${revision}`, MARGIN, tbY + tbH - 52);

  // Middle block
  const mx = lw1 + 10;
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10)
    .text(sheetTitle, mx, tbY + tbH - 20);
  doc.fillColor("#AAAAAA").font("Helvetica").fontSize(7)
    .text(`Scale: ${scale}   |   Drawn by: RD`, mx, tbY + tbH - 32);
  doc.fillColor("#666666").font("Helvetica").fontSize(6.5)
    .text("Eagle Eye Management Services", mx, tbY + tbH - 44)
    .text("All dims to be field verified prior to fabrication", mx, tbY + tbH - 54);

  // Right block — large sheet number
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(22)
    .text(sheetNum, lw2, tbY + tbH - 28, { align: "center", width: PW - lw2 });
  doc.fillColor("#888888").font("Helvetica").fontSize(6.5)
    .text("SHEET NO.", lw2, tbY + tbH - 40, { align: "center", width: PW - lw2 });
  doc.fillColor("#555555").font("Helvetica").fontSize(6)
    .text(revision, lw2, tbY + 10, { align: "center", width: PW - lw2 });
}

/** Returns { x0, y0, w, h } of the live drawing area. */
function pageSetup(
  doc: PDFKit.PDFDocument,
  sheetNum: string,
  sheetTitle: string,
  ctx: PageCtx,
  scale = "NTS"
): { x0: number; y0: number; w: number; h: number } {
  drawPageBorder(doc);
  drawHeader(doc, sheetNum, sheetTitle, ctx.packageTitle, ctx.revision, ctx.date);
  drawFooter(doc, ctx.preparedBy, ctx.date);
  drawTitleBlock(doc, sheetNum, sheetTitle, ctx.projectName, ctx.clientName, ctx.location, ctx.preparedBy, ctx.date, ctx.revision, scale);

  const x0 = MARGIN;
  const y0 = FOOTER_H + TITLE_BLOCK_H + 10;
  const w  = PW - 2 * MARGIN;
  const h  = PH - HEADER_H - FOOTER_H - TITLE_BLOCK_H - 20;
  return { x0, y0, w, h };
}

interface PageCtx {
  packageTitle: string;
  projectName: string;
  clientName: string;
  location: string;
  preparedBy: string;
  date: string;
  revision: string;
}

// ── Low-level drawing helpers ─────────────────────────────────────────────────

function dimLineH(doc: PDFKit.PDFDocument, x1: number, y: number, x2: number, text: string, color = GOLD, fs = 6.5) {
  doc.save();
  doc.strokeColor(color).lineWidth(0.6)
    .moveTo(x1, y).lineTo(x2, y).stroke();
  // Arrows
  doc.fillColor(color)
    .polygon([x1, y], [x1 + 5, y + 2], [x1 + 5, y - 2]).fill()
    .polygon([x2, y], [x2 - 5, y + 2], [x2 - 5, y - 2]).fill();
  doc.fillColor(color).font("Helvetica").fontSize(fs)
    .text(text, (x1 + x2) / 2 - 30, y + 2, { width: 60, align: "center" });
  doc.restore();
}

function dimLineV(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, text: string, color = GOLD, fs = 6.5) {
  doc.save();
  doc.strokeColor(color).lineWidth(0.6)
    .moveTo(x, y1).lineTo(x, y2).stroke();
  doc.fillColor(color)
    .polygon([x, y1], [x - 2, y1 + 5], [x + 2, y1 + 5]).fill()
    .polygon([x, y2], [x - 2, y2 - 5], [x + 2, y2 - 5]).fill();
  doc.save().translate(x - 18, (y1 + y2) / 2).rotate(-90);
  doc.fillColor(color).font("Helvetica").fontSize(fs).text(text, -20, 0, { width: 40, align: "center" });
  doc.restore();
  doc.restore();
}

function leader(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number, text: string, fs = 6.5, color = DGRAY) {
  doc.save();
  doc.strokeColor(color).lineWidth(0.5).moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.fillColor(color).circle(x1, y1, 1.5).fill();
  doc.fillColor(color).font("Helvetica").fontSize(fs);
  if (x2 > x1) {
    doc.text(text, x2 + 2, y2 - 4, { width: 100 });
  } else {
    doc.text(text, x2 - 102, y2 - 4, { width: 100, align: "right" });
  }
  doc.restore();
}

function meshFill(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, cell = 8, color = "#888888") {
  doc.save();
  doc.strokeColor(color).lineWidth(0.3);
  for (let xi = x; xi <= x + w; xi += cell) {
    doc.moveTo(xi, y).lineTo(xi, y + h).stroke();
  }
  for (let yi = y; yi <= y + h; yi += cell) {
    doc.moveTo(x, yi).lineTo(x + w, yi).stroke();
  }
  doc.restore();
}

function hatchRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, spacing = 4, color = MGRAY) {
  doc.save();
  doc.strokeColor(color).lineWidth(0.3);
  const diag = Math.sqrt(w * w + h * h);
  const steps = Math.ceil(diag / spacing) + 2;
  for (let i = -steps; i < steps * 2; i++) {
    const ox = i * spacing;
    // Clip to rect
    doc.moveTo(Math.max(x, x + ox), y)
       .lineTo(Math.min(x + w, x + ox + h), Math.min(y + h, y + (Math.min(x + w, x + ox + h) - (x + ox))));
  }
  // Simple diagonal lines without clipping (approximate)
  for (let i = -steps; i < steps * 2; i++) {
    const ox = i * spacing;
    doc.moveTo(x + ox, y).lineTo(x + ox - h, y + h).stroke();
  }
  doc.restore();
}

function sectionHeading(doc: PDFKit.PDFDocument, x: number, y: number, text: string) {
  doc.rect(x, y, 3, 14).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9).text(text, x + 8, y + 3);
}

function drawBorder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, lw = 1.0, color = DARK) {
  doc.save();
  doc.strokeColor(color).lineWidth(lw).rect(x, y, w, h).stroke();
  doc.restore();
}

// ── Cover elevation schematic ─────────────────────────────────────────────────

function drawCoverElevation(
  doc: PDFKit.PDFDocument,
  ex: number, ey: number, ew: number, eh: number,
  params: FencingParams
) {
  const runM = ftToM(params.runLengthFt);
  const heightM = ftToM(params.heightFt);
  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 0;
  const postSpacingM = ftToM(params.postSpacingFt);

  const scale = ew / (runM + 0.8);
  const fenceW = runM * scale;
  const fenceH = heightM * scale;
  const postS = postSpacingM * scale;
  const gateW = gateWidthM * scale;
  const postT = 7;

  const fx = ex + (ew - fenceW) / 2;
  const fy = ey + (eh - fenceH) / 2;

  // Slab
  doc.rect(ex, fy - 14, ew, 14).fill("#2A2A2A");
  doc.strokeColor("#888888").lineWidth(1.5).moveTo(ex, fy).lineTo(ex + ew, fy).stroke();

  // Overhead slab
  doc.rect(ex, fy + fenceH, ew, 12).fill("#2A2A2A");

  // Walls
  doc.rect(ex, fy, 18, fenceH + 12).fill("#333333");
  doc.rect(ex + ew - 18, fy, 18, fenceH + 12).fill("#333333");

  // Mesh fill
  meshFill(doc, fx, fy, fenceW, fenceH, 6, "#555555");

  // Posts
  const numPosts = Math.ceil(runM / postSpacingM) + 1;
  for (let i = 0; i < numPosts; i++) {
    const px = fx + i * postS;
    if (px > fx + fenceW + 1) break;
    doc.rect(px - postT / 2, fy, postT, fenceH).fill(DARK);
  }

  // Rails
  for (const ryOff of [0, fenceH * 0.48, fenceH - 5]) {
    doc.rect(fx, fy + ryOff, fenceW, 5).fill(DARK);
  }

  // Gate opening
  if (params.hasGate) {
    const gateX = fx + fenceW * 0.15;
    doc.rect(gateX, fy, gateW, fenceH).fill("#1A1A1A");
    meshFill(doc, gateX, fy, gateW, fenceH, 6, "#444444");
    // Gate posts
    for (const gp of [gateX, gateX + gateW]) {
      doc.rect(gp - postT / 2, fy, postT, fenceH).fill(DARK);
    }
    // Hinges
    doc.fillColor(GOLD);
    for (const hy of [fy + fenceH * 0.2, fy + fenceH * 0.8]) {
      doc.circle(gateX + postT / 2, hy, 3).fill();
    }
    // Latch
    doc.circle(gateX + gateW - postT / 2, fy + fenceH * 0.5, 3).fill();
  }

  // Outer frame
  doc.strokeColor(GOLD).lineWidth(0.75).rect(fx, fy, fenceW, fenceH).stroke();

  // Dimension strings
  dimLineH(doc, fx, fy + fenceH + 22, fx + fenceW, `${runM.toFixed(2)} m`, GOLD, 7);
  dimLineV(doc, fx - 22, fy, fy + fenceH, `${heightM.toFixed(2)} m`, GOLD, 7);
}

// ── Sheet 1: Cover Page ───────────────────────────────────────────────────────

function sheetCover(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  // Full black background
  doc.rect(0, 0, PW, PH).fill(DARK);

  // Subtle grid texture
  doc.save();
  doc.strokeColor("#1E1E1E").lineWidth(0.3);
  for (let gx = 0; gx < PW; gx += 24) doc.moveTo(gx, 0).lineTo(gx, PH).stroke();
  for (let gy = 0; gy < PH; gy += 24) doc.moveTo(0, gy).lineTo(PW, gy).stroke();
  doc.restore();

  // Gold accent stripes
  doc.rect(0, PH - 6, PW, 6).fill(GOLD);
  doc.rect(0, 0, PW, 4).fill(GOLD);

  drawFooter(doc, ctx.preparedBy, ctx.date);

  const midX = PW / 2;
  const brandTop = PH - 52;

  // Logo circle
  doc.strokeColor(GOLD).lineWidth(2.5).circle(midX, brandTop - 28, 28).stroke();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(14).text("EE", midX - 10, brandTop - 37);

  // Company name
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(20)
    .text("Eagle Eye Management Services", 0, brandTop - 72, { align: "center", width: PW });
  doc.fillColor(GOLD).font("Helvetica").fontSize(8.5)
    .text(ctx.packageTitle, 0, brandTop - 86, { align: "center", width: PW });

  // Gold divider
  doc.strokeColor(GOLD).lineWidth(1.5)
    .moveTo(MARGIN * 2, brandTop - 96).lineTo(PW - MARGIN * 2, brandTop - 96).stroke();

  // Project title
  const titleY = brandTop - 130;
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(26)
    .text(ctx.projectName, 0, titleY, { align: "center", width: PW });
  doc.fillColor("#BBBBBB").font("Helvetica").fontSize(11)
    .text(ctx.clientName, 0, titleY - 20, { align: "center", width: PW });
  doc.fillColor("#888888").font("Helvetica").fontSize(9)
    .text(ctx.location, 0, titleY - 36, { align: "center", width: PW });

  // Featured elevation graphic
  const evMargin = MARGIN * 3;
  const evW = PW - evMargin * 2;
  const evH = 140;
  const evX = evMargin;
  const evY = titleY - 56 - evH;

  doc.fillColor("#111111").strokeColor(GOLD).lineWidth(1)
    .rect(evX, evY, evW, evH).fillAndStroke();

  drawCoverElevation(doc, evX + 30, evY + 10, evW - 60, evH - 20, params);

  doc.fillColor("#888888").font("Helvetica").fontSize(7)
    .text("FRONT ELEVATION — SCHEMATIC", 0, evY - 10, { align: "center", width: PW });

  // Info box
  const boxY = evY - 90;
  const boxH = 72;
  const boxW = 300;
  const boxX = midX - boxW / 2;
  doc.fillColor("#141414").strokeColor(GOLD).lineWidth(1)
    .rect(boxX, boxY, boxW, boxH).fillAndStroke();
  doc.rect(boxX, boxY, 4, boxH).fill(GOLD);

  const rows: [string, string][] = [
    ["Prepared by:", ctx.preparedBy],
    ["Date:",        ctx.date],
    ["Revision:",    ctx.revision],
    ["Scope:",       "Secured Fencing Enclosure"],
  ];
  rows.forEach(([label, val], i) => {
    const ry = boxY + boxH - 16 - i * 16;
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5).text(label, boxX + 14, ry);
    doc.fillColor(WHITE).font("Helvetica").fontSize(7.5).text(val, boxX + 96, ry);
  });

  // Drawing index
  const idxY = boxY - 18;
  doc.fillColor("#888888").font("Helvetica-Bold").fontSize(6.5)
    .text("DRAWING INDEX", 0, idxY, { align: "center", width: PW });
  doc.strokeColor("#333333").lineWidth(0.5)
    .moveTo(MARGIN * 2, idxY - 6).lineTo(PW - MARGIN * 2, idxY - 6).stroke();

  const sheets: [string, string][] = [
    ["C-01", "Cover Page"],
    ["A-01", "Quantity Take-Off"],
    ["S-01", "General Notes & Scope"],
    ["S-02", "Existing Conditions"],
    ["S-03", "Plan View"],
    ["S-04", "Front Elevation"],
    ["S-05", "Left Side Elevation"],
    ["S-06", "Right Side Elevation"],
    ["S-07", "Overhead Clearance Diagram"],
    ["S-08", "Construction Details (DET-01–04)"],
    ["S-09", "Construction Details (DET-05–08)"],
    ["S-10", "Material & Component Schedule"],
    ["S-11", "Door & Hardware Schedule"],
    ["S-12", "Site Verification Sheet"],
  ];
  const half = Math.ceil(sheets.length / 2);
  const col1X = midX - 190;
  const col2X = midX + 10;
  for (let ci = 0; ci < 2; ci++) {
    const colSheets = ci === 0 ? sheets.slice(0, half) : sheets.slice(half);
    const cx2 = ci === 0 ? col1X : col2X;
    colSheets.forEach(([snum, stitle], ri) => {
      const sy = idxY - 12 - ri * 10;
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(6).text(snum, cx2, sy);
      doc.fillColor("#888888").font("Helvetica").fontSize(6).text(stitle, cx2 + 34, sy);
    });
  }
}

// ── Sheet 2: QTO ──────────────────────────────────────────────────────────────

function sheetQTO(
  doc: PDFKit.PDFDocument,
  ctx: PageCtx,
  qtoItems: FencingPdfOptions["qtoItems"]
) {
  const { x0, y0, w, h } = pageSetup(doc, "A-01", "Preliminary Quantity Take-Off", ctx);

  // Disclaimer banner
  doc.rect(x0, y0 + h - 22, w, 18).fill(CREAM);
  doc.strokeColor(GOLD).lineWidth(0.5).rect(x0, y0 + h - 22, w, 18).stroke();
  doc.fillColor(GOLD).font("Helvetica-Oblique").fontSize(7)
    .text("⚠  All quantities and costs are preliminary estimates only (CAD). Subject to field verification and licensed structural review.",
      x0 + 8, y0 + h - 16, { width: w - 16 });

  const colW = [w * 0.44, w * 0.10, w * 0.12, w * 0.17, w * 0.17];
  const headers = ["Description", "Unit", "Qty", "Unit Rate (CAD)", "Line Total"];

  let curY = y0 + h - 32;
  const rowH = 16;
  let grandTotal = 0;

  // Group by group field
  const groups = Array.from(new Set(qtoItems.map(i => i.group)));

  for (const groupName of groups) {
    const items = qtoItems.filter(i => i.group === groupName);
    curY -= 6;

    // Group header
    doc.rect(x0, curY - 2, w, rowH).fill("#E8E8E8");
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text(groupName, x0 + 6, curY + 4);
    curY -= rowH;

    // Column headers
    doc.rect(x0, curY - 2, w, rowH).fill(DARK);
    let cx = x0;
    headers.forEach((hdr, i) => {
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7);
      if (i === 0) doc.text(hdr, cx + 4, curY + 4, { width: colW[i] - 8 });
      else if (i >= 2) doc.text(hdr, cx + 4, curY + 4, { width: colW[i] - 8, align: "right" });
      else doc.text(hdr, cx + 4, curY + 4, { width: colW[i] - 8 });
      cx += colW[i];
    });
    curY -= rowH;

    // Rows
    items.forEach((item, ri) => {
      grandTotal += item.lineTotal;
      doc.rect(x0, curY - 2, w, rowH).fill(ri % 2 === 0 ? WHITE : LGRAY);

      cx = x0;
      doc.fillColor(DARK).font("Helvetica").fontSize(7.5)
        .text(item.description, cx + 4, curY + 4, { width: colW[0] - 8 }); cx += colW[0];
      doc.fillColor(DGRAY).font("Helvetica").fontSize(7)
        .text(item.unit, cx + 4, curY + 4, { width: colW[1] - 8 }); cx += colW[1];
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5)
        .text(String(item.qty), cx + 4, curY + 4, { width: colW[2] - 8, align: "right" }); cx += colW[2];
      doc.fillColor(DARK).font("Helvetica").fontSize(7.5)
        .text(`$${item.unitRate.toFixed(2)}`, cx + 4, curY + 4, { width: colW[3] - 8, align: "right" }); cx += colW[3];
      doc.font("Helvetica-Bold").fontSize(7.5)
        .text(`$${item.lineTotal.toFixed(2)}`, cx + 4, curY + 4, { width: colW[4] - 8, align: "right" });

      doc.strokeColor(MGRAY).lineWidth(0.3)
        .moveTo(x0, curY - 2).lineTo(x0 + w, curY - 2).stroke();
      curY -= rowH;
    });
    curY -= 4;
  }

  // Grand total
  curY -= 8;
  doc.rect(x0, curY - 2, w, rowH + 4).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
    .text("BUDGET TOTAL (excl. GST)", x0 + 8, curY + 5, { width: w / 2 });
  doc.text(`$${grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, x0 + 8, curY + 5, { width: w - 16, align: "right" });

  // Footnote
  doc.fillColor(DGRAY).font("Helvetica-Oblique").fontSize(6.5)
    .text("* Budget estimate only. All quantities and rates require field verification and supplier confirmation prior to tender.",
      x0, curY - 16, { width: w });
}

// ── Sheet 3: General Notes ────────────────────────────────────────────────────

function sheetGeneralNotes(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-01", "General Notes & Scope of Work", ctx);

  const colW = (w - 12) / 2;
  const col2X = x0 + colW + 12;

  const finishLabel = params.finish === "black_pc" ? "Powder Coat Black (RAL 9005)"
    : params.finish === "galvanised" ? "Hot-Dip Galvanised" : "Custom Powder Coat";
  const anchorLabel = params.anchorMethod === "base_plate_epoxy" ? "Epoxy Anchor System"
    : params.anchorMethod === "core_drill_set" ? "Core-Drill Set Anchor System" : "Surface-Mount Anchor System";

  const sectionsLeft: [string, string[]][] = [
    ["1. SCOPE OF WORK", [
      "Supply and install a secured welded wire mesh fencing enclosure",
      "to form a bicycle storage room within an existing underground",
      "parkade.",
      "",
      "Work includes: SHS steel frame posts and rails, welded wire mesh",
      "infill panels, powder coat finish (black), base plate anchoring",
      "to existing concrete slab, and one (1) hinged access gate with",
      "latch, lock prep, and hardware.",
    ]],
    ["2. FIELD VERIFICATION", [
      "Contractor shall verify ALL dimensions on site prior to fabrication.",
      "Do not scale drawings. Report discrepancies to Eagle Eye",
      "Management Services before proceeding.",
      "",
      "Verify: slab condition, overhead clearances (ducts, sprinklers,",
      "lighting), column/wall positions, and existing services.",
    ]],
    ["3. CONTRACTOR COORDINATION", [
      "Coordinate with building management for access, working hours,",
      "and protection of existing finishes.",
      "",
      "Notify general contractor of any conflicts with existing MEP",
      "services. Obtain all required permits before commencing work.",
    ]],
    ["4. ANCHOR VERIFICATION", [
      `Anchor design to be verified by a licensed structural engineer`,
      `prior to installation. Minimum embedment depth: 100 mm.`,
      "",
      `${anchorLabel} — follow manufacturer's instructions`,
      "for hole preparation, cleaning, and curing.",
    ]],
  ];

  const sectionsRight: [string, string[]][] = [
    ["5. FINISH REQUIREMENTS", [
      "All steel to be hot-dip galvanized or blast-cleaned to Sa 2.5",
      "before powder coat application.",
      "",
      `${finishLabel} — minimum 60 μm DFT.`,
      "Touch-up all welds and cut edges after fabrication.",
    ]],
    ["6. MEP COORDINATION", [
      "Do not penetrate, cut, or relocate any mechanical, electrical,",
      "or plumbing services without written approval.",
      "",
      "Maintain minimum 150 mm clearance from overhead sprinkler heads.",
      "Coordinate with fire protection consultant if fence line conflicts",
      "with sprinkler coverage zones.",
    ]],
    ["7. FABRICATION & TOLERANCES", [
      "All welding to CSA W59. Grind all exposed welds smooth.",
      "Frame squareness tolerance: ±3 mm over full length.",
      "Post plumb tolerance: ±2 mm per metre of height.",
      "",
      "Mesh panels to be factory-welded, not field-assembled.",
      "Panel frames to be fully welded, not bolted.",
    ]],
    ["8. COMPLIANCE", [
      "Work to comply with NBC 2020, BCBC 2018, and all applicable",
      "municipal bylaws and strata regulations.",
      "",
      "Provide as-built drawings and maintenance manual on completion.",
      "All hardware to be commercial grade, minimum Grade 316 SS",
      "for fasteners in contact with treated materials.",
    ]],
  ];

  function drawNotesCol(sections: [string, string[]][], cx: number, startY: number) {
    let cy = startY;
    for (const [title, lines] of sections) {
      cy -= 4;
      sectionHeading(doc, cx, cy, title);
      cy -= 18;
      for (const line of lines) {
        if (line === "") {
          cy -= 4;
        } else {
          doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(line, cx + 6, cy, { width: colW - 12 });
          cy -= 11;
        }
      }
      cy -= 6;
    }
  }

  drawNotesCol(sectionsLeft, x0, y0 + h - 8);
  drawNotesCol(sectionsRight, col2X, y0 + h - 8);

  // Vertical divider
  doc.strokeColor(MGRAY).lineWidth(0.5)
    .moveTo(x0 + colW + 6, y0 + 10).lineTo(x0 + colW + 6, y0 + h - 10).stroke();
}

// ── Sheet 4: Existing Conditions ──────────────────────────────────────────────

function sheetExistingConditions(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-02", "Existing Conditions — Parkade Level P1", ctx, "1:50");

  const runM = ftToM(params.runLengthFt);
  const heightM = ftToM(params.heightFt);

  const dw = w * 0.72;
  const dh = h * 0.68;
  const dx = x0 + (w - dw) / 2;
  const dy = y0 + (h - dh) / 2 + 10;

  // Parkade floor
  doc.rect(dx, dy, dw, dh).fill("#F0F0F0");
  doc.strokeColor("#BBBBBB").lineWidth(0.5).rect(dx, dy, dw, dh).stroke();

  // Concrete walls
  const wallT = 14;
  doc.rect(dx, dy + dh - wallT, dw, wallT).fill("#CCCCCC");
  doc.rect(dx, dy, wallT, dh).fill("#CCCCCC");
  doc.rect(dx + dw - wallT, dy, wallT, dh).fill("#CCCCCC");
  hatchRect(doc, dx, dy + dh - wallT, dw, wallT, 5, "#999999");
  hatchRect(doc, dx, dy, wallT, dh, 5, "#999999");
  hatchRect(doc, dx + dw - wallT, dy, wallT, dh, 5, "#999999");

  // Columns
  const colPositions: [number, number][] = [
    [dx + wallT + 30, dy + dh - wallT - 30],
    [dx + dw - wallT - 30, dy + dh - wallT - 30],
  ];
  for (const [cpx, cpy] of colPositions) {
    doc.fillColor("#AAAAAA").circle(cpx, cpy, 12).fill();
    doc.strokeColor(DARK).lineWidth(1).circle(cpx, cpy, 12).stroke();
  }

  // Drive aisle CL
  doc.strokeColor(RED).lineWidth(0.75).dash(8, { space: 4 });
  const clY = dy + dh * 0.35;
  doc.moveTo(dx - 20, clY).lineTo(dx + dw + 20, clY).stroke();
  doc.undash();
  doc.fillColor(RED).font("Helvetica-Bold").fontSize(6).text("DRIVE AISLE C/L", dx + dw + 4, clY - 2);

  // Proposed fence zone
  const fzX = dx + wallT + 8;
  const fzY = dy + wallT + 8;
  const fzW = dw - 2 * wallT - 16;
  const fzH = dh * 0.52;
  doc.strokeColor(GOLD).lineWidth(1.2).dash(6, { space: 3 });
  doc.rect(fzX, fzY, fzW, fzH).stroke();
  doc.undash();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
    .text("PROPOSED FENCING", fzX, fzY + fzH / 2 - 14, { width: fzW, align: "center" })
    .text("ENCLOSURE ZONE", fzX, fzY + fzH / 2 - 4, { width: fzW, align: "center" });

  // Existing bike racks
  const brX = fzX + fzW * 0.3;
  const brY = fzY + fzH * 0.3;
  doc.rect(brX, brY, 40, 12).fill("#DDDDDD");
  doc.strokeColor(DGRAY).lineWidth(0.5).rect(brX, brY, 40, 12).stroke();
  doc.fillColor(DGRAY).font("Helvetica").fontSize(5.5).text("EXIST. BIKE RACKS", brX, brY + 4, { width: 40, align: "center" });

  // Overhead obstruction zone
  const obsY = dy + dh - wallT - 50;
  doc.rect(dx + wallT + 8, obsY, dw - 2 * wallT - 16, 30).fill("#FFFDE7");
  doc.strokeColor("#FFCC00").lineWidth(0.75).dash(4, { space: 2 });
  doc.rect(dx + wallT + 8, obsY, dw - 2 * wallT - 16, 30).stroke();
  doc.undash();
  doc.fillColor("#AA6600").font("Helvetica-Bold").fontSize(5.5)
    .text("OVERHEAD DUCT / SPRINKLER ZONE", dx + wallT + 8, obsY + 18, { width: dw - 2 * wallT - 16, align: "center" })
    .text("VERIFY CLEARANCES ON SITE", dx + wallT + 8, obsY + 8, { width: dw - 2 * wallT - 16, align: "center" });

  // Dimensions
  dimLineH(doc, dx + wallT, dy + dh + 18, dx + dw - wallT, `${runM.toFixed(2)} m (FENCE RUN)`, GOLD);
  dimLineV(doc, dx - 22, dy + wallT, dy + wallT + fzH, `${heightM.toFixed(2)} m HT.`, GOLD);

  // Leaders
  leader(doc, dx + wallT + 8, dy + wallT + 8, dx - 10, dy + wallT - 20, "CONCRETE SLAB (EXIST.)");
  leader(doc, colPositions[0][0], colPositions[0][1], colPositions[0][0] - 30, colPositions[0][1] + 25, "EXIST. CONC. COLUMN");

  // Legend
  const legX = dx + dw + 18;
  let legY = dy + dh - 10;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("LEGEND", legX, legY);
  legY -= 14;
  const legendItems: [string, string][] = [
    [MGRAY, "Existing Concrete Wall"],
    [GOLD, "Proposed Fence Zone"],
    [RED, "Drive Aisle C/L"],
    ["#FFCC00", "Overhead Obstruction Zone"],
  ];
  for (const [col, lbl] of legendItems) {
    doc.rect(legX, legY, 10, 8).fill(col);
    doc.fillColor(DARK).font("Helvetica").fontSize(6.5).text(lbl, legX + 14, legY + 1);
    legY -= 14;
  }

  // North arrow
  const naX = dx + dw / 2;
  const naY = dy - 28;
  doc.fillColor(DARK).polygon([naX, naY + 14], [naX - 6, naY], [naX, naY + 4]).fill();
  doc.fillColor(WHITE).polygon([naX, naY + 14], [naX + 6, naY], [naX, naY + 4]).fill();
  doc.strokeColor(DARK).lineWidth(0.75).circle(naX, naY + 7, 10).stroke();
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("N", naX - 3, naY + 20);
}

// ── Sheet 5: Plan View ────────────────────────────────────────────────────────

function sheetPlan(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-03", "Plan View — Fencing Layout", ctx, "1:25");

  const runM = ftToM(params.runLengthFt);
  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 0;
  const postSpacingM = ftToM(params.postSpacingFt);

  const dw = w * 0.80;
  const dh = h * 0.72;
  const dx = x0 + (w - dw) / 2;
  const dy = y0 + (h - dh) / 2 + 8;

  const scale = dw / (runM + 1.0);
  const fenceW = runM * scale;
  const fenceD = 0.12 * scale * 8;
  const postS = postSpacingM * scale;
  const gateW = gateWidthM * scale;

  const fx = dx + (dw - fenceW) / 2;
  const fy = dy + dh * 0.35;

  // Concrete slab background
  doc.rect(dx, dy, dw, dh).fill("#F2F2F2");

  // Back wall
  const wallT = 16;
  doc.rect(dx, dy + dh - wallT, dw, wallT).fill("#CCCCCC");
  hatchRect(doc, dx, dy + dh - wallT, dw, wallT, 5, "#999999");

  // Left wall
  doc.rect(dx, dy, wallT, dh).fill("#CCCCCC");
  hatchRect(doc, dx, dy, wallT, dh, 5, "#999999");

  // Right column
  const colR = 14;
  const colCX = dx + dw - wallT - 20;
  const colCY = fy + fenceD / 2;
  doc.fillColor("#BBBBBB").circle(colCX, colCY, colR).fill();
  doc.strokeColor(DARK).lineWidth(1).circle(colCX, colCY, colR).stroke();

  // Fence line
  doc.strokeColor(DARK).lineWidth(3).moveTo(fx, fy).lineTo(fx + fenceW, fy).stroke();

  // Posts (plan view squares)
  const postSize = 6;
  const numPosts = Math.ceil(runM / postSpacingM) + 1;
  const postsX: number[] = [];
  for (let i = 0; i < numPosts; i++) {
    const px = fx + i * postS;
    if (px > fx + fenceW + 1) break;
    postsX.push(px);
  }
  postsX.push(fx + fenceW);

  for (const px of postsX) {
    doc.rect(px - postSize / 2, fy - postSize / 2, postSize, postSize).fill(DARK);
  }

  // Gate opening
  if (params.hasGate) {
    const gateX = fx + fenceW * 0.15;
    doc.rect(gateX, fy - postSize / 2, gateW, postSize).fill(WHITE);
    doc.strokeColor(GOLD).lineWidth(1.5).rect(gateX, fy - postSize / 2, gateW, postSize).stroke();
    // Gate swing arc
    doc.strokeColor(GOLD).lineWidth(0.75).dash(4, { space: 2 });
    doc.moveTo(gateX, fy).lineTo(gateX + gateW, fy - gateW).lineTo(gateX + gateW, fy).stroke();
    doc.undash();
    dimLineH(doc, gateX, fy + 44, gateX + gateW, `${gateWidthM.toFixed(2)} m GATE`, GOLD);
  }

  // Mesh fill behind fence line
  meshFill(doc, fx, fy - fenceD, fenceW, fenceD, 6, "#AAAAAA");
  doc.strokeColor(DARK).lineWidth(0.5).rect(fx, fy - fenceD, fenceW, fenceD).stroke();

  // Post tags
  postsX.forEach((px, i) => {
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(5.5).text(`P${i + 1}`, px - 5, fy + 10, { width: 10, align: "center" });
  });

  // Dimensions
  dimLineH(doc, fx, fy + 28, fx + fenceW, `${runM.toFixed(2)} m OVERALL`, GOLD);
  dimLineH(doc, fx, fy - fenceD - 18, fx + postS, `${postSpacingM.toFixed(2)} m TYP.`, GOLD);

  // Keynotes
  doc.fillColor(DARK).circle(fx - 16, fy, 7).fill();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(6).text("1", fx - 19, fy - 4);

  // Keynote legend
  let legY = dy - 38;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("KEYNOTES", dx + 4, legY);
  legY -= 13;
  const knotes: [string, string][] = [
    ["1", "End Post — See DET-02"],
    ["2", "Gate Post — See DET-05"],
    ["3", "Mesh Panel — See DET-04"],
  ];
  for (const [num, txt] of knotes) {
    doc.fillColor(DARK).circle(dx + 10, legY + 3, 6).fill();
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(6).text(num, dx + 7, legY);
    doc.fillColor(DARK).font("Helvetica").fontSize(6.5).text(txt, dx + 20, legY);
    legY -= 13;
  }

  // Scale bar
  const sbX = dx + dw / 2 - 40;
  const sbY = dy - 22;
  doc.fillColor(DARK).font("Helvetica").fontSize(6).text("SCALE 1:25", 0, sbY + 10, { align: "center", width: PW });
  for (let i = 0; i < 5; i++) {
    doc.rect(sbX + i * 16, sbY, 16, 6).fill(i % 2 === 0 ? DARK : WHITE);
    doc.strokeColor(DARK).lineWidth(0.5).rect(sbX + i * 16, sbY, 16, 6).stroke();
  }
  for (let i = 0; i <= 5; i++) {
    doc.fillColor(DARK).font("Helvetica").fontSize(5.5).text(`${i}m`, sbX + i * 16 - 4, sbY - 6);
  }
}

// ── Sheet 6: Front Elevation ──────────────────────────────────────────────────

function sheetFrontElevation(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-04", "Front Elevation — Drive Aisle View", ctx, "1:25");

  const runM = ftToM(params.runLengthFt);
  const heightM = ftToM(params.heightFt);
  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 0;
  const postSpacingM = ftToM(params.postSpacingFt);
  const fs = params.frameSectionMm;

  const dw = w * 0.82;
  const dh = h * 0.50;
  const dx = x0 + (w - dw) / 2 + 10;
  const dy = y0 + h * 0.28;

  const scale = dw / (runM + 1.2);
  const fenceW = runM * scale;
  const fenceH = heightM * scale;
  const postS = postSpacingM * scale;
  const gateW = gateWidthM * scale;
  const postT = 8;

  const fx = dx + (dw - fenceW) / 2;
  const fy = dy + (dh - fenceH) / 2;

  // Project info block at top
  const infoTop = y0 + h - 4;
  const infoH = 72;
  const infoY = infoTop - infoH;
  doc.rect(x0, infoY, w, infoH).fill("#F5F5F5");
  doc.strokeColor("#CCCCCC").lineWidth(0.5).rect(x0, infoY, w, infoH).stroke();
  doc.rect(x0, infoY, 4, infoH).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
    .text("FRONT ELEVATION — DRIVE AISLE VIEW", x0 + 12, infoY + infoH - 16);
  doc.fillColor(DGRAY).font("Helvetica").fontSize(7.5)
    .text(`Welded wire mesh security enclosure, ${params.finish === "black_pc" ? "powder coat black" : "galvanised"}, floor-anchored SHS posts`,
      x0 + 12, infoY + infoH - 28);

  const paramsLeft: [string, string][] = [
    ["Overall Run Length:", `${runM.toFixed(2)} m`],
    ["Fence Height:", `${heightM.toFixed(2)} m`],
    ["Post Spacing (TYP):", `${postSpacingM.toFixed(2)} m`],
  ];
  const paramsRight: [string, string][] = [
    ["Gate Width:", `${gateWidthM.toFixed(2)} m`],
    ["Frame Section:", `${fs}×${fs}×3 SHS`],
    ["Finish:", params.finish === "black_pc" ? "Powder Coat Black — RAL 9005" : "Hot-Dip Galvanised"],
  ];
  let rowY = infoY + infoH - 44;
  for (let i = 0; i < paramsLeft.length; i++) {
    const [lbl, val] = paramsLeft[i];
    const [lbl2, val2] = paramsRight[i];
    doc.fillColor(DGRAY).font("Helvetica").fontSize(7).text(lbl, x0 + 12, rowY);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text(val, x0 + 112, rowY);
    doc.fillColor(DGRAY).font("Helvetica").fontSize(7).text(lbl2, x0 + w * 0.45, rowY);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text(val2, x0 + w * 0.45 + 80, rowY);
    rowY -= 11;
  }

  // Slab / ground
  doc.rect(dx, fy - 18, dw, 18).fill("#DDDDDD");
  hatchRect(doc, dx, fy - 18, dw, 18, 5, "#AAAAAA");
  doc.strokeColor(DARK).lineWidth(1.5).moveTo(dx, fy).lineTo(dx + dw, fy).stroke();

  // Walls
  doc.rect(dx, fy, 20, fenceH + 20).fill("#CCCCCC");
  hatchRect(doc, dx, fy, 20, fenceH + 20, 5, "#999999");
  doc.rect(dx + dw - 20, fy, 20, fenceH + 20).fill("#CCCCCC");
  hatchRect(doc, dx + dw - 20, fy, 20, fenceH + 20, 5, "#999999");

  // Overhead slab
  doc.rect(dx, fy + fenceH, dw, 16).fill("#CCCCCC");
  hatchRect(doc, dx, fy + fenceH, dw, 16, 5, "#999999");

  // Mesh fill
  meshFill(doc, fx, fy, fenceW, fenceH, 7, "#AAAAAA");

  // Posts
  const numPosts = Math.ceil(runM / postSpacingM) + 1;
  const postsX: number[] = [];
  for (let i = 0; i < numPosts; i++) {
    const px = fx + i * postS;
    if (px > fx + fenceW + 1) break;
    postsX.push(px);
  }
  if (postsX.length === 0 || Math.abs(postsX[postsX.length - 1] - (fx + fenceW)) > 2) {
    postsX.push(fx + fenceW);
  }

  for (const px of postsX) {
    doc.rect(px - postT / 2, fy, postT, fenceH).fill(DARK);
  }

  // Rails
  for (const ry of [fy, fy + fenceH * 0.5, fy + fenceH - 5]) {
    doc.rect(fx, ry, fenceW, 5).fill(DARK);
  }

  // Gate
  if (params.hasGate) {
    const gateX = fx + postS * 0.5;
    doc.rect(gateX, fy, gateW, fenceH - 5).fill("#E8E8E8");
    meshFill(doc, gateX + 3, fy + 3, gateW - 6, fenceH - 11, 7, "#BBBBBB");
    doc.strokeColor(DARK).lineWidth(2).rect(gateX, fy, gateW, fenceH - 5).stroke();
    // Latch
    doc.rect(gateX + gateW - 6, fy + fenceH * 0.45 - 5, 6, 10).fill(GOLD);
    // Hinges
    for (const hy of [fy + fenceH * 0.2, fy + fenceH * 0.7]) {
      doc.fillColor(GOLD).circle(gateX + 3, hy, 4).fill();
    }
    dimLineH(doc, gateX, fy + fenceH + 44, gateX + gateW, `${gateWidthM.toFixed(2)} m GATE`, GOLD);
  }

  // Base plates
  for (const px of postsX) {
    doc.rect(px - 10, fy - 6, 20, 6).fill(GOLD);
  }

  // Dimensions
  dimLineH(doc, fx, fy + fenceH + 28, fx + fenceW, `${runM.toFixed(2)} m OVERALL`, GOLD);
  dimLineV(doc, fx + fenceW + 22, fy, fy + fenceH, `${heightM.toFixed(2)} m HT.`, GOLD);
  dimLineH(doc, fx, fy - 30, fx + postS, `${postSpacingM.toFixed(2)} m TYP.`, GOLD);

  // Post labels
  postsX.forEach((px, i) => {
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(5.5).text(`P${i + 1}`, px - 5, fy + fenceH + 10, { width: 10, align: "center" });
  });

  // Leaders
  leader(doc, fx + fenceW * 0.3, fy + fenceH * 0.5, fx - 30, fy + fenceH * 0.5 + 10, "MESH INFILL");
  leader(doc, fx + postS, fy + fenceH * 0.8, fx + postS + 30, fy + fenceH * 0.8 + 20, `SHS ${fs}×${fs}×3 POST`);
  leader(doc, fx + fenceW * 0.6, fy + fenceH - 3, fx + fenceW * 0.6 + 20, fy + fenceH + 10, "TOP RAIL");
  if (postsX.length > 1) {
    leader(doc, postsX[1] - 10, fy - 3, postsX[1] - 30, fy - 20, "BASE PLATE — See DET-01");
  }

  // Elevation notes block
  const notesY = y0 + 10;
  const notesH = 72;
  doc.rect(x0, notesY, w, notesH).fill("#F5F5F5");
  doc.strokeColor("#CCCCCC").lineWidth(0.5).rect(x0, notesY, w, notesH).stroke();
  doc.rect(x0, notesY, 4, notesH).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7.5).text("ELEVATION NOTES", x0 + 12, notesY + notesH - 14);
  const elevNotes = [
    "1. All dimensions are in metres unless noted otherwise.",
    "2. Verify all dimensions on site prior to fabrication. Report discrepancies to Eagle Eye before proceeding.",
    `3. All steel sections: SHS ${fs}×${fs}×3 posts and rails, ${params.finish === "black_pc" ? "powder coat black (RAL 9005)" : "hot-dip galvanised"} unless noted.`,
    "4. Mesh infill: welded wire mesh, finish to match frame.",
    "5. Base plates: 150×150×10PL, 4× M12 anchors @ 75mm from edges. See DET-01.",
    "6. Gate hardware: drop latch + padlock hasp + access control prep. See DET-05, DET-06.",
  ];
  let ny = notesY + notesH - 26;
  for (const note of elevNotes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(6).text(note, x0 + 12, ny, { width: w - 24 });
    ny -= 9;
  }
}

// ── Sheet 7: Left Side Elevation ──────────────────────────────────────────────

function sheetLeftElevation(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-05", "Left Side Elevation — Depth View", ctx, "1:25");

  const heightM = ftToM(params.heightFt);
  const depthM = 1.0; // typical enclosure depth ~1m
  const fs = params.frameSectionMm;

  const dw = w * 0.55;
  const dh = h * 0.60;
  const dx = x0 + (w - dw) / 2;
  const dy = y0 + (h - dh) / 2 + 10;

  const scaleX = dw / (depthM + 0.4);
  const scaleY = dh / (heightM + 0.4);
  const fenceD = depthM * scaleX;
  const fenceH = heightM * scaleY;

  const fx = dx + (dw - fenceD) / 2;
  const fy = dy + (dh - fenceH) / 2;

  // Slab
  doc.rect(dx, fy - 16, dw, 16).fill("#DDDDDD");
  hatchRect(doc, dx, fy - 16, dw, 16, 5, "#AAAAAA");
  doc.strokeColor(DARK).lineWidth(1.5).moveTo(dx, fy).lineTo(dx + dw, fy).stroke();

  // Back wall (left in side view)
  doc.rect(fx - 20, fy, 20, fenceH + 16).fill("#CCCCCC");
  hatchRect(doc, fx - 20, fy, 20, fenceH + 16, 5, "#999999");

  // Overhead slab
  doc.rect(dx, fy + fenceH, dw, 16).fill("#CCCCCC");
  hatchRect(doc, dx, fy + fenceH, dw, 16, 5, "#999999");

  // Mesh fill (side view — vertical lines)
  meshFill(doc, fx, fy, fenceD, fenceH, 7, "#AAAAAA");

  // Front post
  doc.rect(fx + fenceD - fs * scaleX / 2, fy, fs * scaleX, fenceH).fill(DARK);

  // Rails (horizontal in side view)
  for (const ry of [fy, fy + fenceH * 0.5, fy + fenceH - 5]) {
    doc.rect(fx, ry, fenceD, 5).fill(DARK);
  }

  // Base plate
  doc.rect(fx + fenceD - 10, fy - 6, 20, 6).fill(GOLD);

  // Dimensions
  dimLineH(doc, fx, fy + fenceH + 28, fx + fenceD, `${depthM.toFixed(2)} m DEPTH`, GOLD);
  dimLineV(doc, fx + fenceD + 22, fy, fy + fenceH, `${heightM.toFixed(2)} m HT.`, GOLD);

  // Leaders
  leader(doc, fx + fenceD / 2, fy + fenceH * 0.5, fx + fenceD + 30, fy + fenceH * 0.5 + 10, "MESH INFILL");
  leader(doc, fx + fenceD - fs * scaleX / 2, fy + fenceH * 0.8, fx + fenceD + 30, fy + fenceH * 0.8 + 20, `SHS ${fs}×${fs}×3 POST`);
  leader(doc, fx + fenceD / 2, fy - 3, fx + fenceD + 30, fy - 20, "TOP RAIL");

  // Notes
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("NOTES:", x0, y0 + 10);
  const notes = [
    "1. Side elevation shows typical enclosure depth (approx. 1.0 m).",
    "2. Verify actual depth on site prior to fabrication.",
    "3. Back wall connection: clip angle to concrete wall — See DET-03.",
  ];
  let ny = y0 + 22;
  for (const n of notes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(n, x0, ny, { width: w });
    ny += 11;
  }
}

// ── Sheet 8: Right Side Elevation ─────────────────────────────────────────────

function sheetRightElevation(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-06", "Right Side Elevation — Column Tie-In", ctx, "1:25");

  const heightM = ftToM(params.heightFt);
  const depthM = 1.0;
  const fs = params.frameSectionMm;

  const dw = w * 0.55;
  const dh = h * 0.60;
  const dx = x0 + (w - dw) / 2;
  const dy = y0 + (h - dh) / 2 + 10;

  const scaleX = dw / (depthM + 0.4);
  const scaleY = dh / (heightM + 0.4);
  const fenceD = depthM * scaleX;
  const fenceH = heightM * scaleY;

  const fx = dx + (dw - fenceD) / 2;
  const fy = dy + (dh - fenceH) / 2;

  // Slab
  doc.rect(dx, fy - 16, dw, 16).fill("#DDDDDD");
  hatchRect(doc, dx, fy - 16, dw, 16, 5, "#AAAAAA");
  doc.strokeColor(DARK).lineWidth(1.5).moveTo(dx, fy).lineTo(dx + dw, fy).stroke();

  // Concrete column (right side)
  doc.fillColor("#AAAAAA").circle(fx + fenceD + 20, fy + fenceH / 2, 20).fill();
  doc.strokeColor(DARK).lineWidth(1).circle(fx + fenceD + 20, fy + fenceH / 2, 20).stroke();

  // Overhead slab
  doc.rect(dx, fy + fenceH, dw, 16).fill("#CCCCCC");
  hatchRect(doc, dx, fy + fenceH, dw, 16, 5, "#999999");

  // Mesh fill
  meshFill(doc, fx, fy, fenceD, fenceH, 7, "#AAAAAA");

  // End post
  doc.rect(fx + fenceD - fs * scaleX / 2, fy, fs * scaleX, fenceH).fill(DARK);

  // Clip angle to column
  doc.rect(fx + fenceD, fy + fenceH * 0.3, 12, 8).fill(GOLD);

  // Rails
  for (const ry of [fy, fy + fenceH * 0.5, fy + fenceH - 5]) {
    doc.rect(fx, ry, fenceD, 5).fill(DARK);
  }

  // Base plate
  doc.rect(fx + fenceD - 10, fy - 6, 20, 6).fill(GOLD);

  // Dimensions
  dimLineH(doc, fx, fy + fenceH + 28, fx + fenceD, `${depthM.toFixed(2)} m DEPTH`, GOLD);
  dimLineV(doc, fx + fenceD + 50, fy, fy + fenceH, `${heightM.toFixed(2)} m HT.`, GOLD);

  // Leaders
  leader(doc, fx + fenceD + 20, fy + fenceH / 2, fx + fenceD + 60, fy + fenceH / 2 + 20, "EXIST. CONC. COLUMN");
  leader(doc, fx + fenceD, fy + fenceH * 0.3 + 4, fx + fenceD + 60, fy + fenceH * 0.3 - 10, "75×75×6 CLIP ANGLE — See DET-07");
  leader(doc, fx + fenceD - fs * scaleX / 2, fy + fenceH * 0.7, fx - 30, fy + fenceH * 0.7 + 10, `SHS ${fs}×${fs}×3 END POST`);

  // Notes
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("NOTES:", x0, y0 + 10);
  const notes = [
    "1. Right side elevation shows column tie-in connection.",
    "2. Clip angle: 75×75×6 EA, 2× M12 Hilti HIT-RE500 per angle.",
    "3. Verify column face position on site. See DET-07 for detail.",
  ];
  let ny = y0 + 22;
  for (const n of notes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(n, x0, ny, { width: w });
    ny += 11;
  }
}

// ── Sheet 9: Overhead Clearance ───────────────────────────────────────────────

function sheetOverheadClearance(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-07", "Overhead Clearance Diagram — Plan View", ctx, "1:50");

  const runM = ftToM(params.runLengthFt);

  const dw = w * 0.75;
  const dh = h * 0.70;
  const dx = x0 + (w - dw) / 2;
  const dy = y0 + (h - dh) / 2 + 8;

  // Parkade floor
  doc.rect(dx, dy, dw, dh).fill("#F2F2F2");

  // Walls
  const wallT = 14;
  doc.rect(dx, dy + dh - wallT, dw, wallT).fill("#CCCCCC");
  hatchRect(doc, dx, dy + dh - wallT, dw, wallT, 5, "#999999");
  doc.rect(dx, dy, wallT, dh).fill("#CCCCCC");
  hatchRect(doc, dx, dy, wallT, dh, 5, "#999999");
  doc.rect(dx + dw - wallT, dy, wallT, dh).fill("#CCCCCC");
  hatchRect(doc, dx + dw - wallT, dy, wallT, dh, 5, "#999999");

  // Overhead duct
  const ductY = dy + dh * 0.72;
  const ductH = 24;
  doc.rect(dx + wallT, ductY, dw - 2 * wallT, ductH).fill("#E3F2FD");
  doc.strokeColor(BLUE).lineWidth(1).rect(dx + wallT, ductY, dw - 2 * wallT, ductH).stroke();
  doc.fillColor(BLUE).font("Helvetica-Bold").fontSize(6.5)
    .text("OVERHEAD HVAC DUCT — VERIFY INVERT ELEVATION", dx + wallT, ductY + 9, { width: dw - 2 * wallT, align: "center" });

  // Sprinkler heads
  const sprY = dy + dh * 0.60;
  for (const sx of [dx + dw * 0.25, dx + dw * 0.50, dx + dw * 0.75]) {
    doc.fillColor(RED).circle(sx, sprY, 5).fill();
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(5).text("SPK", sx - 6, sprY - 10);
    doc.strokeColor(RED).lineWidth(0.75).dash(3, { space: 2 }).circle(sx, sprY, 14).stroke();
    doc.undash();
  }

  // Proposed fence zone
  const fzX = dx + wallT + 8;
  const fzY = dy + wallT + 8;
  const fzW = dw - 2 * wallT - 16;
  const fzH = dh * 0.45;
  doc.strokeColor(GOLD).lineWidth(1.5).dash(6, { space: 3 });
  doc.rect(fzX, fzY, fzW, fzH).stroke();
  doc.undash();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7)
    .text("PROPOSED FENCE ZONE", fzX, fzY + fzH / 2, { width: fzW, align: "center" });

  // Clearance dimension
  dimLineV(doc, dx + dw * 0.5, fzY + fzH, sprY - 5, "MIN. 150 mm CLR.", RED);

  // Conflict zone
  const confY = ductY - 10;
  doc.rect(fzX, confY, fzW, 20).fill("#FFEBEE");
  doc.strokeColor(RED).lineWidth(1).rect(fzX, confY, fzW, 20).stroke();
  doc.fillColor(RED).font("Helvetica-Bold").fontSize(6)
    .text("POTENTIAL CONFLICT ZONE — VERIFY ON SITE", fzX, confY + 7, { width: fzW, align: "center" });

  // Notes
  let notesY = dy - 10;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("NOTES:", dx, notesY);
  notesY -= 12;
  const notes = [
    "1. Contractor to verify all overhead clearances prior to fabrication.",
    "2. Maintain minimum 150 mm clearance from all sprinkler heads.",
    "3. Coordinate with mechanical engineer if duct conflicts with fence height.",
    "4. All dimensions shown are approximate — field verify.",
  ];
  for (const n of notes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(n, dx, notesY, { width: dw });
    notesY -= 11;
  }

  // Legend
  const legX = dx + dw + 14;
  let legY = dy + dh - 10;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("LEGEND", legX, legY);
  legY -= 14;
  const legendItems: [string, string][] = [
    [GOLD, "Proposed Fence Zone"],
    [BLUE, "HVAC Duct"],
    [RED, "Sprinkler Head"],
    ["#FFEBEE", "Conflict Zone"],
  ];
  for (const [col, lbl] of legendItems) {
    doc.rect(legX, legY, 10, 8).fill(col);
    doc.fillColor(DARK).font("Helvetica").fontSize(6.5).text(lbl, legX + 14, legY + 1);
    legY -= 14;
  }
}

// ── Sheet 10: Construction Details (DET-01 to DET-04) ─────────────────────────

function sheetDetails1(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-08", "Construction Details — DET-01 to DET-04", ctx, "NTS");

  const cellW = w / 2 - 6;
  const cellH = h / 2 - 6;
  const fs = params.frameSectionMm;

  function detFrame(cx: number, cy: number, cw: number, ch: number, num: string, title: string) {
    doc.rect(cx, cy + ch - 18, cw, 18).fill(DARK);
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8).text(`DET-${num}  ${title}`, cx + 6, cy + ch - 12, { width: cw - 12 });
    doc.strokeColor(MGRAY).lineWidth(0.75).rect(cx, cy, cw, ch).stroke();
  }

  // DET-01: Base Plate (bottom-left)
  const bx = x0, by = y0;
  detFrame(bx, by, cellW, cellH, "01", "BASE PLATE DETAIL");
  drawDetBasePlate(doc, bx + cellW / 2, by + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-02: End Post to Wall (bottom-right)
  const bx2 = x0 + cellW + 12;
  detFrame(bx2, by, cellW, cellH, "02", "END POST TO WALL");
  drawDetEndPostWall(doc, bx2 + cellW / 2, by + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-03: End Post to Column (top-left)
  const tx = x0, ty = y0 + cellH + 12;
  detFrame(tx, ty, cellW, cellH, "03", "END POST TO COLUMN");
  drawDetEndPostColumn(doc, tx + cellW / 2, ty + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-04: Mesh Panel to Rail (top-right)
  const tx2 = x0 + cellW + 12;
  detFrame(tx2, ty, cellW, cellH, "04", "MESH PANEL TO RAIL");
  drawDetMeshPanel(doc, tx2 + cellW / 2, ty + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);
}

function drawDetBasePlate(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Slab
  doc.rect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s * 0.25).fill("#DDDDDD");
  hatchRect(doc, cx - s * 0.6, cy - s * 0.5, s * 1.2, s * 0.25, 4, "#AAAAAA");
  doc.strokeColor(DARK).lineWidth(1).moveTo(cx - s * 0.6, cy - s * 0.25).lineTo(cx + s * 0.6, cy - s * 0.25).stroke();
  // Base plate
  doc.rect(cx - s * 0.3, cy - s * 0.25, s * 0.6, s * 0.06).fill(DARK);
  // Post stub
  doc.rect(cx - s * 0.08, cy - s * 0.25 + s * 0.06, s * 0.16, s * 0.55).fill(DARK);
  // Anchor bolts
  for (const ax of [cx - s * 0.18, cx + s * 0.18]) {
    doc.strokeColor(DARK).lineWidth(1.5).moveTo(ax, cy - s * 0.5).lineTo(ax, cy - s * 0.19).stroke();
    doc.fillColor(DARK).circle(ax, cy - s * 0.19, 3).fill();
  }
  // Grout bed
  doc.rect(cx - s * 0.28, cy - s * 0.25, s * 0.56, s * 0.04).fill("#FFFDE7");
  // Weld symbol
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7).text("⌒ WELD", cx + s * 0.1, cy - s * 0.18);
  // Labels
  leader(doc, cx - s * 0.3, cy - s * 0.22, cx - s * 0.6, cy - s * 0.35, `${fs}×${fs}×3 SHS POST`);
  leader(doc, cx, cy - s * 0.22, cx + s * 0.5, cy - s * 0.35, "150×150×10PL BASE PLATE");
  leader(doc, cx, cy - s * 0.47, cx + s * 0.5, cy - s * 0.55, "M12 EPOXY ANCHOR ×4");
}

function drawDetEndPostWall(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Wall
  doc.rect(cx - s * 0.6, cy - s * 0.5, s * 0.2, s).fill("#CCCCCC");
  hatchRect(doc, cx - s * 0.6, cy - s * 0.5, s * 0.2, s, 4, "#999999");
  // Post
  doc.rect(cx - s * 0.08, cy - s * 0.5, s * 0.16, s).fill(DARK);
  // Clip angle
  doc.rect(cx - s * 0.4, cy - s * 0.1, s * 0.32, s * 0.08).fill(GOLD);
  // Anchor
  doc.strokeColor(DARK).lineWidth(1.5).moveTo(cx - s * 0.5, cy - s * 0.06).lineTo(cx - s * 0.4, cy - s * 0.06).stroke();
  doc.fillColor(DARK).circle(cx - s * 0.5, cy - s * 0.06, 3).fill();
  // Labels
  leader(doc, cx - s * 0.08, cy, cx + s * 0.4, cy + s * 0.1, `SHS ${fs}×${fs}×3 POST`);
  leader(doc, cx - s * 0.4, cy - s * 0.06, cx + s * 0.4, cy - s * 0.2, "75×75×6 CLIP ANGLE");
  leader(doc, cx - s * 0.5, cy - s * 0.06, cx - s * 0.6, cy - s * 0.3, "M12 HILTI ANCHOR ×2");
}

function drawDetEndPostColumn(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Circular column
  doc.fillColor("#AAAAAA").circle(cx - s * 0.35, cy, s * 0.25).fill();
  doc.strokeColor(DARK).lineWidth(1).circle(cx - s * 0.35, cy, s * 0.25).stroke();
  // Post
  doc.rect(cx - s * 0.08, cy - s * 0.5, s * 0.16, s).fill(DARK);
  // Clip angle
  doc.rect(cx - s * 0.4, cy - s * 0.1, s * 0.32, s * 0.08).fill(GOLD);
  // Labels
  leader(doc, cx - s * 0.35, cy, cx + s * 0.4, cy + s * 0.1, "EXIST. CONC. COLUMN");
  leader(doc, cx - s * 0.08, cy, cx + s * 0.4, cy - s * 0.1, `SHS ${fs}×${fs}×3 END POST`);
  leader(doc, cx - s * 0.4, cy - s * 0.06, cx + s * 0.4, cy - s * 0.25, "75×75×6 CLIP ANGLE");
}

function drawDetMeshPanel(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Top rail
  doc.rect(cx - s * 0.5, cy - s * 0.45, s, s * 0.08).fill(DARK);
  // Bottom rail
  doc.rect(cx - s * 0.5, cy + s * 0.37, s, s * 0.08).fill(DARK);
  // Mesh fill
  meshFill(doc, cx - s * 0.5, cy - s * 0.37, s, s * 0.74, 6, "#888888");
  // Tie wire
  for (const mx of [cx - s * 0.25, cx, cx + s * 0.25]) {
    doc.fillColor(GOLD).circle(mx, cy - s * 0.37, 2).fill();
    doc.fillColor(GOLD).circle(mx, cy + s * 0.37, 2).fill();
  }
  // Labels
  leader(doc, cx - s * 0.5, cy - s * 0.41, cx - s * 0.6, cy - s * 0.55, `SHS ${fs}×${fs}×3 TOP RAIL`);
  leader(doc, cx - s * 0.5, cy + s * 0.41, cx - s * 0.6, cy + s * 0.55, `SHS ${fs}×${fs}×3 BOT. RAIL`);
  leader(doc, cx, cy, cx + s * 0.5, cy + s * 0.1, "WELDED WIRE MESH INFILL");
  leader(doc, cx, cy - s * 0.37, cx + s * 0.5, cy - s * 0.5, "3mm GALV. TIE WIRE @ 300 c/c");
}

// ── Sheet 11: Construction Details (DET-05 to DET-08) ─────────────────────────

function sheetDetails2(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-09", "Construction Details — DET-05 to DET-08", ctx, "NTS");

  const cellW = w / 2 - 6;
  const cellH = h / 2 - 6;
  const fs = params.frameSectionMm;

  function detFrame(cx: number, cy: number, cw: number, ch: number, num: string, title: string) {
    doc.rect(cx, cy + ch - 18, cw, 18).fill(DARK);
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8).text(`DET-${num}  ${title}`, cx + 6, cy + ch - 12, { width: cw - 12 });
    doc.strokeColor(MGRAY).lineWidth(0.75).rect(cx, cy, cw, ch).stroke();
  }

  // DET-05: Gate Post & Hinge (bottom-left)
  const bx = x0, by = y0;
  detFrame(bx, by, cellW, cellH, "05", "GATE POST & HINGE");
  drawDetGateHinge(doc, bx + cellW / 2, by + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-06: Gate Latch & Lock (bottom-right)
  const bx2 = x0 + cellW + 12;
  detFrame(bx2, by, cellW, cellH, "06", "GATE LATCH & LOCK PREP");
  drawDetGateLatch(doc, bx2 + cellW / 2, by + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-07: Column Tie-In (top-left)
  const tx = x0, ty = y0 + cellH + 12;
  detFrame(tx, ty, cellW, cellH, "07", "COLUMN TIE-IN (PLAN SECTION)");
  drawDetColumnTieIn(doc, tx + cellW / 2, ty + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);

  // DET-08: Top Rail Cap (top-right)
  const tx2 = x0 + cellW + 12;
  detFrame(tx2, ty, cellW, cellH, "08", "TOP RAIL & CAP PLATE");
  drawDetTopRailCap(doc, tx2 + cellW / 2, ty + cellH * 0.45, cellW * 0.55, cellH * 0.55, fs);
}

function drawDetGateHinge(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Gate post
  doc.rect(cx - s * 0.08, cy - s * 0.5, s * 0.16, s).fill(DARK);
  // Hinge plates
  for (const hy of [cy - s * 0.2, cy + s * 0.2]) {
    doc.rect(cx - s * 0.08, hy - s * 0.04, s * 0.3, s * 0.08).fill(GOLD);
    doc.fillColor(GOLD).circle(cx + s * 0.22, hy, s * 0.05).fill();
  }
  // Gate leaf
  doc.rect(cx + s * 0.22, cy - s * 0.5, s * 0.08, s).fill(DARK);
  // Labels
  leader(doc, cx - s * 0.08, cy, cx - s * 0.5, cy + s * 0.1, `SHS ${fs}×${fs}×3 GATE POST`);
  leader(doc, cx + s * 0.22, cy - s * 0.2, cx + s * 0.5, cy - s * 0.35, "WELD-ON HINGE — 100×75mm");
  leader(doc, cx + s * 0.22, cy, cx + s * 0.5, cy + s * 0.1, "GATE LEAF");
}

function drawDetGateLatch(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Gate post (strike side)
  doc.rect(cx + s * 0.1, cy - s * 0.5, s * 0.16, s).fill(DARK);
  // Latch body
  doc.rect(cx - s * 0.2, cy - s * 0.06, s * 0.3, s * 0.12).fill(GOLD);
  // Drop bar
  doc.rect(cx - s * 0.05, cy + s * 0.06, s * 0.1, s * 0.3).fill(GOLD);
  // Strike plate
  doc.rect(cx + s * 0.1, cy - s * 0.04, s * 0.06, s * 0.08).fill(GOLD);
  // Padlock hasp
  doc.rect(cx - s * 0.1, cy - s * 0.18, s * 0.2, s * 0.1).fill("#888888");
  // Labels
  leader(doc, cx - s * 0.2, cy, cx - s * 0.5, cy + s * 0.1, "DROP LATCH — 200mm");
  leader(doc, cx - s * 0.05, cy + s * 0.2, cx - s * 0.5, cy + s * 0.3, "DROP BAR");
  leader(doc, cx - s * 0.1, cy - s * 0.13, cx - s * 0.5, cy - s * 0.25, "PADLOCK HASP");
  leader(doc, cx + s * 0.1, cy, cx + s * 0.5, cy + s * 0.1, "STRIKE PLATE — WELD-ON");
}

function drawDetColumnTieIn(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Concrete column (plan section)
  doc.fillColor("#AAAAAA").circle(cx + s * 0.3, cy, s * 0.2).fill();
  doc.strokeColor(DARK).lineWidth(1).circle(cx + s * 0.3, cy, s * 0.2).stroke();
  // End post
  doc.rect(cx - s * 0.08, cy - s * 0.4, s * 0.16, s * 0.8).fill(DARK);
  // Clip angle
  doc.rect(cx + s * 0.08, cy - s * 0.06, s * 0.22, s * 0.12).fill(GOLD);
  // Anchors
  for (const ay of [cy - s * 0.15, cy + s * 0.15]) {
    doc.fillColor(DARK).circle(cx + s * 0.22, ay, 3).fill();
  }
  // Labels
  leader(doc, cx + s * 0.3, cy, cx + s * 0.6, cy + s * 0.1, "EXIST. CONC. COLUMN");
  leader(doc, cx - s * 0.08, cy, cx - s * 0.5, cy + s * 0.1, `SHS ${fs}×${fs}×3 END POST`);
  leader(doc, cx + s * 0.08, cy, cx - s * 0.5, cy - s * 0.2, "75×75×6 CLIP ANGLE");
  leader(doc, cx + s * 0.22, cy - s * 0.15, cx + s * 0.6, cy - s * 0.3, "M12 HILTI ANCHOR ×2");
}

function drawDetTopRailCap(doc: PDFKit.PDFDocument, cx: number, cy: number, dw: number, dh: number, fs: number) {
  const s = Math.min(dw, dh) * 0.8;
  // Post top
  doc.rect(cx - s * 0.08, cy - s * 0.5, s * 0.16, s * 0.7).fill(DARK);
  // Top rail
  doc.rect(cx - s * 0.5, cy + s * 0.1, s, s * 0.1).fill(DARK);
  // Cap plate
  doc.rect(cx - s * 0.14, cy - s * 0.5, s * 0.28, s * 0.08).fill(GOLD);
  // Weld symbol
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10).text("⌒", cx - s * 0.05, cy + s * 0.1);
  // Mesh top edge
  doc.strokeColor("#888888").lineWidth(1.5).moveTo(cx - s * 0.5, cy + s * 0.1).lineTo(cx + s * 0.5, cy + s * 0.1).stroke();
  // Labels
  leader(doc, cx - s * 0.08, cy - s * 0.2, cx + s * 0.4, cy - s * 0.3, `SHS ${fs}×${fs}×3 POST`);
  leader(doc, cx - s * 0.14, cy - s * 0.46, cx - s * 0.5, cy - s * 0.55, `${fs + 20}×${fs + 20}×6 CAP PLATE`);
  leader(doc, cx + s * 0.1, cy + s * 0.15, cx + s * 0.5, cy + s * 0.3, `SHS ${fs}×${fs}×3 TOP RAIL`);
  leader(doc, cx - s * 0.5, cy + s * 0.1, cx - s * 0.6, cy + s * 0.3, "MESH WIRE TOP EDGE");
}

// ── Sheet 12: Material Schedule ───────────────────────────────────────────────

function sheetMaterialSchedule(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-10", "Material & Component Schedule", ctx);

  const runM = ftToM(params.runLengthFt);
  const heightM = ftToM(params.heightFt);
  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 0;
  const gateHeightM = params.hasGate ? ftToM(params.gateHeightFt) : 0;
  const postSpacingM = ftToM(params.postSpacingFt);
  const fenceRunWithoutGate = params.hasGate ? Math.max(0, runM - gateWidthM) : runM;
  const postCount = Math.ceil(fenceRunWithoutGate / postSpacingM) + 1 + (params.hasGate ? 2 : 0);
  const railLm = fenceRunWithoutGate * 3;
  const meshArea = fenceRunWithoutGate * heightM;
  const finishLabel = params.finish === "black_pc" ? "Powder Coat Black (RAL 9005)"
    : params.finish === "galvanised" ? "Hot-Dip Galvanised (AS/NZS 4680)" : "Custom Powder Coat";
  const fs = params.frameSectionMm;

  const headers = ["ITEM", "DESCRIPTION", "SPECIFICATION", "FINISH", "QTY", "UNIT", "REMARKS"];
  const colWidths = [w * 0.05, w * 0.20, w * 0.22, w * 0.16, w * 0.05, w * 0.05, w * 0.27];
  const rows: string[][] = [
    ["01", "Fence Post", `${fs}×${fs}×3 SHS — G350`, finishLabel, String(postCount), "ea", "Incl. end, intermediate, gate posts"],
    ["02", "Top Rail", `${fs}×${fs}×3 SHS — G350`, finishLabel, String(Math.round(railLm / 3 * 10) / 10), "lm", "At top of fence"],
    ["03", "Mid Rail", `${fs}×${fs}×3 SHS — G350`, finishLabel, String(Math.round(railLm / 3 * 10) / 10), "lm", "At mid-height"],
    ["04", "Bottom Rail", `${fs}×${fs}×3 SHS — G350`, finishLabel, String(Math.round(railLm / 3 * 10) / 10), "lm", "At floor level"],
    ["05", "Welded Wire Mesh Infill", "50×50×4mm WWM — G350", finishLabel, String(Math.round(meshArea * 10) / 10), "m²", "Factory-welded panels"],
    ["06", "Base Plate", `150×150×10PL — G350`, finishLabel, String(postCount), "ea", "4× M12 anchors per plate"],
    ["07", "Epoxy Anchor", "M12 × 130mm — Hilti HIT-HY 270", "N/A — Galv.", String(postCount * 4), "ea", "Min. 100mm embedment"],
    ["08", "Non-Shrink Grout", "Masterflow 928 or approved equal", "N/A", String(postCount), "ea", "Under all base plates"],
    ["09", "Cap Plate", `${fs + 20}×${fs + 20}×6PL`, finishLabel, String(postCount), "ea", "Welded to top of each post"],
    ...(params.hasGate ? [
      ["10", "Gate Frame", `${fs}×${fs}×3 SHS — welded construction`, finishLabel, "1", "ea", `~${gateWidthM.toFixed(2)}m W × ${gateHeightM.toFixed(2)}m H`],
      ["11", "Gate Mesh Infill", "50×50×4mm WWM", finishLabel, "1", "ea", "Factory-welded to gate frame"],
      ["12", "Gate Hinges", "Weld-on 100×75mm — heavy duty", finishLabel, "3", "ea", "3 per leaf"],
      ["13", "Drop Latch", "200mm drop bar — 316 SS", finishLabel, "1", "ea", "With padlock hasp"],
      ["14", "Padlock Hasp", "Heavy duty — 65mm shackle — 316 SS", "316 SS", "1", "ea", "Owner to supply lock"],
    ] : []),
  ];

  let curY = y0 + h - 8;
  sectionHeading(doc, x0, curY - 14, "MATERIAL & COMPONENT SCHEDULE");
  curY -= 28;

  // Table header
  const rowH = 18;
  doc.rect(x0, curY - rowH + 4, w, rowH).fill(DARK);
  let cx = x0;
  for (let i = 0; i < headers.length; i++) {
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7).text(headers[i], cx + 4, curY - 10, { width: colWidths[i] - 8 });
    cx += colWidths[i];
  }
  curY -= rowH;

  // Rows
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    doc.rect(x0, curY - rowH + 4, w, rowH).fill(ri % 2 === 0 ? WHITE : LGRAY);
    cx = x0;
    for (let ci = 0; ci < row.length; ci++) {
      if (ci === 0 || ci === 4 || ci === 5) {
        doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5).text(row[ci], cx + 4, curY - 10, { width: colWidths[ci] - 8, align: "center" });
      } else {
        doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(row[ci], cx + 4, curY - 10, { width: colWidths[ci] - 8 });
      }
      cx += colWidths[ci];
    }
    doc.strokeColor(MGRAY).lineWidth(0.3).moveTo(x0, curY - rowH + 4).lineTo(x0 + w, curY - rowH + 4).stroke();
    curY -= rowH;
  }

  drawBorder(doc, x0, curY + 4, w, y0 + h - 8 - 28 - (curY + 4), 0.75, DARK);

  // Notes
  curY -= 16;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("NOTES:", x0, curY);
  curY -= 12;
  const notes = [
    "1. All steel sections to be Grade 350W unless otherwise noted.",
    "2. All welding to CSA W59. Grind all exposed welds smooth.",
    `3. Powder coat finish: Dulux Interpon D1000 or approved equal, RAL 9005 Jet Black, min. 60μm DFT.`,
    "4. Quantities are approximate. Contractor to verify all quantities on site prior to ordering.",
  ];
  for (const n of notes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(n, x0, curY, { width: w });
    curY -= 11;
  }

  // Fabrication spec block
  const fabY = y0 + 12;
  const fabH = 130;
  doc.rect(x0, fabY, w, fabH).fill("#F5F5F5");
  doc.strokeColor("#CCCCCC").lineWidth(0.5).rect(x0, fabY, w, fabH).stroke();
  doc.rect(x0, fabY, 4, fabH).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("FABRICATION & INSTALLATION SPECIFICATION", x0 + 12, fabY + fabH - 16);
  const fabSpecs: [string, string][] = [
    ["Steel Grade:", "Grade 350W to CSA G40.21 for all structural sections"],
    ["Welding Standard:", "CSA W59 — all structural welds. Grind exposed welds smooth."],
    ["Surface Prep:", "SSPC-SP6 Commercial Blast prior to powder coat application"],
    ["Powder Coat:", "Dulux Interpon D1000 or approved equal, RAL 9005 Jet Black, min. 60μm DFT"],
    ["Anchor System:", "Hilti HIT-HY 270 epoxy anchor system, M12 rods, min. 130mm embedment"],
    ["Anchor Approval:", "Contractor to submit anchor design calc to EOR prior to installation"],
    ["Shop Drawings:", "Submit for review min. 10 business days prior to fabrication start"],
    ["Field Verification:", "Contractor to verify all dimensions on site. See S-12 Site Verification Sheet."],
    ["MEP Coordination:", "Contractor to coordinate with mechanical/electrical trades re: overhead clearances"],
    ["Tolerances:", "Overall run ±3mm; post plumb ±1mm/m; gate operation: 90° swing min."],
    ["Warranty:", "Fabricator to provide 2-year warranty on workmanship; powder coat per manufacturer"],
  ];
  let fy2 = fabY + fabH - 32;
  for (const [lbl, val] of fabSpecs) {
    doc.fillColor(DGRAY).font("Helvetica").fontSize(6.5).text(lbl, x0 + 12, fy2, { width: 120 });
    doc.fillColor(DARK).font("Helvetica").fontSize(6.5).text(val, x0 + 140, fy2, { width: w - 152 });
    fy2 -= 10;
  }
}

// ── Sheet 13: Door & Hardware Schedule ────────────────────────────────────────

function sheetDoorSchedule(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-11", "Door & Hardware Schedule", ctx);

  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 1.22;
  const gateHeightM = params.hasGate ? ftToM(params.gateHeightFt) : 2.44;
  const fs = params.frameSectionMm;
  const finishLabel = params.finish === "black_pc" ? "Powder Coat Black" : "Hot-Dip Galvanised";

  let curY = y0 + h - 8;
  sectionHeading(doc, x0, curY - 14, "DOOR SCHEDULE");
  curY -= 28;

  const dHeaders = ["Door No.", "Size (W×H)", "Frame Type", "Material", "Finish", "Remarks"];
  const dColW = [w * 0.10, w * 0.16, w * 0.18, w * 0.16, w * 0.16, w * 0.24];
  const dRows = [
    ["D-01", `${(gateWidthM * 1000).toFixed(0)}×${(gateHeightM * 1000).toFixed(0)}mm`, `SHS ${fs}×${fs}×3 Welded`, "Steel", finishLabel, "Single leaf, hinged, mesh infill"],
  ];

  const rowH = 18;
  doc.rect(x0, curY - rowH + 4, w, rowH).fill(DARK);
  let cx = x0;
  for (let i = 0; i < dHeaders.length; i++) {
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7).text(dHeaders[i], cx + 4, curY - 10, { width: dColW[i] - 8 });
    cx += dColW[i];
  }
  curY -= rowH;

  for (let ri = 0; ri < dRows.length; ri++) {
    doc.rect(x0, curY - rowH + 4, w, rowH).fill(ri % 2 === 0 ? LGRAY : WHITE);
    cx = x0;
    for (let ci = 0; ci < dRows[ri].length; ci++) {
      doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(dRows[ri][ci], cx + 4, curY - 10, { width: dColW[ci] - 8 });
      cx += dColW[ci];
    }
    doc.strokeColor(MGRAY).lineWidth(0.3).moveTo(x0, curY - rowH + 4).lineTo(x0 + w, curY - rowH + 4).stroke();
    curY -= rowH;
  }
  drawBorder(doc, x0, curY + 4, w, y0 + h - 8 - 28 - (curY + 4), 0.75);
  curY -= 20;

  // Hardware schedule
  sectionHeading(doc, x0, curY - 14, "HARDWARE SCHEDULE — DOOR D-01");
  curY -= 28;

  const hHeaders = ["Item", "Description", "Specification", "Material", "Qty", "Remarks"];
  const hColW = [w * 0.08, w * 0.22, w * 0.26, w * 0.14, w * 0.06, w * 0.24];
  const hRows = [
    ["H-01", "Hinges", "Heavy duty weld-on, 100×75mm", "Steel / PC Black", "3", "3 per leaf, weld-on"],
    ["H-02", "Drop Latch", "Latch bolt, 200mm drop bar", "316 SS / PC Black", "1", "Padlock hasp prep"],
    ["H-03", "Strike Plate", "Weld-on, 100×50mm", "Steel / PC Black", "1", "Align with latch"],
    ["H-04", "Padlock Hasp", "Heavy duty, 65mm shackle", "316 SS", "1", "Owner to supply lock"],
    ["H-05", "Access Control Prep", "Conduit stub-out, 25mm EMT", "Galv. Steel", "1", "For future card reader"],
    ["H-06", "Door Closer", "Hydraulic, surface-mounted", "Aluminum / PC Black", "1", "Hold-open optional"],
    ["H-07", "Floor Guide", "Adjustable, surface-mount", "316 SS", "1", "Bottom of gate leaf"],
    ["H-08", "Threshold", "Aluminum, 75mm wide", "Aluminum / PC Black", "1", "Seal gap at slab"],
  ];

  doc.rect(x0, curY - rowH + 4, w, rowH).fill(DARK);
  cx = x0;
  for (let i = 0; i < hHeaders.length; i++) {
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7).text(hHeaders[i], cx + 4, curY - 10, { width: hColW[i] - 8 });
    cx += hColW[i];
  }
  curY -= rowH;

  for (let ri = 0; ri < hRows.length; ri++) {
    doc.rect(x0, curY - rowH + 4, w, rowH).fill(ri % 2 === 0 ? LGRAY : WHITE);
    cx = x0;
    for (let ci = 0; ci < hRows[ri].length; ci++) {
      if (ci === 0 || ci === 4) {
        doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5).text(hRows[ri][ci], cx + 4, curY - 10, { width: hColW[ci] - 8 });
      } else {
        doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(hRows[ri][ci], cx + 4, curY - 10, { width: hColW[ci] - 8 });
      }
      cx += hColW[ci];
    }
    doc.strokeColor(MGRAY).lineWidth(0.3).moveTo(x0, curY - rowH + 4).lineTo(x0 + w, curY - rowH + 4).stroke();
    curY -= rowH;
  }
  drawBorder(doc, x0, curY + 4, w, y0 + h - 8 - 28 - 20 - 28 - (curY + 4), 0.75);

  // Notes
  curY -= 16;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("NOTES:", x0, curY);
  curY -= 12;
  const notes = [
    "1. All hardware to be commercial grade. Substitutions require written approval.",
    "2. Contractor to confirm door swing direction and latch hand on site.",
    "3. Access control conduit to be installed during fabrication — coordinate with electrical contractor.",
    "4. All exposed hardware to be powder coated black to match frame unless noted as stainless steel.",
  ];
  for (const n of notes) {
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(n, x0, curY, { width: w });
    curY -= 11;
  }

  // Contractor coordination block
  const coordY = y0 + 12;
  const coordH = 160;
  doc.rect(x0, coordY, w, coordH).fill("#F5F5F5");
  doc.strokeColor("#CCCCCC").lineWidth(0.5).rect(x0, coordY, w, coordH).stroke();
  doc.rect(x0, coordY, 4, coordH).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("CONTRACTOR COORDINATION REQUIREMENTS", x0 + 12, coordY + coordH - 16);

  const colW2 = (w - 20) / 2;
  const lx = x0 + 12;
  const rx = x0 + 12 + colW2 + 8;
  let ty = coordY + coordH - 32;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("TRADE COORDINATION", lx, ty);
  doc.text("REQUIRED SUBMITTALS", rx, ty);
  ty -= 12;

  const leftItems = [
    "Structural: Anchor design to be reviewed by EOR prior to installation.",
    "Mechanical: Verify HVAC duct invert elevation at fence line. Min. 150mm clearance required.",
    "Sprinkler: Confirm sprinkler head locations within fence zone. Min. 150mm clearance.",
    "Electrical: Access control conduit stub-out (25mm EMT) to be installed during fabrication.",
    "Concrete: Slab thickness and condition to be verified. Min. 150mm slab required for anchors.",
    "General: Coordinate with GC for temporary hoarding / protection during installation.",
  ];
  const rightItems = [
    "Shop drawings — submit min. 10 business days prior to fabrication",
    "Anchor design calculations — stamped by EOR",
    "Powder coat colour sample — RAL 9005 Jet Black",
    "Hardware cut sheets — all items in Hardware Schedule",
    "Weld procedure specification (WPS) — CSA W59",
    "Completed Site Verification Sheet (S-12) — prior to fabrication",
  ];

  for (let i = 0; i < leftItems.length; i++) {
    doc.fillColor(DARK).font("Helvetica").fontSize(6).text(leftItems[i], lx, ty, { width: colW2 - 8 });
    doc.text(rightItems[i], rx, ty, { width: colW2 - 8 });
    ty -= 10;
  }
}

// ── Sheet 14: Site Verification ───────────────────────────────────────────────

function sheetSiteVerification(doc: PDFKit.PDFDocument, ctx: PageCtx, params: FencingParams) {
  const { x0, y0, w, h } = pageSetup(doc, "S-12", "Site Verification Sheet — Field Measurements", ctx);

  const runM = ftToM(params.runLengthFt);
  const heightM = ftToM(params.heightFt);
  const gateWidthM = params.hasGate ? ftToM(params.gateWidthFt) : 0;
  const gateHeightM = params.hasGate ? ftToM(params.gateHeightFt) : 0;

  let curY = y0 + h - 8;

  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8)
    .text("FIELD VERIFICATION CHECKLIST — Complete prior to fabrication. Return signed copy to Eagle Eye Management Services.", x0, curY - 14, { width: w });
  curY -= 28;

  const sections: [string, [string, string, string][]][] = [
    ["A. OVERALL DIMENSIONS", [
      ["Overall fence run length (wall to column face)", "_______ mm", `Design: ${(runM * 1000).toFixed(0)} mm`],
      ["Fence height (slab to overhead obstruction)", "_______ mm", `Design: ${(heightM * 1000).toFixed(0)} mm`],
      ["Enclosure depth (front face to back wall)", "_______ mm", "Design: ~1000 mm"],
      ...(params.hasGate ? [
        ["Gate opening width (clear)", "_______ mm", `Design: ${(gateWidthM * 1000).toFixed(0)} mm`] as [string, string, string],
        ["Gate opening height (clear)", "_______ mm", `Design: ${(gateHeightM * 1000).toFixed(0)} mm`] as [string, string, string],
      ] : []),
    ]],
    ["B. ANCHOR CONDITIONS", [
      ["Slab thickness at post locations", "_______ mm", "Min. required: 150 mm"],
      ["Slab condition (cracks, joints, drains)", "_______ / OK / NOT OK", "Note conflicts"],
      ["Existing rebar / conduit conflicts at anchor locations", "_______ / YES / NO", "Mark on plan if YES"],
      ["Overhead clearance at each post location", "_______ mm", "Min. required: 2590 mm"],
    ]],
    ["C. WALL & COLUMN CONDITIONS", [
      ["Left wall material (concrete / CMU / drywall)", "_______", "Confirm anchor type"],
      ["Left wall condition (cracks, penetrations)", "_______ / OK / NOT OK", "Note conflicts"],
      ["Right column type (round / square / other)", "_______", "Confirm clip angle fit"],
      ["Right column face condition (spalled / clean)", "_______ / OK / NOT OK", "Note conflicts"],
    ]],
    ["D. OVERHEAD OBSTRUCTIONS", [
      ["Overhead duct invert elevation (lowest point)", "_______ mm AFF", "Record at each post"],
      ["Sprinkler head locations within fence zone", "_______ / YES / NO", "Mark on plan if YES"],
      ["Sprinkler head clearance from proposed fence top", "_______ mm", "Min. required: 150 mm"],
      ["Lighting fixtures within fence zone", "_______ / YES / NO", "Coordinate with electrical"],
      ["Any other overhead obstructions", "_______ / YES / NO", "Describe below"],
    ]],
    ["E. EXISTING CONDITIONS", [
      ["Existing bike racks to remain", "_______ / YES / NO", "Coordinate removal if NO"],
      ["Existing floor markings / signage to relocate", "_______ / YES / NO", "Coordinate with GC"],
      ["Existing services (conduit, pipe) within fence zone", "_______ / YES / NO", "Mark on plan if YES"],
      ["Slab slope / drainage within fence zone", "_______ / OK / NOT OK", "Note if threshold required"],
    ]],
  ];

  const rowH = 18;
  const colW = [w * 0.40, w * 0.22, w * 0.22, w * 0.16];
  const colHeaders = ["ITEM", "FIELD MEASUREMENT", "DESIGN VALUE", "INITIALS"];

  for (const [sectionTitle, items] of sections) {
    curY -= 6;
    sectionHeading(doc, x0, curY - 14, sectionTitle);
    curY -= 28;

    // Column headers
    doc.rect(x0, curY - rowH + 4, w, rowH).fill(DARK);
    let cx = x0;
    for (let i = 0; i < colHeaders.length; i++) {
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7).text(colHeaders[i], cx + 4, curY - 10, { width: colW[i] - 8 });
      cx += colW[i];
    }
    curY -= rowH;

    for (let ri = 0; ri < items.length; ri++) {
      const [item, field, design] = items[ri];
      doc.rect(x0, curY - rowH + 4, w, rowH).fill(ri % 2 === 0 ? WHITE : LGRAY);
      cx = x0;
      doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(item, cx + 4, curY - 10, { width: colW[0] - 8 }); cx += colW[0];
      doc.fillColor(DGRAY).font("Helvetica").fontSize(7.5).text(field, cx + 4, curY - 10, { width: colW[1] - 8 }); cx += colW[1];
      doc.fillColor(DARK).font("Helvetica").fontSize(7.5).text(design, cx + 4, curY - 10, { width: colW[2] - 8 }); cx += colW[2];
      doc.strokeColor(MGRAY).lineWidth(0.5).rect(cx + 4, curY - 10, colW[3] - 8, rowH - 6).stroke();
      doc.strokeColor(MGRAY).lineWidth(0.3).moveTo(x0, curY - rowH + 4).lineTo(x0 + w, curY - rowH + 4).stroke();
      curY -= rowH;
    }
    drawBorder(doc, x0, curY + 4, w, y0 + h - 8 - (curY + 4), 0.5, MGRAY);
    curY -= 8;
  }

  // Sign-off block
  curY -= 10;
  const signH = 60;
  doc.rect(x0, curY - signH, w, signH).fill("#F5F5F5");
  doc.strokeColor("#CCCCCC").lineWidth(0.5).rect(x0, curY - signH, w, signH).stroke();
  doc.rect(x0, curY - signH, 4, signH).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("SIGN-OFF", x0 + 12, curY - signH + 8);
  const signFields = [
    ["Contractor Representative:", "________________________", "Date: _______________"],
    ["Eagle Eye Representative:", "________________________", "Date: _______________"],
    ["Notes / Discrepancies:", "___________________________________________________________"],
  ];
  let sy = curY - signH + 22;
  for (const row of signFields) {
    let sx = x0 + 12;
    for (const cell of row) {
      doc.fillColor(DARK).font("Helvetica").fontSize(7).text(cell, sx, sy, { width: (w - 24) / row.length });
      sx += (w - 24) / row.length;
    }
    sy += 12;
  }
}

// ── Sheet 15: R-01 Existing Conditions Photo ──────────────────────────────────

async function sheetExistingConditionsPhoto(
  doc: PDFKit.PDFDocument,
  ctx: PageCtx,
  photoUrl?: string
) {
  const { x0, y0, w, h } = pageSetup(doc, "R-01", "Existing Conditions — Site Photograph", ctx);
  const imgW = w;
  const imgH = h * 0.72;
  const imgX = x0;
  const imgY = y0 + (h - imgH) / 2;

  if (photoUrl) {
    try {
      const imgBuf = await fetchImageBuffer(photoUrl);
      doc.image(imgBuf, imgX, imgY, { width: imgW, height: imgH, fit: [imgW, imgH], align: "center", valign: "center" });
    } catch {
      drawPhotoPlaceholder(doc, imgX, imgY, imgW, imgH, "SITE PHOTO", "Insert existing conditions photograph here");
    }
  } else {
    drawPhotoPlaceholder(doc, imgX, imgY, imgW, imgH, "SITE PHOTO", "Insert existing conditions photograph here");
  }

  const capY = imgY + imgH + 8;
  doc.rect(x0, capY, w, 30).fill(DARK);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9)
    .text("EXISTING CONDITIONS — SITE PHOTOGRAPH", x0 + 12, capY + 6, { width: w - 24 });
  doc.fillColor("#AAAAAA").font("Helvetica").fontSize(7)
    .text("Photograph taken prior to installation. Verify all site conditions before fabrication.", x0 + 12, capY + 18, { width: w - 24 });

  const notesY = capY + 38;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7).text("PHOTO NOTES:", x0, notesY);
  doc.fillColor(DARK).font("Helvetica").fontSize(7)
    .text("1. Photograph taken prior to any site work. Date and time stamp to be confirmed with site superintendent.", x0, notesY + 10, { width: w });
  doc.fillColor(DARK).font("Helvetica").fontSize(7)
    .text("2. Contractor to document all existing conditions with dated photographs before commencing work.", x0, notesY + 20, { width: w });
}

// ── Sheet 16: R-02 AI Visual Rendering ───────────────────────────────────────

async function sheetAIRendering(
  doc: PDFKit.PDFDocument,
  ctx: PageCtx,
  renderingUrl?: string
) {
  const { x0, y0, w, h } = pageSetup(doc, "R-02", "AI Visual Rendering — Proposed Design", ctx);
  const imgW = w;
  const imgH = h * 0.72;
  const imgX = x0;
  const imgY = y0 + (h - imgH) / 2;

  if (renderingUrl) {
    try {
      const imgBuf = await fetchImageBuffer(renderingUrl);
      doc.image(imgBuf, imgX, imgY, { width: imgW, height: imgH, fit: [imgW, imgH], align: "center", valign: "center" });
    } catch {
      drawRenderingPlaceholder(doc, imgX, imgY, imgW, imgH);
    }
  } else {
    drawRenderingPlaceholder(doc, imgX, imgY, imgW, imgH);
  }

  const capY = imgY + imgH + 8;
  doc.rect(x0, capY, w, 30).fill(DARK);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9)
    .text("PHOTOREALISTIC DAY VIEW — AI-GENERATED RENDERING", x0 + 12, capY + 6, { width: w - 24 });
  doc.fillColor("#AAAAAA").font("Helvetica").fontSize(7)
    .text("For illustrative purposes only. Final appearance subject to field conditions and material selection.", x0 + 12, capY + 18, { width: w - 24 });

  const discY = capY + 38;
  doc.rect(x0, discY, w, 20).fill("#FFFDE7");
  doc.strokeColor(GOLD).lineWidth(0.5).rect(x0, discY, w, 20).stroke();
  doc.fillColor(GOLD).font("Helvetica-Oblique").fontSize(7)
    .text("AI-generated concept image for visualisation purposes only. Not for construction or regulatory submission.", x0 + 8, discY + 6, { width: w - 16 });
}

function drawPhotoPlaceholder(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  title: string, subtitle: string
) {
  doc.rect(x, y, w, h).fill("#111111");
  doc.strokeColor("#444444").lineWidth(1).rect(x, y, w, h).stroke();
  doc.strokeColor("#333333").lineWidth(1)
    .moveTo(x, y).lineTo(x + w, y + h).stroke()
    .moveTo(x + w, y).lineTo(x, y + h).stroke();
  doc.fillColor("#555555").font("Helvetica-Bold").fontSize(14)
    .text(title, x, y + h / 2 - 16, { align: "center", width: w });
  doc.fillColor("#444444").font("Helvetica").fontSize(9)
    .text(subtitle, x, y + h / 2 + 4, { align: "center", width: w });
}

function drawRenderingPlaceholder(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number
) {
  doc.rect(x, y, w, h).fill("#111111");
  doc.strokeColor(GOLD).lineWidth(1).rect(x, y, w, h).stroke();
  doc.fillColor("#333333").font("Helvetica-Bold").fontSize(18)
    .text("AI RENDERING PENDING", x, y + h / 2 - 18, { align: "center", width: w });
  doc.fillColor("#555555").font("Helvetica").fontSize(9)
    .text("Generate rendering in Eagle Eye app and re-export PDF to populate this sheet.", x, y + h / 2 + 4, { align: "center", width: w });
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildFencingPDF(options: FencingPdfOptions): Promise<Buffer> {
  const {
    params,
    projectName,
    clientName = "",
    location = "",
    preparedBy = "Ranaldo Daniels",
    revision = "Rev. 0",
    qtoItems,
    referencePhotoUrl,
    aiRenderingUrl,
  } = options;

  const date = new Date().toLocaleDateString("en-CA");
  const packageTitle = "FENCING ESTIMATING PACKAGE";

  const ctx: PageCtx = {
    packageTitle,
    projectName,
    clientName: clientName || params.clientName || "",
    location: location || params.location || "",
    preparedBy,
    date,
    revision,
  };

  const doc = new PDFDocument({
    size: [PW, PH],
    layout: "portrait",
    margin: 0,
    autoFirstPage: false,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.addPage(); sheetCover(doc, ctx, params);
  doc.addPage(); sheetQTO(doc, ctx, qtoItems);
  doc.addPage(); sheetGeneralNotes(doc, ctx, params);
  doc.addPage(); sheetExistingConditions(doc, ctx, params);
  doc.addPage(); sheetPlan(doc, ctx, params);
  doc.addPage(); sheetFrontElevation(doc, ctx, params);
  doc.addPage(); sheetLeftElevation(doc, ctx, params);
  doc.addPage(); sheetRightElevation(doc, ctx, params);
  doc.addPage(); sheetOverheadClearance(doc, ctx, params);
  doc.addPage(); sheetDetails1(doc, ctx, params);
  doc.addPage(); sheetDetails2(doc, ctx, params);
  doc.addPage(); sheetMaterialSchedule(doc, ctx, params);
  doc.addPage(); sheetDoorSchedule(doc, ctx, params);
  doc.addPage(); sheetSiteVerification(doc, ctx, params);
  doc.addPage(); await sheetExistingConditionsPhoto(doc, ctx, referencePhotoUrl);
  doc.addPage(); await sheetAIRendering(doc, ctx, aiRenderingUrl);

  doc.end();
  return pdfReady;
}
