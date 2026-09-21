import React from 'react';
import {C, STROKE, STROKE_THIN} from '../theme';

/**
 * PRESIDENT. A cartoon podium figure: oversized gestures, and a red tie long
 * enough to leave frame. Eased, never sprung -- Dale owns the springs.
 */
export type PresidentPose = {
  headTurn: number;
  headTilt: number;
  browRaise: number;
  mouthOpen: number;
  /**
   * Both arms, in degrees, in SCREEN space: positive swings a limb toward
   * screen-left. So his screen-left arm goes outward on POSITIVE and his
   * screen-right arm goes outward on NEGATIVE. He gestures with everything
   * he has.
   */
  lArm: {shoulder: number; elbow: number};
  rArm: {shoulder: number; elbow: number};
  /** 0..1 -- raises a notecard into his eyeline. */
  notecard: number;
  lean: number;
};

const base: PresidentPose = {
  headTurn: 0,
  headTilt: 0,
  browRaise: 0,
  mouthOpen: 0,
  lArm: {shoulder: 22, elbow: 46},
  rArm: {shoulder: -22, elbow: -46},
  notecard: 0,
  lean: 0,
};

export const president = (p: Partial<PresidentPose>): PresidentPose => ({
  ...base,
  ...p,
});

export const PRES_POSE = {
  addressing: president({
    lArm: {shoulder: 44, elbow: 58},
    rArm: {shoulder: -44, elbow: -58},
    browRaise: 0.5,
  }),
  /** The pinch. Tremendous. */
  emphatic: president({
    lArm: {shoulder: 62, elbow: 74},
    rArm: {shoulder: -62, elbow: -74},
    browRaise: 1,
  }),
  /** Notecard brought up across the chest, where he can actually read it. */
  reading: president({
    lArm: {shoulder: 16, elbow: 38},
    rArm: {shoulder: 30, elbow: 16},
    notecard: 1,
    headTilt: 6,
  }),
  rest: base,
} satisfies Record<string, PresidentPose>;

const Hand: React.FC<{pinch?: boolean}> = ({pinch}) => (
  <g>
    <ellipse cx={0} cy={8} rx={16} ry={14} fill={C.skin} stroke={C.ink} strokeWidth={STROKE_THIN} />
    {pinch ? (
      <>
        <rect x={-4} y={16} width={8} height={14} rx={4} fill={C.skin} stroke={C.ink} strokeWidth={2.4} />
        <rect x={9} y={2} width={7} height={15} rx={3.5} fill={C.skin} stroke={C.ink} strokeWidth={2.4} transform="rotate(40 12 9)" />
      </>
    ) : (
      [-9, -3, 3, 9].map((fx) => (
        <rect key={fx} x={fx - 3} y={15} width={6} height={14} rx={3} fill={C.skin} stroke={C.ink} strokeWidth={2.3} />
      ))
    )}
  </g>
);

const Arm: React.FC<{
  at: {x: number; y: number};
  arm: {shoulder: number; elbow: number};
  pinch?: boolean;
  children?: React.ReactNode;
}> = ({at, arm, pinch, children}) => (
  <g transform={`translate(${at.x} ${at.y}) rotate(${arm.shoulder})`}>
    <rect x={-17} y={-10} width={34} height={72} rx={16} fill={C.suit} stroke={C.ink} strokeWidth={STROKE} />
    <g transform={`translate(0 60) rotate(${arm.elbow})`}>
      <rect x={-15} y={-8} width={30} height={66} rx={14} fill={C.suit} stroke={C.ink} strokeWidth={STROKE} />
      <rect x={-16} y={42} width={32} height={12} rx={5} fill={C.shirt} stroke={C.ink} strokeWidth={2.4} />
      <g transform="translate(0 62)">
        {children ?? <Hand pinch={pinch} />}
      </g>
    </g>
  </g>
);

export const President: React.FC<{
  pose?: PresidentPose;
  x?: number;
  y?: number;
  scale?: number;
}> = ({pose: p = PRES_POSE.rest, x = 0, y = 0, scale = 1}) => (
  <svg
    viewBox="0 0 500 520"
    width={500 * scale}
    height={520 * scale}
    style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}
  >
    <g transform={`rotate(${p.lean} 250 470)`}>
      <Arm at={{x: 168, y: 214}} arm={p.lArm} pinch />
      {/* torso */}
      <path
        d="M 152 236 Q 158 202 196 192 L 304 192 Q 342 202 348 236 L 362 520 L 138 520 Z"
        fill={C.suit}
        stroke={C.ink}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {/* shirt */}
      <path d="M 212 192 L 250 262 L 288 192 L 288 300 L 212 300 Z" fill={C.shirt} stroke={C.ink} strokeWidth={STROKE_THIN} />
      {/* lapels */}
      <path d="M 210 192 L 250 264 L 214 300 L 186 196 Z" fill={C.suitDeep} stroke={C.ink} strokeWidth={STROKE_THIN} strokeLinejoin="round" />
      <path d="M 290 192 L 250 264 L 286 300 L 314 196 Z" fill={C.suitDeep} stroke={C.ink} strokeWidth={STROKE_THIN} strokeLinejoin="round" />
      {/* THE TIE: knot, then straight on past the belt and out of frame */}
      <path d="M 238 208 L 262 208 L 268 232 L 250 244 L 232 232 Z" fill={C.tieDeep} stroke={C.ink} strokeWidth={STROKE_THIN} strokeLinejoin="round" />
      <path
        d="M 234 240 L 266 240 L 272 470 L 250 508 L 228 470 Z"
        fill={C.tie}
        stroke={C.ink}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M 240 250 L 240 452" stroke={C.tieDeep} strokeWidth={4} fill="none" opacity={0.8} />

      {/* head */}
      <g transform={`translate(${p.headTurn * 14} 0) rotate(${p.headTilt} 250 180)`}>
        <ellipse cx={186} cy={110} rx={12} ry={17} fill={C.skin} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <ellipse cx={314} cy={110} rx={12} ry={17} fill={C.skin} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <rect x={224} y={152} width={52} height={46} rx={12} fill={C.skinShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <rect x={190} y={40} width={120} height={128} rx={54} fill={C.skin} stroke={C.ink} strokeWidth={STROKE} />
        {/* hair, swept */}
        <path
          d="M 192 86 Q 190 36 244 30 Q 300 26 310 76 Q 300 58 268 56 Q 226 52 192 86 Z"
          fill={C.amber}
          stroke={C.ink}
          strokeWidth={STROKE_THIN}
          strokeLinejoin="round"
        />
        <ellipse cx={226} cy={100} rx={11} ry={12} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        <ellipse cx={274} cy={100} rx={11} ry={12} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={226 + p.headTurn * 3} cy={100} r={5} fill={C.ink} />
        <circle cx={274 + p.headTurn * 3} cy={100} r={5} fill={C.ink} />
        <rect x={212} y={82 - p.browRaise * 8} width={28} height={8} rx={4} fill={C.amber} />
        <rect x={260} y={82 - p.browRaise * 8} width={28} height={8} rx={4} fill={C.amber} />
        <path d="M 250 104 q -8 16 4 20" fill="none" stroke={C.skinShade} strokeWidth={4} strokeLinecap="round" />
        <ellipse
          cx={250}
          cy={138}
          rx={20 + p.mouthOpen * 5}
          ry={3 + p.mouthOpen * 15}
          fill={C.ink}
        />
      </g>

      <Arm at={{x: 332, y: 214}} arm={p.rArm} pinch={p.notecard < 0.5}>
        {p.notecard > 0.02 ? (
          <g opacity={p.notecard}>
            <Hand />
            <rect
              x={-58}
              y={-18}
              width={116}
              height={74}
              rx={4}
              fill={C.paper}
              stroke={C.ink}
              strokeWidth={STROKE_THIN}
            />
            {[0, 1, 2].map((i) => (
              <rect key={i} x={-46} y={2 + i * 18} width={80 - i * 20} height={6} rx={3} fill={C.paperLine} />
            ))}
          </g>
        ) : (
          <Hand pinch />
        )}
      </Arm>
    </g>
  </svg>
);
