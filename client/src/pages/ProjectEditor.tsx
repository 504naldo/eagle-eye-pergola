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
import { Eye, Download, ChevronLeft, Plus, Trash2, Check } from "lucide-react";
import { calculateQTO, calculateGrandTotal, PergolaParams, QTOItem } from "@shared/geometry";

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
    finishColor: form.finishColor,
    ledLighting: form.ledLighting,
  };

  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({});

  const qtoItemsBase = calculateQTO(pergolaParams);
  const qtoItems: QTOItem[] = qtoItemsBase.map(item => {
    const key = item.description;
    const overrideStr = rateOverrides[key];
    if (overrideStr !== undefined) {
      const rate = parseFloat(overrideStr) || 0;
      return { ...item, unitRate: rate, lineTotal: Math.round(item.qty * rate * 100) / 100 };
    }
    return item;
  });
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
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={16} /> Dashboard
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/project/${projectId}/preview`)}>
              <Eye size={14} /> Preview Drawings
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#C9A84C", color: "#111111" }}
              onClick={handleExportPDF}
              disabled={exportLoading}
            >
              <Download size={14} /> {exportLoading ? "Generating PDF..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Project info banner */}
        {project && (
          <div className="bg-[#111111] rounded-lg p-4 mb-5 flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-[#C9A84C] text-xs uppercase tracking-widest mb-0.5">Client</div>
              <div className="text-white text-sm font-medium">{project.clientName || "—"}</div>
            </div>
            <div>
              <div className="text-[#C9A84C] text-xs uppercase tracking-widest mb-0.5">Location</div>
              <div className="text-white text-sm font-medium">{project.location || "—"}</div>
            </div>
            <div>
              <div className="text-[#C9A84C] text-xs uppercase tracking-widest mb-0.5">Status</div>
              <div className="text-white text-sm font-medium capitalize">{project.status.replace("_", " ")}</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="params">
          <TabsList className="mb-4 bg-gray-100 p-1 rounded-lg flex-wrap h-auto gap-1">
            {[
              { value: "params", label: "Parameters" },
              { value: "qto", label: "Quantity Takeoff" },
              { value: "checklist", label: `Checklist (${checkedCount}/${totalCount})` },
              { value: "scope", label: "Inclusions / Exclusions" },
              { value: "details", label: "Connection Details" },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Parameters Tab ── */}
          <TabsContent value="params">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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

                {/* Lumin Glass */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">Lumin Glass Enclosure</h3>
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#111111] text-white">
                        <th className="text-left py-2 px-3 text-xs font-medium rounded-tl">Description</th>
                        <th className="text-center py-2 px-3 text-xs font-medium w-14">Unit</th>
                        <th className="text-center py-2 px-3 text-xs font-medium w-14">Qty</th>
                        <th className="text-right py-2 px-3 text-xs font-medium w-28">Unit Rate (CAD)</th>
                        <th className="text-right py-2 px-3 text-xs font-medium w-28 rounded-tr">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qtoItems.filter(i => i.category === cat).map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="py-2 px-3 text-gray-800 border-b border-gray-100 text-xs">{item.description}</td>
                          <td className="py-2 px-3 text-center text-gray-600 border-b border-gray-100 font-mono text-xs">{item.unit}</td>
                          <td className="py-2 px-3 text-center font-semibold border-b border-gray-100 text-xs" style={{ color: "#C9A84C" }}>{item.qty}</td>
                          <td className="py-1 px-2 border-b border-gray-100 text-right">
                            <input
                              type="number"
                              min={0}
                              step={10}
                              value={rateOverrides[item.description] ?? item.unitRate}
                              onChange={e => setRateOverrides(r => ({ ...r, [item.description]: e.target.value }))}
                              className="w-24 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#C9A84C] bg-white"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-semibold border-b border-gray-100 text-xs text-gray-900">
                            ${item.lineTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {/* Grand Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-[#111111] rounded-lg px-6 py-4 min-w-64">
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? "bg-green-500 border-green-500" : "border-gray-300 bg-white"}`}
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                <div className="flex gap-2 flex-wrap">
                  <Select value={newScopeType} onValueChange={v => setNewScopeType(v as any)}>
                    <SelectTrigger className="w-36 text-sm"><SelectValue /></SelectTrigger>
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
                    className="flex-1 text-sm min-w-48"
                  />
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                    onClick={() => addScope.mutate({ projectId, type: newScopeType, text: newScopeText })}
                    disabled={!newScopeText.trim()}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Connection Details Tab ── */}
          <TabsContent value="details">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
                <h2 className="font-semibold text-gray-900">Connection & Detail Intent</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠ Concept details only — not engineered, not for construction. For estimating intent only. All connections subject to licensed structural review.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    desc: "Lumin glass top rail bolts directly to underside of front fascia beam. Weathertight sealant joint. Coordinate with Lumin glass supplier.",
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
        </Tabs>
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
