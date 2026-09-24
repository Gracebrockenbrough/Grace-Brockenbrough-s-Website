# Pairwise

An AI-powered matching platform for people and opportunities that **mutually** fit. It has two separate products, Personal (dating first) and Professional (full-time roles first), built on one private understanding of the person.

## Run it

```bash
npm install
npm run dev      # local development
npm test         # matching, privacy-separation, Smart Resume and onboarding tests
npm run build    # static build in dist/ (hash routing, works on any static host)
```

The demo opens on **Profile** as "Maya", with fictional matches and companies. **Settings → Data controls → Reset demo** restores it.

## What's built

- **Four-destination navigation:** Profile (mint green), Personal (coral/blush), Professional (blue) and Settings (neutral). The whole theme changes by area.
- **Profile**
  - status cards for Personal and Professional, with "Still looking?" reconfirmation that auto-pauses after repeated misses
  - Private App Memory: categorised and editable, with confirm, mark incorrect, keep private and delete
  - pattern suggestions that only take effect after you confirm them
- **Personal**
  - 1–3 introductions, with one optional "different direction" slot
  - private mutual interest: the other side is only told if both say yes
  - a three-stage progressive reveal, and detail pages with collapsible sections
  - "why this match", less-sure points, what Pairwise can't know, and Ask Pairwise
  - post-date feedback, including voice input
  - an honest "no strong matches" state; block, report and hide
- **Professional**
  - role cards with fit reasons, Interested / Save for Later / View Opportunity / See Role Fit
  - work-model and saved filters; active, passive and off search status
  - opportunity detail with a Smart Resume preview, which reorders and selects your master resume but never changes a word
- **Onboarding**
  - a voice-first conversation, using browser speech recognition where available, otherwise typing
  - follow-up questions that depend on what you said
  - a "Here's what I think I learned" review you must go through before anything is saved
- **Settings:** participation, pausing, cross-domain learning, visibility, memory clearing, notifications, subscription (the same match quality on every plan), data view, and account deletion.

## Architecture

```
src/
  types/            domain model with separate namespaces (shared, personal, professional, private memory, visible profiles)
  data/seed.ts      fictional demo data
  lib/matching/     personal.ts: reciprocal dating model (sqrt(A→B · B→A) × timing × availability × confidence)
                    professional.ts: two-way job model; takes only the ProfessionalModel
  lib/views.ts      the only way pages read data: personalView / professionalView
  lib/ai/           vendor-neutral AI interface, a mock provider, and an optional HTTP provider (VITE_AI_ENDPOINT)
  lib/resume.ts     Smart Resume tailoring and a faithfulness check
  lib/intents.ts    status reconfirmation rules
  state/store.tsx   app state, saved to localStorage
  components/ pages/
supabase/schema.sql  Postgres/Supabase schema for the production backend (RLS, pgvector, visibility enum)
```

**Connecting a real AI model:** deploy a small server that implements `follow-up`, `extract`, `explain`, `feedback` and `ask`, keeping API keys on the server, then set `VITE_AI_ENDPOINT`. If the service fails, the app falls back to the mock. Resume tailoring always stays deterministic so facts can't be rewritten.

**Not yet built:** real accounts and database (the schema is ready), photo uploads, messaging, employer portal (`/employer`), and friends/roommates/activities routes. The data model already supports them.
