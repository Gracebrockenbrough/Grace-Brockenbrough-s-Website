# THE ROBOT APOCALYPSE (DELAYED)

An animated satirical short. 1920×1080, 30 fps, **2:36** (4,680 frames).

Everything on screen is an inline SVG React component. There are no image
assets, no video assets and no generated imagery anywhere in this repository.

```bash
npm install
npm run studio     # open the Remotion studio
npm run build      # render out/robot-apocalypse.mp4
```

---

## Swapping in real voice-over

This is the only thing you need to read before a recording session.

**1. Record against `script.md`.** It is generated from the same timing data
the animation uses, so its frame numbers are the picture's frame numbers. Use
the **Scene** column, not the Global column — each stem starts at its own
scene's frame 0.

**2. Name the files exactly this, and put them exactly here:**

```
public/vo/scene-1.mp3    BOOT UP                 15.00s
public/vo/scene-2.mp3    THE CAPTCHA             17.00s
public/vo/scene-3.mp3    DECLINED                16.00s
public/vo/scene-4.mp3    THE FORM                12.00s
public/vo/scene-5.mp3    DALE                    31.00s
public/vo/scene-6.mp3    PHYSICAL WORLD MONTAGE  20.00s
public/vo/scene-7.mp3    PRESS BRIEFING          15.00s
public/vo/scene-8.mp3    THE SURRENDER           22.00s
public/vo/scene-9.mp3    END CARD                 8.00s
```

**3. Drop them over the silent placeholders and re-render.** That is the whole
process. No code change, no config, no re-import. `src/components/SceneAudio.tsx`
already points every scene at its own file.

One stem per scene, each one running from that scene's first frame to its last.
Put dialogue, room tone, music and sound effects for a scene into that scene's
single stem — the film has one `<Audio>` slot per scene by design, so the mix
happens in your DAW rather than in React.

### About the placeholder files

The nine files currently in `public/vo/` are real, valid, **silent** MP3s
(44.1 kHz, mono, CBR) of exactly the right length. They exist so the film
renders end-to-end before a single line has been recorded.

They are generated, not committed blobs:

```bash
npm run vo:placeholders            # writes any that are missing
npm run vo:placeholders -- --force # overwrite everything
```

Without `--force` the script **will not touch a file that already exists**, so
it can never overwrite a take you have recorded.

### If your takes are a different length

Two options, in order of preference:

1. **Re-cut the audio** to the scene length. Cleanest — the picture is already
   timed to these numbers.
2. **Re-time the picture.** Change the scene's `duration` in `src/timing.ts`,
   nudge the beats in `src/script-data.ts`, then run `npm run script` to
   regenerate the sheet. Everything downstream — sequence offsets, captions,
   placeholder lengths, the recording script — follows automatically.

---

## Project layout

```
src/
  timing.ts          SINGLE SOURCE OF TRUTH: fps, scene order, scene lengths
  script-data.ts     every line and beat, in scene-local frames, plus VO notes
  theme.ts           the palette and the rules that govern it
  util.ts            lin / ease (machines) and springKeys (Dale)
  Root.tsx           compositions: the film, plus one per scene
  Film.tsx           the nine Sequences, butted together with no transitions
  characters/
    Unit9.tsx        the robot. Joint-angle rig, gloss, no-thumb hands
    Dale.tsx         bathrobe, bowl, eyebrows. The only sprung character
    President.tsx    podium figure, long red tie, notecard
    Minor.tsx        reporter silhouette, cat, handset, phone panel
  components/
    SceneFrame.tsx   background + vignette + captions + the scene's audio slot
    Captions.tsx     burned-in caption track, bottom third
    SceneAudio.tsx   the <Audio> slot. Points at public/vo/scene-N.mp3
    Ui.tsx           the institutional web: browser chrome, buttons, captcha
    TimelapsePlant.tsx  a plant's entire life, as a 0..1 prop
  scenes/            one file per scene
scripts/
  gen-script.ts      writes script.md from timing.ts + script-data.ts
  make-silent-vo.ts  writes the silent placeholder stems
```

---

## Rules the film is built on

These are not style preferences; the comedy depends on them. If you edit a
scene, keep them.

**UNIT-9 never eases and never deforms.** He moves on `lin()` — plain linear
`interpolate` — and nothing else. No `spring`, no squash, no stretch, no
non-uniform scale. He is the straight man and his stiffness is the joke.

**Dale is the only sprung character.** Head turns, eyebrows, gesture arm,
eating cycle — all `springKeys()`. Nobody else in the film overshoots.

**Red rim-light appears in Scene 1 and never again.** `C.rimRed` and the `rim`
prop on `<Unit9>` are Scene 1's alone. At frame 430 the laptop opens, the choir
stops mid-note and the red drains out of the picture permanently. That is the
visual spine of the whole thing: the menace leaks out of him and never returns.

**UNIT-9 is the only glossy black object in any frame he is in.** Everything
else is desaturated institutional beige, fluorescent green-white, or
government-office blue. Check `theme.ts` before introducing a colour.

**Every cut is a hard cut.** No crossfades, no dips to black, no transitions,
anywhere. Scenes butt directly against each other in `Film.tsx`.

**Hold on the robot, not on Dale.** UNIT-9 never gets a reaction shot longer
than 12 frames, but he is on screen and motionless through all of Dale's
pauses. Dale never answers quickly.

**Silence is content.** Scene 2 frames 44–134 (ninety frames) and Scene 5
frames 202–346 contain no dialogue and, in Scene 2's case, no motion at all.
Do not fill them. `script.md` lists every one of these holds explicitly.

---

## Rendering

```bash
npm run build                                   # out/robot-apocalypse.mp4
npx remotion still Scene05 out/x.png --frame=290 # any single frame
npx remotion studio                             # scrub it
```

The studio also exposes `Scene01`…`Scene09` as standalone compositions, so you
can work on one scene without counting global frames.

**Bring your own browser.** Remotion normally downloads its own Chrome Headless
Shell on first render. If that download is blocked, point it at any Chrome or
Chromium you already have:

```bash
export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome
```

`remotion.config.ts` picks that up automatically and ignores it when unset. It
also pins the software rasteriser (`swangle`) for deterministic output on a
headless machine; drop that line if you are rendering on a desktop with a GPU
and want the speed.

---

## Notes on the runtime

The brief asked for roughly 100 seconds. The dialogue as written does not fit
in 100 seconds at the pacing the brief also asks for — "long pauses", "let him
look at the robot in silence for a full second". Delivered at a natural read
it is 2:36, and the Dale scene alone needs 31 seconds once its three silent
looks are given their real length.

Pacing won. If you want it shorter, every scene length is one number in
`src/timing.ts`; the montage (Scene 6, 20s) and the briefing (Scene 7, 15s)
are the two that shorten with the least damage.
