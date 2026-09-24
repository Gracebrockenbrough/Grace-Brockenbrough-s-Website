import { Mic, Square } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cx, useToast } from './ui';

// Minimal typing for the browser Speech Recognition API (not in the standard DOM lib).
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const getRecognizer = (): SpeechRec | null => {
  const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

/**
 * Voice-first answer box. Uses the browser's speech recognition when available;
 * otherwise the same box works by typing. In production, audio would be recorded with
 * MediaRecorder and sent to a speech-to-text service behind the AI layer.
 */
export const VoiceInput = ({
  value,
  onChange,
  placeholder,
  label,
  rows = 4,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  rows?: number;
  onSubmit?: () => void;
}) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const baseRef = useRef('');
  const toast = useToast();
  const id = useId();

  useEffect(() => () => recRef.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognizer();
    if (!rec) {
      toast('Voice isn’t available in this browser. Typing works the same way.');
      return;
    }
    baseRef.current = value ? `${value.trim()} ` : '';
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onChange(baseRef.current + text);
    };
    rec.onerror = () => {
      toast('I couldn’t access the microphone. You can type instead.');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      toast('I couldn’t start the microphone. You can type instead.');
    }
  };

  return (
    <div className={cx('rounded-2xl border bg-surface p-3 transition-colors', listening ? 'border-accent ring-2 ring-accent/15' : 'border-line')}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) onSubmit();
        }}
        className="w-full resize-none bg-transparent px-2 py-1 text-[16px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          aria-label={listening ? 'Stop voice input' : 'Speak your answer'}
          className={cx('inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors', listening ? 'bg-accent text-on-accent' : 'bg-soft text-accent-strong hover:bg-soft/70')}
        >
          {listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          {listening ? 'Listening… tap to stop' : 'Speak'}
        </button>
        <span className="text-xs text-muted">{listening ? 'Speak naturally' : 'Or type'}</span>
      </div>
    </div>
  );
};
