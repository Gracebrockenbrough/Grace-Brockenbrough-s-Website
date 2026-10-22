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


---

# Visual and UX refinement (v3)

## Critique of v2

- **Sameness.** Nearly every block was the same white rounded card on beige. Today stacked three near-identical task cards; Circle Discover was an alphabetical list; You looked like a settings menu.
- **Weak hierarchy.** "8 things need you" counted items Tote was only tracking. The most urgent thing had the same weight as the third.
- **Calendar buried.** The week strip sat below three tall cards, and its dots were all one color, so a delivery and a deadline looked alike.
- **Tall rows.** Returns rows used about 130 px each, plus a separate action row, so five orders needed two screens. Store and category filters took two lines before any content.
- **Type.** Fraunces was elegant but read formal at heading sizes and didn't fit a fashion app.
- **Insights.** It compared Oct 1–21 with Sep 11–30, showed "New this period" for everything, and called store credit a refund.

## Direction

Two directions were mocked side by side (`design-directions.png`):

- **A, playful fashion editorial.** Condensed Bricolage headings, a dark "next up" block, collage art.
- **B, sophisticated boutique.** Restrained serif, thin rules, quiet imagery.

**Chosen: A for Today, Circle and You, with B's restraint for Returns and Wallet.** A is memorable at a glance, and Bricolage stays readable at UI sizes. Money, dates and forms stay in DM Sans everywhere.

## System

- **Section colors:** Returns `#B64E3A` / `#FCE3DC`, Wallet green `#28794E` / `#DDF0D8`, Today `#25213C`, Circle `#A05B16` / `#FFE7C5`, You orchid `#7948AF` / `#ECE1FA`.
- **Status colors:** terracotta urgent, amber unverified, blue in progress, sage confirmed, gray archived. Always shown with words.
- **Event colors** (calendar and agenda): return deadline, drop-off, delivery, refund, credit expiry. A legend is always shown.
- **Washes:** soft corner gradients on Circle and You only. Content always sits on solid cards.
- **Art:** `Collage` (geometric arch, disc and tile plus the garment illustrations) stands in for photography Tote has no rights to. It's deterministic per post or store. Customers' own photos use `Photo`.
- **Components:** `NextUpCard`, `WeekStrip`, `AgendaRow`, `Journey`, `OrderRow`/`OrderList`, `FeedPost` (haul, styled, store favorite, review and collection layouts), `Carousel`, `StoreTile`, `CollectionTile`, `DoneCheck`, toasts.

## What changed per screen

- **Today:** headline counts only what needs you this week, and says how many orders Tote is watching. One dark "Next up" card plus one compact second item. A week strip with typed markers, a "Today" ring, week paging and a full-calendar link. A "Coming up" agenda of the next five dated events. A collapsed "Tote is watching" list. The hideable Circle note sits last. Counts come from `todayPlan`, which the "Everything ahead" page also uses.
- **Calendar:** a month grid with the same markers and agenda rows.
- **Order details:** a Journey timeline that shows only the stages that apply. Solid means recorded, dashed means estimated, hollow means not yet. Tap a step to see how Tote knows it. Refund received is never assumed.
- **Returns:** about 68 px rows in one divided card per group, with a status dot and the deadline label. A QR shortcut appears on rows ready for drop-off. Store and category moved into a Filter sheet.
- **Wallet:** green section identity. The card animates into detail, and the first restriction shows under the card.
- **Circle:**
  - Feed (Friends | Following) with image-first hauls, quote-style reviews, store-favorite cards, collection grids and a creators break. Demo content is labeled.
  - Stores is an image-led grid showing one real fact (fee, refund method or "policy unknown") and friend counts from demo posts.
  - Lists has collection collages, new collections, items with photo or link, and saved posts.
- **Create Post:**
  - Four steps: Type, Content, Details, Share.
  - Purchases are a private picker; only ticked items are included, by name only.
  - Audience has no default, and a final "Share these N pieces" confirmation is required before Publish.
- **You:** style banner, avatar, Bricolage name, bio and style tags. Favorite boutiques with visibility, My collections, My reviews, then private rows. "View as a friend" hides everything private.
- **Insights:**
  - Comparisons use the same stretch of the previous period, and running periods are marked "So far."
  - Net merchandise kept = purchases − refunds issued − store credit, with each part defined. Refunds received and refunds awaiting confirmation are shown separately. Store credit is labeled "not cash."
  - Trends only appear with real prior data.
  - Buckets share one color and open their purchases.
  - Spending targets moved to Settings and are off by default.
- **Settings:** Circle updates have their own notification switch, separate from deadlines.

# Penny (v4): green, quieter, lists instead of a feed

The product is now called **Penny**. Internal identifiers (`useOrbit`, `OrbitData`, the `orbit/` folder) are unchanged.

## What changed
- **Look:** green page background (`#e9f1e4`), deep green primary (`#1f3b2d`), copper wallet accent and a copper-coin logo. Body text is Nunito and headings are a soft Fraunces (`SOFT 100, WONK 1`).
- **Fewer subtitles:** intro lines under page titles are gone. Only Today keeps a one-line summary under the greeting.
- **Returns:** split into two tabs.
  - **Orders** lists every order, newest first, with search and a store/category filter.
  - **My returns** lists only the orders you chose to return. Each card has a four-step tracker (Started, Label, Dropped off, Refund) and the next dated milestone. Finished returns drop into "Done".
- **Discover replaces Circle:** no feed, posts, likes or hauls.
  - Rows for "Shared with you" (lists from friends) and "Popular lists" (lists from creators).
  - A store grid underneath.
  - Others' people and lists are fictional and labeled Demo.
- **Public and private:** every list and favorite store is either Private or Public.
  - Public lists can be shared by link.
  - You can save other people's lists to your You page.
  - Lists never carry prices, order numbers or purchase dates (covered by a unit test).

## Tests
- `journey.test.ts` has a "Discover privacy" block.
- The browser regression suite checks the following at 390px and 320px:
  - nav order and green background
  - the Orders and My returns tabs
  - the Discover rows
  - saving someone else's list
  - private lists hide Share, public lists show it
  - creating a new list
  - no horizontal overflow and no page errors
