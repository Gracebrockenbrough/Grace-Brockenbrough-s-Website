-- Pairwise — PostgreSQL / Supabase schema (target backend for the MVP's local store).
-- Namespaces are kept in separate tables so dating and career data are never combined by accident.
-- Enable Row Level Security on every table and scope rows to auth.uid().

create extension if not exists vector; -- pgvector: embeddings are one signal, never the whole match

create type domain as enum ('shared', 'personal', 'professional');
create type visibility as enum ('private_ai', 'shared_internal', 'personal_profile', 'professional_profile', 'mutual_match_only', 'public');
create type memory_source as enum ('user_stated', 'ai_inferred', 'user_confirmed', 'user_rejected');
create type preference_strength as enum ('hard_requirement', 'very_important', 'preference', 'nice_to_have', 'exploratory', 'unknown');
create type intent_state as enum ('active', 'passive', 'paused', 'off');
create type intent_type as enum ('dating', 'friendship', 'roommate', 'activity', 'travel', 'full_time', 'internship', 'contract', 'temporary', 'cofounder');
create type work_model as enum ('remote', 'hybrid', 'onsite');

create table users (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  cross_domain_learning boolean not null default true,
  personal_enabled boolean not null default false,
  professional_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- shared_user_model: high-level human traits. Used across domains only when cross_domain_learning is on.
create table user_profiles (
  user_id uuid primary key references users on delete cascade,
  first_name text not null,
  birth_year int,
  general_location text,              -- never an exact address
  bio text,
  tags text[] not null default '{}',
  photo_path text,                    -- Supabase Storage
  ambition smallint, work_schedule text, social_energy smallint, location_flexibility smallint
);

-- personal_model (never readable by employer-facing code paths)
create table personal_profiles (
  user_id uuid primary key references users on delete cascade,
  visible jsonb not null default '{}',   -- visible_personal_profile
  model jsonb not null default '{}',     -- personal_model (intent, values, rhythms, dealbreakers…)
  embedding vector(1536)
);

-- professional_model (job-relevant only; never contains dating data)
create table professional_profiles (
  user_id uuid primary key references users on delete cascade,
  visible jsonb not null default '{}',   -- visible_professional_profile
  model jsonb not null default '{}',     -- skills, level, locations, work models, goals
  visibility text not null default 'matched_only' check (visibility in ('visible_to_employers', 'matched_only', 'hidden')),
  embedding vector(1536)
);

create table user_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  domain domain not null check (domain <> 'shared'),
  type intent_type not null,
  state intent_state not null,
  start_date date, end_date date,
  location text, radius_miles int, urgency text, availability text, notes text,
  last_confirmed_at timestamptz not null default now(),
  missed_reconfirmations int not null default 0
);

-- private_ai_memory
create table user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  domain domain not null,
  category text not null,
  key text not null,
  summary text not null,
  value_json jsonb,
  source memory_source not null,
  origin text,
  confidence real not null check (confidence between 0 and 1),
  confirmed boolean not null default false,
  visibility visibility not null default 'private_ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  domain domain not null,
  preference_type text not null,
  value jsonb not null,
  strength preference_strength not null,
  flexibility text,
  source memory_source not null,
  confirmed boolean not null default false,
  is_private boolean not null default true
);

create table pattern_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  domain domain not null,
  prompt text not null,
  memory_key text not null,
  status text not null default 'pending' check (status in ('pending', 'yes', 'maybe', 'no')),
  created_at timestamptz not null default now()
);

-- Mutual introductions: each side decides independently; only 'mutual' is ever revealed.
create table personal_matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users on delete cascade,
  user_b uuid not null references users on delete cascade,
  a_status text not null default 'new',
  b_status text not null default 'new',
  internal_score real,               -- never shown in the UI
  exploratory boolean not null default false,
  created_at timestamptz not null default now()
);

create table match_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references personal_matches on delete cascade,
  author uuid not null references users on delete cascade,
  rating text not null check (rating in ('see_again', 'good_unsure', 'not_really', 'definitely_not')),
  tags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
); -- private to the author; never exposed to the other person

create table match_explanations (
  id uuid primary key default gen_random_uuid(),
  match_kind text not null check (match_kind in ('personal', 'professional')),
  match_id uuid not null,
  reasons text[] not null, concerns text[] not null, unknowns text[] not null,
  created_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null, stage text, mission text, team text, logo_path text
);

create table job_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  title text not null, location text, work_model work_model, industry text, level text,
  salary_min int, salary_max int,
  overview text, requirements text[], responsibilities text[],
  required_skills text[], preferred_skills text[], tags text[],
  employer_priorities text[],        -- from the employer conversation; job-relevant only
  active boolean not null default true,
  embedding vector(1536)
);

create table professional_matches (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references users on delete cascade,
  job_id uuid not null references job_opportunities on delete cascade,
  candidate_status text not null default 'new',
  employer_status text not null default 'new',
  internal_score real,
  created_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references professional_matches on delete cascade,
  smart_resume_version_id uuid,
  submitted_at timestamptz not null default now()
);

create table resume_master (
  user_id uuid primary key references users on delete cascade,
  headline text, education jsonb, certifications text[], skills text[]
);

create table resume_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  role_title text, company text, start_date text, end_date text,
  text text not null,                 -- facts are stored once and never rewritten
  tags text[] not null default '{}',
  sort_order int
);

create table smart_resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  job_id uuid references job_opportunities,
  item_ids uuid[] not null,           -- a selection and ordering of resume_items, nothing else
  created_at timestamptz not null default now()
);

create table interaction_events (
  id bigserial primary key,
  user_id uuid not null references users on delete cascade,
  domain domain not null,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
