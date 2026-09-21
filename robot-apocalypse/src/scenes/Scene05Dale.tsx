import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS} from '../theme';
import {Unit9, U9, lerpPose, U9_FOOT} from '../characters/Unit9';
import {Dale, dale, DALE_FOOT} from '../characters/Dale';
import {SceneFrame} from '../components/SceneFrame';
import {lin, talkLevel, springKeys, rand, span, between, type Key} from '../util';
import {isSpeaking} from '../script-data';

/**
 * SCENE 5 -- DALE (1:00-1:31)
 *
 * The spine of the film. Two rules, both from the brief, both load-bearing:
 *
 *  1. HOLD ON THE ROBOT, NOT ON DALE. UNIT-9 never gets a reaction shot longer
 *     than 12 frames, and he is on screen, motionless, through every one of
 *     Dale's pauses. The stillness is what makes Dale funny.
 *  2. Dale never answers quickly. Frames 202-346 contain no dialogue at all:
 *     he looks at the door, then the robot, then the door again, and only then
 *     does he say anything. Do not tighten this.
 *
 * And the door really is open before it is kicked. Frames 0-16 exist so the
 * audience can see the hallway through it.
 */
const GROUND = 832;
const KICK = 16;

const U9_SCALE = 1.5;
const DALE_SCALE = 1.5;

/** Doorway hole in the wall. */
const DOOR = {x: 96, y: 292, w: 344, h: GROUND - 292};

/**
 * Eating: spoon down, spoon to mouth, repeat, on springs. He keeps doing this
 * straight through UNIT-9's entrance and his entire opening threat.
 */
const EAT_KEYS: Key[] = Array.from({length: 8}).map((_, i) => ({
  at: i * 30,
  v: i % 2 ? 1 : 0,
}));

const SPLINTERS = Array.from({length: 16}).map((_, i) => ({
  a: -Math.PI * (0.12 + rand(i) * 0.62),
  d: 120 + rand(i + 31) * 560,
  w: 10 + rand(i + 60) * 26,
  h: 5 + rand(i + 90) * 9,
  spin: (rand(i + 120) - 0.5) * 900,
}));

const Doorway: React.FC<{frame: number}> = ({frame}) => {
  const hit = frame >= KICK;
  const burst = span(frame, KICK, KICK + 30);

  // Before the kick it stands open against the inside wall. After, it is off
  // its top hinge and leaning across the gap.
  const lean = hit ? lin(frame, [KICK, KICK + 9], [0, 23]) : 0;
  const sag = hit ? lin(frame, [KICK, KICK + 9], [0, 38]) : 0;
  // it swings as it goes, turning its face toward us
  const doorW = hit ? lin(frame, [KICK, KICK + 9], [78, 156]) : 78;

  return (
    <>
      {/* the hallway beyond -- bright, so he reads as a silhouette in it */}
      <div
        style={{
          position: 'absolute',
          left: DOOR.x,
          top: DOOR.y,
          width: DOOR.w,
          height: DOOR.h,
          background: C.fluoroLit,
          borderLeft: `${STROKE}px solid ${C.ink}`,
          borderTop: `${STROKE}px solid ${C.ink}`,
          borderRight: `${STROKE}px solid ${C.ink}`,
        }}
      >
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.white} 0%, ${C.fluoroDeep} 100%)`}} />
        <div style={{position: 'absolute', left: 40, top: 0, width: 72, height: '100%', background: C.white, opacity: 0.8}} />
      </div>

      {/* light thrown into the room through the open door */}
      <div
        style={{
          position: 'absolute',
          left: DOOR.x,
          top: DOOR.y,
          width: 900,
          height: DOOR.h + 60,
          background: `linear-gradient(100deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 62%)`,
          pointerEvents: 'none',
        }}
      />

      {/* architrave */}
      <div
        style={{
          position: 'absolute',
          left: DOOR.x - 26,
          top: DOOR.y - 26,
          width: DOOR.w + 52,
          height: DOOR.h + 26,
          border: `${STROKE}px solid ${C.ink}`,
          borderBottom: 'none',
          background: 'transparent',
          boxShadow: `inset 0 0 0 20px ${C.beigeDeep}`,
        }}
      />

      {/* THE DOOR. Standing open at frame 0. Kicked anyway at frame 16. */}
      <svg
        width={520}
        height={700}
        style={{position: 'absolute', left: DOOR.x - 40, top: DOOR.y - 20, overflow: 'visible'}}
      >
        <g transform={`translate(44 ${20 + sag}) rotate(${lean} 8 ${DOOR.h})`}>
          <rect
            x={0}
            y={0}
            width={doorW}
            height={DOOR.h}
            fill={C.beigeDeep}
            stroke={C.ink}
            strokeWidth={STROKE}
          />
          <rect x={doorW * 0.18} y={40} width={doorW * 0.62} height={190} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <rect x={doorW * 0.18} y={268} width={doorW * 0.62} height={230} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <circle cx={doorW - 18} cy={262} r={11} fill={C.beigeLit} stroke={C.ink} strokeWidth={STROKE_THIN} />
          {/* the top hinge, which is now a suggestion */}
          {hit && <rect x={-8} y={10} width={24} height={44} rx={4} fill={C.beigeShade} stroke={C.ink} strokeWidth={2.5} transform="rotate(-28 4 32)" />}
        </g>
      </svg>

      {/* what used to be the frame */}
      {burst > 0 &&
        SPLINTERS.map((sp, i) => {
          const p = Math.min(1, burst * (0.65 + rand(i + 7) * 0.7));
          const x = DOOR.x + 120 + Math.cos(sp.a) * sp.d * p;
          const y = DOOR.y + 340 + Math.sin(sp.a) * sp.d * p + p * p * 520;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: Math.min(x, 1880),
                top: Math.min(y, GROUND - sp.h),
                width: sp.w,
                height: sp.h,
                background: C.beigeShade,
                border: `2px solid ${C.ink}`,
                transform: `rotate(${sp.spin * p}deg)`,
              }}
            />
          );
        })}

      {/* impact dust */}
      {between(frame, KICK, KICK + 26) &&
        [0, 1, 2].map((i) => {
          const p = span(frame, KICK + i * 3, KICK + 26);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: DOOR.x + 40 + i * 70 - p * 120,
                top: GROUND - 150 - i * 40 - p * 60,
                width: 130 + p * 260,
                height: 130 + p * 260,
                borderRadius: '50%',
                background: C.beigeShade,
                opacity: 0.5 * (1 - p),
              }}
            />
          );
        })}
    </>
  );
};

export const Scene05Dale: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ---------------------------------------------------------------- UNIT-9
  // Kick, then step into the room, then absolute stillness. Linear throughout.
  const kickT = lin(frame, [0, KICK], [0, 1]);
  const recover = lin(frame, [KICK + 2, KICK + 16], [0, 1]);
  const step = lin(frame, [40, 62], [0, 1]);
  const pose =
    frame < KICK
      ? lerpPose(U9.idle, U9.kick, kickT)
      : lerpPose(U9.kick, U9.idle, recover);
  const u9x = lin(step, [0, 1], [140, 690]);
  const u9Speaking = isSpeaking('s5', frame, 'UNIT-9');

  // ---------------------------------------------------------------- DALE
  // Every value below is sprung. He is the only one in the film who overshoots.
  const daleSpeaking = isSpeaking('s5', frame, 'DALE');

  const headTurn = springKeys(frame, fps, [
    {at: 0, v: 0.2},      // down in the bowl
    {at: 230, v: -1.05},  // ...the door
    {at: 260, v: -0.5},   // ...the robot
    {at: 304, v: -1.05},  // ...the door again
    {at: 334, v: -0.55},  // back to the robot, and only now does he speak
  ]);
  const headTilt = springKeys(frame, fps, [
    {at: 0, v: 12},
    {at: 230, v: -6},
    {at: 260, v: 0},
    {at: 304, v: -6},
    {at: 334, v: 2},
    {at: 460, v: -4},
  ]);
  const lean = springKeys(frame, fps, [
    {at: 0, v: 0},
    {at: 230, v: -5},
    {at: 260, v: 0},
    {at: 304, v: -5},
    {at: 334, v: 0},
  ]);
  const brow = springKeys(
    frame,
    fps,
    [
      {at: 0, v: 0},
      {at: 260, v: 0.35},
      {at: 346, v: 0.55},
      {at: 460, v: 1},
      {at: 612, v: 0.45},
      {at: 738, v: 0.9},
      {at: 858, v: 0.3},
    ],
    {damping: 9},
  );
  const browAngle = springKeys(frame, fps, [
    {at: 0, v: -0.1},
    {at: 260, v: 0.5},
    {at: 460, v: 0.85},
    {at: 612, v: -0.5},
    {at: 738, v: 0.7},
    {at: 858, v: -0.6},
  ]);

  const eatPhase = frame < 206 ? springKeys(frame, fps, EAT_KEYS, {damping: 13, stiffness: 120}) : 0;

  // the gesturing arm: rest, then the open palm, then the spoon at the door
  const gShoulder = springKeys(
    frame,
    fps,
    [
      {at: 0, v: -30},
      {at: 460, v: 88},
      {at: 520, v: 74},
      {at: 592, v: 30},
      {at: 738, v: 60},
      {at: 790, v: 28},
      {at: 858, v: 96},
    ],
    {damping: 10, stiffness: 190},
  );
  const gElbow = springKeys(
    frame,
    fps,
    [
      {at: 0, v: -24},
      {at: 460, v: -26},
      {at: 520, v: -6},
      {at: 592, v: 62},
      {at: 738, v: 10},
      {at: 790, v: 70},
      {at: 858, v: -34},
    ],
    {damping: 10, stiffness: 190},
  );

  // spoon in hand while eating, and again for the final gesture at the door
  const spoon = frame < 230 || frame >= 858;
  const eating = frame < 202;
  const mouthOpen = daleSpeaking
    ? 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.9) * 0.7 + Math.sin(frame * 2.4) * 0.3)
    : eating
      ? 0.5 + 0.5 * Math.sin(frame * 0.35)
      : 0;

  // while he is eating, the arm runs the spoon cycle instead of the gestures
  // -30/-24 puts the spoon in the bowl; -64/-56 puts it at his mouth
  const armShoulder = eating ? -30 - eatPhase * 34 : gShoulder;
  const armElbow = eating ? -24 - eatPhase * 32 : gElbow;

  const dalePose = dale({
    headTurn,
    headTilt,
    lean,
    browRaise: brow,
    browAngle,
    mouth: daleSpeaking ? (between(frame, 460, 592) ? 'wide' : 'talk') : eating ? 'chew' : 'flat',
    mouthOpen,
    spoon,
    // near arm gestures; far arm holds the bowl and stays put
    lArm: {shoulder: armShoulder, elbow: armElbow},
    rArm: {shoulder: -22, elbow: -62},
    bob: springKeys(frame, fps, [
      {at: 0, v: 0},
      {at: 230, v: -6},
      {at: 334, v: 0},
    ]),
  });

  return (
    <SceneFrame scene="s5" background={C.beige} vignette={0.26}>
      <AbsoluteFill style={{background: C.beige}} />
      {/* floor */}
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND, bottom: 0, background: C.beigeDeep}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND, height: 6, background: C.ink, opacity: 0.5}} />

      {/* kitchen run along the back wall */}
      <div style={{position: 'absolute', left: 560, top: 606, width: 1340, height: 22, background: C.beigeLit, border: `${STROKE}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 578, top: 628, width: 1304, height: GROUND - 628, background: C.beigeDeep, borderLeft: `${STROKE}px solid ${C.ink}`, borderRight: `${STROKE}px solid ${C.ink}`}} />
      {[640, 900, 1160, 1420, 1680].map((lx) => (
        <div key={lx} style={{position: 'absolute', left: lx, top: 652, width: 190, height: 148, background: C.beige, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      ))}
      {/* upper cabinets */}
      <div style={{position: 'absolute', left: 1000, top: 218, width: 880, height: 226, background: C.beigeDeep, border: `${STROKE}px solid ${C.ink}`}} />
      {[1020, 1240, 1460, 1680].map((lx) => (
        <div key={lx} style={{position: 'absolute', left: lx, top: 234, width: 184, height: 192, background: C.beige, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      ))}
      {/* the only decoration in this man's life */}
      <div
        style={{
          position: 'absolute',
          left: 476,
          top: 286,
          width: 250,
          height: 172,
          background: C.beigeLit,
          border: `${STROKE}px solid ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_SANS,
          fontSize: 23,
          letterSpacing: 3,
          color: C.beigeShade,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        LIVE
        <br />
        LAUGH
        <br />
        LOVE
      </div>

      <Doorway frame={frame} />

      {/* contact shadows */}
      <div style={{position: 'absolute', left: u9x + 90, top: GROUND - 16, width: 220, height: 30, borderRadius: '50%', background: C.ink, opacity: 0.2}} />
      <div style={{position: 'absolute', left: 1340, top: GROUND - 16, width: 250, height: 30, borderRadius: '50%', background: C.ink, opacity: 0.2}} />

      <Unit9
        pose={pose}
        eye={1}
        talk={talkLevel(frame, u9Speaking)}
        x={u9x}
        y={GROUND - U9_FOOT * U9_SCALE}
        scale={U9_SCALE}
      />

      <Dale
        pose={dalePose}
        x={1218}
        y={GROUND - DALE_FOOT * DALE_SCALE}
        scale={DALE_SCALE}
      />
    </SceneFrame>
  );
};
