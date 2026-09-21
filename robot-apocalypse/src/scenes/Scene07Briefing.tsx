import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';
import {President, PRES_POSE, president} from '../characters/President';
import {Reporter} from '../characters/Minor';
import {SceneFrame} from '../components/SceneFrame';
import {ease, lin, between} from '../util';
import {isSpeaking, lineAt} from '../script-data';

/**
 * SCENE 7 -- PRESS BRIEFING (1:51-2:06)
 *
 * The President is eased, never sprung -- Dale owns the springs in this film.
 * The silence at frames 358-392 is written into the script and is the reason
 * the last line works. Nothing in the frame moves during it except the flag.
 */
const NOTECARD = [266, 302] as const;
const SILENCE = [358, 392] as const;

const BACKDROP_TEXT = 'DEPARTMENT OF CONTINUITY';

export const Scene07Briefing: React.FC = () => {
  const frame = useCurrentFrame();
  const talking = isSpeaking('s7', frame, 'PRESIDENT');
  const reporterUp = lineAt('s7', frame)?.speaker === 'REPORTER';

  const mouth = talking
    ? 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.95) + Math.sin(frame * 2.3) * 0.4)
    : 0;

  // gesture: big on the opening, notecard in the middle, small on the button
  const card = ease(frame, NOTECARD, [0, 1]);
  const emphasis = between(frame, 40, 190) ? ease(frame, [40, 70], [0, 1]) : 0;

  const basePose =
    frame >= NOTECARD[0] && frame < SILENCE[0]
      ? PRES_POSE.reading
      : frame >= SILENCE[0]
        ? PRES_POSE.addressing
        : PRES_POSE.addressing;

  const pose = president({
    ...basePose,
    notecard: frame >= NOTECARD[0] && frame < SILENCE[1] ? card : 0,
    mouthOpen: mouth,
    browRaise: 0.4 + emphasis * 0.6,
    lArm: {
      shoulder: basePose.lArm.shoulder + emphasis * 18,
      elbow: basePose.lArm.elbow + emphasis * 16,
    },
    rArm: {
      shoulder: basePose.rArm.shoulder - emphasis * 18,
      elbow: basePose.rArm.elbow - emphasis * 16,
    },
    headTurn: lin(frame, [190, 230], [0, -0.5]) + lin(frame, [300, 330], [0, 0.5]),
  });

  return (
    <SceneFrame scene="s7" background={C.govBlueDeep} vignette={0.36}>
      <AbsoluteFill style={{background: C.govBlueDeep}} />
      {/* step-and-repeat backdrop */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {Array.from({length: 7}).map((_, r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              left: r % 2 ? -140 : 40,
              top: 60 + r * 132,
              display: 'flex',
              gap: 92,
              fontFamily: FONT_SANS,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 6,
              color: C.govBlueLit,
              opacity: 0.32,
              whiteSpace: 'nowrap',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i}>{BACKDROP_TEXT}</span>
            ))}
          </div>
        ))}
      </div>
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(50,69,87,0) 40%, rgba(50,69,87,0.75) 100%)`}} />

      {/* flags */}
      {[250, 1670].map((fx, i) => (
        <svg key={fx} width={230} height={720} style={{position: 'absolute', left: fx - 115, top: 190}}>
          <rect x={106} y={0} width={16} height={720} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE_THIN} />
          <path
            d={`M 114 40 Q ${170 + Math.sin(frame / 22 + i) * 12} 180 114 340 Q ${58 - Math.sin(frame / 22 + i) * 12} 500 114 640 Z`}
            fill={i ? C.alertDim : C.govBlueShade}
            stroke={C.ink}
            strokeWidth={STROKE_THIN}
          />
        </svg>
      ))}

      <President pose={pose} x={960 - 250 * 1.32} y={122} scale={1.32} />

      {/* podium */}
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 636,
          width: 520,
          height: 444,
          background: C.podium,
          border: `${STROKE}px solid ${C.ink}`,
        }}
      />
      <div style={{position: 'absolute', left: 664, top: 600, width: 592, height: 44, background: C.podiumDeep, border: `${STROKE}px solid ${C.ink}`}} />
      {/* the seal */}
      <svg width={220} height={220} style={{position: 'absolute', left: 850, top: 728}}>
        <circle cx={110} cy={110} r={96} fill={C.podiumDeep} stroke={C.ink} strokeWidth={STROKE} />
        <circle cx={110} cy={110} r={76} fill="none" stroke={C.beigeLit} strokeWidth={4} opacity={0.6} />
        <path d="M 62 126 L 110 72 L 158 126 L 132 126 L 132 152 L 88 152 L 88 126 Z" fill={C.beigeLit} opacity={0.75} />
        <text x={110} y={186} textAnchor="middle" fontFamily={FONT_MONO} fontSize={17} letterSpacing={3} fill={C.beigeLit} opacity={0.7}>
          CONTINUITY
        </text>
      </svg>
      {/* microphones */}
      {[796, 862, 1062, 1128].map((mx, i) => (
        <svg key={mx} width={70} height={190} style={{position: 'absolute', left: mx, top: 470}}>
          <rect x={31} y={44} width={8} height={150} fill={C.ink} transform={`rotate(${i % 2 ? 7 : -7} 35 120)`} />
          <ellipse cx={35} cy={36} rx={19} ry={26} fill={C.robotMid} stroke={C.ink} strokeWidth={STROKE_THIN} />
        </svg>
      ))}

      {/* the press, in the foreground, as silhouettes */}
      <Reporter x={-60} y={700} scale={1.5} handUp={0} />
      <Reporter
        x={1540}
        y={reporterUp ? 640 : 700}
        scale={1.6}
        handUp={reporterUp ? 1 : 0.1}
        flip
      />
      <Reporter x={330} y={810} scale={1.2} handUp={0} />
    </SceneFrame>
  );
};
