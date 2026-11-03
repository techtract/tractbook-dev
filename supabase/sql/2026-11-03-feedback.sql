-- In-app feedback: suggestions, issue reports and support requests.
-- Run once in the Supabase SQL editor (project fuboptvdysismzuwebov).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  kind text not null check (kind in ('suggestion','issue','support')),
  message text not null check (char_length(message) between 3 and 4000),
  email text,
  app_version text,
  page text,
  user_agent text,
  status text not null default 'new' check (status in ('new','seen','done')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- A signed-in user may add feedback as themselves and read only their own.
drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "feedback select own" on public.feedback;
create policy "feedback select own" on public.feedback
  for select to authenticated using (user_id = auth.uid());

create index if not exists feedback_created_idx on public.feedback (created_at desc);
