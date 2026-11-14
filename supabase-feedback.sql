-- Run this once in Supabase Dashboard > SQL Editor.
-- Feedback is readable only by the configured administrator; signed-in users
-- can submit feedback only as themselves. No public/anonymous read access.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 80),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon, authenticated;
grant insert, select on table public.feedback to authenticated;
grant usage, select on sequence public.feedback_id_seq to authenticated;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
on public.feedback for insert to authenticated
with check (
  user_id = auth.uid()
  and username = coalesce(auth.jwt() -> 'user_metadata' ->> 'username', '')
  and char_length(trim(message)) between 1 and 2000
);

drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read"
on public.feedback for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'ssaheror@gmail.com');
