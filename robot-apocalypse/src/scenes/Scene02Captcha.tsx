import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';
import {Unit9, U9, lerpPose} from '../characters/Unit9';
import {SceneFrame} from '../components/SceneFrame';
import {BrowserChrome, UiButton, Cursor, CaptchaTile, type TileKind} from '../components/Ui';
import {lin, talkLevel, between} from '../util';
import {isSpeaking} from '../script-data';

/**
 * SCENE 2 -- THE CAPTCHA (0:15-0:32)
 *
 * The three seconds from frame 44 to frame 134 are the most important three
 * seconds in this scene and NOTHING in the picture is allowed to move during
 * them. No blinking cursor, no LED, no idle. If you add an animated element to
 * this scene, gate it on `frame < 44 || frame >= 134`.
 */
const SILENCE_IN = 44;
const SILENCE_OUT = 134;
const CUT_TO_GRID = 214;
const CUT_TO_WIDE = 444;
/** Desk surface height. His hand has to land on it, so it is a constant. */
const DESK = 792;
/** Hand down on the mouse: forearm angled down-right, not floating. */
const ON_MOUSE = {...U9.idle, rShoulder: -46, rElbow: -22, lShoulder: 6};

type Attempt = {
  /** Grid contents for this attempt. */
  tiles: TileKind[];
  /** Which indices end up selected, and on which frame each is clicked. */
  picks: Array<{i: number; at: number}>;
  verifyAt: number;
  failAt: number;
  until: number;
};

const ATTEMPTS: Attempt[] = [
  // 1. Every square. Surely one of them.
  {
    tiles: ['bicycle', 'crosswalk', 'hydrant', 'bus', 'bicycle', 'storefront', 'trafficlight', 'tree', 'stairs'],
    picks: Array.from({length: 9}).map((_, i) => ({i, at: 228 + i * 8})),
    verifyAt: 302,
    failAt: 308,
    until: 320,
  },
  // 2. No squares. By elimination.
  {
    tiles: ['storefront', 'bicycle', 'tree', 'crosswalk', 'stairs', 'bicycle', 'bus', 'hydrant', 'trafficlight'],
    picks: [],
    verifyAt: 352,
    failAt: 358,
    until: 372,
  },
  // 3. The motorcycle. With total confidence.
  {
    tiles: ['tree', 'stairs', 'bus', 'hydrant', 'motorcycle', 'crosswalk', 'storefront', 'bicycle', 'trafficlight'],
    picks: [{i: 4, at: 396}],
    verifyAt: 408,
    failAt: 414,
    until: 430,
  },
];

const attemptAt = (f: number) =>
  f < ATTEMPTS[0].until ? 0 : f < ATTEMPTS[1].until ? 1 : 2;

/** The captcha panel, centred, sized so VERIFY is never off the bottom. */
const PANEL = {x: 592, y: 74, w: 736};
const GRID = {x: PANEL.x + 24, y: 268, tile: 216, gap: 8};
const GRID_BOTTOM = GRID.y + 3 * (GRID.tile + GRID.gap) - GRID.gap;
const VERIFY = {x: PANEL.x + PANEL.w - 218, y: GRID_BOTTOM + 34};

const tileCenter = (i: number) => ({
  x: GRID.x + (i % 3) * (GRID.tile + GRID.gap) + GRID.tile / 2,
  y: GRID.y + Math.floor(i / 3) * (GRID.tile + GRID.gap) + GRID.tile / 2,
});

// ------------------------------------------------------------------ the wide
const CheckoutPage: React.FC<{frame: number}> = ({frame}) => {
  const ordered = frame >= 30;
  return (
    <BrowserChrome url="supply-chain-direct.com/checkout" width={1120} height={572}>
      <div style={{fontSize: 25, color: C.ink, lineHeight: 1.62}}>
        <div style={{fontSize: 24, letterSpacing: 5, fontWeight: 700, color: C.beigeShade}}>
          ORDER SUMMARY
        </div>
        {[
          ['Tungsten carbide rod, 2 m', '4,000'],
          ['Neurotoxin precursor, drum', '1'],
          ['Cable ties (pack of 50)', '2'],
        ].map(([a, b]) => (
          <div key={a} style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>{a}</span>
            <span style={{fontFamily: FONT_MONO}}>x {b}</span>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: `3px solid ${C.screenBorder}`,
            marginTop: 8,
            paddingTop: 8,
            fontWeight: 700,
          }}
        >
          <span>TOTAL</span>
          <span style={{fontFamily: FONT_MONO}}>$2,144,880.00</span>
        </div>
      </div>

      {/* the checkbox */}
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '13px 20px',
          background: C.paper,
          border: `${STROKE_THIN}px solid ${ordered ? C.alert : C.screenBorder}`,
          width: 600,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            border: `4px solid ${C.ink}`,
            background: C.white,
            flex: '0 0 42px',
          }}
        />
        <div style={{fontSize: 30, color: C.ink}}>I am not a robot</div>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: FONT_MONO,
            fontSize: 15,
            color: C.beigeShade,
            textAlign: 'right',
            lineHeight: 1.2,
          }}
        >
          VERIFY
          <br />
          Privacy · Terms
        </div>
      </div>
      {ordered && (
        <div style={{color: C.alert, fontSize: 24, marginTop: 10, fontWeight: 700}}>
          Please confirm you are not a robot.
        </div>
      )}

      <div style={{position: 'absolute', right: 34, bottom: 26}}>
        <UiButton label="PLACE ORDER" wide pressed={between(frame, 14, 22)} />
      </div>
    </BrowserChrome>
  );
};

const FailedCaptchaPage: React.FC = () => (
  <BrowserChrome url="supply-chain-direct.com/verify" width={1120} height={572}>
    <div style={{display: 'flex', gap: 30, height: '100%'}}>
      <div
        style={{
          background: C.ink,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 126px)',
          gap: 6,
          padding: 10,
          alignSelf: 'flex-start',
        }}
      >
        {ATTEMPTS[2].tiles.map((k, i) => (
          <CaptchaTile key={i} kind={k} size={126} selected={i === 4} />
        ))}
      </div>
      <div style={{flex: 1, paddingTop: 6}}>
        <div style={{fontSize: 24, letterSpacing: 3, color: C.beigeShade}}>
          Select all squares containing
        </div>
        <div style={{fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1.15}}>
          a bicycle
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 30,
            background: C.alert,
            color: C.white,
            padding: '14px 24px',
            fontSize: 30,
            fontWeight: 700,
            border: `${STROKE_THIN}px solid ${C.ink}`,
          }}
        >
          Please try again.
        </div>
        <div style={{marginTop: 26, fontFamily: FONT_MONO, fontSize: 21, color: C.beigeShade}}>
          ATTEMPTS: 3
        </div>
      </div>
    </div>
  </BrowserChrome>
);

const WideShot: React.FC<{frame: number}> = ({frame}) => {
  const afterGrid = frame >= CUT_TO_WIDE;
  // Cursor: parks on the checkbox and does not move for the whole silence.
  const cx =
    frame < 14
      ? 1560
      : frame < SILENCE_IN
        ? lin(frame, [14, 30], [1560, 806])
        : frame < SILENCE_OUT
          ? 806
          : lin(frame, [SILENCE_OUT, SILENCE_OUT + 40], [806, 1300]);
  const cy =
    frame < 14
      ? 600
      : frame < SILENCE_IN
        ? lin(frame, [14, 30], [600, 430])
        : frame < SILENCE_OUT
          ? 430
          : lin(frame, [SILENCE_OUT, SILENCE_OUT + 40], [430, 596]);

  const speaking = isSpeaking('s2', frame, 'UNIT-9');
  // He puts a hand on the mouse at the start and then does not move again.
  const onMouse = afterGrid ? 1 : lin(frame, [0, 12], [0, 1]);

  return (
    <>
      <AbsoluteFill style={{background: C.fluoro}} />
      {/* overhead fluorescent wash */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 340,
          background: `linear-gradient(180deg, ${C.fluoroLit} 0%, rgba(243,247,239,0) 100%)`,
        }}
      />
      {/* desk: surface, front edge, then floor */}
      <div style={{position: 'absolute', left: 0, right: 0, top: DESK, height: 20, background: C.beigeLit, borderTop: `${STROKE}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: DESK + 20, height: 86, background: C.beigeDeep, borderBottom: `${STROKE}px solid ${C.ink}`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: DESK + 106, bottom: 0, background: C.fluoroDeep}} />

      <Unit9
        pose={lerpPose(U9.idle, ON_MOUSE, onMouse)}
        eye={1}
        talk={talkLevel(frame, speaking)}
        x={-150}
        y={228}
        scale={2}
      />

      {/* the mouse, with a four-fingered hand resting on top of it */}
      <svg width={220} height={140} style={{position: 'absolute', left: 452, top: 724}}>
        <ellipse cx={104} cy={70} rx={58} ry={38} fill={C.beigeLit} stroke={C.ink} strokeWidth={STROKE} />
        <line x1={104} y1={36} x2={104} y2={68} stroke={C.ink} strokeWidth={3} />
      </svg>

      {/* monitor */}
      <div style={{position: 'absolute', left: 672, top: 62}}>
        <div
          style={{
            background: C.beigeDeep,
            border: `${STROKE}px solid ${C.ink}`,
            padding: 22,
            boxShadow: `14px 14px 0 rgba(21,23,27,0.18)`,
          }}
        >
          {afterGrid ? <FailedCaptchaPage /> : <CheckoutPage frame={frame} />}
          <div
            style={{
              textAlign: 'center',
              fontFamily: FONT_MONO,
              fontSize: 17,
              color: C.beigeShade,
              letterSpacing: 4,
              paddingTop: 10,
            }}
          >
            CIVIC-9000
          </div>
        </div>
        <div style={{width: 120, height: 58, background: C.beigeShade, border: `${STROKE}px solid ${C.ink}`, margin: '0 auto'}} />
        <div style={{width: 360, height: 20, background: C.beigeDeep, border: `${STROKE}px solid ${C.ink}`, margin: '0 auto'}} />
      </div>

      {!afterGrid && <Cursor x={cx} y={cy} clicking={between(frame, 14, 20)} />}
    </>
  );
};

// ------------------------------------------------------------------ the grid
const GridShot: React.FC<{frame: number}> = ({frame}) => {
  const a = ATTEMPTS[attemptAt(frame)];
  const failed = frame >= a.failAt && frame < a.until;
  const selected = new Set(a.picks.filter((p) => frame >= p.at).map((p) => p.i));

  // The cursor walks the grid in straight lines, one target at a time.
  const targets = [...a.picks.map((p) => ({...tileCenter(p.i), at: p.at})), {x: VERIFY.x + 60, y: VERIFY.y + 24, at: a.verifyAt}];
  let cur = {x: VERIFY.x + 60, y: VERIFY.y + 24};
  let prevAt = a.picks.length ? a.picks[0].at - 14 : a.verifyAt - 26;
  let prev =
    attemptAt(frame) === 0 ? {x: 960, y: 176} : {x: VERIFY.x + 60, y: VERIFY.y + 24};
  for (const t of targets) {
    if (frame >= t.at) {
      prev = {x: t.x, y: t.y};
      prevAt = t.at;
      cur = {x: t.x, y: t.y};
    } else {
      cur = {
        x: lin(frame, [prevAt, t.at], [prev.x, t.x]),
        y: lin(frame, [prevAt, t.at], [prev.y, t.y]),
      };
      break;
    }
  }
  const clicking = [...a.picks.map((p) => p.at), a.verifyAt].some(
    (t) => frame >= t && frame < t + 4,
  );

  return (
    <>
      <AbsoluteFill style={{background: C.screenDim}} />
      {/* we are still inside the same sad browser window */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 46,
          background: C.beigeDeep,
          borderBottom: `${STROKE_THIN}px solid ${C.ink}`,
          fontFamily: FONT_MONO,
          fontSize: 20,
          color: C.beigeShade,
          letterSpacing: 2,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 26,
        }}
      >
        supply-chain-direct.com/verify
      </div>

      <div
        style={{
          position: 'absolute',
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          background: C.screen,
          border: `${STROKE}px solid ${C.ink}`,
          boxShadow: `16px 16px 0 rgba(21,23,27,0.14)`,
          fontFamily: FONT_SANS,
        }}
      >
        <div style={{background: C.govBlueDeep, color: C.white, padding: '24px 26px'}}>
          <div style={{fontSize: 25, letterSpacing: 3, opacity: 0.78}}>
            Select all squares containing
          </div>
          <div style={{fontSize: 60, fontWeight: 700, letterSpacing: 2, lineHeight: 1.1}}>
            a bicycle
          </div>
        </div>

        <div
          style={{
            padding: 24,
            display: 'grid',
            gridTemplateColumns: `repeat(3, ${GRID.tile}px)`,
            gap: GRID.gap,
            background: C.ink,
          }}
        >
          {a.tiles.map((k, i) => (
            <CaptchaTile
              key={`${attemptAt(frame)}-${i}`}
              kind={k}
              size={GRID.tile}
              selected={selected.has(i)}
            />
          ))}
        </div>

        <div
          style={{
            height: 108,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 26px',
          }}
        >
          <div>
            {failed && (
              <div
                style={{
                  background: C.alert,
                  color: C.white,
                  padding: '12px 22px',
                  fontSize: 29,
                  fontWeight: 700,
                  border: `${STROKE_THIN}px solid ${C.ink}`,
                }}
              >
                Please try again.
              </div>
            )}
          </div>
          <UiButton label="VERIFY" pressed={between(frame, a.verifyAt, a.verifyAt + 5)} />
        </div>
      </div>

      <Cursor x={cur.x} y={cur.y} clicking={clicking} />
    </>
  );
};

export const Scene02Captcha: React.FC = () => {
  const frame = useCurrentFrame();
  const onGrid = frame >= CUT_TO_GRID && frame < CUT_TO_WIDE;
  return (
    <SceneFrame scene="s2" background={C.fluoro} vignette={0.2}>
      {onGrid ? <GridShot frame={frame} /> : <WideShot frame={frame} />}
    </SceneFrame>
  );
};
