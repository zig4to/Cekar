-- Domače meso: navadna trgovina (sekcija z več izdelki) v vsakem
-- gospodinjstvu, z lastnim logotipom (public/logos/domace-meso.svg).
-- Če trgovina s tem imenom že obstaja, se nič ne zgodi. Izvedeno prek MCP.

insert into public.cekar_stores (household_id, name, position)
select h.id, 'Domače meso',
  coalesce((select max(s.position) from public.cekar_stores s where s.household_id = h.id), 0) + 1
from public.cekar_households h
on conflict (household_id, lower(name)) do nothing;
