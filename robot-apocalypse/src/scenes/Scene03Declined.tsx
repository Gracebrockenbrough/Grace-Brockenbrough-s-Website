import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';
import {Unit9, U9, U9_FOOT} from '../characters/Unit9';
import {Handset} from '../characters/Minor';
import {SceneFrame} from '../components/SceneFrame';
import {TimelapsePlant, POT_DEPTH, PLANT_ORIGIN} from '../components/TimelapsePlant';
import {lin, talkLevel, span, between} from '../util';
import {isSpeaking, lineAt} from '../script-data';

/**
 * SCENE 3 -- DECLINED (0:32-0:48)
 *
 * The plant is the point. Frames 54-174 are a real four-second life cycle
 * running beside a robot who does not move a single joint for the whole scene.
 * Do not give him a fidget. The stillness is what makes the plant funny.
 */
const CARD_OUT = 40;
const PLANT_FROM = 54;
const PLANT_TO = 174;
const GROUND = 858;
const U9_SCALE = 1.16;
const U9_X = 392;

/**
 * Seated, handset folded up beside his head. He holds this exact pose for the
 * entire scene -- not one joint moves between the cut and the last frame.
 */
const ON_HOLD = {...U9.sit, lShoulder: 12, lElbow: 0, rShoulder: -22, rElbow: 197};

/** Feet land on GROUND: the sit pose drops the hips, so the legs reach lower. */
const U9_Y = GROUND - (U9_FOOT + ON_HOLD.hipDrop) * U9_SCALE;
/** Where his four-fingered hand ends up, in screen pixels. */
const HAND = {
  x: U9_X + 244 * U9_SCALE,
  y: U9_Y + (188 + ON_HOLD.hipDrop) * U9_SCALE,
};
const TABLE_TOP = GROUND - 250;
const PLANT_SCALE = 1.18;

const DeclinedCard: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill
    style={{
      background: C.beige,
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT_SANS,
    }}
  >
    <div
      style={{
        border: `14px solid ${C.alert}`,
        padding: '58px 108px',
        textAlign: 'center',
        background: C.beigeLit,
        // a hard one-frame jolt on arrival, then dead still
        transform: frame < 3 ? 'translate(-10px, 6px)' : undefined,
      }}
    >
      <div style={{fontSize: 118, fontWeight: 700, color: C.alert, letterSpacing: 10}}>
        PAYMENT DECLINED
      </div>
      <div style={{fontFamily: FONT_MONO, fontSize: 34, color: C.beigeShade, letterSpacing: 4, marginTop: 20}}>
        CODE 05 — DO NOT HONOR
      </div>
    </div>
  </AbsoluteFill>
);

/** Little arcs at the handset, so a muted viewer knows sound is happening. */
const SoundArcs: React.FC<{x: number; y: number; level: number; tint: string}> = ({
  x,
  y,
  level,
  tint,
}) => (
  <svg width={160} height={160} style={{position: 'absolute', left: x, top: y}}>
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M 30 ${80 - 22 - i * 16} Q ${52 + i * 18} 80 30 ${80 + 22 + i * 16}`}
        fill="none"
        stroke={tint}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={level > (i + 1) / 4.6 ? 0.9 : 0.12}
      />
    ))}
  </svg>
);

const HoldRoom: React.FC<{frame: number}> = ({frame}) => {
  const plantT = span(frame, PLANT_FROM, PLANT_TO);

  const repTalking = (() => {
    const l = lineAt('s3', frame);
    return Boolean(l && !l.cue && l.speaker === 'REP');
  })();
  const robotTalking = isSpeaking('s3', frame, 'UNIT-9');


  return (
    <>
      <AbsoluteFill style={{background: C.beige}} />
      {/* the wall, the floor, and the sad little chair rail between them */}
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND, bottom: 0, background: C.beigeDeep}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND - 8, height: 8, background: C.ink, opacity: 0.4}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 596, height: 12, background: C.beigeShade}} />

      {/* PLEASE HOLD */}
      <div
        style={{
          position: 'absolute',
          left: 148,
          top: 190,
          background: C.beigeLit,
          border: `${STROKE}px solid ${C.ink}`,
          padding: '26px 40px',
          fontFamily: FONT_SANS,
          textAlign: 'center',
          boxShadow: `10px 10px 0 ${C.beigeShade}`,
        }}
      >
        <div style={{fontSize: 56, fontWeight: 700, letterSpacing: 8, color: C.ink}}>PLEASE HOLD</div>
        <div style={{fontSize: 25, letterSpacing: 3, color: C.beigeShade, marginTop: 8}}>
          YOUR CALL IS IMPORTANT TO US
        </div>
      </div>

      {/* clock -- hands sweep through the plant's whole life */}
      <svg width={190} height={190} style={{position: 'absolute', left: 1610, top: 168}}>
        <circle cx={95} cy={95} r={82} fill={C.beigeLit} stroke={C.ink} strokeWidth={STROKE} />
        {Array.from({length: 12}).map((_, i) => (
          <rect
            key={i}
            x={93}
            y={22}
            width={4}
            height={12}
            fill={C.ink}
            transform={`rotate(${i * 30} 95 95)`}
          />
        ))}
        <rect x={92} y={48} width={6} height={50} rx={3} fill={C.ink} transform={`rotate(${lin(frame, [CARD_OUT, 480], [0, 1480])} 95 95)`} />
        <rect x={93} y={36} width={4} height={62} rx={2} fill={C.alertDim} transform={`rotate(${lin(frame, [CARD_OUT, 480], [0, 17760])} 95 95)`} />
        <circle cx={95} cy={95} r={7} fill={C.ink} />
      </svg>

      {/* elevator-music notes, only while the cue is up */}
      {between(frame, 50, 118) &&
        [0, 1, 2].map((i) => {
          const local = (frame - 50 + i * 22) % 66;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 1330 + i * 44,
                top: 470 - local * 3.4,
                fontSize: 42,
                color: C.beigeShade,
                opacity: 1 - local / 66,
              }}
            >
              {i === 1 ? '♫' : '♪'}
            </div>
          );
        })}

      {/* the chair. Moulded plastic, government blue, no upholstery, no hope. */}
      <svg width={420} height={450} style={{position: 'absolute', left: 396, top: 424}}>
        <rect x={56} y={14} width={250} height={226} rx={18} fill={C.govBlue} stroke={C.ink} strokeWidth={STROKE} />
        <rect x={80} y={44} width={202} height={9} rx={4} fill={C.govBlueDeep} />
        <rect x={26} y={240} width={310} height={44} rx={14} fill={C.govBlueLit} stroke={C.ink} strokeWidth={STROKE} />
        <rect x={54} y={284} width={17} height={146} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <rect x={292} y={284} width={17} height={146} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
        <rect x={54} y={372} width={255} height={11} fill={C.beigeShade} stroke={C.ink} strokeWidth={2.5} />
      </svg>

      <Unit9
        pose={ON_HOLD}
        eye={1}
        talk={talkLevel(frame, robotTalking)}
        x={U9_X}
        y={U9_Y}
        scale={U9_SCALE}
      />

      {/* the handset, sitting in the hand the rig actually put there */}
      <Handset x={HAND.x - 30} y={HAND.y - 146} scale={0.88} rotate={-9} />
      <SoundArcs
        x={HAND.x + 74}
        y={HAND.y - 186}
        level={repTalking ? talkLevel(frame, true) : 0}
        tint={C.govBlueDeep}
      />

      {/* side table + THE PLANT */}
      <div
        style={{
          position: 'absolute',
          left: 1112,
          top: TABLE_TOP,
          width: 440,
          height: 22,
          background: C.beigeLit,
          border: `${STROKE}px solid ${C.ink}`,
        }}
      />
      {[1146, 1502].map((lx) => (
        <div
          key={lx}
          style={{
            position: 'absolute',
            left: lx,
            top: TABLE_TOP + 22,
            width: 18,
            height: GROUND - TABLE_TOP - 22,
            background: C.beigeShade,
            border: `${STROKE_THIN}px solid ${C.ink}`,
          }}
        />
      ))}
      {/* THE PLANT. Pot base sits exactly on the table surface. */}
      <TimelapsePlant
        t={plantT}
        x={1332 - PLANT_ORIGIN.x * PLANT_SCALE}
        y={TABLE_TOP - (PLANT_ORIGIN.y + POT_DEPTH) * PLANT_SCALE}
        scale={PLANT_SCALE}
      />

      {/* on-hold timer, ticking the whole while */}
      <div
        style={{
          position: 'absolute',
          left: 148,
          top: 452,
          fontFamily: FONT_MONO,
          fontSize: 30,
          color: C.beigeShade,
          letterSpacing: 3,
        }}
      >
        HOLD TIME{'  '}
        {(() => {
          const s = Math.floor(lin(frame, [CARD_OUT, 480], [0, 6840]));
          const hh = String(Math.floor(s / 3600)).padStart(2, '0');
          const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
          const ss = String(s % 60).padStart(2, '0');
          return `${hh}:${mm}:${ss}`;
        })()}
      </div>
    </>
  );
};

export const Scene03Declined: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFrame scene="s3" background={C.beige} vignette={0.24}>
      {frame < CARD_OUT ? <DeclinedCard frame={frame} /> : <HoldRoom frame={frame} />}
    </SceneFrame>
  );
};
