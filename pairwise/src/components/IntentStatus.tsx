import { Briefcase, Heart } from 'lucide-react';
import { useState } from 'react';
import { INTENT_DESCRIPTION, INTENT_LABEL, needsReconfirmation, reconfirmQuestion } from '../lib/intents';
import type { Intent, IntentState } from '../types';
import { Button, ConfirmationChips, cx, StatusPill } from './ui';

const OPTIONS: Record<Intent['domain'], IntentState[]> = {
  personal: ['active', 'paused', 'off'],
  professional: ['active', 'passive', 'off'],
};

const pillTone = (s: IntentState) => (s === 'active' ? 'on' : s === 'passive' ? 'soft' : s === 'paused' ? 'warn' : 'off') as 'on' | 'soft' | 'warn' | 'off';

/** Home-base card for one side of Pairwise, with its status control and reconfirmation prompt. */
export const IntentStatusCard = ({
  intent,
  enabled,
  onOpen,
  onChange,
  onReconfirm,
  onSkip,
}: {
  intent: Intent;
  enabled: boolean;
  onOpen: () => void;
  onChange: (s: IntentState) => void;
  onReconfirm: (keep: boolean) => void;
  onSkip: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const domain = intent.domain;
  const Icon = domain === 'personal' ? Heart : Briefcase;
  // Each card carries its own area color so the destination is recognisable from home base.
  const accent = domain === 'personal' ? '#c4412f' : '#2455cc';
  const soft = domain === 'personal' ? '#fae4de' : '#e4ecfb';
  const state: IntentState = enabled ? intent.state : 'off';
  const reconfirm = enabled && needsReconfirmation(intent);
  return (
    <div className="card lift flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: soft, color: accent }}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-lg font-bold text-heading">{domain === 'personal' ? 'Personal' : 'Professional'}</h2>
        </div>
        <StatusPill tone={pillTone(state)}>{INTENT_LABEL[domain][state]}</StatusPill>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{INTENT_DESCRIPTION[domain][state]}</p>

      {reconfirm && (
        <div className="rise mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[15px] font-semibold text-amber-950">{reconfirmQuestion(intent)}</p>
          <p className="mt-1 text-sm text-amber-900/80">
            It’s been a while since you confirmed. Pairwise only introduces people who are really available.
            {intent.missedReconfirmations > 0 && ' If this goes unanswered again, matching will pause.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => onReconfirm(true)} style={{ background: accent }}>
              Yes, still {domain === 'personal' ? 'looking' : 'open'}
            </Button>
            <Button size="sm" onClick={() => onReconfirm(false)}>
              Pause for now
            </Button>
            <Button size="sm" variant="quiet" onClick={onSkip}>
              Ask me later
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <div className="rise mt-4">
          <ConfirmationChips
            label={`${domain} status`}
            value={state}
            options={OPTIONS[domain].map((s) => ({ value: s, label: INTENT_LABEL[domain][s] }))}
            onChange={(s) => {
              onChange(s);
              setEditing(false);
            }}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {state !== 'off' && (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: accent }}
          >
            Open {domain === 'personal' ? 'Personal' : 'Professional'}
          </button>
        )}
        <button
          type="button"
          onClick={() => (state === 'off' ? onChange(domain === 'personal' ? 'active' : 'passive') : setEditing((e) => !e))}
          className={cx('inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[15px] font-semibold text-heading hover:bg-soft')}
        >
          {state === 'off' ? `Turn on ${domain === 'personal' ? 'Personal' : 'Professional'}` : 'Change status'}
        </button>
      </div>
    </div>
  );
};
