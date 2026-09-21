import React from 'react';
import {C, STROKE, STROKE_THIN} from '../theme';

/**
 * REPORTER -- seen only as a foreground silhouette from behind, arm up,
 * holding a recorder. Flat ink, no interior detail.
 */
export const Reporter: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  /** 0..1, raises the arm. */
  handUp?: number;
  flip?: boolean;
}> = ({x = 0, y = 0, scale = 1, handUp = 1, flip = false}) => (
  <svg
    viewBox="0 0 300 420"
    width={300 * scale}
    height={420 * scale}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      overflow: 'visible',
      transform: flip ? 'scaleX(-1)' : undefined,
    }}
  >
    <g fill={C.ink}>
      {/* shoulders */}
      <path d="M 18 420 Q 24 292 96 262 L 196 262 Q 268 292 274 420 Z" />
      {/* back of the head */}
      <ellipse cx={146} cy={176} rx={78} ry={86} />
      {/* a slept-on cowlick, the only silhouette detail he gets */}
      <path d="M 96 108 q 16 -34 44 -30 q -22 10 -22 32 Z" />
      {/* raised arm + recorder */}
      <g transform={`rotate(${-30 * handUp} 240 300)`}>
        <rect x={218} y={150} width={44} height={170} rx={22} />
        <rect x={222} y={96} width={34} height={72} rx={12} />
        <rect x={228} y={74} width={22} height={28} rx={6} fill={C.inkSoft} />
      </g>
    </g>
  </svg>
);

/**
 * ONE CAT. Sits. Does not move. Wins.
 */
export const Cat: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  /** 0..1 -- the tail is the only part of the cat that ever moves. */
  tail?: number;
  blink?: number;
}> = ({x = 0, y = 0, scale = 1, flip = false, tail = 0, blink = 0}) => (
  <svg
    viewBox="0 0 260 260"
    width={260 * scale}
    height={260 * scale}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      overflow: 'visible',
      transform: flip ? 'scaleX(-1)' : undefined,
    }}
  >
    {/* tail */}
    <path
      d={`M 74 214 Q ${18 - tail * 16} ${204 - tail * 26} ${34 + tail * 10} ${150 - tail * 22}`}
      fill="none"
      stroke={C.ink}
      strokeWidth={22}
      strokeLinecap="round"
    />
    <path
      d={`M 74 214 Q ${18 - tail * 16} ${204 - tail * 26} ${34 + tail * 10} ${150 - tail * 22}`}
      fill="none"
      stroke={C.inkSoft}
      strokeWidth={13}
      strokeLinecap="round"
    />
    {/* body */}
    <path
      d="M 86 232 Q 80 130 132 122 Q 184 130 178 232 Z"
      fill={C.inkSoft}
      stroke={C.ink}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    {/* head + ears */}
    <path d="M 96 92 L 92 44 L 128 68 Z" fill={C.inkSoft} stroke={C.ink} strokeWidth={STROKE} strokeLinejoin="round" />
    <path d="M 168 92 L 172 44 L 136 68 Z" fill={C.inkSoft} stroke={C.ink} strokeWidth={STROKE} strokeLinejoin="round" />
    <ellipse cx={132} cy={98} rx={52} ry={44} fill={C.inkSoft} stroke={C.ink} strokeWidth={STROKE} />
    {/* eyes -- open, unblinking, yours */}
    <ellipse cx={113} cy={96} rx={9} ry={11 - blink * 10} fill={C.fluoroLit} />
    <ellipse cx={151} cy={96} rx={9} ry={11 - blink * 10} fill={C.fluoroLit} />
    {blink < 0.5 && (
      <>
        <ellipse cx={113} cy={96} rx={3} ry={9} fill={C.ink} />
        <ellipse cx={151} cy={96} rx={3} ry={9} fill={C.ink} />
      </>
    )}
    <path d="M 132 112 l -7 7 l 14 0 Z" fill={C.ink} />
    <path d="M 124 124 q 8 8 16 0" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
    {/* whiskers */}
    <g stroke={C.ink} strokeWidth={2.6} strokeLinecap="round">
      <line x1={104} y1={116} x2={62} y2={110} />
      <line x1={104} y1={122} x2={64} y2={126} />
      <line x1={160} y1={116} x2={202} y2={110} />
      <line x1={160} y1={122} x2={200} y2={126} />
    </g>
    {/* front paws */}
    <ellipse cx={106} cy={228} rx={20} ry={12} fill={C.inkSoft} stroke={C.ink} strokeWidth={STROKE_THIN} />
    <ellipse cx={158} cy={228} rx={20} ry={12} fill={C.inkSoft} stroke={C.ink} strokeWidth={STROKE_THIN} />
  </svg>
);

/**
 * A beige institutional desk-phone handset. UNIT-9 holds one in Scene 3.
 */
export const Handset: React.FC<{x?: number; y?: number; scale?: number; rotate?: number}> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
}) => (
  <svg
    viewBox="0 0 160 220"
    width={160 * scale}
    height={220 * scale}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      overflow: 'visible',
      transform: `rotate(${rotate}deg)`,
    }}
  >
    <path
      d="M 30 22 Q 78 6 128 22 L 122 54 Q 78 42 36 54 Z"
      fill={C.beigeDeep}
      stroke={C.ink}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <rect x={62} y={50} width={34} height={118} rx={12} fill={C.beigeDeep} stroke={C.ink} strokeWidth={STROKE} />
    <path
      d="M 30 196 Q 78 180 128 196 L 122 164 Q 78 152 36 164 Z"
      fill={C.beigeDeep}
      stroke={C.ink}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <rect x={68} y={62} width={9} height={94} rx={4.5} fill={C.beigeLit} opacity={0.7} />
  </svg>
);
