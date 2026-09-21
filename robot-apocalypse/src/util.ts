import {interpolate, Easing, spring} from 'remotion';

/**
 * Clamped linear interpolation. UNIT-9 and every piece of UI in this film move
 * on this and nothing else -- no easing, no overshoot. Dale gets `spring`.
 */
export const lin = (
  frame: number,
  range: readonly [number, number],
  out: readonly [number, number],
) =>
  interpolate(frame, range as unknown as number[], out as unknown as number[], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Eased interpolation. For the President and for camera moves only. */
export const ease = (
  frame: number,
  range: readonly [number, number],
  out: readonly [number, number],
) =>
  interpolate(frame, range as unknown as number[], out as unknown as number[], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

/** Hard on/off. Returns `on` at or after `at`, otherwise `off`. */
export const at = <T,>(frame: number, when: number, off: T, on: T): T =>
  frame >= when ? on : off;

/** True inside [from, to). */
export const between = (frame: number, from: number, to: number) =>
  frame >= from && frame < to;

/** Quantise a 0..1 progress into `steps` hard stages -- for machine motion. */
export const stepped = (t: number, steps: number) =>
  Math.min(1, Math.floor(t * steps) / (steps - 1));

/**
 * Deterministic speech level, 0..1. Same frame always gives the same value, so
 * renders are reproducible and stills match the studio.
 */
export const talkLevel = (frame: number, active: boolean) =>
  active
    ? 0.3 +
      0.7 *
        Math.abs(
          Math.sin(frame * 0.81) * 0.55 +
            Math.sin(frame * 2.17 + 1.1) * 0.3 +
            Math.sin(frame * 4.3) * 0.15,
        )
    : 0;

/** Stable pseudo-random in [0,1) from an integer seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A hard, machine-like flicker: on/off driven by a seeded pattern. */
export const flicker = (frame: number, seed = 0, chance = 0.5) =>
  rand(Math.floor(frame) + seed) < chance ? 1 : 0;

/** Parse #rrggbb into [r,g,b]. */
const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

/** Blend two hex colors. Used for the plant going from alive to not. */
export const mix = (a: string, b: string, t: number) => {
  const u = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * u)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
};

/** Normalise `v` from [lo,hi] into [0,1], clamped. */
export const span = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(1, (v - lo) / (hi - lo)));


export type Key = {at: number; v: number};

/**
 * Step through keyframes with a SPRING on every transition.
 *
 * Reserved for Dale. He is the only character in the film who overshoots, and
 * this is how. UNIT-9 and the President use `lin`/`ease` instead.
 */
export const springKeys = (
  frame: number,
  fps: number,
  keys: Key[],
  config: {damping?: number; stiffness?: number; mass?: number} = {},
) => {
  const cfg = {damping: 11, stiffness: 150, mass: 0.85, ...config};
  const passed = keys.filter((k) => frame >= k.at);
  if (passed.length === 0) return keys[0].v;
  const cur = passed[passed.length - 1];
  const prev = passed.length > 1 ? passed[passed.length - 2] : cur;
  if (cur === prev) return cur.v;
  const t = spring({frame: frame - cur.at, fps, config: cfg});
  return prev.v + (cur.v - prev.v) * t;
};
