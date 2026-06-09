-- =====================================================================
-- Phase 5 — switch the timetable system from period entries to a single
-- uploaded file (PDF/image) per class per session. Run in the Supabase SQL
-- Editor. Idempotent and safe to run more than once.
-- =====================================================================

-- 1) New columns for the file-based model.
alter table timetable add column if not exists file_url text;
alter table timetable add column if not exists uploaded_by uuid;

-- 2) The old period columns are no longer used by the app — make them nullable
--    so file-only rows can be inserted. (No-op if already nullable.)
alter table timetable alter column day_of_week drop not null;
alter table timetable alter column start_time drop not null;
alter table timetable alter column end_time drop not null;
alter table timetable alter column subject_id drop not null;

-- 3) Remove legacy period rows — the period-entry system is fully replaced by
--    file uploads. (Rows added before this migration have no file_url.)
delete from timetable where file_url is null;

-- 4) One timetable file per class per session (enables clean upsert/replace).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'timetable_class_session_unique'
  ) then
    alter table timetable
      add constraint timetable_class_session_unique unique (class_id, session_id);
  end if;
end $$;

-- 5) Storage bucket for timetable files (public, 5 MB). Created via the app
--    already; included here for fresh environments.
insert into storage.buckets (id, name, public, file_size_limit)
values ('timetables', 'timetables', true, 5242880)
on conflict (id) do update set public = true;
