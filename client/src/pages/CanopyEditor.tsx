import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Wand2, Download, Trash2, ZoomIn } from "lucide-react";
import {
  DEFAULT_CANOPY_PARAMS,
  type CanopyParams,
  type CanopySupportType,
  type CanopyFasciaStyle,
  type CanopyLightingOption,
} from "@shared/scopeTypes";
import FilesTab from "@/components/FilesTab";
import ReferencePhotosTab from "@/components/ReferencePhotosTab";
import { RatesTab } from "@/components/RatesTab";
import { PromptEditor } from "@/components/PromptEditor";
import { EditableQTOTable } from "@/components/EditableQTOTable";
import {
  calculateCanopyQTO,
  calculateCanopyGrandTotal,
  getCanopyDefaultRates,
  canopyPlanSVG,
  canopyFrontElevSVG,
  canopySideElevSVG,
  canopySectionSVG,
} from "@shared/canopyGeometry";

interface Props {
  projectId: number;
}

const RENDERING_STYLES = [
  { value: "photorealistic", label: "Day View" },
  { value: "dusk", label: "Dusk View" },
  { value: "interior", label: "Interior" },
  { value: "aerial", label: "Aerial" },
] as const;

export default function CanopyEditor({ projectId }: Props) {
  const [, navigate] = useLocation();
  const [params, setParams] = useState<CanopyParams>(DEFAULT_CANOPY_PARAMS);
  const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load saved rate overrides from DB on mount
  const { data: savedRates } = trpc.rates.get.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  useEffect(() => {
    if (savedRates && Object.keys(savedRates).length > 0) {
      setRateOverrides(savedRates);
    }
  }, [savedRates]);
  const [renderingStyle, setRenderingStyle] = useState<"photorealistic" | "dusk" | "interior" | "aerial">("photorealistic");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
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

  // Load saved inputs
  useEffect(() => {
    if (project?.inputsJson) {
      try {
        const saved = project.inputsJson as Record<string, unknown>;
        setParams(prev => ({ ...prev, ...saved }));
      } catch { /* ignore */ }
    }
  }, [project?.inputsJson]);

  // Reference photos
  const { data: referencePhotos = [] } = trpc.referencePhotos.list.useQuery({ projectId }, { enabled: !!projectId });

  // Renderings
  const { data: renderings, isLoading: renderingsLoading } = trpc.renderings.list.useQuery({ projectId });
  const generateRenderingMutation = trpc.renderings.generate.useMutation({
    onSuccess: () => { utils.renderings.list.invalidate({ projectId }); toast.success("Rendering generated!"); },
    onError: (e) => toast.error(e.message || "Generation failed"),
  });
  const deleteRenderingMutation = trpc.renderings.delete.useMutation({
    onSuccess: () => { utils.renderings.list.invalidate({ projectId }); toast.success("Rendering deleted"); },
  });

  // Save inputs
  const saveInputsMutation = trpc.inputs.save.useMutation({
    onSuccess: () => { utils.projects.get.invalidate({ id: projectId }); toast.success("Parameters saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveInputsMutation.mutateAsync({ projectId, inputsJson: params as unknown as Record<string, unknown> });
    } finally {
      setIsSaving(false);
    }
  }, [params, projectId, saveInputsMutation]);

  // Live QTO
  const qtoItems = calculateCanopyQTO(params, rateOverrides);
  const grandTotal = calculateCanopyGrandTotal(qtoItems);

  // Live SVGs
  const planSvg = canopyPlanSVG(params);
  const frontSvg = canopyFrontElevSVG(params);
  const sideSvg = canopySideElevSVG(params);
  const sectionSvg = canopySectionSVG(params);

  if (projectLoading) {
    return (
      <EagleEyeLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
        </div>
      </EagleEyeLayout>
    );
  }

  return (
    <EagleEyeLayout title={project?.projectName ?? "Canopy Project"}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-gray-500">
          <ArrowLeft size={15} /> Dashboard
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#60A5FA22", color: "#60A5FA" }}>Canopy</span>
            {project?.clientName && <span className="text-xs text-gray-400 truncate">{project.clientName}</span>}
            {project?.location && <span className="text-xs text-gray-400 truncate">{project.location}</span>}
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5 font-semibold"
          style={{ backgroundColor: "#C9A84C", color: "#111111" }}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </Button>
      </div>

      <Tabs defaultValue="params">
        <TabsList className="flex overflow-x-auto whitespace-nowrap gap-0.5 mb-4 h-auto p-1 bg-gray-100 rounded-lg">
          {["params", "drawings", "qto", "renderings", "reference", "notes", "rates", "files"].map(tab => (
            <TabsTrigger key={tab} value={tab} className="text-xs px-3 py-1.5 capitalize flex-shrink-0">
              {tab === "qto" ? "QTO" : tab === "renderings" ? "AI Renderings" : tab === "reference" ? "Reference Photos" : tab === "files" ? "Files" : tab === "rates" ? "Unit Rates" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Parameters ── */}
        <TabsContent value="params">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-widest text-[#C9A84C]">Canopy Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Width (ft)</Label>
                <Input type="number" step="0.1" value={params.widthFt} onChange={e => setParams(p => ({ ...p, widthFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Projection / Depth (ft)</Label>
                <Input type="number" step="0.1" value={params.projectionFt} onChange={e => setParams(p => ({ ...p, projectionFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Height to Underside (ft)</Label>
                <Input type="number" step="0.1" value={params.heightFt} onChange={e => setParams(p => ({ ...p, heightFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Support Type</Label>
                <Select value={params.supportType} onValueChange={v => setParams(p => ({ ...p, supportType: v as CanopySupportType }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wall_mounted">Wall Mounted</SelectItem>
                    <SelectItem value="freestanding">Freestanding</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fascia Style</Label>
                <Select value={params.fasciaStyle} onValueChange={v => setParams(p => ({ ...p, fasciaStyle: v as CanopyFasciaStyle }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="tapered">Tapered</SelectItem>
                    <SelectItem value="bullnose">Bullnose</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Slope (degrees)</Label>
                <Input type="number" step="0.5" min="0" max="15" value={params.slopeDeg} onChange={e => setParams(p => ({ ...p, slopeDeg: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Finish Colour</Label>
                <Input value={params.finishColor} onChange={e => setParams(p => ({ ...p, finishColor: e.target.value }))} className="mt-1" placeholder="e.g. Matte Black" />
              </div>
              <div>
                <Label className="text-xs">Lighting Option</Label>
                <Select value={params.lightingOption} onValueChange={v => setParams(p => ({ ...p, lightingOption: v as CanopyLightingOption }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="led_strip">LED Strip</SelectItem>
                    <SelectItem value="downlights">Downlights</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div><p className="text-xs text-gray-400">Width</p><p className="font-bold text-gray-900">{params.widthFt.toFixed(2)} ft</p></div>
                <div><p className="text-xs text-gray-400">Projection</p><p className="font-bold text-gray-900">{params.projectionFt.toFixed(2)} ft</p></div>
                <div><p className="text-xs text-gray-400">Height</p><p className="font-bold text-gray-900">{params.heightFt.toFixed(2)} ft</p></div>
                <div><p className="text-xs text-gray-400">Roof Area</p><p className="font-bold text-[#C9A84C]">{(params.widthFt * params.projectionFt).toFixed(1)} ft²</p></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Drawings ── */}
        <TabsContent value="drawings">
          <div className="space-y-4">
            <p className="text-xs text-gray-400 italic">Concept Only – Not For Construction. Drawings update live as parameters change.</p>
            {[
              { label: "Plan View", svg: planSvg },
              { label: "Front Elevation", svg: frontSvg },
              { label: "Side Elevation", svg: sideSvg },
              { label: "Section A–A", svg: sectionSvg },
            ].map(({ label, svg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{label}</span>
                </div>
                <div className="overflow-x-auto p-2">
                  <div dangerouslySetInnerHTML={{ __html: svg }} className="min-w-[400px]" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── QTO ── */}
        <TabsContent value="qto">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">Quantity Take-Off</span>
              <span className="text-xs text-gray-400">Click any row to edit qty or unit</span>
            </div>
            <p className="text-xs text-red-600 mb-4 bg-red-50 border border-red-200 rounded p-2">
              ⚠ All quantities and costs are preliminary estimates only (CAD). Subject to field verification, supplier quotes, and licensed review prior to fabrication.
            </p>
            {Array.from(new Set(qtoItems.map(i => i.category))).map(cat => (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                  <h3 className="text-sm font-semibold text-gray-800">{cat}</h3>
                </div>
                <EditableQTOTable
                  items={qtoItems.filter(i => i.category === cat).map(item => ({
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
            <div className="mt-4 flex justify-end">
              <div className="bg-gray-50 rounded-lg px-6 py-4">
                <div className="text-[#C9A84C] text-xs uppercase tracking-widest mb-1">Preliminary Budget Estimate</div>
                <div className="text-gray-900 text-2xl font-bold">${grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-gray-400 text-xs mt-1">CAD — Concept Only, Not For Construction</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── AI Renderings ── */}
        <TabsContent value="renderings">
          <div className="space-y-4">
            {/* Prompt Editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <PromptEditor
                defaultPrompt="AI will generate a prompt based on your canopy parameters..."
                onPromptChange={setCustomPrompt}
                isLoading={generateRenderingMutation.isPending}
              />
            </div>

            {/* Generate panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3">Generate AI Rendering</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {RENDERING_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setRenderingStyle(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all touch-manipulation ${
                      renderingStyle === s.value
                        ? "border-[#C9A84C] bg-[#C9A84C15] text-[#C9A84C]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => generateRenderingMutation.mutate({
                  projectId,
                  style: renderingStyle,
                  widthFt: String(params.widthFt),
                  depthFt: String(params.projectionFt),
                  heightFt: String(params.heightFt),
                  finishColor: params.finishColor,
                  location: project?.location ?? undefined,
                  clientName: project?.clientName ?? undefined,
                  referenceImageUrls: referencePhotos.map(p => p.imageUrl),
                  customPrompt: customPrompt || undefined,
                })}
                disabled={generateRenderingMutation.isPending}
                className="gap-2 font-semibold"
                style={{ backgroundColor: "#C9A84C", color: "#111111" }}
              >
                {generateRenderingMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Wand2 size={14} /> Generate Rendering</>}
              </Button>
              {generateRenderingMutation.isPending && (
                <p className="text-xs text-gray-400 mt-2">AI rendering takes 10–20 seconds…</p>
              )}
            </div>

            {/* Gallery */}
            {renderingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : renderings && renderings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderings.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                    <div className="relative">
                      <img
                        src={r.imageUrl}
                        alt={r.label ?? r.style}
                        className="w-full aspect-video object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(r.imageUrl)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn size={28} className="text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{r.label ?? r.style}</p>
                        <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        <a href={r.imageUrl} download target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Download size={13} /></Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                          onClick={() => deleteRenderingMutation.mutate({ id: r.id })}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <Wand2 size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No renderings yet. Generate your first AI rendering above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3">Project Notes</h3>
            <textarea
              className="w-full min-h-[200px] text-sm text-gray-700 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
              placeholder="Add project notes, scope clarifications, or client requirements here…"
              defaultValue={project?.notes ?? ""}
              onBlur={async (e) => {
                await trpc.useUtils().projects.get.invalidate({ id: projectId });
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="reference">
          <div className="p-4">
            <ReferencePhotosTab projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="files">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
              <h2 className="text-sm font-semibold text-gray-900">Project Files</h2>
              <span className="text-xs text-gray-400">— Photos, drawings, documents</span>
            </div>
            {projectId && <FilesTab projectId={projectId} />}
          </div>
        </TabsContent>

        <TabsContent value="rates">
          <RatesTab
            projectId={projectId}
            rateRows={qtoItems.map(i => ({ category: i.category, description: i.description, unit: i.unit, defaultRate: getCanopyDefaultRates()[i.description] ?? i.unitRate }))}
            onRatesSaved={saved => setRateOverrides(saved)}
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Rendering" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </EagleEyeLayout>
  );
}
