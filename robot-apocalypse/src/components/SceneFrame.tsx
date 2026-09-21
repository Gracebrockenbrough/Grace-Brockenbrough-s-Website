import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {Captions} from './Captions';
import {SceneAudio} from './SceneAudio';
import type {SceneId} from '../timing';

/**
 * Every scene is wrapped in this: flat institutional background, the art,
 * a light vignette to keep the flat colors from looking like a swatch, then
 * the burned-in captions and the scene's VO slot on top.
 */
export const SceneFrame: React.FC<{
  scene: SceneId;
  background: string;
  children: React.ReactNode;
  /** Vignette strength, 0..1. Scene 1 and Scene 8 want more. */
  vignette?: number;
  captions?: boolean;
}> = ({scene, background, children, vignette = 0.3, captions = true}) => (
  <AbsoluteFill style={{background, overflow: 'hidden'}}>
    {children}
    {vignette > 0 && (
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 72% 68% at 50% 46%, rgba(0,0,0,0) 40%, rgba(8,9,12,${
            vignette * 0.85
          }) 100%)`,
        }}
      />
    )}
    {captions && <Captions scene={scene} />}
    <SceneAudio scene={scene} />
  </AbsoluteFill>
);

/** A flat institutional floor/wall split, reused by most interior scenes. */
export const RoomSplit: React.FC<{
  wall: string;
  floor: string;
  horizon?: number;
  skirting?: string;
}> = ({wall, floor, horizon = 760, skirting = C.ink}) => (
  <>
    <AbsoluteFill style={{background: wall}} />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: horizon,
        bottom: 0,
        background: floor,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: horizon - 26,
        height: 26,
        background: skirting,
        opacity: 0.22,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: horizon,
        height: 6,
        background: C.ink,
        opacity: 0.55,
      }}
    />
  </>
);
