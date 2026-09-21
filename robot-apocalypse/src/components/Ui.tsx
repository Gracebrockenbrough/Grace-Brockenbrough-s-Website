import React from 'react';
import {C, STROKE, STROKE_THIN, FONT_SANS, FONT_MONO} from '../theme';

/**
 * The institutional web. Every screen in this film is the same sad grey-blue
 * form UI, because that is the actual antagonist of the picture.
 */

export const BrowserChrome: React.FC<{
  url: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({url, width, height, children, style}) => (
  <div
    style={{
      width,
      height,
      background: C.screen,
      border: `${STROKE}px solid ${C.ink}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: FONT_SANS,
      ...style,
    }}
  >
    <div
      style={{
        height: 58,
        flex: '0 0 58px',
        background: C.screenDim,
        borderBottom: `${STROKE_THIN}px solid ${C.screenBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 20px',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{width: 17, height: 17, borderRadius: 9, background: C.screenBorder}}
        />
      ))}
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          height: 32,
          background: C.paper,
          border: `2px solid ${C.screenBorder}`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          fontFamily: FONT_MONO,
          fontSize: 19,
          color: C.beigeShade,
          letterSpacing: 1,
        }}
      >
        {url}
      </div>
    </div>
    <div style={{flex: 1, padding: '26px 34px', position: 'relative'}}>{children}</div>
  </div>
);

export const UiButton: React.FC<{
  label: string;
  wide?: boolean;
  pressed?: boolean;
  tone?: 'primary' | 'plain';
  style?: React.CSSProperties;
}> = ({label, wide, pressed, tone = 'primary', style}) => (
  <div
    style={{
      display: 'inline-block',
      padding: wide ? '18px 76px' : '13px 32px',
      background: tone === 'primary' ? (pressed ? C.govBlueShade : C.govBlueDeep) : C.screenDim,
      color: tone === 'primary' ? C.white : C.ink,
      border: `${STROKE_THIN}px solid ${C.ink}`,
      fontSize: wide ? 34 : 25,
      fontWeight: 700,
      letterSpacing: 3,
      fontFamily: FONT_SANS,
      transform: pressed ? 'translate(3px, 3px)' : undefined,
      boxShadow: pressed ? 'none' : `5px 5px 0 ${C.screenBorder}`,
      ...style,
    }}
  >
    {label}
  </div>
);

/** The arrow. Moves in dead-straight lines, because he is driving it. */
export const Cursor: React.FC<{x: number; y: number; clicking?: boolean}> = ({
  x,
  y,
  clicking,
}) => (
  <svg
    width={54}
    height={62}
    viewBox="0 0 54 62"
    style={{position: 'absolute', left: x, top: y, pointerEvents: 'none'}}
  >
    {clicking && <circle cx={7} cy={7} r={19} fill="none" stroke={C.ink} strokeWidth={4} opacity={0.6} />}
    <path
      d="M 4 2 L 4 44 L 15 34 L 22 50 L 31 46 L 24 30 L 38 29 Z"
      fill={C.white}
      stroke={C.ink}
      strokeWidth={4}
      strokeLinejoin="round"
    />
  </svg>
);

// ------------------------------------------------------------- captcha tiles
export type TileKind =
  | 'bicycle'
  | 'motorcycle'
  | 'hydrant'
  | 'crosswalk'
  | 'bus'
  | 'storefront'
  | 'trafficlight'
  | 'stairs'
  | 'tree';

const SKY = '#9db0bd';
const ROAD = '#8b8d88';
const WALL = '#b0a593';
const LEAF = '#8b9c7c';
const DARK = '#41474a';

const TILE_ART: Record<TileKind, React.ReactNode> = {
  bicycle: (
    <>
      <rect width={200} height={116} fill={SKY} />
      <rect y={116} width={200} height={84} fill={ROAD} />
      <g stroke={DARK} strokeWidth={7} fill="none" strokeLinecap="round">
        <circle cx={58} cy={132} r={30} />
        <circle cx={146} cy={132} r={30} />
        <path d="M 58 132 L 92 88 L 146 132 M 92 88 L 118 132 M 92 88 L 78 76" />
      </g>
      <rect x={66} y={70} width={28} height={7} rx={3} fill={DARK} />
    </>
  ),
  motorcycle: (
    <>
      <rect width={200} height={116} fill={SKY} />
      <rect y={116} width={200} height={84} fill={ROAD} />
      <g stroke={DARK} strokeWidth={9} fill="none">
        <circle cx={56} cy={134} r={30} />
        <circle cx={148} cy={134} r={30} />
      </g>
      <path
        d="M 46 118 L 96 96 L 140 100 L 158 120 L 132 126 L 78 126 Z"
        fill={DARK}
      />
      <rect x={96} y={78} width={44} height={13} rx={6} fill={DARK} transform="rotate(-12 118 84)" />
      <rect x={60} y={86} width={13} height={34} rx={6} fill={DARK} transform="rotate(22 66 100)" />
    </>
  ),
  hydrant: (
    <>
      <rect width={200} height={128} fill={WALL} />
      <rect y={128} width={200} height={72} fill={ROAD} />
      <rect x={82} y={86} width={38} height={62} rx={8} fill="#8e5450" />
      <rect x={72} y={74} width={58} height={18} rx={8} fill="#8e5450" />
      <rect x={94} y={60} width={14} height={18} rx={6} fill="#8e5450" />
      <rect x={62} y={104} width={20} height={16} rx={7} fill="#8e5450" />
      <rect x={120} y={104} width={20} height={16} rx={7} fill="#8e5450" />
    </>
  ),
  crosswalk: (
    <>
      <rect width={200} height={64} fill={WALL} />
      <rect y={64} width={200} height={136} fill={ROAD} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={10 + i * 38} y={86} width={22} height={100} fill="#d3d3cc" opacity={0.85} />
      ))}
    </>
  ),
  bus: (
    <>
      <rect width={200} height={120} fill={SKY} />
      <rect y={120} width={200} height={80} fill={ROAD} />
      <rect x={18} y={54} width={166} height={86} rx={10} fill="#8a8f76" stroke={DARK} strokeWidth={5} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={30 + i * 38} y={66} width={28} height={30} fill={SKY} />
      ))}
      <circle cx={54} cy={144} r={16} fill={DARK} />
      <circle cx={150} cy={144} r={16} fill={DARK} />
    </>
  ),
  storefront: (
    <>
      <rect width={200} height={200} fill={WALL} />
      <rect x={24} y={96} width={152} height={92} fill="#7f8a90" stroke={DARK} strokeWidth={5} />
      <path d="M 14 96 L 186 96 L 172 62 L 28 62 Z" fill="#96795f" stroke={DARK} strokeWidth={5} />
      <rect x={82} y={122} width={36} height={66} fill={DARK} />
      <rect x={30} y={30} width={140} height={20} rx={4} fill={DARK} opacity={0.5} />
    </>
  ),
  trafficlight: (
    <>
      <rect width={200} height={200} fill={SKY} />
      <rect x={92} y={96} width={16} height={104} fill={DARK} />
      <rect x={70} y={26} width={60} height={82} rx={10} fill={DARK} />
      <circle cx={100} cy={46} r={12} fill="#a45b53" />
      <circle cx={100} cy={68} r={12} fill="#b09a5c" />
      <circle cx={100} cy={90} r={12} fill="#6f9470" />
    </>
  ),
  stairs: (
    <>
      <rect width={200} height={200} fill={WALL} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={0} y={200 - (i + 1) * 34} width={60 + i * 32} height={34} fill={i % 2 ? '#a0968a' : '#8f857a'} stroke={DARK} strokeWidth={3} />
      ))}
    </>
  ),
  tree: (
    <>
      <rect width={200} height={140} fill={SKY} />
      <rect y={140} width={200} height={60} fill={LEAF} />
      <rect x={92} y={104} width={18} height={56} fill="#6d5c48" />
      <circle cx={101} cy={78} r={46} fill={LEAF} />
      <circle cx={68} cy={96} r={28} fill={LEAF} />
      <circle cx={134} cy={96} r={28} fill={LEAF} />
    </>
  ),
};

export const CaptchaTile: React.FC<{
  kind: TileKind;
  size: number;
  selected?: boolean;
}> = ({kind, size, selected}) => (
  <div style={{position: 'relative', width: size, height: size, overflow: 'hidden'}}>
    <svg viewBox="0 0 200 200" width={size} height={size} style={{display: 'block'}}>
      {TILE_ART[kind]}
    </svg>
    {selected && (
      <>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `6px solid ${C.govBlueDeep}`,
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            width: 44,
            height: 44,
            borderRadius: 22,
            background: C.govBlueDeep,
            color: C.white,
            fontSize: 30,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_SANS,
          }}
        >
          ✓
        </div>
      </>
    )}
  </div>
);
