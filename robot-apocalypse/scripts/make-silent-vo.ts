/**
 * Writes a silent, correctly-timed public/vo/scene-N.mp3 for every scene, so
 * the film renders with real <Audio> slots before any voice-over exists.
 *
 * These are genuine CBR MPEG-1 Layer III streams (44.1 kHz, 32 kbps, mono)
 * whose frames contain no data, which decodes to digital silence. No ffmpeg,
 * no binary blobs committed to the repo. Run `npm run vo:placeholders`.
 *
 * Existing files are NOT overwritten unless --force is passed, so this can
 * never clobber a take you have already recorded.
 */
import {writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SCENE_IDS, SCENE_META, FPS} from '../src/timing';

const HERE = dirname(fileURLToPath(import.meta.url));
const VO_DIR = join(HERE, '..', 'public', 'vo');

const SAMPLE_RATE = 44100;
const SAMPLES_PER_FRAME = 1152;
const BITRATE = 32000;
/**
 * 144 * bitrate / samplerate is 104.489 bytes at 32 kbps / 44.1 kHz, which is
 * not a whole number. CBR handles that by making most frames 104 bytes and
 * padding every other one or so to 105, signalled by the padding bit in the
 * header. Emitting only 104-byte frames would make the file 0.45% shorter than
 * the nominal bitrate says, and players compute duration from the bitrate.
 */
const FRAME_BYTES = Math.floor((144 * BITRATE) / SAMPLE_RATE); // 104
const FRAME_REMAINDER = (144 * BITRATE) / SAMPLE_RATE - FRAME_BYTES;

/**
 * MPEG-1 (11) Layer III (01), no CRC (1) | 32 kbps (0001), 44.1 kHz (00),
 * padding bit set per frame, not private | mono (11), no mode extension,
 * not copyright, original, no emphasis.
 *
 * The side info and main data are left as zeros, which is what decodes to
 * digital silence.
 */
const header = (padded: boolean) =>
  Buffer.from([0xff, 0xfb, padded ? 0x12 : 0x10, 0xc4]);

const silentMp3 = (seconds: number): Buffer => {
  const frames = Math.ceil((seconds * SAMPLE_RATE) / SAMPLES_PER_FRAME);
  const parts: Buffer[] = [];
  let carry = 0;
  for (let i = 0; i < frames; i++) {
    carry += FRAME_REMAINDER;
    const pad = carry >= 1;
    if (pad) carry -= 1;
    const frame = Buffer.alloc(FRAME_BYTES + (pad ? 1 : 0)); // zeros == silence
    header(pad).copy(frame);
    parts.push(frame);
  }
  return Buffer.concat(parts);
};

const force = process.argv.includes('--force');
mkdirSync(VO_DIR, {recursive: true});

for (const id of SCENE_IDS) {
  const {n, duration, title} = SCENE_META[id];
  const seconds = duration / FPS;
  const file = join(VO_DIR, `scene-${n}.mp3`);

  if (existsSync(file) && !force) {
    console.log(`  skip  scene-${n}.mp3  (exists -- pass --force to replace)`);
    continue;
  }
  const data = silentMp3(seconds);
  writeFileSync(file, data);
  console.log(
    `  wrote scene-${n}.mp3  ${seconds.toFixed(2)}s  ${String(duration).padStart(4)}f  ` +
      `${(data.length / 1024).toFixed(1)} KiB  -- ${title}`,
  );
}
console.log('\nDrop real recordings over these files. Same names, same folder.');
