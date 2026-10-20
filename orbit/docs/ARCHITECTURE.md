# Orbit — Architecture & Stage 1 Plan

**Orbit · Returns & Wallet** — *Your shopping, taken care of.*

Guiding rule for every screen: show what matters, when it matters, and make the next action obvious.

---

## 1. Proposed architecture

Orbit is a mobile-first Next.js app over a set of small services that talk through typed interfaces. No service depends on the UI, and the UI doesn't depend on Gmail, Outlook or any retailer integration. If one service fails, the rest of the app keeps working (try *Settings → Preview tools → Simulate a service outage*).

```
                 ┌──────────────────────────── UI (Next.js, React, Tailwind) ───────────────────────────┐
                 │  Today · Returns · Wallet · Return Assistant · Send a Gift · Add Purchase · Settings │
                 └───────────────┬──────────────────────────────┬───────────────────────────────────────┘
                                 │ selectors / actions          │
   ┌──────────────┬──────────────┼──────────────┬───────────────┼──────────────┬──────────────┬───────────────┐
   │ Purchase     │ Email        │ Return       │ Return        │ Refund       │ Wallet       │ Gift          │ Notification
   │ Service      │ Ingestion    │ Intelligence │ Workflow      │ Service      │ Service      │ Service       │ Service
   │ orders,items │ connectors → │ deadlines,   │ lifecycle +   │ expected vs  │ credits per  │ provider      │ priorities,
   │ dedupe       │ parser →     │ eligibility, │ submission    │ confirmed    │ issuer,      │ interface     │ weekly
   │              │ AI fallback  │ facts        │ adapters L1–3 │              │ balance trust│ (demo only)   │ summary
   └──────────────┴──────────────┴──────────────┴───────────────┴──────────────┴──────────────┴───────────────┘
                                 │
                       Persistence: localStorage (Stage 1) → Supabase Postgres + RLS + private storage (Stage 2)
```

| Service | Code | Responsibility |
|---|---|---|
| Purchase | `lib/store/store.ts` (orders), `lib/ingestion/dedupe.ts` | Orders, items, retailers, dedupe on retailer + order number |
| Email Ingestion | `lib/ingestion/*` | Gmail/Outlook connector interfaces, forwarding, paste/upload, deterministic parser, AI fallback interface |
| Return Intelligence | `lib/intelligence/returns.ts` | Deadlines (confirmed / estimated / not started / unknown), eligibility, plain-language return facts |
| Return Workflow | `lib/services/returnSubmission.ts`, store actions | Lifecycle from *prepared* to *completed*; Guided / Assisted / Integrated adapters |
| Refund | store actions, `Refund` model | Expected and confirmed refunds kept separate; confirmed only by retailer evidence or the customer |
| Wallet | `lib/services/balances.ts`, store actions | Credits tied to their issuer; verified vs last-known balances; codes hidden by default |
| Gift | `lib/services/gifts.ts` | `GiftProvider` interface; demo provider only (no payments, no real cards) |
| Notification | `lib/intelligence/priorities.ts` | The to-do list: each item has a type, due date, money at stake and urgency bucket; sorted by date, then amount; dedupe keys; weekly summary |
| Ask | `lib/intelligence/ask.ts` | Everyday-language lookup over the customer's own orders and credits (colors, synonyms, stores, "last month"); answers with deadlines and next steps |

**Trust rules built into the code:**
- `null` means unknown, everywhere. The deadline engine returns `unknown` with a reason rather than guessing.
- A return only moves past *prepared* when the customer reports submitting it, or when retailer evidence arrives. The schema enforces `confirmed_by_retailer ⇒ evidence`.
- Submission adapters need an approval timestamp. Guided and Assisted adapters never return `submitted: true` in this prototype.
- Email content is parsed as data only. A test checks that injected instructions are ignored.
- Orbit never asks for retailer passwords. Gmail/Outlook use the providers' own OAuth (not enabled yet).

## 2. Screens & navigation

Three tabs: **Today · Returns · Wallet**. Focused flows hide the tab bar.

| Route | Screen |
|---|---|
| `/` | **Today**: Ask Orbit bar, money on the line, 7-day calendar strip, "Do this first", then a to-do timeline grouped Overdue / Next 3 days / This week / Coming up / Missing info |
| `/ask/` | **Ask Orbit**: find purchases and credits from everyday descriptions, typed or spoken. No order number needed |
| `/returns/` | **Returns**: at-a-glance counts (Your move · Waiting · On the way), "Do this first", compact rows by urgency; waiting and in-transit folded away |
| `/returns/history/` | Completed returns, kept items, closed windows |
| `/returns/purchase/?id=` | Purchase detail: status and next step, items, collapsed Order details / Return policy / Receipt & emails / Return portal, delete |
| `/returns/start/?order=&item=` · `?return=` | **Return Assistant**: 1 Choose items → 2 Details → 3 Review & approve → 4 Next steps; status view for returns already underway |
| `/returns/label/?id=` | QR code / label, ship-by date, drop-off locations, what to bring |
| `/returns/refund/?id=` | Refund tracking: expected vs confirmed, timeline, contact retailer, confirm receipt |
| `/wallet/` | **Your Wallet**: total known balance, stacked cards, Send a Gift |
| `/wallet/card/?id=` | Card detail: balance trust, **Shop {Retailer}**, secure code reveal, restrictions, update/remove |
| `/wallet/add/` | Add a gift card or credit |
| `/wallet/gift/` | Send a Gift: store → amount → recipient → message → review → confirm (demo) |
| `/gift/claim/?id=` | Recipient view: open gift, add to Orbit Wallet |
| `/add/` | Add a purchase: forward, paste email, upload, manual |
| `/settings/` | Profile, email connections and consent, notifications and weekly summary, privacy and data deletion, preview tools |

Detail routes use query parameters so the app can be exported statically and records created on the device still resolve.

## 3. Component structure

```
src/components/
  ui/        Design-system primitives (shadcn-style, accessible, 44px targets)
             button (Button, ButtonLink, ExternalButton, IconButton, TextLink) · card (Card, LinkCard, Row, Rows, SectionTitle)
             notice (Notice, Tag) · sheet (Radix Dialog bottom sheet) · disclosure · form (Field, Input, Select,
             Textarea, Toggle, Choice, CheckRow) · chips (FilterChips) · steps · states (Skeleton, PageSkeleton, EmptyState, ErrorState)
  layout/    Shell (centered column + tab bar), TopBar, PageHeader, BackBar, BottomNav, OrbitWordmark
  orbit/     Domain components
             PriorityCard · PurchaseCard · WalletCardFace · DeadlineLine · BalanceStatus · ReturnFactsList
             QrCode · CopyRow · RetailerMark · ProductThumb
src/lib/
  domain/        types, dates, formatting
  intelligence/  returns (deadline engine), priorities (notification service)
  ingestion/     connectors, parser, dedupe, AI fallback, samples
  services/      return submission adapters, gift provider, balance checking
  store/         state shape, persistence, selectors, actions
  demo/          retailer directory, sample policies, fictional seed data
```

Design tokens live in `src/app/globals.css` (`@theme`): ivory `#F8F7F4`, navy `#19243B`, muted `#6C7078`, line `#E7E7E3`, sage `#DDE8DC`, terracotta `#B65D4F`. Type is Inter with a 16px body. Cards use 18–20px radii, and pages a 20px gutter.

## 4. Database design

See [`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql).

Entities: `users`, `connected_accounts`, `retailers`, `retailer_return_policies`, `orders`, `order_items`, `order_evidence`, `return_requests`, `return_artifacts`, `refund_events`, `wallet_items`, `gift_transfers`, `notifications`, `audit_events`.

Highlights:
- Row-level security on every user-owned table (`user_id = auth.uid()`). Reference data is read-only to clients.
- Unknowns stay NULL, and every extracted field keeps its source and confidence (`field_sources`, `order_evidence.extraction`).
- Dedupe: a unique index on `(user_id, retailer_id, normalized order_number)` and on `provider_message_id`.
- Refunds: `expected_*` and `confirmed_*` are separate columns, and confirmation needs an amount and date together.
- Wallet credits reference exactly one retailer and are never pooled. `transferable` NULL means not transferable.
- Secrets live in `*_encrypted` columns that clients can't select. Code reveals go through an audited function, and `audit_events` records approvals, reveals and disconnects.
- `notifications.dedupe_key` is unique, so the same reminder is never sent twice.

## 5. What's working, what's demo, what's future

### Refunds without bank access

Orbit never connects to bank accounts or card wallets. A refund has three states, and the UI names the source of each:
1. **Received by the store**: from the store's email.
2. **Issued**: from the store's refund email (most retailers send one). If none arrives by the expected date, it's flagged "Refund late" and the customer is prompted to follow up.
3. **Arrived**: only when the customer taps "It arrived in my account". This step is optional.

### Scaling to heavy shoppers

Each screen leads with one "Do this first" item. Everything else is a one-line row (type marker, store, item, amount, countdown) grouped by urgency, with long groups folded behind "Show N more". Things that need nothing from the customer (waiting on the store, in transit) are collapsed, and finished items move to History. *Settings → Preview tools → Load a Busy Month* adds 19 orders to test this.

### Brand logos

Store logos and brand colors are trademarks, so they arrive through a retailer partner program: a partner supplies its logo and color, and the card shows them. Until then, cards use in-palette tones and a small store-type icon.

### Working now (real logic, in the browser)
- All screens and flows, navigable at 390px and centered on desktop; loading, empty, error, outage and disconnected states.
- **Deadline engine**: confirmed vs estimated vs unknown, category-specific windows, final sale, stale-policy flag. It never fabricates a date.
- **Priority engine**: ranking, preferences, dismissal, no-repeat keys, weekly summary text.
- **Email parsing** of pasted text and `.eml`/`.txt` uploads: retailer, order number, dates, items, prices, currency, tracking and carrier, return links, stated deadlines, refund amounts, with per-field confidence and a list of what it couldn't read.
- **Dedupe**: repeat emails merge into one order, re-imported messages are ignored, and lower-confidence data never overwrites higher.
- **Return workflow**: item-level selection, refund and drop-off choices, fee logic, prepare → reported submitted → retailer-confirmed via email → label → shipped → refund confirmed. Retailer emails move returns and refunds forward.
- Wallet: add, update balance (labeled "Updated by you"), 30-second code reveal, remove, Shop Store links to the official site.
- Manual purchase entry, missing-delivery-date capture, delete purchase, delete all data.
- Ask Orbit lookup; voice input where the browser supports speech recognition.
- 37 unit tests (`npm test`).

### Demo simulations (clearly labeled in the UI)
- All people, orders, codes, balances and the "Sample inbox" are fictional. Seeded dates stay relative to today.
- Retailer return policies are **samples**, not verified retailer terms.
- Assisted returns prepare the request but send nothing ("Preview mode" notice).
- QR codes are generated from fictional codes ("Demo code, not a real label"). Drop-off locations are examples; the Maps button runs a real search.
- Send a Gift uses the demo provider: no payment, no real card. Claiming adds a demo card in the same browser.
- Persistence is `localStorage` only.

### Future integrations (interfaces exist, not enabled)
- Supabase auth, Postgres and private storage (schema written; Stage 2).
- Gmail (`gmail.readonly`, restricted scope: Google verification and security assessment) and Outlook (Graph `Mail.Read`). Connectors report unavailable and are never mocked as live.
- Inbound forwarding address, OCR for screenshots and PDFs, AI extraction fallback.
- Level 3 integrated returns (e.g. platform return-request APIs) and retailer-specific assisted sessions.
- Gift card distribution partner and payment processor; balance-check integrations.
- Push/email notification delivery and the weekly summary send.
- Verified policy records per retailer and region, with deep links to return portals.
