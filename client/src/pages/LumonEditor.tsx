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
import { ArrowLeft, Save, Loader2, Plus, Trash2, Download } from "lucide-react";
import {
  DEFAULT_LUMON_PARAMS,
  type LumonParams,
  type LumonBay,
  type LumonSystemType,
  type LumonGlassZoneConfig,
  type LumonStackingDirection,
} from "@shared/scopeTypes";
import {
  drawLumonPlan,
  drawLumonFrontElevation,
  drawLumonSideElevation,
  drawLumonTypicalSection,
  drawLumonConnectionDetail,
} from "@shared/lumonGlazingGeometry";
import {
  calculateLumonQTO,
  getLumonDefaultRates,
  getLumonGlassSummary,
  type LumonQTOItem,
} from "@shared/lumonQTO";
import { EditableQTOTable } from "@/components/EditableQTOTable";
import FilesTab from "@/components/FilesTab";
import { RatesTab } from "@/components/RatesTab";

interface Props {
  projectId: number;
}

const TABS = [
  { value: "dimensions", label: "Dimensions" },
  { value: "glazing", label: "Glazing & Bays" },
  { value: "drawings", label: "Drawings" },
  { value: "qto", label: "QTO" },
  { value: "rates", label: "Rates" },
  { value: "files", label: "Files" },
];

export default function LumonEditor({ projectId }: Props) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });

  // ── Params state ──────────────────────────────────────────────────────────
  const [params, setParams] = useState<LumonParams>(DEFAULT_LUMON_PARAMS);

  useEffect(() => {
    if (project?.inputsJson) {
      try {
        const saved = project.inputsJson as Record<string, unknown>;
        setParams(prev => ({ ...prev, ...saved }));
      } catch {
        // ignore
      }
    }
  }, [project?.inputsJson]);

  const set = useCallback(<K extends keyof LumonParams>(key: K, value: LumonParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveInputsMutation = trpc.inputs.save.useMutation({
    onSuccess: () => {
      toast.success("Lumon parameters saved");
      utils.projects.get.invalidate({ id: projectId });
    },
    onError: () => toast.error("Failed to save parameters"),
  });

  const handleSave = () => {
    saveInputsMutation.mutate({ projectId, inputsJson: params as unknown as Record<string, unknown> });
  };

  // ── QTO ───────────────────────────────────────────────────────────────────
  const { data: qtoLineOverrides = [] } = trpc.qto.getLineOverrides.useQuery({ projectId }, { enabled: !!projectId });
  const qtoOverridesMap = Object.fromEntries(
    qtoLineOverrides.map(o => [o.lineKey, {
      customQuantity: o.customQuantity ? parseFloat(o.customQuantity) : undefined,
      customUnit: o.customUnit ?? undefined,
      customDescription: o.customDescription ?? undefined,
    }])
  );
  const updateQTOLine = trpc.qto.updateLineItem.useMutation({
    onSuccess: () => { utils.qto.getLineOverrides.invalidate({ projectId }); toast.success("QTO line updated"); },
    onError: () => toast.error("Failed to update QTO line"),
  });
  const deleteQTOLine = trpc.qto.deleteLineItem.useMutation({
    onSuccess: () => { utils.qto.getLineOverrides.invalidate({ projectId }); toast.success("QTO override removed"); },
    onError: () => toast.error("Failed to remove QTO override"),
  });

  const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({});
  const { data: savedRates } = trpc.rates.get.useQuery({ projectId }, { enabled: !!projectId });
  useEffect(() => {
    if (savedRates) setRateOverrides(savedRates);
  }, [savedRates]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const qtoItems = calculateLumonQTO(params, rateOverrides);
  const grandTotal = qtoItems.reduce((s, i) => s + i.lineTotal, 0);
  const glassSummary = getLumonGlassSummary(params);

  // Group QTO items
  const qtoGroups = qtoItems.reduce<Record<string, LumonQTOItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  // ── SVG drawings ──────────────────────────────────────────────────────────
  const planSVG = drawLumonPlan(params);
  const frontElevSVG = drawLumonFrontElevation(params);
  const leftSideElevSVG = drawLumonSideElevation(params, "left");
  const rightSideElevSVG = drawLumonSideElevation(params, "right");
  const typicalSectionSVG = drawLumonTypicalSection(params);
  const lowerConnectionSVG = drawLumonConnectionDetail(params, "lower");
  const railingConnectionSVG = drawLumonConnectionDetail(params, "railing");
  const upperConnectionSVG = drawLumonConnectionDetail(params, "upper");

  // ── Bay helpers ───────────────────────────────────────────────────────────
  const addBay = () => {
    const newBay: LumonBay = {
      widthMm: 4000,
      stackingDirection: "right",
      isFixed: false,
      hasDoor: false,
      doorWidthMm: 0,
    };
    set("bays", [...params.bays, newBay]);
  };

  const removeBay = (idx: number) => {
    if (params.bays.length <= 1) { toast.error("At least one bay is required"); return; }
    set("bays", params.bays.filter((_, i) => i !== idx));
  };

  const updateBay = (idx: number, key: keyof LumonBay, value: unknown) => {
    const updated = params.bays.map((b, i) => i === idx ? { ...b, [key]: value } : b);
    set("bays", updated);
  };

  if (isLoading) {
    return (
      <EagleEyeLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
        </div>
      </EagleEyeLayout>
    );
  }

  return (
    <EagleEyeLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-white font-bold text-sm">{project?.projectName ?? "Lumon Glass System"}</h1>
              <p className="text-gray-400 text-xs">{project?.clientName ?? ""} — Lumon LGS/LGF</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveInputsMutation.isPending}
            size="sm"
            className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-semibold"
          >
            {saveInputsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="dimensions" className="flex flex-col flex-1 min-h-0">
          <TabsList className="bg-white border-b border-gray-200 rounded-none h-auto p-0 justify-start overflow-x-auto flex-nowrap w-full flex-shrink-0">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#C9A84C] text-gray-500 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Dimensions Tab ───────────────────────────────────────────── */}
          <TabsContent value="dimensions" className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Project Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Project Name</Label>
                    <Input value={params.projectName} onChange={e => set("projectName", e.target.value)} className="mt-1" placeholder="e.g. Milestones Abbotsford" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Client Name</Label>
                    <Input value={params.clientName} onChange={e => set("clientName", e.target.value)} className="mt-1" placeholder="e.g. Milestones Restaurants" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Location</Label>
                    <Input value={params.location} onChange={e => set("location", e.target.value)} className="mt-1" placeholder="e.g. 3122 Mount Lehman Rd, Abbotsford" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Lumon Project No.</Label>
                    <Input value={params.lumonProjectNo} onChange={e => set("lumonProjectNo", e.target.value)} className="mt-1" placeholder="e.g. 50929123" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">System Type</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">System Type</Label>
                    <Select value={params.systemType} onValueChange={v => set("systemType", v as LumonSystemType)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LGS">LGS — Sliding Glazing</SelectItem>
                        <SelectItem value="LGF">LGF — Fixed Glazing</SelectItem>
                        <SelectItem value="mixed">Mixed (LGS + LGF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Finish Colour</Label>
                    <Input value={params.finishColor} onChange={e => set("finishColor", e.target.value)} className="mt-1" placeholder="e.g. Anodised Silver" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Overall Geometry</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Overall Span (mm)</Label>
                    <Input type="number" value={params.overallSpanMm} onChange={e => set("overallSpanMm", parseInt(e.target.value) || 0)} className="mt-1" />
                    <p className="text-xs text-gray-400 mt-1">{(params.overallSpanMm / 304.8).toFixed(1)}′ ({Math.floor(params.overallSpanMm / 304.8)}′-{Math.round((params.overallSpanMm % 304.8) / 25.4)}″)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Finished Height — FH (mm)</Label>
                    <Input type="number" value={params.finishedHeightMm} onChange={e => set("finishedHeightMm", parseInt(e.target.value) || 0)} className="mt-1" />
                    <p className="text-xs text-gray-400 mt-1">{(params.finishedHeightMm / 304.8).toFixed(1)}′</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Railing Profile Depth (mm)</Label>
                    <Select value={String(params.railingProfileMm)} onValueChange={v => set("railingProfileMm", parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="120">120mm</SelectItem>
                        <SelectItem value="160">160mm (standard)</SelectItem>
                        <SelectItem value="200">200mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Glass Thickness (mm)</Label>
                    <Select value={String(params.glassThicknessMm)} onValueChange={v => set("glassThicknessMm", parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6mm</SelectItem>
                        <SelectItem value="8">8mm (standard)</SelectItem>
                        <SelectItem value="10">10mm</SelectItem>
                        <SelectItem value="12">12mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Stacking Zones</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Left Stacking Zone (mm)</Label>
                    <Input type="number" value={params.leftStackingZoneMm} onChange={e => set("leftStackingZoneMm", parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Right Stacking Zone (mm)</Label>
                    <Input type="number" value={params.rightStackingZoneMm} onChange={e => set("rightStackingZoneMm", parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Posts & Anchors</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Existing Front Post Section (mm)</Label>
                    <Select value={String(params.frontPostSectionMm)} onValueChange={v => set("frontPostSectionMm", parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100mm (4″×4″)</SelectItem>
                        <SelectItem value="152">152mm (6″×6″)</SelectItem>
                        <SelectItem value="178">178mm (7″×7″)</SelectItem>
                        <SelectItem value="200">200mm (8″×8″)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Lumon Post Section (mm)</Label>
                    <Select value={String(params.lumonPostSectionMm)} onValueChange={v => set("lumonPostSectionMm", parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50×50mm</SelectItem>
                        <SelectItem value="70">70×70mm (standard)</SelectItem>
                        <SelectItem value="90">90×90mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Anchor Type</Label>
                    <Input value={params.anchorType} onChange={e => set("anchorType", e.target.value)} className="mt-1" placeholder="e.g. 7.5×75 Multimonti concrete screw" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Min. Embedment (mm)</Label>
                    <Input type="number" value={params.anchorEmbedmentMm} onChange={e => set("anchorEmbedmentMm", parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Design Criteria</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Building Code</Label>
                    <Input value={params.buildingCode} onChange={e => set("buildingCode", e.target.value)} className="mt-1" placeholder="e.g. BCBC 2018" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Wind Load (kPa)</Label>
                    <Input type="number" step="0.05" value={params.windLoadKPa} onChange={e => set("windLoadKPa", parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Snow Load (kPa)</Label>
                    <Input type="number" step="0.1" value={params.snowLoadKPa} onChange={e => set("snowLoadKPa", parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Glazing & Bays Tab ────────────────────────────────────────── */}
          <TabsContent value="glazing" className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="max-w-3xl space-y-6">
              {/* Glass zones */}
              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Glass Zone Configuration</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Zone Config</Label>
                    <Select value={params.glassZoneConfig} onValueChange={v => set("glassZoneConfig", v as LumonGlassZoneConfig)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Zone (full height)</SelectItem>
                        <SelectItem value="upper_lower">Upper + Lower Zones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Lower Zone Height (mm)</Label>
                    <Input type="number" value={params.lowerZoneHeightMm} onChange={e => set("lowerZoneHeightMm", parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                  {params.glassZoneConfig === "upper_lower" && (
                    <div>
                      <Label className="text-xs text-gray-600">Upper Zone Height (mm)</Label>
                      <Input type="number" value={params.upperZoneHeightMm} onChange={e => set("upperZoneHeightMm", parseInt(e.target.value) || 0)} className="mt-1" />
                    </div>
                  )}
                </div>
              </div>

              {/* Side returns */}
              <div>
                <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider mb-4">Side Returns</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <Switch checked={params.hasLeftReturn} onCheckedChange={v => set("hasLeftReturn", v)} />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-600">Left Return</Label>
                      {params.hasLeftReturn && (
                        <div className="mt-2">
                          <Label className="text-xs text-gray-400">Width (mm)</Label>
                          <Input type="number" value={params.leftReturnWidthMm} onChange={e => set("leftReturnWidthMm", parseInt(e.target.value) || 0)} className="mt-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <Switch checked={params.hasRightReturn} onCheckedChange={v => set("hasRightReturn", v)} />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-600">Right Return</Label>
                      {params.hasRightReturn && (
                        <div className="mt-2">
                          <Label className="text-xs text-gray-400">Width (mm)</Label>
                          <Input type="number" value={params.rightReturnWidthMm} onChange={e => set("rightReturnWidthMm", parseInt(e.target.value) || 0)} className="mt-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bays */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#C9A84C] font-bold text-xs uppercase tracking-wider">Bays ({params.bays.length})</h2>
                  <Button onClick={addBay} size="sm" variant="outline" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Bay
                  </Button>
                </div>

                {/* Summary bar */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-400">Total Glass</span><div className="font-bold text-gray-900">{glassSummary.totalGlassM2} m²</div></div>
                  <div><span className="text-gray-400">Sliding</span><div className="font-bold text-[#2266AA]">{glassSummary.totalSlidingM2} m²</div></div>
                  <div><span className="text-gray-400">Fixed</span><div className="font-bold text-[#226622]">{glassSummary.totalFixedM2} m²</div></div>
                  <div><span className="text-gray-400">Posts</span><div className="font-bold text-gray-900">{glassSummary.postCount} ea</div></div>
                </div>

                <div className="space-y-3">
                  {params.bays.map((bay, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-700 uppercase">Bay {idx + 1}</span>
                        <Button onClick={() => removeBay(idx)} size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-6 w-6 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Width (mm)</Label>
                          <Input type="number" value={bay.widthMm} onChange={e => updateBay(idx, "widthMm", parseInt(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Stacking Direction</Label>
                          <Select value={bay.stackingDirection} onValueChange={v => updateBay(idx, "stackingDirection", v as LumonStackingDirection)}>
                            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">← Left</SelectItem>
                              <SelectItem value="right">Right →</SelectItem>
                              <SelectItem value="centre_split">↔ Centre Split</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <Switch checked={bay.isFixed} onCheckedChange={v => updateBay(idx, "isFixed", v)} />
                          <Label className="text-xs text-gray-500">Fixed (×)</Label>
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <Switch checked={bay.hasDoor} onCheckedChange={v => updateBay(idx, "hasDoor", v)} />
                          <Label className="text-xs text-gray-500">Door Opening</Label>
                        </div>
                        {bay.hasDoor && (
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">Door R.O. Width (mm)</Label>
                            <Input type="number" value={bay.doorWidthMm} onChange={e => updateBay(idx, "doorWidthMm", parseInt(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Drawings Tab ─────────────────────────────────────────────── */}
          <TabsContent value="drawings" className="flex-1 overflow-auto p-4">
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Lumon Shop Drawing Package</h2>
                <span className="text-gray-400 text-xs">PRELIMINARY — CONCEPT ONLY, NOT FOR CONSTRUCTION</span>
              </div>
              {[
                { sheet: "L1.1", label: "Plan on Post — System Layout", svg: planSVG },
                { sheet: "L2.1", label: "Front Elevation (Sides 5–8)", svg: frontElevSVG },
                { sheet: "L2.2a", label: "Left Side Elevation", svg: leftSideElevSVG },
                { sheet: "L2.2b", label: "Right Side Elevation", svg: rightSideElevSVG },
                { sheet: "L3.1", label: "Typical Section — Full Height", svg: typicalSectionSVG },
                { sheet: "L3.2a", label: "Lower Post Connection Detail", svg: lowerConnectionSVG },
                { sheet: "L3.2b", label: "Railing-to-Glass Connection Detail", svg: railingConnectionSVG },
                { sheet: "L3.2c", label: "Upper Railing-to-Pergola Connection Detail", svg: upperConnectionSVG },
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

          {/* ── QTO Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="qto" className="flex-1 overflow-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-wider">Quantity Take-Off</h2>
                <span className="text-gray-400 text-xs">Click any row to edit qty or unit</span>
              </div>
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                ⚠ All quantities and costs are preliminary estimates only (CAD). Subject to field verification, Lumon Canada quotation, and licensed review prior to fabrication.
              </p>

              {/* Glass summary card */}
              <div className="bg-gray-900 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div><span className="text-gray-400">Total Glass Area</span><div className="text-white font-bold text-base">{glassSummary.totalGlassM2} m²</div></div>
                <div><span className="text-gray-400">Sliding</span><div className="text-blue-300 font-bold">{glassSummary.totalSlidingM2} m²</div></div>
                <div><span className="text-gray-400">Fixed</span><div className="text-green-300 font-bold">{glassSummary.totalFixedM2} m²</div></div>
                <div><span className="text-gray-400">Grand Total (est.)</span><div className="text-[#C9A84C] font-bold text-base">${grandTotal.toLocaleString()}</div></div>
              </div>

              {Object.entries(qtoGroups).map(([group, items]) => (
                <div key={group} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                    <h3 className="text-sm font-semibold text-gray-800">{group}</h3>
                  </div>
                  <EditableQTOTable
                    items={items.map(item => ({
                      lineKey: item.lineKey,
                      description: qtoOverridesMap[item.lineKey]?.customDescription ?? item.description,
                      quantity: qtoOverridesMap[item.lineKey]?.customQuantity ?? item.qty,
                      unit: qtoOverridesMap[item.lineKey]?.customUnit ?? item.unit,
                      unitRate: rateOverrides[item.description] ?? item.unitRate,
                      total: (qtoOverridesMap[item.lineKey]?.customQuantity ?? item.qty) * (rateOverrides[item.description] ?? item.unitRate),
                    }))}
                    overrides={qtoOverridesMap}
                    onUpdateLineItem={async (lineKey, qty, unit, desc) => { updateQTOLine.mutate({ projectId, lineKey, customQuantity: qty, customUnit: unit, customDescription: desc }); }}
                    onDeleteLineItem={async (lineKey) => { deleteQTOLine.mutate({ projectId, lineKey }); }}
                  />
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3 flex justify-end">
                <div className="text-right">
                  <div className="text-xs text-gray-400">PRELIMINARY TOTAL (incl. contingency)</div>
                  <div className="text-xl font-bold text-gray-900">${grandTotal.toLocaleString()} CAD</div>
                  <div className="text-xs text-gray-400 mt-1">Excl. GST/HST — Concept stage estimate only</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Rates Tab ────────────────────────────────────────────────── */}
          <TabsContent value="rates" className="flex-1 overflow-auto p-4">
            <RatesTab
              projectId={projectId}
              rateRows={qtoItems.map(i => ({ category: i.group, description: i.description, unit: i.unit, defaultRate: i.unitRate }))}
              onRatesSaved={setRateOverrides}
            />
          </TabsContent>

          {/* ── Files Tab ────────────────────────────────────────────────── */}
          <TabsContent value="files" className="flex-1 overflow-auto p-4">
            <FilesTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </EagleEyeLayout>
  );
}
