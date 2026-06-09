-- =====================================================================
-- Phase 3 schema additions — run this in the Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT guards).
-- =====================================================================

-- 1) Force-password-change tracking ----------------------------------
alter table students add column if not exists has_changed_password boolean default false;
alter table teachers add column if not exists has_changed_password boolean default false;

-- 2) Marks upsert needs a unique key on (student, subject, exam, session)
--    so teacher re-entry UPDATES instead of duplicating.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marks_unique_entry'
  ) then
    alter table marks
      add constraint marks_unique_entry
      unique (student_id, subject_id, exam_type, session_id);
  end if;
end $$;

-- 3) Attendance — one row per student per date per class.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'attendance_unique_entry'
  ) then
    alter table attendance
      add constraint attendance_unique_entry
      unique (student_id, class_id, date);
  end if;
end $$;

-- 4) Fees — one row per student per month per session.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fees_unique_entry'
  ) then
    alter table fees
      add constraint fees_unique_entry
      unique (student_id, session_id, month);
  end if;
end $$;

-- 5) Storage bucket for exam datesheets (public read).
insert into storage.buckets (id, name, public)
values ('datesheets', 'datesheets', true)
on conflict (id) do nothing;
