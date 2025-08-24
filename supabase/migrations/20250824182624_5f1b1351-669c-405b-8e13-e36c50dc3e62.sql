-- Create public storage buckets for avatars and brand logos
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

-- Policies for avatars bucket
create policy if not exists "Public read for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy if not exists "Users can upload avatars to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can update their own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can delete their own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies for brand-logos bucket
create policy if not exists "Public read for brand logos"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

create policy if not exists "Users can upload brand logos to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can update their own brand logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can delete their own brand logos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );