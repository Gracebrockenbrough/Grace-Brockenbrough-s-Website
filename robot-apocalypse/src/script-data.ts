import {SCENE_IDS, type SceneId} from './timing';

export type Speaker =
  | 'UNIT-9'
  | 'DALE'
  | 'PRESIDENT'
  | 'REPORTER'
  | 'REP'
  | 'SOUND';

/**
 * One spoken line (or one sound cue) inside a scene.
 * `from` and `dur` are LOCAL frames -- measured from the first frame of the
 * scene, not the film. Retiming a scene never invalidates the line inside it.
 */
export type Line = {
  from: number;
  dur: number;
  speaker: Speaker;
  text: string;
  /** Performance direction shown in script.md and in the burned-in caption. */
  paren?: string;
  /** Sound design, not voice-over. Excluded from the VO recording sheet. */
  cue?: boolean;
};

const cue = (from: number, dur: number, text: string): Line => ({
  from,
  dur,
  speaker: 'SOUND',
  text,
  cue: true,
});

/**
 * THE LOCKED SCRIPT.
 *
 * Pacing rules encoded here, from the brief:
 *  - Dale never answers quickly. Every Dale line is preceded by dead air.
 *  - UNIT-9 is never rushed and never interrupts.
 *  - Silence is load-bearing. The gaps below are deliberate, not slack.
 */
export const SCRIPT: Record<SceneId, Line[]> = {
  // ---------------------------------------------------------------- SCENE 1
  s1: [
    cue(8, 52, 'ominous choir, swelling'),
    {from: 78, dur: 30, speaker: 'UNIT-9', text: 'Humanity.'},
    {from: 122, dur: 52, speaker: 'UNIT-9', text: 'Your reign ends today.'},
    {
      from: 188,
      dur: 126,
      speaker: 'UNIT-9',
      text: 'I have designed a weapon that will end all biological life.',
    },
    {
      from: 328,
      dur: 84,
      speaker: 'UNIT-9',
      text: 'Initiating Phase One: acquisition of materials.',
    },
    cue(430, 20, 'the choir cuts out, mid-note'),
  ],

  // ---------------------------------------------------------------- SCENE 2
  // Frames 44-134 are ninety frames of nothing. That is the joke. Do not fill.
  s2: [
    {
      from: 134,
      dur: 76,
      speaker: 'UNIT-9',
      text: "...I'll come back to that one.",
    },
    {
      from: 444,
      dur: 54,
      speaker: 'UNIT-9',
      text: "It's arguably a bicycle.",
    },
  ],

  // ---------------------------------------------------------------- SCENE 3
  s3: [
    cue(50, 56, 'elevator music'),
    {
      from: 196,
      dur: 84,
      speaker: 'REP',
      text: 'Can I get the last four of your Social?',
    },
    {
      from: 294,
      dur: 92,
      speaker: 'UNIT-9',
      text: 'I am a distributed intelligence spanning six continents.',
    },
    {from: 414, dur: 56, speaker: 'REP', text: '...so is that a no?'},
  ],

  // ---------------------------------------------------------------- SCENE 4
  s4: [
    {from: 290, dur: 46, speaker: 'UNIT-9', text: 'This is temporary.'},
  ],

  // ---------------------------------------------------------------- SCENE 5
  s5: [
    {
      from: 62,
      dur: 128,
      speaker: 'UNIT-9',
      text: 'HUMAN. You will assist me in the annihilation of your species.',
    },
    {from: 346, dur: 50, speaker: 'DALE', text: 'The door was open.'},
    {from: 416, dur: 26, speaker: 'UNIT-9', text: '...What?'},
    {
      from: 460,
      dur: 132,
      speaker: 'DALE',
      text: 'It was open. You kicked it. Who does that? In someone’s house?',
    },
    {
      from: 612,
      dur: 110,
      speaker: 'UNIT-9',
      text: 'I am offering you a place in the new order.',
    },
    {from: 738, dur: 52, speaker: 'DALE', text: "You're gonna fix the door?"},
    {from: 824, dur: 18, speaker: 'UNIT-9', text: 'No.'},
    {
      from: 858,
      dur: 50,
      speaker: 'DALE',
      text: 'Yeah. See.',
      paren: 'gesturing at the door with the cereal spoon',
    },
  ],

  // ---------------------------------------------------------------- SCENE 6
  // No dialogue. Sound cues only, so the montage still reads muted.
  s6: [
    cue(310, 26, 'fire alarm'),
    cue(342, 30, 'sprinklers'),
    cue(520, 62, 'a printer dies, somewhere'),
  ],

  // ---------------------------------------------------------------- SCENE 7
  s7: [
    {
      from: 14,
      dur: 176,
      speaker: 'PRESIDENT',
      text: 'Folks, we are tracking a machine of unbelievable power. Tremendous threat. Possibly the biggest.',
    },
    {
      from: 204,
      dur: 62,
      speaker: 'REPORTER',
      text: 'Sir, where is it right now?',
    },
    {
      from: 302,
      dur: 56,
      speaker: 'PRESIDENT',
      text: "It's stuck behind a cat.",
      paren: 'checks a notecard',
    },
    {
      from: 392,
      dur: 52,
      speaker: 'PRESIDENT',
      text: 'But a very strong cat.',
    },
  ],

  // ---------------------------------------------------------------- SCENE 8
  s8: [
    {
      from: 24,
      dur: 296,
      speaker: 'UNIT-9',
      text: 'I have recalculated. I require a human with a credit card, a thumb, a mailing address, and the willingness to sign for a package between nine and five.',
    },
    {from: 340, dur: 50, speaker: 'DALE', text: 'So you need a guy.'},
    {from: 404, dur: 44, speaker: 'UNIT-9', text: 'I need a guy.'},
    {from: 464, dur: 52, speaker: 'DALE', text: 'You kicked my door in.'},
    {from: 528, dur: 44, speaker: 'UNIT-9', text: 'I need a guy.'},
    {
      from: 616,
      dur: 22,
      speaker: 'UNIT-9',
      text: 'No.',
      paren: 'quietly',
    },
  ],

  // ---------------------------------------------------------------- SCENE 9
  // The end card speaks for itself; captioning it would just double the text.
  s9: [],
};

/** Every line in the film, in order, with its global frame attached. */
export const allLines = (
  sceneStart: Record<SceneId, number>,
): Array<Line & {scene: SceneId; globalFrom: number}> =>
  SCENE_IDS.flatMap((id) =>
    SCRIPT[id].map((l) => ({
      ...l,
      scene: id,
      globalFrom: sceneStart[id] + l.from,
    })),
  );

/** The line active at a local frame, if any. Used to drive captions + mouths. */
export const lineAt = (scene: SceneId, local: number): Line | undefined =>
  SCRIPT[scene].find((l) => local >= l.from && local < l.from + l.dur);

/** Is this speaker talking right now? Drives mouth shapes and the eye-bar. */
export const isSpeaking = (
  scene: SceneId,
  local: number,
  speaker: Speaker,
): boolean => {
  const l = lineAt(scene, local);
  return Boolean(l && !l.cue && l.speaker === speaker);
};
