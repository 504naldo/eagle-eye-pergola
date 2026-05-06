import { Request, Response } from "express";
import { buildPhasedEnclosurePDF } from "./phasedEnclosurePdfBuilder";
import { getProjectById, getPhasedEnclosureParams } from "./db";
import {
  getDefaultMilestonesPhase1,
  getDefaultMilestonesPhase2,
  getDefaultMilestonesPricing,
  getDefaultMilestonesFieldNotes,
} from "../shared/phasedEnclosureGeometry";

export async function handlePhasedEnclosurePDFExport(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const saved = await getPhasedEnclosureParams(projectId);

    const phase1 = saved?.phase1Json ?? getDefaultMilestonesPhase1();
    const phase2 = saved?.phase2Json ?? getDefaultMilestonesPhase2();
    const pricing = saved?.pricingJson ?? getDefaultMilestonesPricing();
    const fieldNotes = saved?.fieldNotesJson ?? getDefaultMilestonesFieldNotes();
    const scopeMode = saved?.scopeMode ?? "fullBuildout";
    const approvedDrawingName = saved?.approvedDrawingName ?? "17015_abbotsfordpatio-ID101.pdf";
    const customDimensions = saved?.customDimensions ?? [];

    const pdfBuffer = buildPhasedEnclosurePDF({
      projectName: project.projectName,
      approvedDrawingName,
      scopeMode: scopeMode as any,
      phase1: phase1 as any,
      phase2: phase2 as any,
      pricing: pricing as any,
      fieldNotes: fieldNotes as any,
      customDimensions: customDimensions as any,
    });

    const filename = `${project.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_Supplemental_Package.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[phasedEnclosurePdfExport] Error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
}
