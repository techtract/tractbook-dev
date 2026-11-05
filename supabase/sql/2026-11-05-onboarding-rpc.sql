-- Onboarding v3: create the business, its owner membership and the optional
-- accountant invite in ONE all-or-nothing call. This replaces the three separate
-- inserts the app used to make, one of which was blocked by row-level security
-- ("new row violates row-level security policy for table business_members").
--
-- Run this whole file in the Supabase SQL editor.

create or replace function public.create_business_with_owner(
  p_name text,
  p_legal_structure text,
  p_year_started integer,
  p_country text,
  p_industry text,
  p_business_number text,
  p_tax_registration_number text,
  p_region text,
  p_bookkeeping_method text,
  p_main_goal text,
  p_team_size text,
  p_accountant_email text default null,
  p_accountant_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_business_name text;
  v_invite_id text;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  -- One workspace per person for now: a second tap or a retry returns the existing one
  select m.business_id into v_business_id
  from public.business_members m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_business_id is not null then
    select b.name into v_business_name from public.businesses b where b.id = v_business_id;
    return jsonb_build_object(
      'business_id', v_business_id,
      'business_name', v_business_name,
      'invite_id', null,
      'already_existed', true
    );
  end if;

  insert into public.businesses (
    name, legal_structure, year_started, country, industry,
    business_number, tax_registration_number, region,
    bookkeeping_method, main_goal, team_size, created_by
  ) values (
    coalesce(nullif(trim(p_name), ''), 'Untitled Business'),
    p_legal_structure, p_year_started, coalesce(p_country, 'CA'), p_industry,
    p_business_number, p_tax_registration_number, p_region,
    p_bookkeeping_method, p_main_goal, p_team_size, v_uid
  )
  returning id, name into v_business_id, v_business_name;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business_id, v_uid, 'owner', 'active')
  on conflict do nothing;

  if p_accountant_email is not null and length(trim(p_accountant_email)) > 0 then
    insert into public.invites (business_id, email, name, role, invited_by)
    values (
      v_business_id,
      lower(trim(p_accountant_email)),
      nullif(trim(coalesce(p_accountant_name, '')), ''),
      'accountant',
      v_uid
    )
    returning id::text into v_invite_id;
  end if;

  return jsonb_build_object(
    'business_id', v_business_id,
    'business_name', v_business_name,
    'invite_id', v_invite_id,
    'already_existed', false
  );
end;
$$;

revoke all on function public.create_business_with_owner(text, text, integer, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_business_with_owner(text, text, integer, text, text, text, text, text, text, text, text, text, text) to authenticated;
