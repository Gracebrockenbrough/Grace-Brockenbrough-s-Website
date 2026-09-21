import React, {useId} from 'react';
import {C, STROKE, STROKE_THIN} from '../theme';

/**
 * UNIT-9. The straight man.
 *
 * Rig notes:
 *  - Everything is a joint angle in degrees. Scenes drive these with plain
 *    linear `interpolate` calls. He must never be animated with `spring`, and
 *    he must never be scaled non-uniformly -- no squash, no stretch, ever.
 *  - He is the only glossy black object in the film, which is why the gloss
 *    highlights live in here rather than in a scene.
 *  - HANDS HAVE FOUR FINGERS AND NO THUMB. Both edges of the palm are dead
 *    straight. This is a plot point in Scenes 4 and 8, so it has to read at
 *    full-body size as well as in close-up.
 */
export type Unit9Pose = {
  lean: number;
  headTilt: number;
  headTurn: number;
  headDrop: number;
  lShoulder: number;
  lElbow: number;
  rShoulder: number;
  rElbow: number;
  lHip: number;
  lKnee: number;
  rHip: number;
  rKnee: number;
  hipDrop: number;
};

const base: Unit9Pose = {
  lean: 0,
  headTilt: 0,
  headTurn: 0,
  headDrop: 0,
  lShoulder: 0,
  lElbow: 0,
  rShoulder: 0,
  rElbow: 0,
  lHip: 0,
  lKnee: 0,
  rHip: 0,
  rKnee: 0,
  hipDrop: 0,
};

/**
 * Pose presets.
 *
 * ANGLE CONVENTION -- screen space, not anatomy. A limb hangs straight down at
 * 0. A POSITIVE angle swings it toward screen-LEFT, negative toward
 * screen-RIGHT, exactly like a raw SVG `rotate()`. Elbow and knee angles are
 * relative to the segment above them, so the forearm's true screen angle is
 * `shoulder + elbow`. Getting a forearm horizontal pointing screen-right means
 * shoulder + elbow = -90.
 */
export const U9 = {
  /** Neutral standing. Arms hang. This is his resting state and his mood. */
  idle: {...base, lShoulder: 5, rShoulder: -5},
  /** Scene 1. Shoulders squared, arms held slightly off the body. */
  menace: {...base, lShoulder: 13, rShoulder: -13},
  /** Both forearms horizontal, converging on a keyboard in front of him. */
  typing: {
    ...base,
    lShoulder: -30,
    lElbow: -60,
    rShoulder: 30,
    rElbow: 60,
    headTilt: 4,
    headDrop: 5,
  },
  /** Right arm out, forearm horizontal to screen-right: press, click, point. */
  reachR: {...base, lShoulder: 6, rShoulder: -60, rElbow: -30},
  /** Right forearm folded up beside the head, holding a handset. */
  phone: {...base, lShoulder: 8, rShoulder: 10, rElbow: -180, headTilt: -2},
  /** Seated facing screen-right: thighs forward, shins down. */
  sit: {
    ...base,
    hipDrop: 92,
    lHip: -80,
    lKnee: 78,
    rHip: -76,
    rKnee: 74,
    lShoulder: 8,
    rShoulder: -8,
  },
  /** Scene 5 doorway: mid-kick to screen-right, trailing leg planted. */
  kick: {
    ...base,
    lean: 6,
    lHip: 4,
    lKnee: -2,
    rHip: -64,
    rKnee: 16,
    lShoulder: 30,
    rShoulder: -28,
    rElbow: -22,
  },
  /** Scene 8: on the floor, legs out flat to screen-right. Defeated, not deformed. */
  slump: {
    ...base,
    hipDrop: 172,
    lean: -9,
    headTilt: -8,
    headDrop: 12,
    lHip: -92,
    lKnee: -6,
    rHip: -88,
    rKnee: -4,
    lShoulder: 26,
    lElbow: -22,
    rShoulder: -24,
    rElbow: 20,
  },
} satisfies Record<string, Unit9Pose>;

/** Linear blend between two poses. Linear on purpose -- he has no ease. */
export const lerpPose = (a: Unit9Pose, b: Unit9Pose, t: number): Unit9Pose => {
  const out = {} as Unit9Pose;
  (Object.keys(base) as Array<keyof Unit9Pose>).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
};

export const pose = (p: Partial<Unit9Pose>): Unit9Pose => ({...base, ...p});

/**
 * Distance from the top of the viewBox to the soles of his feet, in viewBox
 * units. Place him with `y = groundY - U9_FOOT * scale` and he stands on the
 * floor instead of hovering near it.
 */
export const U9_FOOT = 492;

// ---------------------------------------------------------------- geometry
const SHOULDER_L = {x: 97, y: 182};
const SHOULDER_R = {x: 223, y: 182};
const UPPER_ARM = 76;
const FOREARM = 64;
const HIP_L = {x: 133, y: 316};
const HIP_R = {x: 187, y: 316};
const THIGH = 80;
const SHIN = 74;

/**
 * The hand. Four fingers, no thumb, straight palm edges.
 * Exported on its own so Scene 4 can push in on it at poster size.
 */
export const Unit9Hand: React.FC<{
  /** 0 = flat fingers, 1 = curled into a grip. */
  grip?: number;
  scale?: number;
}> = ({grip = 0, scale = 1}) => {
  const fingerLen = 26 - 13 * grip;
  const bend = 12 * grip;
  return (
    <g transform={`scale(${scale})`}>
      {/* palm -- note both left and right edges are straight lines */}
      <rect
        x={-19}
        y={0}
        width={38}
        height={30}
        rx={7}
        fill={C.robotGloss}
        stroke={C.ink}
        strokeWidth={STROKE}
      />
      {[-13.5, -4.5, 4.5, 13.5].map((fx, i) => (
        <rect
          key={i}
          x={fx - 3.6}
          y={26 - bend}
          width={7.2}
          height={fingerLen + 6}
          rx={3.4}
          fill={C.robotMid}
          stroke={C.ink}
          strokeWidth={STROKE_THIN}
        />
      ))}
      {/* knuckle seam */}
      <line
        x1={-13}
        y1={9}
        x2={13}
        y2={9}
        stroke={C.robotSeam}
        strokeWidth={STROKE_THIN}
        strokeLinecap="round"
      />
      {/* gloss */}
      <rect x={-15} y={4} width={9} height={17} rx={4} fill={C.robotGloss} opacity={0.65} />
    </g>
  );
};

const Arm: React.FC<{
  at: {x: number; y: number};
  shoulder: number;
  elbow: number;
  grip: number;
}> = ({at, shoulder, elbow, grip}) => (
  <g transform={`translate(${at.x} ${at.y}) rotate(${shoulder})`}>
    <rect
      x={-13}
      y={-6}
      width={26}
      height={UPPER_ARM + 10}
      rx={12}
      fill={C.robotMid}
      stroke={C.ink}
      strokeWidth={STROKE}
    />
    <rect x={-9} y={2} width={7} height={UPPER_ARM - 18} rx={3.5} fill={C.robotGloss} opacity={0.5} />
    <g transform={`translate(0 ${UPPER_ARM}) rotate(${elbow})`}>
      <circle r={13} fill={C.robot} stroke={C.ink} strokeWidth={STROKE_THIN} />
      <rect
        x={-11}
        y={-4}
        width={22}
        height={FOREARM + 8}
        rx={10}
        fill={C.robot}
        stroke={C.ink}
        strokeWidth={STROKE}
      />
      <rect x={-7.5} y={4} width={6} height={FOREARM - 20} rx={3} fill={C.robotGloss} opacity={0.42} />
      <g transform={`translate(0 ${FOREARM + 2})`}>
        <Unit9Hand grip={grip} />
      </g>
    </g>
  </g>
);

const Leg: React.FC<{
  at: {x: number; y: number};
  hip: number;
  knee: number;
  flip?: boolean;
}> = ({at, hip, knee, flip}) => (
  <g transform={`translate(${at.x} ${at.y}) rotate(${hip})`}>
    <rect
      x={-19}
      y={-10}
      width={38}
      height={THIGH + 16}
      rx={17}
      fill={C.robotMid}
      stroke={C.ink}
      strokeWidth={STROKE}
    />
    <g transform={`translate(0 ${THIGH}) rotate(${knee})`}>
      <circle r={17} fill={C.robot} stroke={C.ink} strokeWidth={STROKE_THIN} />
      <rect
        x={-16}
        y={-5}
        width={32}
        height={SHIN + 10}
        rx={14}
        fill={C.robot}
        stroke={C.ink}
        strokeWidth={STROKE}
      />
      <rect x={-11} y={6} width={7.5} height={SHIN - 24} rx={3.5} fill={C.robotGloss} opacity={0.45} />
      {/* foot wedge */}
      <path
        d={
          flip
            ? `M 15 ${SHIN - 4} L -40 ${SHIN + 2} Q -48 ${SHIN + 6} -47 ${SHIN + 22} L 16 ${SHIN + 22} Z`
            : `M -15 ${SHIN - 4} L 40 ${SHIN + 2} Q 48 ${SHIN + 6} 47 ${SHIN + 22} L -16 ${SHIN + 22} Z`
        }
        fill={C.robotMid}
        stroke={C.ink}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </g>
  </g>
);

const BODY_SILHOUETTE =
  'M 96 186 Q 96 160 122 158 L 198 158 Q 224 160 224 186 L 214 292 ' +
  'Q 212 322 196 326 L 124 326 Q 108 322 106 292 Z';

export const Unit9: React.FC<{
  pose?: Unit9Pose;
  /** Eye-bar brightness, 0..1. */
  eye?: number;
  /** 0..1 speech level. Drives the tick row under the jaw vent. */
  talk?: number;
  /** Scene 1 ONLY. The menace has a rim light; nothing after Scene 1 does. */
  rim?: number;
  grip?: number;
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  /** Render as a flat silhouette (doorway reveal, montage inserts). */
  silhouette?: boolean;
  opacity?: number;
}> = ({
  pose: p = U9.idle,
  eye = 1,
  talk = 0,
  rim = 0,
  grip = 0,
  x = 0,
  y = 0,
  scale = 1,
  flip = false,
  silhouette = false,
  opacity = 1,
}) => {
  const uid = useId().replace(/:/g, '');
  const eyeId = `eye-${uid}`;
  const rimId = `rim-${uid}`;
  const glossId = `gloss-${uid}`;

  const body = (
    <>
      {/* far leg + far arm behind the torso */}
      <Leg at={HIP_R} hip={p.rHip} knee={p.rKnee} />
      <Arm at={SHOULDER_R} shoulder={p.rShoulder} elbow={p.rElbow} grip={grip} />

      <g transform={`rotate(${p.lean} 160 318)`}>
        <path
          d={BODY_SILHOUETTE}
          fill={C.robot}
          stroke={C.ink}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
        {!silhouette && (
          <>
            <path d={BODY_SILHOUETTE} fill={`url(#${glossId})`} opacity={0.9} />
            {/* chest seam + vent */}
            <line
              x1={160}
              y1={168}
              x2={160}
              y2={300}
              stroke={C.robotSeam}
              strokeWidth={STROKE_THIN}
            />
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={126}
                y={236 + i * 13}
                width={28}
                height={5}
                rx={2.5}
                fill={C.robotSeam}
                opacity={0.9}
              />
            ))}
            <rect
              x={176}
              y={202}
              width={26}
              height={18}
              rx={4}
              fill={C.robotMid}
              stroke={C.robotSeam}
              strokeWidth={2.5}
            />
          </>
        )}

        {/* pelvis */}
        <rect
          x={120}
          y={300}
          width={80}
          height={34}
          rx={13}
          fill={C.robotMid}
          stroke={C.ink}
          strokeWidth={STROKE}
        />

        {/* neck + head */}
        <g transform={`translate(0 ${p.headDrop})`}>
          <rect
            x={145}
            y={138}
            width={30}
            height={26}
            rx={7}
            fill={C.robotMid}
            stroke={C.ink}
            strokeWidth={STROKE_THIN}
          />
          <g transform={`rotate(${p.headTilt} 160 142) translate(${p.headTurn} 0)`}>
            <rect
              x={112}
              y={58}
              width={96}
              height={84}
              rx={28}
              fill={C.robot}
              stroke={C.ink}
              strokeWidth={STROKE}
            />
            {!silhouette && (
              <>
                <rect
                  x={112}
                  y={58}
                  width={96}
                  height={84}
                  rx={28}
                  fill={`url(#${glossId})`}
                  opacity={0.85}
                />
                {/* eye-bar recess */}
                <rect
                  x={120}
                  y={84}
                  width={80}
                  height={26}
                  rx={10}
                  fill={C.robotSeam}
                  stroke={C.ink}
                  strokeWidth={2.5}
                />
                {eye > 0.01 && (
                  <g filter={`url(#${eyeId})`} opacity={eye}>
                    <rect x={127} y={90} width={66} height={14} rx={7} fill={C.eye} />
                  </g>
                )}
                {eye > 0.01 && (
                  <>
                    <rect
                      x={127}
                      y={90}
                      width={66}
                      height={14}
                      rx={7}
                      fill={C.eye}
                      opacity={eye}
                    />
                    <rect
                      x={131}
                      y={93.5}
                      width={58}
                      height={6}
                      rx={3}
                      fill={C.eyeCore}
                      opacity={eye}
                    />
                  </>
                )}
                {/* jaw vent */}
                <rect x={138} y={122} width={44} height={6} rx={3} fill={C.robotSeam} />
                {/*
                  Speaking indicator. He has no mouth, so the fact that he is
                  talking has to be visible some other way for a muted viewer.
                  Level is passed in per frame; the tick pattern is fixed.
                */}
                {talk > 0.01 &&
                  [0.55, 1, 0.7, 1, 0.45].map((k, i) => {
                    const h = 3 + talk * k * 11;
                    return (
                      <rect
                        key={i}
                        x={140 + i * 8.6}
                        y={132 - h / 2}
                        width={5}
                        height={h}
                        rx={2.5}
                        fill={C.eye}
                        opacity={0.55 + 0.45 * talk}
                      />
                    );
                  })}
              </>
            )}
          </g>
        </g>
      </g>

      {/* near leg + near arm in front */}
      <Leg at={HIP_L} hip={p.lHip} knee={p.lKnee} flip />
      <Arm at={SHOULDER_L} shoulder={p.lShoulder} elbow={p.lElbow} grip={grip} />
    </>
  );

  return (
    <svg
      viewBox="0 0 320 540"
      width={320 * scale}
      height={540 * scale}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        overflow: 'visible',
        transform: flip ? 'scaleX(-1)' : undefined,
        opacity,
      }}
    >
      <defs>
        <filter id={eyeId} x="-160%" y="-600%" width="420%" height="1300%">
          <feGaussianBlur stdDeviation="11" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
          </feMerge>
        </filter>
        <filter id={rimId} x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <linearGradient id={glossId} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={C.robotSpec} stopOpacity="0.5" />
          <stop offset="34%" stopColor={C.robotGloss} stopOpacity="0.22" />
          <stop offset="58%" stopColor={C.robot} stopOpacity="0" />
          <stop offset="100%" stopColor={C.robotSpec} stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/*
        Scene 1's rim light: the whole silhouette redrawn in red, blurred and
        pushed up-left so it reads as an edge. Never enabled after Scene 1.
      */}
      {rim > 0.01 && (
        <g
          opacity={rim}
          filter={`url(#${rimId})`}
          transform="translate(-7 -5)"
          style={{mixBlendMode: 'screen'}}
        >
          <g fill={C.rimRed} stroke={C.rimRed} strokeWidth={10}>
            {body}
          </g>
        </g>
      )}
      {body}
    </svg>
  );
};
