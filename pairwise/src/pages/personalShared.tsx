import { Heart } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { Portrait } from '../components/brand';
import { Button, Modal, useToast } from '../components/ui';
import { CANDIDATES } from '../data/seed';
import { useStore } from '../state/store';
import type { PersonalCandidate } from '../types';

export const candidateById = (id: string) => CANDIDATES.find((c) => c.id === id);

/**
 * Private-matchmaker flow: expressing interest is never shown to the other person.
 * Only if both say yes does either side learn about it. (The other side's decision is simulated in the demo.)
 */
export const useIntroductionActions = () => {
  const { state, actions } = useStore();
  const toast = useToast();
  const [mutualWith, setMutualWith] = useState<PersonalCandidate | null>(null);

  const statusOf = useCallback((id: string) => state.introductions.find((i) => i.candidateId === id)?.status ?? 'new', [state.introductions]);

  const interested = (c: PersonalCandidate) => {
    actions.setIntroduction(c.id, 'interested');
    toast(`Noted. ${c.firstName} won’t know unless it’s mutual.`);
    window.setTimeout(() => {
      if (c.demoWouldBeInterested) {
        actions.setIntroduction(c.id, 'mutual');
        setMutualWith(c);
      }
    }, 1800);
  };

  const pass = (c: PersonalCandidate) => {
    actions.setIntroduction(c.id, 'passed');
    toast(`Passed on ${c.firstName}.`, { label: 'Undo', run: () => actions.undoPass(c.id) });
  };

  return { statusOf, interested, pass, mutualWith, closeMutual: () => setMutualWith(null) };
};

export const MutualModal = ({ c, onClose }: { c: PersonalCandidate; onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <Modal title="It’s mutual." onClose={onClose}>
      <div className="pop flex flex-col items-center py-4 text-center">
        <div className="flex items-center">
          <Portrait name={c.firstName} hue={c.photoHue} className="h-24 w-24 border-4 border-white shadow" rounded="rounded-full" />
          <span className="-mx-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent shadow">
            <Heart className="h-5 w-5 fill-current" aria-hidden />
          </span>
        </div>
        <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink">
          You and {c.firstName} both said you’re interested. I’ve unlocked more of each other’s profiles, including more photos.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => { onClose(); navigate(`/personal/match/${c.id}`); }}>
            See {c.firstName}’s full profile
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Later
          </Button>
        </div>
      </div>
    </Modal>
  );
};
