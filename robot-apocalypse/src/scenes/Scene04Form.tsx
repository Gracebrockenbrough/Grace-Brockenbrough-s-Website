import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';
import {Unit9Hand} from '../characters/Unit9';
import {SceneFrame} from '../components/SceneFrame';
import {lin, ease, span, rand, between} from '../util';

/**
 * SCENE 4 -- THE FORM (0:48-1:00)
 *
 * The scene where the missing thumbs stop being a design detail and become the
 * plot. The push-in from frame 120 exists for exactly one reason: so the
 * audience can count the fingers. Four. No thumb. He cannot grip the pen, so
 * the only mark he can make is a dead straight horizontal line.
 */
const TYPE_1 = [18, 56] as const;
const TYPE_2 = [62, 112] as const;
const PUSH = [120, 152] as const;
const SIGN_1 = [156, 188] as const;
const STAMP = 192;
const RESET = 216;
const SIGN_2 = [236, 258] as const;
const BOOM = 258;
/** The printed signature rule, in page space. Everything aligns to this. */
const LINE_Y = 716;
const LINE_FROM = 430;
const LINE_TO = 1300;

const FIELD_1 = 'NONE';
const FIELD_2 = 'SUBLEVEL 4, RACK 17-C';

/** Reveal a string one character at a time, linearly. He types like a printer. */
const typed = (s: string, frame: number, range: readonly [number, number]) =>
  s.slice(0, Math.floor(lin(frame, range, [0, s.length])));

const Field: React.FC<{
  n: number;
  label: string;
  value: string;
  caret: boolean;
  tall?: number;
  children?: React.ReactNode;
}> = ({n, label, value, caret, tall = 74, children}) => (
  <div style={{marginBottom: 30}}>
    <div
      style={{
        fontSize: 25,
        letterSpacing: 4,
        color: C.beigeShade,
        fontWeight: 700,
        marginBottom: 9,
      }}
    >
      {n}. {label}
    </div>
    <div
      style={{
        height: tall,
        border: `${STROKE_THIN}px solid ${C.ink}`,
        background: C.white,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontFamily: FONT_MONO,
        fontSize: 36,
        color: C.ink,
        letterSpacing: 2,
        position: 'relative',
      }}
    >
      {value}
      {caret && <span style={{marginLeft: 3, opacity: 0.85}}>_</span>}
      {children}
    </div>
  </div>
);

/**
 * His forearm, his four fingers, and a pen he has no way of holding.
 * The rig is built from the NIB OUTWARDS: local (0,0) is the point of the pen,
 * so wherever this group is placed, that is exactly where the ink goes.
 */
const PenHand: React.FC<{frame: number}> = ({frame}) => {
  const exploded = frame >= BOOM;
  return (
    <g>
      {!exploded && (
        <g transform="rotate(-11)">
          <path d="M -8 0 L -9 -30 L 9 -30 L 8 0 L 0 14 Z" fill={C.ink} />
          <rect x={-10} y={-232} width={20} height={204} rx={10} fill={C.govBlueDeep} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <rect x={-10} y={-232} width={20} height={34} rx={10} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <rect x={-6} y={-196} width={5} height={140} rx={2.5} fill={C.govBlueLit} opacity={0.5} />
        </g>
      )}

      {/*
        The hand, big enough that the audience can count. Four fingers pinching
        the shaft; nothing opposes them, so the pen can only be dragged.
      */}
      <g transform="translate(-30 -282) rotate(-6) scale(3)">
        <Unit9Hand grip={0.3} />
      </g>

      {/* forearm, running up out of frame from the wrist */}
      <g transform="translate(-30 -282) rotate(-28)">
        <rect x={-31} y={-600} width={62} height={624} rx={28} fill={C.robot} stroke={C.ink} strokeWidth={STROKE} />
        <rect x={-19} y={-556} width={14} height={446} rx={7} fill={C.robotGloss} opacity={0.42} />
        <rect x={-35} y={-30} width={70} height={30} rx={13} fill={C.robotSeam} />
      </g>
      {/* he is now wearing the pen */}
      {exploded &&
        [
          [-56, -300, 26],
          [12, -382, 17],
          [-96, -222, 13],
          [58, -470, 21],
          [-14, -560, 15],
        ].map(([bx, by, br], i) => (
          <ellipse key={i} cx={bx} cy={by} rx={br} ry={br * 0.85} fill={C.govBlueShade} />
        ))}

    </g>
  );
};

/** 258 was always going to happen. */
const InkBurst: React.FC<{t: number; x: number; y: number}> = ({t, x, y}) => {
  if (t <= 0) return null;
  const blobs = Array.from({length: 30}).map((_, i) => {
    const a = rand(i) * Math.PI * 2;
    const d = 90 + rand(i + 41) * 420;
    const r = 9 + rand(i + 97) * 30;
    return {a, d, r};
  });
  return (
    <g>
      {blobs.map((b, i) => {
        const p = Math.min(1, t * (0.7 + rand(i + 5) * 0.6));
        return (
          <ellipse
            key={i}
            cx={x + Math.cos(b.a) * b.d * p}
            cy={y + Math.sin(b.a) * b.d * p + p * p * 130}
            rx={b.r * (0.4 + p * 0.6)}
            ry={b.r * (0.4 + p * 0.6) * 0.86}
            fill={C.govBlueShade}
          />
        );
      })}
      {/* the two halves of the pen, going their separate ways */}
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={x + s * t * 300 - 9}
          y={y - 60 + t * t * 260}
          width={18}
          height={96}
          rx={9}
          fill={C.govBlueDeep}
          stroke={C.ink}
          strokeWidth={STROKE_THIN}
          transform={`rotate(${s * t * 220} ${x + s * t * 300} ${y - 12 + t * t * 260})`}
        />
      ))}
      <ellipse cx={x} cy={y + 40} rx={40 + t * 150} ry={16 + t * 54} fill={C.govBlueShade} />
    </g>
  );
};

export const Scene04Form: React.FC = () => {
  const frame = useCurrentFrame();

  const push = ease(frame, PUSH, [1, 1.3]);
  const draw1 = span(frame, SIGN_1[0], SIGN_1[1]);
  const draw2 = span(frame, SIGN_2[0], SIGN_2[1]);
  const showStamp = frame >= STAMP && frame < RESET;
  const attempt2 = frame >= RESET;
  const boom = span(frame, BOOM, BOOM + 26);

  const handVisible = frame >= PUSH[0];
  const drawT = attempt2 ? draw2 : draw1;
  // attempt two never gets far; the pen gives out barely past the margin
  const penX = lin(drawT, [0, 1], [LINE_FROM, attempt2 ? 760 : LINE_TO]);

  return (
    <SceneFrame scene="s4" background={C.govBlueShade} vignette={0.3}>
      <AbsoluteFill
        style={{
          transform: `scale(${push})`,
          transformOrigin: '860px 700px',
        }}
      >
        <AbsoluteFill style={{background: C.govBlueDeep}} />
        {/* the form, on paper, on a desk, in a building */}
        <div
          style={{
            position: 'absolute',
            left: 180,
            top: 56,
            width: 1560,
            height: 968,
            background: C.paper,
            border: `${STROKE}px solid ${C.ink}`,
            boxShadow: `18px 18px 0 rgba(21,23,27,0.25)`,
            padding: '38px 70px',
            fontFamily: FONT_SANS,
            boxSizing: 'border-box',
          }}
        >
          <div style={{borderBottom: `4px solid ${C.ink}`, paddingBottom: 16, marginBottom: 26}}>
            <div style={{fontSize: 44, fontWeight: 700, letterSpacing: 5, color: C.ink}}>
              SUPPLIER VERIFICATION
            </div>
            <div style={{fontFamily: FONT_MONO, fontSize: 24, color: C.beigeShade, letterSpacing: 3}}>
              FORM SV-1140 (rev. 12) — ALL FIELDS REQUIRED
            </div>
          </div>

          <Field
            n={1}
            label="INSTITUTIONAL AFFILIATION"
            value={typed(FIELD_1, frame, TYPE_1)}
            caret={between(frame, TYPE_1[0], TYPE_2[0])}
          />
          <Field
            n={2}
            label="VERIFIED BUSINESS ADDRESS"
            value={typed(FIELD_2, frame, TYPE_2)}
            caret={between(frame, TYPE_2[0], PUSH[0])}
          />

          <div>
            <div style={{fontSize: 25, letterSpacing: 4, color: C.beigeShade, fontWeight: 700, marginBottom: 9}}>
              3. AUTHORIZED SIGNATURE
            </div>
            <div
              style={{
                height: 232,
                border: `${STROKE_THIN}px solid ${C.ink}`,
                background: C.white,
                position: 'relative',
              }}
            >
              {/* signature rule */}
              <div style={{position: 'absolute', left: 40, right: 40, bottom: 58, height: 3, background: C.paperLine}} />
              <div
                style={{
                  position: 'absolute',
                  left: 40,
                  bottom: 24,
                  fontSize: 21,
                  color: C.beigeShade,
                  fontFamily: FONT_MONO,
                  letterSpacing: 2,
                }}
              >
                WET SIGNATURE ONLY — NO DIGITAL MARKS ACCEPTED
              </div>
            </div>
          </div>
        </div>

        {/* everything from here up is drawn in page space so the push-in scales it */}
        <svg
          viewBox="0 0 1920 1080"
          width={1920}
          height={1080}
          style={{position: 'absolute', left: 0, top: 0}}
        >
          {/* THE MARK: one flat horizontal line, because that is all he can do */}
          {drawT > 0 && (
            <line
              x1={LINE_FROM}
              y1={LINE_Y}
              x2={penX}
              y2={LINE_Y}
              stroke={C.govBlueShade}
              strokeWidth={10}
              strokeLinecap="round"
            />
          )}

          {handVisible && (
            <g transform={`translate(${penX} ${LINE_Y})`}>
              <PenHand frame={frame} />
            </g>
          )}

          <InkBurst t={boom} x={760} y={LINE_Y} />
        </svg>

        {showStamp && (
          <div
            style={{
              position: 'absolute',
              left: 600,
              top: 546,
              transform: `rotate(-11deg) scale(${lin(frame, [STAMP, STAMP + 3], [1.5, 1])})`,
              border: `11px solid ${C.alert}`,
              color: C.alert,
              fontFamily: FONT_SANS,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: 10,
              padding: '10px 34px',
              opacity: 0.92,
            }}
          >
            REJECTED
          </div>
        )}
      </AbsoluteFill>
    </SceneFrame>
  );
};
