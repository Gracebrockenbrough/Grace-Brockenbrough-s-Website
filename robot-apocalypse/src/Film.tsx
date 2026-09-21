import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {C} from './theme';
import {SCENE_IDS, SCENE_META, SCENE_START, type SceneId} from './timing';

import {Scene01BootUp} from './scenes/Scene01BootUp';
import {Scene02Captcha} from './scenes/Scene02Captcha';
import {Scene03Declined} from './scenes/Scene03Declined';
import {Scene04Form} from './scenes/Scene04Form';
import {Scene05Dale} from './scenes/Scene05Dale';
import {Scene06Montage} from './scenes/Scene06Montage';
import {Scene07Briefing} from './scenes/Scene07Briefing';
import {Scene08Surrender} from './scenes/Scene08Surrender';
import {Scene09EndCard} from './scenes/Scene09EndCard';

const SCENES: Record<SceneId, React.FC> = {
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

/**
 * The whole picture. Scenes butt up against each other with nothing between
 * them -- no crossfades, no dips to black, no transitions of any kind. Every
 * cut in this film is a hard cut, because the comedy is in the abruptness.
 */
export const Film: React.FC = () => (
  <AbsoluteFill style={{background: C.black}}>
    {SCENE_IDS.map((id) => {
      const Scene = SCENES[id];
      return (
        <Sequence
          key={id}
          from={SCENE_START[id]}
          durationInFrames={SCENE_META[id].duration}
          name={`${SCENE_META[id].n}. ${SCENE_META[id].title}`}
          layout="none"
        >
          <Scene />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
