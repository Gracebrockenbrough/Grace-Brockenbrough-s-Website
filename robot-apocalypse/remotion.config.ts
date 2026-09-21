import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Flat vector art with thick outlines: a low CRF keeps the edges from ringing.
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
// Software rasteriser. Correct and deterministic on a headless machine; on a
// desktop with a GPU you can drop this line for a faster render.
Config.setChromiumOpenGlRenderer('swangle');

/**
 * Bring your own browser.
 *
 * Remotion normally downloads its own Chrome Headless Shell on first render.
 * On a locked-down or offline machine that download fails, so point
 * REMOTION_BROWSER_EXECUTABLE at any Chrome/Chromium you already have:
 *
 *   export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome
 *
 * Left unset, Remotion does its usual thing and this is a no-op.
 */
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
