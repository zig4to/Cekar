-- Privzeti izdelki trgovine: ko trgovino dodaš na seznam, se ti izdelki
-- dodajo sami (addStoreToListAction prek cekar_add_item).

alter table public.cekar_stores
  add column default_items text[] not null default '{}';

-- Mlekarica: Domače mleko (tudi v katalog, da se ponuja kot predlog).
update public.cekar_stores
  set default_items = array['Domače mleko']
  where lower(name) = 'mlekarica';

insert into public.cekar_products (household_id, store_id, name)
select household_id, id, 'Domače mleko'
from public.cekar_stores
where lower(name) = 'mlekarica'
on conflict (store_id, lower(name)) do nothing;
