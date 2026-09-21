import React from 'react';
import {C, STROKE, STROKE_THIN} from '../theme';
import {mix, span} from '../util';

/**
 * A potted plant living an entire life while a robot is on hold.
 *
 * Drive it with `t` from 0 to 1 over exactly four seconds. The life stages:
 *
 *   0.00 - 0.09  bare soil
 *   0.09 - 0.24  a shoot
 *   0.24 - 0.46  stem climbs, three pairs of leaves unfurl
 *   0.46 - 0.58  a bud
 *   0.58 - 0.72  it blooms. This is as good as things get.
 *   0.72 - 0.87  colour drains, petals let go
 *   0.87 - 1.00  the stem gives up and folds over
 */
const LIVE = '#6f8f5e';
const DYING = '#94793f';
const DEAD = '#6b5a45';

const MAX_H = 210;
const LEAVES = [
  {at: 0.26, up: 0.34, side: -1},
  {at: 0.33, up: 0.52, side: 1},
  {at: 0.4, up: 0.7, side: -1},
];

/** Height of the pot below the soil line, in viewBox units. */
export const POT_DEPTH = 96;
/** Offset from the SVG's top-left to the viewBox origin, in viewBox units. */
export const PLANT_ORIGIN = {x: 150, y: 300};

export const TimelapsePlant: React.FC<{
  t: number;
  x?: number;
  y?: number;
  scale?: number;
}> = ({t, x = 0, y = 0, scale = 1}) => {
  const grow = span(t, 0.09, 0.46);
  const wilt = span(t, 0.72, 0.9);
  const collapse = Math.pow(span(t, 0.87, 1), 1.5);

  const green = mix(mix(LIVE, DYING, wilt), DEAD, collapse);
  const h = MAX_H * (0.06 + 0.94 * grow);

  // the stem folds over once it has nothing left to prove
  const tipX = collapse * 78;
  const tipY = -h * (1 - collapse * 0.62);
  const ctrlX = collapse * 16;
  const ctrlY = -h * 0.74;

  const bud = span(t, 0.46, 0.58);
  const bloom = span(t, 0.58, 0.72);
  const shed = span(t, 0.76, 0.92);
  const flowerR = 6 + 10 * bud + 26 * bloom;

  return (
    <svg
      viewBox="-150 -300 300 410"
      width={300 * scale}
      height={410 * scale}
      style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}
    >
      {/* --- the plant, drawn from the soil line at y=0 --- */}
      {grow > 0 && (
        <>
          <path
            d={`M 0 0 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
            fill="none"
            stroke={green}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <path
            d={`M 0 0 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
            fill="none"
            stroke={C.ink}
            strokeWidth={STROKE_THIN}
            strokeLinecap="round"
            opacity={0.55}
          />

          {LEAVES.map((lf, i) => {
            const open = span(t, lf.at, lf.at + 0.12);
            if (open <= 0) return null;
            // ride the actual stem curve, or the leaves float off it when it folds
            const u = lf.up;
            const lx = 2 * (1 - u) * u * ctrlX + u * u * tipX;
            const ly = 2 * (1 - u) * u * ctrlY + u * u * tipY;
            const droop = collapse * 26 + wilt * 12;
            return (
              <g key={i} transform={`translate(${lx} ${ly}) rotate(${lf.side * (32 + droop) * -1})`}>
                <ellipse
                  cx={lf.side * 34 * open}
                  cy={0}
                  rx={34 * open}
                  ry={15 * open}
                  fill={green}
                  stroke={C.ink}
                  strokeWidth={STROKE_THIN}
                />
              </g>
            );
          })}

          {/* bud, then flower, then not */}
          {bud > 0 && (
            <g transform={`translate(${tipX} ${tipY})`}>
              {bloom > 0 &&
                [0, 60, 120, 180, 240, 300].map((a, i) => {
                  const gone = span(shed, i / 8, i / 8 + 0.3);
                  if (gone >= 1) return null;
                  return (
                    <ellipse
                      key={a}
                      cx={0}
                      cy={-flowerR * 0.8}
                      rx={flowerR * 0.5}
                      ry={flowerR * 0.86}
                      fill={mix('#d6a8b4', '#a08a72', wilt)}
                      stroke={C.ink}
                      strokeWidth={STROKE_THIN}
                      opacity={1 - gone}
                      transform={`rotate(${a}) translate(0 ${gone * 26})`}
                    />
                  );
                })}
              <circle
                r={Math.max(4, flowerR * (bloom > 0 ? 0.42 : 0.7) * (1 - shed * 0.4))}
                fill={mix(mix('#c9a44c', LIVE, 1 - bud), '#6f5c3f', wilt)}
                stroke={C.ink}
                strokeWidth={STROKE_THIN}
              />
            </g>
          )}
        </>
      )}

      {/* --- the pot. Outlives it. --- */}
      <path
        d="M -76 0 L 76 0 L 62 86 Q 60 96 48 96 L -48 96 Q -60 96 -62 86 Z"
        fill={C.beigeDeep}
        stroke={C.ink}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <rect x={-84} y={-14} width={168} height={22} rx={6} fill={C.beigeShade} stroke={C.ink} strokeWidth={STROKE} />
      <ellipse cx={0} cy={-8} rx={72} ry={11} fill="#5d4d3c" stroke={C.ink} strokeWidth={STROKE_THIN} />

      {/* what is left on the soil at the end */}
      {shed > 0.5 &&
        [-38, -12, 22, 44].map((px, i) => (
          <ellipse
            key={px}
            cx={px}
            cy={-9 + (i % 2) * 3}
            rx={11}
            ry={5}
            fill={mix('#d6a8b4', '#8b7a63', 1)}
            stroke={C.ink}
            strokeWidth={2}
            opacity={span(shed, 0.5 + i * 0.08, 0.7 + i * 0.08)}
          />
        ))}
    </svg>
  );
};
