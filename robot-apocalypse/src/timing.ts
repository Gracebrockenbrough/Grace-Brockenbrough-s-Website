/**
 * Single source of truth for the cut.
 *
 * Every scene length, every line, and every beat in the film is derived from
 * this file and from script-data.ts. `script.md` is GENERATED from them
 * (`npm run script`), so the VO sheet can never drift out of sync with the
 * picture. Change a number here and the whole film -- sequences, captions,
 * audio slots and the recording script -- retimes together.
 *
 * NOTE ON RUNTIME: the brief asked for ~100s. The written dialogue does not
 * fit in 100s at the pacing the brief also asks for ("long pauses", "let him
 * look at the robot in silence for a full second"). Delivered at a natural
 * read, the script is ~155s. Pacing won over the stopwatch. To compress,
 * shorten scenes here and pull the matching beats in script-data.ts.
 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Convert seconds to frames, rounded to a whole frame. */
export const sec = (s: number) => Math.round(s * FPS);

export const SCENE_IDS = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9',
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export const SCENE_META: Record<
  SceneId,
  {n: number; title: string; duration: number}
> = {
  s1: {n: 1, title: 'BOOT UP', duration: sec(15)},
  s2: {n: 2, title: 'THE CAPTCHA', duration: sec(17)},
  s3: {n: 3, title: 'DECLINED', duration: sec(16)},
  s4: {n: 4, title: 'THE FORM', duration: sec(12)},
  s5: {n: 5, title: 'DALE', duration: sec(31)},
  s6: {n: 6, title: 'PHYSICAL WORLD MONTAGE', duration: sec(20)},
  s7: {n: 7, title: 'PRESS BRIEFING', duration: sec(15)},
  s8: {n: 8, title: 'THE SURRENDER', duration: sec(22)},
  s9: {n: 9, title: 'END CARD', duration: sec(8)},
};

/** Global start frame of each scene, accumulated in order. */
export const SCENE_START: Record<SceneId, number> = (() => {
  const out = {} as Record<SceneId, number>;
  let at = 0;
  for (const id of SCENE_IDS) {
    out[id] = at;
    at += SCENE_META[id].duration;
  }
  return out;
})();

export const TOTAL_FRAMES = SCENE_IDS.reduce(
  (n, id) => n + SCENE_META[id].duration,
  0,
);

/** "1:23:04" style timecode (m:ss:ff) for the recording script. */
export const timecode = (frame: number) => {
  const totalSeconds = Math.floor(frame / FPS);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const f = frame % FPS;
  return `${m}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};
