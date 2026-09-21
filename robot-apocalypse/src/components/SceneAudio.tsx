import React from 'react';
import {Audio, staticFile} from 'remotion';
import {SCENE_META, type SceneId} from '../timing';

/**
 * One voice-over slot per scene, reading public/vo/scene-N.mp3.
 *
 * The repo ships silent placeholders of exactly the right length so the film
 * renders before a single line has been recorded. Drop a real take over the
 * placeholder and it plays -- no code change. See README.
 */
export const SceneAudio: React.FC<{scene: SceneId; volume?: number}> = ({
  scene,
  volume = 1,
}) => (
  <Audio src={staticFile(`vo/scene-${SCENE_META[scene].n}.mp3`)} volume={volume} />
);
