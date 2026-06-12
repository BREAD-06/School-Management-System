-- =====================================================================
-- Phase 7 — School extended to Class 10.
-- Adds "Class 10" (sort_order 13) to the classes list. Run in the Supabase
-- SQL Editor. Idempotent and safe to run more than once.
--
-- With Class 10 in place the existing promotion logic (which derives the next
-- class by sort_order and graduates the highest class) automatically does:
--   Class 9  → Class 10
--   Class 10 → Graduated
-- No application changes are required for promotion.
-- =====================================================================

insert into classes (class_name, sort_order)
select 'Class 10', 13
where not exists (select 1 from classes where class_name = 'Class 10');
