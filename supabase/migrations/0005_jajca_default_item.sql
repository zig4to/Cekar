-- Domača Jajca: privzeti izdelek Jajca (tudi v katalog). Izvedeno prek MCP.

update public.cekar_stores
  set default_items = array['Jajca']
  where lower(name) = 'domača jajca';

insert into public.cekar_products (household_id, store_id, name)
select household_id, id, 'Jajca'
from public.cekar_stores
where lower(name) = 'domača jajca'
on conflict (store_id, lower(name)) do nothing;
