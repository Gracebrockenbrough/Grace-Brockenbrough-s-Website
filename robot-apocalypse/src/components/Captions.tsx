import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FONT_SANS} from '../theme';
import {lineAt, type Speaker} from '../script-data';
import type {SceneId} from '../timing';

const SPEAKER_COLOR: Record<Speaker, string> = {
  'UNIT-9': C.eye,
  DALE: '#f0c37a',
  PRESIDENT: '#ef8f92',
  REPORTER: '#cdd8e2',
  REP: '#cdd8e2',
  SOUND: C.amber,
};

/**
 * Burned-in caption track, bottom third, so the film is watchable muted.
 * Captions cut in and out hard -- no fades anywhere in this picture.
 */
export const Captions: React.FC<{scene: SceneId}> = ({scene}) => {
  const frame = useCurrentFrame();
  const line = lineAt(scene, frame);
  if (!line) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 74,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1460,
          background: 'rgba(11,13,16,0.9)',
          borderLeft: `8px solid ${SPEAKER_COLOR[line.speaker]}`,
          padding: '16px 30px 18px',
          fontFamily: FONT_SANS,
          textAlign: 'center',
        }}
      >
        {!line.cue && (
          <div
            style={{
              fontSize: 25,
              letterSpacing: 5,
              fontWeight: 700,
              color: SPEAKER_COLOR[line.speaker],
              marginBottom: 6,
            }}
          >
            {line.speaker}
            {line.paren ? (
              <span style={{opacity: 0.7, fontWeight: 400, fontStyle: 'italic', letterSpacing: 1}}>
                {'  ('}
                {line.paren}
                {')'}
              </span>
            ) : null}
          </div>
        )}
        <div
          style={{
            fontSize: line.cue ? 36 : 46,
            lineHeight: 1.22,
            fontWeight: line.cue ? 400 : 600,
            fontStyle: line.cue ? 'italic' : 'normal',
            color: line.cue ? C.amber : C.white,
          }}
        >
          {line.cue ? `[ ${line.text} ]` : line.text}
        </div>
      </div>
    </div>
  );
};
