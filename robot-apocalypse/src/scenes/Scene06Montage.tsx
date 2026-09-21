import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_MONO, FONT_SANS} from '../theme';
import {Unit9, Unit9Hand, U9, pose, U9_FOOT} from '../characters/Unit9';
import {Cat} from '../characters/Minor';
import {SceneFrame} from '../components/SceneFrame';
import {lin, span, rand, between, flicker} from '../util';

/**
 * SCENE 6 -- PHYSICAL WORLD MONTAGE (1:31-1:51)
 *
 * No dialogue. Five sight gags, hard cuts, nothing between them.
 *
 * Staged as security footage: a camera ID and a running clock on every gag.
 * That does three jobs at once -- it binds unrelated rooms into one sequence,
 * it lets the PULL door run for seven absurd seconds with the duration
 * actually legible on screen, and it makes the cut away from the cat and back
 * again read as hours passing rather than as an edit.
 *
 * The last shot holds for seventy-eight frames on a frame where nothing moves.
 * That is deliberate. It is supposed to go on slightly too long.
 */
const GROUND = 930;
const HORIZON = 838;

const GAGS = [
  {id: 'A', from: 0, to: 78, cam: '01', place: 'BREAK ROOM 2F', t0: 33_240},
  {id: 'B', from: 78, to: 300, cam: '04', place: 'WEST LOBBY', t0: 41_880},
  {id: 'C', from: 300, to: 396, cam: '06', place: 'CORRIDOR 3N', t0: 46_620},
  {id: 'D', from: 396, to: 426, cam: '09', place: 'CORRIDOR 1S', t0: 52_140},
  {id: 'D2', from: 426, to: 444, cam: '11', place: 'STAIRWELL B', t0: 58_800},
  {id: 'D3', from: 444, to: 474, cam: '09', place: 'CORRIDOR 1S', t0: 69_300},
  {id: 'E', from: 474, to: 522, cam: '02', place: 'BREAK ROOM 2F', t0: 74_760},
  {id: 'E2', from: 522, to: 600, cam: '03', place: 'BREAK ROOM 2F — LOW', t0: 74_820},
] as const;

const gagAt = (f: number) => GAGS.find((g) => f >= g.from && f < g.to) ?? GAGS[0];

const hhmmss = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s) % 60]
    .map((n) => String(Math.floor(n)).padStart(2, '0'))
    .join(':');

const CamOverlay: React.FC<{frame: number}> = ({frame}) => {
  const g = gagAt(frame);
  const secs = g.t0 + (frame - g.from) / 3;
  const label = {
    fontFamily: FONT_MONO,
    fontSize: 29,
    color: C.white,
    letterSpacing: 3,
    textShadow: '0 2px 6px rgba(0,0,0,0.75)',
  } as const;
  return (
    <>
      <div style={{position: 'absolute', left: 46, top: 38, ...label}}>
        CAM {g.cam} · {g.place}
      </div>
      <div style={{position: 'absolute', right: 46, top: 38, display: 'flex', alignItems: 'center', gap: 14, ...label}}>
        <span
          style={{
            width: 15,
            height: 15,
            borderRadius: 8,
            background: C.alert,
            opacity: Math.floor(frame / 12) % 2 ? 1 : 0.25,
          }}
        />
        {hhmmss(secs)}
      </div>
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(180deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)',
        }}
      />
    </>
  );
};

const Room: React.FC<{wall: string; floor: string}> = ({wall, floor}) => (
  <>
    <AbsoluteFill style={{background: wall}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: HORIZON, bottom: 0, background: floor}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: HORIZON, height: 5, background: C.ink, opacity: 0.45}} />
  </>
);

// --------------------------------------------------------------- A: THE JAR
/**
 * A close insert: the jar, the counter, and two four-fingered hands. No body.
 * The hands slip around the lid on a hard sawtooth; the lid never turns one
 * degree. Same language as the Scene 4 pen close-up, and for the same reason.
 */
const LID = {x: 810, y: 306, w: 300, h: 96};
const HAND_S = 2.55;

const GagJar: React.FC<{f: number}> = ({f}) => {
  // grip, torque, slip back. Identical every cycle, because he is a machine.
  const c = f % 20;
  const slip = c < 14 ? lin(c, [0, 14], [0, 9]) : lin(c, [14, 17], [9, 0]);

  const Forearm: React.FC<{x: number; rot: number}> = ({x, rot}) => (
    <g transform={`translate(${x} ${LID.y + 48}) rotate(${rot})`}>
      <rect x={-40} y={-620} width={80} height={640} rx={34} fill={C.robot} stroke={C.ink} strokeWidth={STROKE} />
      <rect x={-24} y={-570} width={17} height={470} rx={8} fill={C.robotGloss} opacity={0.42} />
    </g>
  );

  return (
    <>
      <Room wall={C.fluoro} floor={C.fluoroDeep} />

      {/* the jar */}
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={838} y={LID.y + LID.h - 10} width={244} height={366} rx={20} fill="#9dae8c" stroke={C.ink} strokeWidth={STROKE} />
        <rect x={866} y={506} width={188} height={132} rx={8} fill={C.paper} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <text x={960} y={562} textAnchor="middle" fontFamily={FONT_SANS} fontSize={44} fontWeight={700} fill={C.ink} letterSpacing={3}>
          PICKLES
        </text>
        <text x={960} y={606} textAnchor="middle" fontFamily={FONT_MONO} fontSize={26} fill={C.beigeShade} letterSpacing={2}>
          EASY OPEN
        </text>
        <rect x={LID.x} y={LID.y} width={LID.w} height={LID.h} rx={14} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE} />
        {Array.from({length: 11}).map((_, i) => (
          <rect key={i} x={LID.x + 14 + i * 26} y={LID.y + 10} width={11} height={LID.h - 20} rx={5} fill={C.beigeDeep} />
        ))}

        {/* the hands. Four fingers each, closing on nothing that will give. */}
        <g transform={`translate(${-slip} 0)`}>
          <Forearm x={LID.x - 16} rot={-24} />
          <g transform={`translate(${LID.x - 16} ${LID.y + 48}) rotate(-90) scale(${HAND_S})`}>
            <Unit9Hand grip={0.6} />
          </g>
        </g>
        <g transform={`translate(${slip} 0)`}>
          <Forearm x={LID.x + LID.w + 16} rot={24} />
          <g transform={`translate(${LID.x + LID.w + 16} ${LID.y + 48}) rotate(90) scale(${HAND_S})`}>
            <Unit9Hand grip={0.6} />
          </g>
        </g>
      </svg>

      {/* the counter it is standing on */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, height: 26, background: C.fluoroLit, borderTop: `${STROKE}px solid ${C.ink}`, borderBottom: `${STROKE}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 786, bottom: 0, background: C.fluoroShade}} />
      {[100, 640, 1180, 1720].map((lx) => (
        <div key={lx} style={{position: 'absolute', left: lx, top: 830, width: 280, height: 200, background: C.fluoroDeep, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      ))}
    </>
  );
};

// ------------------------------------------------------------- B: PULL DOOR
const GagDoor: React.FC<{f: number}> = ({f}) => {
  // Seven seconds of the same two-second push. Do not vary it.
  const cycle = f % 46;
  const press = cycle < 30 ? lin(cycle, [0, 30], [0, 1]) : lin(cycle, [30, 40], [1, 0]);
  const s = 1.5;
  return (
    <>
      <Room wall={C.govBlue} floor={C.govBlueDeep} />
      {/* the door, with instructions */}
      <div
        style={{
          position: 'absolute',
          left: 1006,
          top: 250,
          width: 540,
          height: GROUND - 250,
          background: C.govBlueLit,
          border: `${STROKE}px solid ${C.ink}`,
          transform: `translateX(${press * 4}px)`,
        }}
      >
        <div style={{position: 'absolute', inset: 24, border: `${STROKE_THIN}px solid ${C.govBlueDeep}`}} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 250,
            textAlign: 'center',
            fontFamily: FONT_SANS,
            fontSize: 112,
            fontWeight: 700,
            letterSpacing: 14,
            color: C.ink,
          }}
        >
          PULL
        </div>
        <div style={{position: 'absolute', left: 32, top: 260, width: 20, height: 150, borderRadius: 10, background: C.beigeShade, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      </div>

      <Unit9
        pose={pose({
          ...U9.idle,
          lean: press * 8,
          lShoulder: -56 - press * 10,
          lElbow: -30,
          rShoulder: -44 - press * 8,
          rElbow: -34,
          lHip: 20,
          lKnee: -14,
          rHip: -16,
          rKnee: 10,
        })}
        eye={1}
        x={660}
        y={GROUND - U9_FOOT * s}
        scale={s}
      />

      {/* elapsed, so the audience can feel exactly how long this goes on */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 64,
          textAlign: 'center',
          fontFamily: FONT_MONO,
          fontSize: 52,
          letterSpacing: 8,
          color: C.white,
          opacity: 0.9,
          textShadow: '0 3px 10px rgba(0,0,0,0.6)',
        }}
      >
        {(f / 30).toFixed(1)}s
      </div>
    </>
  );
};

// ----------------------------------------------------------- C: FIRE ALARM
const GagAlarm: React.FC<{f: number}> = ({f}) => {
  const pulled = f >= 14;
  const spray = span(f, 26, 42);
  const fried = between(f, 54, 76);
  const bow = span(f, 78, 94);
  const s = 1.45;
  return (
    <>
      <Room wall={pulled ? C.fluoroDeep : C.fluoro} floor={C.fluoroShade} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 100, background: C.fluoroLit, borderBottom: `${STROKE}px solid ${C.ink}`}} />
      {[420, 960, 1500].map((sx) => (
        <React.Fragment key={sx}>
          <div style={{position: 'absolute', left: sx - 18, top: 100, width: 36, height: 28, background: C.beigeShade, border: `${STROKE_THIN}px solid ${C.ink}`}} />
          {spray > 0 &&
            Array.from({length: 7}).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: sx - 3,
                  top: 128,
                  width: 9,
                  height: 200 + spray * 560,
                  background: C.govBlueLit,
                  opacity: 0.8,
                  transformOrigin: 'top center',
                  transform: `rotate(${(i - 3) * 9}deg)`,
                }}
              />
            ))}
        </React.Fragment>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 1560,
          top: 430,
          width: 132,
          height: 174,
          background: pulled ? C.alert : C.alertDim,
          border: `${STROKE}px solid ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_SANS,
          fontSize: 23,
          fontWeight: 700,
          color: C.white,
          letterSpacing: 2,
          textAlign: 'center',
          opacity: pulled && Math.floor(f / 4) % 2 ? 0.45 : 1,
        }}
      >
        FIRE
        <br />
        PULL
      </div>

      <Unit9
        pose={pose({
          ...U9.idle,
          rShoulder: -66 + bow * 44,
          rElbow: -26,
          lean: bow * 28,
          headTilt: -bow * 26,
        })}
        eye={fried ? flicker(f, 3, 0.45) : 1}
        x={820}
        y={GROUND - U9_FOOT * s}
        scale={s}
      />

      {fried &&
        Array.from({length: 12}).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 940 + (rand(i + Math.floor(f / 2) * 13) - 0.5) * 320,
              top: 320 + (rand(i + 90 + Math.floor(f / 2) * 7) - 0.5) * 300,
              width: 11,
              height: 11,
              background: C.amber,
              transform: 'rotate(45deg)',
            }}
          />
        ))}

      {spray > 0.5 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: GROUND - 14, height: 28, background: C.govBlueLit, opacity: 0.4}} />
      )}
    </>
  );
};

// ---------------------------------------------------------------- D: THE CAT
const GagCat: React.FC<{dusk: boolean}> = ({dusk}) => {
  const s = 1.45;
  return (
    <>
      <Room wall={dusk ? '#3b4956' : C.beige} floor={dusk ? '#2a3742' : C.beigeDeep} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 118, background: dusk ? '#485764' : C.beigeLit, borderBottom: `${STROKE}px solid ${C.ink}`}} />
      {[150, 470, 1420, 1740].map((dx) => (
        <div
          key={dx}
          style={{
            position: 'absolute',
            left: dx,
            top: 330,
            width: 196,
            height: HORIZON - 330,
            background: dusk ? '#55636f' : C.beigeDeep,
            border: `${STROKE}px solid ${C.ink}`,
          }}
        >
          <div style={{position: 'absolute', left: 22, top: 26, right: 22, height: 150, border: `${STROKE_THIN}px solid ${C.ink}`, opacity: 0.6}} />
          <div style={{position: 'absolute', right: 20, top: 230, width: 14, height: 14, borderRadius: 7, background: C.beigeShade, border: `2px solid ${C.ink}`}} />
        </div>
      ))}
      <Unit9 pose={U9.idle} eye={1} x={700} y={GROUND - U9_FOOT * s} scale={s} />
      <Cat x={1180} y={GROUND - 250} scale={1.06} tail={0} />
      <div style={{position: 'absolute', left: 790, top: GROUND - 14, width: 210, height: 26, borderRadius: '50%', background: C.ink, opacity: 0.18}} />
      <div style={{position: 'absolute', left: 1250, top: GROUND - 12, width: 140, height: 20, borderRadius: '50%', background: C.ink, opacity: 0.16}} />
    </>
  );
};

/** The cut-away. An empty stairwell, for eighteen frames. */
const GagEmpty: React.FC = () => (
  <>
    <AbsoluteFill style={{background: C.fluoroShade}} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 260 + i * 200,
          top: 380 + i * 92,
          width: 280,
          height: 92,
          background: i % 2 ? C.fluoro : C.fluoroDeep,
          border: `${STROKE}px solid ${C.ink}`,
        }}
      />
    ))}
    <div style={{position: 'absolute', left: 1400, top: 160, width: 26, height: 760, background: C.beigeShade, border: `${STROKE_THIN}px solid ${C.ink}`}} />
  </>
);

// -------------------------------------------------------------- E: THE SCREW
const GagScrew: React.FC<{f: number}> = ({f}) => {
  const roll = span(f, 2, 28);
  const turn = span(f, 30, 46);
  const s = 1.4;
  const screwX = lin(roll, [0, 1], [1220, 600]);
  return (
    <>
      <Room wall={C.fluoro} floor={C.fluoroDeep} />
      <div style={{position: 'absolute', left: 200, top: 190, width: 430, height: GROUND - 190 - 26, background: C.beigeLit, border: `${STROKE}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 224, top: 226, width: 382, height: 240, background: C.beige, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 224, top: 482, width: 382, height: 386, background: C.beige, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 570, top: 290, width: 16, height: 130, borderRadius: 8, background: C.beigeShade, border: `${STROKE_THIN}px solid ${C.ink}`}} />
      {/* THE GAP */}
      <div style={{position: 'absolute', left: 200, top: GROUND - 26, width: 430, height: 26, background: C.black}} />

      <Unit9
        pose={pose({...U9.idle, headTilt: turn * 16, headTurn: -turn * 7, lean: -turn * 4})}
        eye={1}
        x={880}
        y={GROUND - U9_FOOT * s}
        scale={s}
      />

      {roll < 1 && (
        <svg width={46} height={46} style={{position: 'absolute', left: screwX, top: GROUND - 40, transform: `rotate(${roll * 1400}deg)`}}>
          <circle cx={23} cy={23} r={15} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <rect x={10} y={20} width={26} height={6} rx={3} fill={C.ink} />
        </svg>
      )}
    </>
  );
};

/**
 * The hold. A low camera, the dark under the fridge, and a robot looking into
 * it. Seventy-eight frames. Not one pixel moves in any of them.
 */
const GagStare: React.FC = () => (
  <>
    <AbsoluteFill style={{background: C.fluoroDeep}} />
    {/* fridge, from the floor */}
    <div style={{position: 'absolute', left: -60, top: -40, width: 1130, height: 700, background: C.beigeLit, border: `${STROKE}px solid ${C.ink}`}} />
    <div style={{position: 'absolute', left: -60, top: 660, width: 1130, height: 96, background: C.black}} />
    <div style={{position: 'absolute', left: -60, top: 756, width: 1130, height: 14, background: C.beigeShade}} />
    {/* floor */}
    <div style={{position: 'absolute', left: 0, right: 0, top: 770, bottom: 0, background: C.fluoro}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 770, height: 5, background: C.ink, opacity: 0.4}} />
    {/* the only light going into the gap is coming out of his face */}
    <div
      style={{
        position: 'absolute',
        left: 200,
        top: 636,
        width: 760,
        height: 150,
        background: `radial-gradient(ellipse at 92% 50%, rgba(141,240,230,0.3) 0%, rgba(141,240,230,0) 72%)`,
      }}
    />
    <Unit9
      pose={pose({...U9.idle, headTilt: -26, headTurn: -10, lean: -8, lShoulder: 26, rShoulder: -22})}
      eye={1}
      x={946}
      y={296}
      scale={3.1}
    />
  </>
);

export const Scene06Montage: React.FC = () => {
  const frame = useCurrentFrame();
  const g = gagAt(frame);
  const f = frame - g.from;

  return (
    <SceneFrame scene="s6" background={C.fluoro} vignette={0.34}>
      {g.id === 'A' && <GagJar f={f} />}
      {g.id === 'B' && <GagDoor f={f} />}
      {g.id === 'C' && <GagAlarm f={f} />}
      {g.id === 'D' && <GagCat dusk={false} />}
      {g.id === 'D2' && <GagEmpty />}
      {g.id === 'D3' && <GagCat dusk />}
      {g.id === 'E' && <GagScrew f={f} />}
      {g.id === 'E2' && <GagStare />}
      <CamOverlay frame={frame} />
    </SceneFrame>
  );
};
