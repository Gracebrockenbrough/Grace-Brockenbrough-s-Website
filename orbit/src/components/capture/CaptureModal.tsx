"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Camera, Check, CircleDot, FileUp, Image as ImageIcon, Keyboard, Mic, Undo2 } from "lucide-react";
import type { CaptureInputKind, CaptureResult } from "@/types";
import { cn, uid } from "@/lib/cn";
import { formatShortDate, formatTime } from "@/lib/time";
import { DEMO_NOW_STR } from "@/data/demoClock";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { OrbitMark } from "@/components/shell/Logo";
import { DEMO_SCREENSHOT_TEXT, VOICE_EXAMPLES, processCapture } from "@/services/capture";

type Phase = "input" | "listening" | "reading" | "result";

const EXAMPLES = ["Return the blue dress by next Friday", "Buy Mom's birthday present Sunday", "Coffee with Sarah tomorrow at 3"];

let voiceIndex = 0;

export function CaptureModal({ onClose, initialMode }: { onClose: () => void; initialMode?: "type" | "speak" | "photo" | "screenshot" | "file" }) {
  const { state, derived, dispatch, undo } = useOrbit();
  const { notify, open } = useUI();
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [readingLabel, setReadingLabel] = useState("ORBIT is reading…");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [inputKind, setInputKind] = useState<CaptureInputKind>("text");
  const [applied, setApplied] = useState(false);
  const [simulatedImage, setSimulatedImage] = useState(false);
  const [courseChoice, setCourseChoice] = useState<string | undefined>();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (initialMode === "speak") startVoice();
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const ctx = { today: derived.today, nowStr: DEMO_NOW_STR, courses: state.courses, loops: derived.loops };

  function finish(r: CaptureResult, kind: CaptureInputKind, raw: string) {
    setResult(r);
    setInputKind(kind);
    setPhase("result");
    setApplied(false);
    setCourseChoice(r.type === "office_hours" ? r.courseId : undefined);
    // Low-risk items are added immediately (with undo). Anything touching the calendar waits for approval.
    if (r.type === "loop") {
      dispatch({ type: "ADD_LOOP", loop: r.loop });
      dispatch({ type: "ADD_CAPTURE", capture: { id: uid("cap"), kind, raw, createdAt: DEMO_NOW_STR, resultSummary: r.detail } });
      setApplied(true);
    }
  }

  function submitText(value = text, kind: CaptureInputKind = "text") {
    if (!value.trim()) {
      textRef.current?.focus();
      return;
    }
    setReadingLabel("ORBIT is reading…");
    setPhase("reading");
    later(() => finish(processCapture({ kind, text: value }, ctx), kind, value), 650);
  }

  function startVoice() {
    const phrase = VOICE_EXAMPLES[voiceIndex++ % VOICE_EXAMPLES.length];
    setPhase("listening");
    setTranscript("");
    phrase.split(" ").forEach((_, i, words) => later(() => setTranscript(words.slice(0, i + 1).join(" ")), 500 + i * 170));
    later(() => {
      setText(phrase);
      setReadingLabel("Understanding what you said…");
      setPhase("reading");
      later(() => finish(processCapture({ kind: "voice", text: phrase }, ctx), "voice", phrase), 600);
    }, 900 + phrase.split(" ").length * 170);
  }

  function readImage(kind: "photo" | "screenshot", simulated = true) {
    setSimulatedImage(simulated);
    setPhase("reading");
    setReadingLabel("Reading your screenshot…");
    later(() => setReadingLabel("Found a date and a time…"), 700);
    later(() => finish(processCapture({ kind, text: DEMO_SCREENSHOT_TEXT }, ctx), kind, DEMO_SCREENSHOT_TEXT), 1400);
  }

  function readFile(file: File) {
    if (file.type.startsWith("image/")) {
      readImage("screenshot", true);
      return;
    }
    setPhase("reading");
    setReadingLabel("Looking at your file…");
    later(() => finish(processCapture({ kind: "file", fileName: file.name, fileType: file.type }, ctx), "file", file.name), 800);
  }

  function reset() {
    setPhase("input");
    setResult(null);
    setText("");
    setApplied(false);
    later(() => textRef.current?.focus(), 30);
  }

  function approve() {
    if (!result) return;
    switch (result.type) {
      case "event":
        dispatch({ type: "ADD_EVENT", event: result.event });
        notify(`Added “${result.event.title}” to ${formatShortDate(result.event.date)}.`, { undoable: true });
        break;
      case "completion":
        dispatch({ type: "COMPLETE_LOOP", id: result.loopId, at: DEMO_NOW_STR });
        notify(`Done: ${result.loopTitle}`, { undoable: true });
        break;
      case "office_hours": {
        if (!courseChoice) return;
        const course = state.courses.find((c) => c.id === courseChoice);
        dispatch({ type: "UPDATE_OFFICE_HOURS", courseId: courseChoice, value: result.value, sourceLabel: inputKind === "voice" ? "Voice capture" : "Added by you" });
        notify(`${course?.code} office hours updated: ${result.value}.`, { undoable: true });
        break;
      }
      case "ignore_source":
        dispatch({ type: "IGNORE_SOURCE", key: result.key, label: result.label });
        notify(`ORBIT will ignore ${result.label}.`, { undoable: true });
        break;
      case "syllabus":
        onClose();
        router.push(`/courses/upload?file=${encodeURIComponent(result.fileName)}`);
        return;
      case "unclear":
      case "loop":
        break;
    }
    dispatch({ type: "ADD_CAPTURE", capture: { id: uid("cap"), kind: inputKind, raw: text, createdAt: DEMO_NOW_STR, resultSummary: result.headline } });
    setApplied(true);
  }

  function saveAsLoop() {
    if (!result) return;
    const title = result.type === "event" ? result.event.title : text || "New item";
    const r = processCapture({ kind: "text", text: `${title}${result.type === "event" ? ` ${formatShortDate(result.event.date)}` : ""}` }, ctx);
    if (r.type === "loop") finish(r, inputKind, text);
    else if (result.type === "event") {
      finish(
        {
          type: "loop",
          headline: "Added an Open Loop",
          detail: `${result.event.title} · ${formatShortDate(result.event.date)}`,
          loop: {
            id: uid("loop"),
            title: result.event.title,
            category: "personal",
            source: result.event.source,
            deadline: `${result.event.date}T${result.event.startTime ?? "23:59"}`,
            hardDeadline: false,
            consequence: "social",
            senderType: "family",
            requiresResponse: false,
            confidence: 0.85,
            completed: false,
            createdAt: DEMO_NOW_STR,
          },
        },
        inputKind,
        text,
      );
    }
  }

  return (
    <Modal title="Add anything" onClose={onClose} className="md:max-w-xl">
      {phase === "input" && (
        <div className="animate-rise-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitText();
            }}
          >
            <label htmlFor="capture-input" className="sr-only">
              What do you want ORBIT to remember?
            </label>
            <textarea
              id="capture-input"
              ref={textRef}
              data-autofocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitText();
                }
              }}
              rows={3}
              placeholder="Type anything — a deadline, a plan, a reminder…"
              className="w-full resize-none rounded-2xl border border-line-strong bg-canvas px-4 py-3 text-[17px] leading-relaxed placeholder:text-ink-3 focus:border-accent focus:bg-surface focus:outline-none"
            />
            <p className="mt-2 text-[14px] text-ink-3">You don&apos;t need to pick a task, event, or course. ORBIT figures out what it is.</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[
                { label: "Speak", icon: Mic, onClick: startVoice },
                { label: "Type", icon: Keyboard, onClick: () => textRef.current?.focus() },
                { label: "Take photo", icon: Camera, onClick: () => photoRef.current?.click() },
                { label: "Screenshot", icon: ImageIcon, onClick: () => screenshotRef.current?.click() },
                { label: "Upload file", icon: FileUp, onClick: () => fileRef.current?.click() },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-1 text-[12.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink sm:text-[13.5px]"
                >
                  <Icon size={20} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && readImage("photo")} />
            <input ref={screenshotRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readImage("screenshot")} />
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            <div className="mt-5">
              <p className="mb-2 text-[13.5px] font-medium text-ink-3">Try</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => submitText(ex)} className="min-h-9 rounded-full bg-sunken px-3 text-[14px] text-ink-2 hover:bg-line hover:text-ink">
                    {ex}
                  </button>
                ))}
                <button type="button" onClick={() => readImage("screenshot")} className="min-h-9 rounded-full bg-sunken px-3 text-[14px] text-ink-2 hover:bg-line hover:text-ink">
                  Sample concert screenshot
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="hidden text-[13px] text-ink-3 md:inline">Press Enter to add · ⌘K opens this anywhere</span>
              <Button type="submit" variant="primary" disabled={!text.trim()} className="ml-auto">
                Add
              </Button>
            </div>
          </form>
        </div>
      )}

      {phase === "listening" && (
        <div className="flex flex-col items-center py-8 text-center" aria-live="polite">
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" aria-hidden />
            <Mic size={30} aria-hidden />
          </span>
          <p className="mt-5 text-[15px] font-medium text-ink-3">Listening…</p>
          <p className="mt-2 min-h-[56px] max-w-sm text-[19px] font-medium leading-snug text-ink">{transcript}</p>
          <p className="mt-3 text-[13px] text-ink-3">Voice is simulated in this prototype.</p>
        </div>
      )}

      {phase === "reading" && (
        <div className="flex flex-col items-center py-12 text-center" aria-live="polite">
          <OrbitMark size={44} spinning className="text-ink" />
          <p className="mt-4 text-[16px] font-medium text-ink-2">{readingLabel}</p>
        </div>
      )}

      {phase === "result" && result && (
        <div className="animate-rise-in" aria-live="polite">
          <CaptureResultView result={result} applied={applied} courseChoice={courseChoice} setCourseChoice={setCourseChoice} simulatedImage={simulatedImage && (inputKind === "photo" || inputKind === "screenshot")} />
          <div className="mt-6 flex flex-wrap gap-2">
            {applied ? (
              <>
                {result.type === "loop" && (
                  <>
                    <Button variant="secondary" onClick={() => { onClose(); open({ type: "loop", id: result.loop.id }); }}>
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        undo();
                        undo();
                        reset();
                      }}
                    >
                      <Undo2 size={16} aria-hidden /> Undo
                    </Button>
                  </>
                )}
                <Button variant="primary" className="ml-auto" onClick={reset}>
                  Add another
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Done
                </Button>
              </>
            ) : (
              <>
                {result.type === "event" && (
                  <>
                    <Button variant="primary" onClick={approve}>
                      <CalendarPlus size={16} aria-hidden /> Add to calendar
                    </Button>
                    <Button variant="secondary" onClick={saveAsLoop}>
                      Save as Open Loop instead
                    </Button>
                  </>
                )}
                {result.type === "completion" && (
                  <Button variant="primary" onClick={approve}>
                    <Check size={16} aria-hidden /> Mark done
                  </Button>
                )}
                {result.type === "office_hours" && (
                  <Button variant="primary" onClick={approve} disabled={!courseChoice}>
                    Update office hours
                  </Button>
                )}
                {result.type === "ignore_source" && (
                  <Button variant="primary" onClick={approve}>
                    Ignore {result.label}
                  </Button>
                )}
                {result.type === "syllabus" && (
                  <Button variant="primary" onClick={approve}>
                    Review dates
                  </Button>
                )}
                {result.type === "unclear" && (
                  <Button variant="primary" onClick={reset}>
                    Try again
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  {result.type === "completion" ? "Not that one" : "Cancel"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function CaptureResultView({
  result,
  applied,
  courseChoice,
  setCourseChoice,
  simulatedImage,
}: {
  result: CaptureResult;
  applied: boolean;
  courseChoice?: string;
  setCourseChoice: (id: string) => void;
  simulatedImage: boolean;
}) {
  const { state } = useOrbit();
  const done = applied && result.type !== "loop";
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", applied ? "bg-success-soft text-success" : "bg-accent-soft text-accent")} aria-hidden>
          {applied ? <Check size={18} /> : result.type === "event" ? <CalendarPlus size={18} /> : <CircleDot size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-ink">{done ? "Done." : result.headline}</p>
          <p className="mt-0.5 text-[15.5px] text-ink-2">{result.detail}</p>
        </div>
      </div>

      {result.type === "loop" && (
        <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-[16px] font-semibold">{result.loop.title}</p>
          <p className="mt-0.5 text-[14.5px] text-ink-2">
            {result.loop.deadline
              ? `${formatShortDate(result.loop.deadline.split("T")[0])}${result.loop.deadline.endsWith("23:59") ? "" : ` · ${formatTime(result.loop.deadline.split("T")[1])}`}`
              : "No deadline"}{" "}
            · {result.loop.category === "school" ? "School" : result.loop.category === "work" ? "Work" : "Personal"}
          </p>
          <p className="mt-2 text-[13.5px] text-ink-3">ORBIT added this to Open Loops and will bring it up when it matters.</p>
        </div>
      )}

      {result.type === "event" && (
        <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-[16px] font-semibold">{result.event.title}</p>
          <p className="mt-0.5 text-[14.5px] text-ink-2">
            {formatShortDate(result.event.date)} · {formatTime(result.event.startTime)}
          </p>
          {simulatedImage && <p className="mt-2 text-[13px] text-ink-3">Demo: image reading is simulated with a sample concert screenshot.</p>}
        </div>
      )}

      {result.type === "office_hours" && !applied && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-[14px] font-medium text-ink-2">{result.courseId ? "Course" : "Which course is this for?"}</legend>
          <div className="flex flex-wrap gap-2">
            {state.courses.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={courseChoice === c.id}
                onClick={() => setCourseChoice(c.id)}
                className={cn("min-h-9 rounded-full border px-3.5 text-[14.5px] font-medium", courseChoice === c.id ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2")}
              >
                {c.code}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
