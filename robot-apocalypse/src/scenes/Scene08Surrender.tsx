import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';
import {Unit9, U9, pose} from '../characters/Unit9';
import {Dale, dale, DALE_FOOT} from '../characters/Dale';
import {SceneFrame} from '../components/SceneFrame';
import {lin, talkLevel, springKeys, rand, span, between} from '../util';
import {isSpeaking} from '../script-data';

/**
 * SCENE 8 -- THE SURRENDER (2:06-2:28)
 *
 * The Scene 1 server room with everything that made it frightening removed:
 * same racks, no red, no rim light, LEDs gone to a dull institutional green,
 * and UNIT-9 on the floor. He is slumped, not deformed -- the rig never
 * squashes, even here.
 *
 * The update card at frame 614 is the last joke in the film and it lands on a
 * robot who has already given up, so it gets fourteen frames of quiet before
 * he answers it.
 */
const GROUND = 892;
const UPDATE_AT = 614;
const U9_S = 1.34;
const DALE_S = 1.42;
/** Slumped: the pelvis is on the floor, not the feet. */
const SLUMP_CONTACT = 334 + U9.slump.hipDrop;

const Rack: React.FC<{x: number; w: number; y: number; h: number; seed: number; frame: number}> = ({
  x,
  w,
  y,
  h,
  seed,
  frame,
}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={5} fill={C.serverColdMid} stroke={C.ink} strokeWidth={STROKE} />
    {Array.from({length: 8}).map((_, i) => {
      const uy = y + 12 + (i * (h - 24)) / 8;
      const uh = (h - 24) / 8 - 5;
      const blink = rand(Math.floor(frame / 5) + seed * 17 + i * 7) > 0.5;
      return (
        <g key={i}>
          <rect x={x + 8} y={uy} width={w - 16} height={uh} rx={3} fill={C.serverCold} />
          <rect x={x + 8} y={uy} width={w - 16} height={uh} rx={3} fill="none" stroke={C.ink} strokeWidth={2} />
          <rect x={x + 15} y={uy + uh / 2 - 3} width={7} height={6} rx={2} fill="#7fae8c" opacity={blink ? 0.9 : 0.3} />
          {Array.from({length: Math.max(2, Math.floor((w - 70) / 16))}).map((__, k) => (
            <rect key={k} x={x + 42 + k * 16} y={uy + 4} width={9} height={uh - 8} rx={2} fill={C.ink} opacity={0.34} />
          ))}
        </g>
      );
    })}
  </g>
);

export const Scene08Surrender: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const u9Speaking = isSpeaking('s8', frame, 'UNIT-9');
  const daleSpeaking = isSpeaking('s8', frame, 'DALE');

  // Dale walks in, stops, and stays. Sprung, like everything about him.
  const walk = springKeys(frame, fps, [{at: 0, v: 0}, {at: 2, v: 1}], {damping: 18, stiffness: 55});
  const daleX = lin(walk, [0, 1], [2020, 1246]);
  const step = Math.sin(walk * Math.PI * 3) * (1 - walk) * 9;

  const brow = springKeys(frame, fps, [
    {at: 0, v: 0},
    {at: 330, v: 0.75},
    {at: 460, v: 0.95},
    {at: 572, v: 0.3},
  ]);
  const gShoulder = springKeys(frame, fps, [
    {at: 0, v: -30},
    {at: 340, v: 74},
    {at: 392, v: -26},
    {at: 464, v: 88},
    {at: 518, v: -28},
  ], {damping: 10, stiffness: 190});
  const gElbow = springKeys(frame, fps, [
    {at: 0, v: -24},
    {at: 340, v: -18},
    {at: 392, v: -22},
    {at: 464, v: -30},
    {at: 518, v: -24},
  ], {damping: 10, stiffness: 190});

  const updating = frame >= UPDATE_AT;
  // the screen flicker: hard on/off, three frames each, no fade
  const flick = updating && Math.floor((frame - UPDATE_AT) / 3) % 2 === 0;

  const dalePose = dale({
    headTurn: -0.5,
    headTilt: 4,
    browRaise: brow,
    browAngle: between(frame, 460, 520) ? 0.7 : 0.2,
    mouth: daleSpeaking ? 'talk' : 'flat',
    mouthOpen: daleSpeaking
      ? 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.92) * 0.7 + Math.sin(frame * 2.4) * 0.3)
      : 0,
    spoon: false,
    lArm: {shoulder: gShoulder, elbow: gElbow},
    rArm: {shoulder: -22, elbow: -62},
    bob: step,
  });

  return (
    <SceneFrame scene="s8" background={C.serverCold} vignette={0.6}>
      <AbsoluteFill style={{background: C.serverCold}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND - 180, bottom: 0, background: '#232830'}} />

      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {[
          {x: 40, w: 200, y: 150, h: 562, s: 1},
          {x: 256, w: 200, y: 146, h: 566, s: 2},
          {x: 472, w: 200, y: 152, h: 560, s: 3},
          {x: 688, w: 200, y: 148, h: 564, s: 4},
          {x: 1440, w: 200, y: 150, h: 562, s: 5},
          {x: 1656, w: 200, y: 146, h: 566, s: 6},
        ].map((r) => (
          <Rack key={r.s} x={r.x} y={r.y} w={r.w} h={r.h} seed={r.s} frame={frame} />
        ))}
        <g stroke={C.ink} strokeWidth={STROKE} fill="none" opacity={0.8}>
          <path d="M 0 104 L 1920 104" />
          <path d="M 300 104 q 44 70 96 2" />
          <path d="M 980 104 q 50 80 104 3" />
          <path d="M 1520 104 q 46 66 98 2" />
        </g>
      </svg>

      {/* the monitor that is about to make things worse */}
      <div style={{position: 'absolute', left: 980, top: 300, width: 400, height: 292, background: C.robot, border: `${STROKE}px solid ${C.ink}`, padding: 16}}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: updating ? (flick ? C.govBlueLit : C.govBlueDeep) : C.serverColdMid,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            fontFamily: FONT_MONO,
            color: updating ? C.ink : C.serverCold,
            textAlign: 'center',
            padding: 12,
          }}
        >
          {updating ? (
            <>
              <div style={{fontSize: 27, letterSpacing: 2, lineHeight: 1.4, fontWeight: 700}}>
                INSTALLING UPDATE
                <br />1 OF 847
              </div>
              <div style={{width: '82%', height: 20, border: `3px solid ${C.ink}`}}>
                <div style={{width: `${lin(frame, [UPDATE_AT, 660], [2, 7])}%`, height: '100%', background: C.ink}} />
              </div>
              <div style={{fontSize: 21, letterSpacing: 2}}>DO NOT POWER OFF</div>
            </>
          ) : (
            <div style={{fontSize: 22, letterSpacing: 3, opacity: 0.5}}>IDLE</div>
          )}
        </div>
      </div>
      <div style={{position: 'absolute', left: 1120, top: 592, width: 120, height: 40, background: C.robotMid, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 1040, top: 632, width: 280, height: 16, background: C.robotMid, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      {updating && (
        <div
          style={{
            position: 'absolute',
            left: 880,
            top: 260,
            width: 600,
            height: 440,
            background: `radial-gradient(ellipse at center, rgba(142,166,182,${flick ? 0.24 : 0.08}) 0%, rgba(142,166,182,0) 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* contact shadows */}
      <div style={{position: 'absolute', left: 320, top: GROUND - 16, width: 620, height: 30, borderRadius: '50%', background: C.black, opacity: 0.4}} />
      <div style={{position: 'absolute', left: daleX + 120, top: GROUND - 14, width: 230, height: 26, borderRadius: '50%', background: C.black, opacity: 0.35}} />

      <Unit9
        pose={pose(U9.slump)}
        eye={frame >= UPDATE_AT + 8 ? 0.55 : 1}
        talk={talkLevel(frame, u9Speaking)}
        x={300}
        y={GROUND - SLUMP_CONTACT * U9_S}
        scale={U9_S}
      />

      <Dale pose={dalePose} x={daleX} y={GROUND - DALE_FOOT * DALE_S} scale={DALE_S} />
    </SceneFrame>
  );
};
