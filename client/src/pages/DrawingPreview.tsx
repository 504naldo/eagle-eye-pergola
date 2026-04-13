import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import PlanView from "@/components/drawings/PlanView";
import { FrontElevation, SideElevation, SectionView } from "@/components/drawings/Elevations";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { getDrawingDimensions, PergolaParams } from "@shared/geometry";
import { useState } from "react";
import { toast } from "sonner";

export default function DrawingPreview() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, navigate] = useLocation();
  const [exportLoading, setExportLoading] = useState(false);

  const { data: project } = trpc.projects.get.useQuery({ id: projectId });
  const { data: projectParams } = trpc.params.get.useQuery({ projectId });

  const pergolaParams: PergolaParams = {
    widthFt: parseFloat(projectParams?.widthFt ?? "58") || 58,
    depthFt: parseFloat(projectParams?.depthFt ?? "15.67") || 15.67,
    heightFt: parseFloat(projectParams?.heightFt ?? "10") || 10,
    postCount: projectParams?.postCount ?? 5,
    postSpacingFt: parseFloat(projectParams?.postSpacingFt ?? "14.5") || 14.5,
    slatType: (projectParams?.slatType as "fixed" | "operable") ?? "fixed",
    slatSpacingIn: parseFloat(projectParams?.slatSpacingIn ?? "4") || 4,
    glassFront: projectParams?.glassFront ?? true,
    glassLeft: projectParams?.glassLeft ?? true,
    glassRight: projectParams?.glassRight ?? true,
    finishColor: projectParams?.finishColor ?? "Matte Black",
    ledLighting: projectParams?.ledLighting ?? true,
  };

  const dims = getDrawingDimensions(pergolaParams);

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await fetch(`/api/export/pdf/${projectId}`, { method: "GET" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.projectName ?? "project"}_estimating_package.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <EagleEyeLayout title="Drawing Preview">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <button onClick={() => navigate(`/project/${projectId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={16} /> Back to Editor
          </button>
          <div className="flex items-center gap-3">
            {project && (
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{project.projectName}</span>
                {project.clientName && <span className="text-gray-400"> — {project.clientName}</span>}
              </div>
            )}
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#C9A84C", color: "#111111" }}
              onClick={handleExportPDF}
              disabled={exportLoading}
            >
              <Download size={14} /> {exportLoading ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Drawings grid */}
        <div className="space-y-6">
          {/* Plan View */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#111111] px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-sm font-medium">Sheet 03 — Plan View</span>
              <span className="text-[#C9A84C] text-xs">Scale: NTS</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <PlanView dims={dims} width={760} height={440} />
            </div>
          </div>

          {/* Elevations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#111111] px-4 py-2.5 flex items-center justify-between">
                <span className="text-white text-sm font-medium">Sheet 04 — Front Elevation</span>
                <span className="text-[#C9A84C] text-xs">Scale: NTS</span>
              </div>
              <div className="p-3 overflow-x-auto">
                <FrontElevation dims={dims} width={480} height={320} />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#111111] px-4 py-2.5 flex items-center justify-between">
                <span className="text-white text-sm font-medium">Sheet 05 — Side Elevation</span>
                <span className="text-[#C9A84C] text-xs">Scale: NTS</span>
              </div>
              <div className="p-3 overflow-x-auto">
                <SideElevation dims={dims} width={480} height={320} />
              </div>
            </div>
          </div>

          {/* Section */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#111111] px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-sm font-medium">Sheet 06 — Section A–A</span>
              <span className="text-[#C9A84C] text-xs">Scale: NTS</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <SectionView dims={dims} width={760} height={380} />
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
          <strong>Disclaimer:</strong> All drawings are schematic concept drawings for estimating purposes only. Not to scale. Not for construction. Subject to field verification, licensed structural review, and permit approval prior to fabrication.
          <br />
          <span className="text-gray-500 mt-1 block">Prepared by: Ranaldo Daniels — Eagle Eye Management Services</span>
        </div>
      </div>
    </EagleEyeLayout>
  );
}
