/**
 * Palette & look.
 *
 * Rule of the film: every background is a desaturated institutional surface --
 * beige, fluorescent green-white, or government-office blue. UNIT-9 is the only
 * glossy black object in any frame he occupies, which is why ROBOT_* are the
 * only near-black values allowed on a character. Outlines are INK and thick.
 *
 * RIM_RED appears in Scene 1 and nowhere else. Do not import it elsewhere.
 */
export const C = {
  // --- outlines ---
  ink: '#15171b',
  inkSoft: '#2b2f36',

  // --- institutional beige (apartments, hold rooms, offices) ---
  beige: '#d5ccb4',
  beigeDeep: '#bcb198',
  beigeShade: '#a1957c',
  beigeLit: '#e4ddc9',

  // --- fluorescent green-white (corridors, supply rooms, montage) ---
  fluoro: '#e7eee1',
  fluoroDeep: '#ccd9c2',
  fluoroShade: '#aebba4',
  fluoroLit: '#f3f7ef',

  // --- government-office blue (press briefing, forms, UI chrome) ---
  govBlue: '#6d879a',
  govBlueDeep: '#4a6275',
  govBlueShade: '#324557',
  govBlueLit: '#8ea6b6',

  // --- paper / screens ---
  paper: '#f0ead9',
  paperLine: '#c2b89f',
  screen: '#dfe4e0',
  screenDim: '#c3cac4',
  screenBorder: '#8f978f',

  // --- Scene 1 ONLY: the server room, and the menace that drains away ---
  serverDark: '#241015',
  serverMid: '#3d1a1e',
  serverGlow: '#6d2a28',
  rimRed: '#ff3d2e',

  // --- Scene 8: the same server room with the menace gone ---
  serverCold: '#2a2f36',
  serverColdMid: '#3a424c',

  // --- UNIT-9: the only glossy black in the film ---
  robot: '#0b0d10',
  robotMid: '#191d24',
  robotGloss: '#333c48',
  robotSpec: '#78859a',
  robotSeam: '#05070a',
  eye: '#8df0e6',
  eyeCore: '#e8fffc',

  // --- DALE ---
  robe: '#8a7ca4',
  robeDeep: '#6c5f86',
  robeShade: '#544a68',
  skin: '#dfb189',
  skinShade: '#c08f68',
  hair: '#4b3b33',
  bowl: '#c6d2bf',
  bowlDeep: '#a7b5a1',
  milk: '#f5f2e7',

  // --- PRESIDENT ---
  suit: '#39414d',
  suitDeep: '#2a313b',
  shirt: '#eceee9',
  tie: '#ab2028',
  tieDeep: '#8a1a21',
  podium: '#7a6a52',
  podiumDeep: '#5e5140',

  // --- signal colors (UI only, never on a character) ---
  alert: '#b3242a',
  alertDim: '#7d1a1e',
  ok: '#3f7a4a',
  amber: '#c08a2e',

  black: '#000000',
  white: '#ffffff',
} as const;

/**
 * Liberation Sans / Liberation Mono are metric-compatible with Helvetica and
 * Courier, so the film renders identically on a Linux CI box and a designer's
 * Mac without shipping any font files.
 */
export const FONT_SANS =
  "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif";
export const FONT_MONO =
  "'Courier New', Courier, 'Liberation Mono', monospace";

/** Outline weight for character art, in the 1920x1080 coordinate space. */
export const STROKE = 6;
export const STROKE_THIN = 3.5;
