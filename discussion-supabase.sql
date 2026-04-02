-- Supabase: public shared discussion board (singleton row).
-- Run this in Supabase SQL Editor, then set URL + anon key in discussion-config.js

create table if not exists public.discussion_board (
  id integer primary key default 1,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint discussion_board_single_row check (id = 1)
);

insert into public.discussion_board (id, payload)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table public.discussion_board enable row level security;

-- Anonymous visitors can read and replace the shared JSON document.
create policy "discussion_board_select_anon"
  on public.discussion_board for select
  to anon, authenticated
  using (true);

create policy "discussion_board_insert_anon"
  on public.discussion_board for insert
  to anon, authenticated
  with check (id = 1);

create policy "discussion_board_update_anon"
  on public.discussion_board for update
  to anon, authenticated
  using (id = 1)
  with check (id = 1);
