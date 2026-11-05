-- Accountant invites: look up an invite by its emailed link, and accept it
.
-- Run this whole file in the Supabase SQL editor.

-- What the invite page shows before the person signs in (business and who invited them).
create or replace function public.get_invite_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_business_name text;
  v_inviter text;
begin
  select * into v_inv from public.invites where token::text = p_token limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;
  if v_inv.status is distinct from 'pending' then
    return jsonb_build_object('valid', false, 'reason', 'used');
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  select b.name into v_business_name from public.businesses b where b.id = v_inv.business_id;
  select coalesce(u.raw_user_meta_data->>'full_name', '') into v_inviter
  from auth.users u where u.id = v_inv.invited_by;

  return jsonb_build_object(
    'valid', true,
    'business_name', v_business_name,
    'inviter_name', nullif(v_inviter, ''),
    'role', v_inv.role,
    'email', v_inv.email
  );
end;
$$;

-- Join the signed-in person to the business, only if the invite was sent to their email.
create or replace function public.accept_business_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select * into v_inv from public.invites where token::text = p_token limit 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_inv.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from lower(v_inv.email) then
    return jsonb_build_object('ok', false, 'reason', 'wrong_email');
  end if;

  -- One workspace per person for now
  if exists (select 1 from public.business_members m where m.user_id = v_uid and m.status = 'active') then
    return jsonb_build_object('ok', false, 'reason', 'has_business');
  end if;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_inv.business_id, v_uid, v_inv.role, 'active')
  on conflict do nothing;

  update public.invites set status = 'accepted' where id = v_inv.id;

  return jsonb_build_object('ok', true, 'business_id', v_inv.business_id);
end;
$$;

revoke all on function public.get_invite_preview(text) from public;
revoke all on function public.accept_business_invite(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
grant execute on function public.accept_business_invite(text) to authenticated;
