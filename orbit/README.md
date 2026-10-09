# ORBIT

**Chatbots wait for you to ask. ORBIT notices.**

ORBIT is a proactive life-management prototype for college students. It turns scattered information (email, calendar, syllabi, GroupMe, texts) into a short list of priorities and next actions, and flags what changed or conflicts.

This is a working prototype with realistic sample data on a fixed demo clock: **Friday, October 9, 8:12 AM**. Every button changes state, and changes are saved in your browser.

## Run it

```bash
cd orbit
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

To start over, use **Settings → Reset demo** or clear site data.

## The five demo moments

1. **Syllabus → dates.** Courses → Upload syllabus → "Use sample ARTH 202 syllabus". ORBIT reads it, finds 18 dates, and asks you to review the two it isn't sure about.
2. **Needs reply.** Professor Martin asked a direct question yesterday and you haven't replied. It's a priority on Today. Open it to get a draft reply; ORBIT never sends anything for you.
3. **Change detection.** Professor Reyes's email moves the FIN 359 midterm from Thu 10 AM to Tue 8 AM. ORBIT flags it and won't touch your calendar until you approve.
4. **Conflict detection.** Tuesday's Finance review (2:00–3:00) overlaps your advising appointment (2:30–3:00). Review options shows a timeline and safe choices.
5. **"What am I forgetting?"** In Ask ORBIT, the answer pulls from email, Open Loops, and your calendar.

You can also try Capture (the + button, or ⌘K / Ctrl+K, or `c`). Type, speak (simulated), or add a screenshot, and ORBIT works out whether it's a task, an event, a completion, or a preference.

## How it's built

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react. No other runtime dependencies.
- **`src/data/`** holds the mock data, structured so real integrations can replace it.
- **`src/services/orbitEngine.ts`** is the rule-based intelligence layer: `calculatePriority`, `classifyMessage`, `requiresReply`, `detectChanges`, `detectConflicts`, `suggestFreeTime`, `createMorningBrief`, `processCapture`, `answerQuestion`. Each function has a narrow, typed contract so a model or backend can replace its body.
- **`src/store/`** has one reducer for all state, with undo history and `localStorage` persistence.
- **`src/components/`** is organized by feature: today, loops, calendar, courses, capture, overlays, and shared ui.

## Trust rules the prototype follows

- ORBIT automatically reads, ranks, suggests, and creates low-risk Open Loops (with Undo).
- It asks first before changing the calendar, applying a detected change, resolving a conflict, or ignoring a source.
- Uncertain extractions are labeled "High confidence", "I think this is correct", or "Needs review". Raw scores are never shown.
- Every important item shows its source and has an optional **Why this?** explanation.
- Integrations, voice, and image reading are simulated, and the UI says so where it matters.
