import { useRef, useState, useCallback, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
  Html,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Sun, Moon, Sliders } from "lucide-react";
import { toast } from "sonner";
import { exportSceneAsGLB } from "@/lib/exportGLB";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PergolaModel3DParams {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  postCount: number;
  postSizeIn: number;
  beamSizeIn: number;
  louverSpacingIn: number;
  louverSizeIn: number;
  hasGlass: boolean;
  glassWallHeightFt?: number;
  railWidthIn?: number;
  showUpperGlass?: boolean;       // Phase 2 upper sliding glass (height is derived: H - lowerGlassH - midRail)
  showBooths?: boolean;           // Show 6 U-shaped booths
  boothPlatformHeightIn?: number; // Booth platform height (default 8")
  finishColor: string;
}

export type GlassTint = "clear" | "bronze" | "grey" | "blue" | "green";
export type GlassMaterial = "standard" | "frosted" | "reflective";

interface GlassTintOption {
  value: GlassTint;
  label: string;
  color: string;
  opacity: number;
}
interface GlassMaterialOption {
  value: GlassMaterial;
  label: string;
  roughness: number;
  metalness: number;
  opacity: number;
}

const GLASS_TINTS: GlassTintOption[] = [
  { value: "clear",   label: "Clear",   color: "#c8e8f8", opacity: 0.20 },
  { value: "bronze",  label: "Bronze",  color: "#b8864e", opacity: 0.30 },
  { value: "grey",    label: "Grey",    color: "#8a8a8a", opacity: 0.28 },
  { value: "blue",    label: "Blue",    color: "#4a90d9", opacity: 0.28 },
  { value: "green",   label: "Green",   color: "#4aaa6a", opacity: 0.28 },
];

const GLASS_MATERIALS: GlassMaterialOption[] = [
  { value: "standard",   label: "Standard",   roughness: 0.05, metalness: 0.0,  opacity: 1.0 },
  { value: "frosted",    label: "Frosted",    roughness: 0.65, metalness: 0.0,  opacity: 1.2 },
  { value: "reflective", label: "Reflective", roughness: 0.02, metalness: 0.35, opacity: 0.85 },
];

// ─── Unit conversion ──────────────────────────────────────────────────────────
const FT = 0.3048;
const ft  = (v: number) => v * FT;
const inch = (v: number) => (v / 12) * FT;

// ─── Loading overlay ──────────────────────────────────────────────────────────
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-xs font-mono bg-black/60 px-3 py-1.5 rounded-full">
        Loading… {Math.round(progress)}%
      </div>
    </Html>
  );
}

// ─── Aluminum box ─────────────────────────────────────────────────────────────
function AlumBox({ position, size, color }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

// ─── Glass panel ─────────────────────────────────────────────────────────────
function GlassPanel({ position, size, tintOption, materialOption }: {
  position: [number, number, number];
  size: [number, number, number];
  tintOption: GlassTintOption;
  materialOption: GlassMaterialOption;
}) {
  const finalOpacity = Math.min(tintOption.opacity * materialOption.opacity, 0.85);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial
        color={tintOption.color}
        transparent
        opacity={finalOpacity}
        roughness={materialOption.roughness}
        metalness={materialOption.metalness}
        side={THREE.DoubleSide}
        envMapIntensity={materialOption.value === "reflective" ? 1.8 : 0.4}
      />
    </mesh>
  );
}

// ─── U-shaped booth ───────────────────────────────────────────────────────────
function UBooth({ cx, cz, platformY, color }: {
  cx: number; cz: number; platformY: number; color: string;
}) {
  const boothW  = ft(5.5);   // booth width
  const boothD  = ft(3.5);   // booth depth (front to back)
  const backH   = ft(3.5);   // seat back height
  const seatH   = ft(1.5);   // seat height
  const thick   = ft(0.5);   // wall thickness
  const seatD   = ft(1.2);   // seat depth
  const baseY   = platformY;

  return (
    <group position={[cx, baseY, cz]}>
      {/* Platform */}
      <mesh receiveShadow>
        <boxGeometry args={[boothW + thick * 2, inch(8), boothD + thick * 2]} />
        <meshStandardMaterial color="#c8c0b0" roughness={0.8} />
      </mesh>
      {/* Back wall (facing street/glass) */}
      <AlumBox
        position={[0, seatH + backH / 2, boothD / 2 - thick / 2]}
        size={[boothW, backH, thick]}
        color={color}
      />
      {/* Left side wall */}
      <AlumBox
        position={[-boothW / 2 + thick / 2, seatH + backH / 2, 0]}
        size={[thick, backH, boothD]}
        color={color}
      />
      {/* Right side wall */}
      <AlumBox
        position={[boothW / 2 - thick / 2, seatH + backH / 2, 0]}
        size={[thick, backH, boothD]}
        color={color}
      />
      {/* Seat — left */}
      <mesh position={[-boothW / 2 + thick + seatD / 2, seatH / 2, 0]} castShadow>
        <boxGeometry args={[seatD, seatH, boothD - thick]} />
        <meshStandardMaterial color="#8a7060" roughness={0.7} />
      </mesh>
      {/* Seat — right */}
      <mesh position={[boothW / 2 - thick - seatD / 2, seatH / 2, 0]} castShadow>
        <boxGeometry args={[seatD, seatH, boothD - thick]} />
        <meshStandardMaterial color="#8a7060" roughness={0.7} />
      </mesh>
      {/* Seat — back (along back wall) */}
      <mesh position={[0, seatH / 2, boothD / 2 - thick - seatD / 2]} castShadow>
        <boxGeometry args={[boothW - thick * 2, seatH, seatD]} />
        <meshStandardMaterial color="#8a7060" roughness={0.7} />
      </mesh>
      {/* Table */}
      <mesh position={[0, seatH + ft(1.2), 0]} castShadow>
        <boxGeometry args={[boothW * 0.6, inch(3), boothD * 0.55]} />
        <meshStandardMaterial color="#d4c9a8" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Pergola + Lumon scene ────────────────────────────────────────────────────
function PergolaScene({
  params,
  glassTint,
  glassMaterial,
  groupRef,
}: {
  params: PergolaModel3DParams;
  glassTint: GlassTint;
  glassMaterial: GlassMaterial;
  groupRef: React.RefObject<THREE.Group | null>;
}) {
  const {
    widthFt, depthFt, heightFt, postCount,
    postSizeIn, beamSizeIn, louverSpacingIn, louverSizeIn,
    hasGlass, glassWallHeightFt, railWidthIn,
    showUpperGlass,
    showBooths, boothPlatformHeightIn,
    finishColor,
  } = params;

  const W = ft(widthFt);
  const D = ft(depthFt);
  const H = ft(heightFt);           // pergola beam bottom / post top
  const postS  = inch(postSizeIn);
  const beamH  = inch(beamSizeIn);
  const beamW  = inch(Math.max(beamSizeIn, 4));
  const louverSpacing = inch(Math.max(louverSpacingIn, 1));
  const louverW = inch(louverSizeIn);
  const louverThick = inch(1.5);
  const roofY = H + beamH + louverThick / 2;
  const n = Math.max(postCount, 2);

  const tintOption     = GLASS_TINTS.find(t => t.value === glassTint)     ?? GLASS_TINTS[0];
  const materialOption = GLASS_MATERIALS.find(m => m.value === glassMaterial) ?? GLASS_MATERIALS[0];

  // Frosted tint for lower railing glass (privacy)
  const frostedTint: GlassTintOption = { value: "grey", label: "Frosted", color: "#c0c0c0", opacity: 0.70 };
  const frostedMat: GlassMaterialOption = { value: "frosted", label: "Frosted", roughness: 0.65, metalness: 0.0, opacity: 1.2 };

  // ── Lumon profile dimensions (from technical section drawings, mm → ft) ──────
  // Top cap / large rail: 160mm wide × 45mm high
  const topCapW   = 160 / 304.8;   // 0.5249 ft = 6.30"
  const topCapH   = 45  / 304.8;   // 0.1476 ft = 1.77"
  // Lower sill/base rail: 83mm wide × 32mm high
  const lowerRailW = 83 / 304.8;   // 0.2723 ft = 3.27"
  const lowerRailH = 32 / 304.8;   // 0.1050 ft = 1.26"
  // Upper sliding glass — bottom track: 101mm wide × 71mm high
  const upperBotTrackW = 101 / 304.8;  // 0.3314 ft = 3.98"
  const upperBotTrackH = 71  / 304.8;  // 0.2329 ft = 2.80"
  // Upper sliding glass — top guide track: 99mm wide × 60mm high
  const upperTopTrackW = 99 / 304.8;   // 0.3248 ft = 3.90"
  const upperTopTrackH = 60 / 304.8;   // 0.1969 ft = 2.36"
  // Glass thickness: 8mm (mid-range)
  const glassThick = 8 / 304.8;        // 0.0262 ft = 0.31"
  // Profile depth (front-to-back) — realistic extrusion depth ~3"
  const profileDepth = inch(3);         // visible depth for all rail/track profiles

  // ── Structural dimensions ──────────────────────────────────────────────────
  // Lower railing glass (Lumon Phase 1)
  const GH = ft(glassWallHeightFt ?? 4.333);  // total lower assembly height (52" default)
  // Stack from slab: lower base rail → glass infill → top cap
  const sillH    = lowerRailH;               // lower base rail sits on slab (83mm × 32mm)
  const sillThick = lowerRailW + profileDepth; // full profile depth
  const topCapHgt = topCapH;                 // top cap height (45mm)
  const topCapDepth = topCapW;               // top cap width used as depth (160mm)
  // Glass infill height = total railing height minus lower rail and top cap
  const lowerGlassInfillH = Math.max(GH - sillH - topCapHgt, 0.01);

  // Mid-rail connector = upper bottom track (sits on top of top cap, connects Phase 1 to Phase 2)
  const midRailH = upperBotTrackH;           // 71mm = 2.80"

  // Phase 2 upper sliding glass: spans from mid-rail up to pergola beam (H)
  // Height is DERIVED — fills the full gap between bottom track top and upper guide track bottom
  const upperGlassBottom = GH + midRailH;    // where upper glass starts (above bottom track)
  const upperGH = Math.max(H - upperGlassBottom - upperTopTrackH, 0.01);
  const upperGlassTop = upperGlassBottom + upperGH;

  const platformH = inch(boothPlatformHeightIn ?? 8);

  // Post X positions (front row only — Lumon style, no back posts visible)
  const postXs = useMemo(() => {
    return Array.from({ length: n }, (_, i) => -W / 2 + (i / (n - 1)) * W);
  }, [n, W]);

  // Louver Z positions
  const louverZs = useMemo(() => {
    const count = Math.max(Math.floor(D / louverSpacing), 1);
    return Array.from({ length: count + 1 }, (_, i) => -D / 2 + i * louverSpacing);
  }, [D, louverSpacing]);

  // Booth positions: 6 booths evenly spaced along the width
  const boothPositions = useMemo(() => {
    const count = 6;
    const spacing = W / count;
    return Array.from({ length: count }, (_, i) => -W / 2 + spacing * (i + 0.5));
  }, [W]);

  const glassZ = D / 2;  // front glass face Z position

  return (
    <group ref={groupRef}>

      {/* ── Pergola roof structure ── */}
      {/* Front beam */}
      <AlumBox position={[0, H + beamH / 2, glassZ]} size={[W, beamH, beamW]} color={finishColor} />
      {/* Back beam */}
      <AlumBox position={[0, H + beamH / 2, -D / 2]} size={[W, beamH, beamW]} color={finishColor} />
      {/* Side purlins */}
      {postXs.map((x, i) => (
        <AlumBox key={`sp${i}`} position={[x, H + beamH / 2, 0]} size={[beamW, beamH, D]} color={finishColor} />
      ))}
      {/* Louver slats */}
      {louverZs.map((z, i) => (
        <AlumBox key={`ls${i}`} position={[0, roofY, z]} size={[W, louverThick, louverW]} color={finishColor} />
      ))}

      {/* ── Front posts (full height, front face only) ── */}
      {postXs.map((x, i) => (
        <AlumBox key={`pf${i}`} position={[x, H / 2, glassZ]} size={[postS, H, postS]} color={finishColor} />
      ))}
      {/* Back posts */}
      {postXs.map((x, i) => (
        <AlumBox key={`pb${i}`} position={[x, H / 2, -D / 2]} size={[postS, H, postS]} color={finishColor} />
      ))}

      {/* ── Lumon glass system ── */}
      {hasGlass && (
        <>
          {/* ── Lower base rail (83mm × 32mm — sits on slab, Lumon lower sill profile) ── */}
          <AlumBox
            position={[0, sillH / 2, glassZ + sillThick / 2]}
            size={[W, sillH, sillThick]}
            color={finishColor}
          />

          {/* ── Lower railing glass infill (Phase 1 — frosted privacy glass) ── */}
          {/* Fills from base rail top up to top cap bottom */}
          <GlassPanel
            position={[0, sillH + lowerGlassInfillH / 2, glassZ]}
            size={[W, lowerGlassInfillH, glassThick]}
            tintOption={materialOption.value === "frosted" ? frostedTint : tintOption}
            materialOption={materialOption.value === "frosted" ? frostedMat : materialOption}
          />

          {/* ── Top cap / large rail (160mm × 45mm — Lumon top cap profile) ── */}
          {/* Sits on top of lower glass infill, connects to upper bottom track */}
          <AlumBox
            position={[0, GH - topCapHgt / 2, glassZ + topCapDepth / 2]}
            size={[W, topCapHgt, topCapDepth]}
            color={finishColor}
          />

          {/* ── Upper bottom track (101mm × 71mm — connects Phase 1 top cap to Phase 2 upper glass) ── */}
          {/* This is the mid-rail connector: sits on top of the top cap */}
          <AlumBox
            position={[0, GH + midRailH / 2, glassZ + upperBotTrackW / 2]}
            size={[W, midRailH, upperBotTrackW]}
            color="#2a2a2a"
          />

          {/* ── Phase 2: Upper sliding glass ── */}
          {/* Spans from mid-rail up to the pergola beam / post connection at roof level (H) */}
          {showUpperGlass && (
            <>
              {/* Upper glass infill — clear/tinted, slides horizontally */}
              <GlassPanel
                position={[0, upperGlassBottom + upperGH / 2, glassZ]}
                size={[W, upperGH, 0.012]}
                tintOption={tintOption}
                materialOption={materialOption}
              />
              {/* Upper top guide track (99mm × 60mm) — connects directly to the pergola beam bottom at H */}
              <AlumBox
                position={[0, upperGlassTop + upperTopTrackH / 2, glassZ + upperTopTrackW / 2]}
                size={[W, upperTopTrackH, upperTopTrackW]}
                color={finishColor}
              />
              {/* Vertical mullion dividers — sliding panel lines between posts */}
              {postXs.map((x, i) => (
                <AlumBox
                  key={`um${i}`}
                  position={[x, upperGlassBottom + upperGH / 2, glassZ + 0.015]}
                  size={[inch(1.5), upperGH, inch(1.5)]}
                  color={finishColor}
                />
              ))}
              {/* Sliding panel overlap lines (visual cue for sliding glass) */}
              {postXs.slice(0, -1).map((x, i) => {
                const nextX = postXs[i + 1];
                const midX = (x + nextX) / 2;
                return (
                  <AlumBox
                    key={`sl${i}`}
                    position={[midX, upperGlassBottom + upperGH / 2, glassZ + 0.018]}
                    size={[inch(1.0), upperGH * 0.9, inch(0.5)]}
                    color={finishColor}
                  />
                );
              })}

              {/* ── Stacking zones (hatched amber panels at both ends) ── */}
              {/* Left stacking zone: panels slide to the left end */}
              <mesh
                position={[-W / 2 + ft(3) / 2, upperGlassBottom + upperGH / 2, glassZ + 0.022]}
              >
                <boxGeometry args={[ft(3), upperGH, inch(0.3)]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={0.25} />
              </mesh>
              {/* Right stacking zone: panels slide to the right end */}
              <mesh
                position={[W / 2 - ft(3) / 2, upperGlassBottom + upperGH / 2, glassZ + 0.022]}
              >
                <boxGeometry args={[ft(3), upperGH, inch(0.3)]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={0.25} />
              </mesh>
            </>
          )}

          {/* ── Side panels — left end (lower glass height only) ── */}
          <GlassPanel
            position={[-W / 2 - ft(1.5) / 2, GH / 2, 0]}
            size={[ft(1.5), GH, 0.012]}
            tintOption={tintOption}
            materialOption={materialOption}
          />
          {/* Side panel frame post — left (full height to beam) */}
          <AlumBox position={[-W / 2 - ft(1.5) - postS / 2, H / 2, 0]} size={[postS, H, postS]} color={finishColor} />

          {/* ── Side panels — right end (lower glass height only) ── */}
          <GlassPanel
            position={[W / 2 + ft(1.5) / 2, GH / 2, 0]}
            size={[ft(1.5), GH, 0.012]}
            tintOption={tintOption}
            materialOption={materialOption}
          />
          {/* Side panel frame post — right (full height to beam) */}
          <AlumBox position={[W / 2 + ft(1.5) + postS / 2, H / 2, 0]} size={[postS, H, postS]} color={finishColor} />
        </>
      )}

      {/* ── Booths ── */}
      {showBooths && boothPositions.map((bx, i) => (
        <UBooth
          key={`booth${i}`}
          cx={bx}
          cz={glassZ - ft(4.5)}
          platformY={platformH}
          color="#5a5a5a"
        />
      ))}

      {/* ── Concrete slab ── */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[W + ft(4), 0.04, D + ft(2)]} />
        <meshStandardMaterial color="#d0ccc8" roughness={0.9} metalness={0.0} />
      </mesh>

    </group>
  );
}

// ─── Scene wrapper with camera ────────────────────────────────────────────────
function SceneContent({
  params,
  glassTint,
  glassMaterial,
  groupRef,
}: {
  params: PergolaModel3DParams;
  glassTint: GlassTint;
  glassMaterial: GlassMaterial;
  groupRef: React.RefObject<THREE.Group | null>;
}) {
  const W = ft(params.widthFt);
  const D = ft(params.depthFt);
  const H = ft(params.heightFt);
  const camDist = Math.max(W, D, H) * 1.8;

  return (
    <>
      <PerspectiveCamera makeDefault position={[camDist * 0.6, camDist * 0.4, camDist * 0.8]} fov={45} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-8, 12, -8]} intensity={0.4} />
      <Environment preset="city" />
      <Grid
        args={[60, 60]}
        position={[0, -0.01, 0]}
        cellColor="#888"
        sectionColor="#555"
        cellSize={ft(1)}
        sectionSize={ft(10)}
        fadeDistance={80}
        infiniteGrid
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
      <PergolaScene
        params={params}
        glassTint={glassTint}
        glassMaterial={glassMaterial}
        groupRef={groupRef}
      />
    </>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function ModelViewer3D({ params, projectName, className }: { params: PergolaModel3DParams; projectName?: string; className?: string }) {
  const [darkBg, setDarkBg]           = useState(true);
  const [glassTint, setGlassTint]     = useState<GlassTint>("grey");
  const [glassMaterial, setGlassMaterial] = useState<GlassMaterial>("frosted");
  const [showGlassControls, setShowGlassControls] = useState(false);
  const [showUpperGlass, setShowUpperGlass] = useState(params.showUpperGlass ?? false);
  const [showBooths, setShowBooths]   = useState(params.showBooths ?? true);
  const [glassHeightFt, setGlassHeightFt] = useState(params.glassWallHeightFt ?? 4.333);
  const [exporting, setExporting]     = useState(false);
  const groupRef = useRef<THREE.Group | null>(null);

  const bg = darkBg ? "#1a1a2e" : "#f0f0f0";
  const activeTint = GLASS_TINTS.find(t => t.value === glassTint) ?? GLASS_TINTS[0];

  // Merge live controls into params
  const liveParams: PergolaModel3DParams = {
    ...params,
    showUpperGlass,
    showBooths,
    glassWallHeightFt: glassHeightFt,
  };

  const handleExportGLB = useCallback(async () => {
    if (!groupRef.current) { toast.error("Scene not ready"); return; }
    setExporting(true);
    try {
      await exportSceneAsGLB(groupRef.current, `pergola-model-${params.widthFt}x${params.depthFt}.glb`);
      toast.success("Model exported as .glb");
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }, [params.widthFt, params.depthFt]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 520 }}>

      {/* ── Toolbar ── */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5 flex-wrap">
        {/* Glass height toggle: 48" vs 52" */}
        {params.hasGlass && (
          <div className="flex gap-0.5 bg-black/60 backdrop-blur border border-white/20 rounded-lg p-0.5">
            <button
              onClick={() => setGlassHeightFt(4)}
              className={`text-xs px-2 py-1 rounded-md transition-all ${glassHeightFt <= 4.01 ? "bg-white text-black font-semibold" : "text-white/70 hover:text-white"}`}
            >
              48″
            </button>
            <button
              onClick={() => setGlassHeightFt(4.333)}
              className={`text-xs px-2 py-1 rounded-md transition-all ${glassHeightFt > 4.01 ? "bg-white text-black font-semibold" : "text-white/70 hover:text-white"}`}
            >
              52″
            </button>
          </div>
        )}

        {/* Phase 2 toggle */}
        {params.hasGlass && (
          <button
            onClick={() => setShowUpperGlass(v => !v)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border backdrop-blur transition-all ${
              showUpperGlass
                ? "bg-blue-500/80 border-blue-400 text-white font-semibold"
                : "bg-black/60 border-white/20 text-white/70 hover:text-white"
            }`}
          >
            Phase 2 Upper Glass
          </button>
        )}

        {/* Booths toggle */}
        <button
          onClick={() => setShowBooths(v => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border backdrop-blur transition-all ${
            showBooths
              ? "bg-amber-500/80 border-amber-400 text-white font-semibold"
              : "bg-black/60 border-white/20 text-white/70 hover:text-white"
          }`}
        >
          Booths
        </button>
      </div>

      {/* ── Right toolbar ── */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        {params.hasGlass && (
          <Button
            size="sm"
            variant="outline"
            className={`text-xs backdrop-blur border-white/20 text-white hover:bg-black/80 ${showGlassControls ? "bg-blue-600/80" : "bg-black/60"}`}
            onClick={() => setShowGlassControls(v => !v)}
          >
            <Sliders size={13} className="mr-1" />
            Glass
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs bg-black/60 border-white/20 text-white hover:bg-black/80 backdrop-blur"
          onClick={() => setDarkBg(v => !v)}
        >
          {darkBg ? <Sun size={13} className="mr-1" /> : <Moon size={13} className="mr-1" />}
          {darkBg ? "Light" : "Dark"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs bg-black/60 border-white/20 text-white hover:bg-black/80 backdrop-blur"
          onClick={handleExportGLB}
          disabled={exporting}
        >
          <Download size={13} className="mr-1" />
          {exporting ? "Exporting…" : ".glb"}
        </Button>
      </div>

      {/* ── Glass controls panel ── */}
      {params.hasGlass && showGlassControls && (
        <div className="absolute top-12 right-3 z-10 bg-black/80 backdrop-blur border border-white/15 rounded-xl p-3 w-52 space-y-3">
          <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">Glass Options</p>
          <div>
            <Label className="text-xs text-white/60 mb-1 block">Tint</Label>
            <div className="flex gap-1.5 flex-wrap">
              {GLASS_TINTS.map(t => (
                <button
                  key={t.value}
                  title={t.label}
                  onClick={() => setGlassTint(t.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    glassTint === t.value ? "border-white scale-110" : "border-white/30 hover:border-white/60"
                  }`}
                  style={{ backgroundColor: t.color }}
                />
              ))}
            </div>
            <p className="text-xs text-white/40 mt-1">{activeTint.label}</p>
          </div>
          <div>
            <Label className="text-xs text-white/60 mb-1 block">Material</Label>
            <Select value={glassMaterial} onValueChange={v => setGlassMaterial(v as GlassMaterial)}>
              <SelectTrigger className="h-7 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLASS_MATERIALS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40 mt-1">
              {glassMaterial === "standard"   && "Clear float glass — low reflectivity"}
              {glassMaterial === "frosted"    && "Acid-etched — diffused, privacy glass"}
              {glassMaterial === "reflective" && "Sputter-coated — high solar reflectance"}
            </p>
          </div>
        </div>
      )}

      {/* ── Dimension badges ── */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-xs bg-black/60 border-white/20 text-white backdrop-blur">
          {params.widthFt}′ × {params.depthFt}′
        </Badge>
        <Badge variant="outline" className="text-xs bg-black/60 border-white/20 text-white backdrop-blur">
          H: {params.heightFt}′
        </Badge>
        {params.hasGlass && (
          <Badge variant="outline" className="text-xs bg-black/60 border-white/20 text-white backdrop-blur">
            Glass: {(glassHeightFt * 12).toFixed(0)}″ {glassHeightFt > 4 ? "(52″)" : "(48″)"}
          </Badge>
        )}
        {params.hasGlass && (
          <Badge
            variant="outline"
            className="text-xs backdrop-blur border-white/20 text-white"
            style={{ backgroundColor: activeTint.color + "55" }}
          >
            {activeTint.label} · {glassMaterial}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs bg-black/60 border-white/20 text-white backdrop-blur">
          {params.postCount} posts
        </Badge>
        {showUpperGlass && (
          <Badge variant="outline" className="text-xs bg-blue-600/60 border-blue-400/40 text-white backdrop-blur">
            Phase 2 Upper Glass
          </Badge>
        )}
      </div>

      {/* ── Help text ── */}
      <div className="absolute bottom-3 right-3 z-10">
        <span className="text-xs text-white/40 bg-black/40 backdrop-blur px-2 py-1 rounded">
          Drag to orbit · Scroll to zoom
        </span>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        style={{ background: bg, width: "100%", height: "100%", minHeight: 520 }}
      >
        <Suspense fallback={<Loader />}>
          <SceneContent
            params={liveParams}
            glassTint={glassTint}
            glassMaterial={glassMaterial}
            groupRef={groupRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
