-- 0002 enums_and_reference
create type sex_t               as enum ('female','male');
create type partnership_type_t  as enum ('training','production_support');
create type record_status_t     as enum ('draft','submitted','approved','rejected');
create type link_status_t       as enum ('proposed','under_review','active','ended');
create type followup_round_t    as enum ('six_month','twelve_month','annual');
create type contact_mode_t      as enum ('telephone','site_visit','municipal_office');
create type respondent_t        as enum ('participant','household_member','not_reached');
create type tri_status_t        as enum ('done','in_progress','not_started');
create type initiative_status_t as enum ('planned','operating','paused','stopped');

-- all 18 lookup tables share one shape
do $outer$
declare t text;
begin
  foreach t in array array[
    'ref_partner_type_training','ref_partner_type_production',
    'ref_partner_role_training','ref_partner_role_production',
    'ref_training_topic','ref_agri_involvement','ref_activity_type',
    'ref_product','ref_producer_type','ref_guidance_type',
    'ref_office_service_type','ref_sales_channel','ref_buyer_type',
    'ref_safety_item','ref_promotional_channel','ref_stakeholder_type',
    'ref_nationality','ref_disability_type'
  ] loop
    execute format($f$
      create table if not exists public.%I (
        id               uuid primary key default gen_random_uuid(),
        code             text not null unique,
        label_en         text not null,
        label_ar         text not null,
        sort_order       int  not null default 0,
        is_active        boolean not null default true,
        allows_free_text boolean not null default false,
        created_at       timestamptz not null default now(),
        updated_at       timestamptz not null default now(),
        created_by       uuid references auth.users(id),
        deleted_at       timestamptz
      )$f$, t);
    perform public.attach_updated_at(t);
  end loop;
end $outer$;
