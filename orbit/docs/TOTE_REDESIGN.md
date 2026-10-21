# Tote redesign: audit, navigation and component plan

*Keep what you love. Return what you don't.* The name "Tote" is provisional until trademark, domain and app-store checks are done.

## Audit (before this change)

| Area | State | Kept? |
|---|---|---|
| Purchases, returns, refunds, Return Kit, three return dates | Working (local demo data) | Yes, unchanged |
| Refund Asker, wallet, codes, balances, gifting demo | Working | Yes |
| Multi-inbox ingestion pipeline, import history, dev dashboard | Working with sample inboxes | Yes |
| Calendar, Ask Tote, priorities | Working | Yes |
| Navigation | 3 tabs (Today, Returns, Wallet); Profile behind settings | Replaced with 5 tabs |
| Visual system | Ivory/navy, Inter, a few status colors | Replaced with section and status colors, Fraunces + DM Sans |
| Social, store profiles, reviews | Not built | Started (see below) |

Internal identifiers (`OrbitData`, `useOrbit`, the `orbit/` folder, storage keys) are unchanged, so nothing working broke.

## Navigation

`Returns | Wallet | Today | Circle | You`. Today is the center and default. Each tab lights up in its section color; Today uses the indigo Tote mark in a pill. All targets are at least 44 px. On wider screens the bar floats as a centered pill.

| Tab | Routes | Section color |
|---|---|---|
| Returns | `/returns/*`, `/add/` | Coral `#AD503E` on `#FBE9E4` |
| Wallet | `/wallet/*`, `/gift/*` | Lilac `#7453A5` on `#F1EAFB` |
| Today | `/`, `/ask/`, `/attention/`, `/calendar/` | Indigo `#26233D` |
| Circle | `/circle/`, `/stores/` | Apricot `#A56B2F` on `#FFF0DD` |
| You | `/you/`, `/settings/*`, `/insights/`, `/saved/`, `/dev/` | Sea glass `#41766F` on `#E9F2F0` |

## Status colors (one meaning each, always with words)

| Status | Token | Used for |
|---|---|---|
| Urgent | `terracotta` | Due within 3 days, overdue, reported missing |
| Needs verification | `sand` / `sand-ink` (amber) | Unknown deadline, unverified balance, sample policy |
| In progress | `progress` (blue) | Return in transit, awaiting approval, refund pending |
| Complete | `sage` | Confirmed refund, done steps |
| Inactive | `archived` (gray) | History |

Section colors are identity only; a lilac wallet card can carry an amber "needs checking" tag.

## Type

- **Fraunces** (soft optical setting): greetings, page titles, profile name, "All taken care of."
- **DM Sans**: everything else, including all money, dates, deadlines, buttons and errors.

## Components added or changed

- `layout/bottom-nav.tsx`: 5 tabs, section-colored active states.
- `layout/logo.tsx`: new tote mark with a coral fold; Fraunces wordmark.
- `layout/shell.tsx`: `PageHeader` with section accent bar; `TopBar` with date; page fade-in; global `Toaster`.
- `ui/toast.tsx`, `ui/done-check.tsx`: calm confirmations with a drawn checkmark (reduced-motion safe).
- `orbit/save-store.tsx`: heart that fills; saved stores are private by default.
- `/circle/`: Friends | Discover | Lists. Discover lists stores with filters that use only facts we hold (category, free mail returns, refunds to card). Friends shows an honest empty state; no fabricated activity.
- `/stores/?id=`: Store Profile. Header, Save / Visit / Share; private "You have $X here" context; **Before you buy** from the policy record only (sample label, last checked, version, region, official link); **Community experience** and **What shoppers are saying** show "Not enough feedback yet" below 5 reviews.
- `/you/`: identity (editable name and bio), Favorite stores with per-store visibility (Only you / Friends / Everyone), My collections, Shopping Insights (private), Connected accounts, Privacy & sharing.
- Today: Fraunces greeting, date, "Needs attention" (max 3), money strip, Upcoming calendar, optional hideable Circle note **below** everything urgent, wallet shortcut. Empty state: "All taken care of."
- Completion moments: refund confirmed (shows money recovered this year), return started, dropped off, keeping an item, balance updated, gift card reveal animation.

## Privacy rules enforced in code

- Nothing from email, orders, returns or refunds is ever turned into a post.
- Favorite stores start private. Store pages show your own purchases and credit only to you, with a lock.
- No ratings or AI summary until at least 5 real reviews exist (`MIN_REVIEWS`).

## Next phases

3. You: shared collections (birthday list), collection items, sharing permissions.
4. Circle: accounts and friendships (needs real sign-in), friend posts the user chooses to publish, labeled demo posts for previews.
5. Store Profiles: policy sources table, review storage.
6. Ratings: "Would you recommend?" and "How easy was this return?" flows, private by default, explicit consent to share, moderation and reporting.
7. Review AI: cached, source-grounded summaries regenerated only when reviews change; counts and timestamps shown; removed reviews drop out.
8. Full audit on mobile and desktop.

Social tables to add (Supabase, RLS): `public_profiles`, `friendships`, `friend_requests`, `saved_stores`, `collections`, `collection_items`, `collection_members`, `sharing_permissions`, `store_reviews`, `review_tags`, `review_votes`, `store_review_summaries`, `social_posts`, `user_reports`, `moderation_actions`. Friendship never grants access to financial tables.
