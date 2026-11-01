-- Računi: slika računa za trgovino na seznamu. Datoteka je v zasebnem
-- bucketu cekar-racuni pod <household_id>/<list_id>/<uuid>.jpg, vrstica v
-- cekar_receipts jo poveže s seznamom in trgovino.

create table public.cekar_receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  list_id uuid not null references public.cekar_lists (id) on delete cascade,
  store_id uuid not null references public.cekar_stores (id) on delete cascade,
  path text not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index cekar_receipts_list_idx on public.cekar_receipts (list_id);

alter table public.cekar_receipts enable row level security;
create policy "cekar_receipts all" on public.cekar_receipts
  for all to authenticated
  using (household_id = cekar_my_household())
  with check (
    household_id = cekar_my_household()
    and exists (select 1 from cekar_lists l
                where l.id = list_id and l.household_id = cekar_my_household())
    and split_part(path, '/', 1) = cekar_my_household()::text
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cekar-racuni', 'cekar-racuni', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

-- Datoteke samo v mapi lastnega gospodinjstva.
create policy "cekar-racuni select" on storage.objects
  for select to authenticated
  using (bucket_id = 'cekar-racuni'
         and (storage.foldername(name))[1] = cekar_my_household()::text);
create policy "cekar-racuni insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cekar-racuni'
              and (storage.foldername(name))[1] = cekar_my_household()::text);
create policy "cekar-racuni delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cekar-racuni'
         and (storage.foldername(name))[1] = cekar_my_household()::text);
