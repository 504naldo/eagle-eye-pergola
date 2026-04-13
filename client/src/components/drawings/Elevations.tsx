import { DrawingDimensions } from "@shared/geometry";

const GOLD = "#C9A84C";
const DARK = "#111111";
const GLASS_BLUE = "#BFDBFE";

interface Props {
  dims: DrawingDimensions;
  width?: number;
  height?: number;
}

// ─── Front Elevation ──────────────────────────────────────────────────────────
export function FrontElevation({ dims, width = 700, height = 380 }: Props) {
  const pad = { l: 70, r: 40, t: 50, b: 70 };
  const drawW = width - pad.l - pad.r;
  const drawH = height - pad.t - pad.b;

  const scaleX = drawW / dims.widthFt;
  const scaleY = drawH / dims.heightFt;

  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => height - pad.b - ft * scaleY;

  const postPositions: number[] = [];
  if (dims.postCount <= 1) {
    postPositions.push(dims.widthFt / 2);
  } else {
    for (let i = 0; i < dims.postCount; i++) {
      postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));
    }
  }

  const slatCount = dims.slatCount;
  const roofH = dims.heightFt;
  const beamH = 0.5;
  const slatH = roofH - beamH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: "#fff", fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={width} height={32} fill={DARK} />
      <line x1={0} y1={32} x2={width} y2={32} stroke={GOLD} strokeWidth={2} />
      <text x={12} y={21} fill="white" fontSize={10} fontWeight="600">SHEET 04 — FRONT ELEVATION</text>
      <text x={width - 12} y={21} fill={GOLD} fontSize={8} textAnchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>

      {/* Ground line */}
      <line x1={x(0)} y1={y(0)} x2={x(dims.widthFt)} y2={y(0)} stroke="#374151" strokeWidth={2} />

      {/* Lumin glass front */}
      {dims.glassFront && (
        <rect x={x(0)} y={y(dims.heightFt)} width={drawW} height={drawH} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} opacity={0.5} />
      )}

      {/* Posts */}
      {postPositions.map((px, i) => (
        <rect key={i}
          x={x(px) - 4} y={y(dims.heightFt)}
          width={8} height={drawH}
          fill={DARK}
        />
      ))}

      {/* Slats (front view — horizontal lines) */}
      {Array.from({ length: slatCount }).map((_, i) => {
        const fy = slatH * (i / (slatCount - 1 || 1));
        return (
          <rect key={i}
            x={x(0)} y={y(fy + beamH) - 2}
            width={drawW} height={4}
            fill="#374151"
          />
        );
      })}

      {/* Front fascia beam */}
      <rect x={x(0)} y={y(beamH)} width={drawW} height={scaleY * beamH} fill={DARK} />

      {/* Height dimension */}
      <line x1={x(0) - 20} y1={y(0)} x2={x(0) - 20} y2={y(dims.heightFt)} stroke={GOLD} strokeWidth={1} />
      <text x={x(0) - 30} y={y(dims.heightFt / 2)} fill={DARK} fontSize={8} textAnchor="middle" fontWeight="600" transform={`rotate(-90, ${x(0) - 30}, ${y(dims.heightFt / 2)})`}>{dims.heightFt.toFixed(1)}' HT.</text>

      {/* Width dimension */}
      <line x1={x(0)} y1={height - 20} x2={x(dims.widthFt)} y2={height - 20} stroke={GOLD} strokeWidth={1} />
      <text x={x(dims.widthFt / 2)} y={height - 8} fill={DARK} fontSize={9} textAnchor="middle" fontWeight="600">{dims.widthFt.toFixed(1)}' (58'-0")</text>

      {/* Post spacing */}
      {postPositions.length >= 2 && (
        <>
          <line x1={x(postPositions[0])} y1={y(0) + 14} x2={x(postPositions[1])} y2={y(0) + 14} stroke="#9CA3AF" strokeWidth={0.8} />
          <text x={x((postPositions[0] + postPositions[1]) / 2)} y={y(0) + 24} fill="#6B7280" fontSize={7.5} textAnchor="middle">{dims.postSpacingFt.toFixed(1)}' TYP.</text>
        </>
      )}

      {/* Labels */}
      <text x={x(dims.widthFt / 2)} y={y(dims.heightFt / 2)} fill="#9CA3AF" fontSize={9} textAnchor="middle">ALUMINUM SLAT ROOF</text>
      {dims.glassFront && <text x={x(dims.widthFt / 2)} y={y(dims.heightFt * 0.3)} fill="#3B82F6" fontSize={8} textAnchor="middle">LUMIN GLASS ENCLOSURE</text>}
      <text x={x(dims.widthFt / 2)} y={y(-0.3)} fill="#6B7280" fontSize={7.5} textAnchor="middle">NO REAR POSTS — WALL-MOUNTED CONNECTION</text>
    </svg>
  );
}

// ─── Side Elevation ───────────────────────────────────────────────────────────
export function SideElevation({ dims, width = 700, height = 380 }: Props) {
  const pad = { l: 70, r: 60, t: 50, b: 70 };
  const drawW = width - pad.l - pad.r;
  const drawH = height - pad.t - pad.b;

  const scaleX = drawW / dims.depthFt;
  const scaleY = drawH / dims.heightFt;

  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => height - pad.b - ft * scaleY;

  const slatCount = dims.slatCount;
  const slatSpacingFt = dims.slatSpacingIn / 12;
  const beamH = 0.5;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: "#fff", fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={width} height={32} fill={DARK} />
      <line x1={0} y1={32} x2={width} y2={32} stroke={GOLD} strokeWidth={2} />
      <text x={12} y={21} fill="white" fontSize={10} fontWeight="600">SHEET 05 — SIDE ELEVATION</text>
      <text x={width - 12} y={21} fill={GOLD} fontSize={8} textAnchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>

      {/* Ground line */}
      <line x1={x(0)} y1={y(0)} x2={x(dims.depthFt)} y2={y(0)} stroke="#374151" strokeWidth={2} />

      {/* Building wall at rear (left in side view) */}
      <rect x={x(0) - 10} y={y(dims.heightFt)} width={10} height={drawH} fill={DARK} />
      <text x={x(0) - 5} y={y(dims.heightFt / 2)} fill="white" fontSize={7} textAnchor="middle" transform={`rotate(-90, ${x(0) - 5}, ${y(dims.heightFt / 2)})`}>BUILDING WALL</text>

      {/* Lumin glass side */}
      {dims.glassLeft && (
        <rect x={x(dims.depthFt)} y={y(dims.heightFt)} width={5} height={drawH} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} />
      )}

      {/* Slats in section (vertical lines) */}
      {Array.from({ length: slatCount }).map((_, i) => {
        const d = i * slatSpacingFt;
        return (
          <rect key={i}
            x={x(d) - 2} y={y(dims.heightFt)}
            width={4} height={drawH - scaleY * beamH}
            fill="#374151"
          />
        );
      })}

      {/* Rear wall ledger */}
      <rect x={x(0)} y={y(dims.heightFt)} width={drawW} height={scaleY * beamH} fill={DARK} />

      {/* Front post */}
      <rect x={x(dims.depthFt) - 4} y={y(dims.heightFt)} width={8} height={drawH} fill={DARK} />

      {/* Front fascia beam */}
      <rect x={x(dims.depthFt) - 4} y={y(dims.heightFt)} width={8} height={scaleY * beamH} fill={GOLD} />

      {/* Depth dimension */}
      <line x1={x(0)} y1={height - 20} x2={x(dims.depthFt)} y2={height - 20} stroke={GOLD} strokeWidth={1} />
      <text x={x(dims.depthFt / 2)} y={height - 8} fill={DARK} fontSize={9} textAnchor="middle" fontWeight="600">{dims.depthFt.toFixed(1)}' (15'-8")</text>

      {/* Height dimension */}
      <line x1={x(dims.depthFt) + 20} y1={y(0)} x2={x(dims.depthFt) + 20} y2={y(dims.heightFt)} stroke={GOLD} strokeWidth={1} />
      <text x={x(dims.depthFt) + 35} y={y(dims.heightFt / 2)} fill={DARK} fontSize={8} textAnchor="middle" fontWeight="600" transform={`rotate(90, ${x(dims.depthFt) + 35}, ${y(dims.heightFt / 2)})`}>{dims.heightFt.toFixed(1)}' HT.</text>

      {/* Slat spacing */}
      {slatCount >= 2 && (
        <>
          <line x1={x(0)} y1={y(dims.heightFt) - 12} x2={x(slatSpacingFt)} y2={y(dims.heightFt) - 12} stroke="#9CA3AF" strokeWidth={0.8} />
          <text x={x(slatSpacingFt / 2)} y={y(dims.heightFt) - 16} fill="#6B7280" fontSize={7} textAnchor="middle">{dims.slatSpacingIn}" TYP.</text>
        </>
      )}

      {/* Labels */}
      <text x={x(dims.depthFt / 2)} y={y(dims.heightFt / 2)} fill="#9CA3AF" fontSize={8} textAnchor="middle">SLAT ROOF</text>
      <text x={x(0) + 5} y={y(dims.heightFt) - 5} fill={GOLD} fontSize={7.5}>WALL LEDGER</text>
    </svg>
  );
}

// ─── Section A-A ──────────────────────────────────────────────────────────────
export function SectionView({ dims, width = 700, height = 380 }: Props) {
  const pad = { l: 80, r: 60, t: 50, b: 70 };
  const drawW = width - pad.l - pad.r;
  const drawH = height - pad.t - pad.b;

  const scaleX = drawW / dims.depthFt;
  const scaleY = drawH / dims.heightFt;

  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => height - pad.b - ft * scaleY;

  const slatCount = dims.slatCount;
  const slatSpacingFt = dims.slatSpacingIn / 12;
  const beamH = 0.5;

  const callouts = [
    { cx: x(0) + 5, cy: y(dims.heightFt) + 10, label: "① WALL-MOUNTED LEDGER — BOLTED TO BUILDING" },
    { cx: x(dims.depthFt) - 5, cy: y(dims.heightFt) + 10, label: "② FRONT FASCIA BEAM (150×75 AL. RHS)" },
    { cx: x(dims.depthFt) - 5, cy: y(0) - 10, label: "③ FRONT POST (100×100 AL. SHS)" },
    { cx: x(dims.depthFt / 2), cy: y(dims.heightFt) - 12, label: "④ ALUMINUM SLATS" },
    { cx: x(dims.depthFt) + 10, cy: y(dims.heightFt / 2), label: "⑤ LUMIN GLASS — VERTICAL ENCLOSURE" },
    { cx: x(dims.depthFt) - 5, cy: y(dims.heightFt + 0.1), label: "⑥ GLASS TOP RAIL → FASCIA BEAM CONNECTION" },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: "#fff", fontFamily: "Inter, sans-serif" }}>
      <rect x={0} y={0} width={width} height={32} fill={DARK} />
      <line x1={0} y1={32} x2={width} y2={32} stroke={GOLD} strokeWidth={2} />
      <text x={12} y={21} fill="white" fontSize={10} fontWeight="600">SHEET 06 — SECTION A–A</text>
      <text x={width - 12} y={21} fill={GOLD} fontSize={8} textAnchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>

      {/* Ground */}
      <line x1={x(0)} y1={y(0)} x2={x(dims.depthFt)} y2={y(0)} stroke="#374151" strokeWidth={2} />

      {/* Building wall */}
      <rect x={x(0) - 12} y={y(dims.heightFt)} width={12} height={drawH} fill={DARK} />

      {/* Lumin glass front */}
      {dims.glassFront && (
        <rect x={x(dims.depthFt)} y={y(dims.heightFt)} width={6} height={drawH} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} />
      )}

      {/* Slats */}
      {Array.from({ length: slatCount }).map((_, i) => {
        const d = i * slatSpacingFt;
        return (
          <rect key={i}
            x={x(d) - 2} y={y(dims.heightFt)}
            width={4} height={drawH - scaleY * beamH}
            fill="#374151"
          />
        );
      })}

      {/* Wall ledger */}
      <rect x={x(0)} y={y(dims.heightFt)} width={drawW} height={scaleY * beamH} fill={DARK} />

      {/* Front post */}
      <rect x={x(dims.depthFt) - 4} y={y(dims.heightFt)} width={8} height={drawH} fill={DARK} />

      {/* Front fascia beam highlight */}
      <rect x={x(dims.depthFt) - 6} y={y(dims.heightFt)} width={12} height={scaleY * beamH} fill={GOLD} />

      {/* Depth dimension */}
      <line x1={x(0)} y1={height - 22} x2={x(dims.depthFt)} y2={height - 22} stroke={GOLD} strokeWidth={1} />
      <text x={x(dims.depthFt / 2)} y={height - 10} fill={DARK} fontSize={9} textAnchor="middle" fontWeight="600">{dims.depthFt.toFixed(1)}' DEPTH</text>

      {/* Height dimension */}
      <line x1={x(0) - 30} y1={y(0)} x2={x(0) - 30} y2={y(dims.heightFt)} stroke={GOLD} strokeWidth={1} />
      <text x={x(0) - 42} y={y(dims.heightFt / 2)} fill={DARK} fontSize={8} textAnchor="middle" fontWeight="600" transform={`rotate(-90, ${x(0) - 42}, ${y(dims.heightFt / 2)})`}>{dims.heightFt.toFixed(1)}' HT.</text>

      {/* Section label */}
      <text x={x(0) - 5} y={y(dims.heightFt) - 5} fill={GOLD} fontSize={7}>WALL LEDGER</text>
      <text x={x(dims.depthFt / 2)} y={y(dims.heightFt / 2)} fill="#9CA3AF" fontSize={8} textAnchor="middle">SLAT ROOF SYSTEM</text>
    </svg>
  );
}
