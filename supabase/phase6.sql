-- =====================================================================
-- Phase 6 — Toppers / Achievers showcase for the public landing page.
-- Run in the Supabase SQL Editor. Idempotent and safe to run more than once.
-- =====================================================================

-- 1) Toppers table.
create table if not exists toppers (
  id uuid primary key default uuid_generate_v4(),
  student_name text not null,
  class_name text not null,
  percentage decimal not null,
  session_name text not null,
  photo_url text,
  achievement_type text default 'academic',
  created_at timestamp with time zone default now()
);

-- 2) Row Level Security.
alter table toppers enable row level security;

-- Public (anon + authenticated) can READ all toppers — needed for the public
-- landing page which uses the anon key.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'toppers' and policyname = 'toppers_public_read'
  ) then
    create policy toppers_public_read on toppers
      for select using (true);
  end if;
end $$;

-- Only admins can INSERT / UPDATE / DELETE. Mirrors the role check used by the
-- other admin-managed tables (membership in user_roles with role = 'admin').
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'toppers' and policyname = 'toppers_admin_write'
  ) then
    create policy toppers_admin_write on toppers
      for all
      using (
        exists (
          select 1 from user_roles
          where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from user_roles
          where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
        )
      );
  end if;
end $$;

-- 3) Topper photos are stored in the existing public `profile-photos` bucket
--    under the toppers/ folder. Ensure the bucket exists for fresh environments.
insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-photos', 'profile-photos', true, 5242880)
on conflict (id) do update set public = true;
