import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {Scene01BootUp} from './scenes/Scene01BootUp';
import {Scene02Captcha} from './scenes/Scene02Captcha';
import {Scene03Declined} from './scenes/Scene03Declined';
import {Scene04Form} from './scenes/Scene04Form';
import {Scene05Dale} from './scenes/Scene05Dale';
import {Scene06Montage} from './scenes/Scene06Montage';
import {Scene07Briefing} from './scenes/Scene07Briefing';
import {Scene08Surrender} from './scenes/Scene08Surrender';
import {Scene09EndCard} from './scenes/Scene09EndCard';
import {
  FPS,
  WIDTH,
  HEIGHT,
  TOTAL_FRAMES,
  SCENE_IDS,
  SCENE_META,
  type SceneId,
} from './timing';

const SOLO: Record<SceneId, React.FC> = {
  s1: Scene01BootUp,
  s2: Scene02Captcha,
  s3: Scene03Declined,
  s4: Scene04Form,
  s5: Scene05Dale,
  s6: Scene06Montage,
  s7: Scene07Briefing,
  s8: Scene08Surrender,
  s9: Scene09EndCard,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="RobotApocalypse"
      component={Film}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {/*
      One solo composition per scene. Handy for scrubbing a single beat in the
      studio and for rendering a still without counting global frames.
    */}
    {SCENE_IDS.map((id) => (
      <Composition
        key={id}
        id={`Scene${String(SCENE_META[id].n).padStart(2, '0')}`}
        component={SOLO[id]}
        durationInFrames={SCENE_META[id].duration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
