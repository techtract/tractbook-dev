-- Business logo: a public image bucket + one column on businesses.
alter table public.businesses add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- Anyone can view a logo (it prints on documents customers see). Only active members of
-- the business can add, replace or remove files inside their own business folder.
drop policy if exists "business logos are public" on storage.objects;
create policy "business logos are public" on storage.objects
  for select using (bucket_id = 'business-logos');

drop policy if exists "members manage own business logo" on storage.objects;
create policy "members manage own business logo" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'business-logos'
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.business_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'business-logos'
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.business_id::text = (storage.foldername(name))[1]
    )
  );
