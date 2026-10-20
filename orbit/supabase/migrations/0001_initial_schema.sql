-- Orbit — initial schema (Stage 2 target).
-- Conventions:
--   * NULL means "unknown". Never store a guess in place of NULL.
--   * Every user-owned row carries user_id and is protected by row-level security.
--   * Expected and confirmed refunds live in separate columns and are never merged.
--   * Retailer-specific credit (wallet_items) is separate from cash refunds (refund_events).
--   * Secrets (OAuth tokens, gift card codes) are stored encrypted via pgsodium / Vault;
--     only *_encrypted columns hold them, and they are never selected by list queries.

create extension if not exists "pgcrypto";

-- ─── Enums ─────────────────────────────────────────────────────────────
create type return_capability as enum ('guided', 'assisted', 'integrated');
create type window_start      as enum ('delivery', 'purchase', 'shipment', 'unknown');
create type shipment_status   as enum ('ordered', 'shipped', 'delivered', 'unknown');
create type confidence_level  as enum ('high', 'medium', 'low');
create type extraction_method as enum ('deterministic', 'ai_fallback', 'user');
create type evidence_kind     as enum ('order_confirmation', 'shipping_notice', 'delivery_update', 'return_confirmation',
                                       'return_label', 'refund_confirmation', 'gift_card_email', 'receipt_upload',
                                       'manual_entry', 'retailer_integration');
create type evidence_channel  as enum ('gmail', 'outlook', 'forwarded', 'email_upload', 'screenshot', 'manual', 'sample_inbox');
create type return_status     as enum ('prepared', 'reported_submitted', 'approval_pending', 'label_ready',
                                       'shipped', 'received', 'completed', 'cancelled');
create type refund_destination as enum ('original_payment', 'store_credit', 'unknown');
create type credit_type       as enum ('purchased_gift_card', 'gift_received', 'return_credit', 'promotional_credit');
create type balance_status    as enum ('verified', 'last_known', 'user_reported', 'unknown');
create type connector_id      as enum ('gmail', 'outlook', 'forwarded');
create type connection_status as enum ('connected', 'disconnected', 'revoked', 'error');

-- ─── Users ─────────────────────────────────────────────────────────────
-- Profile row for each Supabase auth user.
create table users (
  id              uuid primary key references auth.users (id) on delete cascade,
  first_name      text,
  forwarding_slug text unique not null default encode(gen_random_bytes(6), 'hex'),
  notification_prefs jsonb not null default
    '{"returnDeadlines":true,"returnActions":true,"refunds":true,"creditExpiry":true,"weeklySummary":true,"leadDays":5}',
  created_at      timestamptz not null default now()
);

-- ─── Connected accounts ────────────────────────────────────────────────
create table connected_accounts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  connector          connector_id not null,
  address            text,
  status             connection_status not null default 'connected',
  scopes             text[] not null default '{}',
  refresh_token_encrypted bytea,          -- never returned to clients
  consented_at       timestamptz not null,
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, connector, address)
);

-- ─── Retailers & policies (shared reference data) ──────────────────────
create table retailers (
  id                 text primary key,     -- slug, e.g. 'reformation'
  name               text not null,
  website_url        text,                  -- "Shop Store" target; official site only
  returns_url        text,
  support_url        text,
  balance_check_url  text,
  return_capability  return_capability not null default 'guided',
  gift_partner       boolean not null default false,
  sender_domains     text[] not null default '{}',  -- used by the deterministic parser
  created_by_user    uuid references users (id) on delete set null  -- custom retailers added by a user
);

create table retailer_return_policies (
  id                 uuid primary key default gen_random_uuid(),
  retailer_id        text not null references retailers (id) on delete cascade,
  region             text not null default 'US',
  window_days        int,                   -- NULL = unknown
  window_starts_at   window_start not null default 'unknown',
  refund_methods     text[] not null default '{}',
  refund_timeline_days int,
  fee_mail           numeric(10,2),         -- 0 = free, NULL = unknown
  fee_in_store       numeric(10,2),
  fee_waived_for_store_credit boolean,
  exceptions         jsonb not null default '[]',   -- [{category, kind, description, windowDays}]
  initiation         text,
  box_required       boolean,
  printing_required  boolean,
  qr_code_available  boolean,
  approval_required  boolean,
  drop_off           text[] not null default '{}',
  source_url         text not null,
  last_checked_at    date not null,
  verification       text not null check (verification in ('verified', 'sample', 'needs_review')),
  effective_from     date,
  effective_to       date
);
create index on retailer_return_policies (retailer_id, region);

-- ─── Orders ────────────────────────────────────────────────────────────
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  retailer_id        text not null references retailers (id),
  order_number       text,
  order_number_normalized text generated always as (upper(regexp_replace(order_number, '[^A-Za-z0-9]', '', 'g'))) stored,
  purchased_at       date,
  shipped_at         date,
  delivered_at       date,
  shipment_status    shipment_status not null default 'unknown',
  currency           char(3) not null default 'USD',
  tracking_carrier   text,
  tracking_number    text,
  stated_return_deadline date,              -- only when the retailer stated it
  stated_deadline_evidence_id uuid,
  field_sources      jsonb not null default '{}', -- {field: {evidenceId, confidence, method}}
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Deduplication key: one order per retailer + order number per user.
create unique index orders_dedupe on orders (user_id, retailer_id, order_number_normalized) where order_number is not null;

create table order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders (id) on delete cascade,
  user_id            uuid not null references users (id) on delete cascade,
  name               text not null,
  variant            text,
  quantity           int not null default 1 check (quantity > 0),
  unit_price         numeric(10,2),
  category           text not null default 'other',
  final_sale         boolean,
  kept               boolean not null default false,
  image_path         text                    -- private storage path
);

-- ─── Evidence ──────────────────────────────────────────────────────────
create table order_evidence (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  order_id           uuid references orders (id) on delete cascade,
  kind               evidence_kind not null,
  channel            evidence_channel not null,
  provider_message_id text,                  -- or content hash; dedupes re-imports
  sender             text,
  subject            text,
  received_at        timestamptz not null,
  excerpt            text,
  body_path          text,                   -- private storage bucket 'evidence'
  extraction         jsonb,                  -- raw extraction with per-field confidence
  created_at         timestamptz not null default now(),
  unique (user_id, provider_message_id)
);

-- ─── Returns ───────────────────────────────────────────────────────────
create table return_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  order_id           uuid not null references orders (id) on delete cascade,
  item_ids           uuid[] not null,
  capability         return_capability not null,
  status             return_status not null default 'prepared',
  reason             text,
  refund_preference  text,
  drop_off           text,
  ship_by            date,
  rma_number         text,
  approved_by_user_at timestamptz,           -- explicit approval, required before any submission
  submitted_by       text check (submitted_by in ('customer_on_retailer_site', 'orbit_integration')),
  submitted_at       timestamptz,
  confirmed_by_retailer boolean not null default false,
  confirmation_evidence_id uuid references order_evidence (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- A return can't be confirmed without retailer evidence.
  check (not confirmed_by_retailer or confirmation_evidence_id is not null),
  -- Orbit can only submit after the customer approved.
  check (submitted_by is distinct from 'orbit_integration' or approved_by_user_at is not null)
);

create table return_artifacts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  return_id          uuid not null references return_requests (id) on delete cascade,
  kind               text not null check (kind in ('qr_code', 'label_pdf', 'packing_slip')),
  carrier            text,
  code_encrypted     bytea,
  file_path          text,                   -- private storage bucket 'labels'
  evidence_id        uuid not null references order_evidence (id),
  expires_at         date
);

-- ─── Refunds ───────────────────────────────────────────────────────────
create table refund_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  order_id           uuid not null references orders (id) on delete cascade,
  return_id          uuid references return_requests (id) on delete set null,
  currency           char(3) not null default 'USD',
  destination        refund_destination not null default 'unknown',
  destination_label  text,
  expected_amount    numeric(10,2),
  expected_by        date,
  expected_basis     text,
  confirmed_amount   numeric(10,2),
  confirmed_at       date,
  confirmed_by       text check (confirmed_by in ('retailer_email', 'customer')),
  confirmation_evidence_id uuid references order_evidence (id),
  milestones         jsonb not null default '[]',
  check ((confirmed_amount is null) = (confirmed_at is null))
);

-- ─── Wallet ────────────────────────────────────────────────────────────
create table wallet_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  retailer_id        text not null references retailers (id),  -- each balance stays tied to its issuer
  type               credit_type not null,
  currency           char(3) not null default 'USD',
  balance            numeric(10,2),
  balance_status     balance_status not null default 'unknown',
  balance_checked_at timestamptz,
  balance_source     text,
  code_encrypted     bytea,                  -- revealed only via an audited RPC
  pin_encrypted      bytea,
  code_last4         text,
  redemption         text,
  expires_at         date,
  expiration_known   boolean not null default false,  -- false + NULL date = unknown; true + NULL = never
  restrictions       text[] not null default '{}',
  transferable       boolean,                -- NULL = unknown → treated as not transferable
  gift_from          text,
  source_order_id    uuid references orders (id) on delete set null,
  added_at           timestamptz not null default now()
);

-- ─── Gifts ─────────────────────────────────────────────────────────────
create table gift_transfers (
  id                 uuid primary key default gen_random_uuid(),
  sender_id          uuid not null references users (id) on delete cascade,
  recipient_id       uuid references users (id) on delete set null,
  retailer_id        text not null references retailers (id),
  amount             numeric(10,2) not null check (amount > 0),
  currency           char(3) not null default 'USD',
  recipient_name     text not null,
  recipient_contact  text not null,
  message            text check (char_length(message) <= 200),
  provider           text not null,          -- 'demo' until a distribution partner is integrated
  provider_reference text,
  claim_token_hash   text unique,
  status             text not null check (status in ('demo_created', 'pending_payment', 'issued', 'delivered', 'claimed', 'failed')),
  approved_by_sender_at timestamptz not null,
  created_at         timestamptz not null default now(),
  claimed_at         timestamptz
);

-- ─── Notifications ─────────────────────────────────────────────────────
create table notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  dedupe_key         text not null,          -- e.g. 'deadline:<order>:<item>:<date>'
  kind               text not null,
  title              text not null,
  body               text not null,
  action_href        text,
  sent_at            timestamptz,
  dismissed_at       timestamptz,
  unique (user_id, dedupe_key)               -- identical reminders are never sent twice
);

-- ─── Audit ─────────────────────────────────────────────────────────────
create table audit_events (
  id                 bigserial primary key,
  user_id            uuid references users (id) on delete set null,
  actor              text not null,          -- 'user', 'system', 'connector:gmail', …
  action             text not null,          -- 'return.approved', 'wallet.code_revealed', 'account.disconnected', …
  subject_table      text,
  subject_id         uuid,
  detail             jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

-- ─── Row-level security ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['connected_accounts','orders','order_items','order_evidence','return_requests',
                           'return_artifacts','refund_events','wallet_items','notifications']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%1$s_owner" on %1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table users enable row level security;
create policy users_self on users for all using (id = auth.uid()) with check (id = auth.uid());

alter table gift_transfers enable row level security;
create policy gifts_sender on gift_transfers for all using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy gifts_recipient on gift_transfers for select using (recipient_id = auth.uid());

alter table audit_events enable row level security;
create policy audit_read_own on audit_events for select using (user_id = auth.uid());  -- writes via service role only

alter table retailers enable row level security;
create policy retailers_read on retailers for select using (created_by_user is null or created_by_user = auth.uid());
create policy retailers_custom on retailers for insert with check (created_by_user = auth.uid());

alter table retailer_return_policies enable row level security;
create policy policies_read on retailer_return_policies for select using (true);  -- writes via service role only

-- Encrypted columns are excluded from client reads; codes are revealed through an audited function.
revoke select (refresh_token_encrypted) on connected_accounts from authenticated;
revoke select (code_encrypted, pin_encrypted) on wallet_items from authenticated;
revoke select (code_encrypted) on return_artifacts from authenticated;

-- Private storage buckets: 'evidence', 'labels', 'receipts' — object paths prefixed with auth.uid().
