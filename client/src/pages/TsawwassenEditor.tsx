import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  DEFAULT_TSAWWASSEN_PARAMS,
  TsawwassenLumonParams,
  drawTsawwassenExistingPlan,
  drawTsawwassenProposedPlan,
  drawTsawwassenExistingFrontElevation,
  drawTsawwassenProposedFrontElevation,
  drawTsawwassenSideElevations,
  drawTsawwassenTypicalSection,
  drawTsawwassenConnectionDetails,
  calculateTsawwassenQTO,
} from "../../../shared/tsawwassenLumonGeometry";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { value: "dimensions", label: "Dimensions" },
  { value: "drawings", label: "Drawings" },
  { value: "qto", label: "QTO" },
  { value: "notes", label: "Notes & QC" },
];

// ─── Number input helper ──────────────────────────────────────────────────────

function NumField({
  label,
  field,
  unit,
  params,
  onChange,
}: {
  label: string;
  field: keyof TsawwassenLumonParams;
  unit: string;
  params: TsawwassenLumonParams;
  onChange: (f: keyof TsawwassenLumonParams, v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.5"
          value={params[field] as number}
          onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
          className="h-8 text-sm w-24"
        />
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

// ─── SVG Drawing card ─────────────────────────────────────────────────────────

function DrawingCard({ title, sheetNum, svg }: { title: string; sheetNum: string; svg: string }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div>
          <span className="text-xs font-bold text-yellow-400 mr-2">{sheetNum}</span>
          <span className="text-xs text-gray-200">{title}</span>
        </div>
        <span className="text-xs text-red-400 font-semibold">EST. — NOT FOR CONSTRUCTION</span>
      </div>
      <div
        className="overflow-auto bg-white"
        style={{ maxHeight: 520 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

// ─── QC Checklist ─────────────────────────────────────────────────────────────

const QC_ITEMS = [
  "All dimensions marked EST. on every sheet",
  "Title block complete (project name, address, drawn by, checked by, date, scale)",
  "Revision table present on every sheet",
  "Disclaimer strip at bottom of every sheet",
  "Member legend matches all callout bubbles used",
  "Bay and side numbering consistent across all sheets",
  "FH and BH datums shown on all elevation and section sheets",
  "Section callout bubbles reference correct sheet numbers",
  "Stacking zones shown on plan and front elevation",
  "Access door openings marked 'DOOR BY OTHERS' on all affected sheets",
  "Responsibility labels present: 'FINAL DETAILS BY LUMON' on all connection sheets",
  "Drawing status stamp: 'CONCEPT DESIGN — NOT FOR CONSTRUCTION' on every sheet",
  "North arrow on all plan sheets",
  "Scale bar on all plan sheets",
  "QTO quantities marked EST. with field-verify notes",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TsawwassenEditor({ projectId }: { projectId: number }) {
  const [, navigate] = useLocation();
  const [params, setParams] = useState<TsawwassenLumonParams>(DEFAULT_TSAWWASSEN_PARAMS);
  const [notes, setNotes] = useState("");
  const [qcChecked, setQcChecked] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load project
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });

  // Load saved params from inputsJson when project loads
  const [loaded, setLoaded] = useState(false);
  if (project && !loaded) {
    setLoaded(true);
    if (project.inputsJson) {
      try {
        const saved = project.inputsJson as Record<string, unknown>;
        if (saved.tsawwassenParams) setParams({ ...DEFAULT_TSAWWASSEN_PARAMS, ...(saved.tsawwassenParams as Partial<TsawwassenLumonParams>) });
        if (saved.notes) setNotes(saved.notes as string);
        if (saved.qcChecked) setQcChecked(new Set(saved.qcChecked as number[]));
      } catch {}
    }
  }

  const saveInputsMutation = trpc.inputs.save.useMutation();
  const utils = trpc.useUtils();

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveInputsMutation.mutateAsync({
        projectId,
        inputsJson: {
          tsawwassenParams: params,
          notes,
          qcChecked: Array.from(qcChecked),
        } as unknown as Record<string, unknown>,
      });
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Project saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [params, notes, qcChecked, projectId, saveInputsMutation, utils]);

  const setField = useCallback((field: keyof TsawwassenLumonParams, value: number) => {
    setParams((p) => ({ ...p, [field]: value }));
  }, []);

  const setTextField = useCallback((field: keyof TsawwassenLumonParams, value: string) => {
    setParams((p) => ({ ...p, [field]: value }));
  }, []);

  // Generate all SVGs
  const existingPlanSVG = drawTsawwassenExistingPlan(params);
  const proposedPlanSVG = drawTsawwassenProposedPlan(params);
  const existingFrontElevSVG = drawTsawwassenExistingFrontElevation(params);
  const proposedFrontElevSVG = drawTsawwassenProposedFrontElevation(params);
  const sideElevSVG = drawTsawwassenSideElevations(params);
  const typicalSectionSVG = drawTsawwassenTypicalSection(params);
  const connectionDetailsSVG = drawTsawwassenConnectionDetails(params);

  const qtoItems = calculateTsawwassenQTO(params);
  const qcComplete = qcChecked.size === QC_ITEMS.length;

  if (isLoading) {
    return (
      <EagleEyeLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-yellow-500" size={32} />
        </div>
      </EagleEyeLayout>
    );
  }

  return (
    <EagleEyeLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-300 hover:text-white">
              <ArrowLeft size={16} className="mr-1" /> Dashboard
            </Button>
            <div>
              <h1 className="text-sm font-bold text-yellow-400">{params.projectName}</h1>
              <p className="text-xs text-gray-400">{params.projectAddress} — Lumon Glass System (Tsawwassen Methodology)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {qcComplete ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 size={14} /> QC Complete
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <AlertTriangle size={14} /> QC {qcChecked.size}/{QC_ITEMS.length}
              </span>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="dimensions" className="flex flex-col flex-1 min-h-0">
          <TabsList className="bg-white border-b border-gray-200 rounded-none h-auto p-0 justify-start overflow-x-auto flex-nowrap w-full flex-shrink-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-700 px-5 py-2.5 text-sm font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Dimensions Tab ─────────────────────────────────────────── */}
          <TabsContent value="dimensions" className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl space-y-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Governing Methodology Notice</p>
                <p className="text-xs text-red-600">All dimensions are ESTIMATED from site photographs. Every value entered here will be marked EST. on all drawings. Field verify all dimensions prior to design, pricing, fabrication, permitting, or installation.</p>
              </div>

              {/* Project Info */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Project Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {(["projectName", "projectAddress", "drawnBy", "checkedBy", "revisionDate", "revisionDescription"] as const).map((f) => (
                    <div key={f} className="flex flex-col gap-1">
                      <Label className="text-xs text-gray-600 capitalize">{f.replace(/([A-Z])/g, " $1")}</Label>
                      <Input
                        value={params[f] as string}
                        onChange={(e) => setTextField(f, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Overall Dimensions */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Overall Patio Shell (EST.)</h2>
                <div className="grid grid-cols-3 gap-4">
                  <NumField label="Overall Length" field="overallLengthFt" unit="ft" params={params} onChange={setField} />
                  <NumField label="Overall Depth" field="overallDepthFt" unit="ft" params={params} onChange={setField} />
                  <NumField label="Clear Height" field="overallHeightFt" unit="ft" params={params} onChange={setField} />
                </div>
              </section>

              {/* Timber Structure */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Timber Structure (EST.)</h2>
                <div className="grid grid-cols-3 gap-4">
                  <NumField label="Post Size" field="postSizeIn" unit="in" params={params} onChange={setField} />
                  <NumField label="Beam Depth" field="beamDepthIn" unit="in" params={params} onChange={setField} />
                  <NumField label="Joist Depth" field="joistDepthIn" unit="in" params={params} onChange={setField} />
                </div>
              </section>

              {/* Bay Layout */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Bay Layout (EST.)</h2>
                <div className="grid grid-cols-3 gap-4">
                  <NumField label="Front Bay Count" field="frontBayCount" unit="bays" params={params} onChange={setField} />
                  <NumField label="Front Bay Width" field="frontBayWidthFt" unit="ft" params={params} onChange={setField} />
                  <NumField label="Left Return Bays" field="leftReturnBayCount" unit="bays" params={params} onChange={setField} />
                  <NumField label="Right Return Bays" field="rightReturnBayCount" unit="bays" params={params} onChange={setField} />
                </div>
              </section>

              {/* Lumon System */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Lumon System (EST.)</h2>
                <div className="grid grid-cols-3 gap-4">
                  <NumField label="Lower Glass Height" field="lowerGlassHeightIn" unit="in" params={params} onChange={setField} />
                  <NumField label="Upper Glass Height" field="upperGlassHeightIn" unit="in" params={params} onChange={setField} />
                  <NumField label="Glass Thickness" field="glassMm" unit="mm" params={params} onChange={setField} />
                  <NumField label="Handrail Height" field="handrailHeightMm" unit="mm" params={params} onChange={setField} />
                  <NumField label="Access Door Width" field="accessDoorWidthIn" unit="in" params={params} onChange={setField} />
                  <NumField label="Access Door Count" field="accessDoorCount" unit="ea" params={params} onChange={setField} />
                  <NumField label="Stacking Zone" field="stackingZoneFt" unit="ft" params={params} onChange={setField} />
                </div>
              </section>
            </div>
          </TabsContent>

          {/* ── Drawings Tab ───────────────────────────────────────────── */}
          <TabsContent value="drawings" className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">All drawings generated from estimated dimensions. Every sheet carries the governing methodology disclaimer. Drawings are concept-level only — not for construction, permit, fabrication, or installation.</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <DrawingCard title="Estimated Existing-Condition Plan" sheetNum="EE-1.1" svg={existingPlanSVG} />
                <DrawingCard title="Proposed Lumon Layout Plan" sheetNum="EE-1.2" svg={proposedPlanSVG} />
                <DrawingCard title="Estimated Existing Front Elevation" sheetNum="EE-2.1" svg={existingFrontElevSVG} />
                <DrawingCard title="Proposed Lumon Front Elevation" sheetNum="EE-2.2" svg={proposedFrontElevSVG} />
                <DrawingCard title="Side Elevations — Left and Right" sheetNum="EE-2.3" svg={sideElevSVG} />
                <DrawingCard title="LGS Typical Section" sheetNum="EE-3.1" svg={typicalSectionSVG} />
                <DrawingCard title="Conceptual Connection Details" sheetNum="EE-3.2" svg={connectionDetailsSVG} />
              </div>
            </div>
          </TabsContent>

          {/* ── QTO Tab ────────────────────────────────────────────────── */}
          <TabsContent value="qto" className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-red-700">All quantities are ESTIMATED from site photographs. Field verify all dimensions prior to pricing or procurement.</p>
              </div>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-900 text-left">
                    <th className="px-4 py-2 text-xs font-bold text-yellow-400">Description</th>
                    <th className="px-4 py-2 text-xs font-bold text-yellow-400">Qty</th>
                    <th className="px-4 py-2 text-xs font-bold text-yellow-400">Unit</th>
                    <th className="px-4 py-2 text-xs font-bold text-yellow-400">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {qtoItems.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2 text-xs text-gray-800">{item.description}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-red-700">{item.quantity}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{item.unit}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 italic">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-gray-500">Quantities calculated from estimated dimensions. Final quantities by Lumon Canada upon field survey and shop drawing issue.</p>
            </div>
          </TabsContent>

          {/* ── Notes & QC Tab ─────────────────────────────────────────── */}
          <TabsContent value="notes" className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl space-y-6">
              {/* QC Checklist */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800">Drawing QC Checklist</h2>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${qcComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {qcChecked.size} / {QC_ITEMS.length} {qcComplete ? "✓ Complete" : "Pending"}
                  </span>
                </div>
                <div className="space-y-2">
                  {QC_ITEMS.map((item, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={qcChecked.has(i)}
                        onChange={(e) => {
                          const next = new Set(qcChecked);
                          if (e.target.checked) next.add(i); else next.delete(i);
                          setQcChecked(next);
                        }}
                        className="mt-0.5 accent-yellow-500"
                      />
                      <span className={`text-xs ${qcChecked.has(i) ? "line-through text-gray-400" : "text-gray-700"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-3">Project Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={10}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Add project notes, open items, field observations, coordination notes..."
                />
              </section>

              {/* Responsibility Matrix */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-3">Responsibility Matrix</h2>
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="px-3 py-2 text-left text-yellow-400">Item</th>
                      <th className="px-3 py-2 text-left text-yellow-400">Eagle Eye</th>
                      <th className="px-3 py-2 text-left text-yellow-400">Lumon Canada</th>
                      <th className="px-3 py-2 text-left text-yellow-400">Others / Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Concept drawings (EE series)", "✓ Provides", "Reviews", "—"],
                      ["Field survey & verification", "Coordinates", "✓ Performs", "—"],
                      ["Final shop drawings", "Reviews", "✓ Provides", "—"],
                      ["Glass specification & supply", "—", "✓ Provides", "—"],
                      ["Aluminum profiles & hardware", "—", "✓ Provides", "—"],
                      ["Structural engineering (Lumon)", "—", "✓ Provides", "—"],
                      ["Structural review (timber)", "Coordinates", "—", "✓ Owner's SE"],
                      ["Access doors & frames", "Specifies intent", "—", "✓ By others"],
                      ["Concrete slab condition review", "Flags", "—", "✓ Owner's SE"],
                      ["Permit application", "Assists", "Provides drawings", "✓ Owner"],
                      ["Installation", "Oversees", "✓ Installs", "—"],
                    ].map(([item, ee, lumon, others], i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-1.5 text-gray-800 font-medium">{item}</td>
                        <td className="px-3 py-1.5 text-blue-700">{ee}</td>
                        <td className="px-3 py-1.5 text-green-700">{lumon}</td>
                        <td className="px-3 py-1.5 text-gray-500">{others}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </EagleEyeLayout>
  );
}
