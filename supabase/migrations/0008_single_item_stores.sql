-- Trgovina z enim samim izdelkom (Mlekarica → Domače mleko, Domača Jajca →
-- Jajca): na seznamu je prikazana kot ena vrstica izdelka namesto sekcije
-- trgovine — samo odkljukaš in nastaviš količino. Izdelek = default_items[1].

alter table public.cekar_stores
  add column single_item boolean not null default false;

update public.cekar_stores
  set single_item = true
  where lower(name) in ('mlekarica', 'domača jajca');

-- Izdelek Domačih jajc se imenuje "Domača jajca" (prikazano je samo ime izdelka).
update public.cekar_stores set default_items = array['Domača jajca'] where lower(name) = 'domača jajca';
update public.cekar_products p set name = 'Domača jajca'
  from public.cekar_stores s
  where s.id = p.store_id and lower(s.name) = 'domača jajca' and lower(p.name) = 'jajca';
update public.cekar_items i set name = 'Domača jajca'
  from public.cekar_stores s
  where s.id = i.store_id and lower(s.name) = 'domača jajca' and lower(i.name) = 'jajca';
