create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  client_id text not null unique,
  content text not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  source text not null default 'manual',
  est_minutes integer,
  target_date date,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tasks_created_at_idx
  on public.tasks (created_at desc);
