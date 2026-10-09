"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Camera, Check, FileText, FileUp, Image as ImageIcon, Pencil, Sparkles } from "lucide-react";
import type { SyllabusExtraction, SyllabusItem } from "@/types";
import { cn } from "@/lib/cn";
import { formatShortDate, formatTime } from "@/lib/time";
import { DEMO_TODAY } from "@/data/demoClock";
import { sampleSyllabusExtraction, SYLLABUS_PROCESSING_STEPS } from "@/data/mockSyllabus";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { readSyllabus, summarizeExtraction, toCourseRecords } from "@/services/syllabus";
import { Button } from "@/components/ui/Button";
import { ConfidenceTag } from "@/components/ui/Badges";
import { OrbitMark } from "@/components/shell/Logo";

type Phase = "select" | "processing" | "review" | "done" | "error";

const KIND_LABEL: Record<SyllabusItem["kind"], string> = { assignment: "Assignment", exam: "Exam", presentation: "Presentation", milestone: "Milestone" };

function UploadInner() {
  const { state, dispatch } = useOrbit();
  const { notify } = useUI();
  const params = useSearchParams();
  const router = useRouter();
  const fromOnboarding = params.get("from") === "onboarding";
  const [courseId, setCourseId] = useState<string>(params.get("course") ?? "auto");
  const [phase, setPhase] = useState<Phase>("select");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extraction, setExtraction] = useState<SyllabusExtraction | null>(null);
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Arriving from Capture with a file name starts reading right away.
  useEffect(() => {
    const file = params.get("file");
    if (file && !started.current) {
      started.current = true;
      process({ name: file, size: 1 });
    }
  }, []);

  function process(file: { name: string; size: number; type?: string }) {
    const result = readSyllabus(file, state.courses, courseId === "auto" ? undefined : courseId);
    setPhase("processing");
    setStep(0);
    SYLLABUS_PROCESSING_STEPS.forEach((_, i) => timers.current.push(window.setTimeout(() => setStep(i), i * 650)));
    timers.current.push(
      window.setTimeout(() => {
        if (!result.ok) {
          setError(result.message);
          setPhase("error");
          return;
        }
        setExtraction(result.extraction);
        setItems(result.extraction.items);
        setIncluded(new Set(result.extraction.items.map((i) => i.id)));
        setPhase("review");
      }, SYLLABUS_PROCESSING_STEPS.length * 650 + 500),
    );
  }

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) process({ name: f.name, size: f.size, type: f.type });
  };

  function confirm() {
    if (!extraction) return;
    const chosen = items.filter((i) => included.has(i.id));
    const records = toCourseRecords(extraction, chosen, DEMO_TODAY);
    dispatch({ type: "IMPORT_SYLLABUS", courseId: extraction.courseId, ...records, officeHours: extraction.officeHours });
    setImportedCount(chosen.length);
    setPhase("done");
    notify(`Added ${chosen.length} dates to ${extraction.courseGuess.split(" · ")[0]}.`, { undoable: true });
  }

  const course = extraction ? state.courses.find((c) => c.id === extraction.courseId) : undefined;
  const needsReview = items.filter((i) => !i.date || i.confidence < 0.65);
  const confident = items.filter((i) => !needsReview.includes(i)).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={course ? `/courses/${course.id}` : "/courses"} className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-[15px] text-ink-2 hover:text-ink">
        <ArrowLeft size={17} aria-hidden /> {course ? course.code : "Courses"}
      </Link>

      {phase === "select" && (
        <div className="animate-rise-in">
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Upload a syllabus</h1>
          <p className="mt-2 text-[16px] text-ink-2">ORBIT reads it, finds every assignment and exam, and asks you to confirm anything it isn&apos;t sure about.</p>

          <label className="mt-6 flex flex-wrap items-center gap-3 text-[15px] text-ink-2">
            Course
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="min-h-10 rounded-xl border border-line-strong bg-surface px-3 text-[15px] text-ink">
              <option value="auto">Let ORBIT figure it out</option>
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFiles(e.dataTransfer.files);
            }}
            className={cn(
              "mt-5 flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface",
            )}
          >
            <FileUp size={32} className="text-accent" aria-hidden />
            <p className="mt-3 text-[18px] font-semibold">Drag your syllabus here</p>
            <p className="mt-1 text-[15px] text-ink-3">PDF, Word document, or a photo of the page</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => fileRef.current?.click()}>
                <FileText size={17} aria-hidden /> Upload from computer
              </Button>
              <Button variant="secondary" onClick={() => imageRef.current?.click()}>
                <ImageIcon size={17} aria-hidden /> Upload an image
              </Button>
              <Button variant="secondary" onClick={() => photoRef.current?.click()}>
                <Camera size={17} aria-hidden /> Take a photo
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          </div>

          <div className="mt-5 flex flex-col items-start gap-1 rounded-2xl bg-accent-soft/60 px-4 py-3.5 md:flex-row md:items-center md:justify-between">
            <p className="text-[15px] text-ink-2">No syllabus handy? Try ORBIT with a sample.</p>
            <button type="button" onClick={() => process({ name: sampleSyllabusExtraction.fileName, size: 1 })} className="inline-flex min-h-10 items-center gap-1.5 text-[15px] font-semibold text-accent hover:underline">
              <Sparkles size={16} aria-hidden /> Use sample ARTH 202 syllabus
            </button>
          </div>
          <p className="mt-3 text-[13.5px] text-ink-3">
            Prototype note: reading is simulated, so any file returns the sample results. Files named “blurry” show what happens when ORBIT can&apos;t read a page.
          </p>
        </div>
      )}

      {phase === "processing" && (
        <div className="flex flex-col items-center py-16 text-center" aria-live="polite">
          <OrbitMark size={56} spinning className="text-ink" />
          <p className="mt-6 text-[20px] font-semibold">{SYLLABUS_PROCESSING_STEPS[step]}</p>
          <ol className="mt-6 space-y-2 text-left">
            {SYLLABUS_PROCESSING_STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-2.5 text-[15px] transition-opacity", i > step ? "opacity-30" : "opacity-100")}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", i < step ? "bg-success text-white" : "border-2 border-line-strong")} aria-hidden>
                  {i < step && <Check size={12} strokeWidth={3} />}
                </span>
                {s.replace("…", "")}
              </li>
            ))}
          </ol>
        </div>
      )}

      {phase === "error" && (
        <div className="animate-rise-in rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
          <AlertCircle size={32} className="mx-auto text-attention" aria-hidden />
          <h1 className="mt-3 text-[22px] font-semibold">I couldn&apos;t fully read this syllabus.</h1>
          <p className="mt-2 text-[16px] text-ink-2">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => setPhase("select")}>Try another copy</Button>
            <Button variant="secondary" onClick={() => process({ name: sampleSyllabusExtraction.fileName, size: 1 })}>Use the sample instead</Button>
          </div>
        </div>
      )}

      {phase === "review" && extraction && (
        <div className="animate-rise-in pb-28">
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">I found {items.length} important dates.</h1>
          <p className="mt-2 text-[16px] text-ink-2">
            {summarizeExtraction(items).map((s) => `${s.count} ${s.label}`).join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[15px]">
            <FileText size={17} className="text-ink-3" aria-hidden />
            <span className="text-ink-2">This looks like the syllabus for</span>
            <span className="font-semibold">{extraction.courseGuess}</span>
            <select
              aria-label="Change course"
              value={extraction.courseId}
              onChange={(e) => {
                const c = state.courses.find((x) => x.id === e.target.value)!;
                setExtraction({ ...extraction, courseId: c.id, courseGuess: `${c.code} · ${c.name}` });
              }}
              className="ml-auto min-h-9 rounded-xl border border-line-strong px-2 text-[14px]"
            >
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>

          {needsReview.length > 0 && (
            <section className="mt-8" aria-labelledby="needs-review">
              <h2 id="needs-review" className="text-[19px] font-semibold">Needs your review <span className="font-normal text-ink-3">{needsReview.length}</span></h2>
              <p className="mt-1 text-[15px] text-ink-2">ORBIT won&apos;t add uncertain dates silently. Set a date, or keep them as “date unclear” and ORBIT will remind you.</p>
              <ul className="mt-3 space-y-2">
                {needsReview.map((i) => (
                  <ReviewRow key={i.id} item={i} included={included.has(i.id)} editing={editing === i.id} onEdit={() => setEditing(i.id)}
                    onToggle={() => setIncluded((s) => { const n = new Set(s); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; })}
                    onDate={(date) => { setItems((all) => all.map((x) => (x.id === i.id ? { ...x, date, confidence: 1, note: undefined } : x))); setEditing(null); }} />
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8" aria-labelledby="found">
            <h2 id="found" className="text-[19px] font-semibold">ORBIT found <span className="font-normal text-ink-3">{confident.length}</span></h2>
            <ul className="mt-3 space-y-2">
              {confident.map((i) => (
                <ReviewRow key={i.id} item={i} included={included.has(i.id)} editing={editing === i.id} onEdit={() => setEditing(i.id)}
                  onToggle={() => setIncluded((s) => { const n = new Set(s); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; })}
                  onDate={(date) => { setItems((all) => all.map((x) => (x.id === i.id ? { ...x, date, confidence: 1, note: undefined } : x))); setEditing(null); }} />
              ))}
            </ul>
          </section>

          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[232px]">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <p className="text-[14.5px] text-ink-2">{included.size} of {items.length} selected</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPhase("select")}>Cancel</Button>
                <Button variant="primary" onClick={confirm} disabled={!included.size}>
                  {included.size === items.length ? "Confirm all" : `Confirm ${included.size}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && extraction && (
        <div className="animate-rise-in py-12 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <Check size={30} strokeWidth={2.5} aria-hidden />
          </span>
          <h1 className="mt-5 text-[26px] font-semibold">{importedCount} dates added to {extraction.courseGuess.split(" · ")[0]}</h1>
          <p className="mt-2 text-[16px] text-ink-2">They&apos;re on your calendar and in Open Loops as they get close. ORBIT will keep an eye out for changes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => router.push(`/courses/${extraction.courseId}`)}>View course</Button>
            <Button variant="secondary" onClick={() => router.push(fromOnboarding ? "/today" : "/calendar?view=month")}>
              {fromOnboarding ? "Go to Today" : "See it on the calendar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ item, included, editing, onToggle, onEdit, onDate }: { item: SyllabusItem; included: boolean; editing: boolean; onToggle: () => void; onEdit: () => void; onDate: (d: string) => void }) {
  const [value, setValue] = useState(item.date ?? "2026-11-24");
  return (
    <li className={cn("rounded-2xl border bg-surface p-3.5 transition-opacity", included ? "border-line" : "border-line opacity-55")}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={included} onChange={onToggle} aria-label={`Include ${item.title}`} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15.5px] font-semibold">{item.title}</span>
            <span className="text-[13px] text-ink-3">{KIND_LABEL[item.kind]}</span>
          </div>
          <p className="text-[14.5px] text-ink-2">
            {item.date ? `${formatShortDate(item.date)}${item.time && item.time !== "23:59" ? ` · ${formatTime(item.time)}` : ""}` : "Date unclear"}
          </p>
          {item.note && <p className="mt-1 text-[14px] text-attention">{item.note}</p>}
          <p className="mt-1 text-[13px] italic text-ink-3">“{item.quote}”</p>
          {editing && (
            <form className="mt-2 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); onDate(value); }}>
              <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-9 rounded-xl border border-line-strong px-2 text-[14.5px]" aria-label={`Date for ${item.title}`} autoFocus />
              <Button size="sm" variant="primary" type="submit">Save</Button>
            </form>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ConfidenceTag confidence={item.date ? item.confidence : 0.3} />
          {!editing && (
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-[13.5px] font-medium text-accent hover:underline">
              <Pencil size={13} aria-hidden /> {item.date ? "Edit date" : "Set date"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadInner />
    </Suspense>
  );
}
