# Orbit

**Chatbots wait for you to ask. Orbit notices.**

Orbit is a proactive life-management prototype for college students. It turns scattered information (email, calendar, syllabi, GroupMe, texts) into a short list of priorities and next actions, and flags what changed or conflicts.

This is a working prototype with realistic sample data on a fixed demo clock: **Friday, October 9, 8:12 AM**. Every button changes state, and changes are saved in your browser.

## Use it for real

Orbit runs three ways. Everyone gets an empty, private Orbit and adds their own things; the sample week ("Look around with sample data") is optional.

| Where | Accounts | Data lives | AI (Ask, reading photos) |
| --- | --- | --- | --- |
| **Claude link**, built with `npm run build:claude-link` and published as a Claude artifact | Claude sign-in | Each person's private storage on that artifact | Claude, built in |
| **Website**: deploy to Vercel (see [DEPLOY.md](DEPLOY.md)) | Email + password (Supabase) | One private row per account (`supabase/schema.sql`) | Optional `ANTHROPIC_API_KEY` |
| **Website without Supabase** | None | That browser only | Optional `ANTHROPIC_API_KEY` |

Real accounts use the real clock. They never see simulated connections, the fake syllabus reader, or sample screenshots. Voice uses the browser's speech recognition where it exists. Photos and screenshots are read by AI when it's available.

## Run it locally

```bash
cd orbit
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

To start over, use **Settings → Reset demo** or clear site data.

## The five demo moments

1. **Syllabus → dates.** Courses → Upload syllabus → "Use sample ARTH 202 syllabus". Orbit reads it, finds 18 dates, and asks you to review the two it isn't sure about.
2. **Needs reply.** Professor Martin asked a direct question yesterday and you haven't replied. It's a priority on Today. Open it to get a draft reply; Orbit never sends anything for you.
3. **Change detection.** Professor Reyes's email moves the FIN 359 midterm from Thu 10 AM to Tue 8 AM. Orbit flags it and won't touch your calendar until you approve.
4. **Conflict detection.** Tuesday's Finance review (2:00–3:00) overlaps your advising appointment (2:30–3:00). Orbit recommends one plan; other options are one tap away.
5. **"What am I forgetting?"** In Ask Orbit, the answer pulls from email, Open Loops, and your calendar.

## How it's organized for the user

**Design principle:** Orbit should feel like the calmest screen on your phone. The intelligence can be complex; the interface stays quiet. The core loop is **Notice → Connect → Recommend → You approve**. For example: the FIN 359 exam moved from Thursday to Tuesday, that removes two study days, so Orbit offers to update the calendar and rebuild the study plan. Nothing changes until you say so.

- **Phone first.** The app is laid out as a phone app at every width. On a wide screen it sits inside a phone frame, with a short product story and a Light/Dark switch beside it.
- **Light and dark.** Warm cream with navy text in light mode, deep navy in dark mode. It follows the system unless you choose one in Profile.
- **Type.** The serif is only for a few warm moments, like the greeting and page titles. Everything functional uses a sans serif, and there are no all-caps labels.
- **Life areas.** School, Work, Career, Family, Social, Health, Money, Travel, Home, Personal, plus any you add, like "Wedding" or "House renovation". Custom areas work exactly like the built-in ones. Each area has a muted color that appears only as a small dot or thin accent.
- **Navigation:** Today · Orbit · ＋ · Calendar · Ask. Open Loops lives under Today and Orbit. Life modules such as School (with courses and syllabi) appear inside Orbit only for people who need them.
- **Onboarding** asks one question per screen:
  - how Orbit works, shown as a tiny live example
  - "Tell Orbit a little about your life" (multi-select, plus "Something else")
  - which parts of life to track (plus "Add my own")
  - how your days usually go
  - what makes life feel messy
  - how involved Orbit should be: Quiet, Helpful, or Proactive
  - connections recommended for your life, each with the reason Orbit wants it
  - an optional first goal
- **Today** answers three questions: what matters (up to three items, with the best time window for the first), what the day looks like (a short timeline with at most one useful open window), and whether anything changed (the top one or two things Orbit noticed). Everything else is one tap deeper.
- **Morning Brief** is readable in about five seconds: three things, your day, and one useful fact ("You have 2 hr free this afternoon").
- **Orbit** shows an Overview list of your areas ("School · 9 things", "Social · 4 upcoming", "Travel · Clear"). It also lists your goals and offers an optional, simple Orbit map. Each area page shows its open loops, what's coming up, and its goals; School also shows study progress and courses.
- **Open Loops** are grouped as Needs you, Coming soon, Waiting on someone, Later, and Done. Each item has a next step: Find time, Draft reply, Nudge (Orbit drafts a follow-up), or Open in the app where it lives.
- **Ask Orbit** opens with "Right now": the one thing to do and the window to do it in. Below that are questions written from your actual week ("When should I study for Monday's exam?", "Find 2 hours for my finance problem set", "Do I actually have time for everything this week?"). Answers end with an action.
- **Calendar** opens to Week, shown as a phone-sized agenda with a day strip. Day and Month are one tap away. Orbit points out at most one meaningful open window.
- **How involved Orbit is** changes what it shows. Quiet shows only changes and conflicts, with no free-time suggestions. Helpful is the default. Proactive also plans ahead.
- **Goals and study progress:** "Run a 5K next month" becomes a plan of small, checkable steps. Each upcoming exam shows "Studied 1/5 days" as five moons.
- **Add anything (＋)** takes typing, speaking, a photo, a screenshot, or a file. It can find several things in one input, tag each with a life area, and save nothing until you confirm.
- **Help me write** drafts texts and emails. You copy the draft or open Gmail or Messages with it filled in, and you send it yourself.

## Personalization

`src/services/learning.ts` turns behavior signals (views, opens, completions, snoozes, dismissals, questions) into small, predictable adjustments: a default calendar view, quieter alert types, suppressed sources, task ranking, and Ask suggestions. Navigation never moves. The demo starts with a few weeks of history, so Orbit asks once whether to make Week the default and whether to hide Finance Club messages. Everything learned is listed in Profile and can be reset.

You can also try Capture (the + button, or ⌘K / Ctrl+K, or `c`). Type, speak (simulated), or add a screenshot, and Orbit works out whether it's a task, an event, a completion, or a preference.

## How it's built

- Next.js 16 (App Router; Tailwind breakpoints are set so the app always keeps its phone layout), React 19, TypeScript, Tailwind CSS 4, lucide-react. No other runtime dependencies.
- **`src/data/`** holds the mock data, structured so real integrations can replace it.
- **`src/services/goals.ts`** turns goals into step plans and tracks study progress. **`areas.ts`** groups everything by part of life, and **`knowYou.ts`** picks the next question and connection to suggest.
- **`src/services/orbitEngine.ts`** is the rule-based intelligence layer: `calculatePriority`, `classifyMessage`, `requiresReply`, `detectChanges`, `detectConflicts`, `suggestFreeTime`, `createMorningBrief`, `processCapture`, `answerQuestion`. Each function has a narrow, typed contract so a model or backend can replace its body.
- **`src/store/`** has one reducer for all state, with undo history and `localStorage` persistence.
- **`src/components/`** is organized by feature: today, loops, calendar, courses, capture, overlays, and shared ui.

## Trust rules the prototype follows

- Orbit automatically reads, ranks, suggests, and creates low-risk Open Loops (with Undo).
- It asks first before changing the calendar, applying a detected change, resolving a conflict, or ignoring a source.
- It never sends email or texts, submits forms, buys things, or cancels plans. It can recognize that a reply is needed and offer a draft for you to send yourself.
- Uncertain extractions are labeled "High confidence", "I think this is correct", or "Needs review". Raw scores are never shown.
- Every important item shows its source, and its details explain why Orbit surfaced it.
- Integrations, voice, and image reading are simulated, and the UI says so where it matters.
