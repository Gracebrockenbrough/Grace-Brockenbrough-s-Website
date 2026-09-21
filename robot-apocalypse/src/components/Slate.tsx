import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT_MONO} from '../theme';
import {SCENE_META, type SceneId} from '../timing';

/** Placeholder card for a scene that has not been animated yet. */
export const Slate: React.FC<{scene: SceneId}> = ({scene}) => {
  const m = SCENE_META[scene];
  return (
    <AbsoluteFill
      style={{
        background: C.fluoroDeep,
        color: C.ink,
        fontFamily: FONT_MONO,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <div style={{fontSize: 40, letterSpacing: 10}}>SCENE {m.n}</div>
      <div style={{fontSize: 92, fontWeight: 700, letterSpacing: 6}}>{m.title}</div>
      <div style={{fontSize: 30, opacity: 0.6}}>{m.duration} frames — not yet animated</div>
    </AbsoluteFill>
  );
};
