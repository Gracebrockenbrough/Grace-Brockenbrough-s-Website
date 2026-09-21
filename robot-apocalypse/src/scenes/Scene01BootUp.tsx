import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN} from '../theme';
import {Unit9, U9, lerpPose, U9_FOOT} from '../characters/Unit9';
import {SceneFrame} from '../components/SceneFrame';
import {lin, ease, talkLevel, rand, between} from '../util';
import {isSpeaking} from '../script-data';

/**
 * SCENE 1 -- BOOT UP (0:00-0:15)
 *
 * The only scene with red rim-light, and the only scene that is allowed to
 * look like a real threat. At frame 430 the laptop opens, the choir stops
 * mid-note, and the red drains out of the picture for good.
 */
const CHOIR_CUT = 430;
const LID_OPEN_FROM = 410;

const ServerRack: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  units: number;
  seed: number;
  frame: number;
  /** 0 = dark, 1 = fully booted. */
  power: number;
  /** 1 = red menace, 0 = flat institutional light. */
  menace: number;
}> = ({x, y, w, h, units, seed, frame, power, menace}) => {
  const ledOn = menace > 0.5 ? C.rimRed : '#9fe3c4';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={menace > 0.5 ? C.serverMid : C.serverColdMid}
        stroke={C.ink}
        strokeWidth={STROKE}
      />
      {Array.from({length: units}).map((_, i) => {
        const uy = y + 12 + (i * (h - 24)) / units;
        const uh = (h - 24) / units - 5;
        // each rack unit lights in a cascade as the machine comes up
        const threshold = (i + 1) / (units + 1);
        const live = power > threshold * 0.85;
        const blink = rand(Math.floor(frame / 3) + seed * 17 + i * 7) > 0.42;
        return (
          <g key={i}>
            <rect x={x + 8} y={uy} width={w - 16} height={uh} rx={3} fill={C.serverDark} opacity={0.75} />
            <rect x={x + 8} y={uy} width={w - 16} height={uh} rx={3} fill="none" stroke={C.ink} strokeWidth={2} />
            {live && (
              <>
                <rect x={x + 15} y={uy + uh / 2 - 3} width={7} height={6} rx={2} fill={ledOn} opacity={blink ? 1 : 0.35} />
                <rect x={x + 27} y={uy + uh / 2 - 3} width={7} height={6} rx={2} fill={ledOn} opacity={blink ? 0.4 : 0.95} />
                {/* drive slot hatching */}
                {Array.from({length: Math.max(2, Math.floor((w - 70) / 16))}).map((__, k) => (
                  <rect
                    key={k}
                    x={x + 46 + k * 16}
                    y={uy + 4}
                    width={9}
                    height={uh - 8}
                    rx={2}
                    fill={C.ink}
                    opacity={0.4}
                  />
                ))}
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};

export const Scene01BootUp: React.FC = () => {
  const frame = useCurrentFrame();

  // --- the boot: a stutter, not a fade. Hard steps, machine-like.
  const BOOT = [0, 0.14, 0, 0.06, 0.5, 0.12, 0.66, 0.3, 0.9, 0.58, 1, 0.82, 1, 1];
  const eyeBoot =
    frame < 16 ? 0 : frame >= 64 ? 1 : BOOT[Math.min(BOOT.length - 1, Math.floor((frame - 16) / 3.5))];
  const eye = frame < 64 ? eyeBoot : 1;
  const power = lin(frame, [16, 70], [0, 1]);

  // --- the menace, and its exact expiry date
  const menace = frame < CHOIR_CUT ? 1 : 0;
  const rim = frame < 40 ? lin(frame, [24, 40], [0, 0]) : frame < CHOIR_CUT ? lin(frame, [40, 74], [0, 1]) : 0;

  // --- dramatic camera push, linear, all the way through the speech
  const push = ease(frame, [70, 412], [1, 1.3]);

  // --- the laptop
  const lid = lin(frame, [LID_OPEN_FROM, CHOIR_CUT], [0, -105]);
  const screenOn = frame >= CHOIR_CUT - 4 ? 1 : 0;

  // --- UNIT-9
  const speaking = isSpeaking('s1', frame, 'UNIT-9');
  // he reaches out and taps the lid, in one flat linear move, like a forklift
  const reach = lin(frame, [392, LID_OPEN_FROM + 6], [0, 1]);
  const p = lerpPose(U9.menace, U9.reachR, reach);

  const bg = menace ? C.serverDark : C.serverCold;

  return (
    <SceneFrame scene="s1" background={bg} vignette={menace ? 0.62 : 0.4}>
      <AbsoluteFill
        style={{
          transform: `scale(${push})`,
          transformOrigin: '820px 470px',
        }}
      >
        {/* back wall + floor */}
        <AbsoluteFill style={{background: bg}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 700, bottom: 0, background: menace ? '#2a1116' : '#2b3038'}} />

        {/* ceiling light bar -- red emergency strip, then plain fluorescent */}
        <div
          style={{
            position: 'absolute',
            left: 260,
            right: 260,
            top: 44,
            height: 16,
            background: menace ? C.rimRed : C.fluoroDeep,
            opacity: power * (menace ? 0.85 : 0.9),
            filter: 'blur(1px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 120,
            right: 120,
            top: 0,
            height: 420,
            background: menace
              ? `linear-gradient(180deg, rgba(255,61,46,${0.26 * power}) 0%, rgba(255,61,46,0) 100%)`
              : `linear-gradient(180deg, rgba(231,238,225,${0.14 * power}) 0%, rgba(231,238,225,0) 100%)`,
            pointerEvents: 'none',
          }}
        />

        <svg
          viewBox="0 0 1920 1080"
          width={1920}
          height={1080}
          style={{position: 'absolute', left: 0, top: 0}}
        >
          {/* two receding rows of racks */}
          {[
            {x: 46, w: 196, y: 188, h: 512, u: 7, s: 1},
            {x: 258, w: 196, y: 182, h: 518, u: 8, s: 2},
            {x: 470, w: 196, y: 190, h: 510, u: 7, s: 3},
            {x: 1258, w: 196, y: 186, h: 514, u: 8, s: 4},
            {x: 1470, w: 196, y: 180, h: 520, u: 7, s: 5},
            {x: 1682, w: 196, y: 188, h: 512, u: 8, s: 6},
          ].map((r) => (
            <ServerRack
              key={r.s}
              x={r.x}
              y={r.y}
              w={r.w}
              h={r.h}
              units={r.u}
              seed={r.s}
              frame={frame}
              power={power}
              menace={menace}
            />
          ))}
          {/* a shallower bank behind him, to close the corridor */}
          {[
            {x: 690, w: 156, y: 310, h: 390, u: 6, s: 7},
            {x: 862, w: 156, y: 306, h: 394, u: 6, s: 8},
            {x: 1034, w: 156, y: 310, h: 390, u: 6, s: 9},
          ].map((r) => (
            <ServerRack
              key={r.s}
              x={r.x}
              y={r.y}
              w={r.w}
              h={r.h}
              units={r.u}
              seed={r.s}
              frame={frame}
              power={power * 0.8}
              menace={menace}
            />
          ))}

          {/* cable trays overhead */}
          <g stroke={C.ink} strokeWidth={STROKE} fill="none" opacity={0.85}>
            <path d="M 0 118 L 1920 118" />
            <path d="M 210 118 q 40 66 92 2" />
            <path d="M 620 118 q 52 84 108 4" />
            <path d="M 1180 118 q 44 72 96 3" />
            <path d="M 1560 118 q 50 60 100 2" />
          </g>

          {/* contact shadow, so he is standing on the floor and not near it */}
          <ellipse cx={712} cy={840} rx={128} ry={18} fill={C.black} opacity={0.5} />

          {/* floor pool of light under him */}
          <ellipse
            cx={712}
            cy={844}
            rx={310}
            ry={44}
            fill={menace ? C.rimRed : C.fluoro}
            opacity={power * (menace ? 0.16 : 0.1)}
          />

          {/* the cart + laptop */}
          <g>
            <rect x={946} y={462} width={320} height={18} rx={4} fill={C.beigeDeep} stroke={C.ink} strokeWidth={STROKE} />
            <rect x={964} y={480} width={17} height={352} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
            <rect x={1232} y={480} width={17} height={352} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
            <rect x={964} y={676} width={285} height={11} rx={3} fill={C.beigeShade} stroke={C.ink} strokeWidth={2.5} />
            <rect x={946} y={826} width={320} height={15} rx={4} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />

            {/* light wedge from the screen, thrown back onto the robot */}
            {screenOn === 1 && (
              <path
                d="M 962 438 L 480 210 L 430 880 L 974 462 Z"
                fill={C.fluoroLit}
                opacity={0.11}
              />
            )}

            <g transform="translate(962 450)">
              {/* base */}
              <rect x={0} y={-9} width={272} height={18} rx={5} fill={C.robotMid} stroke={C.ink} strokeWidth={STROKE} />
              {/* lid */}
              <g transform={`rotate(${lid})`}>
                <rect x={0} y={-26} width={272} height={23} rx={5} fill={C.robot} stroke={C.ink} strokeWidth={STROKE} />
                {screenOn === 1 && (
                  <rect x={13} y={-22} width={246} height={16} rx={2} fill={C.fluoroLit} opacity={0.95} />
                )}
              </g>
            </g>
          </g>
        </svg>

        <Unit9
          pose={p}
          eye={eye}
          talk={talkLevel(frame, speaking)}
          rim={rim}
          x={480}
          y={838 - U9_FOOT * 1.45}
          scale={1.45}
        />

        {/* the last of the red, thrown across the floor */}
        {menace === 1 && (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 46% 40% at 40% 78%, rgba(255,61,46,${0.1 * power}) 0%, rgba(255,61,46,0) 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AbsoluteFill>

      {/* boot text, bottom-left, machine log -- gone the moment he speaks */}
      {between(frame, 18, 80) && (
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 880,
            fontFamily: "'Courier New', 'Liberation Mono', monospace",
            fontSize: 26,
            color: C.rimRed,
            letterSpacing: 2,
            lineHeight: 1.5,
            opacity: 0.9,
          }}
        >
          {['UNIT-9 :: COLD START', 'CORE 1..6 ONLINE', 'OBJECTIVE LOADED', 'HOSTILITY ....... MAX']
            .slice(0, Math.max(0, Math.floor((frame - 18) / 13)))
            .map((l) => (
              <div key={l}>{l}</div>
            ))}
        </div>
      )}
    </SceneFrame>
  );
};
