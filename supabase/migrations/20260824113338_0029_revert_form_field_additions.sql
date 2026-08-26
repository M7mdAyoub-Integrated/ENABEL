-- 0029 revert_form_field_additions
--
-- Reverses migration 0027 (form_field_additions) at the project owner's request.
--
-- THIS IS NOT A DEFECT BEING CORRECTED. 0027 applied cleanly and was verified
-- working; the accompanying front-end fields were built and tested. The owner
-- decided to take the whole form-field change back out for now. These fields may
-- well be reinstated later -- if they are, 0027 is the reference for what to
-- rebuild, and it is left in place and unedited so it stays readable.
--
-- NAMING NOTE: the owner asked for this to be called 0028. That number was
-- already taken by 0028_disability_type_plain_labels (a separate, later change
-- that relabelled ref_disability_type and is deliberately NOT reverted here), so
-- this is 0029. Two migrations sharing a number would break ordering.
--
-- SCOPE: only what 0027 created. Everything else named in the original task --
-- person.sex / date_of_birth / age_recorded / is_refugee / has_disability /
-- disability_type_id / nationality_id, exhibition_registration.exhibition_id and
-- .status, partnership.established_on and .is_active, exhibition.is_cancelled,
-- training_session.topic_id, ref_training_topic, ref_nationality,
-- ref_disability_type -- pre-dates 0027 and is untouched. Dropping any of those
-- would break indicators that were computing correctly before 0027 existed.
--
-- Dependency check before writing this: no view, no function and no foreign key
-- outside exhibition itself references any of these objects. The index
-- exhibition_event_type_id_idx and the FK exhibition_event_type_id_fkey both drop
-- automatically with their column.

-- 1. the constraint first, so the columns it guards can go
alter table public.exhibition
  drop constraint cancelled_needs_reason;

-- 2. the four columns 0027 added (comments drop with them)
alter table public.exhibition
  drop column event_type_id,
  drop column is_co_organised,
  drop column cancellation_reason,
  drop column municipal_cost_jod;

-- 3. the lookup table, now unreferenced
drop table public.ref_event_type;
