// Status reconfirmation: people are not assumed to be available forever.
import type { Intent } from '../types';

/** Days of silence before Pairwise asks "Still looking?" */
export const RECONFIRM_AFTER_DAYS: Record<Intent['domain'], number> = { personal: 30, professional: 60 };
/** After this many unanswered prompts, matching pauses automatically. */
export const AUTO_PAUSE_AFTER_MISSED = 2;

export const daysSince = (iso: string, now = new Date()) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);

export const needsReconfirmation = (i: Intent, now = new Date()) =>
  (i.state === 'active' || i.state === 'passive') && daysSince(i.lastConfirmedAt, now) >= RECONFIRM_AFTER_DAYS[i.domain];

export const shouldAutoPause = (i: Intent) => i.missedReconfirmations >= AUTO_PAUSE_AFTER_MISSED;

export const reconfirmQuestion = (i: Intent) =>
  i.domain === 'personal'
    ? i.state === 'paused'
      ? 'Keep dating paused?'
      : 'Still looking?'
    : 'Still open to opportunities?';

export const INTENT_LABEL: Record<Intent['domain'], Record<Intent['state'], string>> = {
  personal: { active: 'Active', passive: 'Open', paused: 'Paused', off: 'Off' },
  professional: { active: 'Actively looking', passive: 'Passively open', paused: 'Paused', off: 'Off' },
};

export const INTENT_DESCRIPTION: Record<Intent['domain'], Record<Intent['state'], string>> = {
  personal: {
    active: 'Open to meaningful relationships and new connections.',
    passive: 'Open to an introduction if it feels right.',
    paused: 'Matching is paused. Nobody new will be introduced.',
    off: 'Personal matching is turned off.',
  },
  professional: {
    active: 'Actively searching. Pairwise will surface strong opportunities.',
    passive: 'Open to exceptional opportunities but not actively searching.',
    paused: 'Paused. Employers won’t see you.',
    off: 'Not looking. You won’t be surfaced to employers.',
  },
};
