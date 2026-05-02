import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getDefaultMilestonesPhase1,
  getDefaultMilestonesPhase2,
  getDefaultMilestonesPricing,
  getDefaultMilestonesFieldNotes,
  calculateDimensions,
  calculatePhase1QTO,
  calculatePhase2QTO,
  ftToFtIn,
  type Phase1Params,
  type Phase2Params,
  type PricingInputs,
  type FieldNotesData,
  type ScopeMode,
} from "../../../shared/phasedEnclosureGeometry";
import {
  ArrowLeft,
  Lock,
  FileText,
  Layers,
  Ruler,
  DollarSign,
  ClipboardCheck,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
} from "lucide-react";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  badgeVariant = "secondary",
  children,
  collapsible = false,
  defaultOpen = true,
  accent = "gold",
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeVariant?: "secondary" | "destructive" | "outline" | "default";
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  accent?: "gold" | "gray" | "blue" | "green" | "red";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColors: Record<string, string> = {
    gold: "bg-amber-500",
    gray: "bg-zinc-400",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => collapsible && setOpen((o) => !o)}
        type="button"
      >
        <div className={`w-1 h-6 rounded-full ${accentColors[accent]} flex-shrink-0`} />
        <span className="text-card-foreground">{icon}</span>
        <span className="font-semibold text-sm flex-1 text-card-foreground">{title}</span>
        {badge && (
          <Badge variant={badgeVariant} className="text-xs mr-2">
            {badge}
          </Badge>
        )}
        {collapsible && (
          <span className="text-muted-foreground">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ─── Scope Mode Selector ──────────────────────────────────────────────────────

const SCOPE_MODES: { value: ScopeMode; label: string; desc: string }[] = [
  { value: "phase1Only", label: "Phase 1 Only", desc: "Lumon lower glass — current scope" },
  { value: "phase2Only", label: "Phase 2 Only", desc: "Louvered pergola — future scope" },
  { value: "fullBuildout", label: "Full Buildout", desc: "Phase 1 + Phase 2 combined" },
  { value: "compare", label: "Compare", desc: "Phase 1 vs Full Buildout" },
];

function ScopeModeSelector({
  value,
  onChange,
}: {
  value: ScopeMode;
  onChange: (v: ScopeMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SCOPE_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`rounded-lg border p-3 text-left transition-all ${
            value === m.value
              ? "border-amber-500 bg-amber-500/10 text-card-foreground"
              : "border-border bg-muted/20 text-muted-foreground hover:border-amber-400/50"
          }`}
        >
          <div className="font-semibold text-xs">{m.label}</div>
          <div className="text-xs opacity-70 mt-0.5">{m.desc}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhasedEnclosureEditor() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // ── Server state ──
  const { data: project } = trpc.projects.get.useQuery({ id: projectId });
  const { data: savedParams, isLoading } = trpc.phasedEnclosure.getParams.useQuery({ projectId });
  const upsertMutation = trpc.phasedEnclosure.upsertParams.useMutation();
  const utils = trpc.useUtils();

  // ── Local state ──
  const [scopeMode, setScopeMode] = useState<ScopeMode>("fullBuildout");
  const [phase1, setPhase1] = useState<Phase1Params>(getDefaultMilestonesPhase1());
  const [phase2, setPhase2] = useState<Phase2Params>(getDefaultMilestonesPhase2());
  const [pricing, setPricing] = useState<PricingInputs>(getDefaultMilestonesPricing());
  const [fieldNotes, setFieldNotes] = useState<FieldNotesData>(getDefaultMilestonesFieldNotes());
  const [approvedDrawingName, setApprovedDrawingName] = useState(
    "McMillan Design — Milestones Proposed Patio (ID101, April 2025)"
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "qto" | "checklist">("editor");

  // ── Load saved params ──
  useEffect(() => {
    if (!savedParams) return;
    if (savedParams.scopeMode) setScopeMode(savedParams.scopeMode as ScopeMode);
    if (savedParams.phase1Json) setPhase1(savedParams.phase1Json as Phase1Params);
    if (savedParams.phase2Json) setPhase2(savedParams.phase2Json as Phase2Params);
    if (savedParams.pricingJson) setPricing(savedParams.pricingJson as PricingInputs);
    if (savedParams.fieldNotesJson) setFieldNotes(savedParams.fieldNotesJson as FieldNotesData);
    if (savedParams.approvedDrawingName) setApprovedDrawingName(savedParams.approvedDrawingName);
  }, [savedParams]);

  // ── Computed values ──
  const dimensions = calculateDimensions(phase1, phase2);
  const phase1QTO = calculatePhase1QTO(phase1, pricing);
  const phase2QTO = calculatePhase2QTO(phase2, pricing);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await upsertMutation.mutateAsync({
        projectId,
        approvedDrawingName,
        approvedDrawingLocked: true,
        scopeMode,
        phase1Json: phase1,
        phase2Json: phase2,
        dimensionsJson: dimensions,
        pricingJson: pricing,
        fieldNotesJson: fieldNotes,
      });
      utils.phasedEnclosure.getParams.invalidate({ projectId });
      toast.success("Phased enclosure parameters saved.");
    } catch {
      toast.error("Failed to save parameters");
    } finally {
      setSaving(false);
    }
  }, [projectId, scopeMode, phase1, phase2, pricing, fieldNotes, approvedDrawingName, dimensions]);

  // ── PDF Export ──
  const handleExportPDF = () => {
    window.open(`/api/export/phased-enclosure-pdf/${projectId}`, "_blank");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{project?.projectName ?? "Loading…"}</div>
          <div className="text-xs text-muted-foreground">Phased Patio Enclosure</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          className="gap-1.5 text-xs"
        >
          <Download size={14} />
          PDF
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Supplemental notice */}
      <div className="mx-4 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/80">
          <span className="font-semibold text-amber-400">Supplemental Package Only.</span>{" "}
          City-approved drawings are not being revised. This package supplements the approved patio
          drawing and clearly separates Phase 1 (Lumon lower glass) from Phase 2 (future pergola).
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mx-4 mt-4 bg-muted/30 rounded-lg p-1">
        {(["editor", "qto", "checklist"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "editor" ? "Scope Editor" : tab === "qto" ? "QTO / Pricing" : "Field Checklist"}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24">
        {/* ── EDITOR TAB ── */}
        {activeTab === "editor" && (
          <>
            {/* 1. Approved Drawing Reference */}
            <Section
              icon={<Lock size={16} />}
              title="Approved Drawing Reference"
              badge="LOCKED"
              badgeVariant="destructive"
              accent="red"
            >
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 mb-3">
                <div className="flex gap-2 items-start">
                  <Lock size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300/80">
                    The city-approved patio drawing is <strong className="text-red-400">locked and used as reference only</strong>.
                    It cannot be modified. This supplemental package does not revise the approved drawing.
                  </p>
                </div>
              </div>
              <FieldRow label="Approved Drawing Name / Reference">
                <Input
                  value={approvedDrawingName}
                  onChange={(e) => setApprovedDrawingName(e.target.value)}
                  className="text-sm"
                />
              </FieldRow>
              <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-2">
                <strong>Reference:</strong> McMillan Design Ltd. — Proposed Patio, Milestones Grill + Bar,
                Abbotsford BC. Drawing ID101, April 2025. Approved by City of Abbotsford.
                <br />
                <strong>Note:</strong> Any future structural changes (Phase 2 pergola) will require a
                separate permit application.
              </div>
            </Section>

            {/* 2. Project Phasing */}
            <Section
              icon={<Layers size={16} />}
              title="Project Phasing"
              accent="gold"
            >
              <p className="text-xs text-muted-foreground mb-3">
                Select which scope to include in the PDF package and QTO calculations.
              </p>
              <ScopeModeSelector value={scopeMode} onChange={setScopeMode} />
            </Section>

            {/* 3. Phase 1 — Lumon Lower Glass */}
            {(scopeMode === "phase1Only" || scopeMode === "fullBuildout" || scopeMode === "compare") && (
              <Section
                icon={<span className="text-xs font-bold text-emerald-400">P1</span>}
                title="Phase 1 — Current Scope (Lumon Lower Glass)"
                badge="CURRENT"
                badgeVariant="default"
                accent="green"
                collapsible
              >
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 mb-3">
                  <p className="text-xs text-emerald-300/80">
                    Lumon railing + lower glass installation only. No pergola this year. Lower system
                    designed for future upper enclosure integration. Approved patio layout unchanged.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Front Width (ft)">
                    <Input
                      type="number"
                      value={phase1.frontWidthFt}
                      onChange={(e) => setPhase1({ ...phase1, frontWidthFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Side Depth (ft)">
                    <Input
                      type="number"
                      value={phase1.sideDepthFt}
                      onChange={(e) => setPhase1({ ...phase1, sideDepthFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Front Sections">
                    <Input
                      type="number"
                      value={phase1.frontSections}
                      onChange={(e) => setPhase1({ ...phase1, frontSections: parseInt(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Section Width (ft)">
                    <Input
                      type="number"
                      value={phase1.frontSectionWidthFt}
                      onChange={(e) => setPhase1({ ...phase1, frontSectionWidthFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Glass Height (ft)">
                    <Input
                      type="number"
                      value={phase1.frontGlassHeightFt}
                      onChange={(e) => setPhase1({ ...phase1, frontGlassHeightFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Side Width (ft)">
                    <Input
                      type="number"
                      value={phase1.leftSideWidthFt}
                      onChange={(e) => setPhase1({ ...phase1, leftSideWidthFt: parseFloat(e.target.value) || 0, rightSideWidthFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                </div>

                <FieldRow label="Finish Color">
                  <Input
                    value={phase1.finishColor}
                    onChange={(e) => setPhase1({ ...phase1, finishColor: e.target.value })}
                  />
                </FieldRow>

                <FieldRow label="Railing Integration Note">
                  <Textarea
                    value={phase1.railingIntegrationNote}
                    onChange={(e) => setPhase1({ ...phase1, railingIntegrationNote: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </FieldRow>

                <FieldRow label="Future Integration Note">
                  <Textarea
                    value={phase1.futureIntegrationNote}
                    onChange={(e) => setPhase1({ ...phase1, futureIntegrationNote: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </FieldRow>

                {/* Phase 1 summary */}
                <div className="mt-3 rounded-lg bg-muted/20 p-3 text-xs space-y-1">
                  <div className="font-semibold text-muted-foreground mb-1">Phase 1 Summary</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Front glass area</span>
                    <span>{dimensions.phase1FrontGlassAreaSqFt} sqft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Side glass area</span>
                    <span>{dimensions.phase1SideGlassAreaSqFt} sqft</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span>Total glass area</span>
                    <span>{dimensions.phase1TotalGlassAreaSqFt} sqft</span>
                  </div>
                </div>
              </Section>
            )}

            {/* 4. Phase 2 — Future Pergola */}
            {(scopeMode === "phase2Only" || scopeMode === "fullBuildout" || scopeMode === "compare") && (
              <Section
                icon={<span className="text-xs font-bold text-blue-400">P2</span>}
                title="Phase 2 — Future Scope (Louvered Pergola)"
                badge="FUTURE"
                badgeVariant="secondary"
                accent="blue"
                collapsible
              >
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2 mb-3">
                  <p className="text-xs text-blue-300/80">
                    Future louvered pergola roof + upper enclosure. Requires separate permit application.
                    All dimensions are preliminary and subject to field verification and structural engineering.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Total Height (ft)" hint="Including beams — target 8ft 10in">
                    <Input
                      type="number"
                      step="0.01"
                      value={phase2.totalUnitHeightFt.toFixed(2)}
                      onChange={(e) => setPhase2({ ...phase2, totalUnitHeightFt: parseFloat(e.target.value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Beam Size (in)">
                    <Input
                      type="number"
                      value={phase2.beamSizeIn}
                      onChange={(e) => setPhase2({ ...phase2, beamSizeIn: parseInt(e.target.value) || 8 })}
                    />
                  </FieldRow>
                  <FieldRow label="Post Size (in)" hint="6×6 posts">
                    <Input
                      type="number"
                      value={phase2.postSizeIn}
                      onChange={(e) => setPhase2({ ...phase2, postSizeIn: parseInt(e.target.value) || 6 })}
                    />
                  </FieldRow>
                  <FieldRow label="Front Sections">
                    <Input
                      type="number"
                      value={phase2.frontSections}
                      onChange={(e) => setPhase2({ ...phase2, frontSections: parseInt(e.target.value) || 5 })}
                    />
                  </FieldRow>
                  <FieldRow label="Front Section Width (ft)">
                    <Input
                      type="number"
                      value={phase2.frontSectionWidthFt}
                      onChange={(e) => setPhase2({ ...phase2, frontSectionWidthFt: parseFloat(e.target.value) || 11 })}
                    />
                  </FieldRow>
                  <FieldRow label="Front Section Height (ft)">
                    <Input
                      type="number"
                      value={phase2.frontSectionHeightFt}
                      onChange={(e) => setPhase2({ ...phase2, frontSectionHeightFt: parseFloat(e.target.value) || 8 })}
                    />
                  </FieldRow>
                  <FieldRow label="Louver Sections">
                    <Input
                      type="number"
                      value={phase2.louverSections}
                      onChange={(e) => setPhase2({ ...phase2, louverSections: parseInt(e.target.value) || 5 })}
                    />
                  </FieldRow>
                  <FieldRow label="Louver Section Width (ft)">
                    <Input
                      type="number"
                      value={phase2.louverSectionWidthFt}
                      onChange={(e) => setPhase2({ ...phase2, louverSectionWidthFt: parseFloat(e.target.value) || 15 })}
                    />
                  </FieldRow>
                  <FieldRow label="Louver Section Depth (ft)">
                    <Input
                      type="number"
                      value={phase2.louverSectionDepthFt}
                      onChange={(e) => setPhase2({ ...phase2, louverSectionDepthFt: parseFloat(e.target.value) || 10 })}
                    />
                  </FieldRow>
                  <FieldRow label="Escape Door Width (in)">
                    <Input
                      type="number"
                      value={phase2.escapeDoorWidthIn}
                      onChange={(e) => setPhase2({ ...phase2, escapeDoorWidthIn: parseInt(e.target.value) || 32 })}
                    />
                  </FieldRow>
                  <FieldRow label="Latch Post Size (in)" hint="3×3 latch/strike post">
                    <Input
                      type="number"
                      value={phase2.latchPostSizeIn}
                      onChange={(e) => setPhase2({ ...phase2, latchPostSizeIn: parseInt(e.target.value) || 3 })}
                    />
                  </FieldRow>
                  <FieldRow label="Side Width — Wall Mount (ft)" hint="One post, wall-mounted">
                    <Input
                      type="number"
                      step="0.01"
                      value={phase2.sideWallMountedWidthFt}
                      onChange={(e) => setPhase2({ ...phase2, sideWallMountedWidthFt: parseFloat(e.target.value) || 15.17 })}
                    />
                  </FieldRow>
                  <FieldRow label="Side Width — Both Posts (ft)" hint="Posts on both sides">
                    <Input
                      type="number"
                      step="0.01"
                      value={phase2.sideBothPostsWidthFt}
                      onChange={(e) => setPhase2({ ...phase2, sideBothPostsWidthFt: parseFloat(e.target.value) || 14.67 })}
                    />
                  </FieldRow>
                </div>

                <FieldRow label="Beam + Lighting Note">
                  <Textarea
                    value={phase2.beamLightNote}
                    onChange={(e) => setPhase2({ ...phase2, beamLightNote: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </FieldRow>

                <FieldRow label="Sliding Glass Door Note">
                  <Textarea
                    value={phase2.slidingGlassNote}
                    onChange={(e) => setPhase2({ ...phase2, slidingGlassNote: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </FieldRow>

                {/* Phase 2 summary */}
                <div className="mt-3 rounded-lg bg-muted/20 p-3 text-xs space-y-1">
                  <div className="font-semibold text-muted-foreground mb-1">Phase 2 Summary</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total height</span>
                    <span>{ftToFtIn(phase2.totalUnitHeightFt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Louver area</span>
                    <span>{dimensions.phase2LouverAreaSqFt} sqft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upper glass area</span>
                    <span>{dimensions.phase2TotalGlassAreaSqFt} sqft</span>
                  </div>
                </div>
              </Section>
            )}

            {/* 5. Dimensions Summary */}
            <Section
              icon={<Ruler size={16} />}
              title="Dimensions Summary"
              accent="gray"
              collapsible
              defaultOpen={false}
            >
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-muted-foreground uppercase tracking-wide text-xs mb-2">Patio Overall</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Front Width", `${dimensions.patioFrontWidthFt} ft`],
                    ["Side Depth", `${dimensions.patioDepthFt} ft`],
                    ["Patio Area", `${dimensions.patioAreaSqFt} sqft`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-muted/20 rounded px-2 py-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="font-semibold text-emerald-400 uppercase tracking-wide text-xs mt-3 mb-2">Phase 1 Glass Areas</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Front Glass", `${dimensions.phase1FrontGlassAreaSqFt} sqft`],
                    ["Side Glass", `${dimensions.phase1SideGlassAreaSqFt} sqft`],
                    ["Total Glass", `${dimensions.phase1TotalGlassAreaSqFt} sqft`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-emerald-500/5 border border-emerald-500/20 rounded px-2 py-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="font-semibold text-blue-400 uppercase tracking-wide text-xs mt-3 mb-2">Phase 2 Structure</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Total Height", ftToFtIn(dimensions.phase2TotalHeightFt)],
                    ["Louver Area", `${dimensions.phase2LouverAreaSqFt} sqft`],
                    ["Upper Glass", `${dimensions.phase2TotalGlassAreaSqFt} sqft`],
                    ["Post Count", `${dimensions.phase2PostCount} posts`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-blue-500/5 border border-blue-500/20 rounded px-2 py-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-blue-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* 6. Pricing Inputs */}
            <Section
              icon={<DollarSign size={16} />}
              title="Pricing Inputs"
              accent="gold"
              collapsible
              defaultOpen={false}
            >
              <div className="font-semibold text-emerald-400 text-xs uppercase tracking-wide mb-2">Phase 1 Rates</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <FieldRow label="Glass ($/sqft)">
                  <Input type="number" value={pricing.phase1GlassRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase1GlassRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Install ($/sqft)">
                  <Input type="number" value={pricing.phase1InstallRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase1InstallRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Railing Integration ($)">
                  <Input type="number" value={pricing.phase1RailingIntegrationFlat}
                    onChange={(e) => setPricing({ ...pricing, phase1RailingIntegrationFlat: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
              </div>

              <div className="font-semibold text-blue-400 text-xs uppercase tracking-wide mb-2">Phase 2 Rates</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <FieldRow label="Structure ($/sqft)">
                  <Input type="number" value={pricing.phase2StructureRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase2StructureRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Louver ($/sqft)">
                  <Input type="number" value={pricing.phase2LouverRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase2LouverRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Glass ($/sqft)">
                  <Input type="number" value={pricing.phase2GlassRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase2GlassRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Install ($/sqft)">
                  <Input type="number" value={pricing.phase2InstallRatePerSqFt}
                    onChange={(e) => setPricing({ ...pricing, phase2InstallRatePerSqFt: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Contingency (%)">
                  <Input type="number" value={pricing.contingencyPct}
                    onChange={(e) => setPricing({ ...pricing, contingencyPct: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
                <FieldRow label="Tax (%)">
                  <Input type="number" value={pricing.taxPct}
                    onChange={(e) => setPricing({ ...pricing, taxPct: parseFloat(e.target.value) || 0 })} />
                </FieldRow>
              </div>
            </Section>

            {/* 7. Generate PDF */}
            <Section
              icon={<Download size={16} />}
              title="Generate PDF Package"
              accent="gold"
            >
              <p className="text-xs text-muted-foreground mb-3">
                Generates a supplemental PDF package clearly labeled as not modifying the approved drawings.
                Includes all selected phases based on the scope mode above.
              </p>
              <div className="space-y-2 text-xs mb-4">
                {[
                  "Approved Drawing Reference Sheet",
                  scopeMode !== "phase2Only" ? "Phase 1 — Lumon Lower Glass Scope Sheet" : null,
                  scopeMode !== "phase1Only" ? "Phase 2 — Future Pergola Criteria Sheet" : null,
                  "Dimensions Summary Sheet",
                  "Assumptions / Exclusions Sheet",
                  "Field Verification Checklist",
                ]
                  .filter(Boolean)
                  .map((sheet) => (
                    <div key={sheet} className="flex items-center gap-2 text-muted-foreground">
                      <FileText size={12} className="text-amber-500" />
                      {sheet}
                    </div>
                  ))}
              </div>
              <Button
                onClick={handleExportPDF}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Download size={16} className="mr-2" />
                Generate Supplemental PDF Package
              </Button>
            </Section>
          </>
        )}

        {/* ── QTO TAB ── */}
        {activeTab === "qto" && (
          <>
            {(scopeMode !== "phase2Only") && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-sm">Phase 1 — Lumon Lower Glass</span>
                  <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">Current Scope</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">Qty</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-12">Unit</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase1QTO.items.map((item, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground leading-snug">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.qty}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{item.unit}</td>
                          <td className="px-3 py-2 text-right font-medium">${item.lineTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>${phase1QTO.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Contingency ({pricing.contingencyPct}%)</span><span>${phase1QTO.contingency.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({pricing.taxPct}%)</span><span>${phase1QTO.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-400 border-t border-border pt-1">
                      <span>Phase 1 Total</span><span>${phase1QTO.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(scopeMode !== "phase1Only") && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <span className="font-semibold text-sm">Phase 2 — Louvered Pergola</span>
                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">Future Scope</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">Qty</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-12">Unit</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase2QTO.items.map((item, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground leading-snug">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.qty}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{item.unit}</td>
                          <td className="px-3 py-2 text-right font-medium">${item.lineTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>${phase2QTO.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Contingency ({pricing.contingencyPct}%)</span><span>${phase2QTO.contingency.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({pricing.taxPct}%)</span><span>${phase2QTO.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-400 border-t border-border pt-1">
                      <span>Phase 2 Total</span><span>${phase2QTO.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scopeMode === "fullBuildout" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs">
                <div className="font-bold text-amber-400 text-sm mb-2">Full Buildout Total</div>
                <div className="flex justify-between text-muted-foreground mb-1">
                  <span>Phase 1 (Current)</span><span>${phase1QTO.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground mb-2">
                  <span>Phase 2 (Future)</span><span>${phase2QTO.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-400 border-t border-amber-500/30 pt-2 text-sm">
                  <span>Combined Total</span>
                  <span>${(phase1QTO.total + phase2QTO.total).toLocaleString()}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CHECKLIST TAB ── */}
        {activeTab === "checklist" && (
          <>
            <div className="mb-3 rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
              <Info size={12} className="inline mr-1 text-amber-500" />
              Complete this checklist during the site visit before Phase 1 fabrication begins.
            </div>

            {Array.from(new Set(fieldNotes.items.map((i) => i.category))).map((cat) => (
              <div key={cat} className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">{cat}</div>
                <div className="rounded-xl border border-border overflow-hidden">
                  {fieldNotes.items
                    .filter((i) => i.category === cat)
                    .map((item, idx, arr) => (
                      <div
                        key={item.id}
                        className={`flex gap-3 px-3 py-3 ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFieldNotes({
                              ...fieldNotes,
                              items: fieldNotes.items.map((i) =>
                                i.id === item.id ? { ...i, checked: !i.checked } : i
                              ),
                            });
                          }}
                          className="flex-shrink-0 mt-0.5"
                        >
                          {item.checked ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <Circle size={16} className="text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs leading-snug ${item.checked ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
                            {item.label}
                          </div>
                          <input
                            type="text"
                            placeholder="Add note…"
                            value={item.note}
                            onChange={(e) => {
                              setFieldNotes({
                                ...fieldNotes,
                                items: fieldNotes.items.map((i) =>
                                  i.id === item.id ? { ...i, note: e.target.value } : i
                                ),
                              });
                            }}
                            className="mt-1 w-full text-xs bg-transparent border-b border-border/50 focus:border-amber-500 outline-none text-muted-foreground placeholder:text-muted-foreground/50 pb-0.5"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            <div className="mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">General Notes</div>
              <Textarea
                value={fieldNotes.generalNotes}
                onChange={(e) => setFieldNotes({ ...fieldNotes, generalNotes: e.target.value })}
                rows={4}
                className="text-xs"
                placeholder="General site notes…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <FieldRow label="Site Contact Name">
                <Input
                  value={fieldNotes.siteContactName}
                  onChange={(e) => setFieldNotes({ ...fieldNotes, siteContactName: e.target.value })}
                  className="text-xs"
                />
              </FieldRow>
              <FieldRow label="Site Contact Phone">
                <Input
                  value={fieldNotes.siteContactPhone}
                  onChange={(e) => setFieldNotes({ ...fieldNotes, siteContactPhone: e.target.value })}
                  className="text-xs"
                />
              </FieldRow>
              <FieldRow label="Verification Date">
                <Input
                  type="date"
                  value={fieldNotes.verificationDate}
                  onChange={(e) => setFieldNotes({ ...fieldNotes, verificationDate: e.target.value })}
                  className="text-xs"
                />
              </FieldRow>
            </div>

            {/* Checklist progress */}
            <div className="rounded-xl border border-border bg-card p-3 text-xs">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Checklist Progress</span>
                <span className="text-muted-foreground">
                  {fieldNotes.items.filter((i) => i.checked).length} / {fieldNotes.items.length} complete
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(fieldNotes.items.filter((i) => i.checked).length / fieldNotes.items.length) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 text-xs"
          onClick={handleExportPDF}
        >
          <Download size={14} className="mr-1.5" />
          Export PDF
        </Button>
        <Button
          className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
