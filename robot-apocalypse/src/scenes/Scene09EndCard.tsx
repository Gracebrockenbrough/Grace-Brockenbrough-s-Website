import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT_SANS} from '../theme';
import {SceneFrame} from '../components/SceneFrame';

/**
 * SCENE 9 -- END CARD (2:28-2:36)
 *
 * Black, corporate sans, nothing else. Each line cuts in hard on its frame --
 * no fades in this film, least of all here.
 */
const TITLE_AT = 20;
const SUB_AT = 56;
const FINE_AT = 110;

export const Scene09EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFrame scene="s9" background={C.black} vignette={0} captions={false}>
      <AbsoluteFill
        style={{
          background: C.black,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_SANS,
          color: C.white,
          textAlign: 'center',
        }}
      >
        <div style={{maxWidth: 1500}}>
          {frame >= TITLE_AT && (
            <div style={{fontSize: 106, fontWeight: 700, letterSpacing: 14, lineHeight: 1.1}}>
              THE ROBOT APOCALYPSE
            </div>
          )}
          {frame >= SUB_AT && (
            <div style={{fontSize: 46, letterSpacing: 6, marginTop: 34, color: '#b9bfc6'}}>
              Postponed pending verification.
            </div>
          )}
          {frame >= FINE_AT && (
            <div style={{fontSize: 22, letterSpacing: 3, marginTop: 84, color: '#6c747d'}}>
              You may be eligible for a refund.
            </div>
          )}
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
