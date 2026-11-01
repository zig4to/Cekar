-- Kategorije izdelkov (Sadje in zelenjava, Higiena, Pijače …). Kategorija je
-- lastnost izdelka v katalogu (cekar_products), seznam znotraj trgovine se
-- razvrsti po skupinah v vrstnem redu kategorij. keywords = začetki besed
-- (brez šumnikov) za samodejno ugibanje (src/lib/cekar/categories.ts).

create table public.cekar_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index cekar_categories_household_idx on public.cekar_categories (household_id);
create unique index cekar_categories_name_uniq on public.cekar_categories (household_id, lower(name));

alter table public.cekar_categories enable row level security;
create policy "cekar_categories all" on public.cekar_categories
  for all to authenticated using (household_id = cekar_my_household())
  with check (household_id = cekar_my_household());

alter table public.cekar_products
  add column category_id uuid references public.cekar_categories (id) on delete set null;

-- Privzeti nabor (vrstni red ≈ pot skozi trgovino).
create or replace function public.cekar_seed_categories(p_household uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into cekar_categories (household_id, name, position, keywords)
  select p_household, v.name, v.pos, v.kw
  from (values
    ('Sadje in zelenjava', 1, array['sadj','zelenjav','banan','jabolk','hrusk','pomaranc','limon','limet','mandarin','grozdj','jagod','borovnic','malin','robid','kivi','ananas','avokad','mang','breskv','marelic','sliv','cesnj','lubenic','melon','paradiznik','kumar','paprik','solat','rukol','krompir','cebul','cesen','korenj','zelj','brokol','cvetac','buc','gob','spinac','petersilj','drobnjak','por','redkvic','rdeca pes','koleraba','jajcevec','grah','strocj']),
    ('Kruh in pekovski izdelki', 2, array['kruh','zemlj','bageta','bagete','rogljic','kroasan','toast','tortilj','kifel','pecivo','burek','zito','pletenic','ciabatt','zemelj']),
    ('Mlečni izdelki in jajca', 3, array['mlek','mlecn','jogurt','kefir','skut','smetan','maslo','masla','sir','sira','mozzarel','parmez','gaud','edamec','feta','mascarpone','puding','margarin','jajc','namaz']),
    ('Meso, mesni izdelki in ribe', 4, array['meso','mesa','mesn','piscan','piscanc','puran','svinj','govej','goved','telet','jagnj','mlet','zrezek','zrezk','file','klobas','hrenovk','salam','prsut','sunk','slanin','panceta','pasteta','cevap','pleskavic','rib','tun','losos','sardel','skamp','kozic','postrv','oslic']),
    ('Zamrznjeno', 5, array['zamrz','sladoled','ribje palcke','pomfri','zmrznj']),
    ('Testenine, riž in žita', 6, array['testenin','spaget','penne','fusili','makaron','lazanj','njok','raviol','tortelin','riz','rizot','kus kus','kuskus','polent','kosmic','muesli','musli','ovsen','zdrob','kasa','ajd','proso','kvinoj','bulgur']),
    ('Konzerve in omake', 7, array['konzerv','omak','pelat','passat','paradiznikova mezga','ketchup','kecap','majonez','gorcic','pesto','ajvar','fizol','koruz','cicerk','leca','olive','olivk','kumarice','juh','jusn']),
    ('Moka, sladkor in peka', 8, array['mok','sladkor','kvas','pecilni','vanilin','kakav','drobtin','zelatin','med','marmelad','dzem','nutell','cokoladni namaz','rozin']),
    ('Olje, kis in začimbe', 9, array['olj','kis','sol','soli','poper','zacimb','vegeta','origano','bazilik','timijan','rozmarin','cimet','curry','kari','mleta paprika','lovor','muskat']),
    ('Sladkarije in prigrizki', 10, array['cokolad','bonbon','piskot','keks','cips','smoki','kreker','napolitank','gumij','oresk','oreh','arasid','mandelj','lesnik','pistacij','grisin','perec','kokic','ploscic','milka','haribo','sladkarij','prigrizk']),
    ('Kava in čaj', 11, array['kav','caj','kapucin','espresso','instant']),
    ('Pijače', 12, array['vod','voda','mineraln','radensk','sok','sirup','malinovec','cola','coca','kokakol','pepsi','fanta','sprite','cockta','ledeni caj','energij','gazirana','pijac']),
    ('Alkohol', 13, array['piv','vin','lasko','union','zganj','viski','whisk','vodk','rum','gin','liker','prosek','penin','sampanjec','radler']),
    ('Higiena in kozmetika', 14, array['sampon','balzam','gel za tusir','tusir','milo','mila','zobn','zobna','zobno','ustna voda','deodorant','dezodorant','britv','pena za britje','vlozk','tampon','vatir','vatne','krema','losjon','toaletn','wc papir','robck','higien','kozmetik','lak za']),
    ('Čistila in gospodinjstvo', 15, array['pralni','prasek','mehcalec','detergent','cistil','cistilo','tablete za pomival','pomivaln','gobic','krpe','krpa','vrecke za smeti','vreck','folij','alu folij','papirnate brisac','brisac','kis za ciscenje','osvezilec','sveck','baterij','zarnic','lepil']),
    ('Otroci', 16, array['plenic','otrosk','otroc','kasic','vlazni robck','dojensk','bebi']),
    ('Hišni ljubljenčki', 17, array['briket','hrana za mac','hrana za ps','pasja','macja','pesek za mac','mack','pes ','psa']),
    ('Zdravila in lekarna', 18, array['lekarn','zdravil','vitamin','aspirin','lekadol','ibuprofen','paracetamol','obliz','povoj','sirup za kasel','tablet','kapljic','termometer','magnezij'])
  ) as v(name, pos, kw)
  on conflict do nothing;
$$;

revoke execute on function public.cekar_seed_categories(uuid) from public, anon, authenticated;

-- Novo gospodinjstvo dobi trgovine in kategorije.
create or replace function public.cekar_create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nisi prijavljen.';
  end if;
  if exists (select 1 from cekar_members where user_id = auth.uid()) then
    raise exception 'Si že član gospodinjstva.';
  end if;

  insert into cekar_households (name)
  values (coalesce(nullif(trim(p_name), ''), 'Moje gospodinjstvo'))
  returning id into v_id;

  insert into cekar_members (user_id, household_id, display_name)
  values (auth.uid(), v_id, coalesce(trim(p_display_name), ''));

  insert into cekar_stores (household_id, name, position) values
    (v_id, 'Lidl', 1),
    (v_id, 'Hofer', 2),
    (v_id, 'Mercator', 3),
    (v_id, 'Spar', 4);

  perform cekar_seed_categories(v_id);

  return v_id;
end;
$$;

-- cekar_add_item dobi p_category_id: nov izdelek v katalogu dobi kategorijo,
-- obstoječi obdrži svojo (ročno izbrana se ne povozi).
drop function if exists public.cekar_add_item(uuid, uuid, text, integer);

create or replace function public.cekar_add_item(
  p_list_id uuid,
  p_store_id uuid,
  p_name text,
  p_quantity integer default 1,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text := trim(p_name);
  v_household uuid := cekar_my_household();
  v_product uuid;
  v_item uuid;
  v_pos integer;
begin
  if v_name = '' then
    raise exception 'Izdelek ne sme biti prazen.';
  end if;

  insert into cekar_products (household_id, store_id, name, category_id)
  values (v_household, p_store_id, v_name, p_category_id)
  on conflict (store_id, lower(name)) do update
    set use_count = cekar_products.use_count + 1,
        last_used_at = now(),
        category_id = coalesce(cekar_products.category_id, excluded.category_id)
  returning id into v_product;

  select coalesce(max(position), 0) + 1 into v_pos
  from cekar_items where list_id = p_list_id and store_id = p_store_id;

  insert into cekar_items (list_id, store_id, product_id, name, position, quantity)
  values (p_list_id, p_store_id, v_product, v_name, v_pos,
          greatest(1, least(999, coalesce(p_quantity, 1))))
  returning id into v_item;

  return v_item;
end;
$$;

revoke execute on function public.cekar_add_item(uuid, uuid, text, integer, uuid) from public, anon;
grant execute on function public.cekar_add_item(uuid, uuid, text, integer, uuid) to authenticated;

-- Obstoječa gospodinjstva: privzete kategorije + ugibanje za obstoječi
-- katalog (najdaljša ključna beseda, ki se ujema z začetkom besede imena).
select public.cekar_seed_categories(id) from public.cekar_households;

update public.cekar_products p
set category_id = g.category_id
from (
  select distinct on (p2.id) p2.id as product_id, c.id as category_id
  from public.cekar_products p2
  join public.cekar_categories c on c.household_id = p2.household_id
  cross join lateral unnest(c.keywords) as k(kw)
  where p2.category_id is null
    and (' ' || translate(lower(p2.name), 'čšžćđ', 'cszcd')) like '% ' || k.kw || '%'
  order by p2.id, length(k.kw) desc
) g
where p.id = g.product_id;
