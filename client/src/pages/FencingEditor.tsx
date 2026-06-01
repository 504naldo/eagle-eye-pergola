import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Wand2, Download, Trash2, ZoomIn } from "lucide-react";
import {
  DEFAULT_FENCING_PARAMS,
  type FencingParams,
  type FencingMeshType,
  type FencingAnchorMethod,
  type FencingFinish,
} from "@shared/scopeTypes";
// Extend FencingParams with index signature for saveInputs mutation
type FencingParamsRecord = FencingParams & Record<string, unknown>;
import FilesTab from "@/components/FilesTab";
import ReferencePhotosTab from "@/components/ReferencePhotosTab";
import { RatesTab } from "@/components/RatesTab";
import { PromptEditor } from "@/components/PromptEditor";
import { EditableQTOTable } from "@/components/EditableQTOTable";
import {
  calculateFencingQTO,
  getFencingDefaultRates,
  drawFencingGeneralNotes,
  drawFencingExistingConditions,
  drawFencingPlan,
  drawFencingFrontElevation,
  drawFencingSideElevation,
  drawFencingRightSideElevation,
  drawFencingOverheadClearance,
  drawFencingDetail,
  drawFencingMaterialSchedule,
  drawFencingDoorSchedule,
  drawFencingSiteVerification,
} from "@shared/fencingGeometry";

interface Props {
  projectId: number;
}

const RENDERING_STYLES = [
  { value: "photorealistic", label: "Day View" },
  { value: "dusk", label: "Dusk / Evening" },
  { value: "interior", label: "Interior (Inside Enclosure)" },
  { value: "aerial", label: "Aerial Overview" },
] as const;

export default function FencingEditor({ projectId }: Props) {
  const [, navigate] = useLocation();
  const [params, setParams] = useState<FencingParams>(DEFAULT_FENCING_PARAMS);
  const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [renderingStyle, setRenderingStyle] = useState<"photorealistic" | "dusk" | "interior" | "aerial">("photorealistic");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  const utils = trpc.useUtils();
  // QTO line overrides
  const { data: qtoLineOverrides = [] } = trpc.qto.getLineOverrides.useQuery({ projectId }, { enabled: !!projectId });
  const qtoOverridesMap = Object.fromEntries(qtoLineOverrides.map(o => [o.lineKey, { customQuantity: o.customQuantity ? parseFloat(o.customQuantity) : undefined, customUnit: o.customUnit ?? undefined, customDescription: o.customDescription ?? undefined }]));
  const updateQTOLine = trpc.qto.updateLineItem.useMutation({
    onSuccess: () => { utils.qto.getLineOverrides.invalidate({ projectId }); toast.success("QTO line updated"); },
    onError: () => toast.error("Failed to update QTO line"),
  });
  const deleteQTOLine = trpc.qto.deleteLineItem.useMutation({
    onSuccess: () => { utils.qto.getLineOverrides.invalidate({ projectId }); toast.success("QTO override removed"); },
    onError: () => toast.error("Failed to remove QTO override"),
  });

  // Load project
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: projectId });

  // Load saved inputs from inputsJson
  useEffect(() => {
    if (project?.inputsJson) {
      try {
        const saved = project.inputsJson as Record<string, unknown>;
        setParams(prev => ({ ...prev, ...saved }));
      } catch { /* ignore */ }
    }
  }, [project?.inputsJson]);

  // Load notes
  const { data: notesData } = trpc.notes.get.useQuery({ projectId }, { enabled: !!projectId });
  useEffect(() => {
    if (notesData?.notes !== undefined) setNotesText(notesData.notes);
  }, [notesData]);
  const saveNotesMutation = trpc.notes.save.useMutation({
    onSuccess: () => toast.success("Notes saved"),
    onError: (e: { message?: string }) => toast.error(e.message || "Save failed"),
  });

  // Load saved rate overrides
  const { data: savedRates } = trpc.rates.get.useQuery({ projectId }, { enabled: !!projectId });
  useEffect(() => {
    if (savedRates && Object.keys(savedRates).length > 0) {
      setRateOverrides(savedRates);
    }
  }, [savedRates]);

  // Reference photos (used to guide AI rendering generation)
  const { data: referencePhotos = [] } = trpc.referencePhotos.list.useQuery({ projectId }, { enabled: !!projectId });

  // Renderings
  const { data: renderings, isLoading: renderingsLoading } = trpc.renderings.list.useQuery({ projectId });
  const generateRenderingMutation = trpc.renderings.generate.useMutation({
    onSuccess: () => { utils.renderings.list.invalidate({ projectId }); toast.success("Rendering generated!"); },
    onError: (e) => toast.error(e.message || "Generation failed"),
  });
  const deleteRenderingMutation = trpc.renderings.delete.useMutation({
    onSuccess: () => utils.renderings.list.invalidate({ projectId }),
    onError: (e) => toast.error(e.message || "Delete failed"),
  });

  // Save inputs mutation
  const saveInputsMutation = trpc.inputs.save.useMutation({
    onError: (e: { message?: string }) => toast.error(e.message || "Save failed"),
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveInputsMutation.mutateAsync({ projectId, inputsJson: params as unknown as Record<string, unknown> });
      toast.success("Project saved");
    } catch { /* handled by onError */ }
    setIsSaving(false);
  }, [projectId, params, saveInputsMutation]);

  const handleExportPDF = useCallback(() => {
    const url = `/api/export/pdf/${projectId}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.projectName ?? "fencing"}-package.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [projectId, project?.projectName]);

  const handleGenerateRendering = useCallback(() => {
    // Map FencingEditor mesh type values to the server-side mesh type keys
    const meshTypeMap: Record<string, string> = {
      welded_wire_50x50: "welded_wire",
      welded_wire_75x75: "welded_wire",
      chain_link: "chain_link",
      expanded_metal: "expanded_metal",
      solid_panel: "solid_panel",
      palisade: "palisade",
    };
    const finishLabel = params.finish === "black_pc" ? "Powder Coat Black"
      : params.finish === "galvanised" ? "Hot-Dip Galvanised"
      : "Custom Powder Coat";

    console.log('[FencingEditor] handleGenerateRendering referencePhotos:', referencePhotos);
    generateRenderingMutation.mutate({
      projectId,
      style: renderingStyle,
      // Tell the server this is a fencing project — uses the fencing-specific prompt template
      scopeType: "fencing",
      // Fencing dimensions (mapped to the generic width/depth/height fields)
      widthFt: String(params.runLengthFt),   // run length
      depthFt: String(params.postSpacingFt), // post spacing
      heightFt: String(params.heightFt),     // fence height
      // Fencing-specific fields
      meshType: meshTypeMap[params.meshType] ?? params.meshType,
      anchorMethod: params.anchorMethod,
      hasGate: params.hasGate,
      gateWidthFt: params.hasGate ? params.gateWidthFt : undefined,
      finishColor: finishLabel,
      location: params.location || undefined,
      clientName: params.clientName || undefined,
      // Reference photo URLs — used as primary visual style guide
      referenceImageUrls: referencePhotos.map(p => p.imageUrl),
      customPrompt: customPrompt || undefined,
    });
  }, [projectId, params, renderingStyle, generateRenderingMutation, referencePhotos, customPrompt]);

  // QTO
  const qtoItems = calculateFencingQTO(params, rateOverrides);
  const grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);

  // SVG drawings — full construction package
  const generalNotesSVG = drawFencingGeneralNotes(params);
  const existingConditionsSVG = drawFencingExistingConditions(params);
  const planSVG = drawFencingPlan(params);
  const frontElevSVG = drawFencingFrontElevation(params);
  const sideElevSVG = drawFencingSideElevation(params);
  const rightSideElevSVG = drawFencingRightSideElevation(params);
  const overheadClearanceSVG = drawFencingOverheadClearance(params);
  const detailSVG = drawFencingDetail(params);
  const materialScheduleSVG = drawFencingMaterialSchedule(params);
  const doorScheduleSVG = drawFencingDoorSchedule(params);
  const siteVerificationSVG = drawFencingSiteVerification(params);

  const set = <K extends keyof FencingParams>(key: K, val: FencingParams[K]) =>
    setParams(prev => ({ ...prev, [key]: val }));

  if (projectLoading) {
    return (
      <EagleEyeLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
        </div>
      </EagleEyeLayout>
    );
  }

  // Group QTO items
  const qtoGroups = qtoItems.reduce<Record<string, typeof qtoItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <EagleEyeLayout>
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Rendering" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white text-3xl font-bold" onClick={() => setLightboxUrl(null)}>×</button>
        </div>
      )}

      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-[#C9A84C] hover:text-gray-900 shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#C9A84C]/20 text-[#C9A84C] uppercase tracking-wide shrink-0">Fencing</span>
              <h1 className="text-gray-900 font-bold text-base truncate">{project?.projectName ?? "Loading…"}</h1>
            </div>
            {(project?.clientName || project?.location) && (
              <p className="text-gray-400 text-xs truncate">{[project.clientName, project.location].filter(Boolean).join(" — ")}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-[#C9A84C]/60 text-[#C9A84C] hover:bg-[#C9A84C]/10 text-xs">
            <Download className="w-3 h-3 mr-1" /> Export PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-bold text-xs">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="params" className="flex-1 flex flex-col">
        <TabsList className="bg-white border-b border-gray-200 rounded-none h-auto p-0 justify-start overflow-x-auto flex-nowrap w-full">
          {[
            { value: "params", label: "Parameters" },
            { value: "drawings", label: "Drawings" },
            { value: "qto", label: "QTO" },
            { value: "renderings", label: "AI Renderings" },
            { value: "reference", label: "Reference Photos" },
            { value: "rates", label: "Unit Rates" },
            { value: "files", label: "Files" },
            { value: "notes", label: "Notes" },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#C9A84C] text-gray-400 px-4 py-3 text-xs font-medium whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Parameters Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="params" className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Fence Configuration</h2>

            {/* Project info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Client Name</Label>
                <Input
                  value={params.clientName}
                  onChange={e => set("clientName", e.target.value)}
                  placeholder="e.g. Strata Corp BC-1234"
                  className="bg-white border-gray-300 text-gray-900 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Location / Level</Label>
                <Input
                  value={params.location}
                  onChange={e => set("location", e.target.value)}
                  placeholder="e.g. Parkade Level B1"
                  className="bg-white border-gray-300 text-gray-900 text-sm"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="text-gray-700 font-semibold text-xs uppercase tracking-wide">Dimensions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Run Length (ft)</Label>
                  <Input type="number" min={4} max={200} step={0.5}
                    value={params.runLengthFt}
                    onChange={e => set("runLengthFt", parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-900 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Height (ft)</Label>
                  <Input type="number" min={3} max={16} step={0.5}
                    value={params.heightFt}
                    onChange={e => set("heightFt", parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-900 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Post Spacing (ft)</Label>
                  <Input type="number" min={2} max={10} step={0.5}
                    value={params.postSpacingFt}
                    onChange={e => set("postSpacingFt", parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-900 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">SHS Frame Section (mm)</Label>
                  <Select value={String(params.frameSectionMm)} onValueChange={v => set("frameSectionMm", parseInt(v))}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50×50×3 SHS</SelectItem>
                      <SelectItem value="65">65×65×3 SHS</SelectItem>
                      <SelectItem value="75">75×75×3 SHS</SelectItem>
                      <SelectItem value="100">100×100×4 SHS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Infill & Finish */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="text-gray-700 font-semibold text-xs uppercase tracking-wide">Infill & Finish</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Mesh / Infill Type</Label>
                  <Select value={params.meshType} onValueChange={v => set("meshType", v as FencingMeshType)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welded_wire_50x50">Welded Wire Mesh 50×50mm</SelectItem>
                      <SelectItem value="welded_wire_75x75">Welded Wire Mesh 75×75mm</SelectItem>
                      <SelectItem value="chain_link">Chain Link</SelectItem>
                      <SelectItem value="solid_panel">Solid Panel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Finish</Label>
                  <Select value={params.finish} onValueChange={v => set("finish", v as FencingFinish)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black_pc">Powder Coat — Black</SelectItem>
                      <SelectItem value="galvanised">Hot-Dip Galvanised</SelectItem>
                      <SelectItem value="custom_pc">Custom PC Colour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Anchor Method</Label>
                  <Select value={params.anchorMethod} onValueChange={v => set("anchorMethod", v as FencingAnchorMethod)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base_plate_epoxy">Base Plate + Epoxy Anchors</SelectItem>
                      <SelectItem value="core_drill_set">Core Drill & Set Anchors</SelectItem>
                      <SelectItem value="surface_mount">Surface Mount Brackets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Gate */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-700 font-semibold text-xs uppercase tracking-wide">Access Gate</h3>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-300 text-xs">Include Gate</Label>
                  <Switch
                    checked={params.hasGate}
                    onCheckedChange={v => set("hasGate", v)}
                    className="data-[state=checked]:bg-[#C9A84C]"
                  />
                </div>
              </div>
              {params.hasGate && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-300 text-xs">Gate Width (ft)</Label>
                    <Input type="number" min={2} max={16} step={0.5}
                      value={params.gateWidthFt}
                      onChange={e => set("gateWidthFt", parseFloat(e.target.value) || 0)}
                      className="bg-white border-gray-300 text-gray-900 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-300 text-xs">Gate Height (ft)</Label>
                    <Input type="number" min={3} max={16} step={0.5}
                      value={params.gateHeightFt}
                      onChange={e => set("gateHeightFt", parseFloat(e.target.value) || 0)}
                      className="bg-white border-gray-300 text-gray-900 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wide mb-3">Quick Estimate Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-gray-900 font-bold text-lg">{params.runLengthFt}ft</div>
                  <div className="text-gray-400 text-xs">Run Length</div>
                </div>
                <div>
                  <div className="text-gray-900 font-bold text-lg">{params.heightFt}ft</div>
                  <div className="text-gray-400 text-xs">Height</div>
                </div>
                <div>
                  <div className="text-gray-900 font-bold text-lg">{qtoItems.find(i => i.description.includes("Posts"))?.qty ?? 0}</div>
                  <div className="text-gray-400 text-xs">Posts</div>
                </div>
                <div>
                  <div className="text-[#C9A84C] font-bold text-lg">${grandTotal.toLocaleString()}</div>
                  <div className="text-gray-400 text-xs">Budget Total</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Drawings Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="drawings" className="flex-1 overflow-auto p-4">
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Construction Drawing Package</h2>
              <span className="text-gray-400 text-xs">PRELIMINARY — FOR ESTIMATING PURPOSES ONLY</span>
            </div>
            {[
              { sheet: "S-01", label: "General Notes & Scope", svg: generalNotesSVG },
              { sheet: "S-02", label: "Existing Conditions", svg: existingConditionsSVG },
              { sheet: "S-03", label: "Plan View", svg: planSVG },
              { sheet: "S-04", label: "Front Elevation", svg: frontElevSVG },
              { sheet: "S-05", label: "Left Side Elevation", svg: sideElevSVG },
              { sheet: "S-06", label: "Right Side Elevation", svg: rightSideElevSVG },
              { sheet: "S-07", label: "Overhead Clearance Diagram", svg: overheadClearanceSVG },
              { sheet: "S-08/09", label: "Construction Details (DET-01 through DET-08)", svg: detailSVG },
              { sheet: "S-10", label: "Material & Component Schedule", svg: materialScheduleSVG },
              { sheet: "S-11", label: "Door & Hardware Schedule", svg: doorScheduleSVG },
              { sheet: "S-12", label: "Site Verification Sheet", svg: siteVerificationSVG },
            ].map(({ sheet, label, svg }) => (
              <div key={sheet} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[#C9A84C] text-xs font-bold font-mono">{sheet}</span>
                    <span className="text-white text-xs font-semibold uppercase tracking-wide">{label}</span>
                  </div>
                  <span className="text-gray-400 text-xs">Eagle Eye Management Services</span>
                </div>
                <div
                  className="bg-white overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── QTO Tab ─────────────────────────────────────────────────────────── */}
        <TabsContent value="qto" className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Quantity Take-Off</h2>
              <span className="text-gray-400 text-xs">Click any row to edit qty or unit</span>
            </div>
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              ⚠ All quantities and costs are preliminary estimates only (CAD). Subject to field verification, supplier quotes, and licensed review prior to fabrication.
            </p>
            {Object.entries(qtoGroups).map(([group, items]) => (
              <div key={group} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                  <h3 className="text-sm font-semibold text-gray-800">{group}</h3>
                </div>
                <EditableQTOTable
                  items={items.map(item => ({
                    lineKey: item.lineKey ?? item.description,
                    description: qtoOverridesMap[item.lineKey ?? item.description]?.customDescription ?? item.description,
                    quantity: qtoOverridesMap[item.lineKey ?? item.description]?.customQuantity ?? item.qty,
                    unit: qtoOverridesMap[item.lineKey ?? item.description]?.customUnit ?? item.unit,
                    unitRate: rateOverrides[item.description] ?? item.unitRate,
                    total: (qtoOverridesMap[item.lineKey ?? item.description]?.customQuantity ?? item.qty) * (rateOverrides[item.description] ?? item.unitRate),
                  }))}
                  overrides={qtoOverridesMap}
                  onUpdateLineItem={async (lineKey, qty, unit, desc) => { updateQTOLine.mutate({ projectId, lineKey, customQuantity: qty, customUnit: unit, customDescription: desc }); }}
                  onDeleteLineItem={async (lineKey) => { deleteQTOLine.mutate({ projectId, lineKey }); }}
                />
              </div>
            ))}
            <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/60 rounded-lg px-6 py-4 flex justify-between items-center">
              <span className="text-[#C9A84C] font-bold text-sm uppercase tracking-wide">Preliminary Budget Total (excl. GST)</span>
              <span className="text-[#C9A84C] font-bold text-xl">${grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-gray-500 text-xs">* Budget estimate only. All quantities and rates require field verification and supplier confirmation prior to tender.</p>
          </div>
        </TabsContent>

        {/* ── AI Renderings Tab ───────────────────────────────────────────────── */}
        <TabsContent value="renderings" className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Prompt Editor */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <PromptEditor
                defaultPrompt="AI will generate a prompt based on your fencing parameters..."
                onPromptChange={setCustomPrompt}
                isLoading={generateRenderingMutation.isPending}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider mb-1">AI Visual Renderings</h2>
                <p className="text-gray-400 text-xs">Generate photorealistic images of your fencing design. Images are saved to this project and included in the PDF export.</p>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={renderingStyle} onValueChange={v => setRenderingStyle(v as typeof renderingStyle)}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RENDERING_STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateRendering}
                  disabled={generateRenderingMutation.isPending}
                  className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-bold text-xs whitespace-nowrap"
                >
                  {generateRenderingMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating…</>
                  ) : (
                    <><Wand2 className="w-3 h-3 mr-1" /> Generate</>
                  )}
                </Button>
              </div>
            </div>

            {renderingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="aspect-video bg-gray-50 rounded-lg animate-pulse border border-[#333]" />
                ))}
              </div>
            ) : !renderings?.length ? (
              <div className="text-center py-16 border border-gray-200 rounded-lg">
                <Wand2 className="w-10 h-10 text-[#C9A84C]/40 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No renderings yet.</p>
                <p className="text-gray-500 text-xs mt-1">Select a view style and click Generate to create your first AI rendering.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderings.map(r => (
                  <div key={r.id} className="group relative border border-[#333] rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={r.imageUrl}
                      alt={r.label ?? r.style}
                      className="w-full aspect-video object-cover cursor-pointer"
                      onClick={() => setLightboxUrl(r.imageUrl)}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button size="sm" variant="outline" className="border-white text-gray-600 text-xs"
                        onClick={() => setLightboxUrl(r.imageUrl)}>
                        <ZoomIn className="w-3 h-3 mr-1" /> View
                      </Button>
                      <a href={r.imageUrl} download className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-white text-gray-600 text-xs hover:bg-white/10">
                        <Download className="w-3 h-3" /> Download
                      </a>
                      <Button size="sm" variant="outline" className="border-red-400 text-red-400 text-xs"
                        onClick={() => deleteRenderingMutation.mutate({ id: r.id, projectId })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="px-3 py-2 bg-white border-t border-[#333]">
                      <span className="text-[#C9A84C] text-xs font-medium">{r.label ?? r.style}</span>
                      <span className="text-gray-500 text-xs ml-2">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Unit Rates Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="rates" className="flex-1 overflow-auto p-4">
          <RatesTab
            projectId={projectId}
            rateRows={qtoItems.map(i => ({
              category: i.group,
              description: i.description,
              unit: i.unit,
              defaultRate: getFencingDefaultRates()[i.description] ?? i.unitRate,
            }))}
            onRatesSaved={setRateOverrides}
          />
        </TabsContent>

        {/* ── Reference Photos Tab ─────────────────────────────────────────── */}
        <TabsContent value="reference" className="flex-1 overflow-auto p-4">
          <ReferencePhotosTab projectId={projectId} />
        </TabsContent>

        {/* ── Files Tab ───────────────────────────────────────────────────────── */}
        <TabsContent value="files" className="flex-1 overflow-auto p-4">
          {project && <FilesTab projectId={projectId} />}
        </TabsContent>

        {/* ── Notes Tab ───────────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Project Notes</h2>
            <textarea
              className="w-full h-64 bg-gray-50 border border-[#333] text-white text-sm rounded-lg p-4 resize-none focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="Add project notes, site observations, special conditions, or client instructions here…"
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs">Notes appear on the PDF cover sheet.</p>
              <Button
                size="sm"
                onClick={() => saveNotesMutation.mutate({ projectId, notes: notesText })}
                disabled={saveNotesMutation.isPending}
                className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-bold text-xs"
              >
                {saveNotesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Notes"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </EagleEyeLayout>
  );
}
