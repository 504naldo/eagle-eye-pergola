import { DrawingDimensions } from "@shared/geometry";

interface Props {
  dims: DrawingDimensions;
  width?: number;
  height?: number;
}

export default function PlanView({ dims, width = 700, height = 420 }: Props) {
  const pad = { l: 80, r: 40, t: 60, b: 60 };
  const drawW = width - pad.l - pad.r;
  const drawH = height - pad.t - pad.b;

  const scaleX = drawW / dims.widthFt;
  const scaleY = drawH / dims.depthFt;

  const x = (ft: number) => pad.l + ft * scaleX;
  const y = (ft: number) => pad.t + ft * scaleY;

  const postPositions: number[] = [];
  if (dims.postCount <= 1) {
    postPositions.push(dims.widthFt / 2);
  } else {
    for (let i = 0; i < dims.postCount; i++) {
      postPositions.push(i * (dims.widthFt / (dims.postCount - 1)));
    }
  }

  const slatPositions: number[] = [];
  const slatSpacingFt = dims.slatSpacingIn / 12;
  for (let i = 0; i <= dims.slatCount; i++) {
    slatPositions.push(Math.min(i * slatSpacingFt, dims.depthFt));
  }

  const GOLD = "#C9A84C";
  const DARK = "#111111";
  const GLASS_BLUE = "#BFDBFE";
  const POST_SIZE = 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Title block */}
      <rect x={0} y={0} width={width} height={36} fill={DARK} />
      <line x1={0} y1={36} x2={width} y2={36} stroke={GOLD} strokeWidth={2} />
      <text x={12} y={23} fill="white" fontSize={11} fontWeight="600">SHEET 03 — PLAN VIEW</text>
      <text x={width - 12} y={23} fill={GOLD} fontSize={9} textAnchor="end">CONCEPT ONLY — NOT FOR CONSTRUCTION</text>

      {/* Patio slab outline */}
      <rect
        x={x(0)} y={y(0)}
        width={drawW} height={drawH}
        fill="#F9FAFB" stroke="#9CA3AF" strokeWidth={1} strokeDasharray="4,3"
      />

      {/* Building wall at rear */}
      <rect x={x(0)} y={y(0) - 8} width={drawW} height={8} fill={DARK} />
      <text x={x(dims.widthFt / 2)} y={y(0) - 12} fill={DARK} fontSize={8} textAnchor="middle" fontWeight="600">BUILDING WALL — WALL-MOUNTED CONNECTION</text>

      {/* Slats (plan view — lines running width-wise) */}
      {slatPositions.map((d, i) => (
        <line key={i}
          x1={x(0)} y1={y(d)}
          x2={x(dims.widthFt)} y2={y(d)}
          stroke="#6B7280" strokeWidth={1.5}
        />
      ))}

      {/* Lumin glass — front face */}
      {dims.glassFront && (
        <rect x={x(0)} y={y(dims.depthFt)} width={drawW} height={5} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} />
      )}
      {/* Lumin glass — left side */}
      {dims.glassLeft && (
        <rect x={x(0) - 5} y={y(0)} width={5} height={drawH} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} />
      )}
      {/* Lumin glass — right side */}
      {dims.glassRight && (
        <rect x={x(dims.widthFt)} y={y(0)} width={5} height={drawH} fill={GLASS_BLUE} stroke="#3B82F6" strokeWidth={1} />
      )}

      {/* Front fascia beam */}
      <rect x={x(0)} y={y(dims.depthFt) + 5} width={drawW} height={6} fill={DARK} />

      {/* Front posts */}
      {postPositions.map((px, i) => (
        <rect key={i}
          x={x(px) - POST_SIZE / 2} y={y(dims.depthFt) + 11}
          width={POST_SIZE} height={POST_SIZE}
          fill={DARK} stroke={GOLD} strokeWidth={1}
        />
      ))}

      {/* Width dimension */}
      <line x1={x(0)} y1={height - 20} x2={x(dims.widthFt)} y2={height - 20} stroke={GOLD} strokeWidth={1} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <text x={x(dims.widthFt / 2)} y={height - 8} fill={DARK} fontSize={9} textAnchor="middle" fontWeight="600">{dims.widthFt.toFixed(1)}' (58'-0")</text>

      {/* Depth dimension */}
      <line x1={20} y1={y(0)} x2={20} y2={y(dims.depthFt)} stroke={GOLD} strokeWidth={1} />
      <text x={14} y={y(dims.depthFt / 2)} fill={DARK} fontSize={9} textAnchor="middle" fontWeight="600" transform={`rotate(-90, 14, ${y(dims.depthFt / 2)})`}>{dims.depthFt.toFixed(1)}' (15'-8")</text>

      {/* Post spacing dimension */}
      {postPositions.length >= 2 && (
        <>
          <line x1={x(postPositions[0])} y1={y(dims.depthFt) + 28} x2={x(postPositions[1])} y2={y(dims.depthFt) + 28} stroke="#6B7280" strokeWidth={0.8} />
          <text x={x((postPositions[0] + postPositions[1]) / 2)} y={y(dims.depthFt) + 38} fill="#6B7280" fontSize={7.5} textAnchor="middle">{dims.postSpacingFt.toFixed(1)}' TYP.</text>
        </>
      )}

      {/* Labels */}
      <text x={x(dims.widthFt / 2)} y={y(dims.depthFt / 2)} fill="#9CA3AF" fontSize={9} textAnchor="middle">ALUMINUM SLAT ROOF SYSTEM</text>
      {dims.glassFront && <text x={x(dims.widthFt / 2)} y={y(dims.depthFt) + 16} fill="#3B82F6" fontSize={7.5} textAnchor="middle">LUMIN GLASS — FRONT ENCLOSURE</text>}
      {dims.glassLeft && <text x={x(0) - 18} y={y(dims.depthFt / 2)} fill="#3B82F6" fontSize={7} textAnchor="middle" transform={`rotate(-90, ${x(0) - 18}, ${y(dims.depthFt / 2)})`}>LUMIN GLASS (L)</text>}
      {dims.glassRight && <text x={x(dims.widthFt) + 18} y={y(dims.depthFt / 2)} fill="#3B82F6" fontSize={7} textAnchor="middle" transform={`rotate(90, ${x(dims.widthFt) + 18}, ${y(dims.depthFt / 2)})`}>LUMIN GLASS (R)</text>}

      {/* North arrow */}
      <text x={width - 30} y={height - 30} fill={DARK} fontSize={20} textAnchor="middle">↑</text>
      <text x={width - 30} y={height - 14} fill={DARK} fontSize={8} textAnchor="middle" fontWeight="600">N</text>

      {/* Defs */}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={GOLD} />
        </marker>
      </defs>
    </svg>
  );
}
