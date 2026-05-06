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
  { value: "clear",   label: "Clear",        color: "#c8e8f8", opacity: 0.20 },
  { value: "bronze",  label: "Bronze",       color: "#b8864e", opacity: 0.30 },
  { value: "grey",    label: "Grey",         color: "#8a8a8a", opacity: 0.28 },
  { value: "blue",    label: "Blue",         color: "#4a90d9", opacity: 0.28 },
  { value: "green",   label: "Green",        color: "#4aaa6a", opacity: 0.28 },
];

const GLASS_MATERIALS: GlassMaterialOption[] = [
  { value: "standard",   label: "Standard",   roughness: 0.05, metalness: 0.0,  opacity: 1.0 },
  { value: "frosted",    label: "Frosted",    roughness: 0.65, metalness: 0.0,  opacity: 1.2 },
  { value: "reflective", label: "Reflective", roughness: 0.02, metalness: 0.35, opacity: 0.85 },
];

// ─── Unit conversion ─────────────────────────────────────────────────────────

const FT = 0.3048;
const ft = (v: number) => v * FT;
const inch = (v: number) => (v * FT) / 12;

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

// ─── Single box mesh ──────────────────────────────────────────────────────────

function AlumBox({
  position,
  size,
  color,
}: {
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

function GlassPanel({
  position,
  size,
  tintOption,
  materialOption,
}: {
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

// ─── Pergola scene ────────────────────────────────────────────────────────────

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
    hasGlass, glassWallHeightFt, finishColor,
  } = params;

  const W = ft(widthFt);
  const D = ft(depthFt);
  const H = ft(heightFt);
  const postS = inch(postSizeIn);
  const beamH = inch(beamSizeIn);
  const beamW = inch(Math.max(beamSizeIn, 4));
  const louverSpacing = inch(Math.max(louverSpacingIn, 1));
  const louverW = inch(louverSizeIn);
  const louverThick = inch(1.5);
  const roofY = H + beamH + louverThick / 2;

  const n = Math.max(postCount, 2);

  const tintOption     = GLASS_TINTS.find(t => t.value === glassTint)     ?? GLASS_TINTS[0];
  const materialOption = GLASS_MATERIALS.find(m => m.value === glassMaterial) ?? GLASS_MATERIALS[0];

  // Post X positions
  const postXs = useMemo(() => {
    return Array.from({ length: n }, (_, i) => -W / 2 + (i / (n - 1)) * W);
  }, [n, W]);

  // Louver Z positions
  const louverZs = useMemo(() => {
    const count = Math.max(Math.floor(D / louverSpacing), 1);
    return Array.from({ length: count + 1 }, (_, i) => -D / 2 + i * louverSpacing);
  }, [D, louverSpacing]);

  const GH = ft(glassWallHeightFt ?? heightFt);

  return (
    <group ref={groupRef}>
      {/* Posts — front row */}
      {postXs.map((x, i) => (
        <AlumBox key={`pf${i}`} position={[x, H / 2, D / 2]} size={[postS, H, postS]} color={finishColor} />
      ))}

      {/* Posts — back row (wall side) */}
      {postXs.map((x, i) => (
        <AlumBox key={`pb${i}`} position={[x, H / 2, -D / 2]} size={[postS, H, postS]} color={finishColor} />
      ))}

      {/* Front beam */}
      <AlumBox position={[0, H + beamH / 2, D / 2]} size={[W, beamH, beamW]} color={finishColor} />

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

      {/* Glass wall panels — sized to glassWallHeightFt */}
      {hasGlass && (
        <GlassPanel
          position={[0, GH / 2, D / 2]}
          size={[W, GH, 0.012]}
          tintOption={tintOption}
          materialOption={materialOption}
        />
      )}

      {/* Concrete slab */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[W + 0.3, 0.04, D + 0.3]} />
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
  const H = ft(params.heightFt);
  const D = ft(params.depthFt);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[W * 1.2, H * 1.5, D * 2.2]}
        fov={45}
      />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, H * 0.5, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[12, 22, 12]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-8, 12, -8]} intensity={0.35} />
      <hemisphereLight args={["#c9e0f0", "#8a7a6a", 0.4]} />

      <Environment preset="city" />

      {/* Grid */}
      <Grid
        position={[0, -0.001, 0]}
        args={[80, 80]}
        cellSize={ft(1)}
        cellThickness={0.4}
        cellColor="#555"
        sectionSize={ft(5)}
        sectionThickness={0.8}
        sectionColor="#888"
        fadeDistance={40}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
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

export default function ModelViewer3D({
  params,
  projectName = "Pergola",
  className = "",
}: {
  params: PergolaModel3DParams;
  projectName?: string;
  className?: string;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const [exporting, setExporting] = useState(false);
  const [darkBg, setDarkBg] = useState(true);
  const [showGlassControls, setShowGlassControls] = useState(false);
  const [glassTint, setGlassTint] = useState<GlassTint>("clear");
  const [glassMaterial, setGlassMaterial] = useState<GlassMaterial>("standard");

  const handleExportGLB = useCallback(async () => {
    if (!groupRef.current) {
      toast.error("3D scene not ready yet.");
      return;
    }
    setExporting(true);
    try {
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_3D_Model.glb`;
      await exportSceneAsGLB(groupRef.current, filename);
      toast.success("3D model downloaded as .glb");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export 3D model");
    } finally {
      setExporting(false);
    }
  }, [projectName]);

  const bg = darkBg ? "#1a1a1a" : "#e8e8e8";
  const activeTint = GLASS_TINTS.find(t => t.value === glassTint) ?? GLASS_TINTS[0];

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: 420 }}
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {params.hasGlass && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs bg-black/60 border-white/20 text-white hover:bg-black/80 backdrop-blur"
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
          onClick={() => setDarkBg((v) => !v)}
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
          {exporting ? "Exporting…" : "Download .glb"}
        </Button>
      </div>

      {/* Glass controls panel */}
      {params.hasGlass && showGlassControls && (
        <div className="absolute top-12 right-3 z-10 bg-black/80 backdrop-blur border border-white/15 rounded-xl p-3 w-52 space-y-3">
          <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">Glass Options</p>

          {/* Tint selector */}
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

          {/* Material selector */}
          <div>
            <Label className="text-xs text-white/60 mb-1 block">Material</Label>
            <Select value={glassMaterial} onValueChange={v => setGlassMaterial(v as GlassMaterial)}>
              <SelectTrigger className="h-7 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLASS_MATERIALS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
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

      {/* Dimension badges */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className="text-xs bg-black/60 border-white/20 text-white backdrop-blur"
        >
          {params.widthFt}′ × {params.depthFt}′
        </Badge>
        <Badge
          variant="outline"
          className="text-xs bg-black/60 border-white/20 text-white backdrop-blur"
        >
          H: {params.heightFt}′
        </Badge>
        {params.hasGlass && params.glassWallHeightFt && (
          <Badge
            variant="outline"
            className="text-xs bg-black/60 border-white/20 text-white backdrop-blur"
          >
            Glass: {params.glassWallHeightFt}′
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
        <Badge
          variant="outline"
          className="text-xs bg-black/60 border-white/20 text-white backdrop-blur"
        >
          {params.postCount} posts
        </Badge>
      </div>

      {/* Help text */}
      <div className="absolute bottom-3 right-3 z-10">
        <span className="text-xs text-white/40 bg-black/40 backdrop-blur px-2 py-1 rounded">
          Drag to orbit · Scroll to zoom
        </span>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        style={{ background: bg, width: "100%", height: "100%", minHeight: 420 }}
      >
        <Suspense fallback={<Loader />}>
          <SceneContent
            params={params}
            glassTint={glassTint}
            glassMaterial={glassMaterial}
            groupRef={groupRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
