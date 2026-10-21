# Tote — Audit, Architecture & Plan

*Mission: protect shoppers' time and money. Promise: never lose track of a return, refund, gift card, or store credit again.*

Decisions for this phase (from the product owner): navigation is **Today | Returns | Wallet**; Insights and Saved for Later live in Profile; **no sales feed and no sponsored content**; the product name is **Tote** (the codebase folder is still `orbit/`).

---

## A. Audit of the existing application

| Area | Status | Notes |
|---|---|---|
| UI shell, design system, responsive layout | **Works** | Ivory/navy tokens, accessible primitives, 44px targets, mobile and desktop. |
| Shared state and selectors | **Works (local only)** | One store and one stage model drive every screen. Persistence is browser `localStorage`, so there's no cross-device sync yet. |
| Deadline engine (confirmed / estimated / unknown) | **Works** | Never fabricates a date. Only **one** deadline per item; the spec needs three (start, label, ship). |
| Return workflow | **Works (guided)** | Item-level selection, facts, prepare → reported → retailer-confirmed → label → shipped → refund. Assisted/Integrated adapters were removed; the spec wants their **interfaces** back (guided stays the only implementation). |
| Refund tracking | **Partly works** | Expected vs issued vs arrived exists, with a checkbox. Missing: "Not yet", "Remind me later", "Report missing refund", resolution. |
| Wallet | **Works** | Codes hidden by default, balance trust labels, update balance, history, photo capture. Missing: original value, capability-driven actions. |
| Email ingestion | **Partly works** | Deterministic parser, dedupe, sample inbox with sync states. Gaps: **one connection only**, no source on orders, no detection stage, no merchant-domain database, no tiered AI or cost accounting, no idempotency log, no review queue. |
| Gmail / Outlook | **Not built (by design)** | Interfaces only; shown as unavailable. Never mocked as live. |
| Receipts | **Partly works** | Upload and photo stored; nothing is extracted from images or PDFs. Pasted receipt and SMS text isn't parsed into items. |
| Amazon | **Missing** | No Amazon retailer, templates or guidance. |
| Retailer capabilities | **Missing** | No registry; the UI assumes the same capabilities for every store. |
| Discover feed, promotions, codes, points, sponsored | **Built, now out of scope** | Removed in Phase 1 per the decision above. |
| Insights | **Works** | Buckets, optional targets, trends, refund netting. Moves into Profile. |
| Saved for Later / wishlist | **Works** | Text, photo, voice and link entry. Becomes "Saved for Later" in Profile, with no sale matching. |
| Calendar | **Works** | Clickable days and events; returns to Today. |
| Ask | **Works (on-device matching)** | Answers from the user's records. Needs the source account and Amazon-style queries. |
| Database schema | **Draft** | `0001` covers the earlier model. Needs connections, data sources, shipments, return/refund events, jobs, AI usage, capabilities, policy versions. |
| Money handling | **Risky** | Floating-point dollars in TypeScript. Moving to integer-cent arithmetic for sums. |
| Tests | 63 unit tests + scripted browser audits | Extend to the spec's scenario list. |

**Demo-only today:** all data is fictional; the sample inboxes are fake; gifting is simulated; drop-off locations are examples; policies are samples.

---

## B. Architecture

```
 Clients ─ Web app (now) · Native app (later) · Chrome extension (later) · Share sheet (later)
    │  all authenticate to ONE Tote account and read/write the SAME records
    ▼
 API layer (Next.js route handlers / Supabase RPC, RLS-enforced)
    │
    ├─ Purchase service ……… orders, items, shipments (canonical records)
    ├─ Ingestion pipeline … detect → classify → extract (tiered) → match → save
    │     connectors: Gmail, Outlook (OAuth, per-connection), forwarding inbox,
    │     uploads (receipt photo, PDF, screenshot, shared text)
    ├─ Return intelligence … policy versions, three deadlines, capability registry
    ├─ Return workflow ……… guided / assisted / integrated adapters (guided implemented)
    ├─ Refund asker ………… expected → issued → customer confirmation / missing → resolved
    ├─ Wallet …………………… credits per issuer, protected codes, manual balances
    ├─ Notifications ……… deduped reminders, weekly summary
    └─ Cost & audit ……… processing jobs, AI usage ledger, budgets, audit log
    ▼
 Postgres (Supabase) + private object storage (receipts, labels) + job queue
```

**Background jobs** (Supabase cron and queue table, or a small worker):
- `sync_connection` (incremental, using Gmail history ID / Graph delta)
- `process_message` (idempotent, keyed by connection plus provider message ID and content hash)
- `escalate_extraction` (AI tiers, budget-checked)
- `recompute_deadlines` (on policy or order change)
- `send_reminders`
- `recover_missed` (periodic catch-up)

Failed jobs retry with backoff, then land in a dead-letter table.

**Security controls:**
- OAuth only, with tokens encrypted (pgsodium/Vault) and kept server-side.
- RLS on every user table, with time-limited signed URLs for files.
- Gift card codes encrypted and revealed through an audited RPC.
- Emails, receipts and web pages are untrusted data, never instructions.
- Rate limits per account; no full email bodies, codes or tokens in logs.
- An explicit approval timestamp is required before any external action; a consent log records it.

---

## C. Integration feasibility matrix

| Source | What it gives | Auth | Restrictions | Security / compliance | Difficulty | Run cost | Phase |
|---|---|---|---|---|---|---|---|
| Forwarding inbox | Any email the user forwards | Per-user secret address | User effort | Verify sender; SPF/DKIM; spam | Low | ~$0 (inbound mail service) | 2 |
| Uploads (photo, PDF, screenshot) | In-store and SMS receipts | Account | Image quality | Private storage, signed URLs | Medium (OCR) | OCR per page; cache by hash | 2 |
| Shared text (SMS, links) | Text receipts | Account | No background SMS access on iOS/Android | Treat as untrusted | Low | ~$0 | 2 (web paste), 6 (share sheet) |
| Gmail API | Order, shipping, return, refund and gift emails | OAuth `gmail.readonly` (restricted) | Scope covers **all** mail; Google verification plus an annual third-party security assessment (CASA) for restricted scopes | Must say honestly that filtering is ours, not Google's | High (process) | API free; assessment costs money | 5 |
| Microsoft Graph | Same, for Outlook/Hotmail | OAuth `Mail.Read` (delegated) | Publisher verification; consent per tenant | Same honesty rule | Medium | Free | 5 |
| Amazon | Orders via email, shared receipts | Gmail/Outlook or upload | **SP-API is for sellers, not shopper histories.** No scraping or automation of amazon.com | Never claim a submitted return | Low (email templates) | ~$0 | 2–3 |
| Shopify Customer Account API | A customer's orders and returns at participating shops | Per-shop customer OAuth, needs merchant app approval | Merchant-by-merchant | Partnership agreements | High | Low | Later (partners) |
| Carrier APIs (UPS, USPS, FedEx) | Tracking events | Developer keys | Rate limits, terms | Store only status events | Medium | Free or low tiers | 3+ |
| Returns platforms (Loop, Happy Returns, etc.) | Return status and labels | Merchant partnership | Partner-only | Partner agreements | High | Varies | Later |
| Gift card distributors | Buying new cards | Commercial partner + payments | KYC, money-transmission concerns stay with the partner | Never hold funds | High | Fees | Later |
| Chrome extension | Credit and order context on supported sites | Account login | Minimal and optional host permissions; user-invoked | No cookie or credential access; never alters affiliate links | Medium | ~$0 | 6 |

---

## D. AI cost optimization

**Where AI is never used:**
- Order-number patterns, dates, totals and tracking numbers from known templates
- Deadline math, sorting and priorities
- Spending totals and insights
- Deduplication
- Reminders
- Balances
- Search over the user's own records

**Tiered extraction:**

| Tier | When | Cost control |
|---|---|---|
| 0 Rules | Known merchant templates + generic deterministic parser | Free; target 80–95% of routine mail |
| 1 Small model | Required fields missing after Tier 0 | Minimal text only (no headers or footers), schema-validated JSON, confidence capped at medium, cached by content hash |
| 2 Larger model | Conflicting evidence, multi-item ambiguity, policy text | Only on explicit flags; one attempt |
| 3 Customer review | High-impact and still uncertain (deadlines, amounts) | Free; a short confirm screen |

**Controls:**
- Idempotency key per message and content hash (never reprocess on app open)
- Incremental sync and batching
- Per-account monthly token budget (default **$0.10 per active customer per month**)
- Retry limits and a dead-letter queue
- A usage ledger and an over-budget alert. Over budget means messages queue for review; they are **never dropped**.

**Metrics on the developer dashboard (`/dev/`):**
- AI calls per 100 messages
- % parsed without AI
- Cost per message, per order, and per active user
- Duplicate rate
- Failure rate
- Customer correction rate

---

## E. Milestones

| Phase | Milestone | Test gate |
|---|---|---|
| **1** | Restore Today/Returns/Wallet; Insights and Saved in Profile; remove the feed; multi-email connection model; "Purchased using"; capability registry drives the UI; three return deadlines; Refund Asker; ingestion pipeline with tiers, cost ledger and dev dashboard; Amazon email support; receipt and SMS text parsing; money-safe sums; schema `0002` | Unit tests for the spec's scenarios + browser audit |
| 2 | Forwarding inbox (inbound mail webhook), receipt OCR (Tier 0 layout rules + Tier 1 vision fallback), Supabase auth + persistence | Import accuracy on a labeled sample set |
| 3 | Verified policies for the top 25 retailers by user volume; retailer templates; return-label storage in object storage | Policy verification dates; template coverage % |
| 4 | Refund Asker reminders server-side; wallet code encryption RPC; simulated gift flow behind a provider interface | Reminder dedupe tests |
| 5 | Gmail and Outlook OAuth behind verification; incremental sync; cost monitoring live | Google/Microsoft review passed |
| 6 | PWA install + share target; Chrome extension MVP; carrier tracking | Cross-device sync tests |

Each stage ends with a report: what changed, what now works, what remains simulated, what depends on external approval, what needs testing, new costs or risks, and what comes next.
