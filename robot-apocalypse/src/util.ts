import {interpolate, Easing} from 'remotion';

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
