import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { ChevronDown, ChevronUp, Download, FileText, Layers, Map, LayoutGrid, BarChart2, BookOpen, AlertTriangle, CheckSquare, Code2, ListChecks } from "lucide-react";

const PDF_URL = "/manus-storage/Milestones_Abbotsford_CAD_Handoff_Package_0ecf4aeb.pdf";

const IMAGES = {
  hero: "/manus-storage/01_hero_corner_40aea665.jpg",
  front: "/manus-storage/02_front_street_9271f8db.jpg",
  left: "/manus-storage/03_left_side_b49a328e.jpg",
  right: "/manus-storage/04_right_side_d0173764.jpg",
  overhead: "/manus-storage/05_overhead_cf0ba0d1.jpg",
  board: "/manus-storage/00_presentation_board_ec21326b.jpg",
};

// ─── Data ────────────────────────────────────────────────────────────────────

const DRAWING_INDEX = [
  { no: "C-00", title: "Cover / Index", description: "Project overview, drawing index, disclaimer" },
  { no: "GA-01", title: "General Arrangement Plan", description: "58′ span, 5 posts, railing zone, drain, platform" },
  { no: "EL-01", title: "Front Elevation", description: "Posts, Lumon infill zones, side doors, pergola" },
  { no: "EL-02", title: "Side Elevations", description: "Left and right side — depth, door, railing, pergola" },
  { no: "OH-01", title: "Overhead / Elevated View", description: "Louver pattern, posts, drain, reroute line" },
  { no: "PG-01", title: "Louvered Pergola Coordination", description: "Scope notes, open items, pergola interface" },
  { no: "LG-01", title: "Lumon Glass Infill Coordination", description: "Lumon reference dimensions, open items" },
  { no: "DR-01", title: "Drainage Coordination", description: "Existing drain, reroute concept, slope arrows" },
  { no: "RF-01", title: "ID101 Reference Plan", description: "Reference plan with REFERENCE ONLY stamp" },
  { no: "SM-01", title: "Site Measurement Checklist", description: "Checkbox fields for all field dimensions" },
  { no: "CAD-01", title: "DWG/DXF Drafting Instructions", description: "Layer list, CAD setup, drafter workflow" },
  { no: "OI-01", title: "Open Items / Field Verification", description: "Red-checkbox open items by category" },
];

const PROJECT_DATA = [
  { label: "Project", value: "Milestones Grill + Bar — Abbotsford" },
  { label: "Address", value: "3122 Mount Lehman Rd, Abbotsford, BC V2T 0C5" },
  { label: "Prepared by", value: "Ranaldo Daniels — Eagle Eye Management Services" },
  { label: "Date", value: "June 2026" },
  { label: "Patio Span", value: "58′-0″ (17,678 mm)" },
  { label: "Patio Depth", value: "15′-8″ (4,775 mm)" },
  { label: "Pergola Height", value: "~11′-0″ to underside of beam" },
  { label: "Front Posts", value: "5 × 6″×6″ existing aluminum" },
  { label: "Lumon System", value: "LGS 160mm railing + sliding glazing above" },
  { label: "Stacking Zones", value: "3′-0″ each end (6′ total)" },
  { label: "Side Doors", value: "2 × 36″ (approx.) — door by others" },
  { label: "Drainage", value: "Existing drain — reroute TBD" },
];

const LUMON_DIMS = [
  { item: "Overall Lumon system span (sides 5–8)", value: "18,438 mm = 60′-6″" },
  { item: "Bay width (each of 4 front bays)", value: "4,419 mm = 14′-6″" },
  { item: "Finished height (FH)", value: "2,750 mm = ~9′-0″" },
  { item: "Glass zone height (each of 2 zones)", value: "1,375 mm = 4′-6″" },
  { item: "Glass thickness", value: "8mm clear tempered safety glass" },
  { item: "Handrail profile", value: "160mm" },
  { item: "Side posts (O/C sides 5–8)", value: "70×70mm aluminum" },
  { item: "Front posts", value: "6″×6″ existing aluminum" },
  { item: "Lower anchor", value: "7.5×75 Multimonti concrete screw, min 45mm embedment" },
];

const OPEN_ITEMS = [
  { category: "Structural", items: ["Confirm existing post embedment depth and footing size", "Verify lateral load transfer to building — Lumon requires min 2 plies 2×6 blocking or 4″ thick concrete/steel bracket", "Structural engineer sign-off on Lumon shop drawings (BCBC 2018)"] },
  { category: "Drainage", items: ["Confirm existing drain location and invert elevation", "Design drain reroute path — coordinate with civil/plumbing", "Confirm new drain location does not conflict with Lumon post anchors"] },
  { category: "Pergola Interface", items: ["Confirm pergola beam height and connection detail at building wall", "Confirm louver system supplier and beam profile for Lumon upper connection", "Confirm LGR upper connection fastener schedule with pergola supplier"] },
  { category: "Dimensions", items: ["Field verify overall patio span (nominal 58′-0″)", "Field verify depth at each end (nominal 15′-8″)", "Field verify post spacing and existing post locations", "Confirm side door rough opening widths"] },
  { category: "Permits", items: ["Building permit application — structural drawings required", "Confirm AHJ requirements for Lumon glazing system", "Confirm occupancy load and egress requirements with AHJ"] },
];

const CAD_LAYERS = [
  { no: "A-GRID", color: "Red", lw: "0.18", description: "Column grid lines and bubbles" },
  { no: "A-WALL", color: "White", lw: "0.50", description: "Existing building walls" },
  { no: "A-SLAB", color: "Gray", lw: "0.35", description: "Concrete slab outline" },
  { no: "A-POST-EX", color: "Cyan", lw: "0.50", description: "Existing 6″×6″ aluminum front posts" },
  { no: "A-POST-LG", color: "Yellow", lw: "0.35", description: "Lumon 70×70mm posts" },
  { no: "A-RAILING", color: "Magenta", lw: "0.25", description: "160mm Lumon railing profile" },
  { no: "A-GLASS-SL", color: "Cyan", lw: "0.18", description: "Sliding glazing panels" },
  { no: "A-GLASS-FX", color: "Blue", lw: "0.18", description: "Fixed glazing panels" },
  { no: "A-PERGOLA", color: "Yellow", lw: "0.35", description: "Louvered pergola structure" },
  { no: "A-BEAM", color: "White", lw: "0.50", description: "Structural beams" },
  { no: "A-LOUVER", color: "Gray", lw: "0.18", description: "Louver slats (overhead plan)" },
  { no: "A-DOOR", color: "Green", lw: "0.35", description: "Door openings and swings" },
  { no: "A-DRAIN", color: "Cyan", lw: "0.25", description: "Existing drain location" },
  { no: "A-DRAIN-NEW", color: "Green", lw: "0.25", description: "Proposed drain reroute (dashed)" },
  { no: "A-SLOPE", color: "Gray", lw: "0.18", description: "Slope direction arrows" },
  { no: "A-FURNITURE", color: "Gray", lw: "0.13", description: "Booth and table layout (reference)" },
  { no: "A-DIM", color: "Yellow", lw: "0.18", description: "Dimension strings" },
  { no: "A-TEXT", color: "White", lw: "0.18", description: "General text and labels" },
  { no: "A-KEYNOTE", color: "Yellow", lw: "0.18", description: "Keynote bubbles" },
  { no: "A-HATCH", color: "Gray", lw: "0.13", description: "Hatching (not-in-scope areas)" },
  { no: "A-SECTION", color: "Red", lw: "0.35", description: "Section cut lines and arrows" },
  { no: "A-DETAIL", color: "Magenta", lw: "0.25", description: "Detail reference bubbles" },
  { no: "A-TITLEBLOCK", color: "White", lw: "0.35", description: "Title block and border" },
  { no: "A-NORTHARROW", color: "White", lw: "0.25", description: "North arrow" },
  { no: "A-SCALEBAR", color: "White", lw: "0.25", description: "Scale bar" },
];

const SITE_MEASUREMENT_ITEMS = [
  { group: "Overall Dimensions", checks: ["Overall patio span (wall to wall)", "Patio depth — left end", "Patio depth — right end", "Patio depth — centre"] },
  { group: "Post Locations", checks: ["Post 1 (left end) — distance from left wall", "Post 2 — distance from Post 1", "Post 3 — distance from Post 2", "Post 4 — distance from Post 3", "Post 5 (right end) — distance from Post 4", "Post diameter / section size", "Post base condition (embedded / surface-mounted)"] },
  { group: "Doors & Openings", checks: ["Left side door rough opening width", "Left side door rough opening height", "Right side door rough opening width", "Right side door rough opening height"] },
  { group: "Railing & Glass", checks: ["Railing height (top of rail to slab)", "Glass zone height (lower panel)", "Glass zone height (upper panel)", "Stacking zone width — left end", "Stacking zone width — right end"] },
  { group: "Pergola", checks: ["Pergola beam height (underside to slab)", "Beam depth (vertical)", "Beam width (horizontal)", "Louver slat spacing (centre-to-centre)"] },
  { group: "Drainage", checks: ["Existing drain location (distance from left wall)", "Existing drain location (distance from building face)", "Drain invert elevation", "Proposed reroute path length"] },
  { group: "Building Interface", checks: ["Building wall thickness at patio connection", "Existing cladding / sheathing type", "Soffit height above patio", "Any overhead obstructions (ducts, pipes, signs)"] },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ id, icon: Icon, sheetNo, title, children, defaultOpen = false }: {
  id: string; icon: LucideIcon; sheetNo: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-amber-50 transition-colors text-left group"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded bg-[#111] flex-shrink-0">
          <Icon size={15} className="text-[#C9A84C]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-[#A07830] uppercase">{sheetNo}</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="text-gray-400 group-hover:text-[#C9A84C] transition-colors flex-shrink-0">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#111]">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-[#C9A84C] font-semibold text-xs tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700 text-xs align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set<number>());
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <label key={i} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => setChecked(prev => {
              const next = new Set(prev);
              next.has(i) ? next.delete(i) : next.add(i);
              return next;
            })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#C9A84C] flex-shrink-0"
          />
          <span className={`text-xs leading-relaxed transition-colors ${checked.has(i) ? "line-through text-gray-400" : "text-gray-700 group-hover:text-gray-900"}`}>
            {item}
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CadHandoff() {
  return (
    <EagleEyeLayout title="CAD Handoff Package — Milestones Abbotsford">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: 260 }}>
          <img src={IMAGES.hero} alt="Milestones Abbotsford Patio" className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase mb-1">Eagle Eye Management Services</div>
                <h1 className="text-white text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  CAD Handoff Preparation Package
                </h1>
                <p className="text-gray-300 text-sm mt-1">Milestones Grill + Bar — 3122 Mount Lehman Rd, Abbotsford, BC</p>
              </div>
              <a
                href={PDF_URL}
                download="Milestones_Abbotsford_CAD_Handoff_Package.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex-shrink-0"
                style={{ backgroundColor: "#C9A84C", color: "#111" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#E8C96A")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#C9A84C")}
              >
                <Download size={15} />
                Download PDF
              </a>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">
            <strong>Concept Only — Not For Construction.</strong> This package is prepared by Eagle Eye Management Services for design intent, client presentation, and Lumon Glass coordination only. All dimensions to be field verified. Final structural drawings, Lumon shop drawings, permits, and engineering sign-off are required before construction.
          </p>
        </div>

        {/* ── C-00: Cover / Index ── */}
        <Section id="C-00" icon={FileText} sheetNo="C-00" title="Cover / Index" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Project Information</h3>
              <Table
                headers={["Field", "Value"]}
                rows={PROJECT_DATA.map(d => [d.label, d.value])}
              />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Drawing Index</h3>
              <Table
                headers={["Sheet No.", "Title"]}
                rows={DRAWING_INDEX.map(d => [
                  <span key={d.no} className="font-mono font-bold text-[#A07830]">{d.no}</span>,
                  <span key={d.title}><span className="font-medium text-gray-900">{d.title}</span><br /><span className="text-gray-400">{d.description}</span></span>
                ])}
              />
            </div>
          </div>
        </Section>

        {/* ── GA-01: General Arrangement Plan ── */}
        <Section id="GA-01" icon={LayoutGrid} sheetNo="GA-01" title="General Arrangement Plan">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The general arrangement plan shows the full 58′-0″ patio span viewed from above. Five existing 6″×6″ aluminum front posts define the structural grid. The Lumon railing system runs along the inside (building) face. A 3′-0″ stacking zone is reserved at each end for glass panel retraction. The concrete slab platform and existing drain location are shown for coordination.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Overall Span", value: "58′-0″" },
                { label: "Depth", value: "15′-8″" },
                { label: "Front Posts", value: "5 posts" },
                { label: "Stacking Zones", value: "3′-0″ × 2" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#A07830]">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <img src={IMAGES.overhead} alt="Overhead plan view" className="w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 320 }} />
          </div>
        </Section>

        {/* ── EL-01: Front Elevation ── */}
        <Section id="EL-01" icon={Layers} sheetNo="EL-01" title="Front Elevation">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The front (street-facing) elevation shows the full 58′ span with all five posts, the Lumon railing system on the inside face, the louvered pergola above, and the two side door openings at each end. Lumon infill zones are shown between posts. The stacking zones at each end are marked as clear of glass panels when fully open.
            </p>
            <img src={IMAGES.front} alt="Front street elevation" className="w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 320 }} />
          </div>
        </Section>

        {/* ── EL-02: Side Elevations ── */}
        <Section id="EL-02" icon={Layers} sheetNo="EL-02" title="Side Elevations">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Left and right side elevations show the 15′-8″ depth of the patio, the side door opening (approx. 36″ wide, door by others), the Lumon railing on the inside face, and the pergola structure overhead. The building wall connection is shown at the back face.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Left Side</div>
                <img src={IMAGES.left} alt="Left side elevation" className="w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 240 }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Right Side</div>
                <img src={IMAGES.right} alt="Right side elevation" className="w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 240 }} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── OH-01: Overhead View ── */}
        <Section id="OH-01" icon={Map} sheetNo="OH-01" title="Overhead / Elevated View">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The elevated overhead view shows the louvered pergola slat pattern, post grid, drain location, and proposed drain reroute path (dashed). The Lumon system boundary is shown on the inside face. Booth footprint is shown for spatial reference only.
            </p>
            <img src={IMAGES.overhead} alt="Overhead view" className="w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 320 }} />
          </div>
        </Section>

        {/* ── PG-01: Pergola Coordination ── */}
        <Section id="PG-01" icon={BookOpen} sheetNo="PG-01" title="Louvered Pergola Coordination">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The pergola is supplied and installed by others (patio shell contractor). Eagle Eye coordinates the interface between the pergola structure and the Lumon glazing system. The following items must be confirmed with the pergola supplier before Lumon shop drawings are finalized.
            </p>
            <Table
              headers={["Item", "Status", "Action Required"]}
              rows={[
                ["Pergola beam height (underside)", "TBD — field verify", "Confirm with pergola supplier"],
                ["Beam profile and depth", "TBD — shop drawings pending", "Obtain pergola shop drawings"],
                ["LGR upper connection fastener schedule", "TBD", "Coordinate with Lumon and pergola supplier"],
                ["Louver slat spacing", "TBD — field verify", "Confirm for overhead plan accuracy"],
                ["Pergola finish colour", "Dark charcoal (assumed)", "Confirm with client"],
                ["Pergola structural engineer", "TBD", "Confirm sign-off scope"],
              ]}
            />
          </div>
        </Section>

        {/* ── LG-01: Lumon Glass Coordination ── */}
        <Section id="LG-01" icon={Layers} sheetNo="LG-01" title="Lumon Glass Infill Coordination">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The Lumon LGS (Lumon Glazing System) uses a 160mm railing profile with 8mm clear tempered safety glass in two equal zones of 1,375mm each. The system is top-hung with a bottom guide. The following dimensions are taken from Lumon shop drawings (Project 50929123, issued 12/05/2026).
            </p>
            <Table
              headers={["Item", "Lumon Drawing Value"]}
              rows={LUMON_DIMS.map(d => [d.item, <span key={d.value} className="font-mono text-[#A07830] font-semibold">{d.value}</span>])}
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-bold text-blue-800 mb-1">Lumon Shop Drawing Reference</div>
              <p className="text-xs text-blue-700 leading-relaxed">
                Project 50929123 — Milestones, 3122 Mount Lehman Rd, Abbotsford, BC V2T 0C5. Issued for drawing: 12/05/2026. Drawn by P.P., checked by G.A. Lumon Canada, 20339 96 Ave Unit 180, Langley BC V1M 0E4. These drawings are for structural sign-off of Lumon systems and Lumon connections only. All other details are for reference only and are designed, installed, reviewed, and applied by others.
              </p>
            </div>
          </div>
        </Section>

        {/* ── DR-01: Drainage ── */}
        <Section id="DR-01" icon={Map} sheetNo="DR-01" title="Drainage Coordination">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The existing drain is located approximately at the centre of the patio slab. The proposed reroute moves the drain to a location that does not conflict with the Lumon post anchor grid. Slope direction arrows indicate the intended drainage fall. All drainage work is by others — coordinate with the civil/plumbing contractor.
            </p>
            <Table
              headers={["Item", "Status", "Note"]}
              rows={[
                ["Existing drain location", "Approx. centre of slab", "Field verify exact location"],
                ["Drain invert elevation", "TBD — field verify", "Required for reroute design"],
                ["Proposed reroute path", "Concept only", "Coordinate with plumbing contractor"],
                ["Conflict with Lumon posts", "TBD", "Verify reroute clears all post anchors"],
                ["Slab slope direction", "Toward drain", "Confirm with slab contractor"],
              ]}
            />
          </div>
        </Section>

        {/* ── RF-01: Reference Plan ── */}
        <Section id="RF-01" icon={FileText} sheetNo="RF-01" title="ID101 Reference Plan">
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex gap-2 items-start">
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed font-medium">REFERENCE ONLY — DO NOT SCALE. This plan is reproduced from the client-supplied ID101 drawing for spatial context. It has not been independently verified. All dimensions must be field verified.</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              The ID101 reference plan shows the interior layout including booth positions, service stations, and the patio boundary. It is used to verify the Lumon system boundary, stacking zone clearances, and serving station marker positions. The plan is not to be used for construction or permitting.
            </p>
          </div>
        </Section>

        {/* ── SM-01: Site Measurement Checklist ── */}
        <Section id="SM-01" icon={CheckSquare} sheetNo="SM-01" title="Site Measurement Checklist">
          <div className="space-y-5">
            <p className="text-xs text-gray-600 leading-relaxed">
              Use this checklist during the site visit to capture all dimensions required for CAD drafting and Lumon shop drawing coordination. Check each item as it is measured and recorded.
            </p>
            {SITE_MEASUREMENT_ITEMS.map(group => (
              <div key={group.group}>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">{group.group}</h3>
                <Checklist items={group.checks} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── CAD-01: Drafting Instructions ── */}
        <Section id="CAD-01" icon={Code2} sheetNo="CAD-01" title="DWG/DXF Drafting Instructions">
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">CAD Setup</h3>
              <Table
                headers={["Setting", "Value"]}
                rows={[
                  ["Units", "Millimetres (mm) — primary; feet/inches as alternate annotation"],
                  ["Scale", "1:50 for plans and elevations; 1:10 for details"],
                  ["Paper size", "A1 (841×594mm) landscape for plans; A3 for details"],
                  ["Title block", "Eagle Eye standard — project name, address, sheet no., date, drawn by, checked by, scale, revision table"],
                  ["North arrow", "Required on site plan and plan views"],
                  ["Scale bar", "Required on all sheets"],
                  ["Revision table", "Min 3 revision rows — A.00, B.00, C.00"],
                ]}
              />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Layer List (25 Layers)</h3>
              <Table
                headers={["Layer", "Colour", "Lineweight", "Description"]}
                rows={CAD_LAYERS.map(l => [
                  <span key={l.no} className="font-mono text-[#A07830] font-bold text-[11px]">{l.no}</span>,
                  l.color, l.lw, l.description
                ])}
              />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">8-Step Drafter Workflow</h3>
              <ol className="space-y-2">
                {[
                  "Set up drawing template with title block, layers, and units as specified above.",
                  "Import or redraw the site plan boundary from the ID101 reference plan (REFERENCE ONLY — do not scale).",
                  "Draw the patio slab outline using field-verified dimensions. Add existing posts at verified spacings.",
                  "Draw the Lumon system boundary on the inside face. Add 70×70mm posts at bay spacings from Lumon shop drawings.",
                  "Draw the railing profile (160mm) and glass zones (2 × 1375mm) as per Lumon shop drawings.",
                  "Add dimension strings on all sheets: overall, bay widths, post spacings, heights, door openings.",
                  "Add keynote bubbles referencing the member legend. Add north arrow, scale bar, and section cut lines.",
                  "Complete title block on all sheets. Add revision A.00. Export to DWG and PDF. Send to Eagle Eye for review.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs text-gray-700 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#111] text-[#C9A84C] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* ── OI-01: Open Items ── */}
        <Section id="OI-01" icon={ListChecks} sheetNo="OI-01" title="Open Items / Field Verification">
          <div className="space-y-5">
            <p className="text-xs text-gray-600 leading-relaxed">
              The following items must be resolved before CAD drafting can be completed and Lumon shop drawings can be finalized. Items are grouped by discipline. Check each item as it is resolved.
            </p>
            {OPEN_ITEMS.map(group => (
              <div key={group.category}>
                <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2 border-b border-red-100 pb-1">{group.category}</h3>
                <Checklist items={group.items} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Presentation Board ── */}
        <Section id="board" icon={BarChart2} sheetNo="BOARD" title="Presentation Board — All 5 Views">
          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Combined A1 presentation board showing all five photorealistic rendering views for client presentation and Lumon coordination.
            </p>
            <img src={IMAGES.board} alt="Presentation board" className="w-full rounded-lg border border-gray-200" />
          </div>
        </Section>

        {/* ── Footer download ── */}
        <div className="flex justify-center pb-4">
          <a
            href={PDF_URL}
            download="Milestones_Abbotsford_CAD_Handoff_Package.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
            style={{ backgroundColor: "#111", color: "#C9A84C", border: "1px solid #C9A84C" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1A1A1A"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#111"; }}
          >
            <Download size={16} />
            Download Full PDF Package (12 Sheets)
          </a>
        </div>

      </div>
    </EagleEyeLayout>
  );
}
