import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import ModelViewer3D from "@/components/ModelViewer3D";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, Printer, AlertTriangle, CheckCircle2, Info, HelpCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Constraint / note card ───────────────────────────────────────────────────
function NoteCard({ icon, color, title, children }: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div>
          <p className="font-semibold text-sm mb-1">{title}</p>
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 rounded-full bg-[#C9A84C]" />
      <div>
        <h2 className="text-base font-bold text-gray-900">{label}</h2>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Dimension row ────────────────────────────────────────────────────────────
function DimRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </div>
  );
}

// ─── Glass option comparison card ────────────────────────────────────────────
function GlassOptionCard({
  label, heightIn, platformIn, isRecommended, description, params
}: {
  label: string;
  heightIn: number;
  platformIn: number;
  isRecommended?: boolean;
  description: string;
  params: any;
}) {
  const heightFt = heightIn / 12;
  const effectiveHeight = heightIn - platformIn;

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isRecommended ? "border-[#C9A84C]" : "border-gray-200"}`}>
      {isRecommended && (
        <div className="bg-[#C9A84C] text-black text-xs font-bold text-center py-1 tracking-wider uppercase">
          Recommended
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">{label}</h3>
          <Badge variant="outline" className="text-xs font-mono">{heightIn}″ glass</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        <div className="space-y-1 mb-4">
          <DimRow label="Glass height" value={`${heightIn}″ (${heightFt.toFixed(2)}′)`} />
          <DimRow label="Booth platform" value={`${platformIn}″ raised`} />
          <DimRow
            label="Effective privacy height"
            value={`${effectiveHeight}″ above platform`}
            note={effectiveHeight < 36 ? "⚠ May expose booth backs" : "✓ Adequate privacy"}
          />
          <DimRow label="Rail width" value={`5¾″ / 146 mm`} note="Verify with Lumon shop drawings" />
        </div>

        {/* Mini 3D preview */}
        <div className="rounded-lg overflow-hidden" style={{ height: 220 }}>
          <ModelViewer3D
            params={{
              ...params,
              glassWallHeightFt: heightFt,
              showBooths: true,
              boothPlatformHeightIn: platformIn,
              showUpperGlass: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConceptPackage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const [exportLoading, setExportLoading] = useState(false);

  const { data: project } = trpc.projects.get.useQuery({ id: projectId }, { enabled: projectId > 0 });
  const { data: projectParams } = trpc.params.get.useQuery({ projectId }, { enabled: projectId > 0 });
  const { data: scopeItems } = trpc.scope.get.useQuery({ projectId }, { enabled: projectId > 0 });
  const { data: notesData } = trpc.notes.get.useQuery({ projectId }, { enabled: projectId > 0 });

  const params3D = {
    widthFt: parseFloat(projectParams?.widthFt ?? "58") || 58,
    depthFt: parseFloat(projectParams?.depthFt ?? "15.67") || 15.67,
    heightFt: parseFloat(projectParams?.heightFt ?? "10") || 10,
    postCount: projectParams?.postCount ?? 5,
    postSizeIn: 6,
    beamSizeIn: 8,
    louverSpacingIn: parseFloat(projectParams?.slatSpacingIn ?? "4") || 4,
    louverSizeIn: 6,
    hasGlass: projectParams?.glassFront ?? true,
    glassWallHeightFt: parseFloat(projectParams?.glassWallHeightFt ?? "4") || 4,
    railWidthIn: parseFloat(projectParams?.railWidthIn ?? "5.75") || 5.75,
    showBooths: true,
    boothPlatformHeightIn: 8,
    showUpperGlass: true,
    finishColor: "#2a2a2a",
  };

  const handlePrint = () => window.print();
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await fetch(`/api/export/pdf/${projectId}`, { method: "GET" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.projectName ?? "concept"}_package.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const assumptions = scopeItems?.filter(s => s.type === "assumption") ?? [];
  const exclusions  = scopeItems?.filter(s => s.type === "exclusion") ?? [];

  return (
    <EagleEyeLayout title="Concept Package">
      <div className="max-w-5xl mx-auto print:max-w-none">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Editor
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer size={14} /> Print
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={exportLoading}
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#C9A84C", color: "#111" }}
            >
              <Download size={14} /> {exportLoading ? "Generating…" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* ── Cover header ── */}
        <div className="bg-gray-900 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ background: "repeating-linear-gradient(45deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 20px)" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-widest mb-1">Concept Package — Not For Construction</p>
                <h1 className="text-2xl font-bold mb-1">{project?.projectName ?? "Milestones Abbotsford Patio Pergola / Lumon Enclosure Concept"}</h1>
                <p className="text-gray-300 text-sm">{project?.clientName ?? "Milestones Restaurants Inc."}</p>
                {project?.location && <p className="text-gray-400 text-xs mt-0.5">{project.location}</p>}
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-semibold">
                Concept Only
              </Badge>
            </div>
            <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
              Commercial restaurant patio upgrade involving Lumon glass/railing system, upper sliding glass (Phase 2), pergola/roof structure, booth layout, drainage coordination, egress doors, and existing building coordination. This package is prepared for client review, contractor/installer review, and preliminary pricing only.
            </p>
          </div>
        </div>

        {/* ── 3D Model ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <SectionHeader
            label="3D Concept Model"
            sub="Interactive — drag to orbit, scroll to zoom. Toggle Phase 2 upper glass and booths using the toolbar."
          />
          <ModelViewer3D
            projectName={project?.projectName}
            params={params3D}
          />
          <p className="text-xs text-gray-400 mt-3 text-center">
            Concept model only — not to scale, not engineered. All dimensions subject to field verification and Lumon shop drawings.
          </p>
        </div>

        {/* ── Key Dimensions ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader label="Key Dimensions" sub="Working dimensions — field verification required" />
            <div className="space-y-0">
              <DimRow label="Front patio span" value="58 ft" note="Field verify" />
              <DimRow label="Front posts" value="5 total" note="1 at each end + 3 intermediate" />
              <DimRow label="Post spacing (approx.)" value="~14 ft" note="Equal spacing" />
              <DimRow label="Post size" value="6″ × 6″" />
              <DimRow label="Building/canopy height ref." value="~9–10 ft" note="Field verify final height" />
              <DimRow label="Lumon top rail width" value='5¾″ / ≈146 mm' note="Verify with Lumon shop drawings" />
              <DimRow label="Booth platform height" value='8″ raised' />
              <DimRow label="Drain reference distance" value="~3 ft from glass railing" note="Final location to be confirmed" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader label="Design Intent" sub="Primary scope elements" />
            <div className="space-y-2">
              {[
                "Lumon lower glass/railing system (Phase 1)",
                "Upper Lumon sliding glass system (Phase 2 — optional)",
                "Pergola/roof structure with 5 front posts",
                "6 U-shaped booths on 8″ raised platform",
                "2 egress doors along the side",
                "Serving station coordination",
                "Drainage review and rerouting",
                "Exit sign relocation to new beam/roof",
                "Existing decorative wall removal",
                "New pony/base wall at post locations",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Glass Height Comparison ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <SectionHeader
            label="Glass Height Comparison"
            sub="Client comparison — 48″ vs 52″ lower glass options"
          />
          <p className="text-sm text-gray-600 mb-6">
            The booths sit on an 8″ raised platform. The 52″ option is recommended because the booth backs may sit above the 48″ glass line when the platform is factored in, reducing privacy from the street. Both options are shown below for client review.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassOptionCard
              label="Option A — 48″ Glass"
              heightIn={48}
              platformIn={8}
              description="Standard lower glass height. With the 8″ booth platform, effective privacy height above platform is 40″. Booth backs may be visible from street level depending on booth back height."
              params={params3D}
            />
            <GlassOptionCard
              label="Option B — 52″ Glass"
              heightIn={52}
              platformIn={8}
              isRecommended
              description="Taller lower glass option. Effective privacy height above platform is 44″. Better conceals booth backs from street view. Recommended for improved privacy and visual comfort."
              params={params3D}
            />
          </div>
        </div>

        {/* ── Constraints & Open Questions ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <SectionHeader label="Constraints & Open Questions" sub="Items requiring confirmation before final design" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NoteCard
              icon={<AlertTriangle size={16} className="text-amber-600" />}
              color="bg-amber-50 border-amber-200 text-amber-900"
              title="Building Attachment"
            >
              Do not assume the new structure can attach to the building. Building attachment must be confirmed by landlord and structural engineer.
            </NoteCard>
            <NoteCard
              icon={<AlertTriangle size={16} className="text-amber-600" />}
              color="bg-amber-50 border-amber-200 text-amber-900"
              title="Existing Drain"
            >
              Existing drain near the current glass wall may end up inside the new base/retaining wall if the wall moves outward. Drain extension or rerouting may be required (~3 ft out from glass railing).
            </NoteCard>
            <NoteCard
              icon={<AlertTriangle size={16} className="text-amber-600" />}
              color="bg-amber-50 border-amber-200 text-amber-900"
              title="Underground Parking / Piping"
            >
              Underground parking and piping below the slab must be considered before any drainage changes are made.
            </NoteCard>
            <NoteCard
              icon={<AlertTriangle size={16} className="text-amber-600" />}
              color="bg-amber-50 border-amber-200 text-amber-900"
              title="Existing Conduit / Power"
            >
              Existing conduit/power on the building mullion under the canopy may conflict with the new design. Field verification required.
            </NoteCard>
            <NoteCard
              icon={<Info size={16} className="text-blue-600" />}
              color="bg-blue-50 border-blue-200 text-blue-900"
              title="Egress Doors"
            >
              Two egress exits along the side. Preliminary location ~40–42″ from front post. Final locations depend on serving station layout and code requirements.
            </NoteCard>
            <NoteCard
              icon={<Info size={16} className="text-blue-600" />}
              color="bg-blue-50 border-blue-200 text-blue-900"
              title="Exit Signs"
            >
              Existing exit signs attached to the existing rigid awning/canopy at both ends may need to be relocated to the inside of the new roof/beam system.
            </NoteCard>
            <NoteCard
              icon={<Info size={16} className="text-blue-600" />}
              color="bg-blue-50 border-blue-200 text-blue-900"
              title="Roof Drainage"
            >
              Pergola/roof system may drain through the front posts as internal downspouts. Confirm where water discharges after running down through posts.
            </NoteCard>
            <NoteCard
              icon={<Info size={16} className="text-blue-600" />}
              color="bg-blue-50 border-blue-200 text-blue-900"
              title="Decorative Wall"
            >
              Existing decorative aluminum side wall/panel to be removed and stored. Reinstall only if required in the future.
            </NoteCard>
          </div>
        </div>

        {/* ── Pricing Notes ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <SectionHeader
            label="Pricing Notes"
            sub="Internal working references only — not final customer pricing"
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Internal use only.</strong> The figures below are preliminary working references from the initial meeting. They are not final customer pricing. Final pricing must include all line items listed below.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Glass/Enclosure Reference</p>
              <p className="text-lg font-bold text-gray-900">$80,684</p>
              <p className="text-xs text-gray-400">+ $2,650.83 (working reference)</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Alt. Working Reference</p>
              <p className="text-lg font-bold text-gray-900">$74,436</p>
              <p className="text-xs text-gray-400">+ $2,650 (working reference)</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Railing Dealer Price</p>
              <p className="text-lg font-bold text-gray-900">$16,163</p>
              <p className="text-xs text-gray-400">Markup discussed: 1.8× — install not included</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Final customer pricing must include:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {[
              "Materials", "Install labour", "Equipment / lifts",
              "Demolition / removal", "Engineering", "Permits",
              "Electrical / exit sign relocation", "Drainage work", "Concrete / base wall",
              "Flooring", "Contingency", "Taxes",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ── Lumon Callout 1: Rail/Top Cap Profile ── */}
        <div className="bg-blue-950/80 border border-blue-700 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HelpCircle size={12} className="text-blue-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">Callout — Rail / Top Cap Profile Width</p>
              <p className="text-sm text-blue-100 leading-relaxed">
                Lumon rail/top cap profile to be confirmed by final Lumon shop drawings.{" "}
                <strong>Meeting reference was 5¾″ / approx. 146 mm</strong>; Lumon detail drawings show profile widths up to{" "}
                <strong>160 mm</strong> depending on selected system configuration.
              </p>
            </div>
          </div>
        </div>

        {/* ── Lumon Callout 2: 5-Rail Sliding System ── */}
        <div className="bg-blue-950/80 border border-blue-700 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HelpCircle size={12} className="text-blue-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">Callout — 5-Rail Lumon Sliding Glazing System</p>
              <p className="text-sm text-blue-100 leading-relaxed">
                5-rail Lumon sliding glazing system shown for coordination. Final number of tracks, glass thickness, stacking direction,
                anchoring, drainage, and profile dimensions to be confirmed by Lumon.
              </p>
            </div>
          </div>
        </div>

        {/* ── Lumon Technical Note ── */}
        <div className="bg-amber-950/60 border border-amber-700 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={12} className="text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1">Technical Note — Design Coordination Only</p>
              <p className="text-sm text-amber-100 leading-relaxed">
                Lumon profile sections are included for design coordination only and are{" "}
                <strong>not construction or shop drawings</strong>. Final details require Lumon shop drawings, engineering review,
                landlord approval, field measurements, and permit confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* ── Drawing Notes / Assumptions ── */}
        <div className="bg-gray-900 text-white rounded-2xl p-6 mb-8">
          <SectionHeader label="Drawing Notes & Assumptions" sub="This package is concept only" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: <HelpCircle size={14} />, text: "Concept only — not for construction." },
              { icon: <HelpCircle size={14} />, text: "Final field measurements required before fabrication." },
              { icon: <HelpCircle size={14} />, text: "Engineering review required for all structural elements." },
              { icon: <HelpCircle size={14} />, text: "Lumon shop drawings required to confirm all profile dimensions." },
              { icon: <HelpCircle size={14} />, text: "Landlord approval required before building attachment." },
              { icon: <HelpCircle size={14} />, text: "City/permit requirements to be confirmed." },
              { icon: <HelpCircle size={14} />, text: "Building attachment not assumed in this concept." },
              { icon: <HelpCircle size={14} />, text: "Drainage and underground parking/piping to be reviewed." },
              { icon: <HelpCircle size={14} />, text: "Final Lumon rail/profile dimensions must be confirmed by Lumon shop drawings." },
              { icon: <HelpCircle size={14} />, text: "Egress door locations to be coordinated with serving stations and code requirements." },
              { icon: <HelpCircle size={14} />, text: "Serving station locations to be verified before final egress placement." },
              { icon: <HelpCircle size={14} />, text: "Drainage to be reviewed. Existing drain may require extension/rerouting outside new base wall." },
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">{note.icon}</span>
                <span>{note.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              Prepared by Eagle Eye Management Services · Concept Only — Not For Construction · {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* ── Project Notes (if any) ── */}
        {notesData?.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <SectionHeader label="Project Summary Notes" />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notesData.notes}</p>
          </div>
        )}

      </div>
    </EagleEyeLayout>
  );
}
