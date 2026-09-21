import React from 'react';
import {C, STROKE, STROKE_THIN} from '../theme';

/**
 * DALE. Short, stocky, in a bathrobe, holding a bowl of cereal at all times.
 *
 * He is the ONLY character in the film animated with `spring`. Everything that
 * moves on him should overshoot a little. His entire physical vocabulary is
 * "gesturing at the problem with an open palm", so `palmOut` is the pose he
 * returns to and the one worth getting right.
 *
 * His hand has a thumb. UNIT-9's does not. Scenes 4 and 8 depend on the
 * audience having noticed.
 */
export type DaleArm = {shoulder: number; elbow: number};
export type MouthShape = 'closed' | 'chew' | 'talk' | 'wide' | 'flat';

export type DalePose = {
  headTurn: number;
  headTilt: number;
  browRaise: number;
  browAngle: number;
  eyeLid: number;
  mouth: MouthShape;
  mouthOpen: number;
  /** NEAR arm, screen-left. The gesturing arm. Positive swings it outward. */
  lArm: DaleArm;
  /** FAR arm, screen-right. Holds the bowl. Effectively never moves. */
  rArm: DaleArm;
  lean: number;
  bob: number;
  /** Right hand holds the spoon instead of showing an open palm. */
  spoon: boolean;
};

const base: DalePose = {
  headTurn: 0,
  headTilt: 0,
  browRaise: 0,
  browAngle: 0,
  eyeLid: 0,
  mouth: 'closed',
  mouthOpen: 0,
  lArm: {shoulder: 26, elbow: 74},
  rArm: {shoulder: -22, elbow: -62},
  lean: 0,
  bob: 0,
  spoon: false,
};

export const dale = (p: Partial<DalePose>): DalePose => ({...base, ...p});

export const DALE_POSE = {
  /** Eating. Does not look up. */
  eating: dale({lArm: {shoulder: 26, elbow: 74}, spoon: true, mouth: 'chew'}),
  /** The signature move: open palm presented at the problem. */
  palmOut: dale({
    lArm: {shoulder: 88, elbow: -26},
    browRaise: 0.85,
    browAngle: 0.6,
    mouth: 'talk',
  }),
  /** Palm out AND holding the spoon, for gesturing at a door with cutlery. */
  spoonOut: dale({
    lArm: {shoulder: 96, elbow: -34},
    spoon: true,
    browRaise: 0.35,
    browAngle: -0.6,
  }),
  /** Both hands up. Morally offended. */
  incredulous: dale({
    lArm: {shoulder: 104, elbow: -46},
    browRaise: 1,
    browAngle: 0.85,
    mouth: 'wide',
  }),
  rest: base,
} satisfies Record<string, DalePose>;

/** Distance from the top of the viewBox to the soles of his slippers. */
export const DALE_FOOT = 406;

// ---------------------------------------------------------------- geometry
const SHOULDER_L = {x: 104, y: 190};
const SHOULDER_R = {x: 236, y: 190};
const UPPER = 50;
const FORE = 48;

/** Five fingers. One of them is a thumb. That is the whole point. */
const DaleHand: React.FC<{open: number}> = ({open}) => {
  const spread = 4 + 7 * open;
  return (
    <g>
      <ellipse
        cx={0}
        cy={10}
        rx={17}
        ry={15}
        fill={C.skin}
        stroke={C.ink}
        strokeWidth={STROKE_THIN}
      />
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <rect
          key={i}
          x={i * spread - 3}
          y={16}
          width={6}
          height={13 + 5 * open}
          rx={3}
          fill={C.skin}
          stroke={C.ink}
          strokeWidth={2.4}
        />
      ))}
      {/* the thumb */}
      <rect
        x={12}
        y={0}
        width={7}
        height={15}
        rx={3.5}
        fill={C.skin}
        stroke={C.ink}
        strokeWidth={2.4}
        transform={`rotate(${34 + 20 * open} 15 8)`}
      />
      <path
        d="M -8 6 Q 0 12 8 6"
        fill="none"
        stroke={C.skinShade}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </g>
  );
};

const CerealBowl: React.FC = () => (
  <g>
    <path
      d="M -34 -8 L 34 -8 Q 30 26 0 28 Q -30 26 -34 -8 Z"
      fill={C.bowl}
      stroke={C.ink}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <ellipse cx={0} cy={-8} rx={34} ry={9} fill={C.milk} stroke={C.ink} strokeWidth={STROKE_THIN} />
    {[
      [-19, -9],
      [-6, -12],
      [8, -8],
      [20, -11],
      [-12, -5],
      [14, -4],
    ].map(([cx, cy], i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={4.6}
        fill={C.amber}
        stroke={C.ink}
        strokeWidth={2}
      />
    ))}
    <path d="M -30 2 Q -28 18 -14 23" fill="none" stroke={C.bowlDeep} strokeWidth={3.5} strokeLinecap="round" />
  </g>
);

const Spoon: React.FC = () => (
  <g transform="rotate(-24)">
    <rect x={-2.5} y={-34} width={5} height={34} rx={2.5} fill={C.bowlDeep} stroke={C.ink} strokeWidth={2.4} />
    <ellipse cx={0} cy={-42} rx={9} ry={12} fill={C.bowl} stroke={C.ink} strokeWidth={2.6} />
  </g>
);

const Arm: React.FC<{
  at: {x: number; y: number};
  arm: DaleArm;
  children?: React.ReactNode;
}> = ({at, arm, children}) => (
  <g transform={`translate(${at.x} ${at.y}) rotate(${arm.shoulder})`}>
    <rect
      x={-15}
      y={-8}
      width={30}
      height={UPPER + 14}
      rx={14}
      fill={C.robe}
      stroke={C.ink}
      strokeWidth={STROKE}
    />
    <g transform={`translate(0 ${UPPER}) rotate(${arm.elbow})`}>
      <rect
        x={-14}
        y={-8}
        width={28}
        height={FORE + 12}
        rx={13}
        fill={C.robe}
        stroke={C.ink}
        strokeWidth={STROKE}
      />
      {/* cuff */}
      <rect x={-15} y={FORE - 12} width={30} height={11} rx={5} fill={C.robeDeep} stroke={C.ink} strokeWidth={2.5} />
      <g transform={`translate(0 ${FORE + 6})`}>{children}</g>
    </g>
  </g>
);

const mouthPath = (shape: MouthShape, open: number) => {
  const o = Math.max(0, Math.min(1, open));
  switch (shape) {
    case 'closed':
      return {d: 'M -16 0 Q 0 5 16 0', fill: 'none'};
    case 'flat':
      return {d: 'M -19 0 L 19 0', fill: 'none'};
    case 'chew':
      return {
        d: `M -14 ${-2 - o * 2} Q 0 ${6 + o * 7} 14 ${-2 - o * 2} Q 0 ${2 + o * 3} -14 ${-2 - o * 2} Z`,
        fill: C.ink,
      };
    case 'wide':
      // corners DOWN. He is making a point, not enjoying himself.
      return {
        d: `M -22 -5 Q 0 ${3 + o * 3} 22 -5 Q 19 ${7 + o * 11} 0 ${9 + o * 13} Q -19 ${7 + o * 11} -22 -5 Z`,
        fill: C.ink,
      };
    case 'talk':
    default:
      return {
        d: `M -13 -2 Q 0 ${2 + o * 2} 13 -2 Q 11 ${6 + o * 10} 0 ${8 + o * 12} Q -11 ${6 + o * 10} -13 -2 Z`,
        fill: C.ink,
      };
  }
};

export const Dale: React.FC<{
  pose?: DalePose;
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  opacity?: number;
}> = ({pose: p = DALE_POSE.rest, x = 0, y = 0, scale = 1, flip = false, opacity = 1}) => {
  const m = mouthPath(p.mouth, p.mouthOpen);
  const browY = 80 - p.browRaise * 17;
  const browRot = p.browAngle * 21;

  return (
    <svg
      viewBox="0 0 340 460"
      width={340 * scale}
      height={460 * scale}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        overflow: 'visible',
        transform: flip ? 'scaleX(-1)' : undefined,
        opacity,
      }}
    >
      <g transform={`translate(0 ${p.bob}) rotate(${p.lean} 170 380)`}>
        {/* legs + slippers */}
        {[
          {lx: 136, f: false},
          {lx: 206, f: true},
        ].map(({lx, f}, i) => (
          <g key={i}>
            <rect
              x={lx - 19}
              y={300}
              width={38}
              height={96}
              rx={16}
              fill={C.skin}
              stroke={C.ink}
              strokeWidth={STROKE}
            />
            <path
              d={
                f
                  ? `M ${lx + 19} 386 L ${lx - 32} 386 Q ${lx - 44} 390 ${lx - 42} 406 L ${lx + 20} 406 Z`
                  : `M ${lx - 19} 386 L ${lx + 32} 386 Q ${lx + 44} 390 ${lx + 42} 406 L ${lx - 20} 406 Z`
              }
              fill={C.robeDeep}
              stroke={C.ink}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* far arm, screen-right: the bowl. It is always there. */}
        <Arm at={SHOULDER_R} arm={p.rArm}>
          <g transform="translate(0 6)">
            <CerealBowl />
            <g transform="translate(30 4)">
              <DaleHand open={0} />
            </g>
          </g>
        </Arm>

        {/* bathrobe body */}
        <path
          d="M 96 196 Q 100 172 126 166 L 214 166 Q 240 172 244 196 L 258 312 Q 260 328 242 330 L 98 330 Q 80 328 82 312 Z"
          fill={C.robe}
          stroke={C.ink}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
        {/* lapels */}
        <path
          d="M 126 166 L 170 244 L 214 166 L 196 164 L 170 214 L 144 164 Z"
          fill={C.robeDeep}
          stroke={C.ink}
          strokeWidth={STROKE_THIN}
          strokeLinejoin="round"
        />
        <path d="M 170 214 L 170 258" stroke={C.robeShade} strokeWidth={3} fill="none" />
        {/* belt */}
        <rect x={84} y={244} width={172} height={22} rx={8} fill={C.robeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <path
          d="M 170 266 q -16 24 -30 34 M 170 266 q 16 24 30 34"
          fill="none"
          stroke={C.robeShade}
          strokeWidth={9}
          strokeLinecap="round"
        />
        {/* undershirt */}
        <path d="M 150 176 L 190 176 L 170 208 Z" fill={C.milk} stroke={C.ink} strokeWidth={2.5} />

        {/* head */}
        <g transform={`translate(${p.headTurn * 22} 0) rotate(${p.headTilt} 170 150)`}>
          {/* ears */}
          <ellipse cx={104} cy={96} rx={11} ry={15} fill={C.skin} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <ellipse cx={236} cy={96} rx={11} ry={15} fill={C.skin} stroke={C.ink} strokeWidth={STROKE_THIN} />
          {/* neck */}
          <rect x={150} y={132} width={40} height={38} rx={10} fill={C.skinShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <rect
            x={108}
            y={36}
            width={124}
            height={112}
            rx={50}
            fill={C.skin}
            stroke={C.ink}
            strokeWidth={STROKE}
          />
          {/* hair: a bad morning */}
          <path
            d="M 110 78 Q 106 34 148 26 Q 162 14 180 24 Q 222 26 230 72 Q 216 52 196 54 Q 170 40 148 56 Q 124 58 110 78 Z"
            fill={C.hair}
            stroke={C.ink}
            strokeWidth={STROKE_THIN}
            strokeLinejoin="round"
          />
          <path d="M 152 26 q 6 -14 16 -8" fill="none" stroke={C.hair} strokeWidth={7} strokeLinecap="round" />

          {/* eyes */}
          <ellipse cx={145} cy={96} rx={12} ry={13} fill={C.white} stroke={C.ink} strokeWidth={2.6} />
          <ellipse cx={195} cy={96} rx={12} ry={13} fill={C.white} stroke={C.ink} strokeWidth={2.6} />
          <circle cx={145 + p.headTurn * 7.5} cy={96} r={5.8} fill={C.ink} />
          <circle cx={195 + p.headTurn * 7.5} cy={96} r={5.8} fill={C.ink} />
          {p.eyeLid > 0.02 && (
            <>
              <rect x={132} y={83} width={26} height={26 * p.eyeLid} fill={C.skin} stroke="none" />
              <rect x={182} y={83} width={26} height={26 * p.eyeLid} fill={C.skin} stroke="none" />
            </>
          )}

          {/* THE EYEBROWS -- half his performance lives here */}
          <g>
            <rect
              x={126}
              y={browY}
              width={40}
              height={13}
              rx={6.5}
              fill={C.hair}
              transform={`rotate(${-browRot} 146 ${browY + 6})`}
            />
            <rect
              x={174}
              y={browY}
              width={40}
              height={13}
              rx={6.5}
              fill={C.hair}
              transform={`rotate(${browRot} 194 ${browY + 6})`}
            />
          </g>

          {/* nose + mouth */}
          <path d="M 170 100 q -7 14 3 18" fill="none" stroke={C.skinShade} strokeWidth={4} strokeLinecap="round" />
          <g transform="translate(170 130)">
            <path d={m.d} fill={m.fill} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
            {(p.mouth === 'talk' || p.mouth === 'wide') && p.mouthOpen > 0.35 && (
              <ellipse cx={0} cy={9 + p.mouthOpen * 7} rx={9} ry={4 + p.mouthOpen * 3} fill="#a4575f" />
            )}
          </g>
          {/* five o'clock shadow across the jaw -- flat, so it never reads as a smile */}
          <path
            d="M 122 116 Q 170 150 218 116 L 218 132 Q 170 156 122 132 Z"
            fill={C.hair}
            opacity={0.11}
          />
        </g>

        {/* near arm, screen-left: the open palm, or the spoon. The performance. */}
        <Arm at={SHOULDER_L} arm={p.lArm}>
          {p.spoon ? <Spoon /> : <DaleHand open={1} />}
        </Arm>
      </g>
    </svg>
  );
};
