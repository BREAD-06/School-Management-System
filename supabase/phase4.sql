-- =====================================================================
-- Phase 4 schema / RLS additions — run this in the Supabase SQL Editor.
-- Safe to run multiple times (guards + drop-if-exists before create).
-- =====================================================================

-- 1) WEBSITE CONTENT -------------------------------------------------------
-- Public (anon) read so the landing page can fetch content; admin-only write
-- so only administrators can edit it from the Website Content page.
alter table website_content enable row level security;

-- One row per section (hero / about / principal / contact).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'website_content_section_key_unique'
  ) then
    alter table website_content
      add constraint website_content_section_key_unique unique (section_key);
  end if;
end $$;

drop policy if exists "website_content public read" on website_content;
create policy "website_content public read"
  on website_content for select
  using (true);

drop policy if exists "website_content admin write" on website_content;
create policy "website_content admin write"
  on website_content for all
  to authenticated
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- 2) GALLERY — ensure public read for the landing carousel -----------------
alter table gallery enable row level security;
drop policy if exists "gallery public read" on gallery;
create policy "gallery public read"
  on gallery for select
  using (true);

-- 3) ANNOUNCEMENTS — ensure public read of school-wide notices -------------
-- Additive policy: anonymous visitors may read announcements with
-- audience = 'all' (used by the landing page "Latest Announcements" block).
alter table announcements enable row level security;
drop policy if exists "announcements public read all" on announcements;
create policy "announcements public read all"
  on announcements for select
  to anon
  using (audience = 'all');

-- 4) WEBSITE-CONTENT STORAGE BUCKET (public) -------------------------------
-- Holds landing-page images uploaded from the Website Content page (hero,
-- about, principal, facility_1..8). Public so the landing page can read them.
insert into storage.buckets (id, name, public)
values ('website-content', 'website-content', true)
on conflict (id) do update set public = true;

-- 5) MESSAGES — defense-in-depth RLS --------------------------------------
-- NOTE: the app sends/reads messages through the server-side /api/messages
-- function (service role), which enforces the who-can-message-whom rules.
-- These policies additionally protect any direct client access: a signed-in
-- user may only see/insert/update their own messages.
alter table messages enable row level security;

drop policy if exists "messages read own" on messages;
create policy "messages read own"
  on messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "messages insert own" on messages;
create policy "messages insert own"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "messages update received" on messages;
create policy "messages update received"
  on messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
