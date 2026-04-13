import { Request, Response } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getProjectById, getProjectParams, getChecklistItems, getScopeItems } from "./db";
import { calculateQTO, calculateGrandTotal, getDrawingDimensions, PergolaParams } from "../shared/geometry";

const execFileAsync = promisify(execFile);

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663398513099/NsQTkUPS5UugDCK5DHs6bC/eagle-eye-logo_d71264bc.jpg";
const GOLD = "#C9A84C";

function buildSVGPlanView(dims: ReturnType<typeof getDrawingDimensions>): string {
  const w = 800, h = 480;
  const pad = { l: 90, r: 50, t: 50, b: 70 };
  const drawW = w - pad.l - pad.r;
  const drawH = h - pad.t - pad.b;
  const scaleX = drawW / dims.widthFt;
  const scaleY = drawH / dims.depthFt;
  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => pad.t + ft * scaleY;

  const postPositions: number[] = [];
  if (dims.postCount <= 1) postPositions.push(dims.widthFt / 2);
  else for (let i = 0; i < dims.postCount; i++) postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));

  const slatSpacingFt = dims.slatSpacingIn / 12;
  const slatLines = Array.from({ length: dims.slatCount + 1 }, (_, i) =>
    `<line x1="${x(0)}" y1="${y(Math.min(i * slatSpacingFt, dims.depthFt))}" x2="${x(dims.widthFt)}" y2="${y(Math.min(i * slatSpacingFt, dims.depthFt))}" stroke="#6B7280" stroke-width="1.5"/>`
  ).join("");

  const posts = postPositions.map(px =>
    `<rect x="${x(px) - 5}" y="${y(dims.depthFt) + 6}" width="10" height="10" fill="#111111" stroke="${GOLD}" stroke-width="1"/>`
  ).join("");

  const glassFront = dims.glassFront ? `<rect x="${x(0)}" y="${y(dims.depthFt)}" width="${drawW}" height="6" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1"/>` : "";
  const glassLeft = dims.glassLeft ? `<rect x="${x(0) - 6}" y="${y(0)}" width="6" height="${drawH}" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1"/>` : "";
  const glassRight = dims.glassRight ? `<rect x="${x(dims.widthFt)}" y="${y(0)}" width="6" height="${drawH}" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#fff;font-family:Arial,sans-serif">
    <rect x="0" y="0" width="${w}" height="32" fill="#111111"/>
    <line x1="0" y1="32" x2="${w}" y2="32" stroke="${GOLD}" stroke-width="2"/>
    <text x="12" y="22" fill="white" font-size="11" font-weight="bold">SHEET 03 — PLAN VIEW (ROOF LEVEL)</text>
    <text x="${w - 12}" y="22" fill="${GOLD}" font-size="9" text-anchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>
    <rect x="${x(0)}" y="${y(0)}" width="${drawW}" height="${drawH}" fill="#F9FAFB" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4,3"/>
    <rect x="${x(0)}" y="${y(0) - 10}" width="${drawW}" height="10" fill="#111111"/>
    <text x="${x(dims.widthFt / 2)}" y="${y(0) - 14}" fill="#111111" font-size="8" text-anchor="middle" font-weight="bold">BUILDING WALL — WALL-MOUNTED LEAN-TO CONNECTION — NO REAR POSTS</text>
    ${slatLines}
    ${glassFront}
    ${glassLeft}
    ${glassRight}
    <rect x="${x(0)}" y="${y(dims.depthFt) + 6}" width="${drawW}" height="7" fill="#111111"/>
    ${posts}
    <line x1="${x(0)}" y1="${h - 22}" x2="${x(dims.widthFt)}" y2="${h - 22}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(dims.widthFt / 2)}" y="${h - 8}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold">${dims.widthFt.toFixed(1)}' (58'-0") TOTAL WIDTH</text>
    <line x1="22" y1="${y(0)}" x2="22" y2="${y(dims.depthFt)}" stroke="${GOLD}" stroke-width="1"/>
    <text x="14" y="${y(dims.depthFt / 2)}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold" transform="rotate(-90,14,${y(dims.depthFt / 2)})">${dims.depthFt.toFixed(1)}' (15'-8") DEPTH</text>
    <text x="${x(dims.widthFt / 2)}" y="${y(dims.depthFt / 2)}" fill="#9CA3AF" font-size="10" text-anchor="middle">ALUMINUM SLAT ROOF SYSTEM</text>
    ${dims.glassFront ? `<text x="${x(dims.widthFt / 2)}" y="${y(dims.depthFt) + 18}" fill="#3B82F6" font-size="8" text-anchor="middle">LUMIN GLASS — FRONT VERTICAL ENCLOSURE</text>` : ""}
    <text x="${w - 40}" y="${h - 35}" fill="#111111" font-size="22" text-anchor="middle">↑</text>
    <text x="${w - 40}" y="${h - 18}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold">N</text>
  </svg>`;
}

function buildSVGFrontElevation(dims: ReturnType<typeof getDrawingDimensions>): string {
  const w = 760, h = 400;
  const pad = { l: 80, r: 50, t: 50, b: 70 };
  const drawW = w - pad.l - pad.r;
  const drawH = h - pad.t - pad.b;
  const scaleX = drawW / dims.widthFt;
  const scaleY = drawH / dims.heightFt;
  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => h - pad.b - ft * scaleY;

  const postPositions: number[] = [];
  if (dims.postCount <= 1) postPositions.push(dims.widthFt / 2);
  else for (let i = 0; i < dims.postCount; i++) postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));

  const posts = postPositions.map(px =>
    `<rect x="${x(px) - 5}" y="${y(dims.heightFt)}" width="10" height="${drawH}" fill="#111111"/>`
  ).join("");

  const slatCount = dims.slatCount;
  const slatH = dims.heightFt - 0.5;
  const slats = Array.from({ length: slatCount }, (_, i) => {
    const fy = 0.5 + slatH * (i / (slatCount - 1 || 1));
    return `<rect x="${x(0)}" y="${y(fy) - 2}" width="${drawW}" height="4" fill="#374151"/>`;
  }).join("");

  const glassPanel = dims.glassFront
    ? `<rect x="${x(0)}" y="${y(dims.heightFt)}" width="${drawW}" height="${drawH}" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1" opacity="0.45"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#fff;font-family:Arial,sans-serif">
    <rect x="0" y="0" width="${w}" height="32" fill="#111111"/>
    <line x1="0" y1="32" x2="${w}" y2="32" stroke="${GOLD}" stroke-width="2"/>
    <text x="12" y="22" fill="white" font-size="11" font-weight="bold">SHEET 04 — FRONT ELEVATION</text>
    <text x="${w - 12}" y="22" fill="${GOLD}" font-size="9" text-anchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(dims.widthFt)}" y2="${y(0)}" stroke="#374151" stroke-width="2.5"/>
    ${glassPanel}
    ${posts}
    ${slats}
    <rect x="${x(0)}" y="${y(0.5)}" width="${drawW}" height="${scaleY * 0.5}" fill="#111111"/>
    <line x1="${x(0) - 22}" y1="${y(0)}" x2="${x(0) - 22}" y2="${y(dims.heightFt)}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(0) - 32}" y="${y(dims.heightFt / 2)}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold" transform="rotate(-90,${x(0) - 32},${y(dims.heightFt / 2)})">${dims.heightFt.toFixed(1)}' HT.</text>
    <line x1="${x(0)}" y1="${h - 22}" x2="${x(dims.widthFt)}" y2="${h - 22}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(dims.widthFt / 2)}" y="${h - 8}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold">${dims.widthFt.toFixed(1)}' (58'-0")</text>
    <text x="${x(dims.widthFt / 2)}" y="${y(0) + 14}" fill="#6B7280" font-size="8" text-anchor="middle">NO REAR POSTS — WALL-MOUNTED CONNECTION TO BUILDING</text>
    ${dims.glassFront ? `<text x="${x(dims.widthFt / 2)}" y="${y(dims.heightFt * 0.35)}" fill="#3B82F6" font-size="9" text-anchor="middle">LUMIN GLASS VERTICAL ENCLOSURE</text>` : ""}
  </svg>`;
}

function buildSVGSideElevation(dims: ReturnType<typeof getDrawingDimensions>): string {
  const w = 760, h = 400;
  const pad = { l: 80, r: 70, t: 50, b: 70 };
  const drawW = w - pad.l - pad.r;
  const drawH = h - pad.t - pad.b;
  const scaleX = drawW / dims.depthFt;
  const scaleY = drawH / dims.heightFt;
  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => h - pad.b - ft * scaleY;

  const slatSpacingFt = dims.slatSpacingIn / 12;
  const slats = Array.from({ length: dims.slatCount }, (_, i) => {
    const d = i * slatSpacingFt;
    return `<rect x="${x(d) - 3}" y="${y(dims.heightFt)}" width="6" height="${drawH - scaleY * 0.5}" fill="#374151"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#fff;font-family:Arial,sans-serif">
    <rect x="0" y="0" width="${w}" height="32" fill="#111111"/>
    <line x1="0" y1="32" x2="${w}" y2="32" stroke="${GOLD}" stroke-width="2"/>
    <text x="12" y="22" fill="white" font-size="11" font-weight="bold">SHEET 05 — SIDE ELEVATION</text>
    <text x="${w - 12}" y="22" fill="${GOLD}" font-size="9" text-anchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(dims.depthFt)}" y2="${y(0)}" stroke="#374151" stroke-width="2.5"/>
    <rect x="${x(0) - 14}" y="${y(dims.heightFt)}" width="14" height="${drawH}" fill="#111111"/>
    <text x="${x(0) - 7}" y="${y(dims.heightFt / 2)}" fill="white" font-size="7" text-anchor="middle" transform="rotate(-90,${x(0) - 7},${y(dims.heightFt / 2)})">BUILDING WALL</text>
    ${dims.glassLeft ? `<rect x="${x(dims.depthFt)}" y="${y(dims.heightFt)}" width="6" height="${drawH}" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1"/>` : ""}
    ${slats}
    <rect x="${x(0)}" y="${y(dims.heightFt)}" width="${drawW}" height="${scaleY * 0.5}" fill="#111111"/>
    <rect x="${x(dims.depthFt) - 5}" y="${y(dims.heightFt)}" width="10" height="${drawH}" fill="#111111"/>
    <rect x="${x(dims.depthFt) - 7}" y="${y(dims.heightFt)}" width="14" height="${scaleY * 0.5}" fill="${GOLD}"/>
    <line x1="${x(0)}" y1="${h - 22}" x2="${x(dims.depthFt)}" y2="${h - 22}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(dims.depthFt / 2)}" y="${h - 8}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold">${dims.depthFt.toFixed(1)}' (15'-8") DEPTH</text>
    <line x1="${x(dims.depthFt) + 22}" y1="${y(0)}" x2="${x(dims.depthFt) + 22}" y2="${y(dims.heightFt)}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(dims.depthFt) + 34}" y="${y(dims.heightFt / 2)}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold" transform="rotate(90,${x(dims.depthFt) + 34},${y(dims.heightFt / 2)})">${dims.heightFt.toFixed(1)}' HT.</text>
    <text x="${x(0) + 5}" y="${y(dims.heightFt) - 6}" fill="${GOLD}" font-size="8">WALL LEDGER — BOLTED TO BUILDING</text>
    <text x="${x(dims.depthFt) - 5}" y="${y(dims.heightFt) - 6}" fill="${GOLD}" font-size="8" text-anchor="end">FASCIA BEAM (GOLD)</text>
  </svg>`;
}

function buildSVGSection(dims: ReturnType<typeof getDrawingDimensions>): string {
  const w = 760, h = 420;
  const pad = { l: 90, r: 70, t: 50, b: 70 };
  const drawW = w - pad.l - pad.r;
  const drawH = h - pad.t - pad.b;
  const scaleX = drawW / dims.depthFt;
  const scaleY = drawH / dims.heightFt;
  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => h - pad.b - ft * scaleY;

  const slatSpacingFt = dims.slatSpacingIn / 12;
  const slats = Array.from({ length: dims.slatCount }, (_, i) => {
    const d = i * slatSpacingFt;
    return `<rect x="${x(d) - 3}" y="${y(dims.heightFt)}" width="6" height="${drawH - scaleY * 0.5}" fill="#374151"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#fff;font-family:Arial,sans-serif">
    <rect x="0" y="0" width="${w}" height="32" fill="#111111"/>
    <line x1="0" y1="32" x2="${w}" y2="32" stroke="${GOLD}" stroke-width="2"/>
    <text x="12" y="22" fill="white" font-size="11" font-weight="bold">SHEET 06 — SECTION A–A</text>
    <text x="${w - 12}" y="22" fill="${GOLD}" font-size="9" text-anchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(dims.depthFt)}" y2="${y(0)}" stroke="#374151" stroke-width="2.5"/>
    <rect x="${x(0) - 14}" y="${y(dims.heightFt)}" width="14" height="${drawH}" fill="#111111"/>
    <text x="${x(0) - 7}" y="${y(dims.heightFt / 2)}" fill="white" font-size="7" text-anchor="middle" transform="rotate(-90,${x(0) - 7},${y(dims.heightFt / 2)})">BUILDING WALL</text>
    ${dims.glassFront ? `<rect x="${x(dims.depthFt)}" y="${y(dims.heightFt)}" width="7" height="${drawH}" fill="#BFDBFE" stroke="#3B82F6" stroke-width="1"/>` : ""}
    ${slats}
    <rect x="${x(0)}" y="${y(dims.heightFt)}" width="${drawW}" height="${scaleY * 0.5}" fill="#111111"/>
    <rect x="${x(dims.depthFt) - 5}" y="${y(dims.heightFt)}" width="10" height="${drawH}" fill="#111111"/>
    <rect x="${x(dims.depthFt) - 8}" y="${y(dims.heightFt)}" width="16" height="${scaleY * 0.5}" fill="${GOLD}"/>
    <line x1="${x(0)}" y1="${h - 22}" x2="${x(dims.depthFt)}" y2="${h - 22}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(dims.depthFt / 2)}" y="${h - 8}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold">${dims.depthFt.toFixed(1)}' DEPTH</text>
    <line x1="${x(0) - 36}" y1="${y(0)}" x2="${x(0) - 36}" y2="${y(dims.heightFt)}" stroke="${GOLD}" stroke-width="1"/>
    <text x="${x(0) - 48}" y="${y(dims.heightFt / 2)}" fill="#111111" font-size="9" text-anchor="middle" font-weight="bold" transform="rotate(-90,${x(0) - 48},${y(dims.heightFt / 2)})">${dims.heightFt.toFixed(1)}' HT.</text>
    <text x="${x(0) + 5}" y="${y(dims.heightFt) - 6}" fill="${GOLD}" font-size="8">① WALL LEDGER</text>
    <text x="${x(dims.depthFt) - 8}" y="${y(dims.heightFt) - 6}" fill="${GOLD}" font-size="8" text-anchor="end">② FASCIA BEAM</text>
    <text x="${x(dims.depthFt) - 5}" y="${y(0) - 6}" fill="#374151" font-size="8" text-anchor="end">③ FRONT POST</text>
    <text x="${x(dims.depthFt / 2)}" y="${y(dims.heightFt / 2)}" fill="#9CA3AF" font-size="9" text-anchor="middle">④ SLAT ROOF SYSTEM</text>
    ${dims.glassFront ? `<text x="${x(dims.depthFt) + 12}" y="${y(dims.heightFt / 2)}" fill="#3B82F6" font-size="8">⑤ LUMIN GLASS</text>` : ""}
    ${dims.glassFront ? `<text x="${x(dims.depthFt) + 12}" y="${y(dims.heightFt / 2) + 12}" fill="#3B82F6" font-size="8">⑥ GLASS TOP RAIL</text>` : ""}
  </svg>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function handlePDFExport(req: Request, res: Response) {
  const tmpHtml = join(tmpdir(), `eagle_eye_${Date.now()}_${Math.random().toString(36).slice(2)}.html`);
  const tmpPdf = join(tmpdir(), `eagle_eye_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const params = await getProjectParams(projectId);
    const checklist = await getChecklistItems(projectId);
    const scopeItems = await getScopeItems(projectId);

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
    const qtoItems = calculateQTO(pergolaParams);
    const qtoCategories = Array.from(new Set(qtoItems.map(i => i.category)));
    const grandTotal = calculateGrandTotal(qtoItems);

    const svgPlan = buildSVGPlanView(dims);
    const svgFront = buildSVGFrontElevation(dims);
    const svgSide = buildSVGSideElevation(dims);
    const svgSection = buildSVGSection(dims);

    const checklistCategories = Array.from(new Set(checklist.map(c => c.category)));
    const scopeTypes = ["inclusion", "exclusion", "assumption", "by_others"] as const;
    const scopeTypeLabels: Record<string, string> = { inclusion: "Inclusions", exclusion: "Exclusions", assumption: "Assumptions", by_others: "By Others / Coordination Required" };
    const scopeTypeColors: Record<string, string> = { inclusion: "#dcfce7", exclusion: "#fee2e2", assumption: "#dbeafe", by_others: "#f3f4f6" };
    const scopeTypeBorderColors: Record<string, string> = { inclusion: "#16a34a", exclusion: "#dc2626", assumption: "#2563eb", by_others: "#6b7280" };

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: white; color: #111111; font-size: 10pt; }
  @page { size: A3 landscape; margin: 0; }
  .page { width: 420mm; min-height: 297mm; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .brand-header { background: #111111; padding: 10px 18px; display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #C9A84C; }
  .brand-header img { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #C9A84C; }
  .brand-header-text .company { color: white; font-size: 12pt; font-weight: bold; }
  .brand-header-text .subtitle { color: #C9A84C; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; }
  .brand-header-right { margin-left: auto; text-align: right; }
  .brand-header-right .project-name { color: white; font-size: 10pt; font-weight: bold; }
  .brand-header-right .project-sub { color: #9CA3AF; font-size: 8pt; }
  .brand-footer { background: #111111; padding: 6px 18px; display: flex; align-items: center; justify-content: space-between; border-top: 2px solid #C9A84C; margin-top: auto; }
  .brand-footer span { color: #9CA3AF; font-size: 7pt; }
  .brand-footer .prepared { color: #C9A84C; font-weight: bold; }
  .content { flex: 1; padding: 14px 18px; background: white; }
  .sheet-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .sheet-title-bar { width: 4px; height: 20px; background: #C9A84C; border-radius: 2px; }
  .sheet-title h2 { font-size: 13pt; font-weight: bold; color: #111111; }
  .sheet-title .sheet-num { font-size: 9pt; color: #6B7280; }
  .drawing-container { border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
  .drawing-header { background: #111111; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; }
  .drawing-header span { color: white; font-size: 9pt; font-weight: bold; }
  .drawing-header .scale { color: #C9A84C; font-size: 8pt; }
  .drawing-body { padding: 6px; background: white; }
  .drawing-body svg { max-width: 100%; height: auto; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #111111; color: white; padding: 5px 7px; text-align: left; font-size: 8pt; font-weight: bold; }
  td { padding: 4px 7px; border-bottom: 1px solid #F3F4F6; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .qty-val { color: #C9A84C; font-weight: bold; text-align: center; }
  .unit-val { text-align: center; color: #6B7280; font-size: 8pt; }
  .cat-header { background: #F9FAFB; padding: 5px 7px; border-left: 3px solid #C9A84C; margin: 6px 0 3px 0; font-size: 9pt; font-weight: bold; color: #374151; }
  .disclaimer { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 5px; padding: 7px 10px; font-size: 8pt; color: #92400E; margin-bottom: 10px; }
  .checklist-cat { font-size: 9pt; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E5E7EB; padding-bottom: 3px; margin: 8px 0 5px 0; }
  .checklist-item { display: flex; align-items: flex-start; gap: 7px; padding: 4px 7px; border-radius: 3px; margin-bottom: 2px; font-size: 9pt; }
  .checklist-item.checked { background: #F0FDF4; }
  .checklist-item.unchecked { background: #F9FAFB; }
  .check-box { width: 13px; height: 13px; border-radius: 2px; border: 2px solid #9CA3AF; display: inline-block; flex-shrink: 0; margin-top: 1px; text-align: center; line-height: 10px; font-size: 8pt; }
  .check-box.checked { background: #22C55E; border-color: #22C55E; color: white; }
  .scope-section { margin-bottom: 10px; }
  .scope-section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 8px; border-radius: 3px 3px 0 0; }
  .scope-item { display: flex; align-items: flex-start; gap: 7px; padding: 4px 8px; font-size: 9pt; border-bottom: 1px solid #F3F4F6; }
  .scope-badge { font-size: 7pt; font-weight: bold; padding: 1px 5px; border-radius: 8px; flex-shrink: 0; white-space: nowrap; }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .detail-card { border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; }
  .detail-card-header { padding: 7px 9px; font-size: 9pt; font-weight: bold; }
  .detail-card-body { padding: 7px 9px; font-size: 8pt; color: #6B7280; line-height: 1.5; }
  .cover-page { background: #111111; min-height: 297mm; display: flex; flex-direction: column; }
  .cover-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px; }
  .cover-logo { width: 72px; height: 72px; border-radius: 50%; border: 3px solid #C9A84C; margin-bottom: 18px; }
  .cover-company { color: white; font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .cover-subtitle { color: #C9A84C; font-size: 10pt; letter-spacing: 0.18em; text-transform: uppercase; text-align: center; margin-bottom: 26px; }
  .cover-divider { width: 56px; height: 2px; background: #C9A84C; margin: 0 auto 26px; }
  .cover-project { color: white; font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 7px; }
  .cover-client { color: #9CA3AF; font-size: 11pt; text-align: center; margin-bottom: 3px; }
  .cover-location { color: #9CA3AF; font-size: 11pt; text-align: center; margin-bottom: 26px; }
  .cover-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 380px; margin-bottom: 26px; }
  .cover-info-item { border: 1px solid #2A2A2A; border-radius: 5px; padding: 9px 12px; }
  .cover-info-label { color: #C9A84C; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 2px; }
  .cover-info-value { color: white; font-size: 10pt; font-weight: bold; }
  .cover-disclaimer { color: #6B7280; font-size: 8pt; text-align: center; border-top: 1px solid #2A2A2A; padding-top: 14px; width: 100%; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .summary-box { width: 100%; max-width: 520px; margin-bottom: 22px; border: 1px solid #2A2A2A; border-radius: 7px; overflow: hidden; }
  .summary-box-header { background: #1A1A1A; padding: 7px 12px; border-bottom: 1px solid #C9A84C; }
  .summary-box-label { color: #C9A84C; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.12em; font-weight: bold; }
  .summary-box-body { padding: 12px 14px; }
  .summary-text { color: #D1D5DB; font-size: 9pt; line-height: 1.7; white-space: pre-wrap; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover-page">
  <div style="background:#111111;padding:10px 18px;border-bottom:3px solid #C9A84C;display:flex;align-items:center;gap:10px;">
    <img src="${LOGO_URL}" style="width:40px;height:40px;border-radius:50%;border:2px solid #C9A84C;"/>
    <div>
      <div style="color:white;font-size:12pt;font-weight:bold;">Eagle Eye Management Services</div>
      <div style="color:#C9A84C;font-size:8pt;letter-spacing:0.1em;text-transform:uppercase;">Pergola Estimating Platform</div>
    </div>
  </div>
  <div class="cover-content">
    <img src="${LOGO_URL}" class="cover-logo"/>
    <div class="cover-company">Eagle Eye Management Services</div>
    <div class="cover-subtitle">Pre-Fabrication Concept Package</div>
    <div class="cover-divider"></div>
    <div class="cover-project">${escapeHtml(project.projectName)}</div>
    ${project.clientName ? `<div class="cover-client">${escapeHtml(project.clientName)}</div>` : ""}
    ${project.location ? `<div class="cover-location">${escapeHtml(project.location)}</div>` : ""}
    <div class="cover-info-grid">
      <div class="cover-info-item"><div class="cover-info-label">Width</div><div class="cover-info-value">${pergolaParams.widthFt.toFixed(1)}' (58'-0")</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Depth</div><div class="cover-info-value">${pergolaParams.depthFt.toFixed(1)}' (15'-8")</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Height</div><div class="cover-info-value">${pergolaParams.heightFt.toFixed(1)}' Clear</div></div>
      <div class="cover-info-item"><div class="cover-info-label">System Type</div><div class="cover-info-value">Lean-To Canopy</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Slat Type</div><div class="cover-info-value">${pergolaParams.slatType === "fixed" ? "Fixed Slats" : "Operable Louvers"}</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Enclosure</div><div class="cover-info-value">Lumin Glass</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Finish</div><div class="cover-info-value">${escapeHtml(pergolaParams.finishColor)}</div></div>
      <div class="cover-info-item"><div class="cover-info-label">Status</div><div class="cover-info-value" style="color:#C9A84C;">${escapeHtml(project.status.replace("_", " ").toUpperCase())}</div></div>
    </div>
    ${project.notes ? `
    <div class="summary-box">
      <div class="summary-box-header"><div class="summary-box-label">Project Summary</div></div>
      <div class="summary-box-body"><div class="summary-text">${escapeHtml(project.notes)}</div></div>
    </div>
    ` : ""}
    <div class="cover-disclaimer">
      Concept Only — Not For Construction — Not Engineered — Subject to Field Verification<br/>
      Prepared by: Ranaldo Daniels &nbsp;|&nbsp; Eagle Eye Management Services &nbsp;|&nbsp; ${new Date().toLocaleDateString("en-CA")}
    </div>
  </div>
</div>

<!-- PLAN VIEW -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet 03 of 07</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Plan View — Roof Level</h2><span class="sheet-num">SHEET 03</span></div>
    <div class="drawing-container">
      <div class="drawing-header"><span>Plan View — Aluminum Slat Roof System</span><span class="scale">Scale: NTS | All dims in feet unless noted</span></div>
      <div class="drawing-body">${svgPlan}</div>
    </div>
    <div style="font-size:8pt;color:#6B7280;border-top:1px solid #E5E7EB;padding-top:5px;">
      Connection type: Wall-mounted lean-to — No rear posts — Lumin glass vertical enclosure on 3 sides — Slat roof connects to building wall via concealed ledger
    </div>
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- FRONT + SIDE ELEVATION -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheets 04–05 of 07</div></div>
  </div>
  <div class="content">
    <div class="two-col">
      <div>
        <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Front Elevation</h2><span class="sheet-num">SHEET 04</span></div>
        <div class="drawing-container">
          <div class="drawing-header"><span>Front Elevation</span><span class="scale">NTS</span></div>
          <div class="drawing-body">${svgFront}</div>
        </div>
      </div>
      <div>
        <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Side Elevation</h2><span class="sheet-num">SHEET 05</span></div>
        <div class="drawing-container">
          <div class="drawing-header"><span>Side Elevation</span><span class="scale">NTS</span></div>
          <div class="drawing-body">${svgSide}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- SECTION A-A -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet 06 of 07</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Section A–A</h2><span class="sheet-num">SHEET 06</span></div>
    <div class="drawing-container">
      <div class="drawing-header"><span>Section A–A — Through Pergola Structure</span><span class="scale">Scale: NTS</span></div>
      <div class="drawing-body">${svgSection}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:7px;font-size:8pt;">
      <div style="background:#FFFBEB;border:1px solid #F59E0B;border-radius:3px;padding:5px;">① Wall ledger bolted to building — no rear posts</div>
      <div style="background:#FFFBEB;border:1px solid #F59E0B;border-radius:3px;padding:5px;">② Front fascia beam (150×75 AL. RHS)</div>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:3px;padding:5px;">③ Front post (100×100 AL. SHS)</div>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:3px;padding:5px;">④ Aluminum slat system</div>
      <div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:3px;padding:5px;">⑤ Lumin glass vertical enclosure</div>
      <div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:3px;padding:5px;">⑥ Glass top rail → fascia beam (integrated)</div>
    </div>
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- QTO -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet A — QTO</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Preliminary Quantity Takeoff</h2><span class="sheet-num">SHEET A</span></div>
    <div class="disclaimer">&#9888; All quantities and costs are preliminary estimates only (CAD). Subject to field verification, supplier quotes, and licensed structural review prior to fabrication.</div>
    ${qtoCategories.map(cat => `
      <div class="cat-header">${escapeHtml(cat)}</div>
      <table>
        <thead><tr><th>Description</th><th style="width:38px;text-align:center;">Unit</th><th style="width:38px;text-align:center;">Qty</th><th style="width:85px;text-align:right;">Unit Rate (CAD)</th><th style="width:85px;text-align:right;">Line Total</th></tr></thead>
        <tbody>
          ${qtoItems.filter(i => i.category === cat).map(item => `
            <tr>
              <td>${escapeHtml(item.description)}</td>
              <td class="unit-val">${escapeHtml(item.unit)}</td>
              <td class="qty-val">${item.qty}</td>
              <td style="text-align:right;color:#374151;font-size:8pt;">$${item.unitRate.toLocaleString("en-CA", {minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style="text-align:right;font-weight:bold;color:#111111;font-size:8pt;">$${item.lineTotal.toLocaleString("en-CA", {minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `).join("")}
    <div style="margin-top:14px;display:flex;justify-content:flex-end;">
      <div style="background:#111111;border-radius:7px;padding:12px 22px;min-width:240px;">
        <div style="color:#C9A84C;font-size:7pt;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px;">Preliminary Budget Estimate (CAD)</div>
        <div style="color:white;font-size:20pt;font-weight:bold;">$${grandTotal.toLocaleString("en-CA", {minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style="color:#9CA3AF;font-size:7pt;margin-top:3px;">Concept Only — Not For Construction — Rates Subject to Supplier Confirmation</div>
      </div>
    </div>
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- CHECKLIST -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet B — Field Verification</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Field Verification Checklist</h2><span class="sheet-num">SHEET B</span></div>
    ${checklistCategories.map(cat => `
      <div class="checklist-cat">${escapeHtml(cat)}</div>
      ${checklist.filter(c => c.category === cat).map(item => `
        <div class="checklist-item ${item.checked ? "checked" : "unchecked"}">
          <div class="check-box ${item.checked ? "checked" : ""}">${item.checked ? "&#10003;" : ""}</div>
          <div>
            <div style="font-size:9pt;color:${item.checked ? "#374151" : "#111111"};${item.checked ? "text-decoration:line-through;" : ""}">${escapeHtml(item.label)}</div>
            ${item.fieldNote ? `<div style="font-size:8pt;color:#9CA3AF;font-style:italic;margin-top:1px;">${escapeHtml(item.fieldNote)}</div>` : ""}
          </div>
        </div>
      `).join("")}
    `).join("")}
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- SCOPE -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet C — Scope</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Inclusions / Exclusions / Assumptions</h2><span class="sheet-num">SHEET C</span></div>
    ${scopeTypes.map(type => {
      const items = scopeItems.filter(s => s.type === type);
      if (!items.length) return "";
      return `
        <div class="scope-section">
          <div class="scope-section-title" style="background:${scopeTypeColors[type]};color:${scopeTypeBorderColors[type]};">${escapeHtml(scopeTypeLabels[type])}</div>
          ${items.map(item => `
            <div class="scope-item" style="border-left:3px solid ${scopeTypeBorderColors[type]};background:${scopeTypeColors[type]}33;">
              <span class="scope-badge" style="background:${scopeTypeColors[type]};color:${scopeTypeBorderColors[type]};">${escapeHtml(scopeTypeLabels[type].replace(/s$/, ""))}</span>
              <span style="color:#374151;">${escapeHtml(item.text)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }).join("")}
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

<!-- CONNECTION DETAILS -->
<div class="page">
  <div class="brand-header">
    <img src="${LOGO_URL}"/>
    <div class="brand-header-text"><div class="company">Eagle Eye Management Services</div><div class="subtitle">Pergola Estimating Package</div></div>
    <div class="brand-header-right"><div class="project-name">${escapeHtml(project.projectName)}</div><div class="project-sub">Sheet D — Connection Details</div></div>
  </div>
  <div class="content">
    <div class="sheet-title"><div class="sheet-title-bar"></div><h2>Connection &amp; Detail Intent</h2><span class="sheet-num">SHEET D</span></div>
    <div class="disclaimer">&#9888; Concept details only — not engineered, not for construction. For estimating intent only. All connections subject to licensed structural review.</div>
    <div class="detail-grid">
      ${[
        { title: "&#9312; Wall Ledger to Building", desc: "Heavy-duty aluminum ledger bolted to building wall. Anchor type subject to wall material. Sealant at all penetrations.", bg: "#FFFBEB", border: "#F59E0B" },
        { title: "&#9313; Post Base Plate to Slab", desc: "200×200×12mm aluminum base plate. Chemical anchor bolts into concrete slab. Grout bed for levelling.", bg: "#F9FAFB", border: "#9CA3AF" },
        { title: "&#9314; Front Beam to Post", desc: "150×75 RHS beam welded or bolted to 100×100 SHS post. Cap plate at post top. Powder coated to match.", bg: "#F9FAFB", border: "#9CA3AF" },
        { title: "&#9315; Slat to Beam Clip", desc: "Aluminum clip bracket at each slat-to-beam intersection. Concealed fastener. Slat end cap at perimeter.", bg: "#F9FAFB", border: "#9CA3AF" },
        { title: "&#9316; Glass Top Rail to Fascia Beam", desc: "Lumin glass top rail bolts directly to underside of front fascia beam. Weathertight sealant joint. Coordinate with Lumin glass supplier.", bg: "#EFF6FF", border: "#3B82F6" },
        { title: "&#9317; Side Glass Corner Condition", desc: "Glass-to-glass corner at front/side intersection. Aluminum corner post or structural silicone joint. Coordinate with supplier.", bg: "#EFF6FF", border: "#3B82F6" },
      ].map(d => `
        <div class="detail-card">
          <div class="detail-card-header" style="background:${d.bg};border-left:3px solid ${d.border};">${d.title}</div>
          <div class="detail-card-body">${d.desc}</div>
        </div>
      `).join("")}
    </div>
  </div>
  <div class="brand-footer"><span>© 2025 Eagle Eye Management Services</span><span class="prepared">Prepared by: Ranaldo Daniels</span><span>Concept Only — Not For Construction</span></div>
</div>

</body>
</html>`;

    // Write HTML to temp file
    await writeFile(tmpHtml, html, "utf8");

    // Use WeasyPrint to convert HTML to PDF (pure Python, no browser needed)
    // Use full path + clean env to avoid Python version conflicts in deployed runtime
    await execFileAsync("/usr/local/bin/weasyprint", [tmpHtml, tmpPdf], {
      timeout: 60000,
      env: {
        HOME: process.env.HOME || "/tmp",
        PATH: "/usr/local/bin:/usr/bin:/bin",
        PYTHONIOENCODING: "utf-8",
        FONTCONFIG_PATH: "/etc/fonts",
        XDG_RUNTIME_DIR: "/tmp",
      },
    });

    // Read the generated PDF and send it
    const pdfBuffer = await readFile(tmpPdf);

    const filename = `${project.projectName.replace(/[^a-z0-9]/gi, "_")}_estimating_package.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("[PDF Export] Error:", err);
    res.status(500).json({ error: "PDF generation failed", details: String(err) });
  } finally {
    // Clean up temp files
    try { await unlink(tmpHtml); } catch {}
    try { await unlink(tmpPdf); } catch {}
  }
}
