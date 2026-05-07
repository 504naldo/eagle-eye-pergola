import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, Info, CheckCircle2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── SVG Profile Diagrams ─────────────────────────────────────────────────────

/** Renders an accurate cross-section profile for a Lumon aluminum extrusion */
function ProfileDiagram({
  title,
  widthMm,
  heightMm,
  color = "#6b7280",
  note,
}: {
  title: string;
  widthMm: number;
  heightMm: number;
  color?: string;
  note?: string;
}) {
  const scale = 2.2; // px per mm
  const pw = widthMm * scale;
  const ph = heightMm * scale;
  const pad = 32;
  const svgW = pw + pad * 2 + 80; // extra room for dimension labels
  const svgH = ph + pad * 2 + 40;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-foreground/80 text-center">{title}</p>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        {/* Dimension lines */}
        {/* Width dimension */}
        <line x1={pad} y1={pad - 14} x2={pad + pw} y2={pad - 14} stroke="#94a3b8" strokeWidth={0.8} markerEnd="url(#arr)" markerStart="url(#arr)" />
        <text x={pad + pw / 2} y={pad - 18} textAnchor="middle" fontSize={9} fill="#94a3b8">{widthMm} mm</text>
        {/* Height dimension */}
        <line x1={pad + pw + 14} y1={pad} x2={pad + pw + 14} y2={pad + ph} stroke="#94a3b8" strokeWidth={0.8} />
        <text x={pad + pw + 22} y={pad + ph / 2} textAnchor="start" fontSize={9} fill="#94a3b8" dominantBaseline="middle">{heightMm} mm</text>

        {/* Profile rectangle */}
        <rect x={pad} y={pad} width={pw} height={ph} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} rx={1} />

        {/* Hatch lines to indicate solid aluminum */}
        {Array.from({ length: Math.ceil((pw + ph) / 8) }).map((_, i) => {
          const offset = i * 8 - ph;
          return (
            <line
              key={i}
              x1={Math.max(pad, pad + offset)}
              y1={offset < 0 ? pad - offset : pad}
              x2={Math.min(pad + pw, pad + offset + ph)}
              y2={offset < 0 ? pad + ph : pad + ph - offset}
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arr" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
      {note && <p className="text-[10px] text-muted-foreground text-center max-w-[160px]">{note}</p>}
    </div>
  );
}

/** Full system stack diagram showing all Lumon layers from slab to pergola beam */
function SystemStackDiagram() {
  // All heights in mm, drawn to scale
  const layers = [
    { label: "Pergola Beam", h: 152, color: "#374151", note: "6×6\" structural post/beam" },
    { label: "Upper Guide Track\n99×60mm", h: 60, color: "#6b7280", note: "Phase 2 top guide" },
    { label: "Upper Sliding Glass\n(clear/tinted)", h: 340, color: "#93c5fd", note: "Height varies — fills gap to guide track" },
    { label: "Upper Bottom Track\n101×71mm", h: 71, color: "#4b5563", note: "Phase 2 bottom track / Phase 1 top cap connector" },
    { label: "Top Cap / Large Rail\n160×45mm", h: 45, color: "#6b7280", note: "Lumon top cap profile" },
    { label: "Lower Glass Infill\n(frosted — privacy)", h: 1000, color: "#e2e8f0", note: "Height = railing height − base rail − top cap" },
    { label: "Lower Base Rail\n83×32mm", h: 32, color: "#4b5563", note: "Sits on slab/base wall" },
    { label: "Concrete Slab / Base Wall", h: 80, color: "#9ca3af", note: "" },
  ];

  const scale = 0.22; // px per mm
  const totalH = layers.reduce((s, l) => s + l.h, 0);
  const svgH = totalH * scale + 20;
  const svgW = 340;
  const barW = 120;
  const barX = 80;

  let y = 10;
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
      {layers.map((layer, i) => {
        const lh = layer.h * scale;
        const cy = y + lh / 2;
        const rect = (
          <g key={i}>
            <rect x={barX} y={y} width={barW} height={lh} fill={layer.color} fillOpacity={0.25} stroke={layer.color} strokeWidth={1.2} rx={1} />
            {/* Hatch for solid profiles */}
            {layer.h <= 160 && Array.from({ length: Math.ceil(barW / 8) }).map((_, j) => (
              <line key={j} x1={barX + j * 8} y1={y} x2={barX + j * 8 - lh} y2={y + lh} stroke={layer.color} strokeWidth={0.4} strokeOpacity={0.4} />
            ))}
            {/* Label line */}
            <line x1={barX + barW} y1={cy} x2={barX + barW + 12} y2={cy} stroke={layer.color} strokeWidth={0.8} />
            <text x={barX + barW + 16} y={cy} fontSize={8.5} fill="#94a3b8" dominantBaseline="middle">
              {layer.label.split("\n").map((t, k) => (
                <tspan key={k} x={barX + barW + 16} dy={k === 0 ? 0 : 10}>{t}</tspan>
              ))}
            </text>
          </g>
        );
        y += lh;
        return rect;
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LumonSystemDetails({ projectId }: { projectId?: string | number }) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(projectId ? `/project/${projectId}/concept` : "/dashboard")}
          className="gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to Concept Package
        </Button>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950">
          Design Coordination Reference Only
        </Badge>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Lumon System Details</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Cross-section profile references for the Lumon railing and sliding glazing system.
            These details are included for design coordination and 3D model accuracy only.
          </p>
        </div>

        {/* ── Technical Disclaimer ── */}
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={15} />
              Technical Note — Design Coordination Only
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <p>
              Lumon profile sections are included for design coordination only and are <strong>not construction or shop drawings</strong>.
              Final details require Lumon shop drawings, engineering review, landlord approval, field measurements, and permit confirmation.
            </p>
          </CardContent>
        </Card>

        {/* ── Profile Diagrams Grid ── */}
        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Info size={15} className="text-primary" />
            Lumon Aluminum Profile Cross-Sections
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-card border border-border rounded-xl p-6">
            <ProfileDiagram
              title="Top Cap / Large Rail"
              widthMm={160}
              heightMm={45}
              color="#6b7280"
              note="Phase 1 top cap — sits above lower glass infill"
            />
            <ProfileDiagram
              title="Lower Base Rail"
              widthMm={83}
              heightMm={32}
              color="#4b5563"
              note="Sits on slab/base wall — lower sill profile"
            />
            <ProfileDiagram
              title="Upper Sliding — Bottom Track"
              widthMm={101}
              heightMm={71}
              color="#3b82f6"
              note="Phase 2 bottom track — connects to top cap"
            />
            <ProfileDiagram
              title="Upper Sliding — Top Guide"
              widthMm={99}
              heightMm={60}
              color="#2563eb"
              note="Phase 2 top guide — anchors to pergola beam"
            />
          </div>
        </div>

        {/* ── Glass Thickness Options ── */}
        <div>
          <h2 className="text-base font-semibold mb-3">Glass Thickness Options</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { t: "6 mm", note: "Min. option — lower cost, suitable for sheltered locations", recommended: false },
              { t: "8 mm", note: "Mid-range — standard for commercial patio enclosures", recommended: true },
              { t: "10 mm", note: "Max. option — higher wind/impact resistance, heavier", recommended: false },
            ].map(({ t, note, recommended }) => (
              <Card key={t} className={`relative ${recommended ? "border-primary ring-1 ring-primary/30" : ""}`}>
                {recommended && (
                  <div className="absolute -top-2.5 left-3">
                    <Badge className="text-[10px] px-1.5 py-0">Shown in 3D Model</Badge>
                  </div>
                )}
                <CardContent className="pt-5 pb-3 space-y-1">
                  <p className="text-lg font-bold">{t}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── System Stack Diagram ── */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-semibold mb-3">System Relationship Diagram</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Vertical stack from slab to pergola beam — all layers shown to relative scale.
            </p>
            <div className="bg-card border border-border rounded-xl p-4">
              <SystemStackDiagram />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold">Layer-by-Layer Description</h2>
            <div className="space-y-2 text-sm">
              {[
                {
                  layer: "Concrete Slab / Base Wall",
                  desc: "Existing structural base. Lumon lower base rail anchors directly to this surface.",
                  color: "bg-gray-400",
                },
                {
                  layer: "Lower Base Rail (83 × 32 mm)",
                  desc: "Lumon lower sill profile. Anchors to slab, provides drainage channel and glass bottom support.",
                  color: "bg-gray-600",
                },
                {
                  layer: "Lower Glass Infill (frosted)",
                  desc: "Phase 1 fixed railing glass. Height = total railing height − base rail − top cap. Frosted for privacy at booth level.",
                  color: "bg-blue-200",
                },
                {
                  layer: "Top Cap / Large Rail (160 × 45 mm)",
                  desc: "Lumon top cap profile. Sits above lower glass infill. Provides structural cap and connection point for Phase 2 bottom track.",
                  color: "bg-gray-500",
                },
                {
                  layer: "Upper Bottom Track (101 × 71 mm)",
                  desc: "Phase 2 sliding glass bottom track. Clips onto top cap. Houses 5-rail sliding mechanism.",
                  color: "bg-blue-600",
                },
                {
                  layer: "Upper Sliding Glass (clear/tinted)",
                  desc: "Phase 2 5-rail sliding glazing. Slides horizontally to stack at both ends. Height fills gap to upper guide track.",
                  color: "bg-blue-300",
                },
                {
                  layer: "Upper Guide Track (99 × 60 mm)",
                  desc: "Phase 2 top guide. Anchors to the underside of the pergola beam at the post connection point.",
                  color: "bg-blue-700",
                },
                {
                  layer: "Pergola Beam",
                  desc: "Structural pergola beam at roof level. Upper guide track connects here — this is the Phase 2 anchor point.",
                  color: "bg-gray-800",
                },
              ].map(({ layer, desc, color }) => (
                <div key={layer} className="flex gap-3 items-start">
                  <div className={`w-3 h-3 rounded-sm mt-0.5 flex-shrink-0 ${color} opacity-70`} />
                  <div>
                    <p className="font-medium text-xs">{layer}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Callout 1: Rail/Top Cap Profile ── */}
        <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Info size={14} />
              Callout — Rail / Top Cap Profile Width
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            Lumon rail/top cap profile to be confirmed by final Lumon shop drawings.{" "}
            <strong>Meeting reference was 5¾″ / approx. 146 mm</strong>; Lumon detail drawings show profile widths up to{" "}
            <strong>160 mm</strong> depending on selected system configuration.
          </CardContent>
        </Card>

        {/* ── Callout 2: 5-Rail Sliding System ── */}
        <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Info size={14} />
              Callout — 5-Rail Lumon Sliding Glazing System
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            5-rail Lumon sliding glazing system shown for coordination. Final number of tracks, glass thickness, stacking direction,
            anchoring, drainage, and profile dimensions to be confirmed by Lumon.
          </CardContent>
        </Card>

        {/* ── 5-Rail Sliding System Details ── */}
        <div>
          <h2 className="text-base font-semibold mb-3">5-Rail Sliding System — Coordination Notes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Stacking Zones</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  The 5-rail system allows all upper glass panels to stack at one or both ends of the opening.
                  Stacking zones are shown in the 3D model as <span className="text-amber-600 font-medium">amber-highlighted areas</span> at each end of the upper glass span.
                </p>
                <p>
                  Stacking direction and zone width to be confirmed by Lumon based on panel count, glass weight, and track configuration.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Egress & Serving Station Conflicts</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Ensure egress doors and serving stations are positioned outside the stacking zones.
                  Stacked panels must not block required exit paths or service access points.
                </p>
                <p>
                  Coordinate stacking direction with booth layout, exit sign locations, and serving station positions before finalizing Lumon shop drawing submission.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Anchoring to Pergola Beam</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  The upper guide track (99 × 60 mm) anchors to the underside of the pergola beam at the post connection point.
                  This is the structural interface between the Lumon Phase 2 system and the Eagle Eye pergola.
                </p>
                <p>
                  Beam blocking, fastener pattern, and load transfer to be confirmed by structural engineer and Lumon.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Drainage</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Lower base rail includes a drainage channel. Drainage routing to slab drain or weep holes to be confirmed with Lumon and plumbing consultant.
                </p>
                <p>
                  Underground parking below slab requires waterproofing coordination — see open questions in Concept Package.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Open Items Checklist ── */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-primary" />
            Items to Confirm with Lumon
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              "Final top cap / large rail profile width (146 mm vs 160 mm)",
              "Number of sliding tracks in upper system (5-rail confirmed?)",
              "Glass thickness selection (6 mm / 8 mm / 10 mm)",
              "Stacking direction (left, right, or split to both ends)",
              "Stacking zone width and panel count per zone",
              "Upper guide track anchoring detail to pergola beam",
              "Lower base rail drainage routing and weep hole locations",
              "Anchoring to concrete slab — fastener pattern and embedment",
              "Side panel framing and corner connection details",
              "Egress door integration within Lumon system",
              "Permit and engineering submission requirements",
              "Lead time and installation sequence relative to pergola",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                <div className="w-3.5 h-3.5 rounded border border-muted-foreground/40 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Eagle Eye Pergola — Lumon System Details</p>
          <p>
            These drawings and dimensions are included for design coordination only and are not construction or shop drawings.
            Final details require Lumon shop drawings, engineering review, landlord approval, field measurements, and permit confirmation.
            All dimensions shown are from Lumon technical reference drawings and are subject to change based on final system selection.
          </p>
        </div>
      </div>
    </div>
  );
}
