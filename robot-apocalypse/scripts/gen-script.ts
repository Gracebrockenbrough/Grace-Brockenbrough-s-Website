/**
 * Generates script.md from the same data the picture is cut from.
 *
 * timing.ts owns the scene lengths, script-data.ts owns every line and beat.
 * Running `npm run script` regenerates the recording sheet, so the timings a
 * voice actor reads against can never drift away from the film.
 */
import {writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  FPS,
  SCENE_IDS,
  SCENE_META,
  SCENE_START,
  TOTAL_FRAMES,
  timecode,
} from '../src/timing';
import {SCRIPT, NOTES, type Line} from '../src/script-data';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'script.md');

/** m:ss.s */
const clock = (frame: number) => {
  const t = frame / FPS;
  return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
};

const secs = (f: number) => `${(f / FPS).toFixed(2)}s`;

/** A silence worth calling out on the page. */
const HOLD_MIN = 15;

const rows = (id: (typeof SCENE_IDS)[number]) => {
  const start = SCENE_START[id];
  const dur = SCENE_META[id].duration;
  const lines = [...SCRIPT[id]].sort((a, b) => a.from - b.from);
  const out: string[] = [];

  let cursor = 0;
  const hold = (from: number, to: number) => {
    if (to - from >= HOLD_MIN) {
      out.push(
        `| | | | **${to - from}f** | *— hold —* | *(${secs(to - from)} of silence)* |`,
      );
    }
  };

  for (const l of lines) {
    hold(cursor, l.from);
    const label = l.cue ? `*SOUND*` : `**${l.speaker}**`;
    const text = l.cue
      ? `*[ ${l.text} ]*`
      : `${l.paren ? `*(${l.paren})* ` : ''}${l.text}`;
    out.push(
      `| ${start + l.from} | ${l.from} | ${timecode(start + l.from)} | ${l.dur}f · ${secs(l.dur)} | ${label} | ${text} |`,
    );
    cursor = Math.max(cursor, l.from + l.dur);
  }
  hold(cursor, dur);
  return out;
};

const lineCount = (l: Line[]) => l.filter((x) => !x.cue).length;

const md: string[] = [];

md.push('# THE ROBOT APOCALYPSE (DELAYED)');
md.push('');
md.push('**Locked VO script with frame-accurate timings.**');
md.push('');
md.push(
  `Runtime **${clock(TOTAL_FRAMES)}** · **${TOTAL_FRAMES} frames** · ${FPS} fps · 1920×1080`,
);
md.push('');
md.push(
  'This file is GENERATED. Do not hand-edit it — change `src/timing.ts` (scene',
  'lengths) or `src/script-data.ts` (lines and beats) and run `npm run script`.',
  'The picture and this sheet are cut from the same numbers, so they cannot',
  'disagree.',
);
md.push('');
md.push('---');
md.push('');
md.push('## How to read this');
md.push('');
md.push('- **Global** — frame number in the finished film.');
md.push('- **Scene** — frame number inside that scene\'s `.mp3`. **Record against this one.**');
md.push('  Each `public/vo/scene-N.mp3` starts at that scene\'s frame 0.');
md.push('- **TC** — `m:ss:ff` in the finished film.');
md.push('- ***— hold —*** rows are deliberate silence. They are written into the');
md.push('  picture. Leave them empty; they are doing the work.');
md.push('- ***SOUND*** rows are sound design, not voice-over. They still belong in');
md.push('  the scene stem.');
md.push('');
md.push('---');
md.push('');

// contents
md.push('## Scenes');
md.push('');
md.push('| # | Scene | In | Out | Frames | Length | Lines |');
md.push('|---|---|---|---|---|---|---|');
for (const id of SCENE_IDS) {
  const m = SCENE_META[id];
  const a = SCENE_START[id];
  md.push(
    `| ${m.n} | ${m.title} | ${clock(a)} | ${clock(a + m.duration)} | ${a}–${a + m.duration - 1} | ${secs(m.duration)} | ${lineCount(SCRIPT[id])} |`,
  );
}
md.push('');
md.push('---');
md.push('');

for (const id of SCENE_IDS) {
  const m = SCENE_META[id];
  const a = SCENE_START[id];
  md.push(`## ${m.n}. ${m.title}`);
  md.push('');
  md.push(
    `\`${clock(a)} – ${clock(a + m.duration)}\` · frames \`${a}–${a + m.duration - 1}\` · ${m.duration} frames · ${secs(m.duration)} · stem: \`public/vo/scene-${m.n}.mp3\``,
  );
  md.push('');
  for (const n of NOTES[id]) md.push(`> ${n}`);
  md.push('');
  const r = rows(id);
  if (r.length === 0) {
    md.push('*No dialogue and no cues in this scene.*');
  } else {
    md.push('| Global | Scene | TC | Dur | Who | Line |');
    md.push('|---:|---:|---|---|---|---|');
    md.push(...r);
  }
  md.push('');
}

md.push('---');
md.push('');
md.push('## Totals');
md.push('');
const all = SCENE_IDS.flatMap((id) => SCRIPT[id]);
const spoken = all.filter((l) => !l.cue);
const speech = spoken.reduce((n, l) => n + l.dur, 0);
md.push(`- Spoken lines: **${spoken.length}**`);
md.push(`- Sound cues: **${all.length - spoken.length}**`);
md.push(
  `- Time with someone speaking: **${secs(speech)}** of ${secs(TOTAL_FRAMES)} (${Math.round((speech / TOTAL_FRAMES) * 100)}%)`,
);
md.push(
  `- Time with nobody speaking: **${secs(TOTAL_FRAMES - speech)}** (${Math.round(((TOTAL_FRAMES - speech) / TOTAL_FRAMES) * 100)}%)`,
);
md.push('');
md.push('That second number is not slack. It is the joke.');
md.push('');

writeFileSync(OUT, md.join('\n'));
console.log(`script.md written — ${TOTAL_FRAMES} frames, ${spoken.length} spoken lines`);
