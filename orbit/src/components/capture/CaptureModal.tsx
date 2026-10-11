"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Camera, Check, CircleDot, FileUp, Mic, Undo2 } from "lucide-react";
import type { CaptureInputKind, CaptureResult } from "@/types";
import { cn, uid } from "@/lib/cn";
import { formatShortDate, formatTime, relativeDateTime } from "@/lib/time";
import { DEMO_NOW_STR } from "@/data/demoClock";
import { AREA_LABEL } from "@/lib/areas";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { OrbitMark } from "@/components/shell/Logo";
import { DEMO_SCREENSHOT_TEXT, VOICE_EXAMPLES, processCaptureMany } from "@/services/capture";

type Phase = "input" | "listening" | "reading" | "result" | "review" | "added";

/** One thing ORBIT understood, waiting for the user's OK. */
interface ReviewItem {
  id: string;
  include: boolean;
  result: Extract<CaptureResult, { type: "loop" } | { type: "event" } | { type: "completion" }>;
}

const EXAMPLES = ["Return my dress by Friday", "Paper due Friday. Call Dad about Thanksgiving. Dinner with Sarah tomorrow at 7"];

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
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (initialMode === "speak") startVoice();
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const ctx = { today: derived.today, nowStr: DEMO_NOW_STR, courses: state.courses, loops: derived.loops };

  /** Nothing is saved until the user has had a look. */
  function finish(results: CaptureResult[], kind: CaptureInputKind, raw: string) {
    setInputKind(kind);
    setApplied(false);
    const reviewable = results.filter((r): r is ReviewItem["result"] => r.type === "loop" || r.type === "event" || r.type === "completion");
    if (results.length === 1 && reviewable.length === 0) {
      const r = results[0];
      setResult(r);
      setCourseChoice(r.type === "office_hours" ? r.courseId : undefined);
      setPhase("result");
      return;
    }
    setReview(reviewable.map((r) => ({ id: uid("rev"), include: true, result: r })));
    setText(raw);
    setPhase("review");
  }

  function addReviewed() {
    const chosen = review.filter((i) => i.include);
    for (const { result: r } of chosen) {
      if (r.type === "loop") dispatch({ type: "ADD_LOOP", loop: r.loop });
      else if (r.type === "event") dispatch({ type: "ADD_EVENT", event: r.event });
      else dispatch({ type: "COMPLETE_LOOP", id: r.loopId, at: DEMO_NOW_STR });
    }
    dispatch({ type: "ADD_CAPTURE", capture: { id: uid("cap"), kind: inputKind, raw: text, createdAt: DEMO_NOW_STR, resultSummary: `${chosen.length} items` } });
    setAddedCount(chosen.length);
    setPhase("added");
  }

  function submitText(value = text, kind: CaptureInputKind = "text") {
    if (!value.trim()) {
      textRef.current?.focus();
      return;
    }
    setReadingLabel("ORBIT is reading…");
    setPhase("reading");
    later(() => finish(processCaptureMany({ kind, text: value }, ctx), kind, value), 650);
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
      later(() => finish(processCaptureMany({ kind: "voice", text: phrase }, ctx), "voice", phrase), 600);
    }, 900 + phrase.split(" ").length * 170);
  }

  function readImage(kind: "photo" | "screenshot", simulated = true) {
    setSimulatedImage(simulated);
    setPhase("reading");
    setReadingLabel("Reading your screenshot…");
    later(() => setReadingLabel("Found a date and a time…"), 700);
    later(() => finish(processCaptureMany({ kind, text: DEMO_SCREENSHOT_TEXT }, ctx), kind, DEMO_SCREENSHOT_TEXT), 1400);
  }

  function readFile(file: File) {
    if (file.type.startsWith("image/")) {
      readImage("screenshot", true);
      return;
    }
    setPhase("reading");
    setReadingLabel("Looking at your file…");
    later(() => finish(processCaptureMany({ kind: "file", fileName: file.name, fileType: file.type }, ctx), "file", file.name), 800);
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
            <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-canvas p-2 pl-4 focus-within:border-accent focus-within:bg-surface">
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
                rows={2}
                placeholder="Type or speak…"
                className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[18px] leading-relaxed placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
              />
              <Button type="submit" variant="primary" disabled={!text.trim()}>
                Add
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Speak", icon: Mic, onClick: startVoice },
                { label: "Photo", icon: Camera, onClick: () => photoRef.current?.click() },
                { label: "File", icon: FileUp, onClick: () => fileRef.current?.click() },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[14.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  <Icon size={17} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            {/* Photo covers camera and screenshots; File covers syllabi and documents. */}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readImage("photo")} />
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            <div className="mt-6 space-y-1">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => submitText(ex)} className="block rounded-lg px-1 py-1 text-left text-[15px] text-ink-3 hover:text-ink">
                  “{ex}”
                </button>
              ))}
              <button type="button" onClick={() => readImage("screenshot")} className="block rounded-lg px-1 py-1 text-left text-[14px] text-ink-3 hover:text-ink">
                Or try a sample concert screenshot
              </button>
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

      {phase === "review" && (
        <CaptureReview items={review} setItems={setReview} simulatedImage={simulatedImage} onCancel={reset} onAdd={addReviewed} />
      )}

      {phase === "added" && (
        <div className="animate-rise-in py-4 text-center" aria-live="polite">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <Check size={24} strokeWidth={2.5} aria-hidden />
          </span>
          <p className="mt-3 text-[18px] font-semibold">Added {addedCount} {addedCount === 1 ? "thing" : "things"} to ORBIT</p>
          <p className="mt-1 text-[15px] text-ink-2">ORBIT will bring them up when they matter.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" onClick={reset}>Add another</Button>
            <Button
              variant="ghost"
              onClick={() => {
                for (let i = 0; i <= addedCount; i++) undo();
                reset();
              }}
            >
              <Undo2 size={16} aria-hidden /> Undo
            </Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
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
            · {AREA_LABEL[result.loop.category]}
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

/** "Check before saving": every item ORBIT found, with anything unsure flagged. */
function CaptureReview({
  items,
  setItems,
  simulatedImage,
  onCancel,
  onAdd,
}: {
  items: ReviewItem[];
  setItems: (fn: (items: ReviewItem[]) => ReviewItem[]) => void;
  simulatedImage: boolean;
  onCancel: () => void;
  onAdd: () => void;
}) {
  const { derived } = useOrbit();
  const [editing, setEditing] = useState<string | null>(null);
  const chosen = items.filter((i) => i.include).length;
  const unsure = items.filter((i) => flag(i.result, simulatedImage)).length;

  const patch = (id: string, fn: (r: ReviewItem["result"]) => ReviewItem["result"]) =>
    setItems((all) => all.map((i) => (i.id === id ? { ...i, result: fn(i.result) } : i)));

  if (!items.length) {
    return (
      <div className="py-6 text-center">
        <p className="text-[16px] font-semibold">I didn&apos;t find anything to add.</p>
        <Button variant="primary" className="mt-4" onClick={onCancel}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="animate-rise-in">
      <p className="text-[18px] font-semibold">
        {items.length === 1 ? "Here's what I understood." : `I found ${items.length} things to keep track of.`}
      </p>
      <p className="mt-0.5 text-[14.5px] text-ink-2">
        {unsure ? `${unsure} ${unsure === 1 ? "needs" : "need"} a quick look. ` : ""}Nothing is saved until you press Add.
      </p>
      <ul className="mt-4 divide-y divide-line">
        {items.map(({ id, include, result: r }) => {
          const note = flag(r, simulatedImage);
          const title = r.type === "loop" ? r.loop.title : r.type === "event" ? r.event.title : `Mark done: ${r.loopTitle}`;
          const date = r.type === "loop" ? r.loop.deadline?.split("T")[0] : r.type === "event" ? r.event.date : undefined;
          const meta =
            r.type === "loop"
              ? [r.loop.deadline ? `Due ${relativeDateTime(r.loop.deadline, derived.today)}` : "No date", AREA_LABEL[r.loop.category]].join(" · ")
              : r.type === "event"
                ? `${formatShortDate(r.event.date)} · ${formatTime(r.event.startTime)} · Calendar`
                : "Completes an existing task";
          return (
            <li key={id} className="flex items-start gap-3 py-3">
              <input
                type="checkbox"
                checked={include}
                onChange={() => setItems((all) => all.map((i) => (i.id === id ? { ...i, include: !i.include } : i)))}
                aria-label={`Include ${title}`}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
              />
              <div className={cn("min-w-0 flex-1", !include && "opacity-50")}>
                {editing === id && r.type !== "completion" ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      autoFocus
                      aria-label="Title"
                      defaultValue={title}
                      onBlur={(e) => patch(id, (x) => (x.type === "loop" ? { ...x, loop: { ...x.loop, title: e.target.value || x.loop.title } } : x.type === "event" ? { ...x, event: { ...x.event, title: e.target.value || x.event.title } } : x))}
                      className="min-h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-2 text-[15px]"
                    />
                    <input
                      type="date"
                      aria-label="Date"
                      defaultValue={date}
                      onChange={(e) =>
                        e.target.value &&
                        patch(id, (x) =>
                          x.type === "loop"
                            ? { ...x, loop: { ...x.loop, deadline: `${e.target.value}T${x.loop.deadline?.split("T")[1] ?? "23:59"}`, confidence: 1 } }
                            : x.type === "event"
                              ? { ...x, event: { ...x.event, date: e.target.value, confidence: 1 } }
                              : x,
                        )
                      }
                      className="min-h-9 rounded-lg border border-line-strong px-2 text-[15px]"
                    />
                    <button type="button" onClick={() => setEditing(null)} className="min-h-9 rounded-lg px-2 text-[14px] font-medium text-accent">Done</button>
                  </div>
                ) : (
                  <>
                    <p className="text-[16px] font-medium">{title}</p>
                    <p className="text-[14px] text-ink-3">{meta}</p>
                  </>
                )}
                {note && <p className="mt-1 text-[14px] text-due-ink">Check this: {note}</p>}
              </div>
              {r.type !== "completion" && editing !== id && (
                <button type="button" onClick={() => setEditing(id)} className="shrink-0 rounded-lg px-2 py-1 text-[14px] font-medium text-ink-2 hover:text-ink">
                  Edit
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={!chosen} onClick={onAdd}>
          Add {chosen > 1 ? `${chosen} ` : ""}to ORBIT
        </Button>
      </div>
    </div>
  );
}


function flag(r: ReviewItem["result"], simulatedImage: boolean): string | undefined {
  if (r.type === "event" && simulatedImage) return "read from an image, so confirm the date and time.";
  if (r.type === "event" && r.event.confidence < 0.85) return "the date or time may be off.";
  if (r.type === "loop" && r.loop.confidence < 0.85) return "I wasn't sure about the details.";
  return undefined;
}
