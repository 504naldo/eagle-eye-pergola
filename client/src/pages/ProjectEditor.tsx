import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Eye, Download, ChevronLeft, Plus, Trash2, Check, Sparkles, X, ZoomIn } from "lucide-react";
import { calculateQTO, calculateGrandTotal, calculateGlazingArea, PergolaParams, QTOItem, getDefaultRates } from "@shared/geometry";
import FilesTab from "@/components/FilesTab";
import ModelViewer3D from "@/components/ModelViewer3D";
import ReferencePhotosTab from "@/components/ReferencePhotosTab";
import { RatesTab } from "@/components/RatesTab";
import { PromptEditor } from "@/components/PromptEditor";
import { EditableQTOTable } from "@/components/EditableQTOTable";

const SCOPE_TYPE_LABELS: Record<string, string> = {
  inclusion: "Inclusion",
  exclusion: "Exclusion",
  assumption: "Assumption",
  by_others: "By Others",
};

const SCOPE_TYPE_COLORS: Record<string, string> = {
  inclusion: "bg-green-100 text-green-800",
  exclusion: "bg-red-100 text-red-800",
  assumption: "bg-blue-100 text-blue-800",
  by_others: "bg-gray-100 text-gray-700",
};

export default function ProjectEditor() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: project } = trpc.projects.get.useQuery({ id: projectId });
  const { data: projectParams, isLoading: paramsLoading } = trpc.params.get.useQuery({ projectId });
  const { data: checklist } = trpc.checklist.get.useQuery({ projectId });
  const { data: scopeItems } = trpc.scope.get.useQuery({ projectId });

  const [form, setForm] = useState({
    widthFt: "58.00", depthFt: "15.67", heightFt: "10.00",
    postCount: 5, postSpacingFt: "14.50",
    slatType: "fixed" as "fixed" | "operable",
    slatSpacingIn: "4.00",
    glassFront: true, glassLeft: true, glassRight: true,
    glassWallHeightFt: "8.00",
    railWidthIn: "2.00",
    finishColor: "Matte Black", ledLighting: true,
  });

  const [newScopeText, setNewScopeText] = useState("");
  const [newScopeType, setNewScopeType] = useState<"inclusion" | "exclusion" | "assumption" | "by_others">("inclusion");
  const [editingScope, setEditingScope] = useState<{ id: number; text: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (projectParams) {
      setForm({
        widthFt: projectParams.widthFt ?? "58.00",
        depthFt: projectParams.depthFt ?? "15.67",
        heightFt: projectParams.heightFt ?? "10.00",
        postCount: projectParams.postCount ?? 5,
        postSpacingFt: projectParams.postSpacingFt ?? "14.50",
        slatType: (projectParams.slatType as "fixed" | "operable") ?? "fixed",
        slatSpacingIn: projectParams.slatSpacingIn ?? "4.00",
        glassFront: projectParams.glassFront ?? true,
        glassLeft: projectParams.glassLeft ?? true,
        glassRight: projectParams.glassRight ?? true,
        glassWallHeightFt: projectParams.glassWallHeightFt ?? "8.00",
        railWidthIn: projectParams.railWidthIn ?? "2.00",
        finishColor: projectParams.finishColor ?? "Matte Black",
        ledLighting: projectParams.ledLighting ?? true,
      });
    }
  }, [projectParams]);

  const saveParams = trpc.params.save.useMutation({
    onSuccess: () => { utils.params.get.invalidate({ projectId }); toast.success("Parameters saved"); },
    onError: () => toast.error("Failed to save parameters"),
  });

  const toggleChecklist = trpc.checklist.toggle.useMutation({
    onSuccess: () => utils.checklist.get.invalidate({ projectId }),
  });

  const addScope = trpc.scope.add.useMutation({
    onSuccess: () => { utils.scope.get.invalidate({ projectId }); setNewScopeText(""); toast.success("Item added"); },
  });

  const updateScope = trpc.scope.update.useMutation({
    onSuccess: () => { utils.scope.get.invalidate({ projectId }); setEditingScope(null); },
  });

  const deleteScope = trpc.scope.delete.useMutation({
    onSuccess: () => utils.scope.get.invalidate({ projectId }),
  });

  const pergolaParams: PergolaParams = {
    widthFt: parseFloat(form.widthFt) || 58,
    depthFt: parseFloat(form.depthFt) || 15.67,
    heightFt: parseFloat(form.heightFt) || 10,
    postCount: form.postCount,
    postSpacingFt: parseFloat(form.postSpacingFt) || 14.5,
    slatType: form.slatType,
    slatSpacingIn: parseFloat(form.slatSpacingIn) || 4,
    glassFront: form.glassFront,
    glassLeft: form.glassLeft,
    glassRight: form.glassRight,
    glassWallHeightFt: parseFloat(form.glassWallHeightFt) || 8,
    railWidthIn: parseFloat(form.railWidthIn) || 2,
    finishColor: form.finishColor,
    ledLighting: form.ledLighting,
  };

  const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({});

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

  // Renderings
  const { data: renderingsList, isLoading: renderingsLoading } = trpc.renderings.list.useQuery({ projectId });
  const [renderingStyle, setRenderingStyle] = useState<"photorealistic" | "dusk" | "interior" | "aerial">("photorealistic");
  const [generatingStyle, setGeneratingStyle] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [autoGeneratedPrompt, setAutoGeneratedPrompt] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Reference photos (used to guide AI rendering generation)
  const { data: referencePhotos = [] } = trpc.referencePhotos.list.useQuery({ projectId }, { enabled: !!projectId });

  const generateRendering = trpc.renderings.generate.useMutation({
    onSuccess: () => {
      utils.renderings.list.invalidate({ projectId });
      setGeneratingStyle(null);
      toast.success("Rendering generated!");
    },
    onError: (err) => {
      setGeneratingStyle(null);
      toast.error("Rendering failed: " + err.message);
    },
  });

  const deleteRendering = trpc.renderings.delete.useMutation({
    onSuccess: () => utils.renderings.list.invalidate({ projectId }),
  });

  const handleGenerateRendering = () => {
    setGeneratingStyle(renderingStyle);
    generateRendering.mutate({
      projectId,
      style: renderingStyle,
      widthFt: form.widthFt,
      depthFt: form.depthFt,
      heightFt: form.heightFt,
      postCount: form.postCount,
      slatType: form.slatType,
      glassFront: form.glassFront,
      glassLeft: form.glassLeft,
      glassRight: form.glassRight,
      finishColor: form.finishColor,
      ledLighting: form.ledLighting,
      clientName: project?.clientName ?? undefined,
      location: project?.location ?? undefined,
      referenceImageUrls: referencePhotos.map(p => p.imageUrl),
      customPrompt: customPrompt || undefined,
    });
  };

  // Notes / Cover Letter
  const { data: notesData } = trpc.notes.get.useQuery({ projectId });
  const [notesText, setNotesText] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (notesData?.notes !== undefined) setNotesText(notesData.notes);
  }, [notesData]);

  const saveNotes = trpc.notes.save.useMutation({
    onSuccess: () => toast.success("Project summary saved"),
    onError: () => toast.error("Failed to save summary"),
  });

  const generateAI = trpc.notes.generateAI.useMutation({
    onSuccess: (data) => {
      setNotesText(data.summary);
      utils.notes.get.invalidate({ projectId });
      toast.success("AI summary generated and saved");
    },
    onError: () => toast.error("AI generation failed. Please try again."),
    onSettled: () => setAiGenerating(false),
  });

  const handleGenerateAI = () => {
    setAiGenerating(true);
    generateAI.mutate({
      projectId,
      projectName: project?.projectName ?? "",
      clientName: project?.clientName ?? undefined,
      location: project?.location ?? undefined,
      widthFt: form.widthFt,
      depthFt: form.depthFt,
      heightFt: form.heightFt,
      postCount: form.postCount,
      slatType: form.slatType,
      glassFront: form.glassFront,
      glassLeft: form.glassLeft,
      glassRight: form.glassRight,
      finishColor: form.finishColor,
      ledLighting: form.ledLighting,
    });
  };

  // QTO line overrides (custom qty/unit/description per line)
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

  const qtoItems: QTOItem[] = calculateQTO(pergolaParams, rateOverrides);
  const qtoCategories = Array.from(new Set(qtoItems.map(i => i.category)));
  const grandTotal = calculateGrandTotal(qtoItems);

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

  const checkedCount = checklist?.filter(c => c.checked).length ?? 0;
  const totalCount = checklist?.length ?? 0;

  return (
    <EagleEyeLayout title={project?.projectName ?? "Loading..."}>
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors touch-manipulation flex-shrink-0">
            <ChevronLeft size={16} /> <span className="hidden xs:inline">Dashboard</span>
          </button>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate(`/project/${projectId}/concept`)}>
              <Eye size={14} /> <span className="hidden sm:inline">Concept</span><span className="sm:hidden">Pkg</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate(`/project/${projectId}/preview`)}>
              <Eye size={14} /> <span className="hidden sm:inline">Preview</span><span className="sm:hidden">View</span>
            </Button>
            <Button
              size="sm"
              className="gap-1 sm:gap-1.5 font-semibold text-xs sm:text-sm px-2 sm:px-3"
              style={{ backgroundColor: "#C9A84C", color: "#111111" }}
              onClick={handleExportPDF}
              disabled={exportLoading}
            >
              <Download size={14} /> {exportLoading ? <span className="hidden sm:inline">Generating...</span> : <><span className="hidden sm:inline">Export </span>PDF</>}
            </Button>
          </div>
        </div>

        {/* Project info banner */}
        {project && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 grid grid-cols-3 sm:flex sm:items-center sm:gap-6 gap-2">
            <div>
              <div className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mb-0.5">Client</div>
              <div className="text-gray-600 text-xs sm:text-sm font-medium truncate">{project.clientName || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mb-0.5">Location</div>
              <div className="text-gray-600 text-xs sm:text-sm font-medium truncate">{project.location || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mb-0.5">Status</div>
              <div className="text-gray-600 text-xs sm:text-sm font-medium capitalize">{project.status.replace("_", " ")}</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="params">
          <div className="mb-4 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="bg-gray-100 p-1 rounded-lg h-auto gap-1 inline-flex min-w-max sm:flex-wrap sm:min-w-0 sm:w-full">
              {[
                { value: "params", label: "Parameters", shortLabel: "Params" },
                { value: "qto", label: "Quantity Takeoff", shortLabel: "QTO" },
                { value: "checklist", label: `Checklist (${checkedCount}/${totalCount})`, shortLabel: `Check (${checkedCount}/${totalCount})` },
                { value: "scope", label: "Inclusions / Exclusions", shortLabel: "Scope" },
                { value: "details", label: "Connection Details", shortLabel: "Details" },
                { value: "notes", label: "Project Summary", shortLabel: "Notes" },
                { value: "renderings", label: "AI Renderings", shortLabel: "Renders" },
                { value: "reference", label: "Reference Photos", shortLabel: "Ref Photos" },
                { value: "rates", label: "Unit Rates", shortLabel: "Rates" },
                { value: "files", label: "Files", shortLabel: "Files" },
                { value: "model3d", label: "3D Model", shortLabel: "3D" },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Parameters Tab ── */}
          <TabsContent value="params">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">Project Parameters</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patio Dimensions */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Patio Dimensions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Width (ft)</Label>
                      <Input value={form.widthFt} onChange={e => setForm(f => ({ ...f, widthFt: e.target.value }))} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Depth (ft)</Label>
                      <Input value={form.depthFt} onChange={e => setForm(f => ({ ...f, depthFt: e.target.value }))} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Height (ft)</Label>
                      <Input value={form.heightFt} onChange={e => setForm(f => ({ ...f, heightFt: e.target.value }))} className="mt-1 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Post Configuration */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Post Configuration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Front Post Count</Label>
                      <Input type="number" min={2} max={20} value={form.postCount} onChange={e => setForm(f => ({ ...f, postCount: parseInt(e.target.value) || 5 }))} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Post Spacing (ft)</Label>
                      <Input value={form.postSpacingFt} onChange={e => setForm(f => ({ ...f, postSpacingFt: e.target.value }))} className="mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                    No rear posts — wall-mounted lean-to connection to building
                  </div>
                </div>

                {/* Slat System */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Slat System</h3>
                  <div>
                    <Label className="text-xs">Slat Type</Label>
                    <Select value={form.slatType} onValueChange={v => setForm(f => ({ ...f, slatType: v as "fixed" | "operable" }))}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Slats (Baseline)</SelectItem>
                        <SelectItem value="operable">Operable Louvers (Alternate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Slat Spacing (inches)</Label>
                    <Input value={form.slatSpacingIn} onChange={e => setForm(f => ({ ...f, slatSpacingIn: e.target.value }))} className="mt-1 text-sm" />
                  </div>
                </div>

                {/* Lumon Glass */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Lumon Enclosure</h3>
                  <p className="text-xs text-gray-500">Vertical enclosure panels — connects to fascia beam at top</p>
                  {[
                    { key: "glassFront", label: "Front Face Enclosure" },
                    { key: "glassLeft", label: "Left Side Enclosure" },
                    { key: "glassRight", label: "Right Side Enclosure" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={form[key as keyof typeof form] as boolean}
                        onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))}
                      />
                    </div>
                  ))}
                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Glass Wall Height (ft)</Label>
                      <p className="text-xs text-gray-400 mb-1">Height from slab to top rail</p>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="20"
                        value={form.glassWallHeightFt}
                        onChange={e => setForm(f => ({ ...f, glassWallHeightFt: e.target.value }))}
                        className="mt-1 text-sm"
                        placeholder="8.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rail Width (in)</Label>
                      <p className="text-xs text-gray-400 mb-1">Top &amp; bottom rail profile width</p>
                      <Input
                        type="number"
                        step="0.25"
                        min="0.5"
                        max="6"
                        value={form.railWidthIn}
                        onChange={e => setForm(f => ({ ...f, railWidthIn: e.target.value }))}
                        className="mt-1 text-sm"
                        placeholder="2.00"
                      />
                    </div>
                  </div>
                  {/* Glazing Area Summary */}
                  {(form.glassFront || form.glassLeft || form.glassRight) && (() => {
                    const glazing = calculateGlazingArea(pergolaParams);
                    return (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">Glazing Area Summary</p>
                        <table className="w-full text-xs text-gray-700">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left font-medium pb-1">Face</th>
                              <th className="text-right font-medium pb-1">Length</th>
                              <th className="text-right font-medium pb-1">Height</th>
                              <th className="text-right font-medium pb-1">Area (ft²)</th>
                              <th className="text-right font-medium pb-1">Area (m²)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100">
                            {form.glassFront && (
                              <tr>
                                <td className="py-0.5">Front</td>
                                <td className="text-right">{glazing.frontLengthFt.toFixed(2)}'</td>
                                <td className="text-right">{glazing.glassHeightFt.toFixed(2)}'</td>
                                <td className="text-right font-medium">{glazing.frontFt2.toFixed(1)}</td>
                                <td className="text-right">{(glazing.frontFt2 * 0.0929).toFixed(1)}</td>
                              </tr>
                            )}
                            {form.glassLeft && (
                              <tr>
                                <td className="py-0.5">Left</td>
                                <td className="text-right">{glazing.leftLengthFt.toFixed(2)}'</td>
                                <td className="text-right">{glazing.glassHeightFt.toFixed(2)}'</td>
                                <td className="text-right font-medium">{glazing.leftFt2.toFixed(1)}</td>
                                <td className="text-right">{(glazing.leftFt2 * 0.0929).toFixed(1)}</td>
                              </tr>
                            )}
                            {form.glassRight && (
                              <tr>
                                <td className="py-0.5">Right</td>
                                <td className="text-right">{glazing.rightLengthFt.toFixed(2)}'</td>
                                <td className="text-right">{glazing.glassHeightFt.toFixed(2)}'</td>
                                <td className="text-right font-medium">{glazing.rightFt2.toFixed(1)}</td>
                                <td className="text-right">{(glazing.rightFt2 * 0.0929).toFixed(1)}</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-blue-300 font-semibold text-blue-800">
                              <td colSpan={3} className="pt-1">Total Glazing Area</td>
                              <td className="text-right pt-1">{glazing.totalFt2.toFixed(1)} ft²</td>
                              <td className="text-right pt-1">{glazing.totalM2.toFixed(1)} m²</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
                {/* Finish & Extras */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Finish & Extras</h3>
                  <div>
                    <Label className="text-xs">Finish Color</Label>
                    <Select value={form.finishColor} onValueChange={v => setForm(f => ({ ...f, finishColor: v }))}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Matte Black">Matte Black (Standard)</SelectItem>
                        <SelectItem value="Gloss Black">Gloss Black</SelectItem>
                        <SelectItem value="Charcoal Grey">Charcoal Grey</SelectItem>
                        <SelectItem value="Bronze">Bronze</SelectItem>
                        <SelectItem value="Custom">Custom (Specify in Notes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">LED Strip Lighting</Label>
                    <Switch checked={form.ledLighting} onCheckedChange={v => setForm(f => ({ ...f, ledLighting: v }))} />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => saveParams.mutate({ projectId, ...form })}
                  disabled={saveParams.isPending}
                  style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                  className="font-semibold"
                >
                  {saveParams.isPending ? "Saving..." : "Save Parameters"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── QTO Tab ── */}
          <TabsContent value="qto">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                  <h2 className="font-semibold text-gray-900">Preliminary Quantity Takeoff</h2>
                </div>
                <div className="text-xs text-gray-500 italic">Unit rates are editable — click any rate to override</div>
              </div>
              <p className="text-xs text-red-600 mb-5 bg-red-50 border border-red-200 rounded p-2">
                ⚠ All quantities and costs are preliminary estimates only (CAD). Subject to field verification, supplier quotes, and licensed review prior to fabrication.
              </p>
              {qtoCategories.map(cat => (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                    <h3 className="text-sm font-semibold text-gray-800">{cat}</h3>
                  </div>
                  {/* Desktop: table with inline edit */}
                  <div className="hidden sm:block overflow-x-auto">
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
                  {/* Mobile card layout */}
                  <div className="sm:hidden space-y-2">
                    {qtoItems.filter(i => i.category === cat).map((item, idx) => {
                      const ov = qtoOverridesMap[item.lineKey ?? item.description];
                      const displayQty = ov?.customQuantity ?? item.qty;
                      const displayUnit = ov?.customUnit ?? item.unit;
                      const displayDesc = ov?.customDescription ?? item.description;
                      const lineTotal = displayQty * (rateOverrides[item.description] ?? item.unitRate);
                      return (
                        <div key={idx} className={`bg-gray-50 rounded-lg p-3 border ${ov ? 'border-[#C9A84C]' : 'border-gray-100'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-800 flex-1 pr-2">{displayDesc}{ov && <span className="ml-1 text-[10px] text-[#C9A84C]">(edited)</span>}</p>
                            <span className="text-xs font-bold text-gray-900 whitespace-nowrap">${lineTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-500">{displayQty} {displayUnit}</span>
                            <span className="text-[10px] text-gray-400">&times;</span>
                            <input
                              type="number"
                              min={0}
                              step={10}
                              value={rateOverrides[item.description] ?? item.unitRate}
                              onChange={e => setRateOverrides(r => ({ ...r, [item.description]: parseFloat(e.target.value) || 0 }))}
                              className="w-20 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#C9A84C] bg-white"
                            />
                            <span className="text-[10px] text-gray-400">CAD/{displayUnit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Grand Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 rounded-lg px-4 sm:px-6 py-3 sm:py-4 w-full sm:min-w-64 sm:w-auto">
                  <div className="text-[#C9A84C] text-xs uppercase tracking-widest mb-1">Preliminary Budget Estimate</div>
                  <div className="text-white text-2xl font-bold">
                    ${grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">CAD — Concept Only, Not For Construction</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Checklist Tab ── */}
          <TabsContent value="checklist">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                  <h2 className="font-semibold text-gray-900">Field Verification Checklist</h2>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{checkedCount}</span> / {totalCount} complete
                </div>
              </div>
              {checklist && (() => {
                const categories = Array.from(new Set(checklist.map(c => c.category)));
                return categories.map(cat => (
                  <div key={cat} className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2 mb-3">{cat}</h3>
                    <div className="space-y-2">
                      {checklist.filter(c => c.category === cat).map(item => (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${item.checked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                          <button
                            onClick={() => toggleChecklist.mutate({ id: item.id, checked: !item.checked })}
                            className={`mt-0.5 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors touch-manipulation ${item.checked ? "bg-green-500 border-green-500" : "border-gray-300 bg-white"}`}
                          >
                            {item.checked && <Check size={12} className="text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>{item.label}</p>
                            {item.fieldNote && <p className="text-xs text-gray-500 mt-1 italic">{item.fieldNote}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </TabsContent>

          {/* ── Scope Tab ── */}
          <TabsContent value="scope">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">Inclusions / Exclusions / Assumptions</h2>
              </div>
              {(["inclusion", "exclusion", "assumption", "by_others"] as const).map(type => (
                <div key={type} className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2 mb-3">{SCOPE_TYPE_LABELS[type]}s</h3>
                  <div className="space-y-2">
                    {scopeItems?.filter(s => s.type === type).map(item => (
                      <div key={item.id} className="flex items-start gap-2 group">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${SCOPE_TYPE_COLORS[type]}`}>
                          {SCOPE_TYPE_LABELS[type]}
                        </span>
                        {editingScope?.id === item.id ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              value={editingScope.text}
                              onChange={e => setEditingScope(s => s ? { ...s, text: e.target.value } : null)}
                              className="text-sm flex-1"
                            />
                            <Button size="sm" style={{ backgroundColor: "#C9A84C", color: "#111111" }} onClick={() => updateScope.mutate({ id: item.id, text: editingScope.text })}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingScope(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-800 flex-1">{item.text}</p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingScope({ id: item.id, text: item.text })} className="text-gray-400 hover:text-gray-600 text-xs px-1">Edit</button>
                              <button onClick={() => deleteScope.mutate({ id: item.id })} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Add new item */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-xs font-semibold text-gray-500 mb-3">Add New Item</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={newScopeType} onValueChange={v => setNewScopeType(v as any)}>
                    <SelectTrigger className="w-full sm:w-36 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["inclusion", "exclusion", "assumption", "by_others"] as const).map(t => (
                        <SelectItem key={t} value={t}>{SCOPE_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter scope item text..."
                    value={newScopeText}
                    onChange={e => setNewScopeText(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                    onClick={() => addScope.mutate({ projectId, type: newScopeType, text: newScopeText })}
                    disabled={!newScopeText.trim()}
                  >
                    <Plus size={14} /> Add
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Connection Details Tab ── */}
          <TabsContent value="details">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">Connection & Detail Intent</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠ Concept details only — not engineered, not for construction. For estimating intent only. All connections subject to licensed structural review.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[
                  {
                    title: "① Wall Ledger to Building",
                    desc: "Heavy-duty aluminum ledger bolted to building wall. Anchor type subject to wall material. Sealant at all penetrations.",
                    color: "#C9A84C",
                    icon: "🔩",
                  },
                  {
                    title: "② Post Base Plate to Slab",
                    desc: "200×200×12mm aluminum base plate. Chemical anchor bolts into concrete slab. Grout bed for levelling.",
                    color: "#374151",
                    icon: "⬛",
                  },
                  {
                    title: "③ Front Beam to Post",
                    desc: "150×75 RHS beam welded or bolted to 100×100 SHS post. Cap plate at post top. Powder coated to match.",
                    color: "#374151",
                    icon: "🔧",
                  },
                  {
                    title: "④ Slat to Beam Clip",
                    desc: "Aluminum clip bracket at each slat-to-beam intersection. Concealed fastener. Slat end cap at perimeter.",
                    color: "#6B7280",
                    icon: "📎",
                  },
                  {
                    title: "⑤ Glass Top Rail to Fascia Beam",
                    desc: "Lumon top rail bolts directly to underside of front fascia beam. Weathertight sealant joint. Coordinate with Lumon glass supplier.",
                    color: "#3B82F6",
                    icon: "🪟",
                  },
                  {
                    title: "⑥ Side Glass Corner Condition",
                    desc: "Glass-to-glass corner at front/side intersection. Aluminum corner post or structural silicone joint. Coordinate with supplier.",
                    color: "#3B82F6",
                    icon: "📐",
                  },
                ].map((detail, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-3 flex items-center gap-2" style={{ backgroundColor: detail.color === "#3B82F6" ? "#EFF6FF" : detail.color === "#C9A84C" ? "#FFFBEB" : "#F9FAFB" }}>
                      <span className="text-xl">{detail.icon}</span>
                      <h3 className="text-sm font-semibold text-gray-900">{detail.title}</h3>
                    </div>
                    {/* Concept detail SVG */}
                    <div className="bg-gray-50 border-b border-gray-200">
                      <ConnectionDetailSVG index={i} dims={pergolaParams} />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-600 leading-relaxed">{detail.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Project Summary Tab ── */}
          <TabsContent value="notes">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">Project Summary / Cover Letter</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Write or generate a professional project summary. This text will appear on the cover page of the exported PDF package.
              </p>

              {/* AI Generate Button */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleGenerateAI}
                  disabled={aiGenerating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#111111", color: "#C9A84C", border: "1px solid #C9A84C" }}
                >
                  {aiGenerating ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Generating AI Summary...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                      </svg>
                      Generate AI Summary
                    </>
                  )}
                </button>
                <span className="text-xs text-gray-400">Auto-generates from your project parameters. You can edit the result below.</span>
              </div>

              {/* Textarea */}
              <Textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Write a professional project summary here, or click 'Generate AI Summary' to auto-draft one from your project parameters..."
                className="min-h-[320px] text-sm leading-relaxed font-sans resize-y"
              />

              {/* Word count + Save */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{notesText.split(/\s+/).filter(Boolean).length} words</span>
                <Button
                  size="sm"
                  className="gap-1.5 font-semibold"
                  style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                  onClick={() => saveNotes.mutate({ projectId, notes: notesText })}
                  disabled={saveNotes.isPending}
                >
                  <Check size={13} /> {saveNotes.isPending ? "Saving..." : "Save Summary"}
                </Button>
              </div>

              {/* Preview */}
              {notesText.trim() && (
                <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#C9A84C] rounded-full" />
                    <span className="text-[#C9A84C] text-xs uppercase tracking-widest font-semibold">PDF Preview</span>
                  </div>
                  <div className="p-5 bg-white">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Project Summary</div>
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-serif">{notesText}</div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          {/* ── AI Renderings Tab ── */}
          <TabsContent value="renderings">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">AI Visual Renderings</h2>
                <span className="ml-auto text-xs text-gray-400">Powered by Eagle Eye AI</span>
              </div>

              {/* ── AI Rendering Prompt (Primary Section) ── */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-[#C9A84C] rounded-full" />
                  <h3 className="font-semibold text-gray-900">AI Rendering Prompt</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Describe what the rendering should show. Use the project photo and current parameters.</p>
                <PromptEditor
                  defaultPrompt={autoGeneratedPrompt || "AI will generate a prompt based on your project parameters..."}
                  onPromptChange={setCustomPrompt}
                  isLoading={!!generatingStyle}
                />
              </div>

              {/* ── Choose View (Secondary Section) ── */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-gray-300 rounded-full" />
                  <h3 className="font-semibold text-gray-900">Choose View</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Select the rendering angle or mood.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {([
                    { value: "photorealistic", label: "Day View", icon: "☀️" },
                    { value: "dusk", label: "Dusk View", icon: "🌆" },
                    { value: "interior", label: "Interior", icon: "🏛️" },
                    { value: "aerial", label: "Aerial", icon: "🛩️" },
                  ] as const).map(s => (
                    <button
                      key={s.value}
                      onClick={() => setRenderingStyle(s.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all touch-manipulation ${
                        renderingStyle === s.value
                          ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Main CTA (Generate Rendering) ── */}
              <div className="mb-8">
                <button
                  onClick={handleGenerateRendering}
                  disabled={!!generatingStyle}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 touch-manipulation"
                  style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                >
                  {generatingStyle ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      Generating {generatingStyle === "photorealistic" ? "Day View" : generatingStyle === "dusk" ? "Dusk View" : generatingStyle === "interior" ? "Interior" : "Aerial"} Rendering...
                    </>
                  ) : (
                    <><Sparkles size={16} /> Generate Rendering</>
                  )}
                </button>
              </div>

              {/* ── Renderings Gallery ── */}
              {renderingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : renderingsList && renderingsList.length > 0 ? (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{renderingsList.length} Rendering{renderingsList.length !== 1 ? "s" : ""}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderingsList.map(r => (
                      <div key={r.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={r.imageUrl}
                          alt={r.label ?? r.style}
                          className="w-full aspect-video object-cover cursor-pointer"
                          onClick={() => setLightboxUrl(r.imageUrl)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                          <ZoomIn size={28} className="text-white drop-shadow" />
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800">{r.label ?? r.style}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                            {r.prompt && (
                              <div className="text-[9px] text-gray-500 mt-1.5 line-clamp-2 italic border-t border-gray-200 pt-1.5" title={r.prompt}>
                                Prompt: {r.prompt}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <a
                              href={r.imageUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-all touch-manipulation"
                              title="Download"
                            >
                              <Download size={13} />
                            </a>
                            <button
                              onClick={() => deleteRendering.mutate({ id: r.id })}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition-all touch-manipulation"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles size={36} className="text-gray-300 mb-3" />
                  <div className="text-sm font-medium text-gray-500">No renderings yet</div>
                  <div className="text-xs text-gray-400 mt-1">Select a view style above and click Generate to create your first AI rendering.</div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reference">
            <div className="p-3 sm:p-4">
              <ReferencePhotosTab projectId={projectId} />
            </div>
          </TabsContent>

          <TabsContent value="files">
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="text-sm font-semibold text-gray-900">Project Files</h2>
                <span className="text-xs text-gray-400">— Photos, drawings, documents</span>
              </div>
              {project && <FilesTab projectId={project.id} />}
            </div>
          </TabsContent>

          {/* ── 3D Model Tab ── */}
          <TabsContent value="model3d">
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="text-sm font-semibold text-gray-900">3D Model</h2>
                <span className="text-xs text-gray-400">— Parametric model from your dimensions. Download as .glb to open in Blender, SketchUp, or Windows 3D Viewer.</span>
              </div>
              <ModelViewer3D
                projectName={project?.projectName ?? "Pergola"}
                params={{
                  widthFt: parseFloat(form.widthFt) || 58,
                  depthFt: parseFloat(form.depthFt) || 15.67,
                  heightFt: parseFloat(form.heightFt) || 10,
                  postCount: form.postCount,
                  postSizeIn: 6,
                  beamSizeIn: 8,
                  louverSpacingIn: parseFloat(form.slatSpacingIn) || 4,
                  louverSizeIn: 6,
                  hasGlass: form.glassFront || form.glassLeft || form.glassRight,
                  glassWallHeightFt: parseFloat(form.glassWallHeightFt) || 8,
                  railWidthIn: parseFloat(form.railWidthIn) || 2,
                  finishColor: form.finishColor === "Matte Black" ? "#2a2a2a"
                    : form.finishColor === "Matte White" ? "#e8e8e8"
                    : form.finishColor === "Bronze" ? "#6b4c2a"
                    : form.finishColor === "Silver" ? "#a0a0a0"
                    : "#2a2a2a",
                }}
                className="h-[520px]"
              />
            </div>
          </TabsContent>

          {/* ── Unit Rates Tab ── */}
          <TabsContent value="rates">
            {project && (
              <RatesTab
                projectId={project.id}
                rateRows={qtoItems.map(i => ({ category: i.category, description: i.description, unit: i.unit, defaultRate: getDefaultRates()[i.description] ?? i.unitRate }))}
                onRatesSaved={saved => setRateOverrides(saved)}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-gray-900 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all touch-manipulation"
              onClick={() => setLightboxUrl(null)}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxUrl}
              alt="Rendering preview"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </EagleEyeLayout>
  );
}

// ─── Connection Detail SVGs ───────────────────────────────────────────────────
function ConnectionDetailSVG({ index, dims }: { index: number; dims: PergolaParams }) {
  const w = 240, h = 160;
  const GOLD = "#C9A84C";
  const DARK = "#111111";
  const BLUE = "#3B82F6";

  const details = [
    // 0: Wall Ledger
    <svg key={0} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={0} y={20} width={30} height={h - 20} fill="#374151" />
      <rect x={30} y={50} width={80} height={20} fill={DARK} />
      <circle cx={50} cy={60} r={4} fill={GOLD} />
      <circle cx={70} cy={60} r={4} fill={GOLD} />
      <circle cx={90} cy={60} r={4} fill={GOLD} />
      <text x={120} y={55} fill={DARK} fontSize={8}>WALL LEDGER</text>
      <text x={120} y={67} fill="#6B7280" fontSize={7}>150×75 AL. RHS</text>
      <text x={5} y={15} fill="white" fontSize={7} fontWeight="600">BUILDING WALL</text>
      <text x={35} y={85} fill={GOLD} fontSize={7}>ANCHOR BOLTS</text>
      <line x1={30} y1={60} x2={30} y2={80} stroke={GOLD} strokeWidth={0.8} strokeDasharray="2,2" />
    </svg>,
    // 1: Post Base
    <svg key={1} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={0} y={h - 20} width={w} height={20} fill="#9CA3AF" />
      <rect x={100} y={h - 35} width={40} height={15} fill={DARK} />
      <rect x={110} y={40} width={20} height={h - 75} fill={DARK} />
      <circle cx={105} cy={h - 28} r={3} fill={GOLD} />
      <circle cx={135} cy={h - 28} r={3} fill={GOLD} />
      <text x={155} y={h - 25} fill={DARK} fontSize={7}>BASE PLATE</text>
      <text x={155} y={h - 15} fill="#6B7280" fontSize={7}>200×200×12 AL.</text>
      <text x={115} y={35} fill={DARK} fontSize={7} textAnchor="middle">POST</text>
      <text x={60} y={h - 10} fill="#6B7280" fontSize={7}>CONC. SLAB</text>
    </svg>,
    // 2: Beam to Post
    <svg key={2} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={100} y={60} width={20} height={h - 60} fill={DARK} />
      <rect x={60} y={50} width={120} height={20} fill={DARK} />
      <circle cx={90} cy={60} r={3} fill={GOLD} />
      <circle cx={130} cy={60} r={3} fill={GOLD} />
      <text x={20} y={45} fill={DARK} fontSize={7}>FASCIA BEAM</text>
      <text x={20} y={55} fill="#6B7280" fontSize={7}>150×75 AL. RHS</text>
      <text x={130} y={100} fill={DARK} fontSize={7}>POST</text>
      <text x={130} y={110} fill="#6B7280" fontSize={7}>100×100 AL. SHS</text>
    </svg>,
    // 3: Slat Clip
    <svg key={3} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={50} y={60} width={140} height={15} fill={DARK} />
      <rect x={90} y={40} width={60} height={20} fill="#374151" />
      <rect x={110} y={75} width={20} height={8} fill={GOLD} />
      <text x={160} y={52} fill={DARK} fontSize={7}>SLAT</text>
      <text x={160} y={62} fill="#6B7280" fontSize={7}>150×25 AL.</text>
      <text x={160} y={80} fill={GOLD} fontSize={7}>CLIP BRACKET</text>
      <text x={50} y={90} fill={DARK} fontSize={7}>BEAM</text>
    </svg>,
    // 4: Glass Top Rail
    <svg key={4} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={40} y={50} width={160} height={20} fill={DARK} />
      <rect x={80} y={70} width={80} height={8} fill={BLUE} />
      <rect x={100} y={78} width={40} height={60} fill={BLUE} opacity={0.4} stroke={BLUE} strokeWidth={1} />
      <circle cx={100} cy={70} r={3} fill={GOLD} />
      <circle cx={140} cy={70} r={3} fill={GOLD} />
      <text x={10} y={62} fill={DARK} fontSize={7}>FASCIA BEAM</text>
      <text x={10} y={72} fill="#6B7280" fontSize={7}>150×75 AL. RHS</text>
      <text x={165} y={75} fill={BLUE} fontSize={7}>GLASS TOP</text>
      <text x={165} y={85} fill={BLUE} fontSize={7}>RAIL</text>
      <text x={165} y={100} fill={GOLD} fontSize={7}>SEALANT JOINT</text>
    </svg>,
    // 5: Corner Condition
    <svg key={5} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={w} height={h} fill="#F9FAFB" />
      <rect x={100} y={20} width={8} height={h - 20} fill={DARK} />
      <rect x={108} y={20} width={60} height={h - 20} fill={BLUE} opacity={0.3} stroke={BLUE} strokeWidth={1} />
      <rect x={40} y={20} width={60} height={h - 20} fill={BLUE} opacity={0.3} stroke={BLUE} strokeWidth={1} />
      <text x={130} y={80} fill={BLUE} fontSize={7} textAnchor="middle">FRONT</text>
      <text x={130} y={90} fill={BLUE} fontSize={7} textAnchor="middle">GLASS</text>
      <text x={70} y={80} fill={BLUE} fontSize={7} textAnchor="middle">SIDE</text>
      <text x={70} y={90} fill={BLUE} fontSize={7} textAnchor="middle">GLASS</text>
      <text x={104} y={15} fill={DARK} fontSize={7} textAnchor="middle">CORNER</text>
      <text x={104} y={h - 5} fill={GOLD} fontSize={7} textAnchor="middle">COORD. W/ SUPPLIER</text>
    </svg>,
  ];

  return details[index] ?? <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}><text x={w/2} y={h/2} textAnchor="middle" fill="#9CA3AF" fontSize={10}>Detail TBD</text></svg>;
}
