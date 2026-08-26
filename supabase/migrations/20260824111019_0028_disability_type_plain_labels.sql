-- 0028 disability_type_plain_labels
--
-- The six labels seeded in migration 0016 used Washington Group short-set wording
-- ("Difficulty seeing, even if wearing glasses" etc). That phrasing came from this
-- project's own documentation, not from the source workbook -- the workbook's
-- disaggregation column names only "disability", no instrument. Relabelling to
-- plain categories so the data no longer implies an instrument choice nobody made.
-- Same six codes, same table shape, same yes/no + optional-type form logic --
-- content only.

update public.ref_disability_type set label_en = 'Seeing'                    where code = 'seeing';
update public.ref_disability_type set label_en = 'Hearing'                   where code = 'hearing';
update public.ref_disability_type set label_en = 'Mobility'                  where code = 'mobility';
update public.ref_disability_type set label_en = 'Memory or concentration'   where code = 'cognition';
update public.ref_disability_type set label_en = 'Self-care'                 where code = 'self_care';
update public.ref_disability_type set label_en = 'Communication'             where code = 'communication';
