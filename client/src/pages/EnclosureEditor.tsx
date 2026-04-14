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
  DEFAULT_ENCLOSURE_PARAMS,
  type EnclosureParams,
  type EnclosureFrameLayout,
  type EnclosurePanelOption,
} from "@shared/scopeTypes";
import {
  calculateEnclosureQTO,
  calculateEnclosureGrandTotal,
  enclosurePlanSVG,
  enclosureFrontElevSVG,
  enclosureSideElevSVG,
  enclosureSectionSVG,
} from "@shared/enclosureGeometry";

interface Props {
  projectId: number;
}

const RENDERING_STYLES = [
  { value: "photorealistic", label: "Day View" },
  { value: "dusk", label: "Dusk View" },
  { value: "interior", label: "Interior" },
  { value: "aerial", label: "Aerial" },
] as const;

export default function EnclosureEditor({ projectId }: Props) {
  const [, navigate] = useLocation();
  const [params, setParams] = useState<EnclosureParams>(DEFAULT_ENCLOSURE_PARAMS);
  const [isSaving, setIsSaving] = useState(false);
  const [renderingStyle, setRenderingStyle] = useState<"photorealistic" | "dusk" | "interior" | "aerial">("photorealistic");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: projectId });

  useEffect(() => {
    if (project?.inputsJson) {
      try {
        const saved = project.inputsJson as Record<string, unknown>;
        setParams(prev => ({ ...prev, ...saved }));
      } catch { /* ignore */ }
    }
  }, [project?.inputsJson]);

  const { data: renderings, isLoading: renderingsLoading } = trpc.renderings.list.useQuery({ projectId });
  const generateRenderingMutation = trpc.renderings.generate.useMutation({
    onSuccess: () => { utils.renderings.list.invalidate({ projectId }); toast.success("Rendering generated!"); },
    onError: (e) => toast.error(e.message || "Generation failed"),
  });
  const deleteRenderingMutation = trpc.renderings.delete.useMutation({
    onSuccess: () => { utils.renderings.list.invalidate({ projectId }); toast.success("Rendering deleted"); },
  });

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

  const qtoItems = calculateEnclosureQTO(params);
  const grandTotal = calculateEnclosureGrandTotal(qtoItems);

  const planSvg = enclosurePlanSVG(params);
  const frontSvg = enclosureFrontElevSVG(params);
  const sideSvg = enclosureSideElevSVG(params);
  const sectionSvg = enclosureSectionSVG(params);

  if (projectLoading) {
    return (
      <EagleEyeLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
        </div>
      </EagleEyeLayout>
    );
  }

  const enclosedFaces = [
    params.encloseFront && "Front",
    params.encloseLeft && "Left",
    params.encloseRight && "Right",
    params.encloseRear && "Rear",
  ].filter(Boolean).join(", ") || "None";

  const totalPanelArea = [
    params.encloseFront ? params.widthFt * params.heightFt : 0,
    params.encloseRear ? params.widthFt * params.heightFt : 0,
    params.encloseLeft ? params.depthFt * params.heightFt : 0,
    params.encloseRight ? params.depthFt * params.heightFt : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <EagleEyeLayout title={project?.projectName ?? "Enclosure Project"}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-gray-500">
          <ArrowLeft size={15} /> Dashboard
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#34D39922", color: "#34D399" }}>Enclosure</span>
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
          {["params", "drawings", "qto", "renderings", "notes"].map(tab => (
            <TabsTrigger key={tab} value={tab} className="text-xs px-3 py-1.5 capitalize flex-shrink-0">
              {tab === "qto" ? "QTO" : tab === "renderings" ? "AI Renderings" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Parameters ── */}
        <TabsContent value="params">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-widest text-[#34D399]">Enclosure Dimensions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Width (ft)</Label>
                  <Input type="number" step="0.1" value={params.widthFt} onChange={e => setParams(p => ({ ...p, widthFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Depth (ft)</Label>
                  <Input type="number" step="0.1" value={params.depthFt} onChange={e => setParams(p => ({ ...p, depthFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Height (ft)</Label>
                  <Input type="number" step="0.1" value={params.heightFt} onChange={e => setParams(p => ({ ...p, heightFt: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-widest text-[#34D399]">Enclosed Faces</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "encloseFront", label: "Front" },
                  { key: "encloseLeft", label: "Left" },
                  { key: "encloseRight", label: "Right" },
                  { key: "encloseRear", label: "Rear" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setParams(p => ({ ...p, [key]: !p[key as keyof EnclosureParams] }))}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all touch-manipulation ${
                      params[key as keyof EnclosureParams]
                        ? "border-[#34D399] bg-[#34D39915] text-[#34D399]"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-widest text-[#34D399]">Frame & Panel Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Frame Layout</Label>
                  <Select value={params.frameLayout} onValueChange={v => setParams(p => ({ ...p, frameLayout: v as EnclosureFrameLayout }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_span">Single Span</SelectItem>
                      <SelectItem value="modular_grid">Modular Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Panel Option</Label>
                  <Select value={params.panelOption} onValueChange={v => setParams(p => ({ ...p, panelOption: v as EnclosurePanelOption }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glass">Glass (12mm Toughened)</SelectItem>
                      <SelectItem value="polycarbonate">Polycarbonate (16mm)</SelectItem>
                      <SelectItem value="solid_panel">Solid Aluminium Panel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Finish Colour</Label>
                  <Input value={params.finishColor} onChange={e => setParams(p => ({ ...p, finishColor: e.target.value }))} className="mt-1" placeholder="e.g. Matte Black" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-widest text-[#34D399]">Door</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setParams(p => ({ ...p, hasDoor: !p.hasDoor }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all touch-manipulation ${
                    params.hasDoor ? "border-[#34D399] bg-[#34D39915] text-[#34D399]" : "border-gray-200 text-gray-400"
                  }`}
                >
                  {params.hasDoor ? "Door Included" : "No Door"}
                </button>
                {params.hasDoor && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">Door Width (ft)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={params.doorWidthFt}
                      onChange={e => setParams(p => ({ ...p, doorWidthFt: parseFloat(e.target.value) || 3 }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div><p className="text-xs text-gray-400">Width × Depth</p><p className="font-bold text-gray-900">{params.widthFt} × {params.depthFt} ft</p></div>
                <div><p className="text-xs text-gray-400">Height</p><p className="font-bold text-gray-900">{params.heightFt} ft</p></div>
                <div><p className="text-xs text-gray-400">Enclosed Faces</p><p className="font-bold text-gray-900">{enclosedFaces}</p></div>
                <div><p className="text-xs text-gray-400">Panel Area</p><p className="font-bold text-[#34D399]">{totalPanelArea.toFixed(1)} ft²</p></div>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">Quantity Take-Off</span>
              <span className="text-xs text-gray-400">Concept-level estimate only</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Description</th>
                    <th className="text-right px-4 py-2">Unit</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Rate</th>
                    <th className="text-right px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {qtoItems.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500">{item.category}</td>
                      <td className="px-4 py-2 text-xs text-gray-700">{item.description}</td>
                      <td className="px-4 py-2 text-xs text-right text-gray-500">{item.unit}</td>
                      <td className="px-4 py-2 text-xs text-right">{item.qty}</td>
                      <td className="px-4 py-2 text-xs text-right text-gray-500">${item.unitRate.toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium">${item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-right text-gray-700">GRAND TOTAL (Concept Estimate)</td>
                    <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: "#C9A84C" }}>${grandTotal.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── AI Renderings ── */}
        <TabsContent value="renderings">
          <div className="space-y-4">
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
                  depthFt: String(params.depthFt),
                  heightFt: String(params.heightFt),
                  finishColor: params.finishColor,
                  location: project?.location ?? undefined,
                  clientName: project?.clientName ?? undefined,
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
            />
          </div>
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
